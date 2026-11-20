// Green Garden — datos compartidos de la bolsa de trabajo (formulario público y panel /admin).
// Si cambiás un id de acá, las postulaciones viejas siguen guardadas con el id anterior: agregá puestos, no renombres.

export const SECTORES = {
  cocina:    { nombre: 'Cocina' },
  panaderia: { nombre: 'Panadería y pastelería' },
  barra:     { nombre: 'Barra' },
  salon:     { nombre: 'Salón' },
  playroom:  { nombre: 'Playroom' }
};

export const PUESTOS = [
  { id: 'cocinero',     nombre: 'Cocinero/a',            sector: 'cocina' },
  { id: 'bachero',      nombre: 'Bachero/a',             sector: 'cocina' },
  { id: 'parrillero',   nombre: 'Parrillero/a',          sector: 'cocina' },
  { id: 'pizzero',      nombre: 'Pizzero/a',             sector: 'cocina' },
  { id: 'jefe-cocina',  nombre: 'Jefe/a de cocina',      sector: 'cocina' },
  { id: 'pastelero',    nombre: 'Pastelero/a',           sector: 'panaderia' },
  { id: 'panadero',     nombre: 'Panadero/a',            sector: 'panaderia' },
  { id: 'bartender',    nombre: 'Bartender',             sector: 'barra' },
  { id: 'barista',      nombre: 'Barista',               sector: 'barra' },
  { id: 'camarero',     nombre: 'Camarero/a',            sector: 'salon' },
  { id: 'recepcionista',nombre: 'Recepcionista',         sector: 'salon' },
  { id: 'mostrador',    nombre: 'Atención de mostrador', sector: 'salon' },
  { id: 'cajero',       nombre: 'Cajero/a',              sector: 'salon' },
  { id: 'jefe-sala',    nombre: 'Jefe/a de sala',        sector: 'salon' },
  { id: 'playroom',     nombre: 'Playroom',              sector: 'playroom' }
];

export const MAX_PUESTOS = 4;

const SI_NO = ['Sí', 'No'];
const SI_UN_POCO_NO = ['Sí', 'Un poco', 'No'];

// Puestos agrupados como los piensan los encargados.
const COCINA = ['cocinero', 'parrillero', 'pizzero', 'jefe-cocina'];   // con carnet de manipulación
const COCINA_Y_BACHERO = [...COCINA, 'bachero'];
const PANADERIA = ['pastelero', 'panadero'];
const BARRA = ['bartender', 'barista'];
const SALON = ['camarero', 'recepcionista', 'mostrador', 'jefe-sala', 'cajero'];

// Experiencia previa: Sí/No y, si dice que sí, un breve desarrollo (máx. 200 caracteres) que se guarda en extras[desarrollo.id].
const experiencia = (id, donde, para) => ({
  id, label: '¿Tenés experiencia previa ' + donde + '?', opciones: SI_NO, para,
  desarrollo: {
    id: id + '-texto', cuando: 'Sí', max: 200,
    label: 'Contanos brevemente dónde trabajaste y qué hacías',
    etiqueta: 'Experiencia ' + donde + ' (detalle)'
  }
});

// Preguntas que se muestran según los puestos elegidos. La respuesta se guarda en `extras[id]`.
// Si se agrega o cambia una, hay que reflejarla en la lista de claves permitidas de firestore.rules.
export const PREGUNTAS = [
  { id: 'manipulacion', label: '¿Tenés carnet de manipulación de alimentos?', opciones: ['Sí, vigente', 'En trámite', 'No'], para: [...COCINA, ...PANADERIA] },
  experiencia('exp-cocina', 'en cocina', COCINA_Y_BACHERO),
  experiencia('exp-pan', 'en panadería o pastelería', PANADERIA),
  { id: 'madrugada',    label: '¿Podés trabajar en turno madrugada (desde las 4 o 5 am)?', opciones: SI_NO, para: PANADERIA },
  { id: 'cocteleria',   label: '¿Qué nivel de coctelería manejás?', opciones: ['Básica', 'Clásica', 'Clásica y de autor'], para: ['bartender'] },
  { id: 'espresso',     label: '¿Tenés experiencia con máquina de espresso y leche texturizada?', opciones: SI_UN_POCO_NO, para: ['barista'] },
  { id: 'producciones', label: '¿Tenés experiencia elaborando producciones (almíbares, jugos, siropes)?', opciones: SI_UN_POCO_NO, para: BARRA },
  experiencia('exp-salon', 'en salón (atención al público)', SALON),
  { id: 'caja',         label: '¿Manejás caja y POS?', opciones: SI_UN_POCO_NO, para: SALON },
  { id: 'ingles',       label: '¿Cuál es tu nivel de inglés?', opciones: ['Nada', 'Básico', 'Intermedio', 'Avanzado'], para: SALON },
  { id: 'bandeja',      label: '¿Sabés manejar bandeja (llevar varios platos o bebidas)?', opciones: SI_UN_POCO_NO, para: ['camarero', 'jefe-sala'] },
  { id: 'equipo-a-cargo', label: '¿Cuántas personas tuviste a cargo?', opciones: ['Ninguna', '1 a 5', '6 a 15', 'Más de 15'], para: ['jefe-cocina', 'jefe-sala'] },
  { id: 'rotativos',    label: '¿Tenés disponibilidad para turnos rotativos?', opciones: SI_NO, para: SALON },
  { id: 'partidos',     label: '¿Y para horarios partidos (por ejemplo mañana y noche, con una pausa en el medio)?', opciones: SI_NO, para: SALON },
  { id: 'ninos',        label: '¿Tenés experiencia cuidando o animando niños?', opciones: SI_NO, para: ['playroom'] },
  { id: 'primeros-aux', label: '¿Tenés curso de RCP o primeros auxilios?', opciones: ['Sí', 'En curso', 'No'], para: ['playroom'] }
];

