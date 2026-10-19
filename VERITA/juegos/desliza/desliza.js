// juegos/desliza/desliza.js — puzzle con selector de tamaño (3x3 gratis)
(function(){
  if(window.__deslizaInit) return;
  window.__deslizaInit = true;

  function asegurarElementos(){
    var v = document.getElementById('ventana');
    if(!v) return;
    if(!document.getElementById('desliza-grid')){
      var g = document.createElement('div');
      g.id = 'desliza-grid';
      v.appendChild(g);
    }
    if(!document.getElementById('desliza-hud')){
      var h = document.createElement('div');
      h.id = 'desliza-hud';
      v.appendChild(h);
    }
    if(!document.getElementById('desliza-modo')){
      var m = document.createElement('div');
      m.id = 'desliza-modo';
      m.innerHTML =
        '<div class="desliza-modo-caja">' +
          '<div class="desliza-modo-tit">elige el tamaño</div>' +
          '<button class="desliza-modo-btn" data-tam="3">' +
            '<span class="em">3×3</span>' +
            '<span class="lbl">8 fichas · gratis</span>' +
            '<span class="precio gratis">✓</span>' +
          '</button>' +
          '<button class="desliza-modo-btn" data-tam="4">' +
            '<span class="em">4×4</span>' +
            '<span class="lbl">15 fichas</span>' +
            '<span class="precio">75 💰</span>' +
          '</button>' +
          '<button class="desliza-modo-btn" data-tam="5">' +
            '<span class="em">5×5</span>' +
            '<span class="lbl">24 fichas</span>' +
            '<span class="precio">100 💰</span>' +
          '</button>' +
        '</div>';
      v.appendChild(m);
    }
  }
  asegurarElementos();

  var GRID = document.getElementById('desliza-grid');
  var HUD  = document.getElementById('desliza-hud');
  var MODO = document.getElementById('desliza-modo');

  var COSTOS = { 3: 0, 4: 75, 5: 100 };

  var state = {
    tam: 0,
    ganancia: 0,
    cols: 0,
    rows: 0,
    board: [],
    jugando: false,
    moves: 0,
    tok: 0
  };

  var _prepResolver = null;

  function base(cols, rows){
    var n = cols * rows;
    var b = [];
    for(var i = 1; i < n; i++) b.push(i);
    b.push(0);
    return b;
  }

  function hud(){
    if(HUD) HUD.textContent =
      state.cols + '×' + state.rows +
      ' · movs ' + state.moves +
      ' · +' + Math.round(state.ganancia) + ' pts';
  }

  var MOVE_REWARD = 25;
  function bonusResuelto(){
    if(state.tam === 3) return 2500;
    if(state.tam === 4) return 5000;
    return 10000;
  }

  function reset(){
    state = {
      tam: 0,
      ganancia: 0,
      cols: 0,
      rows: 0,
      board: [],
      jugando: false,
      moves: 0,
      tok: 0
    };
    if(GRID) GRID.innerHTML = '';
    if(MODO){
      MODO.classList.remove('on');
      MODO.querySelectorAll('.desliza-modo-btn').forEach(function(b){ b.classList.remove('on'); });
    }
    hud();
  }

  function vecinos(i){
    var out = [];
    var cols = state.cols, rows = state.rows;
    var r = Math.floor(i/cols), c = i%cols;
    if(r > 0) out.push(i - cols);
    if(r < rows-1) out.push(i + cols);
    if(c > 0) out.push(i - 1);
    if(c < cols-1) out.push(i + 1);
    return out;
  }
  function adyacente(a, b){
    var cols = state.cols;
    var ra = Math.floor(a/cols), ca = a%cols;
    var rb = Math.floor(b/cols), cb = b%cols;
    return (Math.abs(ra-rb) + Math.abs(ca-cb)) === 1;
  }
  function resuelto(){
    var n = state.cols * state.rows;
    for(var i = 0; i < n-1; i++) if(state.board[i] !== i+1) return false;
    return state.board[n-1] === 0;
  }
  function shuffleDe(cols, rows){
    var area = cols * rows;
    return area * 8 + 20;
  }
  function mezclar(n){
    var cols = state.cols, rows = state.rows;
    var hueco = cols * rows - 1;
    var ultimo = -1;
    for(var k = 0; k < n; k++){
      var vs = vecinos(hueco).filter(function(v){ return v !== ultimo; });
      if(!vs.length) continue;
      var pick = vs[Math.floor(Math.random()*vs.length)];
      var t = state.board[hueco];
      state.board[hueco] = state.board[pick];
      state.board[pick] = t;
      ultimo = hueco;
      hueco = pick;
    }
  }

  function pintar(){
    if(!GRID) return;
    GRID.innerHTML = '';
    var cols = state.cols, rows = state.rows;
    GRID.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    GRID.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
    for(var i = 0; i < cols*rows; i++){
      (function(idx){
        var v = state.board[idx];
        var celda = document.createElement('div');
        celda.className = 'desliza-tile';
        if(v === 0){
          celda.classList.add('empty');
          celda.textContent = '';
        } else {
          celda.textContent = v;
          if(v === idx + 1) celda.classList.add('correcta');
          celda.addEventListener('click', function(){ tap(idx); });
        }
        GRID.appendChild(celda);
      })(i);
    }
  }

  function tap(idx){
    if(!state.jugando) return;
    var hueco = state.board.indexOf(0);
    if(!adyacente(idx, hueco)) return;
    var t = state.board[idx];
    state.board[idx] = 0;
    state.board[hueco] = t;
    state.moves++;
    state.ganancia += MOVE_REWARD;
    sonQ('q3');
    pintar();
    hud();
    if(resuelto()) ganarNivel();
  }

  function nuevaPartida(tok){
    if(tok !== window.__tok) return;
    state.cols = state.tam;
    state.rows = state.tam;
    state.board = base(state.cols, state.rows);
    mezclar(shuffleDe(state.cols, state.rows));
    if(resuelto()) mezclar(4);
    state.moves = 0;
    pintar();
    hud();
    state.jugando = true;
  }

  function ganarNivel(){
    state.jugando = false;
    sonAcierto();
    state.ganancia += bonusResuelto();
    hud();
    var tok = window.__tok;
    setTimeout(function(){
      if(tok !== window.__tok) return;
      nuevaPartida(tok);
    }, 900);
  }

  function mostrarSelector(tok){
    state.tok = tok;
    if(HUD) HUD.textContent = '';
    var instr = document.getElementById('instruccion');
    if(instr) instr.textContent = 'elige el tamaño';
    if(GRID) GRID.innerHTML = '';
    MODO.classList.add('on');
  }

  function resolvePrep(idx){
    if(_prepResolver){ _prepResolver(idx); _prepResolver = null; }
  }

  MODO.querySelectorAll('.desliza-modo-btn').forEach(function(b){
    b.addEventListener('click', async function(){
      if(!MODO.classList.contains('on')) return;
      var tam = parseInt(b.dataset.tam, 10);
      var clave = 'desliza_' + tam;

      if(COSTOS[tam] > 0 && verita.estaDesbloqueado && !verita.estaDesbloqueado(clave)){
        var ok = await pedirCompra(clave, COSTOS[tam], 'desliza ' + tam + '×' + tam);
        if(!ok) return;
      }

      MODO.classList.remove('on');
      resolvePrep(tam);
    });
  });

  async function preparar(){
    reset();
    return new Promise(function(resolve){
      _prepResolver = resolve;
      mostrarSelector(state.tok || (++window.__tok));
    }).then(async function(tam){
      if(!tam) return false;
      state.tam = tam;

      await mostrarTutorial({
        emoji: '🧩',
        titulo: 'desliza ' + tam + '×' + tam,
        sub: 'ordena las fichas',
        pasos: [
          'toca una ficha que esté al lado del hueco vacío',
          'la ficha se desliza hacia el hueco',
          'ordena los números de menor a mayor, empezando por el 1',
          'cada movimiento suma +25 pts, y completar el puzzle suma un bonus'
        ]
      }, 'desliza');

      if(MODO) MODO.classList.remove('on');
      if(GRID) GRID.innerHTML = '';
      if(HUD) HUD.textContent = '';
      return true;
    });
  }

  function iniciar(tok){
    // ya se eligió tamaño en preparar
    if(!state.tam){
      reset();
      mostrarSelector(tok);
      return;
    }
    var instr = document.getElementById('instruccion');
    if(instr) instr.textContent = 'desliza para ordenar';
    var tam = state.tam;
    reset();
    state.tam = tam;
    nuevaPartida(tok);
  }

  window.__registrarJuego('desliza', {
    modo: 'modo-desliza',
    instruccion: 'desliza para ordenar',
    preparar: preparar,
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();