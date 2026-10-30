<?php

header('Content-Type: application/json; charset=utf-8');
session_start();
require_once __DIR__ . '/conexion.php';

function responder($datos, $codigo = 200)
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fallar($mensaje, $codigo = 400)
{
    responder(['error' => $mensaje], $codigo);
}

set_exception_handler(function ($e) {
    fallar('Error interno del servidor.', 500);
});

function entrada()
{
    $datos = json_decode(file_get_contents('php://input'), true);
    return is_array($datos) ? $datos : [];
}

function metodo()
{
    return $_SERVER['REQUEST_METHOD'];
}

function exigir_login()
{
    if (empty($_SESSION['usuario'])) {
        fallar('Tenés que iniciar sesión.', 401);
    }
    return $_SESSION['usuario'];
}

function exigir_campos($datos, $campos)
{
    foreach ($campos as $c) {
        if (!isset($datos[$c]) || trim((string)$datos[$c]) === '') {
            fallar("Falta completar el campo $c.");
        }
    }
}

function es_fecha($texto)
{
    $f = DateTime::createFromFormat('Y-m-d', (string)$texto);
    return $f && $f->format('Y-m-d') === $texto;
}

function id_param()
{
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
    return $id === false ? null : $id;
}

function noches($ingreso, $egreso)
{
    return (int)(new DateTime($ingreso))->diff(new DateTime($egreso))->days;
}

function fecha_ar($f)
{
    return (new DateTime($f))->format('d/m/Y');
}

function consulta($pdo, $sql, $params = [])
{
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return $st;
}

function metodo_no_permitido()
{
    fallar('Método no permitido.', 405);
}

function es_encargada($u = null)
{
    $u = $u ?: ($_SESSION['usuario'] ?? null);
    return $u && (int)$u['id_rol'] === ROL_ENCARGADA;
}

function exigir_encargada()
{
    $u = exigir_login();
    if (!es_encargada($u)) {
        fallar('Solo la encargada puede hacer esto.', 403);
    }
    return $u;
}

function validar_cliente($d)
{
    exigir_campos($d, ['nombre', 'apellido', 'dni']);
    if (!preg_match('/^\d{7,9}$/', (string)$d['dni'])) {
        fallar('El DNI debe tener entre 7 y 9 números, sin puntos.');
    }
    if (!empty($d['email']) && !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
        fallar('El email no es válido.');
    }
    if (isset($d['contrasena']) && $d['contrasena'] !== '' && strlen($d['contrasena']) < 6) {
        fallar('La contraseña debe tener al menos 6 caracteres.');
    }
}

function crear_cliente($pdo, $d)
{
    validar_cliente($d);
    if (consulta($pdo, 'SELECT 1 FROM usuario WHERE dni = ?', [$d['dni']])->fetch()) {
        fallar('Ya existe una persona registrada con ese DNI.', 409);
    }
    $nombreUsuario = trim($d['nombre_usuario'] ?? '') !== '' ? trim($d['nombre_usuario']) : $d['dni'];
    if (consulta($pdo, 'SELECT 1 FROM usuario WHERE nombre_usuario = ?', [$nombreUsuario])->fetch()) {
        fallar('Ese nombre de usuario ya está en uso.', 409);
    }
    $clave = !empty($d['contrasena']) ? $d['contrasena'] : bin2hex(random_bytes(8));
    consulta($pdo, 'INSERT INTO usuario (nombre, apellido, dni, telefono, email, nombre_usuario, contrasena_encriptada, id_rol)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [$d['nombre'], $d['apellido'], $d['dni'], $d['telefono'] ?? null, $d['email'] ?? null,
         $nombreUsuario, hash('sha256', $clave), ROL_CLIENTE]);
    return (int)$pdo->lastInsertId();
}
