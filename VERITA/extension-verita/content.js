(function() {
  if (window.__veritaWidgetInit) return;
  window.__veritaWidgetInit = true;

  // ─── 1. CREAR INTERFAZ FLOTANTE ───
  const widget = document.createElement('div');
  widget.id = 'verita-widget';
  widget.innerHTML = `
    <button id="btn-edit">edit</button>
    <div id="result-container"><div id="result"></div></div>
    <div id="logs">Esperando...</div>
  `;
  document.body.appendChild(widget);

  const btn = document.getElementById('btn-edit');
  const resultDiv = document.getElementById('result');
  const logsDiv = document.getElementById('logs');

  // ─── 2. MANEJO DE ARCHIVOS ───
  let dirHandle = null;
  let dbReady = false;

  const dbReq = indexedDB.open('verita-db', 1);
  dbReq.onupgradeneeded = e => e.target.result.createObjectStore('handles');
  dbReq.onsuccess = e => {
    const db = e.target.result;
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('dir');
    req.onsuccess = async () => {
      if (req.result) {
        dirHandle = req.result;
        try {
          const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
          if (perm !== 'granted') dirHandle = null;
        } catch(e) { dirHandle = null; }
      }
      dbReady = true;
      updateLogs();
    };
  };

  function guardarHandle(handle) {
    const dbReq = indexedDB.open('verita-db', 1);
    dbReq.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'dir');
    };
  }

  function updateLogs() {
    if (dirHandle) {
      logsDiv.innerHTML = `<span class="ok-text">Carpeta: ${dirHandle.name}</span>\nListo.`;
    } else {
      logsDiv.innerHTML = `<span class="error-text">Sin carpeta.</span>\nAl dar clic, elige tu proyecto.`;
    }
  }

  async function escribirArchivo(ruta, contenido) {
    if (!dirHandle) throw new Error('No hay carpeta configurada');
    const partes = ruta.split('/');
    let actual = dirHandle;
    for (let i = 0; i < partes.length - 1; i++) {
      actual = await actual.getDirectoryHandle(partes[i], { create: true });
    }
    const nombreArchivo = partes[partes.length - 1];
    const fileHandle = await actual.getFileHandle(nombreArchivo, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contenido);
    await writable.close();
  }

  async function leerArchivo(ruta) {
    if (!dirHandle) throw new Error('No hay carpeta configurada');
    const partes = ruta.split('/');
    let actual = dirHandle;
    for (let i = 0; i < partes.length - 1; i++) {
      actual = await actual.getDirectoryHandle(partes[i]);
    }
    const fileHandle = await actual.getFileHandle(partes[partes.length - 1]);
    const file = await fileHandle.getFile();
    return await file.text();
  }

  async function borrarArchivo(ruta) {
    if (!dirHandle) throw new Error('No hay carpeta configurada');
    const partes = ruta.split('/');
    let actual = dirHandle;
    for (let i = 0; i < partes.length - 1; i++) {
      actual = await actual.getDirectoryHandle(partes[i]);
    }
    await actual.removeEntry(partes[partes.length - 1]);
  }

  // ─── 3. PARSER ───
  function parsear(texto) {
    const lineas = texto.replace(/\r\n/g, '\n').split('\n');
    const bloques = [];
    let i = 0;

    while (i < lineas.length) {
      const l = lineas[i].trim();
      if (!l || l.startsWith('//') || !l.startsWith('@')) { i++; continue; }

      const [cmd, ...resto] = l.slice(1).split(/\s+/);
      const accion = (cmd || '').toUpperCase();
      const ruta = resto.join(' ').trim();

      if (['C', 'CREATE', 'A', 'APPEND'].includes(accion)) {
        i++;
        const contenido = hasta('@F');
        bloques.push({ accion: (accion[0] === 'A' ? 'A' : 'C'), ruta, contenido });
      } else if (['D', 'DELETE'].includes(accion)) {
        while (i < lineas.length && !lineas[i].trim().startsWith('@F')) i++;
        bloques.push({ accion: 'D', ruta });
      } else if (['R', 'REPLACE'].includes(accion)) {
        i++;
        while (i < lineas.length && lineas[i].trim() === '') i++;
        let buscar = '';
        if (lineas[i] && lineas[i].trim().startsWith('@B') || (lineas[i] && lineas[i].trim().startsWith('@BUSCAR'))) {
          i++;
          buscar = hasta('@T');
          if (i < lineas.length && lineas[i].trim().startsWith('@T')) i++;
        }
        const reemplazo = hasta('@F');
        bloques.push({ accion: 'R', ruta, buscar, reemplazo });
      }
      i++;
    }
    return bloques;

    function hasta(marca) {
      const out = [];
      while (i < lineas.length && !lineas[i].trim().startsWith(marca)) {
        out.push(lineas[i]); i++;
      }
      return out.join('\n');
    }
  }

  // ─── 4. EJECUCIÓN AL DAR CLIC EN "EDIT" ───
  btn.addEventListener('click', async () => {
    resultDiv.textContent = '';
    logsDiv.textContent = 'Procesando...';
    
    try {
      while (!dbReady) { await new Promise(r => setTimeout(r, 50)); }

      if (!dirHandle) {
        try {
          dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          guardarHandle(dirHandle);
        } catch(e) {
          throw new Error('Carpeta no seleccionada.');
        }
      }

      let texto = '';
      try {
        texto = await navigator.clipboard.readText();
      } catch(e) {
        throw new Error('No se pudo leer el portapapeles.');
      }

      if (!texto || !texto.includes('@')) {
        throw new Error('No hay bloques válidos en el portapapeles.');
      }

      const bloques = parsear(texto);
      if (bloques.length === 0) {
         throw new Error('No se detectaron comandos.');
      }

      let exitos = 0;
      let detalles = [];

      for (const b of bloques) {
        if (b.accion === 'C') {
          await escribirArchivo(b.ruta, b.contenido ?? '');
          exitos++;
          detalles.push(`[OK] C ${b.ruta}`);
        } else if (b.accion === 'A') {
          let actual = '';
          try { actual = await leerArchivo(b.ruta); } catch(e) {}
          await escribirArchivo(b.ruta, actual + (actual.length > 0 ? '\n' : '') + (b.contenido ?? ''));
          exitos++;
          detalles.push(`[OK] A ${b.ruta}`);
        } else if (b.accion === 'D') {
          try {
            await borrarArchivo(b.ruta);
            exitos++;
            detalles.push(`[OK] D ${b.ruta}`);
          } catch(e) {
            detalles.push(`[X] D ${b.ruta} (no existía)`);
          }
        } else if (b.accion === 'R') {
          let txt = await leerArchivo(b.ruta);
          const crlf = txt.includes('\r\n');
          txt = txt.replace(/\r\n/g, '\n');
          if (b.buscar && !txt.includes(b.buscar)) {
            throw new Error(`Texto a buscar no encontrado en ${b.ruta}`);
          }
          let salida = txt;
          if (b.buscar) {
            salida = txt.replace(b.buscar, b.reemplazo ?? '');
          } else {
             salida = b.reemplazo ?? ''; 
          }
          if (crlf) salida = salida.replace(/\n/g, '\r\n');
          await escribirArchivo(b.ruta, salida);
          exitos++;
          detalles.push(`[OK] R ${b.ruta}`);
        }
      }

      resultDiv.textContent = '✅';
      logsDiv.innerHTML = `<span class="ok-text">Éxito: ${exitos} bloques.</span>\n${detalles.join('\n')}`;

    } catch (err) {
      resultDiv.textContent = '❌';
      logsDiv.innerHTML = `<span class="error-text">Error:\n${err.message}</span>\n\n(copiado al portapapeles)`;
      try { await navigator.clipboard.writeText(err.message); } catch(e){}
    }
  });
})();