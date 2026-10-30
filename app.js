const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pesos = (n) => '$ ' + Number(n).toLocaleString('es-AR');
const fechaAR = (f) => (f ? f.slice(0, 10).split('-').reverse().join('/') : '');
const aIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sumarDias = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return aIso(d); };
const hoyIso = () => aIso(new Date());
const cantNoches = (i, e) => Math.round((new Date(e + 'T00:00:00') - new Date(i + 'T00:00:00')) / 86400000);
const pad = (n, largo) => String(n).padStart(largo, '0');

const CLASE_ESTADO = { Pendiente: 'insignia_amarilla', Confirmada: 'insignia_verde', Finalizada: 'insignia_gris', Cancelada: 'insignia_roja' };
const insignia = (estado) => `<span class="insignia ${CLASE_ESTADO[estado] || ''}">${esc(estado)}</span>`;

function mostrarError(id, mensaje) {
  const e = $(id);
  e.textContent = mensaje;
  e.classList.remove('oculto');
}
function limpiarError(id) { $(id).classList.add('oculto'); }

let temporizadorAviso;
function avisar(texto) {
  const a = $('aviso');
  a.textContent = texto;
  a.classList.remove('oculto');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => a.classList.add('oculto'), 4000);
}

function manejarError(e) {
  if (/iniciar sesión/i.test(e.message)) { pantallaDeIngreso(); return; }
  avisar(e.message);
}

function filaVacia(columnas, texto) {
  return `<tr><td colspan="${columnas}" class="celda_vacia">${esc(texto)}</td></tr>`;
}

let usuario = null;
let esEncargada = false;
let cabanas = [];

function irALogin(registro) {
  document.body.classList.add('en_login');
  alternarRegistro(registro);
  window.scrollTo(0, 0);
}

function volverAInicio() {
  document.body.classList.remove('en_login');
}

