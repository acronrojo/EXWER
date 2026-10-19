(function(){
  if(window.__afkInit) return;
  window.__afkInit = true;
  var CONT = document.getElementById('afk-contador');
  var HUD  = document.getElementById('afk-hud');
  var state = { ganancia:0, jugando:false, timer:null };
  function reset(){
    clearInterval(state.timer);
    state = { ganancia:0, jugando:false, timer:null };
    if(CONT) CONT.textContent = '0';
    if(HUD)  HUD.textContent  = '';
  }
  function tick(tok){
    if(tok !== window.__tok){ clearInterval(state.timer); return; }
    state.ganancia += 10;
    if(CONT) CONT.textContent = Math.round(state.ganancia);
    if(HUD)  HUD.textContent  = '+' + Math.round(state.ganancia) + ' pts';
  }
  function iniciar(tok){
    reset();
    state.jugando = true;
    if(CONT) CONT.textContent = '0';
    if(HUD)  HUD.textContent  = '+0 pts';
    state.timer = setInterval(function(){ tick(tok); }, V(500, 'afk'));
  }
  window.__registrarJuego('afk', {
    modo: 'modo-afk',
    instruccion: 'no hagas nada',
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();