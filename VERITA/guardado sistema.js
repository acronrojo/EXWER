// sistema.js — auto-modificador local
// uso:  node sistema.js   →   http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = 3000;
const RAIZ = __dirname;
const META = path.join(RAIZ, '.sistema');
const LOG = path.join(META, 'historial.log');
const ULTIMO = path.join(META, 'ultimo.txt');

// ---------- PARSER ----------
// @CREATE ruta           ...cuerpo...        @FIN
// @APPEND ruta           ...cuerpo...        @FIN
// @DELETE ruta                               @FIN
// @REPLACE ruta          @BUSCAR ...texto... @REEMPLAZAR ...texto... @FIN
function parsear(texto) {
    const lineas = texto.replace(/\r\n/g, '\n').split('\n');
    const bloques = [];
    let i = 0;

    const saltaVacios = () => { while (i < lineas.length && lineas[i].trim() === '') i++; };
    const hasta = (marca) => { const out = []; while (i < lineas.length && lineas[i].trim() !== marca) { out.push(lineas[i]); i++; } return out.join('\n'); };

    while (i < lineas.length) {
        const l = lineas[i].trim();
        if (!l || l.startsWith('//') || !l.startsWith('@')) { i++; continue; }

        const [cmd, ...resto] = l.slice(1).split(/\s+/);
        const accion = (cmd || '').toUpperCase();
        const ruta = resto.join(' ').trim();

        if (accion === 'CREATE' || accion === 'APPEND') {
            i++;
            const contenido = hasta('@FIN');
            i++; // saltar @FIN
            bloques.push({ accion, ruta, contenido });
        }
        else if (accion === 'DELETE') {
            i++;
            // consumir hasta @FIN (o siguiente @) sin romperse
            while (i < lineas.length && lineas[i].trim() !== '@FIN' && !lineas[i].trim().startsWith('@')) i++;
            if (i < lineas.length && lineas[i].trim() === '@FIN') i++;
            bloques.push({ accion, ruta });
        }
        else if (accion === 'REPLACE') {
            i++;
            saltaVacios();
            if (i >= lineas.length || lineas[i].trim() !== '@BUSCAR') {
                bloques.push({ accion, ruta, error: 'falta @BUSCAR' });
                continue;
            }
            i++;
            const buscar = hasta('@REEMPLAZAR');
            i++; // saltar @REEMPLAZAR
            const reemplazo = hasta('@FIN');
            i++; // saltar @FIN
            bloques.push({ accion, ruta, buscar, reemplazo });
        }
        else {
            // acción desconocida, la reportamos igual
            i++;
            bloques.push({ accion, ruta, error: 'acción desconocida' });
        }
    }
    return bloques;
}

// ---------- SEGURIDAD ----------
function rutaSegura(rel) {
    if (!rel) return null;
    const abs = path.resolve(RAIZ, rel);
    const base = RAIZ.endsWith(path.sep) ? RAIZ : RAIZ + path.sep;
    if (abs !== RAIZ && !abs.startsWith(base)) return null;
    return abs;
}

// ---------- APLICADOR ----------
function aplicar(b) {
    if (b.error) return { ok: false, msg: b.error };
    if (!b.ruta) return { ok: false, msg: 'sin ruta' };
    const abs = rutaSegura(b.ruta);
    if (!abs) return { ok: false, msg: 'ruta fuera de la raíz' };

    try {
        switch (b.accion) {
            case 'CREATE': {
                fs.mkdirSync(path.dirname(abs), { recursive: true });
                fs.writeFileSync(abs, b.contenido ?? '');
                return { ok: true, msg: 'creado' };
            }
            case 'APPEND': {
                const existia = fs.existsSync(abs);
                fs.mkdirSync(path.dirname(abs), { recursive: true });
                const pre = existia && fs.readFileSync(abs, 'utf8').length > 0 ? '\n' : '';
                fs.appendFileSync(abs, pre + (b.contenido ?? ''));
                return { ok: true, msg: existia ? 'agregado' : 'creado por append' };
            }
            case 'DELETE': {
                if (!fs.existsSync(abs)) return { ok: false, msg: 'no existe' };
                if (fs.statSync(abs).isDirectory()) return { ok: false, msg: 'es carpeta, no se borra' };
                fs.unlinkSync(abs);
                return { ok: true, msg: 'borrado' };
            }
            case 'REPLACE': {
                if (!fs.existsSync(abs)) return { ok: false, msg: 'no existe' };
                if (!b.buscar) return { ok: false, msg: 'buscar vacío' };
                let txt = fs.readFileSync(abs, 'utf8');
                const crlf = txt.includes('\r\n');
                txt = txt.replace(/\r\n/g, '\n');
                b.buscar = (b.buscar || '').replace(/\r\n/g, '\n');
                b.reemplazo = (b.reemplazo || '').replace(/\r\n/g, '\n');
                if (!txt.includes(b.buscar)) return { ok: false, msg: 'texto a buscar no encontrado' };
                let salida = txt.replace(b.buscar, b.reemplazo ?? '');
                if (crlf) salida = salida.replace(/\n/g, '\r\n');
                fs.writeFileSync(abs, salida);
                return { ok: true, msg: 'reemplazado' };
            }
            default:
                return { ok: false, msg: 'acción desconocida: ' + b.accion };
        }
    } catch (e) {
        return { ok: false, msg: e.message };
    }
}

