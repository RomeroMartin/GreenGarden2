// Green Garden — panel de la bolsa de trabajo (/admin/).
// Todo el contenido que viene de la base se inserta con textContent (nunca innerHTML): los datos los carga el público.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig, configurado } from '/firebase-config.js';
import {
  SECTORES, PUESTOS, PREGUNTAS, DIAS, TURNOS, ESTADOS, MESES_CONSERVACION,
  puestoPorId, preguntaPorId
} from '/trabajo-datos.js';

const $ = (id) => document.getElementById(id);
const LIMITE = 1000;
const estadoNombre = Object.fromEntries(ESTADOS.map(e => [e.id, e.nombre]));

let auth, db;
let perfil = null;      // { email, rol, sector, nombre }
let todas = [];         // postulaciones cargadas
let visibles = [];      // tras filtros
let actual = null;      // postulación abierta en el detalle
let notasActual = [];

// ── Utilidades ──────────────────────────────────────────────
function h(tag, attrs, ...hijos) {
  const el = document.createElement(tag);
  for (const k in (attrs || {})) {
    if (k === 'text') el.textContent = attrs[k];
    else if (k === 'class') el.className = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  hijos.flat().forEach(c => { if (c != null) el.append(c); });
  return el;
}
const fmt = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' });
const fmtFecha = (d) => (d ? fmt.format(d) : '—');
const mostrar = (el, txt) => { el.textContent = txt || ''; el.hidden = !txt; };
const nombresPuestos = (p) => p.puestos.map(id => (puestoPorId[id] ? puestoPorId[id].nombre : id));
const sectoresDe = (p) => [...new Set(p.puestos.map(id => puestoPorId[id] && puestoPorId[id].sector).filter(Boolean))];

function opciones(sel, lista, primera) {
  sel.replaceChildren(h('option', { value: '', text: primera }), ...lista.map(([v, t]) => h('option', { value: v, text: t })));
}

function resumenDisponibilidad(grilla) {
  const dias = DIAS.map(d => {
    const ts = TURNOS.filter(t => grilla.includes(d.id + '-' + t.id)).map(t => t.nombre.toLowerCase());
    return ts.length ? d.nombre.slice(0, 3) + ': ' + ts.join(', ') : null;
  }).filter(Boolean);
  return dias.join(' · ') || '—';
}

// ── Inicio ──────────────────────────────────────────────────
if (!configurado) {
  $('admMant').hidden = false;
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  onAuthStateChanged(auth, (user) => { user ? entrar(user) : pantallaLogin(); });
}

function pantallaLogin() {
  perfil = null; todas = [];
  $('vistaApp').hidden = true;
  $('admUser').hidden = true;
  $('vistaLogin').hidden = false;
}

async function entrar(user) {
  const email = (user.email || '').toLowerCase();
  try {
    const snap = await getDoc(doc(db, 'staff', email));
    if (!snap.exists()) throw new Error('sin-staff');
    const s = snap.data();
    perfil = { email, rol: s.rol === 'admin' ? 'admin' : 'encargado', sector: s.sector || '', nombre: s.nombre || email };
  } catch (err) {
    console.error(err);
    await signOut(auth);
    pantallaLogin();
    mostrar($('lError'), 'Tu usuario no tiene permiso para ver la bolsa de trabajo. Consultá con el administrador.');
    return;
  }
  $('vistaLogin').hidden = true;
  $('vistaApp').hidden = false;
  $('admUser').hidden = false;
  $('admUserTxt').textContent = perfil.nombre + (perfil.rol === 'admin' ? ' · Admin' : perfil.sector && SECTORES[perfil.sector] ? ' · ' + SECTORES[perfil.sector].nombre : '');
  $('btnDepurar').hidden = perfil.rol !== 'admin';
  $('detBorrar').hidden = perfil.rol !== 'admin';
  armarFiltros();
  await cargar();
}

// ── Login ───────────────────────────────────────────────────
const ERRORES_LOGIN = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-not-found': 'Email o contraseña incorrectos.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  'auth/network-request-failed': 'No hay conexión. Revisá tu internet.'
};

