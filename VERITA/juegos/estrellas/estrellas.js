(function(){
  if(window.__estreInit) return;
  window.__estreInit = true;

  function asegurarElementos(){
    var ventana = document.getElementById('ventana');
    if(!ventana) return;
    if(!document.getElementById('estre-campo')){
      var c = document.createElement('div');
      c.id = 'estre-campo';
      ventana.insertBefore(c, ventana.firstChild);
    }
    if(!document.getElementById('estre-hud')){
      var h = document.createElement('div');
      h.id = 'estre-hud';
      ventana.appendChild(h);
    }
    if(!document.getElementById('estre-vidas')){
      var v = document.createElement('div');
      v.id = 'estre-vidas';
      ventana.appendChild(v);
    }
  }
  asegurarElementos();

  var HUD     = document.getElementById('estre-hud');
  var CONTADOR= document.getElementById('estre-vidas');
  var CAMPO   = document.getElementById('estre-campo');

  var INICIAL = 5;
  var MAX_VISIBLES = 25;

  var state = {};

  function hud(){
    if(HUD) HUD.textContent = 'nivel ' + state.nivel + ' · +' + Math.round(state.ganancia) + ' pts';
  }

  function pintarEstrellas(){
    if(!CONTADOR) return;
    CONTADOR.innerHTML = '';
    var n = state.estrellas;
    var mostrar = Math.min(n, MAX_VISIBLES);
    for(var i = 0; i < mostrar; i++){
      var s = document.createElement('span');
      s.className = 'estre-punto';
      s.textContent = '⭐';
      // pequeño delay para el efecto de brinco
      s.style.animationDelay = (i * 8) + 'ms';
      CONTADOR.appendChild(s);
    }
    if(n > MAX_VISIBLES){
      var extra = document.createElement('span');
      extra.className = 'estre-extra';
      extra.textContent = '+' + (n - MAX_VISIBLES);
      CONTADOR.appendChild(extra);
    }
  }

  function duracion(){ return V(Math.max(550, 1400 - (state.nivel-1)*70), 'estrellas'); }
  function pausa(){ return V(Math.max(280, 950 - (state.nivel-1)*55), 'estrellas'); }
  function maxConcurrentes(){
    if(state.nivel <= 3) return 1;
    if(state.nivel <= 6) return 2;
    return 3;
  }

  function reset(){
    if(state.spawnTimer) clearTimeout(state.spawnTimer);
    if(state.nivelTimer) clearTimeout(state.nivelTimer);
    (state.activas || []).forEach(function(f){
      if(f.timer) clearTimeout(f.timer);
      if(f.el && f.el.parentNode) f.el.parentNode.removeChild(f.el);
    });
    state = {
      nivel: 1,
      ganancia: 0,
      estrellas: INICIAL,
      jugando: false,
      activas: [],
      spawnTimer: null,
      nivelTimer: null
    };
    if(CAMPO) CAMPO.innerHTML = '';
    var ov = document.getElementById('overlay');
    if(ov) ov.classList.remove('estre-perdiste');
    hud();
    pintarEstrellas();
  }

  function spawn(tok){
    if(tok !== window.__tok || !state.jugando) return;
    var W = CAMPO.clientWidth;
    var H = CAMPO.clientHeight;
    var size = 64;
    // zona segura: 12% margen lateral, arriba 12%, abajo 42% (para no chocar con las estrellas recogidas)
    var margenX = Math.max(40, W * 0.12);
    var margenTop = Math.max(40, H * 0.12);
    var margenBot = Math.max(120, H * 0.42);
    var xmin = margenX;
    var xmax = Math.max(xmin, W - margenX - size);
    var ymin = margenTop;
    var ymax = Math.max(ymin, H - margenBot - size);
    var x = xmin + Math.random() * (xmax - xmin);
    var y = ymin + Math.random() * (ymax - ymin);

    var el = document.createElement('div');
    el.className = 'estre-luz';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.innerHTML = '<span class="estre-glow"></span><span class="estre-emoji">⭐</span>';

    var viva = { el: el, viva: true, timer: null };
    state.activas.push(viva);
    CAMPO.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('on'); });

    el.addEventListener('click', function(e){
      e.stopPropagation();
      if(!viva.viva) return;
      viva.viva = false;
      clearTimeout(viva.timer);
      el.classList.add('atrapada');
      sonAcierto();
      state.estrellas++;
      state.ganancia += 100;
      hud();
      pintarEstrellas();
      setTimeout(function(){
        if(el.parentNode) el.parentNode.removeChild(el);
        var i = state.activas.indexOf(viva);
        if(i >= 0) state.activas.splice(i, 1);
      }, 220);
    });

    viva.timer = setTimeout(function(){
      if(tok !== window.__tok || !state.jugando) return;
      if(!viva.viva) return;
      viva.viva = false;
      el.classList.remove('on');
      el.classList.add('perdida');
      try{ window.nota(330, 0.12, 0.15, 'sine'); }catch(e){}
      state.estrellas--;
      pintarEstrellas();
      setTimeout(function(){
        if(el.parentNode) el.parentNode.removeChild(el);
        var i = state.activas.indexOf(viva);
        if(i >= 0) state.activas.splice(i, 1);
      }, 320);
      if(state.estrellas <= 0) terminar(tok);
    }, duracion());
  }

  function tick(tok){
    if(tok !== window.__tok || !state.jugando) return;
    var vivas = state.activas.filter(function(f){ return f.viva; }).length;
    if(vivas < maxConcurrentes()) spawn(tok);
    state.spawnTimer = setTimeout(function(){ tick(tok); }, pausa());
  }

  function nivelUp(tok){
    if(tok !== window.__tok || !state.jugando) return;
    state.nivel++;
    hud();
    state.nivelTimer = setTimeout(function(){ nivelUp(tok); }, 8000);
  }

  function terminar(tok){
    if(!state.jugando) return;
    state.jugando = false;
    clearTimeout(state.spawnTimer);
    clearTimeout(state.nivelTimer);
    state.activas.forEach(function(f){
      if(f.timer) clearTimeout(f.timer);
      if(f.el) f.el.classList.remove('on');
    });

    var ov  = document.getElementById('overlay');
    var txt = document.getElementById('overlay-text');
    ov.classList.add('estre-perdiste');
    if(txt){ txt.textContent = 'perdiste'; txt.classList.add('grande'); }

    var gan = state.ganancia;
    if(gan > 0) verita.sumarPuntos(gan);
    state.ganancia = 0;

    setTimeout(function(){
      if(tok !== window.__tok) return;
      ov.classList.remove('estre-perdiste');
      if(txt){ txt.textContent = ''; txt.classList.remove('grande'); }
      ov.classList.remove('on');
      if(gan > 0){ sonMonedas(4); mostrarToast('+' + Math.round(gan) + ' pts'); }
    }, 1900);
  }

  function iniciar(tok){
    reset();
    state.jugando = true;
    tick(tok);
    state.nivelTimer = setTimeout(function(){ nivelUp(tok); }, 8000);
  }

  window.__registrarJuego('estrellas', {
    modo: 'modo-estrellas',
    instruccion: 'atrapa estrellas · no las dejes escapar',
    iniciar: iniciar,
    reset: reset,
    ganancia: function(){ return state.ganancia; }
  });
})();