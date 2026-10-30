<?php

require_once __DIR__ . '/comun.php';
exigir_encargada();
if (metodo() !== 'GET') metodo_no_permitido();

$desde = $_GET['desde'] ?? '';
$hasta = $_GET['hasta'] ?? '';
if (!es_fecha($desde) || !es_fecha($hasta)) {
    fallar('Indicá desde y hasta con el formato AAAA-MM-DD.');
}
if ($hasta < $desde) {
    fallar('La fecha "hasta" no puede ser anterior a "desde".');
}
$dias = noches($desde, $hasta) + 1;
$finExclusivo = (new DateTime($hasta))->modify('+1 day')->format('Y-m-d');

$cabanas = consulta($pdo, 'SELECT id_cabana, nombre_identificador FROM cabana ORDER BY id_cabana')->fetchAll();
$reservas = consulta($pdo, "SELECT id_cabana, fecha_ingreso, fecha_egreso FROM reserva
    WHERE estado IN ('Confirmada', 'Finalizada') AND fecha_ingreso < ? AND fecha_egreso > ?", [$finExclusivo, $desde])->fetchAll();
$ingresos = consulta($pdo, 'SELECT r.id_cabana, SUM(p.monto) AS total
    FROM pago p JOIN reserva r ON r.id_reserva = p.id_reserva
    WHERE p.fecha_hora_pago >= ? AND p.fecha_hora_pago < ?
    GROUP BY r.id_cabana', [$desde . ' 00:00:00', $finExclusivo . ' 00:00:00'])->fetchAll(PDO::FETCH_KEY_PAIR);

$nochesPor = [];
foreach ($reservas as $r) {
    $ini = max($r['fecha_ingreso'], $desde);
    $fin = min($r['fecha_egreso'], $finExclusivo);
    $nochesPor[$r['id_cabana']] = ($nochesPor[$r['id_cabana']] ?? 0) + noches($ini, $fin);
}

$filas = [];
$totNoches = 0;
$totIngresos = 0;
foreach ($cabanas as $c) {
    $n = $nochesPor[$c['id_cabana']] ?? 0;
    $i = (int)($ingresos[$c['id_cabana']] ?? 0);
    $filas[] = ['id_cabana' => (int)$c['id_cabana'], 'cabana' => $c['nombre_identificador'],
                'noches_ocupadas' => $n, 'ocupacion_pct' => round($n * 100 / $dias, 1), 'ingresos' => $i];
    $totNoches += $n;
    $totIngresos += $i;
}
responder(['desde' => $desde, 'hasta' => $hasta, 'dias_periodo' => $dias, 'cabanas' => $filas,
           'total_noches_ocupadas' => $totNoches,
           'ocupacion_general_pct' => round($totNoches * 100 / ($dias * max(count($cabanas), 1)), 1),
           'total_ingresos' => $totIngresos]);
