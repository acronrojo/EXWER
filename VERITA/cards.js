// cards.js — abre juegos desde las cards y cierra el overlay.
(function(){
  if(window.__cardsInit) return;
  window.__cardsInit = true;

  var PRECIOS = {
    stroop2:   75,
    afk:       100,
    estrellas: 150,
    clasifica: 75
  };

  var SUBS = {
    desliza: ['desliza_4', 'desliza_5'],
    nback:   ['nback_2', 'nback_3', 'nback_4', 'nback_5']
  };

  var MULTI = {
    desliza: '3×3 gratis',
    nback:   '1-back gratis'
  };

  // tutoriales para juegos que NO usan preparar() propio
  var TUTORIALES = {
    diferente: {
      emoji: '🍎',
      titulo: 'encuentra el diferente',
      sub: 'atención visual · velocidad',
      pasos: [
        'aparece una grilla llena de emojis iguales',
        'solo uno es diferente · puede ser otro color, otra forma o estar volteado',
        'la instrucción de arriba te dice cuál buscar',
        'toca el emoji diferente antes de que se agote el tiempo',
        'cada ronda la grilla crece y el tiempo se acorta'
      ]
    },
    stroop: {
      emoji: '🎨',
      titulo: 'stroop',
      sub: 'inhibición · velocidad de procesamiento',
      pasos: [
        'aparece una palabra pintada con un color distinto al que dice',
        'primero eliges modo: tinta (color) o palabra (texto)',
        'si elegiste tinta → toca el botón del color de la tinta',
        'si elegiste palabra → toca el botón que coincida con el texto',
        'cada ronda el tiempo se reduce'
      ]
    },
    stroop2: {
      emoji: '🤯',
      titulo: 'stroop dual',
      sub: 'flexibilidad cognitiva · cambio de tarea',
      pasos: [
        'aparece una palabra pintada con un color distinto',
        'el chip de abajo te dice qué regla usar: TINTA o PALABRA',
        'la regla cambia al azar entre rondas',
        'toca el botón correcto antes de que se acabe el tiempo',
        'tienes más tiempo que en el stroop normal'
      ]
    },
    gng: {
      emoji: '🔘',
      titulo: 'go / no-go',
      sub: 'inhibición · atención sostenida',
      pasos: [
        'aparece un botón central que cambia de color',
        'si se pone verde ✓ → toca el botón rápido',
        'si se pone rojo ✕ → NO toques y deja que se apague solo',
        'si tocas en verde = +pts · si dejas pasar el rojo = +pts',
        'si tocas el rojo o dejas pasar el verde = pierdes vida'
      ]
    },
    simon: {
      emojiHTML: '<div class="tut-simon"><div class="q q1"></div><div class="q q2"></div><div class="q q3"></div><div class="q q4"></div><div class="center"></div></div>',
      titulo: 'simón',
      sub: 'memoria de trabajo · atención sostenida',
      pasos: [
        'los 4 cuadrantes se iluminan en secuencia',
        'observa el orden completo',
        'después repítelo tocando los cuadrantes en el mismo orden',
        'cada turno la secuencia crece 1',
        'si te equivocas pierdes'
      ]
    },
    afk: {
      emoji: '🌿',
      titulo: 'afk game',
      sub: 'modo idle',
      pasos: [
        'no hagas nada · el contador sube solo',
        'cada segundo acumulas puntos',
        'no hay que tocar nada · solo mira',
        'al cerrar con la X se cobra el total acumulado',
        'el factor x10 multiplica cada tick'
      ]
    },
    estrellas: {
      emoji: '⭐',
      titulo: 'estrellas',
      sub: 'velocidad de reacción · coordinación',
      pasos: [
        'aparecen estrellas ⭐ en el cielo',
        'toca cada una antes de que se apague',
        'empiezas con 5 estrellas de vida abajo',
        'cada estrella atrapada suma ⭐ y +100 pts',
        'si dejas escapar 5 estrellas pierdes'
      ]
    },
    clasifica: {
      emoji: '↔️',
      titulo: 'clasifica',
      sub: 'velocidad de decisión · atención selectiva',
      pasos: [
        'arriba hay dos grupos: izquierda y derecha',
        'aparece un emoji en el centro',
        'pulsa A (o botón ◀) si va a la izquierda',
        'pulsa D (o botón ▶) si va a la derecha',
        'cada nivel las reglas cambian y hay menos tiempo'
      ]
    }
  };

  function tieneTodo(j){
    var subs = SUBS[j];
    if(!subs || !subs.length) return false;
    if(!window.verita || !verita.estaDesbloqueado) return false;
    return subs.every(function(k){ return verita.estaDesbloqueado(k); });
  }

  function aplicarFondo(c){
    var emojisFondo = (c.dataset.fondo || fondoAlAzar()).split('|');
    var bgSize = (60 * emojisFondo.length) + 'px';
    VENT.style.backgroundImage = svgFondo(emojisFondo, '0.12');
    VENT.style.backgroundSize  = bgSize + ' ' + bgSize;
    VENT.style.backgroundRepeat = 'repeat';
    VENT.style.backgroundPosition = '0 0';
    if(c.dataset.color) VENT.style.backgroundColor = c.dataset.color;
  }

  function pintarPrecios(){
    if(!window.verita) return;
    document.querySelectorAll('.card').forEach(function(c){
      var j = c.dataset.juego;
      var prev = c.querySelector('.precio-badge');
      if(prev) prev.remove();

      var single = PRECIOS[j];
      var multi  = MULTI[j];
      var sub    = SUBS[j];

      var thumb = c.querySelector('.thumb');
      if(!thumb) return;

      var badge = document.createElement('span');
      badge.className = 'precio-badge';

      if(sub){
        var todo = tieneTodo(j);
        if(todo){
          badge.classList.add('precio-badge-ok');
          badge.textContent = 'desbloqueado';
        } else {
          badge.classList.add('precio-badge-gratis');
          badge.textContent = multi || '—';
        }
        thumb.appendChild(badge);
        return;
      }

      if(!single){
        badge.classList.add('precio-badge-ok');
        badge.textContent = 'desbloqueado';
        thumb.appendChild(badge);
        return;
      }

      if(verita.estaDesbloqueado && verita.estaDesbloqueado(j)){
        badge.classList.add('precio-badge-ok');
        badge.textContent = 'desbloqueado';
      } else {
        badge.textContent = single + ' 💰';
      }
      thumb.appendChild(badge);
    });
  }
  window.__pintarPreciosCards = pintarPrecios;

  document.querySelectorAll('.card').forEach(function(c){
    c.addEventListener('click', async function(){
      var juego = c.dataset.juego;
      var api = window.__juegos[juego];
      if(!api) return;

      var ov  = document.getElementById('overlay');
      var txt = document.getElementById('overlay-text');
      ov.classList.add('on');
      if(api.modo){
        VENT.classList.remove('modo-diferente','modo-stroop','modo-stroop2','modo-gng','modo-afk','modo-simon','modo-estrellas','modo-desliza','modo-clasifica','modo-nback');
        VENT.classList.add(api.modo);
      }

      aplicarFondo(c);

      if(window.__activarBotonAyuda) window.__activarBotonAyuda(juego);
      if(txt){ txt.textContent = ''; txt.classList.remove('grande','count'); }

      if(typeof api.preparar === 'function'){
        var prep = await api.preparar();
        if(prep === false){
          ov.classList.remove('on');
          if(window.__desactivarBotonAyuda) window.__desactivarBotonAyuda();
          return;
        }
      } else {
        if(PRECIOS[juego] && verita.estaDesbloqueado && !verita.estaDesbloqueado(juego)){
          var ok = await pedirCompra(juego, PRECIOS[juego], juego);
          if(!ok){
            ov.classList.remove('on');
            if(window.__desactivarBotonAyuda) window.__desactivarBotonAyuda();
            return;
          }
        }
        if(TUTORIALES[juego]){
          await mostrarTutorial(TUTORIALES[juego], juego);
        }
      }

      if(window.__statsIniciar) window.__statsIniciar(juego);

      initAudio();
      Object.keys(window.__juegos).forEach(function(k){
        if(k === juego) return;
        var a = window.__juegos[k];
        if(a && typeof a.reset === 'function') a.reset();
      });
      if(api.modo) VENT.classList.add(api.modo);

      aplicarFondo(c);

      var instr = document.getElementById('instruccion');
      if(instr){
        instr.textContent = api.instruccion || '';
        instr.style.display = 'block';
      }

      var tok = ++window.__tok;

      var pasos = [
        { t:'3',    d:900, big:true, num:true },
        { t:'2',    d:900, big:true, num:true },
        { t:'1',    d:900, big:true, num:true },
        { t:'¡ya!', d:900, big:true, num:false }
      ];

      var i = 0;
      var next = function(){
        if(tok !== window.__tok) return;
        if(i >= pasos.length){
          txt.textContent = '';
          txt.classList.remove('grande', 'count');
          if(typeof api.iniciar === 'function') api.iniciar(tok);
          return;
        }
        var p = pasos[i++];
        txt.textContent = p.t;
        if(p.num){
          txt.classList.add('count');
          txt.classList.remove('grande');
        } else {
          txt.classList.add('grande');
          txt.classList.remove('count');
        }
        if(p.t === '3') son321(1);
        else if(p.t === '2') son321(2);
        else if(p.t === '1') son321(3);
        else if(p.t === '¡ya!') sonYa();
        setTimeout(next, p.d);
      };
      next();
    });
  });

  document.getElementById('cerrar').addEventListener('click', function(){
    var gan = 0;
    Object.keys(window.__juegos).forEach(function(k){
      var a = window.__juegos[k];
      if(!a || typeof a.ganancia !== 'function') return;
      var modo = a.modo;
      if(modo && VENT.classList.contains(modo)){
        var g = a.ganancia();
        if(g > 0) gan += g;
      }
    });

    window.__tok++;
    document.getElementById('overlay').classList.remove('on');
    if(window.__desactivarBotonAyuda) window.__desactivarBotonAyuda();
    var t = document.getElementById('overlay-text');
    if(t){ t.textContent = ''; t.classList.remove('grande','count'); }

    if(gan > 0){
      verita.sumarPuntos(gan);
      sonMonedas(5);
      var actual = verita.estado.puntos;
      animarEstrellas(gan);
      animarContador(actual - gan, actual, 2000);
      mostrarToast('+' + Math.round(gan) + ' pts');
    }

    if(window.__statsCerrar) window.__statsCerrar();

    Object.keys(window.__juegos).forEach(function(k){
      var a = window.__juegos[k];
      if(a && typeof a.reset === 'function') a.reset();
    });

    pintarPrecios();
  });

  var intentos = 0;
  var iv = setInterval(function(){
    intentos++;
    if(window.verita && verita.estaDesbloqueado){
      clearInterval(iv);
      pintarPrecios();
    }
    if(intentos > 60) clearInterval(iv);
  }, 100);

  window.addEventListener('load', function(){
    setTimeout(pintarPrecios, 200);
  });
})();