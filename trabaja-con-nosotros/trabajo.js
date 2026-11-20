// Green Garden — formulario de postulación (/trabaja-con-nosotros/).
// Guarda en Firestore (colección `postulaciones`). Las reglas de /firestore.rules validan todo de nuevo del lado del servidor.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, configurado } from '/firebase-config.js';
import {
  SECTORES, PUESTOS, MAX_PUESTOS, PREGUNTAS, DIAS, HORAS, ORDEN_HORA, textoDia,
  JORNADAS, EMPIEZA, ANIOS, puestoPorId
} from '/trabajo-datos.js';

const BORRADOR = 'gg-postulacion-borrador';
const ENVIADA = 'gg-postulacion-enviada';
const TOTAL = 6;
const ESPERA_MIN_MS = 10000; // nadie completa 6 pasos en menos de 10 segundos

const form = document.getElementById('jobForm');
const $ = (id) => document.getElementById(id);
const pasos = Array.from(form.querySelectorAll('.job-step'));
const btnPrev = $('btnPrev'), btnNext = $('btnNext'), btnSend = $('btnSend');
const erroresBox = $('jobErrors');
const abierta = Date.now();
let paso = 1;
let volverAResumen = false;   // true mientras se corrige algo desde el resumen final
let enviado = false;
let errSeq = 0;
const NOMBRES_PASO = ['Tus datos', 'Tu puesto', 'Sobre el puesto', 'Disponibilidad', 'Experiencia', 'Revisión'];
const HOSTS = '.field, .pregunta, .check--consent, .dia, [data-err-host]'; // contenedores donde se muestra cada error
const suave = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

