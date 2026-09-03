/**
 * Sistema de Control de Asistencia de Alumnos
 * Estilo Cute, Coqueto y Moderno 🌸✨
 * Desarrollado con JavaScript Vanilla
 */

// Clave para almacenamiento en LocalStorage
const STORAGE_KEY = 'asistencia_escolar_alumnos_v1';

// Estado de la aplicación
let registros = [];

// Paleta pastel para avatares tiernos de alumnos
const PASTEL_AVATAR_PALETTE = [
  { bg: '#fce7f3', text: '#9d174d' }, // Rosa pastel
  { bg: '#ede9fe', text: '#5b21b6' }, // Lavanda pastel
  { bg: '#dcfce7', text: '#166534' }, // Menta pastel
  { bg: '#e0f2fe', text: '#0369a1' }, // Azul cielo pastel
  { bg: '#fef3c7', text: '#92400e' }  // Melocotón pastel
];

// Elementos del DOM
const formAsistencia = document.getElementById('formAsistencia');
const inputNombre = document.getElementById('inputNombre');
const inputFecha = document.getElementById('inputFecha');
const inputHoraEntrada = document.getElementById('inputHoraEntrada');
const inputHoraSalida = document.getElementById('inputHoraSalida');
const selectEstado = document.getElementById('selectEstado');
const errorNombre = document.getElementById('errorNombre');
const btnLimpiar = document.getElementById('btnLimpiar');

const tbodyAsistencia = document.getElementById('tbodyAsistencia');
const emptyState = document.getElementById('emptyState');
const conteoRegistros = document.getElementById('conteoRegistros');
const currentDateDisplay = document.getElementById('currentDateDisplay');

// Filtros
const filtroNombre = document.getElementById('filtroNombre');
const filtroEstado = document.getElementById('filtroEstado');
const filtroFecha = document.getElementById('filtroFecha');

// Tarjetas de Estadísticas
const cardTotalHoy = document.getElementById('cardTotalHoy');
const cardSubtextHoy = document.getElementById('cardSubtextHoy');
const statPresentesHoy = document.getElementById('statPresentesHoy');
const statRetardosHoy = document.getElementById('statRetardosHoy');
const statFaltasHoy = document.getElementById('statFaltasHoy');

// Botones auxiliares
const btnCargarDemo = document.getElementById('btnCargarDemo');
const btnBorrarTodo = document.getElementById('btnBorrarTodo');
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

// ==========================================================================
// Utilidades de Fecha, Hora y Estilo
// ==========================================================================

/**
 * Retorna la fecha local actual en formato YYYY-MM-DD
 */
function getFechaLocalActual() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna la hora local actual en formato HH:MM
 */
function getHoraLocalActual() {
  const ahora = new Date();
  const hours = String(ahora.getHours()).padStart(2, '0');
  const minutes = String(ahora.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formatea una fecha YYYY-MM-DD a formato amigable DD/MM/YYYY
 */
function formatearFecha(fechaStr) {
  if (!fechaStr) return '--/--/----';
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaStr;
}

/**
 * Formatea hora militar a formato 12 hrs con am/pm
 */
function formatearHora(horaStr) {
  if (!horaStr) return '-';
  const [h, m] = horaStr.split(':');
  const numH = parseInt(h, 10);
  const ampm = numH >= 12 ? 'p.m.' : 'a.m.';
  const h12 = numH % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Retorna un estilo de color pastel aleatorio pero determinista según el nombre
 */
function getAvatarStyle(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = PASTEL_AVATAR_PALETTE[Math.abs(hash) % PASTEL_AVATAR_PALETTE.length];
  return `background-color: ${color.bg}; color: ${color.text}; border: 1.5px solid ${color.bg};`;
}

/**
 * Escapa HTML para prevenir inyección de código
 */
function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/**
 * Muestra notificación flotante (toast) con estilo cute
 */
let toastTimeout = null;
function mostrarToast(mensaje) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.textContent = mensaje;
  toastNotification.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 3200);
}

// ==========================================================================
// Persistencia en LocalStorage
// ==========================================================================

function guardarEnStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  } catch (e) {
    console.error('Error al guardar en LocalStorage:', e);
  }
}

function cargarDeStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      registros = JSON.parse(data);
    } else {
      registros = [];
    }
  } catch (e) {
    console.error('Error al leer de LocalStorage:', e);
    registros = [];
  }
}

// ==========================================================================
// Cálculo de Estadísticas del Día (Requisito #3)
// ==========================================================================

