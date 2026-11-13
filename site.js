// Green Garden — comportamiento común del sitio (menú mobile, estado del local, año).
(function () {
  'use strict';

  // Menú mobile
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('navMobile');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  // Estado del local: siempre con la hora de Buenos Aires, contemplando cierres pasada la medianoche.
  // Se expone en window.GG.estado() para reutilizarlo (p. ej. en /info/).
  var TZ = 'America/Argentina/Buenos_Aires';
  var HORARIOS = {};
  for (var d = 0; d < 7; d++) HORARIOS[d] = [{ abre: '08:00', cierra: '02:00' }];

  function aMin(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  // Día de la semana (0 = domingo) y minutos desde las 00:00, en hora argentina.
  function ahoraEnZona(fecha, zona) {
    var o = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zona, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(fecha).forEach(function (p) { o[p.type] = p.value; });
    var dia = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
    return { dia: dia, min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
  }

  // Devuelve { abierto, pronto, texto, hora }:
  //  abierto → hora = cuándo cierra; cerrado → hora = próxima apertura.
  //  pronto  → true si faltan menos de 60 min para cerrar.
  function estado(horarios, zona, fecha) {
    horarios = horarios || HORARIOS;
    var n = ahoraEnZona(fecha || new Date(), zona || TZ);
    var i, t, turnos, abre, cierra, ayer;

    // Turno del día anterior que termina hoy después de medianoche (08:00–02:00).
    ayer = horarios[(n.dia + 6) % 7] || [];
    for (i = 0; i < ayer.length; i++) {
      abre = aMin(ayer[i].abre); cierra = aMin(ayer[i].cierra);
      if (cierra <= abre && n.min < cierra) {
        return { abierto: true, pronto: cierra - n.min <= 60, hora: ayer[i].cierra };
      }
    }
    // Turnos de hoy.
    turnos = horarios[n.dia] || [];
    for (i = 0; i < turnos.length; i++) {
      t = turnos[i]; abre = aMin(t.abre); cierra = aMin(t.cierra);
      if (cierra <= abre) cierra += 1440; // cierra después de medianoche
      if (n.min >= abre && n.min < cierra) {
        return { abierto: true, pronto: cierra - n.min <= 60, hora: t.cierra };
      }
    }
    // Cerrado: próxima apertura (hoy o en los próximos 7 días).
    for (var k = 0; k <= 7; k++) {
      var lista = (horarios[(n.dia + k) % 7] || []).slice().sort(function (x, y) { return aMin(x.abre) - aMin(y.abre); });
      for (i = 0; i < lista.length; i++) {
        if (k > 0 || aMin(lista[i].abre) > n.min) return { abierto: false, pronto: false, hora: lista[i].abre };
      }
    }
    return { abierto: false, pronto: false, hora: null };
  }

  window.GG = window.GG || {};
  window.GG.estado = estado;

  function pintarEstado() {
    var e = estado();
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', e.abierto);
      var t = el.querySelector('.status-text');
      if (t) t.textContent = e.abierto ? 'Abierto ahora' : 'Cerrado · abre ' + e.hora;
    });
  }
  pintarEstado();
  setInterval(pintarEstado, 60000);

  // Año del footer
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
