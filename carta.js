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
  // Los navegadores modernos calculan la escala solo con CSS (carta.css), sin parpadeo.
  // El JS queda de respaldo para navegadores viejos.
  var escalaEnCss = window.CSS && CSS.supports && CSS.supports('width', '1cqw') && CSS.supports('width', 'calc(tan(atan2(1px, 1px)) * 1px)');
  if (escalaEnCss) {
    /* nada que hacer */
  } else if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) { escalarMiniatura(e.target.closest('.hoja-card')); });
    });
    cards.forEach(function (c) { ro.observe(c.querySelector('.page-thumb')); });
  } else {
    var todas = function () { cards.forEach(escalarMiniatura); };
    window.addEventListener('resize', todas);
    todas();
  }

  // Los links (Instagram, teléfono) de las miniaturas quedan tapados por el botón de abrir:
  // se sacan del orden de Tab para no enfocar links invisibles.
  cards.forEach(function (c) {
    Array.prototype.forEach.call(c.querySelectorAll('.hoja a[href]'), function (a) { a.tabIndex = -1; });
  });

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
  // Modo lectura: lo que eligió el cliente; si nunca eligió, lectura en celular y hoja en pantallas grandes.
  var lectura = window.innerWidth < 700;
  try {
    var guardado = localStorage.getItem('carta-lectura');
    if (guardado !== null) lectura = guardado === '1';
  } catch (e) {}

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
    Array.prototype.forEach.call(copia.querySelectorAll('a[tabindex]'), function (a) { a.removeAttribute('tabindex'); });
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

  /* ---------- Historial: el botón "Atrás" cierra la hoja, y cada hoja tiene su link ----------
     La hoja abierta se refleja en la dirección: menu.html#almuerzo/entradas */
  var empujado = false; // true si abrir la hoja agregó una entrada al historial

  function slugDe(card) {
    var h = card.querySelector('.hoja');
    return h && h.id ? h.id.replace(/^hoja-/, '') : '';
  }
  function hashDeHoja() {
    var panel = grupo[indice].closest('.menu-panel');
    return '#' + panel.id + '/' + slugDe(grupo[indice]);
  }
  function hojaDelHash() {
    var m = /^#([\w-]+)\/([\w-]+)$/.exec(location.hash);
    var panel = m && document.getElementById(m[1]);
    if (!panel) return null;
    var g = cards.filter(function (c) { return c.closest('.menu-panel') === panel; });
    for (var i = 0; i < g.length; i++) if (slugDe(g[i]) === m[2]) return { grupo: g, indice: i };
    return null;
  }
  function marcarHistorial(nueva) {
    try {
      if (nueva) { history.pushState({ carta: 1 }, '', hashDeHoja()); empujado = true; }
      else history.replaceState(history.state, '', hashDeHoja());
    } catch (e) {}
  }

  function abrir(i, desde, yaEnHistorial) {
    abridor = desde || null;
    modal.hidden = false;
    document.body.classList.add('carta-open');
    cargar(i);
    marcarHistorial(!yaEnHistorial);
    btnCerrar.focus();
  }

  function cerrar(porAtras) {
    var panel = grupo[indice] && grupo[indice].closest('.menu-panel');
    modal.hidden = true;
    document.body.classList.remove('carta-open');
    marco.innerHTML = '';
    if (abridor && abridor.focus) abridor.focus();
    try {
      if (!porAtras && empujado) history.back();
      else if (!porAtras && panel) history.replaceState(history.state, '', '#' + panel.id);
    } catch (e) {}
    empujado = false;
  }

  function ir(d) {
    var n = indice + d;
    if (n >= 0 && n < grupo.length) { cargar(n); marcarHistorial(false); }
  }

  // "Atrás" / "Adelante" del navegador, o un link directo a una hoja
  function sincronizarConHash() {
    var h = hojaDelHash();
    if (h) {
      grupo = h.grupo;
      if (modal.hidden) abrir(h.indice, null, true); else { cargar(h.indice); }
    } else if (!modal.hidden) {
      cerrar(true);
    }
  }
  window.addEventListener('popstate', sincronizarConHash);

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

  btnCerrar.addEventListener('click', function () { cerrar(); });
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

  /* ---------- SEO: datos estructurados de la carta (schema.org) ----------
     Se arman leyendo las mismas hojas que se ven, así los precios nunca quedan desactualizados:
     al cambiar un precio en menu.html, esto se actualiza solo. Se cuelga del Restaurant del index (@id). */
  function textoLimpio(el, sinNota) {
    var c = el.cloneNode(true);
    if (sinNota) Array.prototype.forEach.call(c.querySelectorAll('.plato-nota'), function (n) { n.remove(); });
    Array.prototype.forEach.call(c.querySelectorAll('img[alt]'), function (i) { i.replaceWith(document.createTextNode(i.alt)); });
    return c.textContent.replace(/\s+/g, ' ').replace(/^\*\s*/, '').replace(/\s+([,.;:])/g, '$1').trim();
  }
  function ofertas(txt) {
    var nums = (txt.match(/\d{1,3}(?:\.\d{3})*/g) || []).map(function (n) { return n.replace(/\./g, ''); });
    var o = nums.map(function (n) { return { '@type': 'Offer', price: n, priceCurrency: 'ARS' }; });
    return o.length === 1 ? o[0] : o;
  }
  function datosEstructurados() {
    var base = location.origin && /^https?:/.test(location.origin) ? 'https://www.greengarden.com.ar/menu.html' : '';
    var menus = Array.prototype.map.call(document.querySelectorAll('.menu-panel'), function (panel) {
      var titulo = panel.querySelector('.cat-banner h2');
      var sinTacc = panel.id === 'sintacc';
      var secciones = [];
      Array.prototype.forEach.call(panel.querySelectorAll('.hoja'), function (hoja) {
        var items = [];
        Array.prototype.forEach.call(hoja.querySelectorAll('.plato-linea'), function (linea) {
          var precio = linea.querySelector('.precio');
          var nombre = linea.querySelector('.plato-nombre, .hoja-titulo--linea');
          if (!precio || !nombre || !/\d/.test(precio.textContent)) return;
          var nota = linea.querySelector('.plato-nota');
          var desc = linea.nextElementSibling;
          var partes = [];
          if (nota) partes.push(textoLimpio(nota).replace(/^\(|\)$/g, ''));
          if (desc && desc.classList.contains('plato-desc')) partes.push(textoLimpio(desc));
          var item = { '@type': 'MenuItem', name: textoLimpio(nombre, true), offers: ofertas(precio.textContent) };
          if (partes.length) item.description = partes.join('. ').replace(/\.\./g, '.');
          if (sinTacc) item.suitableForDiet = 'https://schema.org/GlutenFreeDiet';
          items.push(item);
        });
        if (items.length) secciones.push({ '@type': 'MenuSection', name: hoja.getAttribute('aria-label') || '', hasMenuItem: items });
      });
      var menu = { '@type': 'Menu', name: titulo ? titulo.textContent.trim() : panel.id, url: base + '#' + panel.id, inLanguage: 'es-AR', hasMenuSection: secciones };
      if (sinTacc) menu.suitableForDiet = 'https://schema.org/GlutenFreeDiet';
      return menu;
    }).filter(function (m) { return m.hasMenuSection.length; });
    if (!menus.length) return;
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Restaurant', '@id': 'https://www.greengarden.com.ar/#restaurant', hasMenu: menus });
    document.head.appendChild(s);
  }
  try { datosEstructurados(); } catch (e) {}

  // Si la dirección trae una hoja (menu.html#almuerzo/entradas), se abre sola
  if (hojaDelHash()) sincronizarConHash();

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