function actualizarEstadisticas() {
  const hoyStr = getFechaLocalActual();

  // Filtrar todos los registros de la fecha actual
  const registrosHoy = registros.filter(r => r.fecha === hoyStr);

  let presentesHoy = 0;
  let retardosHoy = 0;
  let faltasHoy = 0;

  registrosHoy.forEach(r => {
    if (r.estado === 'Presente') presentesHoy++;
    else if (r.estado === 'Retardo') retardosHoy++;
    else if (r.estado === 'Falta') faltasHoy++;
  });

  // Alumnos que asistieron (Presentes + Retardos)
  const totalLlegaron = presentesHoy + retardosHoy;

  // Actualizar tarjeta principal
  if (totalLlegaron === 1) {
    cardTotalHoy.textContent = `Hoy llegó 1 alumno`;
  } else {
    cardTotalHoy.textContent = `Hoy llegaron ${totalLlegaron} alumnos`;
  }

  cardSubtextHoy.textContent = `🌸 ${presentesHoy} puntual(es), ⏳ ${retardosHoy} con retardo. (${registrosHoy.length} registrados hoy)`;

  // Actualizar tarjetas secundarias
  statPresentesHoy.textContent = presentesHoy;
  statRetardosHoy.textContent = retardosHoy;
  statFaltasHoy.textContent = faltasHoy;
}

// ==========================================================================
// Renderizado de la Tabla (Requisito #2)
// ==========================================================================

