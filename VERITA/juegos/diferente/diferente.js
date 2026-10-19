// juegos/diferente/diferente.js
(function(){
  if(window.__difInit) return;
  window.__difInit = true;

  var DIF_GRID = document.getElementById('dif-grid');
  var DIF_HUD  = document.getElementById('dif-hud');
  var DIF_TB   = document.getElementById('dif-timebar').firstElementChild;

  // pares visibles: cada uno tiene que ser detectable a simple vista
  var PARES = [
    ['🍎','🍏'],   // roja vs verde
    ['🌕','🌑'],   // llena vs nueva
    ['⭐','🌟'],   // plana vs brillante
    ['❤️','💙'],   // rojo vs azul
    ['🐶','🐱'],   // perro vs gato
    ['🌸','🌺'],   // flor clara vs flor fuerte
    ['🔵','🔴'],   // azul vs rojo
    ['🍀','☘️'],   // trébol 4 vs 3 hojas
    ['🌞','🌙'],   // sol vs luna
    ['🍇','🍒'],   // uvas vs cerezas
    ['🐸','🐢'],   // rana vs tortuga
    ['🚗','🚙']    // coche rojo vs SUV azul
  ];

  var TAMANOS = [
    [2,1],[3,1],[3,2],[4,2],[4,3],[5,3],[5,4],
    [6,4],[6,5],[7,5],[8,5],[8,6],[10,6]
  ];
  var RONDAS_POR_TAMANO = 3;

  var state = { nivel:0, ganancia:0, jugando:false, timer:null, timeout:null };

  function hud(){
    if(DIF_HUD) DIF_HUD.textContent = 'nivel ' + state.nivel + ' · +' + Math.round(state.ganancia) + ' pts';
  }
  function tiempo(nivel){ return V(Math.max(3, 8 - Math.floor((nivel-1)/2)), 'diferente'); }
  function puntos(){ return 200; }

  function reset(){
    clearInterval(state.timer);
    clearTimeout(state.timeout);
    state = { nivel:0, ganancia:0, jugando:false, timer:null, timeout:null };
    if(DIF_GRID) DIF_GRID.innerHTML = '';
    if(DIF_TB) DIF_TB.style.width = '100%';
    hud();
  }

  function nivel(tok){
    if(tok !== window.__tok) return;
    state.nivel++;
    var idx = Math.min(Math.floor((state.nivel - 1) / RONDAS_POR_TAMANO), TAMANOS.length - 1);
    var cols = TAMANOS[idx][0], rows = TAMANOS[idx][1];
    var total = cols * rows;
    var par = PARES[Math.floor(Math.random()*PARES.length)];
    var distinto = Math.floor(Math.random() * total);

    // instrucción con el emoji visible
    var instr = document.getElementById('instruccion');
    if(instr) instr.innerHTML = 'halla <b>' + par[1] + '</b>';

    DIF_GRID.innerHTML = '';
    var gap = 6;
    var W = VENT.clientWidth  * 0.82;
    var H = VENT.clientHeight * 0.68;
    var cellW = (W - gap*(cols-1)) / cols;
    var cellH = (H - gap*(rows-1)) / rows;
    var cell = Math.max(30, Math.min(cellW, cellH, 130));
    DIF_GRID.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cell + 'px)';
    DIF_GRID.style.gridAutoRows = cell + 'px';
    DIF_GRID.style.gap = gap + 'px';
    DIF_GRID.style.fontSize = Math.round(cell * 0.7) + 'px';

    for(var i=0; i<total; i++){
      (function(k){
        var d = document.createElement('div');
        d.textContent = (k === distinto) ? par[1] : par[0];
        d.addEventListener('click', function(){ click(k, distinto, tok); });
        DIF_GRID.appendChild(d);
      })(i);
    }

    hud();
    state.jugando = true;
    var dur = tiempo(state.nivel) * 1000;
    var t0 = performance.now();
    DIF_TB.style.width = '100%';
    clearInterval(state.timer);
    state.timer = setInterval(function(){
      if(tok !== window.__tok){ clearInterval(state.timer); return; }
      var p = Math.max(0, 1 - (performance.now() - t0) / dur);
      DIF_TB.style.width = (p*100) + '%';
      if(p <= 0){ clearInterval(state.timer); sonFallo(); perder(tok); }
    }, 40);
  }

  function click(i, correcto, tok){
    if(!state.jugando || tok !== window.__tok) return;
    state.jugando = false;
    clearInterval(state.timer);
    var cells = DIF_GRID.children;
    if(i === correcto){
      cells[i].classList.add('right');
      sonAcierto();
      state.ganancia += puntos();
      hud();
      state.timeout = setTimeout(function(){ nivel(tok); }, 700);
    } else {
      cells[i].classList.add('wrong');
      cells[correcto].classList.add('right');
      sonFallo();
      state.timeout = setTimeout(function(){ perder(tok); }, 700);
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

  window.__registrarJuego('diferente', {
    modo: 'modo-diferente',
    instruccion: 'halla',
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();