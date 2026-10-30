<?php

require_once __DIR__ . '/comun.php';
if (metodo() !== 'POST') metodo_no_permitido();

$d = entrada();
exigir_campos($d, ['nombre_usuario', 'contrasena']);
$id = crear_cliente($pdo, $d);
$u = consulta($pdo, 'SELECT u.id_usuario, u.nombre, u.apellido, u.nombre_usuario, u.id_rol, r.nombre_rol
                     FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?', [$id])->fetch();
session_regenerate_id(true);
$_SESSION['usuario'] = $u;
responder($u, 201);
