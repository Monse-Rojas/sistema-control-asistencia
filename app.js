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

// Cliente de Supabase (usamos 'supabaseClient' para no colisionar con la variable global 'supabase' de la librería)
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

// Intentar inicialización inmediata
obtenerClienteSupabase();

// Bandera para verificar si la tabla 'asistencias' está disponible en Supabase
let supabaseDisponible = false;

// Evitar doble registro simultáneo por clic y submit
let procesandoRegistro = false;

// Clave para almacenamiento en LocalStorage (respaldo y modo offline permanente)
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

// Elementos del DOM (se resuelven de forma segura en inicializarApp)
let formAsistencia = null;
let btnGuardar = null;
let inputNombre = null;
let inputFecha = null;
let inputHoraEntrada = null;
let inputHoraSalida = null;
let selectEstado = null;
let errorNombre = null;
let btnLimpiar = null;

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

let btnCargarDemo = null;
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
  }, 3500);
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
    console.info('ℹ️ Supabase JS SDK cargando o no disponible, operando en modo local.');
    actualizarBadgeEstado(false);
    return false;
  }

  try {
    const { data, error } = await client.from('asistencias').select('id').limit(1);

    if (!error) {
      supabaseDisponible = true;
      actualizarBadgeEstado(true);
      console.log('🌸 [Supabase]: Conexión exitosa y tabla "asistencias" operativa.');
      return true;
    } else {
      supabaseDisponible = false;
      actualizarBadgeEstado(false);
      console.info('ℹ️ [Supabase Info]:', error.message);
      return false;
    }
  } catch (err) {
    console.warn('ℹ️ [Supabase Catch]:', err);
    supabaseDisponible = false;
    actualizarBadgeEstado(false);
    return false;
  }
}

async function cargarDeStorage() {
  // 1. Carga inmediata de LocalStorage para visualización sin retraso
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

  // 2. Verificar disponibilidad de Supabase y sincronizar si hay datos en la nube
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
          console.log(`☁️ ${data.length} registro(s) sincronizados desde Supabase.`);
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
        } else if (registros.length === 0) {
          cargarDatosDemo();
        }
      } catch (err) {
        console.info('Aviso al sincronizar registros de Supabase:', err);
      }
    }
  } else if (registros.length === 0) {
    cargarDatosDemo();
  }
}

// ==========================================================================
// Cálculo de Estadísticas del Día (Requisito #3)
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
// Renderizado de la Tabla (Requisito #2)
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
      const iniciales = nombreLimpio
        .split(' ')
        .filter(n => n.length > 0)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('');

      const avatarStyle = getAvatarStyle(nombreLimpio);

      let emojiEstado = '✨';
      if (item.estado === 'Retardo') emojiEstado = '⏳';
      else if (item.estado === 'Falta') emojiEstado = '💤';

      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700;">${index + 1}</td>
        <td>
          <div class="student-name">
            <span class="student-avatar" style="${avatarStyle}">${escapeHtml(iniciales || 'A')}</span>
            <span>${escapeHtml(nombreLimpio)}</span>
          </div>
        </td>
        <td><span style="font-weight: 600; color: #574b66;">${formatearFecha(item.fecha)}</span></td>
        <td><span class="time-text">${formatearHora(item.horaEntrada)}</span></td>
        <td><span class="time-text">${formatearHora(item.horaSalida)}</span></td>
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
    conteoRegistros.textContent = `Mostrando ${registrosFiltrados.length} de ${registros.length} registro(s) en total ✨`;
  }
  
  actualizarEstadisticas();
}

// ==========================================================================
// Manejo del Formulario (Requisito #1)
// ==========================================================================