function irAInicio(idDestino) {
  volverAInicio();
  setTimeout(() => {
    if (idDestino === 'pantalla_inicio') window.scrollTo({ top: 0, behavior: 'smooth' });
    else $(idDestino).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function mostrarCatalogoInicio() {
  $('inicio_grilla_cabanas').innerHTML = cabanas
    .map((c) => tarjetaCabana(c, `<button class="boton_ver" data-accion="abrirModal" data-id="${c.id_cabana}">Ver</button>`)).join('');
}

function pantallaDeIngreso() {
  usuario = null;
  document.body.classList.remove('en_login');
  document.body.classList.add('sin_sesion');
  $('navegacion_cliente').classList.add('oculto');
  $('navegacion_encargado').classList.add('oculto');
  document.querySelectorAll('.seccion_contenido').forEach((s) => s.classList.add('oculto'));
}

function entrar(u) {
  usuario = u;
  esEncargada = u.nombre_rol === 'Encargada';
  document.body.classList.remove('sin_sesion');
  $('texto_usuario').textContent = `${u.nombre} ${u.apellido} · ${u.nombre_rol}`;
  $('navegacion_cliente').classList.toggle('oculto', esEncargada);
  $('navegacion_encargado').classList.toggle('oculto', !esEncargada);
  const nav = esEncargada ? $('navegacion_encargado') : $('navegacion_cliente');
  mostrarSeccion(esEncargada ? 'encargado_seccion_inicio' : 'cliente_seccion_inicio', nav.querySelector('.boton_menu'));
}

async function enviarLogin(e) {
  e.preventDefault();
  limpiarError('login_error');
  try {
    entrar(await api.login($('login_usuario').value.trim(), $('login_clave').value));
    $('login_clave').value = '';
  } catch (err) { mostrarError('login_error', err.message); }
}

function alternarRegistro(mostrar) {
  $('form_login').classList.toggle('oculto', mostrar);
  $('form_registro').classList.toggle('oculto', !mostrar);
  $('login_titulo').textContent = mostrar ? 'Crear cuenta de cliente' : 'Ingresar';
  limpiarError('login_error');
  limpiarError('registro_error');
}

async function enviarRegistro(e) {
  e.preventDefault();
  limpiarError('registro_error');
  try {
    const u = await api.registro({
      nombre: $('reg_nombre').value.trim(), apellido: $('reg_apellido').value.trim(),
      dni: $('reg_dni').value.trim(), telefono: $('reg_telefono').value.trim(),
      email: $('reg_email').value.trim(), nombre_usuario: $('reg_usuario').value.trim(),
      contrasena: $('reg_clave').value,
    });
    $('form_registro').reset();
    alternarRegistro(false);
    entrar(u);
  } catch (err) { mostrarError('registro_error', err.message); }
}

async function cerrarSesion() {
  try { await api.logout(); } catch (e) {   }
  pantallaDeIngreso();
}

function mostrarSeccion(idSeccion, botonPresionado) {
  const secciones = document.querySelectorAll('.seccion_contenido');
  secciones.forEach((sec) => { sec.classList.add('oculto'); sec.classList.remove('activo'); });

  const destino = $(idSeccion);
  if (destino) { destino.classList.remove('oculto'); destino.classList.add('activo'); }

  const menu = botonPresionado.closest('.barra_navegacion');
  menu.querySelectorAll('.boton_menu').forEach((b) => b.classList.remove('activo'));
  botonPresionado.classList.add('activo');

  if (CARGADORES[idSeccion]) CARGADORES[idSeccion]().catch(manejarError);
}

function irA(menuId, indice) {
  const botones = $(menuId).querySelectorAll('.boton_menu');
  botones[indice].click();
}

async function traerCabanas() {
  cabanas = await api.cabanas();
  return cabanas;
}

function resumen(texto, largo = 110) {
  texto = texto || '';
  return texto.length > largo ? texto.slice(0, largo).trim() + '…' : texto;
}

function tarjetaCabana(c, extra = '') {
  return `<div class="tarjeta_cabana">
    <div class="imagen_ejemplo">Foto de la cabaña</div>
    <div class="cuerpo_tarjeta">
      <h3 class="titulo_cabana">${esc(c.nombre_identificador)}</h3>
      <p class="datos_cabana">Hasta ${esc(c.capacidad_maxima)} personas · ${pesos(c.precio_por_noche)} por noche</p>
      <p class="texto_ejemplo">${esc(resumen(c.descripcion_equipamiento))}</p>
      ${extra}
    </div>
  </div>`;
}

async function cargarClienteInicio() {
  await traerCabanas();
  $('cliente_grilla_cabanas').innerHTML = cabanas
    .map((c) => tarjetaCabana(c, `<button class="boton_ver" data-accion="abrirModal" data-id="${c.id_cabana}">Ver</button>`)).join('');
}

async function cargarClienteCabanas() {
  if (!$('disp_ingreso').value) {
    $('disp_ingreso').value = hoyIso();
    $('disp_egreso').value = sumarDias(hoyIso(), 3);
  }
  await consultarDisponibilidad();
}

async function consultarDisponibilidad() {
  limpiarError('disp_error');
  const ingreso = $('disp_ingreso').value;
  const egreso = $('disp_egreso').value;
  await traerCabanas();
  let r;
  try { r = await api.disponibilidad(ingreso, egreso); } catch (e) { mostrarError('disp_error', e.message); return; }
  const ocupadas = new Map(r.ocupadas.map((c) => [c.id_cabana, c.reservas]));
  $('cliente_disponibilidad').innerHTML = cabanas.map((c) => {
    if (ocupadas.has(c.id_cabana)) {
      const rangos = ocupadas.get(c.id_cabana).map((x) => `${fechaAR(x.fecha_ingreso)} al ${fechaAR(x.fecha_egreso)}`).join(', ');
      return tarjetaCabana(c, `<p class="aviso_ocupada"><span class="insignia insignia_roja">Ocupada</span> Reservada: ${esc(rangos)}</p>
        <button class="boton_ver" data-accion="abrirModal" data-id="${c.id_cabana}">Ver</button>`);
    }
    return tarjetaCabana(c, `<p class="aviso_ocupada"><span class="insignia insignia_verde">Disponible</span> ${r.noches} noches: ${pesos(r.noches * c.precio_por_noche)}</p>
      <button class="boton_ver" data-accion="abrirModal" data-id="${c.id_cabana}" data-ingreso="${ingreso}" data-egreso="${egreso}">Ver y reservar</button>`);
  }).join('');
}

function buscarDisponibilidad(e) {
  e.preventDefault();
  consultarDisponibilidad().catch(manejarError);
}

async function cargarMisReservas() {
  const filas = await api.reservas();
  $('cliente_tabla_reservas').innerHTML = filas.length ? filas.map((r) => `<tr>
      <td>#${esc(r.id_reserva)}</td>
      <td>${esc(r.cabana)}</td>
      <td>${fechaAR(r.fecha_ingreso)}</td>
      <td>${fechaAR(r.fecha_egreso)}</td>
      <td>${pesos(r.total)}</td>
      <td>${insignia(r.estado)}</td>
      <td>${['Pendiente', 'Confirmada'].includes(r.estado)
        ? `<button class="boton_secundario boton_chico" data-accion="cancelarReserva" data-id="${r.id_reserva}">Cancelar</button>` : ''}</td>
    </tr>`).join('') : filaVacia(7, 'Todavía no tenés reservas. Elegí una cabaña en Inicio.');
}

async function cargarMisPagos() {
  const filas = await api.pagos();
  $('cliente_tabla_pagos').innerHTML = filas.length ? filas.map((p) => `<tr>
      <td>#COMP-${pad(p.id_comprobante, 4)}</td>
      <td>Pago de la reserva #${esc(p.id_reserva)} · ${esc(p.cabana)}</td>
      <td>${pesos(p.monto)}</td>
      <td>${fechaAR(p.fecha_hora_pago)}</td>
    </tr>`).join('') : filaVacia(4, 'Todavía no hay pagos registrados a tu nombre.');
}

async function cancelarReserva(id) {
  if (!confirm(`¿Cancelar la reserva #${id}?`)) return;
  try {
    await api.cancelarReserva(id);
    avisar(`Reserva #${id} cancelada.`);
    const recarga = CARGADORES[esEncargada ? 'encargado_seccion_reservas' : 'cliente_seccion_mis_reservas'];
    await recarga();
  } catch (e) { manejarError(e); }
}

let cabanaModal = null;

function abrirModal(id, ingreso, egreso) {
  cabanaModal = cabanas.find((c) => c.id_cabana === id);
  if (!cabanaModal) return;
  $('modal_titulo').textContent = cabanaModal.nombre_identificador;
  $('modal_datos').textContent = `Hasta ${cabanaModal.capacidad_maxima} personas · ${pesos(cabanaModal.precio_por_noche)} por noche`;
  $('modal_descripcion').textContent = cabanaModal.descripcion_equipamiento || '';
  $('modal_ingreso').min = $('modal_egreso').min = hoyIso();
  $('modal_ingreso').value = ingreso || '';
  $('modal_egreso').value = egreso || '';
  limpiarError('modal_error');
  $('modal_reservar').textContent = usuario ? 'Reservar' : 'Ingresar para reservar';
  actualizarTotalModal();
  $('modal_ejemplo').classList.remove('oculto');
}

function cerrarModal() { $('modal_ejemplo').classList.add('oculto'); }

function actualizarTotalModal() {
  const i = $('modal_ingreso').value;
  const e = $('modal_egreso').value;
  const n = i && e ? cantNoches(i, e) : 0;
  $('modal_total').textContent = n > 0 ? `${n} noche${n > 1 ? 's' : ''} · total estimado ${pesos(n * cabanaModal.precio_por_noche)}` : 'Elegí las fechas para ver el total.';
}

async function reservarDesdeModal() {
  limpiarError('modal_error');
  if (!usuario) {
    cerrarModal();
    irALogin(false);
    avisar('Ingresá o creá tu cuenta para poder reservar.');
    return;
  }
  try {
    const r = await api.crearReserva({
      id_cabana: cabanaModal.id_cabana,
      fecha_ingreso: $('modal_ingreso').value, fecha_egreso: $('modal_egreso').value,
    });
    cerrarModal();
    avisar(`Reserva #${r.id_reserva} creada. Queda pendiente hasta que se pague la seña.`);
    irA('navegacion_cliente', 2);
  } catch (e) { mostrarError('modal_error', e.message); }
}

let reservasCache = [];
let clientesCache = [];

async function cargarEncargadaInicio() {
  const hoy = hoyIso();
  const [disp, reservas, pagos] = await Promise.all([api.disponibilidad(hoy, sumarDias(hoy, 1)), api.reservas(), api.pagos()]);
  $('metrica_ocupadas').textContent = `${disp.ocupadas.length} / ${disp.ocupadas.length + disp.libres.length}`;
  $('metrica_reservas').textContent = reservas.length;
  $('metrica_pendientes').textContent = reservas.filter((r) => r.estado === 'Pendiente').length;
  $('metrica_pagos').textContent = pesos(pagos.reduce((s, p) => s + p.monto, 0));
}

function botonesReserva(r) {
  const vigente = ['Pendiente', 'Confirmada'].includes(r.estado);
  if (!vigente) return '';
  return `<button class="boton_secundario boton_chico" data-accion="abrirPago" data-id="${r.id_reserva}">Cobrar</button>
    <button class="boton_secundario boton_chico" data-accion="abrirCambioFechas" data-id="${r.id_reserva}">Fechas</button>
    ${r.estado === 'Confirmada' ? `<button class="boton_secundario boton_chico" data-accion="finalizarReserva" data-id="${r.id_reserva}">Finalizar</button>` : ''}
    <button class="boton_peligro boton_chico" data-accion="cancelarReserva" data-id="${r.id_reserva}">Cancelar</button>`;
}

function filtrosReservas() {
  const f = {};
  if ($('fr_estado').value) f.estado = $('fr_estado').value;
  if ($('fr_cabana').value) f.id_cabana = $('fr_cabana').value;
  if ($('fr_desde').value) f.desde = $('fr_desde').value;
  if ($('fr_hasta').value) f.hasta = $('fr_hasta').value;
  return f;
}

function filtrarReservas(e) {
  e.preventDefault();
  cargarEncargadaReservas().catch(manejarError);
}

function limpiarFiltroReservas() {
  $('form_filtro_reservas').reset();
  cargarEncargadaReservas().catch(manejarError);
}

async function cargarEncargadaReservas() {
  const [reservas, clientes, cab] = await Promise.all([api.reservas(filtrosReservas()), api.clientes(), traerCabanas()]);
  const selF = $('fr_cabana').value;
  $('fr_cabana').innerHTML = '<option value="">Todas</option>' +
    cab.map((c) => `<option value="${c.id_cabana}">${esc(c.nombre_identificador)}</option>`).join('');
  $('fr_cabana').value = selF;
  const activas = reservas.filter((r) => r.estado !== 'Cancelada');
  $('fr_resumen').textContent = `${reservas.length} reserva${reservas.length === 1 ? '' : 's'} · total de las no canceladas: ${pesos(activas.reduce((s, r) => s + r.total, 0))}`;
  reservasCache = reservas;
  const selC = $('nr_cliente').value;
  const selB = $('nr_cabana').value;
  $('nr_cliente').innerHTML = clientes.length
    ? clientes.map((c) => `<option value="${c.id_cliente}">${esc(c.apellido)}, ${esc(c.nombre)}</option>`).join('')
    : '<option value="">No hay clientes: cargalos en la sección Clientes</option>';
  $('nr_cabana').innerHTML = cab.map((c) => `<option value="${c.id_cabana}">${esc(c.nombre_identificador)}</option>`).join('');
  if (selC) $('nr_cliente').value = selC;
  if (selB) $('nr_cabana').value = selB;
  $('nr_ingreso').min = $('nr_egreso').min = hoyIso();
  $('encargado_tabla_reservas').innerHTML = reservas.length ? reservas.map((r) => `<tr>
      <td>#RES-${pad(r.id_reserva, 2)}</td>
      <td>${esc(r.cliente_apellido)}, ${esc(r.cliente_nombre)}</td>
      <td>${esc(r.cabana)}</td>
      <td>${fechaAR(r.fecha_ingreso)}</td>
      <td>${fechaAR(r.fecha_egreso)}</td>
      <td>${pesos(r.total)}</td>
      <td>${insignia(r.estado)}</td>
      <td class="celda_acciones">${botonesReserva(r)}</td>
    </tr>`).join('') : filaVacia(8, 'No hay reservas registradas.');
}

async function crearReservaEncargada(e) {
  e.preventDefault();
  limpiarError('nr_error');
  try {
    const r = await api.crearReserva({
      id_cliente: Number($('nr_cliente').value), id_cabana: Number($('nr_cabana').value),
      fecha_ingreso: $('nr_ingreso').value, fecha_egreso: $('nr_egreso').value,
    });
    avisar(`Reserva #${r.id_reserva} creada (${pesos(r.total)}).`);
    await cargarEncargadaReservas();
  } catch (err) { mostrarError('nr_error', err.message); }
}

async function finalizarReserva(id) {
  try {
    await api.modificarReserva(id, { accion: 'finalizar' });
    avisar(`Reserva #${id} finalizada.`);
    await cargarEncargadaReservas();
  } catch (e) { manejarError(e); }
}

function abrirModalForm(titulo, cuerpoHtml, alConfirmar) {
  $('mf_titulo').textContent = titulo;
  $('mf_cuerpo').innerHTML = cuerpoHtml;
  limpiarError('mf_error');
  $('mf_confirmar').onclick = async () => {
    try { await alConfirmar(); cerrarModalForm(); } catch (e) { mostrarError('mf_error', e.message); }
  };
  $('modal_form').classList.remove('oculto');
}
function cerrarModalForm() { $('modal_form').classList.add('oculto'); }

async function abrirPago(id) {
  const r = reservasCache.find((x) => x.id_reserva === id);
  const pagos = await api.pagos({ id_reserva: id });
  const pagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = r.total - pagado;
  abrirModalForm(`Cobrar reserva #${id}`, `
    <p class="modal_datos">${esc(r.cliente_apellido)}, ${esc(r.cliente_nombre)} · ${esc(r.cabana)}<br>
      Total ${pesos(r.total)} · Pagado ${pesos(pagado)} · <strong>Saldo ${pesos(saldo)}</strong></p>
    <div class="fila_campos">
      <div class="campo_grupo"><label for="pg_monto">Monto ($)</label><input id="pg_monto" type="number" min="1" max="${saldo}" value="${saldo}" class="campo_entrada"></div>
      <div class="campo_grupo"><label for="pg_metodo">Método</label>
        <select id="pg_metodo" class="campo_entrada"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select></div>
    </div>`, async () => {
    const p = await api.registrarPago(id, Number($('pg_monto').value), $('pg_metodo').value);
    avisar(`Pago registrado. Comprobante #COMP-${pad(p.id_comprobante, 4)}. Reserva ${p.estado_reserva}.`);
    await cargarEncargadaReservas();
  });
}

function abrirCambioFechas(id) {
  const r = reservasCache.find((x) => x.id_reserva === id);
  abrirModalForm(`Cambiar fechas de la reserva #${id}`, `
    <p class="modal_datos">${esc(r.cabana)} · ${esc(r.cliente_apellido)}, ${esc(r.cliente_nombre)}</p>
    <div class="fila_campos">
      <div class="campo_grupo"><label for="cf_ingreso">Ingreso</label><input id="cf_ingreso" type="date" value="${r.fecha_ingreso}" class="campo_entrada"></div>
      <div class="campo_grupo"><label for="cf_egreso">Egreso</label><input id="cf_egreso" type="date" value="${r.fecha_egreso}" class="campo_entrada"></div>
    </div>`, async () => {
    await api.modificarReserva(id, { fecha_ingreso: $('cf_ingreso').value, fecha_egreso: $('cf_egreso').value });
    avisar(`Fechas de la reserva #${id} actualizadas.`);
    await cargarEncargadaReservas();
  });
}

async function cargarEncargadaClientes() {
  const [clientes, reservas] = await Promise.all([api.clientes(), api.reservas()]);
  clientesCache = clientes;
  const cuenta = {};
  reservas.forEach((r) => { cuenta[r.id_cliente] = (cuenta[r.id_cliente] || 0) + 1; });
  $('encargado_tabla_clientes').innerHTML = clientes.length ? clientes.map((c) => `<tr>
      <td>${esc(c.apellido)}, ${esc(c.nombre)}</td>
      <td>${esc(c.dni)}</td>
      <td>${esc(c.telefono || '-')}</td>
      <td>${esc(c.email || '-')}</td>
      <td>${cuenta[c.id_cliente] || 0}</td>
      <td class="celda_acciones">
        <button class="boton_secundario boton_chico" data-accion="editarCliente" data-id="${c.id_cliente}">Editar</button>
        <button class="boton_peligro boton_chico" data-accion="eliminarCliente" data-id="${c.id_cliente}">Eliminar</button>
      </td>
    </tr>`).join('') : filaVacia(6, 'No hay clientes registrados.');
}

function limpiarFormCliente() {
  $('form_cliente').reset();
  $('cli_id').value = '';
  $('cli_form_titulo').textContent = 'Nuevo cliente';
  $('cli_cancelar').classList.add('oculto');
  limpiarError('cli_error');
}

function editarCliente(id) {
  const c = clientesCache.find((x) => x.id_cliente === id);
  $('cli_id').value = id;
  $('cli_nombre').value = c.nombre;
  $('cli_apellido').value = c.apellido;
  $('cli_dni').value = c.dni;
  $('cli_telefono').value = c.telefono || '';
  $('cli_email').value = c.email || '';
  $('cli_clave').value = '';
  $('cli_form_titulo').textContent = `Modificar cliente #${id}`;
  $('cli_cancelar').classList.remove('oculto');
  $('form_cliente').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function guardarCliente(e) {
  e.preventDefault();
  limpiarError('cli_error');
  const datos = {
    nombre: $('cli_nombre').value.trim(), apellido: $('cli_apellido').value.trim(), dni: $('cli_dni').value.trim(),
    telefono: $('cli_telefono').value.trim(), email: $('cli_email').value.trim(),
  };
  if ($('cli_clave').value) datos.contrasena = $('cli_clave').value;
  try {
    const id = $('cli_id').value;
    if (id) await api.modificarCliente(id, datos); else await api.crearCliente(datos);
    avisar(id ? 'Cliente modificado.' : 'Cliente registrado.');
    limpiarFormCliente();
    await cargarEncargadaClientes();
  } catch (err) { mostrarError('cli_error', err.message); }
}

async function eliminarCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  try { await api.eliminarCliente(id); avisar('Cliente eliminado.'); await cargarEncargadaClientes(); } catch (e) { manejarError(e); }
}

async function cargarEncargadaCabanas() {
  const hoy = hoyIso();
  const [lista, disp] = await Promise.all([traerCabanas(), api.disponibilidad(hoy, sumarDias(hoy, 1))]);
  const ocupadas = new Set(disp.ocupadas.map((c) => c.id_cabana));
  $('encargado_tabla_cabanas').innerHTML = lista.length ? lista.map((c) => `<tr>
      <td>${esc(c.nombre_identificador)}</td>
      <td>${esc(c.capacidad_maxima)} personas</td>
      <td>${pesos(c.precio_por_noche)}</td>
      <td>${ocupadas.has(c.id_cabana) ? '<span class="insignia insignia_roja">Ocupada</span>' : '<span class="insignia insignia_verde">Disponible</span>'}</td>
      <td class="celda_acciones">
        <button class="boton_secundario boton_chico" data-accion="editarCabana" data-id="${c.id_cabana}">Editar</button>
        <button class="boton_peligro boton_chico" data-accion="eliminarCabana" data-id="${c.id_cabana}">Eliminar</button>
      </td>
    </tr>`).join('') : filaVacia(5, 'No hay cabañas cargadas.');
}

function limpiarFormCabana() {
  $('form_cabana').reset();
  $('cab_id').value = '';
  $('cab_form_titulo').textContent = 'Nueva cabaña';
  $('cab_cancelar').classList.add('oculto');
  limpiarError('cab_error');
}

function editarCabana(id) {
  const c = cabanas.find((x) => x.id_cabana === id);
  $('cab_id').value = id;
  $('cab_nombre').value = c.nombre_identificador;
  $('cab_capacidad').value = c.capacidad_maxima;
  $('cab_precio').value = c.precio_por_noche;
  $('cab_descripcion').value = c.descripcion_equipamiento || '';
  $('cab_form_titulo').textContent = `Modificar cabaña #${id}`;
  $('cab_cancelar').classList.remove('oculto');
  $('form_cabana').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function guardarCabana(e) {
  e.preventDefault();
  limpiarError('cab_error');
  const datos = {
    nombre_identificador: $('cab_nombre').value.trim(), capacidad_maxima: Number($('cab_capacidad').value),
    precio_por_noche: Number($('cab_precio').value), descripcion_equipamiento: $('cab_descripcion').value.trim(),
  };
  try {
    const id = $('cab_id').value;
    if (id) await api.modificarCabana(id, datos); else await api.crearCabana(datos);
    avisar(id ? 'Cabaña modificada.' : 'Cabaña creada.');
    limpiarFormCabana();
    await cargarEncargadaCabanas();
  } catch (err) { mostrarError('cab_error', err.message); }
}

async function eliminarCabana(id) {
  if (!confirm('¿Eliminar esta cabaña?')) return;
  try { await api.eliminarCabana(id); avisar('Cabaña eliminada.'); await cargarEncargadaCabanas(); } catch (e) { manejarError(e); }
}

function filtrarPagos(e) {
  e.preventDefault();
  cargarEncargadaPagos().catch(manejarError);
}

function limpiarFiltroPagos() {
  $('form_filtro_pagos').reset();
  cargarEncargadaPagos().catch(manejarError);
}

async function cargarEncargadaPagos() {
  limpiarError('fp_error');
  const filtros = {};
  if ($('fp_desde').value) filtros.desde = $('fp_desde').value;
  if ($('fp_hasta').value) filtros.hasta = $('fp_hasta').value;
  if ($('fp_metodo').value) filtros.metodo_pago = $('fp_metodo').value;
  let pagos;
  try { pagos = await api.pagos(filtros); } catch (e) { mostrarError('fp_error', e.message); return; }
  const porMetodo = { Efectivo: 0, Transferencia: 0, Tarjeta: 0 };
  pagos.forEach((p) => { porMetodo[p.metodo_pago] = (porMetodo[p.metodo_pago] || 0) + p.monto; });
  $('pagos_resumen').innerHTML = `
    <div class="tarjeta_metrica"><h4>Pagos en el filtro</h4><p class="valor_metrica">${pagos.length}</p></div>
    <div class="tarjeta_metrica"><h4>Total cobrado</h4><p class="valor_metrica">${pesos(pagos.reduce((s, p) => s + p.monto, 0))}</p></div>
    ${Object.entries(porMetodo).map(([m, v]) => `<div class="tarjeta_metrica"><h4>${esc(m)}</h4><p class="valor_metrica">${pesos(v)}</p></div>`).join('')}`;
  $('encargado_tabla_pagos').innerHTML = pagos.length ? pagos.map((p) => `<tr>
      <td>#PAG-${pad(p.id_pago, 3)}</td>
      <td>#RES-${pad(p.id_reserva, 2)}</td>
      <td>${esc(p.cliente_apellido)}, ${esc(p.cliente_nombre)}</td>
      <td>${pesos(p.monto)}</td>
      <td>${esc(p.metodo_pago)}</td>
      <td>${fechaAR(p.fecha_hora_pago)}</td>
      <td>#COMP-${pad(p.id_comprobante, 4)}</td>
    </tr>`).join('') : filaVacia(7, 'No hay pagos registrados.');
}

async function cargarEncargadaReportes() {
  if (!$('rep_desde').value) {
    const hoy = new Date();
    $('rep_desde').value = aIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    $('rep_hasta').value = aIso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
  }
  await armarReporte();
}

async function armarReporte() {
  limpiarError('rep_error');
  let r;
  try { r = await api.reporte($('rep_desde').value, $('rep_hasta').value); } catch (e) { mostrarError('rep_error', e.message); return; }
  $('reporte_resultado').innerHTML = `
    <div class="grilla_metricas separado_abajo">
      <div class="tarjeta_metrica"><h4>Ocupación general</h4><p class="valor_metrica">${r.ocupacion_general_pct}%</p></div>
      <div class="tarjeta_metrica"><h4>Noches ocupadas</h4><p class="valor_metrica">${r.total_noches_ocupadas}</p></div>
      <div class="tarjeta_metrica"><h4>Ingresos del período</h4><p class="valor_metrica">${pesos(r.total_ingresos)}</p></div>
    </div>
    <div class="caja_tabla"><table class="tabla_ejemplo">
      <thead><tr><th>Cabaña</th><th>Noches ocupadas</th><th>Ocupación</th><th>Ingresos</th></tr></thead>
      <tbody>${r.cabanas.map((c) => `<tr><td>${esc(c.cabana)}</td><td>${c.noches_ocupadas} de ${r.dias_periodo}</td><td>${c.ocupacion_pct}%</td><td>${pesos(c.ingresos)}</td></tr>`).join('')}</tbody>
    </table></div>`;
}

function generarReporte(e) {
  e.preventDefault();
  armarReporte().catch(manejarError);
}

const CARGADORES = {
  cliente_seccion_inicio: cargarClienteInicio,
  cliente_seccion_cabanas: cargarClienteCabanas,
  cliente_seccion_mis_reservas: cargarMisReservas,
  cliente_seccion_mis_pagos: cargarMisPagos,
  encargado_seccion_inicio: cargarEncargadaInicio,
  encargado_seccion_reservas: cargarEncargadaReservas,
  encargado_seccion_clientes: cargarEncargadaClientes,
  encargado_seccion_cabanas: cargarEncargadaCabanas,
  encargado_seccion_pagos: cargarEncargadaPagos,
  encargado_seccion_reportes: cargarEncargadaReportes,
};

traerCabanas().then(mostrarCatalogoInicio).catch(() => {});
function enviarContacto() {
  avisar('Gracias por tu consulta.');
}

const ACCIONES = {
  mostrarSeccion: (d, el) => mostrarSeccion(d.seccion, el),
  irAInicio: (d) => irAInicio(d.destino),
  irALogin: (d) => irALogin(d.registro === 'true'),
  alternarRegistro: (d) => alternarRegistro(d.registro === 'true'),
  cerrarSesion: () => cerrarSesion(),
  volverAInicio: () => volverAInicio(),
  enviarContacto: () => enviarContacto(),
  limpiarFormCliente: () => limpiarFormCliente(),
  limpiarFormCabana: () => limpiarFormCabana(),
  limpiarFiltroReservas: () => limpiarFiltroReservas(),
  limpiarFiltroPagos: () => limpiarFiltroPagos(),
  cerrarModal: () => cerrarModal(),
  cerrarModalForm: () => cerrarModalForm(),
  reservarDesdeModal: () => reservarDesdeModal(),
  abrirModal: (d) => abrirModal(Number(d.id), d.ingreso, d.egreso),
  cancelarReserva: (d) => cancelarReserva(Number(d.id)),
  abrirPago: (d) => abrirPago(Number(d.id)),
  abrirCambioFechas: (d) => abrirCambioFechas(Number(d.id)),
  finalizarReserva: (d) => finalizarReserva(Number(d.id)),
  editarCliente: (d) => editarCliente(Number(d.id)),
  eliminarCliente: (d) => eliminarCliente(Number(d.id)),
  editarCabana: (d) => editarCabana(Number(d.id)),
  eliminarCabana: (d) => eliminarCabana(Number(d.id)),
};

const ENVIOS = {
  enviarLogin, enviarRegistro, buscarDisponibilidad, crearReservaEncargada,
  filtrarReservas, guardarCliente, guardarCabana, generarReporte, filtrarPagos,
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-accion]');
  if (el && ACCIONES[el.dataset.accion]) ACCIONES[el.dataset.accion](el.dataset, el);
});

document.addEventListener('submit', (e) => {
  const envio = ENVIOS[e.target.dataset.envio];
  if (envio) envio(e);
});

$('modal_ingreso').addEventListener('change', actualizarTotalModal);
$('modal_egreso').addEventListener('change', actualizarTotalModal);

api.sesion().then(entrar).catch(pantallaDeIngreso);