// ── Utilidades ──────────────────────────────────────────────
function h(tag, attrs, ...hijos) {
  const el = document.createElement(tag);
  for (const k in (attrs || {})) {
    if (k === 'text') el.textContent = attrs[k];
    else if (k === 'class') el.className = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  hijos.flat().forEach(c => el.append(c));
  return el;
}
const limpiar = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function normalizarTelefono(txt) {
  let d = String(txt || '').replace(/\D/g, '');
  if (d.startsWith('549')) d = d.slice(3);
  else if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}

// 2215551234 → "221 555 1234" (los de 2 dígitos de área, como 11, → "11 5555 1234")
function formatearTelefono(el) {
  const d = normalizarTelefono(el.value);
  if (!/^\d{10}$/.test(d)) return;
  el.value = d.startsWith('11') ? d.slice(0, 2) + ' ' + d.slice(2, 6) + ' ' + d.slice(6) : d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
}

function puestosElegidos() {
  return Array.from(form.querySelectorAll('input[name="puesto"]:checked')).map(i => i.value);
}

// ── Construcción de partes dinámicas ────────────────────────
function armarPuestos() {
  const box = $('puestosBox');
  Object.keys(SECTORES).forEach(sid => {
    const lista = PUESTOS.filter(p => p.sector === sid);
    box.append(h('div', { class: 'puestos-sector' },
      h('h3', { text: SECTORES[sid].nombre }),
      h('div', { class: 'opciones' }, lista.map(p =>
        h('label', { class: 'opcion' },
          h('input', { type: 'checkbox', name: 'puesto', value: p.id }),
          h('span', { text: p.nombre })
        )
      ))
    ));
  });
  box.addEventListener('change', actualizarPuestos);
}

function actualizarPuestos() {
  const n = puestosElegidos().length;
  $('puestosBox').querySelectorAll('input[name="puesto"]').forEach(i => { i.disabled = n >= MAX_PUESTOS && !i.checked; });
  $('puestosHint').textContent = n >= MAX_PUESTOS
    ? 'Elegiste ' + n + ' de ' + MAX_PUESTOS + '. Para cambiar uno, primero sacá otro.'
    : n ? 'Elegiste ' + n + ' de ' + MAX_PUESTOS + '. Podés sumar hasta ' + (MAX_PUESTOS - n) + ' más.'
        : 'Elegí hasta ' + MAX_PUESTOS + ' puestos.';
}

function armarPreguntas() {
  const box = $('preguntasBox');
  const guardadas = {};
  box.querySelectorAll('input:checked').forEach(i => { guardadas[i.name] = i.value; });
  box.querySelectorAll('textarea').forEach(t => { guardadas[t.name] = t.value; });
  box.replaceChildren();
  const elegidos = puestosElegidos();
  PREGUNTAS.filter(q => q.para.some(p => elegidos.includes(p))).forEach(q => {
    const bloque = h('div', { class: 'pregunta', role: 'radiogroup', 'aria-labelledby': 'q-' + q.id },
      h('p', { class: 'field-title', id: 'q-' + q.id, text: q.label }),
      h('div', { class: 'opciones' }, q.opciones.map(op =>
        h('label', { class: 'opcion' },
          h('input', Object.assign({ type: 'radio', name: 'q_' + q.id, value: op }, guardadas['q_' + q.id] === op ? { checked: '' } : {})),
          h('span', { text: op })
        )
      ))
    );
    if (q.desarrollo) {
      const dsr = q.desarrollo, name = 'q_' + dsr.id;
      const ta = h('textarea', { id: name, name, rows: '3', maxlength: String(dsr.max), 'aria-describedby': name + '-cuenta' });
      ta.value = guardadas[name] || '';
      const cuenta = h('p', { class: 'hint hint--der', id: name + '-cuenta', text: ta.value.length + ' / ' + dsr.max });
      ta.addEventListener('input', () => { cuenta.textContent = ta.value.length + ' / ' + dsr.max; });
      bloque.append(h('div', { class: 'desarrollo field', 'data-desarrollo': dsr.id }, h('label', { for: name, text: dsr.label }), ta, cuenta));
    }
    box.append(bloque);
  });
  sincronizarDesarrollos();
}

// El cuadro de "contanos brevemente" solo se ve si respondió "Sí".
function sincronizarDesarrollos() {
  PREGUNTAS.filter(q => q.desarrollo).forEach(q => {
    const w = $('preguntasBox').querySelector('[data-desarrollo="' + q.desarrollo.id + '"]');
    if (!w) return;
    const marcada = form.querySelector('input[name="q_' + q.id + '"]:checked');
    w.hidden = !(marcada && marcada.value === q.desarrollo.cuando);
  });
}

// Disponibilidad: por cada día, "No puedo" / "Full time" / "Horario" (desde-hasta).
function armarDias() {
  const lista = $('diasLista');
  const horas = (name, vacio, etiqueta) => {
    const sel = h('select', { name, 'aria-label': etiqueta });
    sel.append(h('option', { value: '', text: vacio }));
    HORAS.forEach(x => sel.append(h('option', { value: x, text: x })));
    return sel;
  };
  DIAS.forEach(d => {
    const name = 'dia_' + d.id;
    const radios = [['no', 'No puedo'], ['full', 'Full time'], ['horario', 'Horario']].map(([v, t]) =>
      h('label', { class: 'opcion' },
        h('input', Object.assign({ type: 'radio', name, value: v }, v === 'no' ? { checked: '' } : {})),
        h('span', { text: t })));
    const copiar = h('button', { type: 'button', class: 'dia-copiar', 'data-dia': d.id, text: 'Usar este horario en todos los días' });
    lista.append(h('div', { class: 'dia', 'data-dia': d.id },
      h('p', { class: 'dia-nombre', id: 'dn-' + d.id, text: d.nombre }),
      h('div', { class: 'opciones', role: 'radiogroup', 'aria-labelledby': 'dn-' + d.id }, radios),
      h('div', { class: 'dia-horario', hidden: '' },
        horas(name + '_desde', 'Desde', 'Desde, ' + d.nombre), h('span', { class: 'dia-a', text: 'a' }), horas(name + '_hasta', 'Hasta', 'Hasta, ' + d.nombre), copiar)
    ));
  });
  lista.addEventListener('change', (ev) => { if (ev.target.type === 'radio') sincronizarDias(); guardarBorrador(); });
  lista.addEventListener('click', (ev) => {
    const b = ev.target.closest('.dia-copiar');
    if (!b) return;
    const dsd = form.elements['dia_' + b.dataset.dia + '_desde'].value, hst = form.elements['dia_' + b.dataset.dia + '_hasta'].value;
    DIAS.forEach(d => {
      form.querySelector('input[name="dia_' + d.id + '"][value="horario"]').checked = true;
      form.elements['dia_' + d.id + '_desde'].value = dsd;
      form.elements['dia_' + d.id + '_hasta'].value = hst;
    });
    sincronizarDias();
    guardarBorrador();
  });
  $('diasTodos').addEventListener('change', (ev) => {
    DIAS.forEach(d => { form.querySelector('input[name="dia_' + d.id + '"][value="' + (ev.target.checked ? 'full' : 'no') + '"]').checked = true; });
    sincronizarDias();
    guardarBorrador();
  });
}

// Muestra el desde/hasta solo en los días con "Horario" y mantiene el atajo general al día.
function sincronizarDias() {
  let full = 0, conAlgo = 0;
  DIAS.forEach(d => {
    const v = form.querySelector('input[name="dia_' + d.id + '"]:checked').value;
    form.querySelector('.dia[data-dia="' + d.id + '"] .dia-horario').hidden = v !== 'horario';
    if (v === 'full') full++;
    if (v !== 'no') conAlgo++;
  });
  const g = $('diasTodos');
  g.checked = full === DIAS.length;
  g.indeterminate = conAlgo > 0 && full < DIAS.length;
}

function llenarSelect(id, opciones) {
  const sel = $(id);
  sel.append(h('option', { value: '', text: 'Elegí una opción' }));
  opciones.forEach(o => sel.append(h('option', { value: o, text: o })));
}

const TITULOS_TRABAJO = ['Último trabajo', 'Trabajo anterior', 'Otro trabajo anterior'];

function armarTrabajos() {
  const box = $('trabajosBox');
  TITULOS_TRABAJO.forEach((t, i) => {
    const g = h('div', { class: 'trabajo' },
      h('p', { class: 'trabajo-titulo', text: t }),
      h('label', null, 'Lugar', h('input', { type: 'text', name: 'tr' + i + '_lugar', maxlength: '60', autocapitalize: 'sentences' })),
      h('label', null, 'Puesto', h('input', { type: 'text', name: 'tr' + i + '_puesto', maxlength: '60', autocapitalize: 'sentences' })),
      h('label', null, 'Tiempo', h('input', { type: 'text', name: 'tr' + i + '_tiempo', maxlength: '40', placeholder: 'Ej: 2 años' }))
    );
    if (i > 0) g.hidden = true;           // los demás aparecen con "Agregar otro trabajo"
    box.append(g);
  });
  const mas = h('button', { type: 'button', class: 'btn-mas', id: 'btnMasTrabajos', text: '+ Agregar otro trabajo' });
  mas.addEventListener('click', () => {
    const oculto = box.querySelector('.trabajo[hidden]');
    if (oculto) { oculto.hidden = false; const i = oculto.querySelector('input'); if (i) i.focus({ preventScroll: false }); }
    actualizarTrabajos();
  });
  $('trabajosWrap').append(mas);
  $('f-anios').addEventListener('change', actualizarTrabajos);
}

// Sin experiencia → no se piden trabajos. Los bloques con datos (p. ej. de un borrador) siempre se muestran.
function actualizarTrabajos() {
  const box = $('trabajosBox');
  $('trabajosWrap').hidden = $('f-anios').value === 'Sin experiencia';
  box.querySelectorAll('.trabajo').forEach(g => {
    if (g.hidden && Array.from(g.querySelectorAll('input')).some(x => x.value.trim())) g.hidden = false;
  });
  $('btnMasTrabajos').hidden = !box.querySelector('.trabajo[hidden]');
}

// ── Lectura del formulario ──────────────────────────────────
function leer() {
  const fd = new FormData(form);
  const extras = {};
  PREGUNTAS.forEach(q => {
    const v = fd.get('q_' + q.id);
    if (v) extras[q.id] = String(v);
    if (q.desarrollo && v === q.desarrollo.cuando) {
      const t = limpiar(fd.get('q_' + q.desarrollo.id)).slice(0, q.desarrollo.max);
      if (t) extras[q.desarrollo.id] = t;
    }
  });
  const dias = {};
  DIAS.forEach(d => {
    const v = fd.get('dia_' + d.id);
    if (v === 'full') dias[d.id] = 'full';
    else if (v === 'horario') {
      const a = fd.get('dia_' + d.id + '_desde'), z = fd.get('dia_' + d.id + '_hasta');
      if (a && z && ORDEN_HORA[z] > ORDEN_HORA[a]) dias[d.id] = a + '-' + z;
    }
  });
  const sinExperiencia = fd.get('anios') === 'Sin experiencia';
  const trabajos = sinExperiencia ? [] : [0, 1, 2].map(i => ({
    lugar: limpiar(fd.get('tr' + i + '_lugar')).slice(0, 60),
    puesto: limpiar(fd.get('tr' + i + '_puesto')).slice(0, 60),
    tiempo: limpiar(fd.get('tr' + i + '_tiempo')).slice(0, 40)
  })).filter(t => t.lugar || t.puesto || t.tiempo);
  return {
    nombre: limpiar(fd.get('nombre')).slice(0, 80),
    telefono: normalizarTelefono(fd.get('telefono')),
    email: limpiar(fd.get('email')).toLowerCase().slice(0, 120),
    zona: limpiar(fd.get('zona')).slice(0, 80),
    puestos: puestosElegidos(),
    extras,
    disponibilidad: {
      dias,
      empieza: String(fd.get('empieza') || ''),
      jornada: String(fd.get('jornada') || ''),
      feriados: fd.get('feriados') === '1'
    },
    experienciaAnios: String(fd.get('anios') || ''),
    trabajos,
    resumen: String(fd.get('resumen') || '').trim().slice(0, 800),
    referencias: limpiar(fd.get('referencias')).slice(0, 400),
    consentimiento: fd.get('consentimiento') === '1',
    foto: fotoValida(foto) ? foto : ''
  };
}

// ── Validación por paso ─────────────────────────────────────
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validar(n) {
  const d = leer();
  const e = []; // { el, msg }
  const f = (name) => form.elements[name];
  if (n === 1) {
    if (d.nombre.length < 2) e.push({ el: f('nombre'), msg: 'Escribí tu nombre y apellido.' });
    if (!/^\d{10}$/.test(d.telefono)) e.push({ el: f('telefono'), msg: 'Escribí tu WhatsApp con código de área, sin 0 ni 15 (10 dígitos). Ej: 221 555 1234.' });
    if (!EMAIL_RE.test(d.email)) e.push({ el: f('email'), msg: 'Escribí un email válido. Ej: nombre@gmail.com' });
    if (d.zona.length < 2) e.push({ el: f('zona'), msg: 'Indicá tu barrio o localidad.' });
  }
  if (n === 2) {
    if (d.puestos.length < 1) e.push({ el: form.querySelector('input[name="puesto"]'), msg: 'Elegí al menos un puesto.' });
  }
  if (n === 3) {
    PREGUNTAS.filter(q => q.para.some(p => d.puestos.includes(p))).forEach(q => {
      if (!d.extras[q.id]) e.push({ el: form.querySelector('input[name="q_' + q.id + '"]'), msg: 'Elegí una opción.' });
      else if (q.desarrollo && d.extras[q.id] === q.desarrollo.cuando && !d.extras[q.desarrollo.id]) {
        e.push({ el: form.elements['q_' + q.desarrollo.id], msg: 'Contanos brevemente tu experiencia (hasta ' + q.desarrollo.max + ' caracteres).' });
      }
    });
  }
  if (n === 4) {
    DIAS.forEach(dd => {
      if (form.querySelector('input[name="dia_' + dd.id + '"]:checked').value !== 'horario') return;
      const a = form.elements['dia_' + dd.id + '_desde'], z = form.elements['dia_' + dd.id + '_hasta'];
      if (!a.value) e.push({ el: a, msg: 'Elegí desde qué hora podés el ' + dd.nombre.toLowerCase() + '.' });
      else if (!z.value) e.push({ el: z, msg: 'Elegí hasta qué hora podés el ' + dd.nombre.toLowerCase() + '.' });
      else if (ORDEN_HORA[z.value] <= ORDEN_HORA[a.value]) e.push({ el: z, msg: 'La hora de salida tiene que ser posterior a la de entrada.' });
    });
    if (!e.length && !Object.keys(d.disponibilidad.dias).length) e.push({ el: $('diasTodos'), msg: 'Elegí al menos un día en el que puedas trabajar (Full time o un horario).' });
    if (!d.disponibilidad.jornada) e.push({ el: f('jornada'), msg: 'Elegí la jornada que buscás.' });
    if (!d.disponibilidad.empieza) e.push({ el: f('empieza'), msg: 'Indicá cuándo podrías empezar.' });
  }
  if (n === 5) {
    if (!d.experienciaAnios) e.push({ el: f('anios'), msg: 'Elegí tus años de experiencia.' });
  }
  if (n === 6) {
    if (!d.consentimiento) e.push({ el: f('consentimiento'), msg: 'Tenés que aceptar el uso de tus datos para poder enviar la postulación.' });
  }
  return e;
}

// ── Errores: cada uno aparece junto a su campo ──────────────
function ponerError(el, msg) {
  const host = el.closest(HOSTS) || el.parentElement;
  if (host.querySelector(':scope > .field-error')) return;      // un solo mensaje por contenedor
  const p = h('p', { class: 'field-error', id: 'err-' + (++errSeq), text: msg });
  if (host.matches('[data-err-host]')) host.prepend(p); else host.append(p);
  el.setAttribute('aria-invalid', 'true');
  el.setAttribute('aria-describedby', ((el.getAttribute('aria-describedby') || '') + ' ' + p.id).trim());
}

function quitarError(host) {
  host.querySelectorAll(':scope > .field-error').forEach(p => {
    host.querySelectorAll('[aria-describedby~="' + p.id + '"]').forEach(x => {
      const resto = x.getAttribute('aria-describedby').split(' ').filter(t => t && t !== p.id).join(' ');
      if (resto) x.setAttribute('aria-describedby', resto); else x.removeAttribute('aria-describedby');
      x.removeAttribute('aria-invalid');
    });
    p.remove();
  });
}

function mostrarErrores(errs) {
  form.querySelectorAll('.field-error').forEach(p => p.remove());
  form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
  erroresBox.hidden = true; erroresBox.replaceChildren();
  let primero = null;
  errs.forEach(x => {
    if (x.el) { ponerError(x.el, x.msg); primero = primero || x.el; }
    else { erroresBox.replaceChildren(h('strong', { text: x.msg })); erroresBox.hidden = false; primero = primero || erroresBox; }
  });
  if (!primero) return;
  const host = primero.closest ? (primero.closest(HOSTS) || primero) : primero;
  host.scrollIntoView({ block: 'center', behavior: suave() });
  try { primero.focus({ preventScroll: true }); } catch (_) { /* nada */ }
}

// Al corregir un campo, su aviso desaparece.
function limpiarAviso(el) {
  let host = el.closest && el.closest(HOSTS);
  while (host) { quitarError(host); host = host.parentElement && host.parentElement.closest(HOSTS); }
}

// Los datos de contacto se revisan al salir de cada campo (si ya escribió algo).
['nombre', 'telefono', 'email', 'zona'].forEach(name => {
  const el = form.elements[name];
  el.addEventListener('blur', () => {
    if (!el.value.trim()) return;
    if (name === 'telefono') formatearTelefono(el);
    const host = el.closest('.field');
    quitarError(host);
    const fallo = validar(1).find(x => x.el === el);
    if (fallo) ponerError(el, fallo.msg);
  });
});

// ── Navegación entre pasos ──────────────────────────────────
function mostrarPaso(n, { foco = false, scroll = true } = {}) {
  paso = n;
  pasos.forEach(p => { p.hidden = Number(p.dataset.step) !== n; });
  $('jobBar').style.width = ((n - 1) / (TOTAL - 1)) * 100 + '%';
  $('jobStepLabel').textContent = 'Paso ' + n + ' de ' + TOTAL + ' · ' + NOMBRES_PASO[n - 1];
  $('jobNota').hidden = n !== 1;
  btnPrev.hidden = n === 1;
  btnNext.hidden = n === TOTAL;
  btnSend.hidden = n !== TOTAL;
  btnNext.textContent = volverAResumen && n !== 2 ? 'Volver al resumen' : 'Siguiente';
  mostrarErrores([]);
  if (n === 3) armarPreguntas();
  if (n === 5) actualizarTrabajos();
  if (n === 6) armarResumen();
  guardarBorrador();
  if (scroll) {
    const top = form.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: Math.max(0, top), behavior: suave() });
  }
  if (foco) {                       // lectores de pantalla: anuncia el paso nuevo
    const leyenda = pasos[n - 1].querySelector('legend');
    if (leyenda) { leyenda.setAttribute('tabindex', '-1'); leyenda.focus({ preventScroll: true }); }
  }
}

