// Visor tipo lightbox para la carta y las fotos del playroom.
// Cada enlace con data-viewer="grupo" abre el visor en su posición dentro del grupo.
(function () {
  'use strict';

  var links = Array.prototype.slice.call(document.querySelectorAll('[data-viewer]'));
  if (!links.length) return;

  var ICON = function (d) {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };

  var el = document.createElement('div');
  el.className = 'viewer';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML =
    '<div class="viewer-stage"><img alt=""></div>' +
    '<span class="viewer-count" aria-live="polite"></span>' +
    '<button type="button" class="viewer-btn viewer-close" aria-label="Cerrar">' + ICON('<path d="M6 6l12 12M18 6L6 18"/>') + '</button>' +
    '<button type="button" class="viewer-btn viewer-prev" aria-label="Anterior">' + ICON('<path d="M15 5l-7 7 7 7"/>') + '</button>' +
    '<button type="button" class="viewer-btn viewer-next" aria-label="Siguiente">' + ICON('<path d="M9 5l7 7-7 7"/>') + '</button>';
  document.body.appendChild(el);

  var stage = el.querySelector('.viewer-stage');
  var img = stage.querySelector('img');
  var count = el.querySelector('.viewer-count');
  var prev = el.querySelector('.viewer-prev');
  var next = el.querySelector('.viewer-next');
  var closeBtn = el.querySelector('.viewer-close');

  var group = [];
  var index = 0;
  var opener = null;
  var unit = 'Página';

  function load(i, dir) {
    index = Math.max(0, Math.min(group.length - 1, i));
    var a = group[index];
    el.classList.remove('is-zoomed', 'go-next', 'go-prev');
    if (dir) el.classList.add(dir > 0 ? 'go-next' : 'go-prev');
    stage.scrollTo(0, 0);
    img.src = a.getAttribute('href');
    var thumb = a.querySelector('img');
    img.alt = thumb ? thumb.alt : unit + ' ' + (index + 1);
    count.textContent = (a.getAttribute('data-viewer-title') || '') + ' · ' + (index + 1) + ' / ' + group.length;
    prev.disabled = index === 0;
    next.disabled = index === group.length - 1;
    [index - 1, index + 1].forEach(function (k) {
      if (group[k]) new Image().src = group[k].getAttribute('href');
    });
  }

  function go(d) {
    var n = index + d;
    if (n >= 0 && n < group.length) load(n, d);
  }

  function open(a) {
    var name = a.getAttribute('data-viewer');
    group = links.filter(function (l) { return l.getAttribute('data-viewer') === name; });
    unit = a.getAttribute('data-viewer-unit') || 'Página';
    el.setAttribute('aria-label', unit === 'Foto' ? 'Visor de fotos' : 'Visor de la carta');
    opener = a;
    el.hidden = false;
    document.body.classList.add('viewer-open');
    load(group.indexOf(a));
    closeBtn.focus();
  }

  function close() {
    el.hidden = true;
    document.body.classList.remove('viewer-open');
    img.removeAttribute('src');
    if (opener && opener.focus) opener.focus();
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      open(a);
    });
  });

  closeBtn.addEventListener('click', close);
  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });

  // Clic fuera de la imagen cierra; clic en la imagen hace zoom
  stage.addEventListener('click', function (e) {
    if (e.target === stage && !el.classList.contains('is-zoomed')) close();
  });
  img.addEventListener('click', function () { el.classList.toggle('is-zoomed'); });

  document.addEventListener('keydown', function (e) {
    if (el.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { go(-1); return; }
    if (e.key === 'ArrowRight') { go(1); return; }
    if (e.key === 'Tab') {
      var f = el.querySelectorAll('button:not(:disabled)');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Deslizar para cambiar de página (se ignora con zoom nativo o del visor)
  var x0 = null, y0 = 0;
  stage.addEventListener('touchstart', function (e) {
    x0 = e.touches.length === 1 ? e.touches[0].clientX : null;
    y0 = e.touches.length === 1 ? e.touches[0].clientY : 0;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (x0 === null || el.classList.contains('is-zoomed')) return;
    if (window.visualViewport && window.visualViewport.scale > 1.05) return;
    var dx = e.changedTouches[0].clientX - x0;
    var dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
