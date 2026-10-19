// sistema.js — Sandbox local con micro base de datos en disco
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = 3000;
const RAIZ = __dirname;
const WORKSPACE = path.join(RAIZ, 'workspace');
const DATA_FILE = path.join(RAIZ, 'data.json');
const DIAS_INACTIVO = 7;
const MS_DIA = 86400000;

if (!fs.existsSync(WORKSPACE)) {
  fs.mkdirSync(WORKSPACE, { recursive: true });
  console.log('📁 Carpeta workspace/ creada vacía.');
}

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

    if (['N', 'RENAME', 'M', 'MOVE'].includes(accion)) {
      if (resto.length < 2) {
        bloques.push({ accion: 'N', ruta: resto[0] || '', destino: '', error: 'faltan argumentos (origen destino)' });
      } else {
        bloques.push({ accion: 'N', ruta: resto[0], destino: resto.slice(1).join(' ') });
      }
      i++;
    } else if (['C', 'CREATE', 'A', 'APPEND'].includes(accion)) {
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
  const abs = path.resolve(WORKSPACE, rel);
  if (abs !== WORKSPACE && !abs.startsWith(WORKSPACE + path.sep)) return null;
  return abs;
}

function aplicar(b) {
  if (!b.ruta) return { ok: false, msg: 'sin ruta' };
  const abs = rutaSegura(b.ruta);
  if (!abs) return { ok: false, msg: 'ruta fuera del workspace' };

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
    if (b.accion === 'N') {
      if (b.error) return { ok: false, msg: b.error };
      if (!b.destino) return { ok: false, msg: 'falta destino' };
      const absDestino = rutaSegura(b.destino);
      if (!absDestino) return { ok: false, msg: 'destino fuera del workspace' };
      if (!fs.existsSync(abs)) return { ok: false, msg: 'origen no existe' };
      if (abs === absDestino) return { ok: false, msg: 'origen y destino son iguales' };
      if (fs.existsSync(absDestino)) return { ok: false, msg: 'destino ya existe' };
      fs.mkdirSync(path.dirname(absDestino), { recursive: true });
      fs.renameSync(abs, absDestino);
      return { ok: true, msg: 'renombrado/movido' };
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
      if (buscar && !txt.includes(buscar)) return { ok: false, msg: 'texto a buscar no encontrado' };
      let salida = buscar ? txt.replace(buscar, reemplazo) : reemplazo;
      if (crlf) salida = salida.replace(/\n/g, '\r\n');
      fs.writeFileSync(abs, salida);
      return { ok: true, msg: 'reemplazado' };
    }
    return { ok: false, msg: 'acción desconocida' };
  } catch (e) { return { ok: false, msg: e.message }; }
}

// ---------- MICRO BASE DE DATOS ----------
function dbLeer() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { usuarios: {}, peticiones: [], chats: {} };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const db = JSON.parse(raw);
    if (!db.usuarios || typeof db.usuarios !== 'object') db.usuarios = {};
    if (!Array.isArray(db.peticiones)) db.peticiones = [];
    if (!db.chats || typeof db.chats !== 'object') db.chats = {};
    return db;
  } catch (e) {
    console.error('⚠️ data.json corrupto, reiniciando:', e.message);
    return { usuarios: {}, peticiones: [], chats: {} };
  }
}
function dbEscribir(db) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}
function dbLimpiarInactivos(db) {
  const ahora = Date.now();
  const borrados = [];
  Object.keys(db.usuarios).forEach((nombre) => {
    const u = db.usuarios[nombre];
    if (nombre === 'acronrojo') return;
    if (!u || !u.ultimoAcceso) return;
    const dias = Math.floor((ahora - u.ultimoAcceso) / MS_DIA);
    if (dias < DIAS_INACTIVO) return;
    const activas = db.peticiones.filter(p =>
      p.de === nombre && !p.pagada && (p.estado === 'nueva' || p.estado === 'curso')
    ).length;
    if (activas > 0) return;
    delete db.usuarios[nombre];
    borrados.push(nombre);
  });
  if (borrados.length) {
    Object.keys(db.chats).forEach((pid) => {
      db.chats[pid] = (db.chats[pid] || []).filter(m => borrados.indexOf(m.de) === -1);
    });
  }
  return borrados;
}

// ---------- API ----------
function apiJSON(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function apiLeerBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { resolve(null); }
    });
  });
}

