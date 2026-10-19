// juegos/stroop/stroop.js
(function(){
  if(window.__stroopInit) return;
  window.__stroopInit = true;

  // ── crear el selector de modo si no existe ──
  function asegurarElementos(){
    var v = document.getElementById('ventana');
    if(!v) return;
    if(!document.getElementById('stroop-modo')){
      var m = document.createElement('div');
      m.id = 'stroop-modo';
      m.innerHTML =
        '<button class="stroop-modo-btn" data-modo="tinta">' +
          '<span class="em">🎨</span>' +
          '<span class="lbl">tinta</span>' +
        '</button>' +
        '<button class="stroop-modo-btn" data-modo="palabra">' +
          '<span class="em">📖</span>' +
          '<span class="lbl">palabra</span>' +
        '</button>';
      v.appendChild(m);
    }
  }
  asegurarElementos();

  var COLORES = { rojo:'#e74c3c', azul:'#3498db', verde:'#2ecc71', amarillo:'#f1c40f' };
  var NOMBRES = Object.keys(COLORES);
  var HUD  = document.getElementById('stroop-hud');
  var PAL  = document.getElementById('stroop-palabra');
  var BOT  = document.getElementById('stroop-botones');
  var TB   = document.getElementById('stroop-timebar').firstElementChild;
  var MODO = document.getElementById('stroop-modo');

  var state = { nivel:0, ganancia:0, jugando:false, timer:null, timeout:null, tinta:'', palabra:'', modo:null, tok:0 };

  function hud(){
    if(HUD) HUD.textContent = 'nivel ' + state.nivel + ' · +' + Math.round(state.ganancia) + ' pts';
  }
  function tiempo(nivel){ return V(Math.max(0.9, 4 - (nivel-1)*0.12), 'stroop'); }
  function puntos(){ return 200; }

  function reset(){
    clearInterval(state.timer);
    clearTimeout(state.timeout);
    state = { nivel:0, ganancia:0, jugando:false, timer:null, timeout:null, tinta:'', palabra:'', modo:null, tok:0 };
    if(PAL) PAL.textContent = '';
    if(BOT) BOT.innerHTML = '';
    if(TB) TB.style.width = '100%';
    if(MODO){
      MODO.classList.remove('on');
      MODO.querySelectorAll('.stroop-modo-btn').forEach(function(b){ b.classList.remove('on'); });
    }
    hud();
  }

  function mostrarSelector(tok){
    state.tok = tok;
    if(HUD) HUD.textContent = '';
    var instr = document.getElementById('instruccion');
    if(instr) instr.textContent = '¿qué quieres entrenar?';
    if(PAL) PAL.textContent = '';
    if(BOT) BOT.innerHTML = '';
    MODO.classList.add('on');
  }

  // click en el selector (una sola vez al cargar)
  MODO.querySelectorAll('.stroop-modo-btn').forEach(function(b){
    b.addEventListener('click', async function(){
      if(!MODO.classList.contains('on')) return;
      if(state.jugando) return;
      var modo = b.dataset.modo;

      if(modo === 'palabra' && verita.estaDesbloqueado && !verita.estaDesbloqueado('stroop_palabra')){
        var ok = await pedirCompra('stroop_palabra', 50, 'stroop palabra');
        if(!ok) return;
      }

      state.modo = modo;
      MODO.querySelectorAll('.stroop-modo-btn').forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      var tok = state.tok;
      setTimeout(function(){
        if(tok !== window.__tok) return;
        MODO.classList.remove('on');
        state.jugando = true;
        var instr = document.getElementById('instruccion');
        if(instr) instr.textContent = (state.modo === 'tinta')
          ? 'elige el color de la tinta'
          : 'elige la palabra';
        nivel(tok);
      }, 260);
    });
  });

  function nivel(tok){
    if(tok !== window.__tok) return;
    state.nivel++;
    var tinta = NOMBRES[Math.floor(Math.random()*4)];
    var palabra;
    if(Math.random() < 0.8){
      var otros = NOMBRES.filter(function(n){ return n !== tinta; });
      palabra = otros[Math.floor(Math.random()*otros.length)];
    } else {
      palabra = tinta;
    }
    state.tinta = tinta;
    state.palabra = palabra;

    PAL.textContent = palabra;
    PAL.style.color = COLORES[tinta];

    var orden = NOMBRES.slice().sort(function(){ return Math.random()-0.5; });
    BOT.innerHTML = '';
    orden.forEach(function(nombre){
      var btn = document.createElement('button');
      btn.textContent = nombre;
      btn.dataset.color = nombre;
      btn.addEventListener('click', function(){ click(nombre, tok); });
      BOT.appendChild(btn);
    });

    hud();
    state.jugando = true;
    var dur = tiempo(state.nivel) * 1000;
    var t0 = performance.now();
    TB.style.width = '100%';
    clearInterval(state.timer);
    state.timer = setInterval(function(){
      if(tok !== window.__tok){ clearInterval(state.timer); return; }
      var p = Math.max(0, 1 - (performance.now() - t0) / dur);
      TB.style.width = (p*100) + '%';
      if(p <= 0){ clearInterval(state.timer); sonFallo(); perder(tok); }
    }, 40);
  }

  function click(nombre, tok){
    if(!state.jugando || tok !== window.__tok) return;
    state.jugando = false;
    clearInterval(state.timer);
    var botones = BOT.querySelectorAll('button');
    var correcta = (state.modo === 'tinta') ? state.tinta : state.palabra;
    if(nombre === correcta){
      sonAcierto();
      state.ganancia += puntos();
      hud();
      state.timeout = setTimeout(function(){ nivel(tok); }, 600);
    } else {
      sonFallo();
      botones.forEach(function(b){
        if(b.dataset.color === correcta) b.classList.add('right');
        if(b.dataset.color === nombre) b.classList.add('wrong');
      });
      state.timeout = setTimeout(function(){ perder(tok); }, 800);
    }
  }

  function perder(tok){
    if(tok !== window.__tok) return;
    state.jugando = false;
    clearInterval(state.timer);
    var txt = document.getElementById('overlay-text');
    txt.textContent = 'perdiste';
    txt.classList.add('grande');
    var gan = state.ganancia;
    if(gan > 0) verita.sumarPuntos(gan);
    state.ganancia = 0;
    setTimeout(function(){
      if(tok !== window.__tok) return;
      txt.textContent = ''; txt.classList.remove('grande');
      document.getElementById('overlay').classList.remove('on');
      if(gan > 0){ sonMonedas(4); mostrarToast('+' + Math.round(gan) + ' pts'); }
    }, 1400);
  }

  function iniciar(tok){
    reset();
    mostrarSelector(tok);
  }

  window.__registrarJuego('stroop', {
    modo: 'modo-stroop',
    instruccion: 'elige la tinta o la palabra',
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();