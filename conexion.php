<?php
require_once __DIR__ . '/config.php';

$dsn = getenv('PEHUEN_DSN') ?: 'mysql:host=' . DB_HOST . ';dbname=' . DB_NOMBRE . ';charset=utf8mb4';
$usuarioBd = getenv('PEHUEN_USER') !== false ? getenv('PEHUEN_USER') : DB_USUARIO;
$claveBd = getenv('PEHUEN_PASS') !== false ? getenv('PEHUEN_PASS') : DB_CLAVE;

$pdo = new PDO($dsn, $usuarioBd, $claveBd, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
    $pdo->exec('PRAGMA foreign_keys = ON');
}