async function apiManejar(req, res) {
  const url = req.url.split('?')[0];
  const db = dbLeer();

  if (req.method === 'GET' && url === '/api/estado') {
    const borrados = dbLimpiarInactivos(db);
    if (borrados.length) dbEscribir(db);
    return apiJSON(res, 200, { ok: true, db, borrados });
  }

  if (req.method === 'POST' && url === '/api/registro') {
    const b = await apiLeerBody(req);
    if (!b || !b.nombre || !b.pass) return apiJSON(res, 400, { ok: false, error: 'datos incompletos' });
    if (db.usuarios[b.nombre]) return apiJSON(res, 409, { ok: false, error: 'usuario ya existe' });
    db.usuarios[b.nombre] = { pass: b.pass, creado: Date.now(), ultimoAcceso: Date.now() };
    dbEscribir(db);
    return apiJSON(res, 200, { ok: true, rol: 'cliente' });
  }

  if (req.method === 'POST' && url === '/api/login') {
    const b = await apiLeerBody(req);
    if (!b || !b.nombre) return apiJSON(res, 400, { ok: false, error: 'falta nombre' });
    if (b.nombre === 'acronrojo' && b.pass === '3141592653') {
      return apiJSON(res, 200, { ok: true, rol: 'admin' });
    }
    const u = db.usuarios[b.nombre];
    if (!u) return apiJSON(res, 404, { ok: false, error: 'usuario no existe' });
    if (u.pass !== b.pass) return apiJSON(res, 401, { ok: false, error: 'contraseña incorrecta' });
    u.ultimoAcceso = Date.now();
    dbEscribir(db);
    return apiJSON(res, 200, { ok: true, rol: 'cliente' });
  }

  if (req.method === 'POST' && url === '/api/acceso') {
    const b = await apiLeerBody(req);
    if (b && b.nombre && db.usuarios[b.nombre]) {
      db.usuarios[b.nombre].ultimoAcceso = Date.now();
      dbEscribir(db);
    }
    return apiJSON(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url === '/api/peticion') {
    const b = await apiLeerBody(req);
    if (!b || !b.peticion) return apiJSON(res, 400, { ok: false, error: 'falta peticion' });
    const p = b.peticion;
    if (b.accion === 'borrar') {
      db.peticiones = db.peticiones.filter(x => x.id !== p.id);
      delete db.chats[p.id];
    } else {
      const idx = db.peticiones.findIndex(x => x.id === p.id);
      if (idx >= 0) db.peticiones[idx] = p;
      else db.peticiones.push(p);
    }
    dbEscribir(db);
    return apiJSON(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url === '/api/chat') {
    const b = await apiLeerBody(req);
    if (!b || !b.petId || !b.msg) return apiJSON(res, 400, { ok: false, error: 'datos incompletos' });
    if (!db.chats[b.petId]) db.chats[b.petId] = [];
    db.chats[b.petId].push(b.msg);
    const msgs = db.chats[b.petId];
    if (b.msg.tipo === 'imagen') {
      const imgs = msgs.filter(m => m.tipo === 'imagen');
      if (imgs.length > 10) {
        const sobra = imgs.length - 10;
        let quitadas = 0;
        db.chats[b.petId] = msgs.filter(m => {
          if (m.tipo === 'imagen' && m.id !== b.msg.id && quitadas < sobra) { quitadas++; return false; }
          return true;
        });
      }
    } else {
      const txts = msgs.filter(m => m.tipo !== 'imagen');
      if (txts.length > 25) {
        const sobra = txts.length - 25;
        let quitadas = 0;
        db.chats[b.petId] = msgs.filter(m => {
          if (m.tipo !== 'imagen' && m.id !== b.msg.id && quitadas < sobra) { quitadas++; return false; }
          return true;
        });
      }
    }
    dbEscribir(db);
    return apiJSON(res, 200, { ok: true, chats: db.chats[b.petId] });
  }

  if (req.method === 'POST' && url === '/api/limpiar') {
    const borrados = dbLimpiarInactivos(db);
    if (borrados.length) dbEscribir(db);
    return apiJSON(res, 200, { ok: true, borrados, db });
  }

  if (req.method === 'POST' && url === '/api/borrar-usuario') {
    const b = await apiLeerBody(req);
    if (!b || !b.nombre || b.nombre === 'acronrojo') {
      return apiJSON(res, 400, { ok: false, error: 'no permitido' });
    }
    const activas = db.peticiones.filter(p =>
      p.de === b.nombre && !p.pagada && (p.estado === 'nueva' || p.estado === 'curso')
    ).length;
    if (activas > 0) return apiJSON(res, 409, { ok: false, error: 'tiene peticiones activas' });
    delete db.usuarios[b.nombre];
    dbEscribir(db);
    return apiJSON(res, 200, { ok: true });
  }

  return apiJSON(res, 404, { ok: false, error: 'endpoint no encontrado' });
}

// ---------- HTML DEL DASHBOARD ----------
const HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Verita Sandbox</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100vh; overflow: hidden; font-family: ui-monospace, Consolas, monospace; background: #111; color: #ddd; }
.app { display: flex; height: 100vh; }
#console { width: 320px; min-width: 200px; max-width: 500px; flex-shrink: 0; background: #1a1a1a; padding: 14px; display: flex; flex-direction: column; gap: 12px; border-right: 3px solid #000; }
#console h1 { font-size: 11px; letter-spacing: 3px; color: #4cd98b; text-transform: uppercase; }
#btn-edit { width: 100%; height: 64px; background: #0a8f52; color: #fff; border: 3px solid #111; border-radius: 12px; font-size: 22px; font-weight: 900; cursor: pointer; box-shadow: 0 5px 0 #111; letter-spacing: 3px; text-transform: uppercase; transition: transform 0.1s, box-shadow 0.1s; font-family: inherit; }
#btn-edit:active { transform: translateY(4px); box-shadow: 0 1px 0 #111; }
#btn-edit:disabled { background: #555; box-shadow: none; cursor: not-allowed; }
#result-container { height: 70px; font-size: 64px; display: flex; align-items: center; justify-content: center; }
#logs { flex: 1; background: #0d0d0d; border: 2px solid #333; padding: 10px; color: #ddd; font-size: 11px; overflow-y: auto; white-space: pre-wrap; border-radius: 8px; line-height: 1.5; }
.error-text { color: #ff6a6a; font-weight: bold; }
.ok-text { color: #4cd98b; font-weight: bold; }
#v-divider { width: 8px; flex-shrink: 0; background: #333; cursor: col-resize; position: relative; transition: background 0.15s; }
#v-divider:hover { background: #4cd98b; }
#v-divider::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 2px; height: 40px; background: #666; border-radius: 2px; }
#sandbox-area { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #0a0a0a; }
#sandbox-toolbar { height: 44px; background: #1a1a1a; border-bottom: 2px solid #000; display: flex; align-items: center; padding: 0 12px; gap: 10px; flex-shrink: 0; }
#btn-reload, #btn-reset-view { height: 30px; padding: 0 12px; background: #333; color: #fff; border: 2px solid #111; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
#btn-reload:hover, #btn-reset-view:hover { background: #4cd98b; color: #111; }
#dim-info { font-size: 11px; color: #888; letter-spacing: 1px; margin-left: auto; background: #0d0d0d; padding: 4px 10px; border-radius: 6px; border: 1px solid #222; }
#sandbox-canvas { flex: 1; display: flex; flex-direction: column; min-height: 0; background: linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; background-color: #101010; padding: 12px; }
#sandbox-frame { background: #fff; box-shadow: 0 8px 32px rgba(0,0,0,0.7); border: 3px solid #000; overflow: hidden; flex-shrink: 0; }
#sandbox-frame iframe { width: 100%; height: 100%; border: none; display: block; }
#h-divider { height: 8px; background: #333; cursor: row-resize; flex-shrink: 0; position: relative; margin-top: 0; transition: background 0.15s; }
#h-divider:hover { background: #4cd98b; }
#h-divider::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 40px; height: 2px; background: #666; border-radius: 2px; }
body.resizing { user-select: none; }
body.resizing iframe { pointer-events: none; }
</style>
</head>
<body>
<div class="app">
  <aside id="console">
    <h1>verita sandbox</h1>
    <button id="btn-edit">edit</button>
    <div id="result-container"><div id="result"></div></div>
    <div id="logs">Workspace listo. Copia bloques y dale a EDIT.</div>
  </aside>
  <div id="v-divider"></div>
  <main id="sandbox-area">
    <div id="sandbox-toolbar">
      <button id="btn-reload">🔄 recargar</button>
      <button id="btn-reset-view">⛶ reset</button>
      <span id="dim-info">— × —</span>
    </div>
    <div id="sandbox-canvas">
      <div id="sandbox-frame">
        <iframe id="sandbox" src="/workspace/index.html"></iframe>
      </div>
      <div id="h-divider"></div>
    </div>
  </main>
</div>
<script>
  const consoleEl = document.getElementById('console');
  const vDivider = document.getElementById('v-divider');
  const canvas = document.getElementById('sandbox-canvas');
  const frame = document.getElementById('sandbox-frame');
  const hDivider = document.getElementById('h-divider');
  const iframe = document.getElementById('sandbox');
  const btn = document.getElementById('btn-edit');
  const btnReload = document.getElementById('btn-reload');
  const btnReset = document.getElementById('btn-reset-view');
  const resultDiv = document.getElementById('result');
  const logsDiv = document.getElementById('logs');
  const dimInfo = document.getElementById('dim-info');

  function maxFrameHeight() { return canvas.clientHeight - hDivider.offsetHeight - 24; }
  function aplicarAlto(h) {
    const max = maxFrameHeight();
    frame.style.height = Math.max(200, Math.min(max, h)) + 'px';
    actualizarDim();
  }
  function resetVista() { frame.style.height = maxFrameHeight() + 'px'; actualizarDim(); }
  function actualizarDim() { dimInfo.textContent = frame.offsetWidth + ' × ' + frame.offsetHeight; }
  resetVista();
  window.addEventListener('resize', resetVista);

  let vDrag = false, vStartX, vStartW;
  vDivider.addEventListener('mousedown', (e) => { vDrag = true; vStartX = e.clientX; vStartW = consoleEl.offsetWidth; document.body.classList.add('resizing'); e.preventDefault(); });
  document.addEventListener('mousemove', (e) => { if (!vDrag) return; consoleEl.style.width = Math.max(200, Math.min(500, vStartW + (e.clientX - vStartX))) + 'px'; actualizarDim(); });
  document.addEventListener('mouseup', () => { if (vDrag) { vDrag = false; document.body.classList.remove('resizing'); } });

  let hDrag = false, hStartY, hStartH;
  hDivider.addEventListener('mousedown', (e) => { hDrag = true; hStartY = e.clientY; hStartH = frame.offsetHeight; document.body.classList.add('resizing'); e.preventDefault(); });
  document.addEventListener('mousemove', (e) => { if (!hDrag) return; aplicarAlto(hStartH + (e.clientY - hStartY)); });
  document.addEventListener('mouseup', () => { if (hDrag) { hDrag = false; document.body.classList.remove('resizing'); } });

  btnReload.addEventListener('click', () => { iframe.src = iframe.src; });
  btnReset.addEventListener('click', resetVista);

  btn.addEventListener('click', async () => {
    resultDiv.textContent = '';
    logsDiv.textContent = 'Procesando...';
    btn.disabled = true;
    try {
      const texto = await navigator.clipboard.readText();
      if (!texto || !texto.includes('@')) throw new Error('No hay bloques válidos en el portapapeles.');
      const res = await fetch('/aplicar', { method: 'POST', headers: { 'content-type': 'text/plain; charset=utf-8' }, body: texto });
      const data = await res.json();
      if (data.ok) {
        resultDiv.textContent = '✅';
        logsDiv.innerHTML = '<span class="ok-text">¡Éxito!</span>\\n' + data.detalles;
        iframe.src = iframe.src;
      } else {
        resultDiv.textContent = '❌';
        logsDiv.innerHTML = '<span class="error-text">Error:\\n' + data.error + '</span>\\n\\n(copiado)';
        await navigator.clipboard.writeText(data.error);
      }
    } catch (err) {
      resultDiv.textContent = '❌';
      logsDiv.innerHTML = '<span class="error-text">Error:\\n' + err.message + '</span>\\n\\n(copiado)';
      try { await navigator.clipboard.writeText(err.message); } catch(e){}
    } finally { btn.disabled = false; }
  });
</script>
</body>
</html>`;

// ---------- SERVER ----------
http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    apiManejar(req, res).catch(e => apiJSON(res, 500, { ok: false, error: e.message }));
    return;
  }
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }
  if (req.method === 'POST' && req.url === '/aplicar') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const bloques = parsear(body);
      let exitos = 0, detalles = [], errorGlobal = null;
      for (const b of bloques) {
        const r = aplicar(b);
        if (r.ok) {
          exitos++;
          if (b.accion === 'N') detalles.push(`[OK] ${b.accion} ${b.ruta} → ${b.destino}`);
          else detalles.push(`[OK] ${b.accion} ${b.ruta}`);
        }
        else { errorGlobal = `Error en ${b.ruta}: ${r.msg}`; break; }
      }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      if (errorGlobal) res.end(JSON.stringify({ ok: false, error: errorGlobal }));
      else res.end(JSON.stringify({ ok: true, detalles: detalles.join('\n') }));
    });
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/workspace/')) {
    const rel = decodeURIComponent(req.url.replace(/^\/workspace\//, '').split('?')[0]);
    const abs = rutaSegura(rel);
    if (!abs || !fs.existsSync(abs)) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;background:#fafafa;color:#888;margin:0"><div style="text-align:center"><h2 style="color:#111">Workspace vacío</h2><p>Usa <b>@C index.html</b> para empezar a crear archivos.</p></div></body></html>`);
    }
    if (fs.statSync(abs).isFile()) {
      const ext = path.extname(abs).toLowerCase();
      const mimes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
      };
      res.writeHead(200, { 'content-type': mimes[ext] || 'application/octet-stream' });
      return res.end(fs.readFileSync(abs));
    }
  }
  res.writeHead(404); res.end('no');
}).listen(PUERTO, '127.0.0.1', () => {
  console.log('\\n=========================================');
  console.log('✅ SANDBOX LISTO (con micro base de datos)');
  console.log('👉 http://localhost:3000');
  console.log('📁 workspace → ' + WORKSPACE);
  console.log('💾 data.json → ' + DATA_FILE);
  console.log('=========================================\\n');
});