$('formLogin').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  mostrar($('lError'), ''); mostrar($('lOk'), '');
  const email = $('lEmail').value.trim(), pass = $('lPass').value;
  if (!email || !pass) { mostrar($('lError'), 'Completá email y contraseña.'); return; }
  $('btnLogin').disabled = true;
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch (err) { mostrar($('lError'), ERRORES_LOGIN[err.code] || 'No pudimos ingresar. Probá de nuevo.'); }
  finally { $('btnLogin').disabled = false; }
});

$('btnReset').addEventListener('click', async () => {
  mostrar($('lError'), ''); mostrar($('lOk'), '');
  const email = $('lEmail').value.trim();
  if (!email) { mostrar($('lError'), 'Escribí tu email arriba y volvé a tocar “Olvidé mi contraseña”.'); return; }
  try { await sendPasswordResetEmail(auth, email); } catch (_) { /* no revelamos si existe */ }
  mostrar($('lOk'), 'Si el email tiene acceso, te enviamos un link para crear una contraseña nueva.');
});

$('btnSalir').addEventListener('click', () => signOut(auth));

// ── Carga ───────────────────────────────────────────────────
async function cargar() {
  mostrar($('appError'), '');
  $('btnActualizar').disabled = true;
  try {
    const snap = await getDocs(query(collection(db, 'postulaciones'), orderBy('creadoEn', 'desc'), limit(LIMITE)));
    todas = snap.docs.map(d => {
      const x = d.data();
      return Object.assign({ id: d.id }, x, {
        fecha: x.creadoEn && x.creadoEn.toDate ? x.creadoEn.toDate() : null,
        estadoEn: x.estadoEn && x.estadoEn.toDate ? x.estadoEn.toDate() : null,
        ultimaNotaEn: x.ultimaNotaEn && x.ultimaNotaEn.toDate ? x.ultimaNotaEn.toDate() : null,
        puestos: Array.isArray(x.puestos) ? x.puestos : [],
        extras: x.extras || {},
        disponibilidad: Object.assign({ grilla: [] }, x.disponibilidad),
        trabajos: Array.isArray(x.trabajos) ? x.trabajos : []
      });
    });
    marcarDuplicados();
    aplicarFiltros();
  } catch (err) {
    console.error(err);
    mostrar($('appError'), 'No pudimos cargar las postulaciones. Revisá tu conexión y tocá “Actualizar”.');
  } finally { $('btnActualizar').disabled = false; }
}
$('btnActualizar').addEventListener('click', cargar);

function marcarDuplicados() {
  const por = {};
  todas.forEach(p => { [p.telefono, p.email].filter(Boolean).forEach(k => { (por[k] = por[k] || new Set()).add(p.id); }); });
  todas.forEach(p => {
    const otros = new Set();
    [p.telefono, p.email].filter(Boolean).forEach(k => por[k].forEach(id => { if (id !== p.id) otros.add(id); }));
    p.repetida = otros.size;
  });
}

// ── Filtros ─────────────────────────────────────────────────
function armarFiltros() {
  opciones($('fSector'), Object.keys(SECTORES).map(id => [id, SECTORES[id].nombre]), 'Todos los sectores');
  opciones($('fEstado'), ESTADOS.map(e => [e.id, e.nombre]), 'Todos');
  opciones($('fDia'), DIAS.map(d => [d.id, d.nombre]), 'Cualquier día');
  $('fQ').value = ''; $('fDesde').value = ''; $('fEstado').value = ''; $('fDia').value = '';
  // Cada encargado abre el panel filtrado por su sector, pero puede ver todo.
  $('fSector').value = perfil.rol !== 'admin' && SECTORES[perfil.sector] ? perfil.sector : '';
  llenarPuestos();
  const nota = $('avisoSector');
  if ($('fSector').value) {
    nota.textContent = 'Te mostramos primero los perfiles de ' + SECTORES[$('fSector').value].nombre + '. Elegí “Todos los sectores” para ver el resto.';
    nota.hidden = false;
  } else nota.hidden = true;
}

function llenarPuestos() {
  const s = $('fSector').value;
  const lista = PUESTOS.filter(p => !s || p.sector === s).map(p => [p.id, p.nombre]);
  opciones($('fPuesto'), lista, 'Todos los puestos');
}