// Cada avance queda en el historial: el botón "atrás" del celular vuelve al paso anterior en vez de salir de la página.
function ir(n) {
  mostrarPaso(n, { foco: true });
  try { history.pushState({ gg: n }, ''); } catch (_) { /* nada */ }
}
window.addEventListener('popstate', (ev) => {
  if (enviado) return;
  const n = ev.state && ev.state.gg;
  mostrarPaso(n >= 1 && n <= TOTAL ? n : 1, { foco: true });
});

btnNext.addEventListener('click', () => {
  const errs = validar(paso);
  if (errs.length) { mostrarErrores(errs); return; }
  if (volverAResumen && paso !== 2 && paso < TOTAL) { volverAResumen = false; ir(TOTAL); return; }
  ir(paso + 1);
});
btnPrev.addEventListener('click', () => { volverAResumen = false; ir(paso - 1); });
// Enter en un campo avanza de paso en vez de enviar.
form.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.tagName === 'INPUT' && ev.target.type !== 'checkbox' && ev.target.type !== 'radio') {
    ev.preventDefault();
    if (paso < TOTAL) btnNext.click();
  }
});

// ── Resumen final ───────────────────────────────────────────
function etiquetaDias(dias) {
  const l = DIAS.filter(d => dias[d.id]).map(d => d.nombre.slice(0, 3) + ': ' + textoDia(dias[d.id]));
  return l.length ? l.join(' · ') : '—';
}

