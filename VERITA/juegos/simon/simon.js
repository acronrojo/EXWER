(function(){
  if(window.__simonInit) return;
  window.__simonInit = true;
  var HUD = document.getElementById('simon-hud');
  var state = { seq:[], idx:0, turn:0, ganancia:0, playing:false, accepting:false };
  var COLORES = ['q1','q2','q3','q4'];
  function hud(){
    if(HUD) HUD.textContent = 'turno ' + state.turn + ' · +' + Math.round(state.ganancia) + ' pts';
  }
  function flashQ(cls, dur){
    var el = VENT.querySelector('.q.' + cls);
    if(!el) return;
    el.classList.add('flash');
    sonQ(cls);
    setTimeout(function(){ el.classList.remove('flash'); }, dur);
  }
  function reset(){
    state = { seq:[], idx:0, turn:0, ganancia:0, playing:false, accepting:false };
    VENT.querySelectorAll('.q').forEach(function(q){ q.classList.remove('flash'); });
    hud();
  }
  function mostrarSecuencia(tok){
    state.playing = true;
    state.accepting = false;
    return new Promise(function(resolve){
      var i = 0;
      var step = function(){
        if(tok !== window.__tok) return resolve(false);
        if(i >= state.seq.length){
          setTimeout(function(){
            if(tok !== window.__tok) return resolve(false);
            state.playing = false;
            state.accepting = true;
            resolve(true);
          }, V(550, 'simon'));
          return;
        }
        setTimeout(function(){
          if(tok !== window.__tok) return resolve(false);
          flashQ(state.seq[i++], V(430, 'simon'));
          step();
        }, V(550, 'simon'));
      };
      step();
    });
  }
  function nuevoTurno(tok){
    if(tok !== window.__tok) return;
    state.turn++;
    state.seq.push(COLORES[Math.floor(Math.random()*4)]);
    state.idx = 0;
    hud();
    mostrarSecuencia(tok);
  }
  function iniciar(tok){
    reset();
    nuevoTurno(tok);
  }
  VENT.querySelectorAll('.q').forEach(function(el){
    el.addEventListener('click', function(){
      if(!state.accepting) return;
      var cls = COLORES.find(function(c){ return el.classList.contains(c); });
      if(!cls) return;
      flashQ(cls, 220);
      if(state.seq[state.idx] === cls){
        state.idx++;
        if(state.idx >= state.seq.length){
          state.accepting = false;
          var pts = 1000;
          state.ganancia += pts;
          sonAcierto();
          hud();
          var tok = window.__tok;
          setTimeout(function(){ nuevoTurno(tok); }, V(900, 'simon'));
        }
      } else {
        state.accepting = false;
        state.playing = false;
        sonFallo();
        var txt = document.getElementById('overlay-text');
        txt.textContent = 'perdiste';
        txt.classList.add('grande');
        var gan = state.ganancia;
        if(gan > 0) verita.sumarPuntos(gan);
        state.ganancia = 0;
        setTimeout(function(){
          txt.textContent = ''; txt.classList.remove('grande');
          document.getElementById('overlay').classList.remove('on');
          if(gan > 0){ sonMonedas(4); mostrarToast('+' + Math.round(gan) + ' pts'); }
        }, 1400);
      }
    });
  });
  window.__registrarJuego('simon', {
    modo: 'modo-simon',
    instruccion: 'sigue la secuencia',
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
  window.simonGanancia = function(){ return state.ganancia; };
})();