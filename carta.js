// Carta en HTML: escala las hojas A4 dentro de las tarjetas, abre el modal
// (hoja completa o modo lectura) y maneja la impresión con o sin precios.
(function () {
  'use strict';

  var HOJA_W = 794, HOJA_H = 1123;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.hoja-card'));
  if (!cards.length) return;

  /* ---------- Miniaturas: la hoja se achica al ancho de la tarjeta ---------- */
  function escalarMiniatura(card) {
    var thumb = card.querySelector('.page-thumb');
    var hoja = card.querySelector('.hoja');
    if (thumb && hoja) hoja.style.setProperty('--s', (thumb.clientWidth / HOJA_W).toFixed(4));
  }
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) { escalarMiniatura(e.target.closest('.hoja-card')); });
    });
    cards.forEach(function (c) { ro.observe(c.querySelector('.page-thumb')); });
  } else {
    var todas = function () { cards.forEach(escalarMiniatura); };
    window.addEventListener('resize', todas);
    todas();
  }

  /* ---------- Modal ---------- */
  var ICON = {
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    libro: '<path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5v13"/>',
    hoja: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>'
  };
  function svg(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; }

  var modal = document.createElement('div');
  modal.className = 'carta-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Carta');
  modal.innerHTML =
    '<div class="carta-barra">' +
      '<button type="button" class="carta-btn carta-btn--lectura" data-accion="lectura"></button>' +
      '<button type="button" class="carta-btn carta-btn--icono" data-accion="cerrar" aria-label="Cerrar">' + svg(ICON.cerrar) + '</button>' +
    '</div>' +
    '<div class="carta-escenario"><div class="carta-marco"></div></div>' +
    '<div class="carta-barra carta-barra--pie">' +
      '<button type="button" class="carta-btn carta-btn--icono" data-accion="prev" aria-label="Hoja anterior">' + svg(ICON.prev) + '</button>' +
      '<span class="carta-cuenta" aria-live="polite"></span>' +
      '<button type="button" class="carta-btn carta-btn--icono" data-accion="next" aria-label="Hoja siguiente">' + svg(ICON.next) + '</button>' +
    '</div>';
  document.body.appendChild(modal);

  var escenario = modal.querySelector('.carta-escenario');
  var marco = modal.querySelector('.carta-marco');
  var cuenta = modal.querySelector('.carta-cuenta');
  var btnLectura = modal.querySelector('[data-accion="lectura"]');
  var btnCerrar = modal.querySelector('[data-accion="cerrar"]');
  var btnPrev = modal.querySelector('[data-accion="prev"]');
  var btnNext = modal.querySelector('[data-accion="next"]');

  var grupo = cards, indice = 0, abridor = null, zoom = false;
  var lectura = false;
  try { lectura = localStorage.getItem('carta-lectura') === '1'; } catch (e) {}

  function ajuste() {
    var w = escenario.clientWidth - 24;
    var h = escenario.clientHeight - 28;
    var porAncho = w / HOJA_W;
    // En pantallas angostas la hoja ocupa el ancho (se scrollea para abajo);
    // en pantallas grandes entra entera.
    var s = window.innerWidth < 700 ? porAncho : Math.min(porAncho, h / HOJA_H);
    s = Math.min(s, 1.2);
    if (zoom) s = Math.max(1, s * 1.8);
    return s;
  }

  function pintar() {
    var hoja = marco.querySelector('.hoja');
    if (!hoja) return;
    modal.classList.toggle('is-lectura', lectura);
    modal.classList.toggle('is-zoom', zoom && !lectura);
    hoja.classList.toggle('hoja--lectura', lectura);
    if (lectura) {
      hoja.style.removeProperty('--s');
      marco.style.width = marco.style.height = '';
    } else {
      var s = ajuste();
      hoja.style.setProperty('--s', s.toFixed(4));
      marco.style.width = Math.round(HOJA_W * s) + 'px';
      marco.style.height = Math.round(HOJA_H * s) + 'px';
    }
    btnLectura.innerHTML = lectura ? svg(ICON.hoja) + 'Ver hoja' : svg(ICON.libro) + 'Modo lectura';
    btnLectura.setAttribute('aria-pressed', lectura ? 'true' : 'false');
  }

  function cargar(i) {
    indice = Math.max(0, Math.min(grupo.length - 1, i));
    var original = grupo[indice].querySelector('.hoja');
    var copia = original.cloneNode(true);
    copia.removeAttribute('id');
    Array.prototype.forEach.call(copia.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    copia.removeAttribute('aria-labelledby');
    marco.innerHTML = '';
    marco.appendChild(copia);
    zoom = false;
    escenario.scrollTo(0, 0);
    var nombre = grupo[indice].getAttribute('data-nombre') || '';
    cuenta.textContent = nombre + ' · ' + (indice + 1) + ' / ' + grupo.length;
    modal.setAttribute('aria-label', 'Carta: ' + nombre);
    btnPrev.disabled = indice === 0;
    btnNext.disabled = indice === grupo.length - 1;
    pintar();
  }

  function abrir(i, desde) {
    abridor = desde || null;
    modal.hidden = false;
    document.body.classList.add('carta-open');
    cargar(i);
    btnCerrar.focus();
  }

  function cerrar() {
    modal.hidden = true;
    document.body.classList.remove('carta-open');
    marco.innerHTML = '';
    if (abridor && abridor.focus) abridor.focus();
  }

  function ir(d) {
    var n = indice + d;
    if (n >= 0 && n < grupo.length) cargar(n);
  }

  // Cada pestaña (almuerzo, merienda, sin TACC) es su propio grupo de hojas
  cards.forEach(function (card) {
    var b = card.querySelector('.hoja-abrir');
    if (!b) return;
    b.addEventListener('click', function () {
      var panel = card.closest('.menu-panel');
      grupo = cards.filter(function (c) { return c.closest('.menu-panel') === panel; });
      abrir(grupo.indexOf(card), b);
    });
  });

  btnCerrar.addEventListener('click', cerrar);
  btnPrev.addEventListener('click', function () { ir(-1); });
  btnNext.addEventListener('click', function () { ir(1); });
  btnLectura.addEventListener('click', function () {
    lectura = !lectura;
    zoom = false;
    try { localStorage.setItem('carta-lectura', lectura ? '1' : '0'); } catch (e) {}
    pintar();
    escenario.scrollTo(0, 0);
  });

  // Tocar la hoja: amplía o achica. Tocar fuera: cierra.
  marco.addEventListener('click', function (e) {
    if (lectura || e.target.closest('a')) return;
    zoom = !zoom;
    pintar();
  });
  escenario.addEventListener('click', function (e) {
    if (e.target === escenario) cerrar();
  });

  window.addEventListener('resize', function () { if (!modal.hidden) pintar(); });

  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { cerrar(); return; }
    if (e.key === 'ArrowLeft') { ir(-1); return; }
    if (e.key === 'ArrowRight') { ir(1); return; }
    if (e.key === 'Tab') {
      var f = modal.querySelectorAll('button:not(:disabled), a[href]');
      var visibles = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null; });
      var first = visibles[0], last = visibles[visibles.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Deslizar para cambiar de hoja (no con zoom)
  var x0 = null, y0 = 0;
  escenario.addEventListener('touchstart', function (e) {
    x0 = e.touches.length === 1 ? e.touches[0].clientX : null;
    y0 = e.touches.length === 1 ? e.touches[0].clientY : 0;
  }, { passive: true });
  escenario.addEventListener('touchend', function (e) {
    if (x0 === null || zoom) return;
    if (window.visualViewport && window.visualViewport.scale > 1.05) return;
    var dx = e.changedTouches[0].clientX - x0;
    var dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) ir(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---------- Imprimir / guardar PDF (uso interno) ----------
     Los botones no se muestran a los clientes: aparecen solo abriendo
     menu.html?imprimir . Igual, Ctrl+P en la página imprime la carta en A4. */
  if (/[?&]imprimir\b/.test(location.search)) {
    Array.prototype.forEach.call(document.querySelectorAll('.menu-panel .cat-meta'), function (meta) {
      var acciones = document.createElement('div');
      acciones.className = 'carta-acciones';
      acciones.innerHTML = '<button type="button" data-imprimir="con-precios">Imprimir esta carta (A4)</button>' +
        '<button type="button" data-imprimir="sin-precios">Imprimir sin precios</button>';
      meta.appendChild(acciones);
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-imprimir]'), function (b) {
    b.addEventListener('click', function () {
      document.body.classList.toggle('sin-precios', b.getAttribute('data-imprimir') === 'sin-precios');
      window.print();
    });
  });
  window.addEventListener('afterprint', function () { document.body.classList.remove('sin-precios'); });
})();
