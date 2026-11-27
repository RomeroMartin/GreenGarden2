// Pestañas de la carta (almuerzo / merienda / sin TACC), con soporte de #hash.
(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.menu-panel'));
  if (!tabs.length) return;

  var actual = (panels.filter(function (p) { return !p.hidden; })[0] || {}).id;

  function select(id, scroll) {
    actual = id;
    tabs.forEach(function (t) {
      t.setAttribute('aria-selected', t.getAttribute('aria-controls') === id ? 'true' : 'false');
      t.tabIndex = t.getAttribute('aria-controls') === id ? 0 : -1;
    });
    panels.forEach(function (p) { p.hidden = p.id !== id; });
    if (scroll) {
      var p = document.getElementById(id);
      if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      var id = t.getAttribute('aria-controls');
      select(id, false);
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus();
      n.click();
    });
  });

  // El hash puede traer también una hoja abierta: #almuerzo/entradas (la maneja carta.js).
  // Si la pestaña ya es la que está a la vista, no se hace scroll (así abrir o cerrar
  // una hoja con el botón "Atrás" no mueve la página).
  function fromHash(scroll, forzar) {
    var id = location.hash.replace('#', '').split('/')[0];
    if (id && panels.some(function (p) { return p.id === id; })) select(id, scroll && (forzar || id !== actual));
  }
  window.addEventListener('hashchange', function () { fromHash(true); });
  fromHash(true, true);
})();
