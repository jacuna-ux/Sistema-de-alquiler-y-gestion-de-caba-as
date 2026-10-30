<?php

require_once __DIR__ . '/comun.php';

function validar_cabana($d)
{
    exigir_campos($d, ['nombre_identificador', 'capacidad_maxima', 'precio_por_noche']);
    if (filter_var($d['capacidad_maxima'], FILTER_VALIDATE_INT) === false || $d['capacidad_maxima'] < 1) {
        fallar('La capacidad máxima debe ser un número entero mayor a 0.');
    }
    if (filter_var($d['precio_por_noche'], FILTER_VALIDATE_INT) === false || $d['precio_por_noche'] < 0) {
        fallar('El precio por noche debe ser un número entero, sin negativos.');
    }
}

$id = id_param();
switch (metodo()) {
    case 'GET':
        if ($id) {
            $c = consulta($pdo, 'SELECT * FROM cabana WHERE id_cabana = ?', [$id])->fetch();
            $c ? responder($c) : fallar('La cabaña no existe.', 404);
        }
        responder(consulta($pdo, 'SELECT * FROM cabana ORDER BY id_cabana')->fetchAll());

    case 'POST':
        exigir_encargada();
        $d = entrada();
        validar_cabana($d);
        if (consulta($pdo, 'SELECT 1 FROM cabana WHERE nombre_identificador = ?', [$d['nombre_identificador']])->fetch()) {
            fallar('Ya existe una cabaña con ese nombre.', 409);
        }
        consulta($pdo, 'INSERT INTO cabana (nombre_identificador, capacidad_maxima, descripcion_equipamiento, precio_por_noche)
                        VALUES (?, ?, ?, ?)',
            [$d['nombre_identificador'], $d['capacidad_maxima'], $d['descripcion_equipamiento'] ?? null, $d['precio_por_noche']]);
        responder(['id_cabana' => (int)$pdo->lastInsertId(), 'mensaje' => 'Cabaña creada.'], 201);

    case 'PUT':
        exigir_encargada();
        if (!$id) fallar('Falta el id de la cabaña.');
        $d = entrada();
        validar_cabana($d);
        if (!consulta($pdo, 'SELECT 1 FROM cabana WHERE id_cabana = ?', [$id])->fetch()) {
            fallar('La cabaña no existe.', 404);
        }
        if (consulta($pdo, 'SELECT 1 FROM cabana WHERE nombre_identificador = ? AND id_cabana <> ?', [$d['nombre_identificador'], $id])->fetch()) {
            fallar('Ya existe otra cabaña con ese nombre.', 409);
        }
        consulta($pdo, 'UPDATE cabana SET nombre_identificador = ?, capacidad_maxima = ?, descripcion_equipamiento = ?, precio_por_noche = ?
                        WHERE id_cabana = ?',
            [$d['nombre_identificador'], $d['capacidad_maxima'], $d['descripcion_equipamiento'] ?? null, $d['precio_por_noche'], $id]);
        responder(['mensaje' => 'Cabaña modificada.']);

    case 'DELETE':
        exigir_encargada();
        if (!$id) fallar('Falta el id de la cabaña.');
        if (consulta($pdo, 'SELECT 1 FROM reserva WHERE id_cabana = ?', [$id])->fetch()) {
            fallar('No se puede eliminar: la cabaña tiene reservas registradas.', 409);
        }
        $st = consulta($pdo, 'DELETE FROM cabana WHERE id_cabana = ?', [$id]);
        $st->rowCount() ? responder(['mensaje' => 'Cabaña eliminada.']) : fallar('La cabaña no existe.', 404);

    default:
        metodo_no_permitido();
}
