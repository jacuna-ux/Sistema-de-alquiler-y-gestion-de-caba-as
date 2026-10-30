<?php

require_once __DIR__ . '/comun.php';

switch (metodo()) {
    case 'POST':
        $d = entrada();
        exigir_campos($d, ['nombre_usuario', 'contrasena']);
        $u = consulta($pdo, 'SELECT u.id_usuario, u.nombre, u.apellido, u.nombre_usuario,
                                    u.contrasena_encriptada, u.id_rol, r.nombre_rol
                             FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
                             WHERE u.nombre_usuario = ?', [$d['nombre_usuario']])->fetch();
        $hash = $u['contrasena_encriptada'] ?? '';

        $ok = $u && (hash_equals($hash, hash('sha256', $d['contrasena'])) || password_verify($d['contrasena'], $hash));
        if (!$ok) {
            fallar('Usuario o contraseña incorrectos.', 401);
        }
        unset($u['contrasena_encriptada']);
        session_regenerate_id(true);
        $_SESSION['usuario'] = $u;
        responder($u);
    case 'GET':
        responder(exigir_login());
    case 'DELETE':
        $_SESSION = [];
        session_destroy();
        responder(['mensaje' => 'Sesión cerrada.']);
    default:
        metodo_no_permitido();
}
