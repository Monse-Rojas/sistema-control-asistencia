/**
 * Sistema de Control de Asistencia de Alumnos
 * Estilo Cute, Coqueto y Moderno 🌸✨
 * Desarrollado con JavaScript Vanilla y Supabase
 */

// ==========================================================================
// Configuración de Supabase
// ==========================================================================
const SUPABASE_URL = 'https://pvunuzruywavlyxrxibt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW51enJ1eXdhdmx5eHJ4aWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0ODI4ODcsImV4cCI6MjEwNDA1ODg4N30.GrB9OSA55UebDMRMUnL936nCeQGB3IC9VZxwWHG36k0';

// Cliente de Supabase
let supabaseClient = null;

function obtenerClienteSupabase() {
  if (!supabaseClient && typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
      console.warn('Aviso: no se pudo inicializar supabaseClient:', err);
    }
  }
  return supabaseClient;
}

// Inicialización inmediata
obtenerClienteSupabase();

// Lista oficial del grupo
const LISTA_ALUMNOS = [
  "Jefte Emaus Cervera Olmedo",
  "Paola Alexandra Contreras Sanchez",
  "Jose Luis Falcon Hernandez",
  "Mariana Iveth Garcia Lopez",
  "Manuel Esteban Garcia Rosendo",
  "Ali Emmanuel Gomez del Rivero",
  "Jesus Manuel Gomez Hernandez",
  "Ginger Dalay Hernandez Arias",
  "Adolfo Gabriel Kantun Chan",
  "Samir Avimael Malerva Canepa",
  "Kevin Alexander Mendez Cruz",
  "Elian Joseph Pech Laines",
  "Edwin Adalberto Quetz Alvarez",
  "Estefania Monserrat Rojas Zamudio",
  "Canek Abisaid Santiago Sequera"
];

// Estado de Supabase y aplicación
let supabaseDisponible = false;
let procesandoGuardado = false;
const STORAGE_KEY = 'asistencia_escolar_alumnos_v1';
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
let contenedorListaAlumnos = null;
let inputFechaGrupo = null;
let btnGuardarAsistenciaDia = null;
let btnMarcarPresentes = null;
let btnMarcarFaltas = null;

let tbodyAsistencia = null;
let emptyState = null;
let conteoRegistros = null;
let currentDateDisplay = null;
let syncStatusBadge = null;

let filtroNombre = null;
let filtroEstado = null;
let filtroFecha = null;

let cardTotalHoy = null;
let cardSubtextHoy = null;
let statPresentesHoy = null;
let statRetardosHoy = null;
let statFaltasHoy = null;

let btnBorrarTodo = null;
let toastNotification = null;
let toastMessage = null;

// ==========================================================================
// Utilidades de Fecha, Hora y Estilo
// ==========================================================================

