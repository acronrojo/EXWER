(function(){
  if(window.__stroop2Init) return;
  window.__stroop2Init = true;

  function asegurarElementos(){
    var v = document.getElementById('ventana');
    if(!v) return;
    if(!document.getElementById('stroop2-palabra')){
      var p = document.createElement('div');
      p.id = 'stroop2-palabra';
      v.appendChild(p);
    }
    if(!document.getElementById('stroop2-chip')){
      var c = document.createElement('div');
      c.id = 'stroop2-chip';
      v.appendChild(c);
    }
    if(!document.getElementById('stroop2-botones')){
      var b = document.createElement('div');
      b.id = 'stroop2-botones';
      v.appendChild(b);
    }
    if(!document.getElementById('stroop2-timebar')){
      var tb = document.createElement('div');
      tb.id = 'stroop2-timebar';
      tb.innerHTML = '<div></div>';
      v.appendChild(tb);
    }
    if(!document.getElementById('stroop2-hud')){
      var h = document.createElement('div');
      h.id = 'stroop2-hud';
      v.appendChild(h);
    }
  }
  asegurarElementos();

  // ── miniatura: "2" apilado encima de 🎨 ──
  (function(){
    var m = document.querySelector('.card[data-juego="stroop2"] .stroop2-mini');
    if(!m) return;
    m.innerHTML = '<span class="num">2</span><span class="emoji">🎨</span>';
  })();

  var COLORES = { rojo:'#e74c3c', azul:'#3498db', verde:'#2ecc71', amarillo:'#f1c40f' };
  var NOMBRES = Object.keys(COLORES);
  var HUD  = document.getElementById('stroop2-hud');
  var PAL  = document.getElementById('stroop2-palabra');
  var CHIP = document.getElementById('stroop2-chip');
  var BOT  = document.getElementById('stroop2-botones');
  var TB   = document.getElementById('stroop2-timebar').firstElementChild;

  var state = { nivel:0, ganancia:0, jugando:false, timer:null, timeout:null, tinta:'', palabra:'', regla:'tinta', correcta:'' };

  function hud(){
    if(HUD) HUD.textContent = 'nivel ' + state.nivel + ' · +' + Math.round(state.ganancia) + ' pts';
  }

  // más tiempo que el stroop original: 6s arriba, baja 0.1 por nivel, mínimo 1.6s
  function tiempo(nivel){ return V(Math.max(1.6, 6 - (nivel-1)*0.10), 'stroop2'); }
  function puntos(){ return 250; }

  function reset(){
    clearInterval(state.timer);
    clearTimeout(state.timeout);
    state = { nivel:0, ganancia:0, jugando:false, timer:null, timeout:null, tinta:'', palabra:'', regla:'tinta', correcta:'' };
    if(PAL) PAL.textContent = '';
    if(CHIP){ CHIP.textContent = ''; CHIP.className = ''; }
    if(BOT) BOT.innerHTML = '';
    if(TB) TB.style.width = '100%';
    hud();
  }

  function nivel(tok){
    if(tok !== window.__tok) return;
    state.nivel++;

    // 1) tinta y palabra
    var tinta = NOMBRES[Math.floor(Math.random()*4)];
    var palabra;
    if(Math.random() < 0.8){
      var otros = NOMBRES.filter(function(n){ return n !== tinta; });
      palabra = otros[Math.floor(Math.random()*otros.length)];
    } else {
      palabra = tinta;
    }

    // 2) regla de la ronda: tinta o palabra
    var regla = Math.random() < 0.5 ? 'tinta' : 'palabra';

    state.tinta = tinta;
    state.palabra = palabra;
    state.regla = regla;
    state.correcta = (regla === 'tinta') ? tinta : palabra;

    // 3) instrucción arriba (dinámica)
    var instr = document.getElementById('instruccion');
    if(instr) instr.textContent = 'elige la ' + regla;

    // 4) palabra grande
    PAL.textContent = palabra;
    PAL.style.color = COLORES[tinta];

    // 5) chip diferenciador abajo
    CHIP.textContent = regla;
    CHIP.className = regla;

    // 6) botones
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
    if(nombre === state.correcta){
      sonAcierto();
      state.ganancia += puntos();
      hud();
      state.timeout = setTimeout(function(){ nivel(tok); }, 700);
    } else {
      sonFallo();
      botones.forEach(function(b){
        if(b.dataset.color === state.correcta) b.classList.add('right');
        if(b.dataset.color === nombre) b.classList.add('wrong');
      });
      state.timeout = setTimeout(function(){ perder(tok); }, 900);
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
    nivel(tok);
  }

  window.__registrarJuego('stroop2', {
    modo: 'modo-stroop2',
    instruccion: 'elige la tinta',
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();