// ---------- ESTADO ----------
function contarArchivos(dir) {
    let n = 0;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) n += contarArchivos(p);
        else n++;
    }
    return n;
}

// ---------- UI ----------
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{display:flex;flex-direction:column;height:100vh;padding:8px;gap:8px;background:#111;color:#ddd;font:13px ui-monospace,Consolas,monospace}
textarea{flex:1;background:#181818;color:#eaeaea;border:1px solid #2a2a2a;padding:10px;font:13px ui-monospace,Consolas,monospace;resize:none;outline:none;tab-size:2}
button{background:#2bb673;color:#001b0d;border:0;padding:12px;font-weight:700;font:14px ui-monospace,Consolas,monospace;cursor:pointer}
button:disabled{background:#2a2a2a;color:#666;cursor:not-allowed}
#res{max-height:32vh;overflow:auto;border-top:1px solid #222;padding-top:6px}
.l{padding:3px 0;border-bottom:1px solid #1c1c1c;word-break:break-all}
.ok{color:#4cd98b}.err{color:#ff6a6a}
</style></head><body>
<textarea id="t" autofocus spellcheck="false" placeholder="@CREATE archivo.txt
hola
@FIN"></textarea>
<button id="b" disabled>Aplicar</button>
<div id="res"></div>
<script>
const t=document.getElementById('t'),b=document.getElementById('b'),res=document.getElementById('res');
const cuenta=s=>(s.match(/^\\s*@(CREATE|REPLACE|DELETE|APPEND)\\b/gim)||[]).length;
const sync=()=>{b.disabled=cuenta(t.value)===0};
t.addEventListener('input',sync);
t.addEventListener('keydown',e=>{
  if(e.key==='Tab'){e.preventDefault();const s=t.selectionStart,en=t.selectionEnd;
    t.value=t.value.slice(0,s)+'  '+t.value.slice(en);t.selectionStart=t.selectionEnd=s+2;sync();}
  else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();if(!b.disabled)b.click();}
});
b.addEventListener('click',async()=>{
  b.disabled=true;res.innerHTML='';
  try{
    const r=await fetch('/aplicar',{method:'POST',headers:{'content-type':'text/plain; charset=utf-8'},body:t.value});
    const d=await r.json();
    for(const x of d.resultados){
      const el=document.createElement('div');
      el.className='l '+(x.ok?'ok':'err');
      el.textContent=(x.ok?'OK ':'X  ')+x.accion+'  '+x.ruta+' — '+x.msg;
      res.appendChild(el);
    }
  }catch(_){
    const el=document.createElement('div');el.className='l err';
    el.textContent='X  sin conexión con el server';res.appendChild(el);
  }finally{sync();}
});
sync();
</script></body></html>`;

// ---------- SERVER ----------
http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(HTML);
    }
    if (req.method === 'GET' && req.url === '/estado') {
        const existe = fs.existsSync(RAIZ);
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ existe, total: existe ? contarArchivos(RAIZ) : 0 }));
    }
    if (req.method === 'POST' && req.url === '/aplicar') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const bloques = parsear(body);
            const resultados = bloques.map(b => {
                const r = aplicar(b);
                return { accion: b.accion || '?', ruta: b.ruta || '(sin ruta)', ok: r.ok, msg: r.msg };
            });

            // persistencia
            try { fs.writeFileSync(ULTIMO, body); } catch { }
            try {
                const sello = new Date().toISOString();
                const detalle = resultados.map(r =>
                    `  ${r.ok ? 'ok' : 'X '} ${r.accion} ${r.ruta} — ${r.msg}`
                ).join('\n');
                fs.appendFileSync(LOG, `\n[${sello}]\n${detalle}\n`);
            } catch { }

            // espejo en terminal
            console.log(`\n[${new Date().toISOString()}] ${resultados.length} bloque(s)`);
            for (const r of resultados) console.log(`  ${r.ok ? 'OK' : 'X '} ${r.accion} ${r.ruta} — ${r.msg}`);

            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ resultados }));
        });
        return;
    }
    res.writeHead(404); res.end('no');
}).listen(PUERTO, '127.0.0.1', () => {
    console.log(`listo → http://localhost:${PUERTO}`);
    console.log(`raíz  → ${RAIZ}`);
});