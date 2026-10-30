<?php

require_once __DIR__ . '/comun.php';
$usuarioActual = exigir_login();

const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta'];

switch (metodo()) {
    case 'GET':
        $sql = 'SELECT p.id_pago, p.monto, p.fecha_hora_pago, p.metodo_pago, p.id_reserva,
                       cp.id_comprobante, cp.ruta_archivo_digital,
                       r.id_usuario AS id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
                       c.nombre_identificador AS cabana
                FROM pago p
                JOIN reserva r ON r.id_reserva = p.id_reserva
                JOIN usuario u ON u.id_usuario = r.id_usuario
                JOIN cabana c ON c.id_cabana = r.id_cabana
                LEFT JOIN comprobante cp ON cp.id_pago = p.id_pago
                WHERE 1 = 1';
        $p = [];
        if (!es_encargada($usuarioActual)) {
            $sql .= ' AND r.id_usuario = ?';
            $p[] = $usuarioActual['id_usuario'];
        }
        if (!empty($_GET['id_reserva'])) {
            $sql .= ' AND p.id_reserva = ?';
            $p[] = $_GET['id_reserva'];
        }

        foreach (['desde', 'hasta'] as $f) {
            if (!empty($_GET[$f]) && !es_fecha($_GET[$f])) {
                fallar("La fecha \"$f\" debe tener el formato AAAA-MM-DD.");
            }
        }
        if (!empty($_GET['desde'])) {
            $sql .= ' AND p.fecha_hora_pago >= ?';
            $p[] = $_GET['desde'] . ' 00:00:00';
        }
        if (!empty($_GET['hasta'])) {
            $sql .= ' AND p.fecha_hora_pago < ?';
            $p[] = (new DateTime($_GET['hasta']))->modify('+1 day')->format('Y-m-d') . ' 00:00:00';
        }
        if (!empty($_GET['metodo_pago'])) {
            $sql .= ' AND p.metodo_pago = ?';
            $p[] = $_GET['metodo_pago'];
        }
        responder(consulta($pdo, $sql . ' ORDER BY p.fecha_hora_pago, p.id_pago', $p)->fetchAll());

    case 'POST':
        exigir_encargada();
        $d = entrada();
        exigir_campos($d, ['id_reserva', 'monto', 'metodo_pago']);
        if (filter_var($d['monto'], FILTER_VALIDATE_INT) === false || $d['monto'] <= 0) {
            fallar('El monto debe ser un número entero mayor a 0.');
        }
        if (!in_array($d['metodo_pago'], METODOS, true)) {
            fallar('El método de pago debe ser: ' . implode(', ', METODOS) . '.');
        }
        $r = consulta($pdo, 'SELECT r.estado, r.fecha_ingreso, r.fecha_egreso, c.precio_por_noche
                             FROM reserva r JOIN cabana c ON c.id_cabana = r.id_cabana
                             WHERE r.id_reserva = ?', [$d['id_reserva']])->fetch();
        if (!$r) fallar('La reserva no existe.', 404);
        if ($r['estado'] === 'Cancelada') fallar('No se puede registrar un pago en una reserva cancelada.', 409);

        $total = noches($r['fecha_ingreso'], $r['fecha_egreso']) * (int)$r['precio_por_noche'];
        $pagado = (int)consulta($pdo, 'SELECT COALESCE(SUM(monto), 0) FROM pago WHERE id_reserva = ?', [$d['id_reserva']])->fetchColumn();
        if ($pagado + $d['monto'] > $total) {
            fallar('El pago supera el total de la reserva. Saldo pendiente: $' . ($total - $pagado) . '.', 409);
        }

        $pdo->beginTransaction();
        try {
            consulta($pdo, 'INSERT INTO pago (monto, fecha_hora_pago, metodo_pago, id_reserva) VALUES (?, ?, ?, ?)',
                [$d['monto'], date('Y-m-d H:i:s'), $d['metodo_pago'], $d['id_reserva']]);
            $idPago = (int)$pdo->lastInsertId();

            $ruta = sprintf('comprobantes/%s/comprobante_%04d.pdf', date('Y/m'), $idPago);
            consulta($pdo, 'INSERT INTO comprobante (ruta_archivo_digital, fecha_carga, id_pago) VALUES (?, ?, ?)',
                [$ruta, date('Y-m-d'), $idPago]);
            $idComprobante = (int)$pdo->lastInsertId();

            if ($r['estado'] === 'Pendiente') {
                consulta($pdo, "UPDATE reserva SET estado = 'Confirmada' WHERE id_reserva = ?", [$d['id_reserva']]);
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        responder(['id_pago' => $idPago, 'id_comprobante' => $idComprobante, 'ruta_archivo_digital' => $ruta,
                   'total_reserva' => $total, 'total_pagado' => $pagado + (int)$d['monto'],
                   'saldo' => $total - $pagado - (int)$d['monto'],
                   'estado_reserva' => $r['estado'] === 'Pendiente' ? 'Confirmada' : $r['estado']], 201);

    default:
        metodo_no_permitido();
}
