// ─── estado de la sesión ───
const CLAVE_ESTADO = 'verita-estado';
const S = {
  tiempo: 0,
  puntos: 0,
  racha: 0,
  monedas: 0,
  diamantes: 0,
  iq: null,
  unlocks: {},
  velocidad: { diferente:'rapido', stroop:'rapido', stroop2:'rapido', gng:'rapido', simon:'medio', afk:'lento', estrellas:'rapido', desliza:'lento', clasifica:'rapido', nback:'rapido' }
};

function guardarEstado(){
  try{
    localStorage.setItem(CLAVE_ESTADO, JSON.stringify({
      tiempo:    S.tiempo,
      puntos:    S.puntos,
      racha:     S.racha,
      monedas:   S.monedas,
      diamantes: S.diamantes,
      iq:        S.iq,
      unlocks:   S.unlocks || {}
    }));
  }catch(e){ console.warn('no se pudo guardar:', e); }
}
function cargarEstado(){
  try{
    const raw = localStorage.getItem(CLAVE_ESTADO);
    if(!raw) return;
    const g = JSON.parse(raw);
    if(!g || typeof g !== 'object') return;
    ['tiempo','puntos','racha','monedas','diamantes'].forEach(function(k){
      if(typeof g[k] === 'number' && isFinite(g[k])) S[k] = g[k];
    });
    if(typeof g.iq === 'number' && isFinite(g.iq)) S.iq = g.iq;
    if(g.unlocks && typeof g.unlocks === 'object') S.unlocks = g.unlocks;
  }catch(e){ console.warn('no se pudo cargar:', e); }
}

function pintar(){
  for(const [k,v] of Object.entries(S)){
    const el = document.querySelector('[data-recurso="' + k + '"]');
    if(!el) continue;
    if(k === 'puntos' && window.animandoPuntos) continue;
    el.querySelector('.val').textContent = (v === null || v === undefined) ? '—' : v;
    el.classList.toggle('off', (v === null || v === undefined || v === 0));
  }
}

window.verita = {
  estado: S,
  sumarPuntos:     function(n){ S.puntos    += n; pintar(); guardarEstado(); },
  sumarRacha:      function(n){ n = n || 1; S.racha += n; pintar(); guardarEstado(); },
  sumarDiamantes:  function(n){ S.diamantes += n; pintar(); guardarEstado(); },
  sumarMonedas:    function(n){ S.monedas   += n; pintar(); guardarEstado(); },
  gastarMonedas:   function(n){
    if(S.monedas < n) return false;
    S.monedas -= n;
    pintar();
    guardarEstado();
    return true;
  },
  gastarGemas:     function(n){
    if(S.diamantes < n) return false;
    S.diamantes -= n;
    pintar();
    guardarEstado();
    return true;
  },
  estaDesbloqueado: function(clave){ return !!(S.unlocks && S.unlocks[clave]); },
  desbloquear:      function(clave){
    if(!S.unlocks) S.unlocks = {};
    S.unlocks[clave] = true;
    guardarEstado();
  },
  guardar: function(){ guardarEstado(); },
  setIQ: function(v){ S.iq = v; pintar(); guardarEstado(); },
  velocidadFactor: function(juego){
    const v = (S.velocidad && S.velocidad[juego]) || 'rapido';
    if(v === 'lento') return 1.8;
    if(v === 'medio') return 1.3;
    return 1.0;
  }
};

setInterval(function(){
  S.tiempo++;
  S.puntos++;
  pintar();
  if(S.tiempo % 5 === 0) guardarEstado();
}, 1000);

window.addEventListener('beforeunload', guardarEstado);
window.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'hidden') guardarEstado();
});

cargarEstado();
pintar();

document.querySelectorAll('.tab').forEach(function(t){
  t.addEventListener('click', function(){
    document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('on'); });
    t.classList.add('on');
    const v = t.dataset.v;
    document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('on', p.dataset.p === v); });
    if(v === 'monedas' && window.refrescarEconomia) setTimeout(window.refrescarEconomia, 0);
  });
});

