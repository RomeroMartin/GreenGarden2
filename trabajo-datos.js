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
const COMIDA = ['cocinero', 'bachero', 'parrillero', 'pizzero', 'jefe-cocina', 'pastelero', 'panadero', 'mostrador', 'barista'];

// Preguntas que se muestran según los puestos elegidos. La respuesta se guarda en `extras[id]`.
export const PREGUNTAS = [
  { id: 'manipulacion',   label: '¿Tenés carnet de manipulación de alimentos?',            opciones: ['Sí, vigente', 'En trámite', 'No'], para: COMIDA },
  { id: 'alto-volumen',   label: '¿Tenés experiencia en cocina de alto volumen (salón completo)?', opciones: SI_NO, para: ['cocinero', 'parrillero', 'pizzero', 'jefe-cocina'] },
  { id: 'parrilla',       label: '¿Manejás parrilla a leña o carbón?',                      opciones: SI_NO, para: ['parrillero'] },
  { id: 'pizza',          label: '¿Sabés estirar y hornear pizza?',                         opciones: SI_UN_POCO_NO, para: ['pizzero'] },
  { id: 'madrugada',      label: '¿Podés trabajar en turno madrugada (desde las 4 o 5 am)?', opciones: SI_NO, para: ['panadero', 'pastelero'] },
  { id: 'cocteleria',     label: '¿Qué nivel de coctelería manejás?',                       opciones: ['Básica', 'Clásica', 'Clásica y de autor'], para: ['bartender'] },
  { id: 'espresso',       label: '¿Tenés experiencia con máquina de espresso y leche texturizada?', opciones: SI_UN_POCO_NO, para: ['barista'] },
  { id: 'caja',           label: '¿Manejás caja, POS y arqueo?',                            opciones: SI_UN_POCO_NO, para: ['cajero', 'mostrador', 'recepcionista'] },
  { id: 'ingles',         label: '¿Cuál es tu nivel de inglés?',                            opciones: ['Nada', 'Básico', 'Intermedio', 'Avanzado'], para: ['camarero', 'recepcionista', 'jefe-sala', 'bartender'] },
  { id: 'ninos',          label: '¿Tenés experiencia cuidando o animando niños?',           opciones: SI_NO, para: ['playroom'] },
  { id: 'primeros-aux',   label: '¿Tenés curso de RCP o primeros auxilios?',                opciones: ['Sí', 'En curso', 'No'], para: ['playroom'] },
  { id: 'equipo-a-cargo', label: '¿Cuántas personas tuviste a cargo?',                      opciones: ['Ninguna', '1 a 5', '6 a 15', 'Más de 15'], para: ['jefe-cocina', 'jefe-sala'] }
];

export const DIAS = [
  { id: 'lun', nombre: 'Lunes' }, { id: 'mar', nombre: 'Martes' }, { id: 'mie', nombre: 'Miércoles' },
  { id: 'jue', nombre: 'Jueves' }, { id: 'vie', nombre: 'Viernes' }, { id: 'sab', nombre: 'Sábado' },
  { id: 'dom', nombre: 'Domingo' }
];

// El local abre de 08:00 a 02:00.
export const TURNOS = [
  { id: 'manana', nombre: 'Mañana', horas: '08 a 15' },
  { id: 'tarde',  nombre: 'Tarde',  horas: '15 a 22' },
  { id: 'noche',  nombre: 'Noche',  horas: '22 a 02' }
];

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
export const preguntaPorId = Object.fromEntries(PREGUNTAS.map(q => [q.id, q]));
