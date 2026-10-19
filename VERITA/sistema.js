// sistema.js — Sandbox local con dashboard
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = 3000;
const RAIZ = __dirname;

// ---------- PARSER ----------
function parsear(texto) {
    const lineas = texto.replace(/\r\n/g, '\n').split('\n');
    const bloques = [];
    let i = 0;

    const hasta = (marca) => {
        const out = [];
        while (i < lineas.length && !lineas[i].trim().startsWith(marca)) {
            out.push(lineas[i]); i++;
        }
        return out.join('\n');
    };

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
            if (lineas[i] && (lineas[i].trim().startsWith('@B') || lineas[i].trim().startsWith('@BUSCAR'))) {
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
}

// ---------- APLICADOR ----------
function rutaSegura(rel) {
    const abs = path.resolve(RAIZ, rel);
    if (abs !== RAIZ && !abs.startsWith(RAIZ + path.sep)) return null;
    return abs;
}

function aplicar(b) {
    if (!b.ruta) return { ok: false, msg: 'sin ruta' };
    const abs = rutaSegura(b.ruta);
    if (!abs) return { ok: false, msg: 'ruta fuera de la raíz' };

    try {
        if (b.accion === 'C') {
            fs.mkdirSync(path.dirname(abs), { recursive: true });
            fs.writeFileSync(abs, b.contenido ?? '');
            return { ok: true, msg: 'creado' };
        }
        if (b.accion === 'A') {
            const existia = fs.existsSync(abs);
            fs.mkdirSync(path.dirname(abs), { recursive: true });
            const pre = existia && fs.readFileSync(abs, 'utf8').length > 0 ? '\n' : '';
            fs.appendFileSync(abs, pre + (b.contenido ?? ''));
            return { ok: true, msg: 'agregado' };
        }
        if (b.accion === 'D') {
            if (fs.existsSync(abs)) fs.unlinkSync(abs);
            return { ok: true, msg: 'borrado' };
        }
        if (b.accion === 'R') {
            if (!fs.existsSync(abs)) return { ok: false, msg: 'no existe' };
            let txt = fs.readFileSync(abs, 'utf8');
            const crlf = txt.includes('\r\n');
            txt = txt.replace(/\r\n/g, '\n');
            const buscar = (b.buscar || '').replace(/\r\n/g, '\n');
            const reemplazo = (b.reemplazo || '').replace(/\r\n/g, '\n');

            if (buscar && !txt.includes(buscar)) {
                return { ok: false, msg: 'texto a buscar no encontrado' };
            }
            let salida = buscar ? txt.replace(buscar, reemplazo) : reemplazo;
            if (crlf) salida = salida.replace(/\n/g, '\r\n');
            fs.writeFileSync(abs, salida);
            return { ok: true, msg: 'reemplazado' };
        }
        return { ok: false, msg: 'acción desconocida' };
    } catch (e) {
        return { ok: false, msg: e.message };
    }
}

// ---------- UI DASHBOARD ----------
const HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verita Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { display: flex; height: 100vh; font-family: ui-monospace, Consolas, monospace; background: #111; overflow: hidden; }
    
    /* Panel de control izquierdo */
    .panel { width: 280px; background: #1a1a1a; padding: 16px; display: flex; flex-direction: column; gap: 16px; border-right: 3px solid #000; z-index: 10; }
    #btn-edit { width: 100%; height: 70px; background: #0a8f52; color: #fff; border: 4px solid #111; border-radius: 12px; font-size: 24px; font-weight: 900; cursor: pointer; box-shadow: 0 6px 0 #111; letter-spacing: 2px; text-transform: uppercase; transition: transform 0.1s; }
    #btn-edit:active { transform: translateY(4px); box-shadow: 0 2px 0 #111; }
    #btn-edit:disabled { background: #555; box-shadow: none; transform: none; cursor: not-allowed; }
    #result-container { height: 80px; font-size: 70px; display: flex; align-items: center; justify-content: center; }
    #logs { flex: 1; background: #0d0d0d; border: 2px solid #333; padding: 10px; color: #ddd; font-size: 11px; overflow-y: auto; white-space: pre-wrap; border-radius: 8px; line-height: 1.4; }
    .error-text { color: #ff6a6a; font-weight: bold; }
    .ok-text { color: #4cd98b; font-weight: bold; }
    
    /* Sandbox derecho */
    .sandbox-wrapper { flex: 1; position: relative; background: #fff; }
    iframe#sandbox { width: 100%; height: 100%; border: none; display: block; }
    
    /* Controles flotantes en la esquina del sandbox */
    .floating-controls { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 12px; z-index: 100; }
    
    #btn-reload { width: 50px; height: 50px; border-radius: 50%; background: #fff; border: 3px solid #111; font-size: 22px; cursor: pointer; box-shadow: 0 4px 0 #111; display: flex; align-items: center; justify-content: center; transition: transform 0.1s; }
    #btn-reload:active { transform: translateY(4px); box-shadow: none; }
    
    /* Miniatura en vivo */
    .thumbnail-container { width: 100px; height: 100px; border-radius: 12px; border: 3px solid #111; overflow: hidden; background: #fff; box-shadow: 0 4px 0 #111; position: relative; }
    .thumbnail-container iframe { width: 400%; height: 400%; transform: scale(0.25); transform-origin: top left; border: none; pointer-events: none; }
  </style>
</head>
<body>
  <div class="panel">
    <button id="btn-edit">edit</button>
    <div id="result-container"><div id="result"></div></div>
    <div id="logs">Listo. Copia el código y dale a EDIT.</div>
  </div>

  <div class="sandbox-wrapper">
    <div class="floating-controls">
      <div class="thumbnail-container">
        <iframe src="/index.html" scrolling="no" tabindex="-1"></iframe>
      </div>
      <button id="btn-reload" title="Recargar sandbox">🔄</button>
    </div>
    <iframe id="sandbox" src="/index.html"></iframe>
  </div>

  <script>
    const btn = document.getElementById('btn-edit');
    const btnReload = document.getElementById('btn-reload');
    const sandbox = document.getElementById('sandbox');
    const resultDiv = document.getElementById('result');
    const logsDiv = document.getElementById('logs');

    // Botón de recargar manual
    btnReload.addEventListener('click', () => {
      sandbox.src = sandbox.src; 
    });

    // Lógica del botón EDIT
    btn.addEventListener('click', async () => {
      resultDiv.textContent = '';
      logsDiv.textContent = 'Procesando...';
      btn.disabled = true;

      try {
        const texto = await navigator.clipboard.readText();
        if (!texto || !texto.includes('@')) {
          throw new Error('No hay bloques válidos en el portapapeles.');
        }

        const res = await fetch('/aplicar', {
          method: 'POST',
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          body: texto
        });

        const data = await res.json();
        
        if (data.ok) {
          resultDiv.textContent = '✅';
          logsDiv.innerHTML = '<span class="ok-text">¡Éxito!</span>\\n' + data.detalles;
          // Recargar sandbox automáticamente tras éxito
          sandbox.src = sandbox.src; 
        } else {
          resultDiv.textContent = '❌';
          logsDiv.innerHTML = '<span class="error-text">Error:\\n' + data.error + '</span>\\n\\n(copiado al portapapeles)';
          await navigator.clipboard.writeText(data.error);
        }
      } catch (err) {
        resultDiv.textContent = '❌';
        logsDiv.innerHTML = '<span class="error-text">Error:\\n' + err.message + '</span>\\n\\n(copiado al portapapeles)';
        try { await navigator.clipboard.writeText(err.message); } catch(e){}
      } finally {
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

// ---------- SERVER ----------
http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(HTML);
    }
    if (req.method === 'POST' && req.url === '/aplicar') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const bloques = parsear(body);
            let exitos = 0;
            let detalles = [];
            let errorGlobal = null;

            for (const b of bloques) {
                const r = aplicar(b);
                if (r.ok) {
                    exitos++;
                    detalles.push(`[OK] ${b.accion} ${b.ruta}`);
                } else {
                    errorGlobal = `Error en ${b.ruta}: ${r.msg}`;
                    break;
                }
            }

            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
            if (errorGlobal) {
                res.end(JSON.stringify({ ok: false, error: errorGlobal }));
            } else {
                res.end(JSON.stringify({ ok: true, detalles: detalles.join('\\n') }));
            }
        });
        return;
    }
    if (req.method === 'GET') {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);
        const rel = urlPath.replace(/^\/+/, '');
        if (rel) {
            const abs = rutaSegura(rel);
            if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
                const ext = path.extname(abs).toLowerCase();
                const mimes = {
                    '.html': 'text/html; charset=utf-8',
                    '.css':  'text/css; charset=utf-8',
                    '.js':   'application/javascript; charset=utf-8',
                    '.json': 'application/json; charset=utf-8',
                    '.svg':  'image/svg+xml',
                    '.png':  'image/png',
                    '.jpg':  'image/jpeg',
                    '.gif':  'image/gif',
                    '.woff': 'font/woff',
                    '.woff2':'font/woff2'
                };
                res.writeHead(200, { 'content-type': mimes[ext] || 'application/octet-stream' });
                return res.end(fs.readFileSync(abs));
            }
        }
    }
    res.writeHead(404); res.end('no');
}).listen(PUERTO, '127.0.0.1', () => {
    console.log('\\n=========================================');
    console.log('✅ SERVIDOR SANDBOX LISTO');
    console.log('👉 Abre en tu navegador: http://localhost:3000');
    console.log('=========================================\\n');
});