function renderTabla() {
  const busqueda = filtroNombre.value.trim().toLowerCase();
  const estadoFiltro = filtroEstado.value;
  const fechaFiltro = filtroFecha.value;
  const hoyStr = getFechaLocalActual();

  // Filtrar según controles
  const registrosFiltrados = registros.filter(r => {
    const coincideNombre = r.nombre.toLowerCase().includes(busqueda);
    const coincideEstado = estadoFiltro === 'todos' || r.estado === estadoFiltro;
    const coincideFecha = fechaFiltro === 'todos' || (fechaFiltro === 'hoy' && r.fecha === hoyStr);
    return coincideNombre && coincideEstado && coincideFecha;
  });

  // Limpiar cuerpo de la tabla
  tbodyAsistencia.innerHTML = '';

  if (registrosFiltrados.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    registrosFiltrados.forEach((item, index) => {
      const tr = document.createElement('tr');

      // Iniciales para el avatar
      const iniciales = item.nombre
        .split(' ')
        .filter(n => n.length > 0)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('');

      // Estilo pastel para el avatar
      const avatarStyle = getAvatarStyle(item.nombre);

      // Icono sutil según estado
      let emojiEstado = '✨';
      if (item.estado === 'Retardo') emojiEstado = '⏳';
      else if (item.estado === 'Falta') emojiEstado = '💤';

      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700;">${index + 1}</td>
        <td>
          <div class="student-name">
            <span class="student-avatar" style="${avatarStyle}">${escapeHtml(iniciales || 'A')}</span>
            <span>${escapeHtml(item.nombre)}</span>
          </div>
        </td>
        <td><span style="font-weight: 600; color: #574b66;">${formatearFecha(item.fecha)}</span></td>
        <td><span class="time-text">${formatearHora(item.horaEntrada)}</span></td>
        <td><span class="time-text">${formatearHora(item.horaSalida)}</span></td>
        <td>
          <span class="badge badge-${escapeHtml(item.estado)}">
            <span>${emojiEstado}</span>
            <span>${escapeHtml(item.estado)}</span>
          </span>
        </td>
        <td class="text-center">
          <button class="btn-delete" title="Eliminar este registro" onclick="eliminarRegistro('${item.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </td>
      `;

      tbodyAsistencia.appendChild(tr);
    });
  }

  conteoRegistros.textContent = `Mostrando ${registrosFiltrados.length} de ${registros.length} registro(s) en total ✨`;
  
  // Actualizar tarjeta del día siempre que se refresque la vista
  actualizarEstadisticas();
}

// ==========================================================================
// Manejo del Formulario (Requisito #1)
// ==========================================================================

function registrarAsistencia(e) {
  e.preventDefault();

  const nombre = inputNombre.value.trim();
  const fecha = inputFecha.value;
  const horaEntrada = inputHoraEntrada.value;
  const horaSalida = inputHoraSalida.value;
  const estado = selectEstado.value;

  // Validación de nombre obligatorio
  if (!nombre) {
    errorNombre.classList.add('visible');
    inputNombre.focus();
    return;
  }
  errorNombre.classList.remove('visible');

  // Si no hay fecha o entrada, completar con valores por defecto
  const fechaFinal = fecha || getFechaLocalActual();
  const horaEntradaFinal = horaEntrada || getHoraLocalActual();

  const nuevoRegistro = {
    id: 'asist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    nombre: nombre,
    fecha: fechaFinal,
    horaEntrada: horaEntradaFinal,
    horaSalida: horaSalida || '',
    estado: estado,
    creadoEn: new Date().toISOString()
  };

  // Agregar al inicio del arreglo para ver el más reciente arriba
  registros.unshift(nuevoRegistro);
  guardarEnStorage();
  renderTabla();

  // Resetear formulario conservando fecha y hora para fluidez
  inputNombre.value = '';
  inputHoraSalida.value = '';
  selectEstado.value = 'Presente';
  inputHoraEntrada.value = getHoraLocalActual();
  inputNombre.focus();

  mostrarToast(`✨ ¡Asistencia de "${nuevoRegistro.nombre}" guardada con éxito!`);
}

function resetFormulario() {
  inputNombre.value = '';
  inputFecha.value = getFechaLocalActual();
  inputHoraEntrada.value = getHoraLocalActual();
  inputHoraSalida.value = '';
  selectEstado.value = 'Presente';
  errorNombre.classList.remove('visible');
  inputNombre.focus();
}

// ==========================================================================
// Acciones de Registros (Eliminar, Limpiar, Cargar Demo)
// ==========================================================================

window.eliminarRegistro = function(id) {
  const index = registros.findIndex(r => r.id === id);
  if (index !== -1) {
    const alumnoNombre = registros[index].nombre;
    registros.splice(index, 1);
    guardarEnStorage();
    renderTabla();
    mostrarToast(`🗑️ Registro de "${alumnoNombre}" eliminado`);
  }
};

function borrarTodosLosRegistros() {
  if (registros.length === 0) {
    mostrarToast('🌸 No hay registros para eliminar');
    return;
  }

  const confirmar = window.confirm('¿Deseas vaciar la lista de asistencias por completo? Esta acción no se puede deshacer.');
  if (confirmar) {
    registros = [];
    guardarEnStorage();
    renderTabla();
    mostrarToast('🧸 Se han eliminado todos los registros');
  }
}

function cargarDatosDemo() {
  const hoyStr = getFechaLocalActual();

  const ejemplos = [
    {
      id: 'demo_1',
      nombre: 'Sofía Valenzuela Martínez',
      fecha: hoyStr,
      horaEntrada: '07:55',
      horaSalida: '14:00',
      estado: 'Presente'
    },
    {
      id: 'demo_2',
      nombre: 'Mateo Alejandro Morales',
      fecha: hoyStr,
      horaEntrada: '08:00',
      horaSalida: '',
      estado: 'Presente'
    },
    {
      id: 'demo_3',
      nombre: 'Camila Isabella Gómez',
      fecha: hoyStr,
      horaEntrada: '08:15',
      horaSalida: '',
      estado: 'Retardo'
    },
    {
      id: 'demo_4',
      nombre: 'Diego Fernando Ramírez',
      fecha: hoyStr,
      horaEntrada: '08:20',
      horaSalida: '',
      estado: 'Retardo'
    },
    {
      id: 'demo_5',
      nombre: 'Valentina Castillo Peña',
      fecha: hoyStr,
      horaEntrada: '',
      horaSalida: '',
      estado: 'Falta'
    },
    {
      id: 'demo_6',
      nombre: 'Santiago Javier Herrera',
      fecha: hoyStr,
      horaEntrada: '07:50',
      horaSalida: '14:05',
      estado: 'Presente'
    }
  ];

  registros = [...ejemplos, ...registros];
  guardarEnStorage();
  renderTabla();
  mostrarToast('🌷 ¡Ejemplos cargados correctamente!');
}

// ==========================================================================
// Inicialización
// ==========================================================================

function inicializarApp() {
  const hoy = getFechaLocalActual();
  const hora = getHoraLocalActual();

  inputFecha.value = hoy;
  inputHoraEntrada.value = hora;

  // Mostrar fecha en encabezado con estilo amigable
  const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaTexto = new Date().toLocaleDateString('es-ES', opcionesFecha);
  currentDateDisplay.textContent = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);

  // Cargar datos
  cargarDeStorage();

  // Si está vacío al inicio, cargar ejemplos
  if (registros.length === 0) {
    cargarDatosDemo();
  } else {
    renderTabla();
  }

  // Event Listeners
  formAsistencia.addEventListener('submit', registrarAsistencia);
  btnLimpiar.addEventListener('click', resetFormulario);

  filtroNombre.addEventListener('input', renderTabla);
  filtroEstado.addEventListener('change', renderTabla);
  filtroFecha.addEventListener('change', renderTabla);

  btnCargarDemo.addEventListener('click', cargarDatosDemo);
  btnBorrarTodo.addEventListener('click', borrarTodosLosRegistros);

  inputNombre.addEventListener('input', () => {
    if (inputNombre.value.trim().length > 0) {
      errorNombre.classList.remove('visible');
    }
  });
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarApp);