function registrarAsistencia(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (procesandoRegistro) return;
  procesandoRegistro = true;
  setTimeout(() => { procesandoRegistro = false; }, 400);

  console.log('🌸 [Evento Guardar]: Leyendo datos del formulario...');

  const elNombre = document.getElementById('inputNombre');
  const elFecha = document.getElementById('inputFecha');
  const elHoraEntrada = document.getElementById('inputHoraEntrada');
  const elHoraSalida = document.getElementById('inputHoraSalida');
  const elEstado = document.getElementById('selectEstado');
  const elErrorNombre = document.getElementById('errorNombre');

  const nombre = elNombre ? elNombre.value.trim() : '';
  const fecha = (elFecha && elFecha.value) ? elFecha.value : getFechaLocalActual();
  const horaEntrada = (elHoraEntrada && elHoraEntrada.value) ? elHoraEntrada.value : getHoraLocalActual();
  const horaSalida = elHoraSalida ? elHoraSalida.value.trim() : '';
  const estado = elEstado ? elEstado.value : 'Presente';

  if (!nombre) {
    console.warn('⚠️ Validación: El nombre del alumno está vacío.');
    if (elErrorNombre) elErrorNombre.classList.add('visible');
    if (elNombre) elNombre.focus();
    mostrarToast('⚠️ Por favor ingresa el nombre del alumno');
    return;
  }
  if (elErrorNombre) elErrorNombre.classList.remove('visible');

  const nuevoRegistro = {
    id: 'asist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    nombre: nombre,
    fecha: fecha,
    horaEntrada: horaEntrada,
    horaSalida: horaSalida || '',
    estado: estado,
    creadoEn: new Date().toISOString()
  };

  console.log('📝 Datos listos para guardar:', nuevoRegistro);

  // 1. Guardar de inmediato en memoria y LocalStorage
  registros.unshift(nuevoRegistro);
  guardarEnStorage();
  renderTabla();

  // 2. Si Supabase está conectado, guardar en la nube
  const client = obtenerClienteSupabase();
  if (client && supabaseDisponible) {
    console.log('☁️ Enviando registro a Supabase (asistencias)...');
    client
      .from('asistencias')
      .insert([{
        id: nuevoRegistro.id,
        nombre: nuevoRegistro.nombre,
        fecha: nuevoRegistro.fecha,
        hora_entrada: nuevoRegistro.horaEntrada,
        hora_salida: nuevoRegistro.horaSalida || null,
        estado: nuevoRegistro.estado,
        created_at: nuevoRegistro.creadoEn
      }])
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Error Supabase al guardar:', error.message);
          mostrarToast(`💾 Guardado localmente. (Supabase aviso: ${error.message})`);
        } else {
          console.log('☁️ ¡Guardado exitoso en Supabase!');
        }
      })
      .catch(err => {
        console.error('❌ Error de red Supabase:', err);
      });
  }

  // 3. Resetear formulario conservando fecha y hora para agilidad
  if (elNombre) elNombre.value = '';
  if (elHoraSalida) elHoraSalida.value = '';
  if (elEstado) elEstado.value = 'Presente';
  if (elHoraEntrada) elHoraEntrada.value = getHoraLocalActual();
  if (elNombre) elNombre.focus();

  mostrarToast(`✨ ¡Asistencia de "${nuevoRegistro.nombre}" guardada con éxito!`);
}

function resetFormulario() {
  const elNombre = document.getElementById('inputNombre');
  const elFecha = document.getElementById('inputFecha');
  const elHoraEntrada = document.getElementById('inputHoraEntrada');
  const elHoraSalida = document.getElementById('inputHoraSalida');
  const elEstado = document.getElementById('selectEstado');
  const elErrorNombre = document.getElementById('errorNombre');

  if (elNombre) elNombre.value = '';
  if (elFecha) elFecha.value = getFechaLocalActual();
  if (elHoraEntrada) elHoraEntrada.value = getHoraLocalActual();
  if (elHoraSalida) elHoraSalida.value = '';
  if (elEstado) elEstado.value = 'Presente';
  if (elErrorNombre) elErrorNombre.classList.remove('visible');
  if (elNombre) elNombre.focus();
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

  const confirmar = window.confirm('¿Deseas vaciar la lista de asistencias por completo? Esta acción no se puede deshacer.');
  if (confirmar) {
    registros = [];
    guardarEnStorage();
    renderTabla();
    mostrarToast('🧸 Se han eliminado todos los registros');

    const client = obtenerClienteSupabase();
    if (client && supabaseDisponible) {
      client.from('asistencias').delete().neq('id', '0').then(() => {}).catch(() => {});
    }
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
// Inicialización Segura
// ==========================================================================

function inicializarApp() {
  console.log('🌸 Inicializando Sistema de Control de Asistencia...');

  formAsistencia = document.getElementById('formAsistencia');
  btnGuardar = document.getElementById('btnGuardar');
  inputNombre = document.getElementById('inputNombre');
  inputFecha = document.getElementById('inputFecha');
  inputHoraEntrada = document.getElementById('inputHoraEntrada');
  inputHoraSalida = document.getElementById('inputHoraSalida');
  selectEstado = document.getElementById('selectEstado');
  errorNombre = document.getElementById('errorNombre');
  btnLimpiar = document.getElementById('btnLimpiar');

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

  btnCargarDemo = document.getElementById('btnCargarDemo');
  btnBorrarTodo = document.getElementById('btnBorrarTodo');
  toastNotification = document.getElementById('toastNotification');
  toastMessage = document.getElementById('toastMessage');

  const hoy = getFechaLocalActual();
  const hora = getHoraLocalActual();

  if (inputFecha) inputFecha.value = hoy;
  if (inputHoraEntrada) inputHoraEntrada.value = hora;

  if (currentDateDisplay) {
    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaTexto = new Date().toLocaleDateString('es-ES', opcionesFecha);
    currentDateDisplay.textContent = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
  }

  if (formAsistencia) {
    formAsistencia.addEventListener('submit', registrarAsistencia);
  }

  if (btnGuardar) {
    btnGuardar.addEventListener('click', registrarAsistencia);
    console.log('✅ Event listener asignado directamente a btnGuardar');
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', resetFormulario);
  }

  if (filtroNombre) filtroNombre.addEventListener('input', renderTabla);
  if (filtroEstado) filtroEstado.addEventListener('change', renderTabla);
  if (filtroFecha) filtroFecha.addEventListener('change', renderTabla);

  if (btnCargarDemo) btnCargarDemo.addEventListener('click', cargarDatosDemo);
  if (btnBorrarTodo) btnBorrarTodo.addEventListener('click', borrarTodosLosRegistros);

  if (inputNombre) {
    inputNombre.addEventListener('input', () => {
      if (errorNombre && inputNombre.value.trim().length > 0) {
        errorNombre.classList.remove('visible');
      }
    });
  }

  cargarDeStorage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
  inicializarApp();
}
