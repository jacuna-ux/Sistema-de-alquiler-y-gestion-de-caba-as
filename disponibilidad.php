<?php

require_once __DIR__ . '/comun.php';
exigir_login();
if (metodo() !== 'GET') metodo_no_permitido();

$ingreso = $_GET['ingreso'] ?? '';
$egreso = $_GET['egreso'] ?? '';
if (!es_fecha($ingreso) || !es_fecha($egreso)) {
    fallar('Indicá ingreso y egreso con el formato AAAA-MM-DD.');
}
if ($egreso <= $ingreso) {
    fallar('La fecha de egreso debe ser posterior a la de ingreso.');
}

$cabanas = consulta($pdo, 'SELECT * FROM cabana ORDER BY id_cabana')->fetchAll();
$choques = consulta($pdo, "SELECT id_reserva, id_cabana, fecha_ingreso, fecha_egreso, estado FROM reserva
    WHERE estado IN ('Pendiente', 'Confirmada') AND fecha_ingreso < ? AND fecha_egreso > ?
    ORDER BY fecha_ingreso", [$egreso, $ingreso])->fetchAll();

$porCabana = [];
foreach ($choques as $r) {
    $porCabana[$r['id_cabana']][] = $r;
}
$libres = [];
$ocupadas = [];
foreach ($cabanas as $c) {
    if (empty($porCabana[$c['id_cabana']])) {
        $libres[] = $c;
    } else {
        $c['reservas'] = $porCabana[$c['id_cabana']];
        if (!es_encargada()) {
            foreach ($c['reservas'] as &$rr) { unset($rr['id_reserva']); }
            unset($rr);
        }
        $ocupadas[] = $c;
    }
}
responder(['ingreso' => $ingreso, 'egreso' => $egreso, 'noches' => noches($ingreso, $egreso),
           'libres' => $libres, 'ocupadas' => $ocupadas]);
