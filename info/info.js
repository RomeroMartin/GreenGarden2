// Green Garden — /info/. Todo dato del local vive en CONFIG; el HTML ya trae contenido de respaldo si el JS falla.
(function () {
  'use strict';

  var CONFIG = {
    nombre: 'Green Garden',
    lema: 'Nuestra casa, tu lugar.',
    telefono: {
      mostrar: '0221 489-5239',
      link: 'tel:+542214895239'
    },
    direccion: 'Diag. 74 1618, entre 49 y 50, La Plata',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Green+Garden+Diagonal+74+1618+La+Plata',
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    // Horario por día (0 = domingo). Permite cierres después de medianoche.
    horarios: {
      0: [{ abre: '08:00', cierra: '02:00' }],
      1: [{ abre: '08:00', cierra: '02:00' }],
      2: [{ abre: '08:00', cierra: '02:00' }],
      3: [{ abre: '08:00', cierra: '02:00' }],
      4: [{ abre: '08:00', cierra: '02:00' }],
      5: [{ abre: '08:00', cierra: '02:00' }],
      6: [{ abre: '08:00', cierra: '02:00' }]
    },
    // playroom: null oculta la sección.
    playroom: {
      edades: '3 a 12 años',
      horario: { abre: '12:00', cierra: '01:00' },
      precio: 3800 // ← actualizar acá cuando cambie
    },
    // Texto, o lista de platos adaptables: ['Plato 1', 'Plato 2']. PENDIENTE: texto definitivo del chef.
    veganos: 'Por ahora no tenemos platos veganos en la carta, pero varias opciones se pueden adaptar. Consultá con tu mozo al llegar o llamanos y te contamos.'
  };

  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  function get(path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, CONFIG);
  }
  function el(tag, texto, cls) {
    var n = document.createElement(tag);
    if (texto != null) n.textContent = texto;
    if (cls) n.className = cls;
    return n;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  // ── Textos y links simples ──
  var ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  document.querySelectorAll('[data-config]').forEach(function (n) {
    var v = get(n.getAttribute('data-config'));
    if (v == null) return;
    n.textContent = n.getAttribute('data-format') === 'ars' ? ars.format(v).replace(/\s/g, '') : v;
  });
  document.querySelectorAll('[data-config-href]').forEach(function (n) {
    var v = get(n.getAttribute('data-config-href'));
    if (v) n.setAttribute('href', v);
  });

  // ── Secciones activables ──
  document.querySelectorAll('[data-config-section]').forEach(function (n) {
    if (!get(n.getAttribute('data-config-section'))) n.hidden = true;
  });
  var pr = CONFIG.playroom;
  var prH = document.querySelector('[data-config-playroom-horario]');
  if (pr && prH) prH.textContent = pr.horario.abre + ' a ' + pr.horario.cierra + ' hs';

  // ── Opciones veganas: texto o lista ──
  var vg = document.querySelector('[data-config-veganos]');
  if (vg && CONFIG.veganos) {
    vaciar(vg);
    if (Array.isArray(CONFIG.veganos)) {
      vg.appendChild(el('p', 'Estas opciones se pueden adaptar:'));
      var ul = el('ul', null, 'info-veganos');
      CONFIG.veganos.forEach(function (p) { ul.appendChild(el('li', p)); });
      vg.appendChild(ul);
    } else {
      vg.appendChild(el('p', CONFIG.veganos));
    }
  }

  // ── Horario (resumen si es igual todos los días; si no, lista por día) ──
  function rango(t) { return t.abre + ' a ' + t.cierra; }
  function clave(d) { return (CONFIG.horarios[d] || []).map(rango).join(' y '); }
  var hz = document.querySelector('[data-config-horarios]');
  if (hz) {
    var igual = [1, 2, 3, 4, 5, 6].every(function (d) { return clave(d) === clave(0); });
    vaciar(hz);
    if (igual) {
      hz.appendChild(el('strong', clave(0) ? 'Todos los días de ' + clave(0) + ' hs.' : 'Consultanos los horarios.'));
    } else {
      var lista = el('ul', null, 'info-horarios');
      [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
        var li = el('li');
        li.appendChild(el('span', DIAS[d]));
        li.appendChild(el('span', clave(d) ? clave(d) + ' hs' : 'Cerrado'));
        lista.appendChild(li);
      });
      hz.replaceWith(lista);
    }
  }

  // ── Abierto ahora / Cerrado (lógica compartida en site.js) ──
  function pintarEstado() {
    if (!window.GG || !window.GG.estado) return;
    var e = window.GG.estado(CONFIG.horarios, CONFIG.zonaHoraria);
    var txt = e.abierto
      ? (e.pronto ? 'Cierra pronto · cierra a las ' : 'Abierto ahora · cierra a las ') + e.hora
      : 'Cerrado' + (e.hora ? ' · abre a las ' + e.hora : '');
    document.querySelectorAll('.info-status').forEach(function (n) {
      n.classList.toggle('is-open', e.abierto);
      var t = n.querySelector('#infoStatusText, .info-status-text');
      if (t) t.textContent = txt;
    });
  }
  pintarEstado();
  setInterval(pintarEstado, 60000);

  // ── Deep links (#reservas, #sintacc, …) y acordeón ──
  var items = Array.prototype.slice.call(document.querySelectorAll('details.info-item'));
  function abrirDesdeHash() {
    var id = decodeURIComponent(location.hash.replace('#', ''));
    var d = id && items.filter(function (i) { return i.id === id; })[0];
    if (!d) return;
    items.forEach(function (i) { i.open = i === d; });
    d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  items.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      items.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  window.addEventListener('hashchange', abrirDesdeHash);
  abrirDesdeHash();
})();
