const API = 'api/';

async function llamar(archivo, metodo = 'GET', cuerpo = null, params = {}) {
  const query = new URLSearchParams(params).toString();
  const opciones = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (cuerpo) opciones.body = JSON.stringify(cuerpo);

  const respuesta = await fetch(API + archivo + (query ? '?' + query : ''), opciones);
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'Error en la API');
  return datos;
}

const api = {

  login: (nombre_usuario, contrasena) => llamar('login.php', 'POST', { nombre_usuario, contrasena }),
  sesion: () => llamar('login.php'),
  logout: () => llamar('login.php', 'DELETE'),

  registro: (datos) => llamar('registro.php', 'POST', datos),

  cabanas: () => llamar('cabanas.php'),
  cabana: (id) => llamar('cabanas.php', 'GET', null, { id }),
  crearCabana: (datos) => llamar('cabanas.php', 'POST', datos),
  modificarCabana: (id, datos) => llamar('cabanas.php', 'PUT', datos, { id }),
  eliminarCabana: (id) => llamar('cabanas.php', 'DELETE', null, { id }),

  clientes: () => llamar('clientes.php'),
  clientePorDni: (dni) => llamar('clientes.php', 'GET', null, { dni }),
  crearCliente: (datos) => llamar('clientes.php', 'POST', datos),
  modificarCliente: (id, datos) => llamar('clientes.php', 'PUT', datos, { id }),
  eliminarCliente: (id) => llamar('clientes.php', 'DELETE', null, { id }),

  reservas: (filtros = {}) => llamar('reservas.php', 'GET', null, filtros),
  crearReserva: (datos) => llamar('reservas.php', 'POST', datos),
  modificarReserva: (id, datos) => llamar('reservas.php', 'PUT', datos, { id }),
  cancelarReserva: (id) => llamar('reservas.php', 'PUT', { accion: 'cancelar' }, { id }),

  disponibilidad: (ingreso, egreso) => llamar('disponibilidad.php', 'GET', null, { ingreso, egreso }),

  pagos: (filtros = {}) => llamar('pagos.php', 'GET', null, filtros),
  registrarPago: (id_reserva, monto, metodo_pago) => llamar('pagos.php', 'POST', { id_reserva, monto, metodo_pago }),
  comprobante: (id) => llamar('comprobantes.php', 'GET', null, { id }),

  reporte: (desde, hasta) => llamar('reportes.php', 'GET', null, { desde, hasta }),
};