function armarResumen() {
  const d = leer();
  const box = $('resumenBox');
  box.replaceChildren();
  const sec = (titulo, n, filas) => box.append(h('section', { class: 'resumen-sec' },
    h('div', { class: 'resumen-cab' },
      h('h3', { text: titulo }),
      h('button', { type: 'button', class: 'resumen-editar', 'data-paso': String(n), 'aria-label': 'Editar: ' + titulo }, 'Editar')),
    h('dl', null, filas.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', null, v || '—')]))
  ));
  sec('Tus datos', 1, [
    ['Nombre', d.nombre], ['WhatsApp', d.telefono], ['Email', d.email], ['Zona', d.zona],
    ['Foto', d.foto ? h('img', { src: d.foto, alt: 'Tu foto', class: 'resumen-foto' }) : 'Sin foto']
  ]);
  sec('Puestos', 2, [['Puestos elegidos', d.puestos.map(id => puestoPorId[id].nombre).join(', ')]]);
  const resp = [];
  PREGUNTAS.filter(q => d.extras[q.id]).forEach(q => {
    resp.push([q.label, d.extras[q.id]]);
    if (q.desarrollo && d.extras[q.desarrollo.id]) resp.push([q.desarrollo.label, d.extras[q.desarrollo.id]]);
  });
  if (resp.length) sec('Sobre el puesto', 3, resp);
  sec('Disponibilidad', 4, [
    ['Días y horarios', etiquetaDias(d.disponibilidad.dias)],
    ['Feriados', d.disponibilidad.feriados ? 'Sí' : 'No'],
    ['Jornada', d.disponibilidad.jornada],
    ['Puede empezar', d.disponibilidad.empieza]
  ]);
  const exp = [['Años de experiencia', d.experienciaAnios]];
  d.trabajos.forEach((t, i) => exp.push(['Trabajo ' + (i + 1), [t.lugar, t.puesto, t.tiempo].filter(Boolean).join(' · ')]));
  if (d.resumen) exp.push(['Sobre vos', d.resumen]);
  if (d.referencias) exp.push(['Referencias', d.referencias]);
  sec('Experiencia', 5, exp);
}
$('resumenBox').addEventListener('click', (ev) => {
  const b = ev.target.closest('.resumen-editar');
  if (!b) return;
  volverAResumen = true;
  ir(Number(b.dataset.paso));
});

// ── Borrador local (solo en este dispositivo) ───────────────
function guardarBorrador() {
  try {
    const datos = {};
    Array.from(form.elements).forEach(el => {
      if (!el.name || el.name === 'sitio_web' || el.name === 'consentimiento') return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) (datos[el.name] = datos[el.name] || []).push(el.value);
      } else if (el.value) datos[el.name] = [el.value];
    });
    localStorage.setItem(BORRADOR, JSON.stringify({ paso, datos }));
  } catch (_) { /* sin localStorage: se sigue igual */ }
}

