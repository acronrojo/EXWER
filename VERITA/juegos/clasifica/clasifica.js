// juegos/clasifica/clasifica.js — pulsa A (izquierda) o D (derecha) según la regla
(function(){
  if(window.__clasificaInit) return;
  window.__clasificaInit = true;

  function asegurarElementos(){
    var v = document.getElementById('ventana');
    if(!v) return;
    if(!document.getElementById('clasifica-regla')){
      var r = document.createElement('div');
      r.id = 'clasifica-regla';
      r.innerHTML =
        '<div class="clasifica-regla-lado izq" id="clasifica-lado-izq">◀ <span class="em"></span> <b id="clasifica-cuenta-izq">0</b></div>' +
        '<div class="clasifica-regla-lado der" id="clasifica-lado-der"><b id="clasifica-cuenta-der">0</b> <span class="em"></span> ▶</div>';
      v.appendChild(r);
    }
    if(!document.getElementById('clasifica-item')){
      var it = document.createElement('div');
      it.id = 'clasifica-item';
      v.appendChild(it);
    }
    if(!document.getElementById('clasifica-hud')){
      var h = document.createElement('div');
      h.id = 'clasifica-hud';
      v.appendChild(h);
    }
    if(!document.getElementById('clasifica-vidas')){
      var vi = document.createElement('div');
      vi.id = 'clasifica-vidas';
      v.appendChild(vi);
    }
    if(!document.getElementById('clasifica-controles')){
      var ctrl = document.createElement('div');
      ctrl.id = 'clasifica-controles';
      ctrl.innerHTML =
        '<button class="clasifica-btn izq" data-dir="izq">◀</button>' +
        '<button class="clasifica-btn der" data-dir="der">▶</button>';
      v.appendChild(ctrl);
    }
  }
  asegurarElementos();

  var REGLA = document.getElementById('clasifica-regla');
  var ITEM  = document.getElementById('clasifica-item');
  var HUD   = document.getElementById('clasifica-hud');
  var VIDAS = document.getElementById('clasifica-vidas');
  var CTRL  = document.getElementById('clasifica-controles');
  var LADO_IZQ = document.getElementById('clasifica-lado-izq');
  var LADO_DER = document.getElementById('clasifica-lado-der');

  var MAX_VIDAS = 5;
  var VENTANA_BASE = 3.0;   // segundos para responder

  // grupos de emojis por "tema"
  var GRUPOS = {
    frutas:    ['🍎','🍌','🍇','🍓','🍊','🍉'],
    animales:  ['🐶','🐱','🐰','🐸','🐢','🐧'],
    caras:     ['😀','😎','🤔','😴','🤯','😭'],
    deportes:  ['⚽','🏀','🎾','🏈','🏓','🎳'],
    formas:    ['❤️','⭐','🔷','🟩','🟣','🔺']
  };

  var state = {};

  // ── teclado ──
  function onKey(e){
    if(!state.jugando) return;
    var k = (e.key || '').toLowerCase();
    if(k === 'a' || k === 'arrowleft')  responder('izq');
    if(k === 'd' || k === 'arrowright') responder('der');
  }
  document.addEventListener('keydown', onKey);

  // ── botones táctiles ──
  if(CTRL){
    CTRL.querySelectorAll('.clasifica-btn').forEach(function(b){
      var dir = b.dataset.dir;
      var go = function(e){
        e.preventDefault();
        b.classList.add('pulsado');
        if(state.jugando) responder(dir);
        setTimeout(function(){ b.classList.remove('pulsado'); }, 120);
      };
      b.addEventListener('touchstart', go, {passive:false});
      b.addEventListener('mousedown', go);
    });
  }

  function hud(){
    if(HUD) HUD.textContent = 'nivel ' + state.nivel + ' · +' + Math.round(state.ganancia) + ' pts';
  }
  function pintarVidas(){
    if(!VIDAS) return;
    VIDAS.innerHTML = '';
    for(var i=0; i<MAX_VIDAS; i++){
      var s = document.createElement('span');
      s.className = 'clasifica-vida' + (i < state.vidas ? ' on' : '');
      s.textContent = '❤️';
      VIDAS.appendChild(s);
    }
  }
  function ventanaNivel(){ return Math.max(0.9, VENTANA_BASE - (state.nivel-1)*0.15); }
  function itemsPorLado(){
    // nivel 1: 1 item por lado, después sube
    return Math.min(3, 1 + Math.floor((state.nivel-1)/3));
  }

  function reset(){
    clearTimeout(state.timer);
    clearTimeout(state.nivelTimer);
    state = {
      nivel: 1,
      ganancia: 0,
      vidas: MAX_VIDAS,
      jugando: false,
      actual: null,
      timer: null,
      nivelTimer: null,
      itemsIzq: [],
      itemsDer: []
    };
    if(ITEM){ ITEM.textContent = ''; ITEM.className = ''; }
    if(LADO_IZQ) LADO_IZQ.querySelector('.em').textContent = '';
    if(LADO_DER) LADO_DER.querySelector('.em').textContent = '';
    hud();
    pintarVidas();
  }

  function nuevaRegla(){
    // elegir grupo y asignar cuántos emojis a cada lado
    var claves = Object.keys(GRUPOS);
    var grupo = GRUPOS[claves[Math.floor(Math.random()*claves.length)]].slice();
    // mezclar
    grupo.sort(function(){ return Math.random()-0.5; });

    var n = itemsPorLado();          // cuántos por lado
    state.itemsIzq = grupo.slice(0, n);
    state.itemsDer = grupo.slice(n, n*2);
    state.grupoNombre = claves;

    // pintar la regla arriba
    LADO_IZQ.querySelector('.em').textContent = state.itemsIzq.join(' ');
    LADO_DER.querySelector('.em').textContent = state.itemsDer.join(' ');
  }

  function nuevaRonda(){
    if(!state.jugando) return;
    // elegir un item aleatorio entre los válidos
    var pool = state.itemsIzq.map(function(e){ return { e:e, dir:'izq' }; })
              .concat(state.itemsDer.map(function(e){ return { e:e, dir:'der' }; }));
    var pick = pool[Math.floor(Math.random()*pool.length)];
    state.actual = pick;

    if(ITEM){
      ITEM.textContent = pick.e;
      ITEM.className = 'entrando';
      // forzar reflow para reiniciar animación
      void ITEM.offsetWidth;
      ITEM.classList.remove('entrando');
      ITEM.classList.add('entrando');
    }

    var dur = ventanaNivel() * 1000;
    state.timer = setTimeout(function(){
      if(!state.jugando) return;
      // no respondió a tiempo → pierde vida
      sonFallo();
      flashear('error');
      state.vidas--;
      pintarVidas();
      if(state.vidas <= 0){ terminar(); return; }
      nuevaRonda();
    }, dur);
  }

  function responder(dir){
    if(!state.jugando || !state.actual) return;
    clearTimeout(state.timer);
    var correcto = state.actual.dir;
    var acerto = (dir === correcto);

    // animación de vuelo
    ITEM.classList.remove('entrando');
    ITEM.classList.add(dir === 'izq' ? 'volar-izq' : 'volar-der');

    if(acerto){
      sonAcierto();
      flashear('ok');
      state.ganancia += 100;
      hud();
      setTimeout(function(){
        ITEM.classList.remove('volar-izq','volar-der');
        nuevaRonda();
      }, 380);
    } else {
      sonFallo();
      flashear('error');
      state.vidas--;
      pintarVidas();
      if(state.vidas <= 0){
        setTimeout(terminar, 380);
        return;
      }
      setTimeout(function(){
        ITEM.classList.remove('volar-izq','volar-der');
        nuevaRonda();
      }, 500);
    }
  }

  function flashear(tipo){
    var v = document.getElementById('ventana');
    if(!v) return;
    v.classList.add(tipo === 'ok' ? 'flash-ok' : 'flash-error');
    setTimeout(function(){
      v.classList.remove('flash-ok','flash-error');
    }, 180);
  }

  function nivelUp(){
    if(!state.jugando) return;
    state.nivel++;
    hud();
    // cada 2 niveles cambia la regla
    if(state.nivel % 2 === 0) nuevaRegla();
    state.nivelTimer = setTimeout(nivelUp, 10000);
  }

  function terminar(){
    if(!state.jugando) return;
    state.jugando = false;
    clearTimeout(state.timer);
    clearTimeout(state.nivelTimer);

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

  function iniciar(tok){
    reset();
    state.jugando = true;
    nuevaRegla();
    nuevaRonda();
    state.nivelTimer = setTimeout(nivelUp, 10000);
  }

  window.__registrarJuego('clasifica', {
    modo: 'modo-clasifica',
    instruccion: 'A = izquierda · D = derecha',
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();