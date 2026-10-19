// console.js — consola oculta que se activa al escribir 'acronrojo' en el título del perfil
(function(){
  if(window.__consoleInit) return;
  window.__consoleInit = true;

  var activa = false;

  function log(txt, tipo){
    var out = document.getElementById('console-salida');
    if(!out) return;
    var l = document.createElement('div');
    l.className = 'console-line' + (tipo ? ' ' + tipo : '');
    l.textContent = txt;
    out.appendChild(l);
    out.scrollTop = out.scrollHeight;
  }

  function fmt(n){ return Math.round(n).toLocaleString('es-CO'); }

  function ejecutar(cmd){
    cmd = (cmd || '').trim();
    if(!cmd) return;
    log('> ' + cmd);

    if(cmd === ';help' || cmd === ';ayuda'){
      log(';add gem N       añade N gemas');
      log(';add coins N     añade N monedas');
      log(';add points N    añade N puntos');
      log(';stats           muestra estadísticas');
      log(';reset-stats     borra las estadísticas');
      log(';reset-money     borra monedas, gemas y desbloqueos');
      log(';clear           limpia la consola');
      return;
    }

    if(cmd === ';reset-money'){
      verita.estado.monedas = 0;
      verita.estado.diamantes = 0;
      verita.estado.unlocks = {};
      verita.guardar();
      if(typeof pintar === 'function') pintar();
      if(window.refrescarEconomia) window.refrescarEconomia();
      log('money reset · monedas, gemas y desbloqueos', 'ok');
      return;
    }

    if(cmd === ';clear'){
      var out = document.getElementById('console-salida');
      if(out) out.innerHTML = '';
      return;
    }

    if(cmd === ';reset-stats'){
      if(window.__statsReset){
        window.__statsReset();
        log('estadísticas borradas', 'ok');
      } else {
        log('stats no disponible', 'err');
      }
      return;
    }


    if(cmd === ';stats'){
      var s = (window.__statsVer ? window.__statsVer() : {}) || {};
      var keys = Object.keys(s);
      if(!keys.length){ log('sin datos todavía', 'warn'); return; }

      var filas = keys.map(function(k){
        var d = s[k] || {};
        var min = (d.tiempoTotal || 0) / 60000;
        var rent = min > 0 ? (d.puntosTotales || 0) / min : 0;
        return {
          juego: k,
          sesiones: d.sesiones || 0,
          min: min,
          pts: d.puntosTotales || 0,
          rent: rent
        };
      });

      log('');
      log('── rentabilidad (pts/min) ──');
      filas.slice().sort(function(a,b){ return b.rent - a.rent; }).forEach(function(f){
        log('  ' + f.juego + ' — ' + fmt(f.rent) + ' pts/min');
      });

      log('');
      log('── más jugado por tiempo ──');
      filas.slice().sort(function(a,b){ return b.min - a.min; }).forEach(function(f){
        log('  ' + f.juego + ' — ' + f.min.toFixed(1) + ' min');
      });

      log('');
      log('── más jugado por partidas ──');
      filas.slice().sort(function(a,b){ return b.sesiones - a.sesiones; }).forEach(function(f){
        log('  ' + f.juego + ' — ' + f.sesiones + ' partida' + (f.sesiones === 1 ? '' : 's'));
      });
      return;
    }

    var m = cmd.match(/^;add\s+(gem|gema|coin|coins|moneda|monedas|point|points|punto|puntos)\s+(\d+)$/i);
    if(m){
      var tipo = m[1].toLowerCase();
      var n = parseInt(m[2], 10);
      if(!n || n < 0){ log('cantidad inválida', 'err'); return; }
      if(/^(gem|gema)$/.test(tipo)){ verita.sumarDiamantes(n); log('+' + fmt(n) + ' 💎', 'ok'); }
      else if(/^(coin|coins|moneda|monedas)$/.test(tipo)){ verita.sumarMonedas(n); log('+' + fmt(n) + ' 💰', 'ok'); }
      else { verita.sumarPuntos(n); log('+' + fmt(n) + ' ⭐', 'ok'); }
      return;
    }

    log('comando desconocido · escribe ;help', 'err');
  }

  function activar(){
    if(activa) return;
    var desliza = document.querySelector('.panel[data-p="perfil"] .desliza');
    if(!desliza) return;
    var box = document.createElement('section');
    box.id = 'console-box';
    box.innerHTML =
      '<h2>consola</h2>' +
      '<div id="console-salida"></div>' +
      '<div id="console-linea">' +
        '<span>&gt;</span>' +
        '<input id="console-input" autocomplete="off" spellcheck="false" placeholder=";help">' +
      '</div>';
    desliza.appendChild(box);
    var inp = document.getElementById('console-input');
    inp.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); ejecutar(inp.value); inp.value = ''; }
    });
    activa = true;
    log('consola activada · escribe ;help', 'ok');
  }

  function desactivar(){
    if(!activa) return;
    var b = document.getElementById('console-box');
    if(b) b.remove();
    activa = false;
  }

  function check(){
    var t = document.getElementById('perfil-titulo');
    if(!t) return;
    var txt = (t.textContent || '').trim().toLowerCase();
    if(txt === 'acronrojo'){
      activar();
    } else {
      desactivar();
    }
  }

  function initObserver(){
    var contenedor = document.querySelector('.titulo-editable');
    if(!contenedor) return false;
    var obs = new MutationObserver(check);
    obs.observe(contenedor, { childList:true, subtree:true, characterData:true });
    check();
    return true;
  }

  var intentos = 0;
  var iv = setInterval(function(){
    intentos++;
    if(initObserver() || intentos > 40) clearInterval(iv);
  }, 250);
})();