function aplicarDatos(datos) {
  Array.from(form.elements).forEach(el => {
    const v = datos[el.name];
    if (!el.name || !v) return;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = v.includes(el.value);
    else el.value = v[0];
  });
}

// Devuelve true si restauró un borrador (y ya mostró el paso en el que había quedado).
function restaurarBorrador() {
  try {
    const raw = localStorage.getItem(BORRADOR);
    if (!raw) return false;
    const { paso: p, datos } = JSON.parse(raw);
    if (!datos || !(p > 1 && p <= TOTAL)) return false;
    aplicarDatos(datos);                 // 1) puestos y campos fijos
    armarPreguntas();                    // 2) preguntas según puestos
    aplicarDatos(datos);                 // 3) respuestas
    $('preguntasBox').querySelectorAll('textarea').forEach(t => t.dispatchEvent(new Event('input')));
    sincronizarDesarrollos();
    sincronizarDias();
    actualizarPuestos();
    actualizarTrabajos();
    mostrarPaso(p);
    return true;
  } catch (_) { return false; /* borrador dañado: se ignora */ }
}

form.addEventListener('input', (ev) => { limpiarAviso(ev.target); guardarBorrador(); });
form.addEventListener('change', (ev) => { limpiarAviso(ev.target); if (ev.target.name && ev.target.name.startsWith('q_')) sincronizarDesarrollos(); guardarBorrador(); });

