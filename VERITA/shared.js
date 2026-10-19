// shared.js — audio, helpers, animaciones
(function(){
  if(window.__sharedInit) return;
  window.__sharedInit = true;

  // ── audio ──
  var actx = null;
  window.initAudio = function(){
    try{
      if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if(actx.state === 'suspended') actx.resume();
    }catch(e){}
  };
  window.nota = function(freq, dur, vol, tipo){
    dur = dur || 0.20; vol = vol || 0.35; tipo = tipo || 'sine';
    try{
      window.initAudio();
      if(!actx) return;
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = tipo; o.frequency.value = freq;
      var t0 = actx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(actx.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    }catch(e){}
  };
  var TONOS = { q1:261.63, q2:329.63, q3:392.00, q4:523.25 };
  window.sonQ = function(c){ window.nota(TONOS[c] || 440, 0.22, 0.32, 'triangle'); };
  window.sonAcierto = function(){
    window.nota(880, 0.10, 0.28);
    setTimeout(function(){ window.nota(1174.66, 0.14, 0.28); }, 70);
  };
  window.sonFallo = function(){
    window.nota(220, 0.14, 0.35, 'square');
    setTimeout(function(){ window.nota(174.61, 0.18, 0.35, 'square'); }, 130);
    setTimeout(function(){ window.nota(130.81, 0.34, 0.35, 'sawtooth'); }, 260);
  };
  window.sonMonedas = function(n){
    n = n || 5;
    for(var i=0; i<n; i++){
      (function(i){
        setTimeout(function(){
          window.nota(1046.50, 0.08, 0.30, 'square');
          setTimeout(function(){ window.nota(1567.98, 0.10, 0.26, 'square'); }, 45);
        }, i*90);
      })(i);
    }
  };
  window.son321 = function(n){
    window.nota([523.25, 587.33, 659.25][n-1] || 523.25, 0.18, 0.32, 'square');
  };
  window.sonYa = function(){ window.nota(880, 0.28, 0.35, 'square'); };

  // ── helper de velocidad ──
  window.V = function(ms, juego){ return ms * verita.velocidadFactor(juego); };

  // ── token global ──
  window.__tok = 0;

  // ── registro de juegos ──
  window.__juegos = {};
  window.__registrarJuego = function(nombre, api){
    window.__juegos[nombre] = api;
  };

  // ── refs comunes ──
  window.VENT = document.getElementById('ventana');

  // ── animaciones ──
  window.animarEstrellas = function(ganancia){
    var ventana = document.getElementById('ventana');
    var dest = document.querySelector('[data-recurso="puntos"]');
    if(!ventana || !dest) return;
    dest.classList.remove('off');
    var vr = ventana.getBoundingClientRect();
    var dr = dest.getBoundingClientRect();
    var sx = vr.left + vr.width/2, sy = vr.top + vr.height/2;
    var ex = dr.left + dr.width/2, ey = dr.top + dr.height/2;
    var n = Math.min(20, Math.max(8, Math.floor(ganancia/2)));
    for(var i=0; i<n; i++){
      (function(i){
        var s = document.createElement('div');
        s.textContent = '⭐';
        s.style.cssText = 'position:fixed;left:'+sx+'px;top:'+sy+'px;font-size:26px;z-index:5000;pointer-events:none;opacity:1;transform:translate(-50%,-50%);transition:left 1.2s cubic-bezier(.4,.05,.6,1),top 1.2s cubic-bezier(.4,.05,.6,1),transform 1.2s ease,opacity .35s ease .85s';
        document.body.appendChild(s);
        setTimeout(function(){
          requestAnimationFrame(function(){
            s.style.left = ex + 'px';
            s.style.top  = ey + 'px';
            s.style.opacity = '0';
            s.style.transform = 'translate(-50%,-50%) scale(.4)';
          });
        }, i*40);
        setTimeout(function(){ s.remove(); }, 1800 + i*40);
      })(i);
    }
  };
  window.animarContador = function(desde, hasta, dur){
    var el = document.querySelector('[data-recurso="puntos"] .val');
    if(!el) return;
    window.animandoPuntos = true;
    var t0 = performance.now();
    var tick = function(){
      var p = Math.min(1, (performance.now()-t0)/dur);
      el.textContent = Math.round(desde + (hasta-desde)*p);
      if(p < 1) requestAnimationFrame(tick);
      else { window.animandoPuntos = false; el.textContent = hasta; }
    };
    requestAnimationFrame(tick);
  };
})();

// ─── modal de compra ───
window.pedirCompra = function(clave, costo, nombre){
  return new Promise(function(resolve){
    if(window.verita && verita.estaDesbloqueado && verita.estaDesbloqueado(clave)){
      return resolve(true);
    }
    if(!window.verita || !verita.estado) return resolve(false);

    if(verita.estado.monedas < costo){
      if(window.mostrarToast) mostrarToast('te faltan monedas');
      return resolve(false);
    }

    var m = document.createElement('div');
    m.className = 'compra-modal';
    m.innerHTML =
      '<div class="compra-caja">' +
        '<div class="compra-em">💰</div>' +
        '<h3 class="compra-titulo">desbloquear</h3>' +
        '<p class="compra-nombre">' + nombre + '</p>' +
        '<div class="compra-precio">' + costo + ' 💰</div>' +
        '<p class="compra-saldo">tienes ' + verita.estado.monedas + ' 💰</p>' +
        '<div class="compra-btns">' +
          '<button class="compra-cancelar" type="button">cancelar</button>' +
          '<button class="compra-aceptar" type="button">comprar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    requestAnimationFrame(function(){ m.classList.add('on'); });

    function cerrar(ok){
      m.classList.remove('on');
      setTimeout(function(){ m.remove(); }, 200);
      resolve(ok);
    }

    m.querySelector('.compra-cancelar').addEventListener('click', function(){ cerrar(false); });
    m.addEventListener('click', function(e){ if(e.target === m) cerrar(false); });
    m.querySelector('.compra-aceptar').addEventListener('click', function(){
      if(!verita.gastarMonedas(costo)){
        if(window.mostrarToast) mostrarToast('sin monedas');
        return cerrar(false);
      }
      verita.desbloquear(clave);
      if(window.mostrarToast) mostrarToast('desbloqueado ✓');
      if(typeof sonMonedas === 'function') sonMonedas(4);
      if(window.refrescarEconomia) window.refrescarEconomia();

      // 🔑 avisar a las cards que repinten el precio/desbloqueado
      if(window.__pintarPreciosCards){
        try { window.__pintarPreciosCards(); }catch(e){}
      }
      // refrescar panel del juego abierto (por si tiene lista con precios)
      if(typeof window.__refrescarPreciosJuego === 'function'){
        try { window.__refrescarPreciosJuego(clave); }catch(e){}
      }

      cerrar(true);
    });
  });
};