// Preguntas que ya no se hacen pero que figuran en postulaciones viejas: el panel las sigue mostrando con su texto.
export const PREGUNTAS_ANTERIORES = {
  'alto-volumen': { label: '¿Tenés experiencia en cocina de alto volumen (salón completo)?' },
  'parrilla':     { label: '¿Manejás parrilla a leña o carbón?' },
  'pizza':        { label: '¿Sabés estirar y hornear pizza?' }
};

export const DIAS = [
  { id: 'lun', nombre: 'Lunes' }, { id: 'mar', nombre: 'Martes' }, { id: 'mie', nombre: 'Miércoles' },
  { id: 'jue', nombre: 'Jueves' }, { id: 'vie', nombre: 'Viernes' }, { id: 'sab', nombre: 'Sábado' },
  { id: 'dom', nombre: 'Domingo' }
];

// Disponibilidad por día: 'full' (cualquier horario) o 'HH:00-HH:00'. Las horas van de 04:00 (panadería) a 03:00 del día siguiente.
export const HORAS = Array.from({ length: 24 }, (_, i) => String((i + 4) % 24).padStart(2, '0') + ':00');
export const ORDEN_HORA = Object.fromEntries(HORAS.map((h, i) => [h, i]));

// Formato anterior (franjas fijas). Solo se usa para mostrar postulaciones viejas.
export const TURNOS = [
  { id: 'manana', nombre: 'Mañana', horas: '08 a 15' },
  { id: 'tarde',  nombre: 'Tarde',  horas: '15 a 22' },
  { id: 'noche',  nombre: 'Noche',  horas: '22 a 02' }
];

export function textoDia(valor) {
  if (!valor) return '—';
  if (valor === 'full') return 'Full time';
  const [a, b] = String(valor).split('-');
  return a + ' a ' + b;
}

// Devuelve la disponibilidad como [{ dia, valor, texto }] para los 7 días, sea cual sea el formato guardado.
export function diasDe(disp) {
  disp = disp || {};
  if (disp.dias && typeof disp.dias === 'object') {
    return DIAS.map(d => ({ dia: d, valor: disp.dias[d.id] || '', texto: textoDia(disp.dias[d.id]) }));
  }
  const g = Array.isArray(disp.grilla) ? disp.grilla : [];
  return DIAS.map(d => {
    const ts = TURNOS.filter(t => g.includes(d.id + '-' + t.id));
    const texto = !ts.length ? '—' : ts.length === TURNOS.length ? 'Full time' : ts.map(t => t.nombre + ' (' + t.horas + ')').join(' + ');
    return { dia: d, valor: ts.length ? 'legacy' : '', texto };
  });
}

export const JORNADAS = ['Full time', 'Part time', 'Me da igual'];
export const EMPIEZA = ['Inmediato', 'En 15 días', 'En un mes', 'A convenir'];
export const ANIOS = ['Sin experiencia', 'Menos de 1 año', '1 a 3 años', '3 a 5 años', 'Más de 5 años'];

export const ESTADOS = [
  { id: 'nuevo',      nombre: 'Nuevo' },
  { id: 'contactado', nombre: 'Contactado' },
  { id: 'entrevista', nombre: 'Entrevista' },
  { id: 'contratado', nombre: 'Contratado' },
  { id: 'descartado', nombre: 'Descartado' }
];

export const MESES_CONSERVACION = 12;

export const puestoPorId = Object.fromEntries(PUESTOS.map(p => [p.id, p]));
export const preguntaPorId = Object.assign(
  {},
  PREGUNTAS_ANTERIORES,
  Object.fromEntries(PREGUNTAS.map(q => [q.id, q])),
  Object.fromEntries(PREGUNTAS.filter(q => q.desarrollo).map(q => [q.desarrollo.id, { label: q.desarrollo.etiqueta }]))
);
