<?php

require_once __DIR__ . '/comun.php';
$usuarioActual = exigir_login();
$soloMios = es_encargada($usuarioActual) ? '' : ' AND r.id_usuario = ' . (int)$usuarioActual['id_usuario'];
if (metodo() !== 'GET') metodo_no_permitido();

$sql = 'SELECT cp.id_comprobante, cp.ruta_archivo_digital, cp.fecha_carga,
               p.id_pago, p.monto, p.fecha_hora_pago, p.metodo_pago,
               r.id_reserva, r.fecha_ingreso, r.fecha_egreso,
               u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.dni AS cliente_dni,
               c.nombre_identificador AS cabana
        FROM comprobante cp
        JOIN pago p ON p.id_pago = cp.id_pago
        JOIN reserva r ON r.id_reserva = p.id_reserva
        JOIN usuario u ON u.id_usuario = r.id_usuario
        JOIN cabana c ON c.id_cabana = r.id_cabana';

if ($id = id_param()) {
    $x = consulta($pdo, $sql . ' WHERE cp.id_comprobante = ?' . $soloMios, [$id])->fetch();
    $x ? responder($x) : fallar('El comprobante no existe.', 404);
}
if (!empty($_GET['id_pago'])) {
    responder(consulta($pdo, $sql . ' WHERE cp.id_pago = ?' . $soloMios, [$_GET['id_pago']])->fetchAll());
}
responder(consulta($pdo, $sql . ' WHERE 1 = 1' . $soloMios . ' ORDER BY cp.id_comprobante')->fetchAll());