function getFechaLocalActual() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getHoraLocalActual() {
  const ahora = new Date();
  const hours = String(ahora.getHours()).padStart(2, '0');
  const minutes = String(ahora.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '--/--/----';
  const partes = String(fechaStr).split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaStr;
}

function formatearHora(horaStr) {
  if (!horaStr) return '-';
  const [h, m] = String(horaStr).split(':');
  if (h === undefined || m === undefined) return horaStr;
  const numH = parseInt(h, 10);
  const ampm = numH >= 12 ? 'p.m.' : 'a.m.';
  const h12 = numH % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function obtenerIniciales(nombreCompleto) {
  if (!nombreCompleto) return 'AL';
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  if (partes.length === 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return (partes[0][0] + partes[2][0]).toUpperCase();
}

function getAvatarStyle(nombre) {
  const str = String(nombre || 'Alumno');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = PASTEL_AVATAR_PALETTE[Math.abs(hash) % PASTEL_AVATAR_PALETTE.length];
  return `background-color: ${color.bg}; color: ${color.text}; border: 1.5px solid ${color.bg};`;
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

let toastTimeout = null;
function mostrarToast(mensaje) {
  if (!toastNotification || !toastMessage) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.textContent = mensaje;
  toastNotification.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 3800);
}

function actualizarBadgeEstado(conectado) {
  if (!syncStatusBadge) return;
  if (conectado) {
    syncStatusBadge.className = 'sync-badge synced';
    syncStatusBadge.innerHTML = '☁️ Supabase Conectado';
    syncStatusBadge.title = 'Sincronizando en tiempo real con tu base de datos en la nube (Supabase)';
  } else {
    syncStatusBadge.className = 'sync-badge';
    syncStatusBadge.innerHTML = '💾 Modo Local Seguro';
    syncStatusBadge.title = 'Guardando permanentemente en LocalStorage.';
  }
}

// ==========================================================================
// Persistencia y Sincronización (Supabase + LocalStorage)
// ==========================================================================

function guardarEnStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  } catch (e) {
    console.error('Error al guardar en LocalStorage:', e);
  }
}

async function verificarConexionSupabase() {
  const client = obtenerClienteSupabase();
  if (!client) {
    actualizarBadgeEstado(false);
    return false;
  }

  try {
    const { data, error } = await client.from('asistencias').select('id').limit(1);
    if (!error) {
      supabaseDisponible = true;
      actualizarBadgeEstado(true);
      console.log('🌸 [Supabase]: Conexión exitosa y tabla "asistencias" lista.');
      return true;
    } else {
      supabaseDisponible = false;
      actualizarBadgeEstado(false);
      return false;
    }
  } catch (err) {
    supabaseDisponible = false;
    actualizarBadgeEstado(false);
    return false;
  }
}

async function cargarDeStorage() {
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

  renderTabla();

  const ok = await verificarConexionSupabase();
  if (ok) {
    const client = obtenerClienteSupabase();
    if (client) {
      try {
        const { data, error } = await client
          .from('asistencias')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          registros = data.map(item => ({
            id: item.id || ('asist_' + Date.now()),
            nombre: item.nombre || 'Sin nombre',
            fecha: item.fecha || getFechaLocalActual(),
            horaEntrada: item.hora_entrada || item.horaEntrada || '',
            horaSalida: item.hora_salida || item.horaSalida || '',
            estado: item.estado || 'Presente',
            creadoEn: item.created_at || item.creadoEn || new Date().toISOString()
          }));
          guardarEnStorage();
          renderTabla();
        }
      } catch (err) {
        console.info('Aviso al sincronizar de Supabase:', err);
      }
    }
  }
}

// ==========================================================================
// Renderizado de la Lista Fija del Grupo (Pase de Lista Rápido)
// ==========================================================================

function renderListaGrupo() {
  if (!contenedorListaAlumnos) return;
  contenedorListaAlumnos.innerHTML = '';

  LISTA_ALUMNOS.forEach((nombre, index) => {
    const iniciales = obtenerIniciales(nombre);
    const avatarStyle = getAvatarStyle(nombre);

    const studentCard = document.createElement('div');
    studentCard.className = 'student-row status-presente-row';
    studentCard.id = `student_row_${index}`;

    studentCard.innerHTML = `
      <div class="student-info">
        <span class="student-num">${index + 1}</span>
        <span class="student-avatar" style="${avatarStyle}">${escapeHtml(iniciales)}</span>
        <span class="student-name">${escapeHtml(nombre)}</span>
      </div>
      <div class="student-status">
        <select class="select-estado-alumno status-select-presente" data-index="${index}" id="select_estado_${index}">
          <option value="Presente" selected>✨ Presente</option>
          <option value="Retardo">⏳ Retardo</option>
          <option value="Falta">💤 Falta</option>
        </select>
      </div>
    `;

    contenedorListaAlumnos.appendChild(studentCard);

    // Event listener para cambiar el estilo visual según la opción
    const selectEl = studentCard.querySelector('select');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => actualizarEstiloSelector(e.target, studentCard));
    }
  });
}

