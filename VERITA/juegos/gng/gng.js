(function(){
  if(window.__gngInit) return;
  window.__gngInit = true;
  var BTN = document.getElementById('gng-btn');
  var HUD = document.getElementById('gng-hud');
  var state = { nivel:0, ganancia:0, racha:0, jugando:false, aceptando:false, timer:null, timeout:null, color:'', t0:0 };
  function hud(){
    if(HUD) HUD.textContent = 'nivel ' + state.nivel + ' · racha ' + state.racha + ' · +' + Math.round(state.ganancia) + ' pts';
  }
  function puntos(){ return 300; }
  function verdeWindow(nivel){ return V(Math.max(250, 900 - (nivel-1)*25), 'gng'); }
  function rojoWindow(nivel){ return V(Math.max(500, 1200 - (nivel-1)*20), 'gng'); }
  function grisDelay(nivel){
    var base = V(Math.max(150, 900 - (nivel-1)*25) * 0.5, 'gng');
    return base * (0.85 + Math.random() * 0.3);
  }
  function reset(){
    clearTimeout(state.timer);
    clearTimeout(state.timeout);
    state = { nivel:0, ganancia:0, racha:0, jugando:false, aceptando:false, timer:null, timeout:null, color:'', t0:0 };
    if(BTN){ BTN.className=''; BTN.textContent=''; }
    hud();
  }
  function siguiente(tok){
    if(tok !== window.__tok) return;
    state.nivel++;
    state.aceptando = false;
    BTN.className = 'espera';
    BTN.textContent = '🔘';
    hud();
    var delay = grisDelay(state.nivel);
    state.timer = setTimeout(function(){
      if(tok !== window.__tok) return;
      var esVerde = Math.random() < 0.65;
      state.color = esVerde ? 'verde' : 'rojo';
      state.aceptando = true;
      state.t0 = performance.now();
      BTN.className = state.color;
      BTN.textContent = esVerde ? '✓' : '✕';
      var ventana = esVerde ? verdeWindow(state.nivel) : rojoWindow(state.nivel);
      state.timeout = setTimeout(function(){
        if(tok !== window.__tok) return;
        if(state.color === 'rojo'){
          var pts = 200;
          state.ganancia += pts;
          state.racha++;
          sonAcierto();
          hud();
          state.aceptando = false;
          BTN.className = '';
          BTN.textContent = '';
          state.timer = setTimeout(function(){ siguiente(tok); }, 400);
        } else {
          state.aceptando = false;
          perder(tok);
        }
      }, ventana);
    }, delay);
  }
  function click(tok){
    if(tok !== window.__tok) return;
    if(!state.aceptando) return;
    state.aceptando = false;
    clearTimeout(state.timeout);
    if(state.color === 'verde'){
      var pts = puntos();
      state.ganancia += pts;
      state.racha++;
      sonAcierto();
      hud();
      BTN.className = '';
      BTN.textContent = '';
      state.timer = setTimeout(function(){ siguiente(tok); }, 350);
    } else {
      perder(tok);
    }
  }
  function perder(tok){
    if(tok !== window.__tok) return;
    state.jugando = false;
    state.aceptando = false;
    clearTimeout(state.timer);
    clearTimeout(state.timeout);
    sonFallo();
    BTN.className = 'rojo';
    BTN.textContent = '✕';
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
    state.jugando = true;
    siguiente(tok);
  }
  if(BTN){
    BTN.addEventListener('click', function(){ click(window.__tok); });
  }
  window.__registrarJuego('gng', {
    modo: 'modo-gng',
    instruccion: 'verde = click · rojo = espera',
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();