function aplicarFiltros() {
  const q = $('fQ').value.trim().toLowerCase();
  const sector = $('fSector').value, puesto = $('fPuesto').value, estado = $('fEstado').value, dia = $('fDia').value;
  const desde = $('fDesde').value ? new Date($('fDesde').value + 'T00:00:00-03:00') : null;
  visibles = todas.filter(p => {
    if (q && ![p.nombre, p.telefono, p.email, p.zona].some(v => String(v || '').toLowerCase().includes(q))) return false;
    if (sector && !sectoresDe(p).includes(sector)) return false;
    if (puesto && !p.puestos.includes(puesto)) return false;
    if (estado && (p.estado || 'nuevo') !== estado) return false;
    if (dia && !p.disponibilidad.grilla.some(g => g.startsWith(dia + '-'))) return false;
    if (desde && (!p.fecha || p.fecha < desde)) return false;
    return true;
  });
  pintarLista();
}

$('fSector').addEventListener('change', () => { llenarPuestos(); $('avisoSector').hidden = true; aplicarFiltros(); });
['fQ', 'fPuesto', 'fEstado', 'fDia', 'fDesde'].forEach(id => {
  $(id).addEventListener(id === 'fQ' ? 'input' : 'change', aplicarFiltros);
});
$('btnLimpiar').addEventListener('click', () => {
  $('fQ').value = ''; $('fSector').value = ''; llenarPuestos(); $('fPuesto').value = '';
  $('fEstado').value = ''; $('fDia').value = ''; $('fDesde').value = '';
  $('avisoSector').hidden = true;
  aplicarFiltros();
});

// ── Listado ─────────────────────────────────────────────────
function pintarLista() {
  const nuevas = todas.filter(p => (p.estado || 'nuevo') === 'nuevo').length;
  $('cuenta').textContent = visibles.length + ' de ' + todas.length + (nuevas ? ' · ' + nuevas + ' nuevas' : '');
  $('vacio').hidden = visibles.length > 0;
  $('lista').replaceChildren(...visibles.map(p => {
    const est = p.estado || 'nuevo';
    const fila = h('button', { type: 'button', class: 'adm-fila', 'data-estado': est },
      h('span', { class: 'adm-fila-top' },
        h('span', { class: 'adm-fila-nombre', text: p.nombre }),
        h('span', { class: 'adm-badge', 'data-estado': est, text: estadoNombre[est] || est }),
        p.repetida ? h('span', { class: 'adm-dup', text: 'Se postuló ' + (p.repetida + 1) + ' veces' }) : null,
        h('span', { class: 'adm-fecha', text: fmtFecha(p.fecha) })
      ),
      h('span', { class: 'adm-chips' }, nombresPuestos(p).map(n => h('span', { class: 'adm-chip', text: n }))),
      h('span', { class: 'adm-fila-meta' },
        h('span', { text: p.zona }), h('span', { text: p.experienciaAnios || 'Sin dato de experiencia' }), h('span', { text: p.telefono })
      ),
      p.ultimaNota ? h('span', { class: 'adm-fila-nota' },
        h('strong', { text: 'Nota' + (p.cantNotas > 1 ? ' (' + p.cantNotas + ' en total)' : '') + ': ' }),
        p.ultimaNota.length > 140 ? p.ultimaNota.slice(0, 140) + '…' : p.ultimaNota,
        h('small', { text: ' — ' + (p.ultimaNotaPor || '') + (p.ultimaNotaEn ? ', ' + fmtFecha(p.ultimaNotaEn) : '') })
      ) : null
    );
    fila.addEventListener('click', () => abrirDetalle(p));
    return h('li', null, fila);
  }));
}

// ── Ficha (pantalla e impresión) ────────────────────────────
function dl(filas) {
  const el = h('dl');
  filas.forEach(([k, v]) => { el.append(h('dt', { text: k }), h('dd', { text: v || '—' })); });
  return el;
}

