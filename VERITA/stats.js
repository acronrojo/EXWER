// stats.js — estadísticas de juego
(function(){
  if(window.__statsInit) return;
  window.__statsInit = true;

  var CLAVE = 'verita-stats';
  var stats = {};
  try { stats = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch(e){ stats = {}; }

  var actual = null;
  var acumulado = 0;

  function guardar(){
    try { localStorage.setItem(CLAVE, JSON.stringify(stats)); }catch(e){}
  }

  // envolver verita.sumarPuntos para contar lo ganado durante la sesión
  function attachWrapper(){
    if(!window.verita || !verita.sumarPuntos) return;
    if(verita.__statsWrapped) return;
    var orig = verita.sumarPuntos;
    verita.sumarPuntos = function(n){
      if(actual) acumulado += n;
      return orig.apply(verita, arguments);
    };
    verita.__statsWrapped = true;
  }

  window.__statsIniciar = function(juego){
    attachWrapper();
    actual = { juego: juego, inicio: Date.now() };
    acumulado = 0;
  };

  window.__statsCerrar = function(){
    if(!actual) return;
    var dur = Date.now() - actual.inicio;
    var j = actual.juego;
    if(!stats[j]) stats[j] = { sesiones:0, tiempoTotal:0, puntosTotales:0 };
    stats[j].sesiones++;
    stats[j].tiempoTotal += dur;
    stats[j].puntosTotales += acumulado;
    guardar();
    actual = null;
    acumulado = 0;
  };

  window.__statsVer = function(){ return stats; };
  window.__statsReset = function(){ stats = {}; guardar(); };

  window.addEventListener('beforeunload', function(){
    if(actual) window.__statsCerrar();
  });
})();