// tutoriales.js — tutorial + botón de ayuda verde en cada juego
(function(){
  if(window.__tutorialesInit) return;
  window.__tutorialesInit = true;

  window.__tutoriales  = {};
  window.__juegoActual = null;

  window.mostrarTutorial = function(cfg, juego){
    if(juego) window.__tutoriales[juego] = cfg;
    return new Promise(function(resolve){
      var ventana = document.getElementById('ventana');
      if(!ventana) return resolve();

      var btnAyuda = document.getElementById('btn-ayuda');
      var btnVisibleAntes = btnAyuda && btnAyuda.style.display !== 'none';
      if(btnAyuda) btnAyuda.style.display = 'none';

      var box = document.createElement('div');
      box.className = 'tut-box';

      var pasosHTML = (cfg.pasos || []).map(function(p, i){
        return '<div class="tut-paso">' +
                 '<span class="tut-num">' + (i+1) + '</span>' +
                 '<span class="tut-txt">' + p + '</span>' +
               '</div>';
      }).join('');

      // emoji: si viene emojiHTML lo usamos, si no el emoji normal
      var emHTML = cfg.emojiHTML || (cfg.emoji || '📖');

      box.innerHTML =
        '<div class="tut-caja">' +
          '<div class="tut-em">' + emHTML + '</div>' +
          '<h2 class="tut-titulo">' + (cfg.titulo || 'cómo se juega') + '</h2>' +
          (cfg.sub ? '<p class="tut-sub">' + cfg.sub + '</p>' : '') +
          '<div class="tut-pasos">' + pasosHTML + '</div>' +
          '<button class="tut-okay" type="button">okay</button>' +
        '</div>';

      ventana.appendChild(box);
      requestAnimationFrame(function(){ box.classList.add('on'); });

      var btn = box.querySelector('.tut-okay');
      var cerrado = false;
      var cerrar = function(){
        if(cerrado) return;
        cerrado = true;
        box.classList.remove('on');
        setTimeout(function(){
          box.remove();
          if(btnAyuda && btnVisibleAntes) btnAyuda.style.display = 'flex';
          resolve();
        }, 220);
      };
      btn.addEventListener('click', cerrar);

      var onKey = function(e){
        if(e.key === ' ' || e.key === 'Enter'){
          e.preventDefault();
          document.removeEventListener('keydown', onKey);
          cerrar();
        }
      };
      setTimeout(function(){ document.addEventListener('keydown', onKey); }, 100);
    });
  };

  window.__activarBotonAyuda = function(juego){
    window.__juegoActual = juego;
    var v = document.getElementById('ventana');
    if(!v) return;
    var b = document.getElementById('btn-ayuda');
    if(!b){
      b = document.createElement('button');
      b.id = 'btn-ayuda';
      b.className = 'btn-ayuda';
      b.type = 'button';
      b.textContent = '?';
      b.title = 'ver tutorial';
      b.addEventListener('click', function(e){
        e.stopPropagation();
        e.preventDefault();
        var j = window.__juegoActual;
        if(!j) return;
        var cfg = window.__tutoriales[j];
        if(cfg) window.mostrarTutorial(cfg, j);
      });
      v.appendChild(b);
    }
    b.style.display = 'flex';
  };

  window.__desactivarBotonAyuda = function(){
    window.__juegoActual = null;
    var b = document.getElementById('btn-ayuda');
    if(b) b.style.display = 'none';
  };
})();