function renderFicha(p, notas, paraImprimir) {
  const est = p.estado || 'nuevo';
  const f = h('article', { class: 'ficha' });
  f.append(h('div', null,
    h('h2', paraImprimir ? { text: p.nombre } : { id: 'detNombre', text: p.nombre }),
    h('p', { class: 'ficha-sub', text: 'Postulación del ' + fmtFecha(p.fecha) + ' · Estado: ' + (estadoNombre[est] || est) })
  ));
  f.append(h('section', null, h('h3', { text: 'Contacto' }), dl([
    ['WhatsApp', p.telefono], ['Email', p.email], ['Zona', p.zona]
  ])));
  f.append(h('section', null, h('h3', { text: 'Puestos que le interesan' }), h('p', { text: nombresPuestos(p).join(' · ') })));

  const resp = Object.keys(p.extras).map(id => [preguntaPorId[id] ? preguntaPorId[id].label : id, p.extras[id]]);
  if (resp.length) f.append(h('section', null, h('h3', { text: 'Sobre el puesto' }), dl(resp)));

  const g = p.disponibilidad.grilla || [];
  const tabla = h('table', { class: 'ficha-grilla' },
    h('thead', null, h('tr', null, h('th', { scope: 'col', text: '' }), TURNOS.map(t => h('th', { scope: 'col', text: t.nombre + ' ' + t.horas })))),
    h('tbody', null, DIAS.map(d => h('tr', null,
      h('th', { scope: 'row', text: d.nombre }),
      TURNOS.map(t => h('td', { text: g.includes(d.id + '-' + t.id) ? '●' : '' }))
    )))
  );
  f.append(h('section', null, h('h3', { text: 'Disponibilidad' }), tabla,
    h('p', { text: [p.disponibilidad.jornada, p.disponibilidad.empieza ? 'Empieza: ' + p.disponibilidad.empieza : '', p.disponibilidad.feriados ? 'Puede trabajar feriados' : 'No marcó feriados'].filter(Boolean).join(' · ') })));

  const exp = h('section', null, h('h3', { text: 'Experiencia' }), h('p', { text: p.experienciaAnios || '—' }));
  p.trabajos.forEach(t => exp.append(h('div', { class: 'ficha-trabajo', text: [t.lugar, t.puesto, t.tiempo].filter(Boolean).join(' · ') })));
  if (p.resumen) exp.append(h('p', { text: p.resumen }));
  if (p.referencias) exp.append(h('p', { text: 'Referencias: ' + p.referencias }));
  f.append(exp);

  if (notas && notas.length) {
    f.append(h('section', null, h('h3', { text: 'Notas internas' }),
      notas.map(n => h('p', { text: fmtFecha(n.en) + ' · ' + n.por + ': ' + n.texto }))));
  }
  return f;
}

// ── Detalle ─────────────────────────────────────────────────
const dlg = $('detalle');

async function abrirDetalle(p) {
  actual = p; notasActual = [];
  mostrar($('detError'), '');
  $('detalleBody').replaceChildren(renderFicha(p, []));
  const primer = (p.nombre || '').split(' ')[0];
  const msg = 'Hola ' + primer + ', te escribimos de Green Garden por tu postulación. ¿Tenés un momento para coordinar una entrevista?';
  $('detWhats').href = 'https://wa.me/549' + p.telefono + '?text=' + encodeURIComponent(msg);
  $('detMail').href = 'mailto:' + p.email + '?subject=' + encodeURIComponent('Tu postulación en Green Garden');
  $('detEstado').replaceChildren(...ESTADOS.map(e => h('option', { value: e.id, text: e.nombre })));
  $('detEstado').value = p.estado || 'nuevo';
  pintarEstadoInfo();
  $('detNotas').replaceChildren();
  $('notaTexto').value = '';
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  try {
    const s = await getDocs(query(collection(db, 'postulaciones', p.id, 'notas'), orderBy('en', 'asc')));
    notasActual = s.docs.map(d => { const x = d.data(); return { id: d.id, texto: x.texto, por: x.por, en: x.en && x.en.toDate ? x.en.toDate() : null }; });
    if (actual === p) pintarNotas();
  } catch (err) { console.error(err); mostrar($('detError'), 'No pudimos cargar las notas.'); }
}

function pintarEstadoInfo() {
  $('detEstadoInfo').textContent = actual.estadoPor ? 'Cambiado por ' + actual.estadoPor + ' el ' + fmtFecha(actual.estadoEn) : '';
}

function pintarNotas() {
  $('detNotas').replaceChildren(...notasActual.map(n =>
    h('li', { class: 'adm-nota' }, n.texto, h('small', { text: n.por + ' · ' + fmtFecha(n.en) }))
  ));
}