const FONDOS = ['🍃','🌿','🌱','🍀','🌸','🌺','🌻','🍎','⭐','💧'];
function fondoAlAzar(){
  return FONDOS[Math.floor(Math.random()*FONDOS.length)];
}
function svgFondo(emojis, op){
  var arr = Array.isArray(emojis) ? emojis : [emojis];
  if(!arr.length) arr = ['🍎'];
  var n = arr.length;
  var cell = 60;
  var size = cell * n;
  var font = 30;
  var partes = '';
  for(var f=0; f<n; f++){
    for(var c=0; c<n; c++){
      var emoji = arr[(f + c) % n];
      var x = cell/2 + c*cell;
      var y = cell/2 + f*cell;
      partes += "<text x='" + x + "' y='" + y + "' font-size='" + font + "' text-anchor='middle' dominant-baseline='central' opacity='" + op + "'>" + emoji + "</text>";
    }
  }
  return "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "'>" + partes + "</svg>\")";
}
const COLORES_PASTEL = ['#fecaca','#fed7aa','#fef08a','#bbf7d0','#a5f3fc','#bfdbfe','#ddd6fe','#fbcfe8','#d9f99d','#e9d5ff'];

function pintarFondoMiniaturas(){
  const cards = Array.from(document.querySelectorAll('.card'));
  const grid  = document.getElementById('grid');
  if(!cards.length || !grid) return;
  const cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length);
  const usadosEmoji = [];
  const usadosColor = [];

  cards.forEach(function(card, i){
    const t = card.querySelector('.thumb');
    if(!t) return;

    const n = 1 + Math.floor(Math.random() * 3);
    const vecE = [];
    if(i % cols > 0)  vecE.push(usadosEmoji[i - 1]);
    if(i >= cols)     vecE.push(usadosEmoji[i - cols]);

    let set = [];
    let intentos = 0;
    while(set.length < n && intentos < 120){
      intentos++;
      const e = fondoAlAzar();
      if(set.indexOf(e) >= 0) continue;
      let choca = false;
      vecE.forEach(function(vec){
        if(vec && vec.indexOf(e) >= 0) choca = true;
      });
      if(choca) continue;
      set.push(e);
    }
    while(set.length < n) set.push(fondoAlAzar());
    usadosEmoji[i] = set;

    const vecC = [];
    if(i % cols > 0)  vecC.push(usadosColor[i - 1]);
    if(i >= cols)     vecC.push(usadosColor[i - cols]);
    let color, intentosC = 0;
    do {
      color = COLORES_PASTEL[Math.floor(Math.random()*COLORES_PASTEL.length)];
      intentosC++;
    } while(vecC.indexOf(color) >= 0 && intentosC < 50);
    usadosColor[i] = color;

    card.dataset.fondo = set.join('|');
    card.dataset.color = color;
    t.style.backgroundImage = svgFondo(set, '0.18');
    t.style.backgroundSize  = (60 * set.length) + 'px ' + (60 * set.length) + 'px';
    t.style.backgroundRepeat = 'repeat';
    t.style.backgroundPosition = '0 0';
    t.style.backgroundColor = color;
  });
}
pintarFondoMiniaturas();

const TOAST = document.getElementById('toast');
function mostrarToast(txt){
  if(!TOAST) return;
  TOAST.textContent = txt;
  TOAST.classList.add('on');
  setTimeout(function(){ TOAST.classList.remove('on'); }, 1700);
}

(function(){
  const lapiz = document.getElementById('perfil-lapiz');
  if(!lapiz) return;
  lapiz.addEventListener('click', function(){
    const titulo = document.getElementById('perfil-titulo');
    if(!titulo || titulo.tagName === 'INPUT') return;
    const actual = titulo.textContent;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = actual;
    inp.className = 'titulo-input';
    inp.maxLength = 30;
    titulo.replaceWith(inp);
    inp.focus();
    inp.select();
    function guardar(){
      const nuevo = inp.value.trim() || 'perfil';
      const h = document.createElement('h2');
      h.id = 'perfil-titulo';
      h.textContent = nuevo;
      inp.replaceWith(h);
      try{ localStorage.setItem('verita-perfil-titulo', nuevo); }catch(e){}
    }
    inp.addEventListener('blur', guardar);
    inp.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); inp.blur(); }
      if(e.key === 'Escape'){ inp.value = actual; inp.blur(); }
    });
  });
  try{
    const guardado = localStorage.getItem('verita-perfil-titulo');
    if(guardado){
      const t = document.getElementById('perfil-titulo');
      if(t) t.textContent = guardado;
    }
  }catch(e){}
})();