function actualizarEstiloSelector(selectEl, rowEl) {
  const val = selectEl.value;
  selectEl.className = `select-estado-alumno status-select-${val.toLowerCase()}`;
  if (rowEl) {
    rowEl.className = `student-row status-${val.toLowerCase()}-row`;
  }
}

function marcarTodosComo(estado) {
  LISTA_ALUMNOS.forEach((_, index) => {
    const selectEl = document.getElementById(`select_estado_${index}`);
    const rowEl = document.getElementById(`student_row_${index}`);
    if (selectEl) {
      selectEl.value = estado;
      actualizarEstiloSelector(selectEl, rowEl);
    }
  });
  mostrarToast(`✨ Todos los alumnos marcados como ${estado}`);
}

// ==========================================================================
// Guardar Asistencia del Día a Supabase
// ==========================================================================

async function guardarAsistenciaDelDia() {
  if (procesandoGuardado) return;
  procesandoGuardado = true;

  if (btnGuardarAsistenciaDia) {
    btnGuardarAsistenciaDia.disabled = true;
    btnGuardarAsistenciaDia.innerHTML = '⏳ Guardando en Supabase...';
  }

  const fecha = inputFechaGrupo && inputFechaGrupo.value ? inputFechaGrupo.value : getFechaLocalActual();
  const hora = getHoraLocalActual();
  const nowIso = new Date().toISOString();

  const nuevosRegistros = [];
  const filasSupabase = [];

  LISTA_ALUMNOS.forEach((nombre, index) => {
    const selectEl = document.getElementById(`select_estado_${index}`);
    const estado = selectEl ? selectEl.value : 'Presente';
    const idUnico = 'asist_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substring(2, 6);

    const reg = {
      id: idUnico,
      nombre: nombre,
      fecha: fecha,
      horaEntrada: hora,
      horaSalida: '',
      estado: estado,
      creadoEn: nowIso
    };

    nuevosRegistros.push(reg);
    filasSupabase.push({
      id: idUnico,
      nombre: nombre,
      fecha: fecha,
      hora_entrada: hora,
      hora_salida: null,
      estado: estado,
      created_at: nowIso
    });
  });

  // 1. Guardado inmediato local
  registros.unshift(...nuevosRegistros);
  guardarEnStorage();
  renderTabla();

  // 2. Bulk insert en Supabase
  const client = obtenerClienteSupabase();
  if (client && supabaseDisponible) {
    try {
      const { data, error } = await client.from('asistencias').insert(filasSupabase);
      if (error) {
        console.error('❌ Error enviando lista a Supabase:', error.message);
        mostrarToast(`💾 Guardado localmente. (Error Supabase: ${error.message})`);
      } else {
        console.log('☁️ ¡Asistencia masiva guardada exitosamente en Supabase!');
        mostrarToast('✨ ¡Asistencia del día guardada exitosamente en Supabase!');
      }
    } catch (err) {
      console.error('❌ Error de red Supabase:', err);
      mostrarToast('💾 Guardado en LocalStorage');
    }
  } else {
    mostrarToast('✨ ¡Asistencia del día guardada localmente!');
  }

  setTimeout(() => {
    procesandoGuardado = false;
    if (btnGuardarAsistenciaDia) {
      btnGuardarAsistenciaDia.disabled = false;
      btnGuardarAsistenciaDia.innerHTML = '💖 Guardar Asistencia del Día';
    }
  }, 600);
}

// ==========================================================================
// Estadísticas del Día
// ==========================================================================