$('detCerrar').addEventListener('click', () => dlg.close());
dlg.addEventListener('close', () => { actual = null; });

$('detEstado').addEventListener('change', async (ev) => {
  const p = actual, nuevo = ev.target.value;
  mostrar($('detError'), '');
  ev.target.disabled = true;
  try {
    await updateDoc(doc(db, 'postulaciones', p.id), { estado: nuevo, estadoPor: perfil.email, estadoEn: serverTimestamp() });
    p.estado = nuevo; p.estadoPor = perfil.email; p.estadoEn = new Date();
    pintarEstadoInfo();
    $('detalleBody').replaceChildren(renderFicha(p, notasActual));
    aplicarFiltros();
  } catch (err) {
    console.error(err);
    ev.target.value = p.estado || 'nuevo';
    mostrar($('detError'), 'No pudimos guardar el cambio de estado.');
  } finally { ev.target.disabled = false; }
});

$('formNota').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const texto = $('notaTexto').value.trim();
  if (!texto || !actual) return;
  mostrar($('detError'), '');
  const btn = ev.submitter; btn.disabled = true;
  const p = actual;
  try {
    await addDoc(collection(db, 'postulaciones', p.id, 'notas'), { texto, por: perfil.email, en: serverTimestamp() });
    notasActual.push({ texto, por: perfil.email, en: new Date() });
    pintarNotas();
    $('notaTexto').value = '';
  } catch (err) {
    console.error(err);
    mostrar($('detError'), 'No pudimos guardar la nota.');
    btn.disabled = false;
    return;
  }
  // Resumen de la última nota en la propia postulación, para verla en el listado sin abrirla.
  try {
    const cant = Math.max(notasActual.length, (p.cantNotas || 0) + 1);
    await updateDoc(doc(db, 'postulaciones', p.id), {
      ultimaNota: texto.slice(0, 200), ultimaNotaPor: perfil.email, ultimaNotaEn: serverTimestamp(), cantNotas: cant
    });
    Object.assign(p, { ultimaNota: texto.slice(0, 200), ultimaNotaPor: perfil.email, ultimaNotaEn: new Date(), cantNotas: cant });
    aplicarFiltros();
  } catch (err) {
    console.error(err);
    mostrar($('detError'), 'La nota se guardó, pero no pudimos mostrarla en el listado.');
  } finally { btn.disabled = false; }
});

async function borrarPostulacion(p) {
  const notas = await getDocs(collection(db, 'postulaciones', p.id, 'notas'));
  for (const n of notas.docs) await deleteDoc(n.ref);
  await deleteDoc(doc(db, 'postulaciones', p.id));
}

$('detBorrar').addEventListener('click', async () => {
  const p = actual;
  if (!p || !confirm('¿Eliminar definitivamente la postulación de ' + p.nombre + '? No se puede deshacer.')) return;
  try {
    await borrarPostulacion(p);
    todas = todas.filter(x => x.id !== p.id);
    marcarDuplicados();
    dlg.close();
    aplicarFiltros();
  } catch (err) { console.error(err); mostrar($('detError'), 'No pudimos eliminar la postulación.'); }
});

// ── Eliminar antiguas (conservación máxima de 12 meses) ─────
$('btnDepurar').addEventListener('click', async () => {
  const corte = new Date(); corte.setMonth(corte.getMonth() - MESES_CONSERVACION);
  const viejas = todas.filter(p => p.fecha && p.fecha < corte);
  if (!viejas.length) { alert('No hay postulaciones de más de ' + MESES_CONSERVACION + ' meses.'); return; }
  if (!confirm('Hay ' + viejas.length + ' postulaciones de más de ' + MESES_CONSERVACION + ' meses. ¿Eliminarlas definitivamente? Conviene exportar a Excel antes.')) return;
  $('btnDepurar').disabled = true;
  try {
    for (const p of viejas) await borrarPostulacion(p);
    await cargar();
  } catch (err) { console.error(err); mostrar($('appError'), 'Se produjo un error eliminando. Tocá “Actualizar” para ver qué quedó.'); }
  finally { $('btnDepurar').disabled = false; }
});