// ─── velocidad + skill dentro de la miniatura ───
(function(){
  const ORDEN_VEL = ['lento','medio','rapido'];
  const VEL_LABEL = { lento:'lento', medio:'medio', rapido:'rápido' };

  function pintarVelTags(){
    document.querySelectorAll('.card').forEach(function(card){
      const v = S.velocidad[card.dataset.juego] || 'rapido';
      card.querySelectorAll('.vel-tag-thumb').forEach(function(tag){
        tag.className = 'vel-tag vel-tag-thumb ' + v;
        tag.textContent = VEL_LABEL[v] || v;
      });
    });
  }
  function ciclar(card){
    const j = card.dataset.juego;
    const actual = S.velocidad[j] || 'rapido';
    S.velocidad[j] = ORDEN_VEL[(ORDEN_VEL.indexOf(actual)+1) % 3];
    pintarVelTags();
  }

  document.querySelectorAll('.card').forEach(function(card){
    const thumb = card.querySelector('.thumb');
    const sk = card.querySelector('.skills');
    if(!thumb) return;

    const tag = document.createElement('span');
    tag.className = 'vel-tag vel-tag-thumb';
    tag.title = 'click para cambiar velocidad';
    tag.addEventListener('click', function(e){ e.stopPropagation(); ciclar(card); });
    thumb.appendChild(tag);

    if(sk){
      const first = sk.querySelector('.skill');
      if(first){
        const corner = first.cloneNode(true);
        corner.classList.add('skill-corner');
        thumb.appendChild(corner);
      }
    }
  });

  pintarVelTags();
})();

// ─── header responsive ───
(function(){
  const top = document.getElementById('top');
  const vista = document.getElementById('vista');
  if(!top || !vista) return;
  function ubicarHeader(){
    const esMovil = window.matchMedia('(max-width:720px)').matches;
    if(esMovil){
      const activo = document.querySelector('.panel.on');
      if(activo && top.parentElement !== activo){
        activo.insertBefore(top, activo.firstChild);
      }
    } else if(top.parentElement !== document.body){
      document.body.insertBefore(top, vista);
    }
  }
  document.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click', function(){ setTimeout(ubicarHeader, 0); });
  });
  window.addEventListener('resize', ubicarHeader);
  window.addEventListener('orientationchange', ubicarHeader);
  ubicarHeader();
})();