function actualizarEstadisticas() {
  if (!cardTotalHoy || !cardSubtextHoy) return;
  const hoyStr = getFechaLocalActual();

  const registrosHoy = registros.filter(r => r && r.fecha === hoyStr);

  let presentesHoy = 0;
  let retardosHoy = 0;
  let faltasHoy = 0;

  registrosHoy.forEach(r => {
    if (r.estado === 'Presente') presentesHoy++;
    else if (r.estado === 'Retardo') retardosHoy++;
    else if (r.estado === 'Falta') faltasHoy++;
  });

  const totalLlegaron = presentesHoy + retardosHoy;

  if (totalLlegaron === 1) {
    cardTotalHoy.textContent = `Hoy llegó 1 alumno`;
  } else {
    cardTotalHoy.textContent = `Hoy llegaron ${totalLlegaron} alumnos`;
  }

  cardSubtextHoy.textContent = `🌸 ${presentesHoy} puntual(es), ⏳ ${retardosHoy} con retardo. (${registrosHoy.length} registrados hoy)`;

  if (statPresentesHoy) statPresentesHoy.textContent = presentesHoy;
  if (statRetardosHoy) statRetardosHoy.textContent = retardosHoy;
  if (statFaltasHoy) statFaltasHoy.textContent = faltasHoy;
}

// ==========================================================================
// Tabla de Historial
// ==========================================================================