// ── Foto: se achica en el navegador antes de guardarla ──────
const FOTO_LADO = 480;          // píxeles del lado más largo
const FOTO_MAX_CHARS = 80000;   // ~60 KB; las reglas aceptan hasta 90000
const FOTO_ORIGEN_MAX = 40 * 1024 * 1024;
const FOTO_KEY = 'gg-postulacion-foto';
const FOTO_PREFIJO = 'data:image/jpeg;base64,';
let foto = '';

function fotoValida(s) { return typeof s === 'string' && s.startsWith(FOTO_PREFIJO) && s.length <= FOTO_MAX_CHARS; }

async function abrirImagen(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { /* cae al método clásico */ }
  }
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

async function achicarFoto(file) {
  const img = await abrirImagen(file);
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new Error('Imagen vacía');
  let lado = FOTO_LADO;
  for (let intento = 0; intento < 4; intento++) {
    const esc = Math.min(1, lado / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * esc));
    c.height = Math.max(1, Math.round(h0 * esc));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';                     // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.72, 0.62, 0.5]) {
      const url = c.toDataURL('image/jpeg', q);
      if (url.length <= FOTO_MAX_CHARS) { if (img.close) img.close(); return url; }
    }
    lado = Math.round(lado * 0.75);
  }
  if (img.close) img.close();
  throw new Error('No se pudo achicar lo suficiente');
}