// ─── panel economía 3x3 ───
// ahora: el usuario dice CUÁNTO QUIERE RECIBIR (destino)
// y la app calcula cuánto le cuesta en el origen
(function(){
  function fmt(n){ return Math.round(n).toLocaleString('es-CO'); }
  var TASAS = { puntos: 1, monedas: 100, gemas: 10000 };
  var EMOJI = { puntos: '⭐', monedas: '💰', gemas: '💎' };
  var NOMBRE = { puntos: 'puntos', monedas: 'monedas', gemas: 'gemas' };
  var CANT_KEY = { puntos: 'puntos', monedas: 'monedas', gemas: 'diamantes' };

  var origen = 'puntos';
  var destino = 'monedas';

  function getCant(t){ return S[CANT_KEY[t]] || 0; }
  function setCant(t, v){ S[CANT_KEY[t]] = v; }

  function pintarTodo(){
    var grid = document.getElementById('econ-grid');
    if(!grid) return;

    grid.querySelectorAll('.econ-cell').forEach(function(c){
      var tipo = c.dataset.tipo;
      var cantEl = c.querySelector('.econ-cant');
      if(cantEl) cantEl.textContent = fmt(getCant(tipo));
      var sel = (c.dataset.modo === 'origen') ? (tipo === origen) : (tipo === destino);
      c.classList.toggle('on', sel);
    });

    var input = document.getElementById('econ-input');
    var prev = document.getElementById('econ-preview');
    var aceptar = document.getElementById('econ-aceptar');
    if(!input || !prev || !aceptar) return;

    var quiero = parseInt(input.value, 10) || 0;

    if(origen === destino){
      prev.textContent = 'elige monedas distintas';
      prev.classList.add('invalido');
      aceptar.disabled = true;
      return;
    }
    if(quiero <= 0){
      prev.textContent = '—';
      prev.classList.remove('invalido');
      aceptar.disabled = true;
      return;
    }

    // cuánto del origen hace falta para recibir 'quiero' del destino
    var necesitas = Math.ceil(quiero * TASAS[destino] / TASAS[origen]);

    if(necesitas > getCant(origen)){
      prev.textContent = 'te faltan ' + fmt(necesitas - getCant(origen)) + ' ' + NOMBRE[origen];
      prev.classList.add('invalido');
      aceptar.disabled = true;
      return;
    }

    prev.classList.remove('invalido');
    prev.innerHTML = 'cuesta <b>' + fmt(necesitas) + '</b> ' + EMOJI[origen];
    aceptar.disabled = false;
  }

  window.refrescarEconomia = pintarTodo;

  function init(){
    var grid = document.getElementById('econ-grid');
    if(!grid) return;

    grid.querySelectorAll('.econ-cell').forEach(function(cell){
      cell.addEventListener('click', function(){
        var modo = cell.dataset.modo;
        var tipo = cell.dataset.tipo;
        if(modo === 'origen') origen = tipo;
        else destino = tipo;
        pintarTodo();
      });
    });

    var input = document.getElementById('econ-input');
    if(input) input.addEventListener('input', pintarTodo);

    var aceptar = document.getElementById('econ-aceptar');
    if(aceptar) aceptar.addEventListener('click', function(){
      if(aceptar.disabled) return;
      var inp = document.getElementById('econ-input');
      var quiero = parseInt(inp.value, 10) || 0;
      if(quiero <= 0) return;
      if(origen === destino) return;

      var necesitas = Math.ceil(quiero * TASAS[destino] / TASAS[origen]);
      if(necesitas > getCant(origen)) return;

      setCant(origen, getCant(origen) - necesitas);
      setCant(destino, getCant(destino) + quiero);
      pintar();
      guardarEstado();

      if(typeof mostrarToast === 'function'){
        mostrarToast('+' + fmt(quiero) + ' ' + EMOJI[destino]);
      }
      if(typeof sonMonedas === 'function') sonMonedas(4);

      inp.value = '';
      pintarTodo();
    });

    pintarTodo();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();

// ─── override: fondos siempre 3×3 + shuffle de cards ───
(function(){
  // 1) svgFondo siempre con grid 3×3 (antes variaba 1×1, 2×2 o 3×3)
  window.svgFondo = function(emojis, op){
    var arr = Array.isArray(emojis) ? emojis : [emojis];
    if(!arr.length) arr = ['🍎'];
    var n = 3;                 // ← siempre 3×3
    var cell = 60;
    var size = cell * n;
    var font = 30;
    var partes = '';
    for(var f = 0; f < n; f++){
      for(var c = 0; c < n; c++){
        var emoji = arr[(f + c) % arr.length];
        var x = cell/2 + c*cell;
        var y = cell/2 + f*cell;
        partes += "<text x='" + x + "' y='" + y + "' font-size='" + font + "' text-anchor='middle' dominant-baseline='central' opacity='" + op + "'>" + emoji + "</text>";
      }
    }
    return "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "'>" + partes + "</svg>\")";
  };

  // 2) shuffle de las cards en el grid
  function shuffleCards(){
    var grid = document.getElementById('grid');
    if(!grid) return;
    var cards = Array.from(grid.children);
    for(var i = cards.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = cards[i]; cards[i] = cards[j]; cards[j] = t;
    }
    cards.forEach(function(c){ grid.appendChild(c); });
  }

  // 3) boot: shuffle + repintar fondos con el nuevo svgFondo
  function boot(){
    shuffleCards();
    if(typeof pintarFondoMiniaturas === 'function'){
      pintarFondoMiniaturas();
    }
    // re-pintar precios también (por si ya estaban pintados con el orden viejo)
    if(window.__pintarPreciosCards) window.__pintarPreciosCards();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 30); });
  } else {
    setTimeout(boot, 30);
  }
})();