function renderTabla() {
  if (!tbodyAsistencia) return;

  const busqueda = filtroNombre ? filtroNombre.value.trim().toLowerCase() : '';
  const estadoFiltro = filtroEstado ? filtroEstado.value : 'todos';
  const fechaFiltro = filtroFecha ? filtroFecha.value : 'todos';
  const hoyStr = getFechaLocalActual();

  const registrosFiltrados = registros.filter(r => {
    if (!r) return false;
    const nombre = String(r.nombre || '').toLowerCase();
    const coincideNombre = nombre.includes(busqueda);
    const coincideEstado = estadoFiltro === 'todos' || r.estado === estadoFiltro;
    const coincideFecha = fechaFiltro === 'todos' || (fechaFiltro === 'hoy' && r.fecha === hoyStr);
    return coincideNombre && coincideEstado && coincideFecha;
  });

  tbodyAsistencia.innerHTML = '';

  if (registrosFiltrados.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
  } else {
    if (emptyState) emptyState.classList.add('hidden');

    registrosFiltrados.forEach((item, index) => {
      const tr = document.createElement('tr');

      const nombreLimpio = String(item.nombre || 'Alumno');
      const iniciales = obtenerIniciales(nombreLimpio);
      const avatarStyle = getAvatarStyle(nombreLimpio);

      let emojiEstado = '✨';
      if (item.estado === 'Retardo') emojiEstado = '⏳';
      else if (item.estado === 'Falta') emojiEstado = '💤';

      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700;">${index + 1}</td>
        <td>
          <div class="student-name">
            <span class="student-avatar" style="${avatarStyle}">${escapeHtml(iniciales)}</span>
            <span>${escapeHtml(nombreLimpio)}</span>
          </div>
        </td>
        <td><span style="font-weight: 600; color: #574b66;">${formatearFecha(item.fecha)}</span></td>
        <td><span class="time-text">${formatearHora(item.horaEntrada)}</span></td>
        <td>
          <span class="badge badge-${escapeHtml(item.estado || 'Presente')}">
            <span>${emojiEstado}</span>
            <span>${escapeHtml(item.estado || 'Presente')}</span>
          </span>
        </td>
        <td class="text-center">
          <button class="btn-delete" type="button" title="Eliminar este registro" onclick="eliminarRegistro('${item.id}')">
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

  if (conteoRegistros) {
    conteoRegistros.textContent = `Mostrando ${registrosFiltrados.length} de ${registros.length} registro(s) guardado(s) ✨`;
  }

  actualizarEstadisticas();
}

window.eliminarRegistro = function(id) {
  const index = registros.findIndex(r => r.id === id);
  if (index !== -1) {
    const alumnoNombre = registros[index].nombre;
    registros.splice(index, 1);
    guardarEnStorage();
    renderTabla();
    mostrarToast(`🗑️ Registro de "${alumnoNombre}" eliminado`);

    const client = obtenerClienteSupabase();
    if (client && supabaseDisponible) {
      client.from('asistencias').delete().eq('id', id).then(() => {}).catch(() => {});
    }
  }
};

function borrarTodosLosRegistros() {
  if (registros.length === 0) {
    mostrarToast('🌸 No hay registros para eliminar');
    return;
  }

  const confirmar = window.confirm('¿Deseas vaciar la lista de asistencias guardadas? Esta acción no se puede deshacer.');
  if (confirmar) {
    registros = [];
    guardarEnStorage();
    renderTabla();
    mostrarToast('🧸 Se han eliminado todos los registros guardados');

    const client = obtenerClienteSupabase();
    if (client && supabaseDisponible) {
      client.from('asistencias').delete().neq('id', '0').then(() => {}).catch(() => {});
    }
  }
}

// ==========================================================================
// Inicialización
// ==========================================================================

function inicializarApp() {
  console.log('🌸 Inicializando Sistema de Control de Asistencia del Grupo...');

  contenedorListaAlumnos = document.getElementById('contenedorListaAlumnos');
  inputFechaGrupo = document.getElementById('inputFechaGrupo');
  btnGuardarAsistenciaDia = document.getElementById('btnGuardarAsistenciaDia');
  btnMarcarPresentes = document.getElementById('btnMarcarPresentes');
  btnMarcarFaltas = document.getElementById('btnMarcarFaltas');

  tbodyAsistencia = document.getElementById('tbodyAsistencia');
  emptyState = document.getElementById('emptyState');
  conteoRegistros = document.getElementById('conteoRegistros');
  currentDateDisplay = document.getElementById('currentDateDisplay');
  syncStatusBadge = document.getElementById('syncStatusBadge');

  filtroNombre = document.getElementById('filtroNombre');
  filtroEstado = document.getElementById('filtroEstado');
  filtroFecha = document.getElementById('filtroFecha');

  cardTotalHoy = document.getElementById('cardTotalHoy');
  cardSubtextHoy = document.getElementById('cardSubtextHoy');
  statPresentesHoy = document.getElementById('statPresentesHoy');
  statRetardosHoy = document.getElementById('statRetardosHoy');
  statFaltasHoy = document.getElementById('statFaltasHoy');

  btnBorrarTodo = document.getElementById('btnBorrarTodo');
  toastNotification = document.getElementById('toastNotification');
  toastMessage = document.getElementById('toastMessage');

  const hoy = getFechaLocalActual();
  if (inputFechaGrupo) inputFechaGrupo.value = hoy;

  if (currentDateDisplay) {
    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaTexto = new Date().toLocaleDateString('es-ES', opcionesFecha);
    currentDateDisplay.textContent = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
  }

  // Renderizar la lista fija del grupo de 15 alumnos
  renderListaGrupo();

  // Escuchadores de eventos
  if (btnGuardarAsistenciaDia) {
    btnGuardarAsistenciaDia.addEventListener('click', guardarAsistenciaDelDia);
  }

  if (btnMarcarPresentes) {
    btnMarcarPresentes.addEventListener('click', () => marcarTodosComo('Presente'));
  }

  if (btnMarcarFaltas) {
    btnMarcarFaltas.addEventListener('click', () => marcarTodosComo('Falta'));
  }

  if (filtroNombre) filtroNombre.addEventListener('input', renderTabla);
  if (filtroEstado) filtroEstado.addEventListener('change', renderTabla);
  if (filtroFecha) filtroFecha.addEventListener('change', renderTabla);

  if (btnBorrarTodo) btnBorrarTodo.addEventListener('click', borrarTodosLosRegistros);

  // Cargar datos guardados previamente
  cargarDeStorage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
  inicializarApp();
}
