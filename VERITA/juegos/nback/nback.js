// juegos/nback/nback.js — 5 secciones · auto/manual
(function(){
  if(window.__nbackInit) return;
  window.__nbackInit = true;

  function asegurarElementos(){
    var v = document.getElementById('ventana');
    if(!v) return;
    function mk(id, tag, html){
      if(document.getElementById(id)) return;
      var el = document.createElement(tag || 'div');
      el.id = id;
      if(html) el.innerHTML = html;
      v.appendChild(el);
    }
    mk('nback-item');
    mk('nback-estado');
    mk('nback-hud');
    mk('nback-vidas');
    mk('nback-feedback');
    mk('nback-modo');
    if(!document.getElementById('nback-boton')){
      var b = document.createElement('button');
      b.id = 'nback-boton';
      b.textContent = 'ahora';
      v.appendChild(b);
    }
    if(!document.getElementById('nback-boton-avanzar')){
      var b2 = document.createElement('button');
      b2.id = 'nback-boton-avanzar';
      b2.textContent = 'avanzar';
      v.appendChild(b2);
    }
  }
  asegurarElementos();

  var ITEM   = document.getElementById('nback-item');
  var EST    = document.getElementById('nback-estado');
  var HUD    = document.getElementById('nback-hud');
  var VIDAS  = document.getElementById('nback-vidas');
  var BOTON  = document.getElementById('nback-boton');
  var BOTON_AV = document.getElementById('nback-boton-avanzar');
  var FDBK   = document.getElementById('nback-feedback');
  var MODO   = document.getElementById('nback-modo');

  var MAX_VIDAS = 3;
  var POOL = ['🍎','🍌','🍇','🍓','🌟','🔷','❤️','🔺','⚡'];

  var SECCIONES = [
    { n:1, precio:0,   durMostrar:1300, durOculto:420, nombre:'1-back', desc:'compara con el turno anterior',   clave:'nback_1' },
    { n:2, precio:100, durMostrar:1200, durOculto:400, nombre:'2-back', desc:'compara con hace 2 turnos',       clave:'nback_2' },
    { n:3, precio:200, durMostrar:1150, durOculto:380, nombre:'3-back', desc:'compara con hace 3 turnos',       clave:'nback_3' },
    { n:4, precio:350, durMostrar:1050, durOculto:360, nombre:'4-back', desc:'compara con hace 4 turnos',       clave:'nback_4' },
    { n:5, precio:500, durMostrar:1000, durOculto:340, nombre:'5-back', desc:'el más difícil · solo expertos',  clave:'nback_5' }
  ];

  var _idxSeccion = -1;
  var _modo = 'auto';

  var state = {
    turno: 0,
    ganancia: 0,
    vidas: MAX_VIDAS,
    jugando: false,
    historial: [],
    actual: null,
    objetivo: null,
    respondio: false,
    debia: false,
    puede: false,
    tM:null, tO:null, tT:null, tF:null,
    tok: 0
  };

  function seccion(){ return SECCIONES[_idxSeccion] || SECCIONES[0]; }
  function esManual(){ return _modo === 'manual'; }

  function factorVelocidad(){
    var paso = Math.floor(state.turno / 4) * 0.05;
    return 1 - Math.min(0.45, paso);
  }
  function durMostrarActual(){
    return Math.max(600, Math.round(seccion().durMostrar * factorVelocidad()));
  }
  function durOcultoActual(){
    return Math.max(200, Math.round(seccion().durOculto * factorVelocidad()));
  }

  function hud(){
    if(!HUD) return;
    var s = seccion();
    HUD.textContent = s.nombre + ' · turno ' + state.turno + ' · +' + Math.round(state.ganancia) + ' pts';
  }
  function pintarVidas(){
    if(!VIDAS) return;
    VIDAS.innerHTML = '';
    for(var i=0; i<MAX_VIDAS; i++){
      var s = document.createElement('span');
      s.className = 'nback-vida' + (i < state.vidas ? ' on' : '');
      s.textContent = '❤️';
      VIDAS.appendChild(s);
    }
  }

  function limpiarTimers(){
    ['tM','tO','tT','tF'].forEach(function(k){
      if(state[k]){ clearTimeout(state[k]); state[k] = null; }
    });
  }

  function reset(){
    limpiarTimers();
    _idxSeccion = -1;
    _modo = 'auto';
    state.turno = 0;
    state.ganancia = 0;
    state.vidas = MAX_VIDAS;
    state.jugando = false;
    state.historial = [];
    state.actual = null;
    state.objetivo = null;
    state.respondio = false;
    state.debia = false;
    state.puede = false;
    if(ITEM){ ITEM.textContent = ''; ITEM.classList.remove('visible'); }
    if(EST) EST.textContent = '';
    if(FDBK){ FDBK.classList.remove('on','ok','error','silencio'); FDBK.textContent = ''; }
    if(MODO){ MODO.classList.remove('on'); MODO.innerHTML = ''; }
    pintarBotonesModo();
    hud();
    pintarVidas();
  }

  function limpiarPartida(){
    limpiarTimers();
    state.turno = 0;
    state.vidas = MAX_VIDAS;
    state.historial = [];
    state.actual = null;
    state.objetivo = null;
    state.respondio = false;
    state.debia = false;
    state.puede = false;
    if(FDBK){ FDBK.classList.remove('on','ok','error','silencio'); FDBK.textContent = ''; }
    pintarVidas();
  }

  function pintarEstado(){
    if(!EST) return;
    var s = seccion();
    if(!state.puede){
      EST.textContent = 'preparando...';
      EST.classList.remove('puedes');
    } else if(esManual()){
      EST.textContent = '¿es igual al de hace ' + s.n + ' turnos?';
      EST.classList.add('puedes');
    } else {
      EST.textContent = 'pulsa si es igual al de hace ' + s.n + ' turnos';
      EST.classList.add('puedes');
    }
  }

  function pintarBotonesModo(){
    var v = document.getElementById('ventana');
    if(esManual()){
      if(v) v.classList.add('nback-manual');
      if(BOTON) BOTON.textContent = 'pulsar';
    } else {
      if(v) v.classList.remove('nback-manual');
      if(BOTON) BOTON.textContent = 'ahora';
    }
  }

  function feedback(tipo){
    if(!FDBK) return;
    FDBK.classList.remove('on','ok','error','silencio');
    FDBK.textContent = tipo === 'ok' ? '✓' : tipo === 'error' ? '✗' : 'ok';
    FDBK.classList.add(tipo === 'silencio' ? 'silencio' : tipo);
    void FDBK.offsetWidth;
    FDBK.classList.add('on');
    clearTimeout(state.tF);
    state.tF = setTimeout(function(){ FDBK.classList.remove('on'); }, 350);
  }

  function habilitarBoton(){
    if(!BOTON) return;
    BOTON.classList.remove('esperando');
    BOTON.textContent = esManual() ? 'pulsar' : 'ahora';
    state.puede = true;
    pintarEstado();
  }
  function deshabilitarBoton(){
    if(!BOTON) return;
    BOTON.classList.add('esperando');
    BOTON.textContent = 'esperando...';
    state.puede = false;
    pintarEstado();
  }

  function elegirEmoji(){
    var s = seccion();
    var n = s.n;
    var hist = state.historial;
    if(hist.length < n) return POOL[Math.floor(Math.random() * POOL.length)];
    var r = Math.random();
    if(r < 0.5){
      var target = hist[hist.length - n];
      var otras = POOL.filter(function(e){ return e !== target; });
      return otras[Math.floor(Math.random() * otras.length)];
    } else {
      var idx = Math.floor((r - 0.5) * 2 * n);
      idx = Math.max(0, Math.min(n - 1, idx));
      return hist[hist.length - 1 - idx];
    }
  }

  function mostrarEmoji(){
    if(!state.jugando) return;
    var s = seccion();
    var nuevo = elegirEmoji();
    state.actual = nuevo;
    state.respondio = false;
    if(state.historial.length >= s.n){
      state.objetivo = state.historial[state.historial.length - s.n];
      state.debia = (state.objetivo === nuevo);
      habilitarBoton();
    } else {
      state.objetivo = null;
      state.debia = false;
      deshabilitarBoton();
    }
    if(ITEM){
      ITEM.textContent = nuevo;
      ITEM.classList.add('visible');
    }
  }

  function avanzarTurno(){
    state.historial.push(state.actual);
    if(state.historial.length > 20) state.historial.shift();
    state.turno++;
    hud();
  }

  function cicloAuto(){
    if(!state.jugando || esManual()) return;
    mostrarEmoji();
    var dm = durMostrarActual();
    state.tO = setTimeout(function(){
      if(!state.jugando || esManual()) return;
      if(ITEM) ITEM.classList.remove('visible');
      evaluarTurno();
      var do_ = durOcultoActual();
      state.tT = setTimeout(function(){
        if(!state.jugando || esManual()) return;
        avanzarTurno();
        state.tM = setTimeout(cicloAuto, durOcultoActual());
      }, do_);
    }, dm);
  }

  function iniciarManual(){
    if(!state.jugando || !esManual()) return;
    if(ITEM) ITEM.classList.remove('visible');
    setTimeout(function(){
      if(!state.jugando || !esManual()) return;
      mostrarEmoji();
    }, 100);
  }

  function decidirManual(marca){
    if(!state.jugando || !esManual()) return;
    if(state.respondio && marca) return;
    if(!state.actual) return;

    if(marca){
      state.respondio = true;
    } else {
      state.respondio = false;
    }

    if(state.historial.length >= seccion().n){
      evaluarTurno();
    }

    avanzarTurno();
    if(ITEM) ITEM.classList.remove('visible');

    var tok = state.tok;
    setTimeout(function(){
      if(!state.jugando || !esManual() || tok !== state.tok) return;
      iniciarManual();
    }, 420);
  }

  function evaluarTurno(){
    if(state.historial.length < seccion().n) return;
    var ok = (state.debia === state.respondio);
    if(ok){
      if(state.debia){
        sonAcierto();
        feedback('ok');
        state.ganancia += 100;
        hud();
      } else {
        feedback('silencio');
      }
    } else {
      sonFallo();
      feedback('error');
      state.vidas--;
      pintarVidas();
      if(state.vidas <= 0){ setTimeout(terminar, 400); }
    }
  }

  function responderSi(){
    if(esManual()){ decidirManual(true); return; }
    if(!state.jugando) return;
    if(state.respondio) return;
    state.respondio = true;
    if(BOTON){
      BOTON.classList.add('pulsado');
      setTimeout(function(){ BOTON.classList.remove('pulsado'); }, 110);
    }
  }

  function terminar(){
    if(!state.jugando) return;
    state.jugando = false;
    limpiarTimers();
    var ov  = document.getElementById('overlay');
    var txt = document.getElementById('overlay-text');
    if(txt){ txt.textContent = 'perdiste'; txt.classList.add('grande'); }
    var gan = state.ganancia;
    if(gan > 0) verita.sumarPuntos(gan);
    state.ganancia = 0;
    setTimeout(function(){
      if(txt){ txt.textContent = ''; txt.classList.remove('grande'); }
      ov.classList.remove('on');
      if(gan > 0){ sonMonedas(4); mostrarToast('+' + Math.round(gan) + ' pts'); }
    }, 1700);
  }

  function mostrarSelector(tok){
    state.tok = tok;
    if(HUD) HUD.textContent = '';
    var instr = document.getElementById('instruccion');
    if(instr) instr.textContent = 'elige la sección';
    if(ITEM){ ITEM.textContent = ''; ITEM.classList.remove('visible'); }
    if(EST) EST.textContent = '';

    MODO.innerHTML = '<div class="nback-modo-caja"><div class="nback-modo-tit">sección · n-back</div></div>';
    var caja = MODO.querySelector('.nback-modo-caja');

    SECCIONES.forEach(function(sec, i){
      var desbloqueado = verita.estaDesbloqueado && verita.estaDesbloqueado(sec.clave);
      var gratis = sec.precio === 0;
      var btn = document.createElement('button');
      btn.className = 'nback-modo-btn' + (desbloqueado || gratis ? '' : ' bloqueado');
      btn.dataset.idx = i;
      btn.innerHTML =
        '<span class="nback-modo-num">' + sec.n + '-back</span>' +
        '<span class="nback-modo-info">' +
          '<span class="nback-modo-nombre">' + sec.nombre + '</span>' +
          '<span class="nback-modo-desc">' + sec.desc + '</span>' +
        '</span>' +
        (gratis
          ? '<span class="nback-modo-precio" style="background:#dcfce7; color:#14532d">gratis</span>'
          : (desbloqueado
              ? '<span class="nback-modo-precio" style="background:#dcfce7; color:#14532d">✓</span>'
              : '<span class="nback-modo-precio">' + sec.precio + ' 💰</span>'));
      btn.addEventListener('click', function(){ elegirSeccion(i); });
      caja.appendChild(btn);
    });
    MODO.classList.add('on');
  }

  function mostrarSelectorModo(){
    if(HUD) HUD.textContent = '';
    var instr = document.getElementById('instruccion');
    if(instr) instr.textContent = 'elige el modo';

    MODO.innerHTML = '<div class="nback-modo-caja"><div class="nback-modo-tit">modo de juego</div></div>';
    var caja = MODO.querySelector('.nback-modo-caja');

    var modos = [
      { id:'auto',   em:'⚡', nombre:'automático', desc:'el emoji pasa solo · tú solo pulsas si coincide' },
      { id:'manual', em:'👆', nombre:'manual',     desc:'decides el ritmo · pulsar / avanzar' }
    ];

    modos.forEach(function(m){
      var btn = document.createElement('button');
      btn.className = 'nback-modo-btn';
      btn.dataset.idx = m.id;
      btn.innerHTML =
        '<span class="nback-modo-num">' + m.em + '</span>' +
        '<span class="nback-modo-info">' +
          '<span class="nback-modo-nombre">' + m.nombre + '</span>' +
          '<span class="nback-modo-desc">' + m.desc + '</span>' +
        '</span>' +
        '<span class="nback-modo-precio" style="background:#dcfce7; color:#14532d">✓</span>';
      btn.addEventListener('click', function(){
        if(_modoResolver){
          var r = _modoResolver;
          _modoResolver = null;
          MODO.classList.remove('on');
          r(m.id);
        }
      });
      caja.appendChild(btn);
    });
    MODO.classList.add('on');
  }

  var _prepResolver = null;
  var _modoResolver = null;

  async function elegirSeccion(idx){
    if(!MODO.classList.contains('on')) return;
    var sec = SECCIONES[idx];
    var gratis = sec.precio === 0;
    if(!gratis && verita.estaDesbloqueado && !verita.estaDesbloqueado(sec.clave)){
      var ok = await pedirCompra(sec.clave, sec.precio, sec.nombre);
      if(!ok) return;
    }
    MODO.classList.remove('on');
    if(_prepResolver){
      var r = _prepResolver;
      _prepResolver = null;
      r(idx);
    }
  }

  async function preparar(){
    reset();
    var idx = await new Promise(function(resolve){
      _prepResolver = resolve;
      mostrarSelector(state.tok || (++window.__tok));
    });
    if(idx === undefined || idx === null || idx < 0) return false;
    _idxSeccion = idx;
    var sec = SECCIONES[idx];

    var modo = await new Promise(function(resolve){
      _modoResolver = resolve;
      mostrarSelectorModo();
    });
    _modo = (modo === 'manual') ? 'manual' : 'auto';

    var pasosTut;
    if(_modo === 'auto'){
      pasosTut = [
        'aparece un emoji, luego se oculta, luego aparece el siguiente',
        'pulsa el botón "ahora" (o espacio) si es igual al de hace ' + sec.n + ' turnos',
        'si no coincide, no hagas nada · si pulsas de más o de menos pierdes vida',
        'recuérdalo mentalmente · no te mostramos los anteriores',
        'cada 4 turnos acelera un poco · aguanta mientras puedas'
      ];
    } else {
      pasosTut = [
        'el emoji se queda quieto · tú decides el ritmo',
        '"pulsar" → crees que SÍ coincide con el de hace ' + sec.n + ' turnos',
        '"avanzar" → pasas al siguiente sin marcar (skip)',
        'si el emoji SÍ coincidía y le das a "avanzar", pierdes vida',
        'si el emoji NO coincidía, "avanzar" es correcto'
      ];
    }

    await mostrarTutorial({
      emoji: _modo === 'auto' ? '⚡' : '👆',
      titulo: sec.nombre + ' · ' + _modo,
      sub: sec.desc,
      pasos: pasosTut
    }, 'nback');

    if(MODO) MODO.classList.remove('on');
    if(ITEM){ ITEM.textContent = ''; ITEM.classList.remove('visible'); }
    if(EST) EST.textContent = '';
    if(HUD) HUD.textContent = '';
    return true;
  }

  function iniciar(tok){
    if(_idxSeccion < 0){
      reset();
      mostrarSelector(tok);
      return;
    }
    limpiarPartida();
    pintarBotonesModo();

    var instr = document.getElementById('instruccion');
    if(instr) instr.textContent = esManual() ? 'decide el ritmo' : 'pulsa si coincide';

    hud();
    state.jugando = true;

    if(esManual()){
      setTimeout(iniciarManual, 400);
    } else {
      setTimeout(cicloAuto, 400);
    }
  }

  if(BOTON){
    BOTON.addEventListener('click', function(e){ e.preventDefault(); responderSi(); });
    BOTON.addEventListener('touchstart', function(e){ e.preventDefault(); responderSi(); }, {passive:false});
  }
  if(BOTON_AV){
    BOTON_AV.addEventListener('click', function(e){
      e.preventDefault();
      if(esManual()) decidirManual(false);
    });
    BOTON_AV.addEventListener('touchstart', function(e){
      e.preventDefault();
      if(esManual()) decidirManual(false);
    }, {passive:false});
  }

  document.addEventListener('keydown', function(e){
    if(!state.jugando) return;
    if(e.code === 'Space' || e.key === ' '){
      e.preventDefault();
      responderSi();
    }
    if(esManual()){
      if(e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N'){ e.preventDefault(); decidirManual(false); }
    }
  });

  window.__registrarJuego('nback', {
    modo: 'modo-nback',
    instruccion: 'pulsa si coincide',
    preparar: preparar,
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();