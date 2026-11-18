// Green Garden — formulario de postulación (/trabaja-con-nosotros/).
// Guarda en Firestore (colección `postulaciones`). Las reglas de /firestore.rules validan todo de nuevo del lado del servidor.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, configurado } from '/firebase-config.js';
import {
  SECTORES, PUESTOS, MAX_PUESTOS, PREGUNTAS, DIAS, TURNOS,
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

function puestosElegidos() {
  return Array.from(form.querySelectorAll('input[name="puesto"]:checked')).map(i => i.value);
}

// ── Construcción de partes dinámicas ────────────────────────
function armarPuestos() {
  const box = $('puestosBox');
  $('maxPuestos').textContent = MAX_PUESTOS;
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
  box.addEventListener('change', () => {
    const n = puestosElegidos().length;
    box.querySelectorAll('input[name="puesto"]').forEach(i => { i.disabled = n >= MAX_PUESTOS && !i.checked; });
  });
}

function armarPreguntas() {
  const box = $('preguntasBox');
  const guardadas = {};
  box.querySelectorAll('input:checked').forEach(i => { guardadas[i.name] = i.value; });
  box.replaceChildren();
  const elegidos = puestosElegidos();
  PREGUNTAS.filter(q => q.para.some(p => elegidos.includes(p))).forEach(q => {
    box.append(h('div', { class: 'pregunta', role: 'radiogroup', 'aria-labelledby': 'q-' + q.id },
      h('p', { class: 'field-title', id: 'q-' + q.id, text: q.label }),
      h('div', { class: 'opciones' }, q.opciones.map(op =>
        h('label', { class: 'opcion' },
          h('input', Object.assign({ type: 'radio', name: 'q_' + q.id, value: op }, guardadas['q_' + q.id] === op ? { checked: '' } : {})),
          h('span', { text: op })
        )
      ))
    ));
  });
}

function armarGrilla() {
  const head = $('grillaHead');
  TURNOS.forEach(t => head.append(h('th', { scope: 'col' }, t.nombre, h('small', { text: t.horas }))));
  const body = $('grillaBody');
  DIAS.forEach(d => {
    body.append(h('tr', null,
      h('th', { scope: 'row', text: d.nombre }),
      TURNOS.map(t => h('td', null,
        h('label', null,
          h('span', { class: 'sr-only', text: d.nombre + ' ' + t.nombre }),
          h('input', { type: 'checkbox', name: 'grilla', value: d.id + '-' + t.id })
        )
      ))
    ));
  });
}

function llenarSelect(id, opciones) {
  const sel = $(id);
  sel.append(h('option', { value: '', text: 'Elegí una opción' }));
  opciones.forEach(o => sel.append(h('option', { value: o, text: o })));
}

function armarTrabajos() {
  const box = $('trabajosBox');
  ['Último trabajo', 'Trabajo anterior', 'Otro trabajo anterior'].forEach((t, i) => {
    box.append(h('div', { class: 'trabajo' },
      h('p', { class: 'trabajo-titulo', text: t + (i ? ' (opcional)' : ' (si tuviste)') }),
      h('label', null, 'Lugar', h('input', { type: 'text', name: 'tr' + i + '_lugar', maxlength: '60' })),
      h('label', null, 'Puesto', h('input', { type: 'text', name: 'tr' + i + '_puesto', maxlength: '60' })),
      h('label', null, 'Tiempo', h('input', { type: 'text', name: 'tr' + i + '_tiempo', maxlength: '40', placeholder: 'Ej: 2 años' }))
    ));
  });
}

// ── Lectura del formulario ──────────────────────────────────
function leer() {
  const fd = new FormData(form);
  const extras = {};
  PREGUNTAS.forEach(q => { const v = fd.get('q_' + q.id); if (v) extras[q.id] = String(v); });
  const trabajos = [0, 1, 2].map(i => ({
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
      grilla: fd.getAll('grilla').map(String),
      empieza: String(fd.get('empieza') || ''),
      jornada: String(fd.get('jornada') || ''),
      feriados: fd.get('feriados') === '1'
    },
    experienciaAnios: String(fd.get('anios') || ''),
    trabajos,
    resumen: String(fd.get('resumen') || '').trim().slice(0, 800),
    referencias: limpiar(fd.get('referencias')).slice(0, 400),
    consentimiento: fd.get('consentimiento') === '1'
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
    if (!/^\d{10}$/.test(d.telefono)) e.push({ el: f('telefono'), msg: 'Escribí tu WhatsApp con código de área y sin 0 ni 15 (10 dígitos). Ej: 221 555 1234.' });
    if (!EMAIL_RE.test(d.email)) e.push({ el: f('email'), msg: 'Escribí un email válido.' });
    if (d.zona.length < 2) e.push({ el: f('zona'), msg: 'Indicá tu barrio o localidad.' });
  }
  if (n === 2) {
    if (d.puestos.length < 1) e.push({ el: form.querySelector('input[name="puesto"]'), msg: 'Elegí al menos un puesto.' });
  }
  if (n === 3) {
    PREGUNTAS.filter(q => q.para.some(p => d.puestos.includes(p))).forEach(q => {
      if (!d.extras[q.id]) e.push({ el: form.querySelector('input[name="q_' + q.id + '"]'), msg: 'Respondé: ' + q.label });
    });
  }
  if (n === 4) {
    if (d.disponibilidad.grilla.length < 1) e.push({ el: form.querySelector('input[name="grilla"]'), msg: 'Marcá al menos un día y turno en que podrías trabajar.' });
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

function mostrarErrores(errs) {
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  if (!errs.length) { erroresBox.hidden = true; erroresBox.replaceChildren(); return; }
  errs.forEach(x => x.el && x.el.setAttribute('aria-invalid', 'true'));
  erroresBox.replaceChildren(
    h('strong', { text: errs.length === 1 ? 'Revisá este dato:' : 'Revisá estos datos:' }),
    h('ul', null, errs.map(x => h('li', { text: x.msg })))
  );
  erroresBox.hidden = false;
  erroresBox.focus();
}

// ── Navegación entre pasos ──────────────────────────────────
function mostrarPaso(n) {
  paso = n;
  pasos.forEach(p => { p.hidden = Number(p.dataset.step) !== n; });
  $('jobBar').style.width = ((n - 1) / (TOTAL - 1)) * 100 + '%';
  $('jobStepLabel').textContent = 'Paso ' + n + ' de ' + TOTAL;
  btnPrev.hidden = n === 1;
  btnNext.hidden = n === TOTAL;
  btnSend.hidden = n !== TOTAL;
  mostrarErrores([]);
  if (n === 3) armarPreguntas();
  if (n === 6) armarResumen();
  guardarBorrador();
  const top = form.getBoundingClientRect().top + window.scrollY - 90;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

btnNext.addEventListener('click', () => {
  const errs = validar(paso);
  if (errs.length) { mostrarErrores(errs); return; }
  mostrarPaso(paso + 1);
});
btnPrev.addEventListener('click', () => mostrarPaso(paso - 1));
// Enter en un campo avanza de paso en vez de enviar.
form.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.tagName === 'INPUT' && ev.target.type !== 'checkbox' && ev.target.type !== 'radio') {
    ev.preventDefault();
    if (paso < TOTAL) btnNext.click();
  }
});

// ── Resumen final ───────────────────────────────────────────
function etiquetaGrilla(grilla) {
  if (!grilla.length) return '—';
  return DIAS.map(d => {
    const ts = TURNOS.filter(t => grilla.includes(d.id + '-' + t.id)).map(t => t.nombre.toLowerCase());
    return ts.length ? d.nombre.slice(0, 3) + ': ' + ts.join(', ') : null;
  }).filter(Boolean).join(' · ');
}

function armarResumen() {
  const d = leer();
  const filas = [
    ['Nombre', d.nombre],
    ['WhatsApp', d.telefono],
    ['Email', d.email],
    ['Zona', d.zona],
    ['Puestos', d.puestos.map(id => puestoPorId[id].nombre).join(', ')],
    ['Disponibilidad', etiquetaGrilla(d.disponibilidad.grilla) + (d.disponibilidad.feriados ? ' · feriados' : '')],
    ['Jornada / inicio', d.disponibilidad.jornada + ' · ' + d.disponibilidad.empieza],
    ['Experiencia', d.experienciaAnios]
  ];
  const box = $('resumenBox');
  box.replaceChildren();
  filas.forEach(([k, v]) => { box.append(h('dt', { text: k }), h('dd', { text: v || '—' })); });
}

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
    $('puestosBox').dispatchEvent(new Event('change'));
    mostrarPaso(p);
    return true;
  } catch (_) { return false; /* borrador dañado: se ignora */ }
}

form.addEventListener('input', (ev) => { ev.target.removeAttribute && ev.target.removeAttribute('aria-invalid'); guardarBorrador(); });
form.addEventListener('change', (ev) => { ev.target.removeAttribute && ev.target.removeAttribute('aria-invalid'); guardarBorrador(); });

// ── Envío ───────────────────────────────────────────────────
let db = null;
function conectar() {
  if (!configurado) { $('jobMantenimiento').hidden = false; form.hidden = true; return; }
  db = getFirestore(initializeApp(firebaseConfig));
}

function exito(nombre) {
  try { localStorage.removeItem(BORRADOR); localStorage.setItem(ENVIADA, String(Date.now())); } catch (_) {}
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
    if (errs.length) { mostrarPaso(n); mostrarErrores(errs); return; }
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
armarGrilla();
armarTrabajos();
llenarSelect('f-jornada', JORNADAS);
llenarSelect('f-empieza', EMPIEZA);
llenarSelect('f-anios', ANIOS);
conectar();
if (!restaurarBorrador()) mostrarPaso(1);