function pintarFoto() {
  const prev = $('fotoPreview');
  const icono = prev.querySelector('svg');
  prev.querySelectorAll('img').forEach(i => i.remove());
  if (foto) {
    if (icono) icono.style.display = 'none';
    prev.append(h('img', { src: foto, alt: '' }));
  } else if (icono) icono.style.display = '';
  $('fotoQuitar').hidden = !foto;
  $('fotoBtn').textContent = foto ? 'Cambiar foto' : 'Subir foto';
}

function errorFoto(txt) { $('fotoError').textContent = txt || ''; $('fotoError').hidden = !txt; }

function guardarFoto() {
  try { foto ? localStorage.setItem(FOTO_KEY, foto) : localStorage.removeItem(FOTO_KEY); } catch (_) { /* sin localStorage */ }
}

$('f-foto').addEventListener('change', async (ev) => {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';                        // permite volver a elegir el mismo archivo
  if (!file) return;
  errorFoto('');
  if (file.size > FOTO_ORIGEN_MAX) { errorFoto('Esa foto es demasiado grande (más de 40 MB). Elegí otra.'); return; }
  $('fotoPreview').classList.add('is-loading');
  try {
    foto = await achicarFoto(file);
    pintarFoto();
    guardarFoto();
  } catch (err) {
    console.error('Foto', err);
    errorFoto('No pudimos leer esa foto. Probá con otra en formato JPG o PNG (o sacá una nueva con la cámara).');
  } finally { $('fotoPreview').classList.remove('is-loading'); }
});

