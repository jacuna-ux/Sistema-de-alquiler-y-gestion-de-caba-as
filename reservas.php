<?php

require_once __DIR__ . '/comun.php';
$usuarioActual = exigir_login();
$esEncargada = es_encargada($usuarioActual);

const SELECT_RESERVA = 'SELECT r.id_reserva, r.fecha_ingreso, r.fecha_egreso, r.estado,
        r.id_usuario AS id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.dni AS cliente_dni,
        r.id_cabana, c.nombre_identificador AS cabana, c.precio_por_noche
    FROM reserva r
    JOIN usuario u ON u.id_usuario = r.id_usuario
    JOIN cabana c ON c.id_cabana = r.id_cabana';

function con_total($r)
{
    $r['noches'] = noches($r['fecha_ingreso'], $r['fecha_egreso']);
    $r['total'] = $r['noches'] * (int)$r['precio_por_noche'];
    return $r;
}

function validar_fechas($ingreso, $egreso)
{
    if (!es_fecha($ingreso) || !es_fecha($egreso)) {
        fallar('Las fechas deben tener el formato AAAA-MM-DD.');
    }
    if ($egreso <= $ingreso) {
        fallar('La fecha de egreso debe ser posterior a la de ingreso.');
    }
}

function buscar_superposicion($pdo, $id_cabana, $ingreso, $egreso, $excluir = 0)
{
    return consulta($pdo, "SELECT r.fecha_ingreso, r.fecha_egreso, c.nombre_identificador
        FROM reserva r JOIN cabana c ON c.id_cabana = r.id_cabana
        WHERE r.id_cabana = ? AND r.estado IN ('Pendiente', 'Confirmada')
          AND r.fecha_ingreso < ? AND r.fecha_egreso > ? AND r.id_reserva <> ?
        ORDER BY r.fecha_ingreso LIMIT 1", [$id_cabana, $egreso, $ingreso, $excluir])->fetch();
}

function avisar_superposicion($s)
{
    fallar($s['nombre_identificador'] . ' está reservada del ' . fecha_ar($s['fecha_ingreso']) .
        ' al ' . fecha_ar($s['fecha_egreso']) . '. Elegí otras fechas.', 409);
}

$id = id_param();
switch (metodo()) {
    case 'GET':
        if ($id) {
            $r = consulta($pdo, SELECT_RESERVA . ' WHERE r.id_reserva = ?', [$id])->fetch();
            if (!$r || (!$esEncargada && (int)$r['id_cliente'] !== (int)$usuarioActual['id_usuario'])) {
                fallar('La reserva no existe.', 404);
            }
            responder(con_total($r));
        }
        if (!$esEncargada) {
            $_GET['id_cliente'] = $usuarioActual['id_usuario'];
        }
        $where = [];
        $p = [];
        foreach (['estado' => 'r.estado = ?', 'id_cabana' => 'r.id_cabana = ?', 'id_cliente' => 'r.id_usuario = ?'] as $k => $cond) {
            if (!empty($_GET[$k])) { $where[] = $cond; $p[] = $_GET[$k]; }
        }
        if (!empty($_GET['desde'])) { $where[] = 'r.fecha_egreso > ?'; $p[] = $_GET['desde']; }
        if (!empty($_GET['hasta'])) { $where[] = 'r.fecha_ingreso <= ?'; $p[] = $_GET['hasta']; }
        $sql = SELECT_RESERVA . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY r.fecha_ingreso, r.id_reserva';
        responder(array_map('con_total', consulta($pdo, $sql, $p)->fetchAll()));

    case 'POST':
        $d = entrada();
        if (!$esEncargada) {
            $d['id_cliente'] = $usuarioActual['id_usuario'];
        }
        exigir_campos($d, ['id_cliente', 'id_cabana', 'fecha_ingreso', 'fecha_egreso']);
        validar_fechas($d['fecha_ingreso'], $d['fecha_egreso']);
        if (!consulta($pdo, 'SELECT 1 FROM usuario WHERE id_usuario = ? AND id_rol = ?', [$d['id_cliente'], ROL_CLIENTE])->fetch()) {
            fallar('El cliente no existe.', 404);
        }
        if (!consulta($pdo, 'SELECT 1 FROM cabana WHERE id_cabana = ?', [$d['id_cabana']])->fetch()) {
            fallar('La cabaña no existe.', 404);
        }
        if ($s = buscar_superposicion($pdo, $d['id_cabana'], $d['fecha_ingreso'], $d['fecha_egreso'])) {
            avisar_superposicion($s);
        }
        consulta($pdo, "INSERT INTO reserva (fecha_ingreso, fecha_egreso, estado, id_usuario, id_cabana) VALUES (?, ?, 'Pendiente', ?, ?)",
            [$d['fecha_ingreso'], $d['fecha_egreso'], $d['id_cliente'], $d['id_cabana']]);
        $nueva = (int)$pdo->lastInsertId();
        $r = consulta($pdo, SELECT_RESERVA . ' WHERE r.id_reserva = ?', [$nueva])->fetch();
        responder(con_total($r), 201);

    case 'PUT':
        if (!$id) fallar('Falta el id de la reserva.');
        $actual = consulta($pdo, 'SELECT * FROM reserva WHERE id_reserva = ?', [$id])->fetch();
        if (!$actual || (!$esEncargada && (int)$actual['id_usuario'] !== (int)$usuarioActual['id_usuario'])) {
            fallar('La reserva no existe.', 404);
        }
        $d = entrada();

        if (isset($d['accion'])) {
            if ($d['accion'] === 'cancelar' && in_array($actual['estado'], ['Pendiente', 'Confirmada'])) {
                $nuevo = 'Cancelada';
            } elseif ($d['accion'] === 'finalizar' && $actual['estado'] === 'Confirmada') {
                $nuevo = 'Finalizada';
            } else {
                fallar('No se puede aplicar "' . $d['accion'] . '" a una reserva ' . $actual['estado'] . '.', 409);
            }
            consulta($pdo, 'UPDATE reserva SET estado = ? WHERE id_reserva = ?', [$nuevo, $id]);
            responder(['id_reserva' => $id, 'estado' => $nuevo]);
        }

        if (!in_array($actual['estado'], ['Pendiente', 'Confirmada'])) {
            fallar('Una reserva ' . $actual['estado'] . ' no se puede modificar.', 409);
        }
        $ingreso = $d['fecha_ingreso'] ?? $actual['fecha_ingreso'];
        $egreso = $d['fecha_egreso'] ?? $actual['fecha_egreso'];
        $cabana = $d['id_cabana'] ?? $actual['id_cabana'];
        validar_fechas($ingreso, $egreso);
        if (!consulta($pdo, 'SELECT 1 FROM cabana WHERE id_cabana = ?', [$cabana])->fetch()) {
            fallar('La cabaña no existe.', 404);
        }
        if ($s = buscar_superposicion($pdo, $cabana, $ingreso, $egreso, $id)) {
            avisar_superposicion($s);
        }
        consulta($pdo, 'UPDATE reserva SET fecha_ingreso = ?, fecha_egreso = ?, id_cabana = ? WHERE id_reserva = ?', [$ingreso, $egreso, $cabana, $id]);
        responder(con_total(consulta($pdo, SELECT_RESERVA . ' WHERE r.id_reserva = ?', [$id])->fetch()));

    default:
        metodo_no_permitido();
}
