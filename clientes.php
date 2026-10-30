<?php

require_once __DIR__ . '/comun.php';
exigir_encargada();

const CAMPOS_CLIENTE = 'id_usuario AS id_cliente, nombre, apellido, dni, telefono, email';
$id = id_param();

switch (metodo()) {
    case 'GET':
        if ($id) {
            $c = consulta($pdo, 'SELECT ' . CAMPOS_CLIENTE . ' FROM usuario WHERE id_usuario = ? AND id_rol = ?', [$id, ROL_CLIENTE])->fetch();
            $c ? responder($c) : fallar('El cliente no existe.', 404);
        }
        if (!empty($_GET['dni'])) {
            $c = consulta($pdo, 'SELECT ' . CAMPOS_CLIENTE . ' FROM usuario WHERE dni = ? AND id_rol = ?', [$_GET['dni'], ROL_CLIENTE])->fetch();
            $c ? responder($c) : fallar('No hay un cliente con ese DNI.', 404);
        }
        responder(consulta($pdo, 'SELECT ' . CAMPOS_CLIENTE . ' FROM usuario WHERE id_rol = ? ORDER BY apellido, nombre', [ROL_CLIENTE])->fetchAll());

    case 'POST':
        $nuevo = crear_cliente($pdo, entrada());
        responder(['id_cliente' => $nuevo, 'mensaje' => 'Cliente registrado.'], 201);

    case 'PUT':
        if (!$id) fallar('Falta el id del cliente.');
        $d = entrada();
        validar_cliente($d);
        if (!consulta($pdo, 'SELECT 1 FROM usuario WHERE id_usuario = ? AND id_rol = ?', [$id, ROL_CLIENTE])->fetch()) {
            fallar('El cliente no existe.', 404);
        }
        if (consulta($pdo, 'SELECT 1 FROM usuario WHERE dni = ? AND id_usuario <> ?', [$d['dni'], $id])->fetch()) {
            fallar('Ese DNI ya pertenece a otra persona.', 409);
        }
        consulta($pdo, 'UPDATE usuario SET nombre = ?, apellido = ?, dni = ?, telefono = ?, email = ? WHERE id_usuario = ?',
            [$d['nombre'], $d['apellido'], $d['dni'], $d['telefono'] ?? null, $d['email'] ?? null, $id]);
        if (!empty($d['contrasena'])) {
            consulta($pdo, 'UPDATE usuario SET contrasena_encriptada = ? WHERE id_usuario = ?', [hash('sha256', $d['contrasena']), $id]);
        }
        responder(['mensaje' => 'Cliente modificado.']);

    case 'DELETE':
        if (!$id) fallar('Falta el id del cliente.');
        if (consulta($pdo, 'SELECT 1 FROM reserva WHERE id_usuario = ?', [$id])->fetch()) {
            fallar('No se puede eliminar: el cliente tiene reservas registradas.', 409);
        }
        $st = consulta($pdo, 'DELETE FROM usuario WHERE id_usuario = ? AND id_rol = ?', [$id, ROL_CLIENTE]);
        $st->rowCount() ? responder(['mensaje' => 'Cliente eliminado.']) : fallar('El cliente no existe.', 404);

    default:
        metodo_no_permitido();
}
