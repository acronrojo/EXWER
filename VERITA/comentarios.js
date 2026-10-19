// comentarios.js — comentarios con categoría (idea / bug / opinión) + likes
(function(){
  if(window.__comentariosInit) return;
  window.__comentariosInit = true;

  var CATS = [
    { id:'idea',    emoji:'💡', nombre:'idea'    },
    { id:'bug',     emoji:'🐞', nombre:'bug'     },
    { id:'opinion', emoji:'💬', nombre:'opinión' }
  ];

  var _catActual = 'idea';

  function clave(){
    return window.__uid ? 'verita-comentarios-' + window.__uid : 'verita-comentarios';
  }
  function cargar(){
    try {
      var raw = localStorage.getItem(clave());
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }
  function guardar(lista){
    try { localStorage.setItem(clave(), JSON.stringify(lista)); }catch(e){}
  }

  function esAdmin(){
    var t = document.getElementById('perfil-titulo');
    if(!t) return false;
    return (t.textContent || '').trim().toLowerCase() === 'acronrojo';
  }

  function usuarioActual(){
    if(window.__auth && window.__auth.user){
      var u = window.__auth.user();
      if(u){
        var meta = u.user_metadata || {};
        return meta.full_name || meta.name || u.email || 'usuario';
      }
    }
    return 'invitado';
  }

  function uidActual(){
    return window.__uid || 'inv-' + usuarioActual();
  }

  function escapar(s){
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function catDe(id){
    for(var i=0;i<CATS.length;i++) if(CATS[i].id === id) return CATS[i];
    return CATS[0];
  }

  function render(){
    var lista = cargar();
    var cont = document.getElementById('comentarios-lista');
    if(!cont) return;
    cont.innerHTML = '';

    var admin = esAdmin();
    var yo = usuarioActual();
    var miId = uidActual();

    if(!lista.length){
      cont.innerHTML = '<div class="comentario-vacio">no hay comentarios todavía · sé el primero</div>';
      return;
    }

    lista.slice().reverse().forEach(function(c, idx){
      var realIdx = lista.length - 1 - idx;
      var el = document.createElement('div');
      el.className = 'comentario';
      if(c.autor === yo) el.classList.add('mio');

      var cat = catDe(c.cat);
      el.classList.add('cat-' + cat.id);

      var head = document.createElement('div');
      head.className = 'comentario-head';

      var tag = document.createElement('span');
      tag.className = 'comentario-cat cat-' + cat.id;
      tag.textContent = cat.emoji + ' ' + cat.nombre;
      head.appendChild(tag);

      var autor = document.createElement('span');
      autor.className = 'comentario-autor';
      autor.textContent = c.autor || 'invitado';
      head.appendChild(autor);

      var fecha = document.createElement('span');
      fecha.className = 'comentario-fecha';
      fecha.textContent = c.fecha || '';
      head.appendChild(fecha);

      if(admin){
        var del = document.createElement('button');
        del.className = 'comentario-borrar';
        del.title = 'borrar comentario';
        del.textContent = '×';
        del.addEventListener('click', function(){
          var l = cargar();
          l.splice(realIdx, 1);
          guardar(l);
          render();
        });
        head.appendChild(del);
      }

      el.appendChild(head);

      var txt = document.createElement('div');
      txt.className = 'comentario-texto';
      txt.textContent = c.texto || '';
      el.appendChild(txt);

      // ── likes ──
      var likes = c.likes || [];
      var likesCount = likes.length;
      var yoLike = likes.indexOf(miId) >= 0;

      var likesRow = document.createElement('div');
      likesRow.className = 'comentario-likes';

      var likeBtn = document.createElement('button');
      likeBtn.className = 'like-btn' + (yoLike ? ' liked' : '');
      likeBtn.type = 'button';
      likeBtn.innerHTML =
        '<span class="like-em">' + (yoLike ? '❤️' : '🤍') + '</span>' +
        '<span class="like-num">' + likesCount + '</span>';
      likeBtn.addEventListener('click', function(){
        var l = cargar();
        var target = l[realIdx];
        if(!target) return;
        if(!target.likes) target.likes = [];
        var i = target.likes.indexOf(miId);
        if(i >= 0){
          target.likes.splice(i, 1);
        } else {
          target.likes.push(miId);
          if(typeof sonQ === 'function') sonQ('q4');
        }
        guardar(l);
        render();
      });

      likesRow.appendChild(likeBtn);
      el.appendChild(likesRow);

      cont.appendChild(el);
    });
  }

  function enviar(){
    var textoEl = document.getElementById('comentarios-texto');
    if(!textoEl) return;
    var texto = textoEl.value.trim();
    if(!texto) return;

    var autor = usuarioActual();

    var lista = cargar();
    lista.push({
      autor: autor,
      texto: texto,
      cat: _catActual,
      likes: [],
      fecha: new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }),
      uid: window.__uid || null
    });
    guardar(lista);
    textoEl.value = '';
    if(typeof sonAcierto === 'function') sonAcierto();
    render();
  }

  function init(){
    var wrap = document.getElementById('comentarios-wrap');
    if(!wrap) return;

    var yo = usuarioActual();

    var catsHTML = CATS.map(function(c){
      return '<button type="button" class="cat-btn' +
             (_catActual === c.id ? ' on' : '') +
             '" data-cat="' + c.id + '">' +
             '<span class="cat-em">' + c.emoji + '</span>' +
             '<span class="cat-lbl">' + c.nombre + '</span>' +
             '</button>';
    }).join('');

    wrap.innerHTML =
      '<h2>comentarios</h2>' +
      '<div id="comentarios-form">' +
        '<div class="comentario-identidad">comentando como <b>' + escapar(yo) + '</b></div>' +
        '<div class="comentario-cats">' + catsHTML + '</div>' +
        '<textarea id="comentarios-texto" maxlength="240" placeholder="escribe un comentario..."></textarea>' +
        '<button id="comentarios-enviar">enviar</button>' +
      '</div>' +
      '<div id="comentarios-lista"></div>';

    wrap.querySelectorAll('.cat-btn').forEach(function(b){
      b.addEventListener('click', function(){
        _catActual = b.dataset.cat;
        wrap.querySelectorAll('.cat-btn').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
      });
    });

    var btn = document.getElementById('comentarios-enviar');
    if(btn) btn.addEventListener('click', enviar);

    render();
  }

  window.__comentariosRefrescar = init;
  window.addEventListener('auth-changed', init);

  function observarTitulo(){
    var cont = document.querySelector('.titulo-editable');
    if(!cont) return false;
    var obs = new MutationObserver(function(){
      if(document.getElementById('comentarios-lista')) render();
    });
    obs.observe(cont, { childList:true, subtree:true, characterData:true });
    return true;
  }

  function boot(){
    init();
    var intentos = 0;
    var iv = setInterval(function(){
      intentos++;
      if(observarTitulo() || intentos > 40) clearInterval(iv);
    }, 250);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();