$('fotoQuitar').addEventListener('click', () => { foto = ''; errorFoto(''); pintarFoto(); guardarFoto(); });

function restaurarFoto() {
  try { const g = localStorage.getItem(FOTO_KEY); if (fotoValida(g)) { foto = g; pintarFoto(); } } catch (_) { /* nada */ }
}

// ── Envío ───────────────────────────────────────────────────
let db = null;
function conectar() {
  if (!configurado) { $('jobMantenimiento').hidden = false; form.hidden = true; return; }
  db = getFirestore(initializeApp(firebaseConfig));
}

function exito(nombre) {
  enviado = true;
  try { localStorage.removeItem(BORRADOR); localStorage.removeItem(FOTO_KEY); localStorage.setItem(ENVIADA, String(Date.now())); } catch (_) {}
  $('okNombre').textContent = nombre.split(' ')[0];
  form.hidden = true;
  $('jobOk').hidden = false;
  $('jobOk').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (paso !== TOTAL) return;
  // Revalida todo por si se saltearon pasos con el borrador.
  for (let n = 1; n <= TOTAL; n++) {
    const errs = validar(n);
    if (errs.length) { mostrarPaso(n, { foco: true }); mostrarErrores(errs); return; }
  }
  const d = leer();

  // Anti-bots: campo trampa lleno o formulario completado demasiado rápido → se simula el éxito sin guardar nada.
  if (form.elements.sitio_web.value || Date.now() - abierta < ESPERA_MIN_MS) { exito(d.nombre); return; }

  btnSend.disabled = true;
  btnSend.textContent = 'Enviando…';
  try {
    await addDoc(collection(db, 'postulaciones'), Object.assign(d, { estado: 'nuevo', creadoEn: serverTimestamp() }));
    exito(d.nombre);
  } catch (err) {
    console.error('Error al enviar la postulación', err);
    mostrarErrores([{ el: null, msg: 'No pudimos enviar tu postulación. Revisá tu conexión y probá de nuevo. Si sigue fallando, escribinos a greengardenlaplata@gmail.com.' }]);
    btnSend.disabled = false;
    btnSend.textContent = 'Enviar postulación';
  }
});

// ── Inicio ──────────────────────────────────────────────────
armarPuestos();
armarDias();
armarTrabajos();
llenarSelect('f-jornada', JORNADAS);
llenarSelect('f-empieza', EMPIEZA);
llenarSelect('f-anios', ANIOS);
const cuentaResumen = () => { $('resumenCuenta').textContent = $('f-resumen').value.length + ' / 800'; };
$('f-resumen').addEventListener('input', cuentaResumen);
conectar();
restaurarFoto();
sincronizarDias();
actualizarPuestos();
actualizarTrabajos();
// Al abrir la página no se hace scroll solo (se ve el título); con un borrador se vuelve al paso donde quedó.
if (!restaurarBorrador()) mostrarPaso(1, { scroll: false });
cuentaResumen();
try { history.replaceState({ gg: paso }, ''); } catch (_) { /* nada */ }
