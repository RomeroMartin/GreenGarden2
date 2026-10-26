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

  // Estado del local (hora de Buenos Aires, abierto de 08:00 a 02:00)
  function abiertoAhora() {
    var partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var h = 0;
    partes.forEach(function (p) { if (p.type === 'hour') h = parseInt(p.value, 10); });
    return h >= 8 || h < 2;
  }
  var abierto = abiertoAhora();
  document.querySelectorAll('[data-status]').forEach(function (el) {
    el.classList.toggle('is-open', abierto);
    var t = el.querySelector('.status-text');
    if (t) t.textContent = abierto ? 'Abierto ahora' : 'Cerrado · abre 08:00';
  });

  // Año del footer
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