// ── Imprimir ────────────────────────────────────────────────
function imprimir(modo, reabrir) {
  document.body.dataset.print = modo;
  const limpiar = () => {
    delete document.body.dataset.print;
    $('fichaPrint').replaceChildren();
    window.removeEventListener('afterprint', limpiar);
    if (reabrir) reabrir();
  };
  window.addEventListener('afterprint', limpiar);
  window.print();
}
// Envuelve el contenido en una tabla con espaciadores arriba y abajo que se repiten en cada hoja (ver admin.css).
function marcoImpresion(...hijos) {
  const hueco = () => h('div', { class: 'print-gap' });
  return h('table', { class: 'print-frame', role: 'presentation' },
    h('thead', null, h('tr', null, h('td', null, hueco()))),
    h('tfoot', null, h('tr', null, h('td', null, hueco()))),
    h('tbody', null, h('tr', null, h('td', { class: 'print-body' }, ...hijos)))
  );
}

$('detImprimir').addEventListener('click', () => {
  // Se cierra el panel de detalle antes de imprimir: así la ficha sale sola, sin nada superpuesto.
  const p = actual, notas = notasActual;
  $('fichaPrint').replaceChildren(marcoImpresion(renderFicha(p, notas, true)));
  dlg.close();
  imprimir('ficha', () => { actual = p; notasActual = notas; if (!dlg.open) dlg.showModal(); });
});
$('btnImprimirLista').addEventListener('click', () => {
  const lista = $('lista').cloneNode(true);
  lista.removeAttribute('id');
  $('fichaPrint').replaceChildren(marcoImpresion(
    h('h2', { class: 'print-title', text: 'Postulaciones · Green Garden' }),
    h('p', { class: 'ficha-sub', text: visibles.length + ' postulaciones · ' + fmtFecha(new Date()) }),
    lista
  ));
  imprimir('listado');
});

// ── Excel ───────────────────────────────────────────────────
function cargarSheetJS() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la librería de Excel'));
    document.head.append(s);
  });
}

$('btnExcel').addEventListener('click', async () => {
  if (!visibles.length) { alert('No hay postulaciones para exportar con estos filtros.'); return; }
  const btn = $('btnExcel'); btn.disabled = true;
  try {
    await cargarSheetJS();
    const filas = visibles.map(p => {
      const ult = p.trabajos[0] || {};
      return {
        'Fecha': fmtFecha(p.fecha),
        'Nombre': p.nombre,
        'WhatsApp': p.telefono,
        'Email': p.email,
        'Zona': p.zona,
        'Puestos': nombresPuestos(p).join(', '),
        'Sectores': sectoresDe(p).map(s => SECTORES[s].nombre).join(', '),
        'Años de experiencia': p.experienciaAnios || '',
        'Último trabajo': [ult.lugar, ult.puesto, ult.tiempo].filter(Boolean).join(' · '),
        'Disponibilidad': resumenDisponibilidad(p.disponibilidad.grilla || []),
        'Jornada': p.disponibilidad.jornada || '',
        'Puede empezar': p.disponibilidad.empieza || '',
        'Feriados': p.disponibilidad.feriados ? 'Sí' : 'No',
        'Sobre el puesto': Object.keys(p.extras).map(id => (preguntaPorId[id] ? preguntaPorId[id].label : id) + ' ' + p.extras[id]).join(' | '),
        'Comentarios': p.resumen || '',
        'Referencias': p.referencias || '',
        'Estado': estadoNombre[p.estado || 'nuevo'] || p.estado,
        'Estado cambiado por': p.estadoPor || '',
        'Última nota': p.ultimaNota ? p.ultimaNota + ' (' + (p.ultimaNotaPor || '') + ')' : '',
        'Cantidad de notas': p.cantNotas || 0
      };
    });
    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [16, 24, 14, 28, 18, 28, 20, 16, 30, 40, 12, 14, 9, 50, 40, 30, 12, 26, 50, 10].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Postulaciones');
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
    XLSX.writeFile(wb, 'postulaciones-green-garden-' + hoy + '.xlsx');
  } catch (err) {
    console.error(err);
    mostrar($('appError'), 'No pudimos generar el Excel. Revisá tu conexión y probá de nuevo.');
  } finally { btn.disabled = false; }
});
