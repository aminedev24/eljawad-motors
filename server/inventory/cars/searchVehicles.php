<?php
// Staff-only vehicle lookup for the invoice generator's vehicle picker.
// Searches own stock (main DB) and, on production, the partner stock DB -
// the same two sources fetchVehicle.php reads. GET ?q=<2+ chars>
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/headers.php';
require_once __DIR__ . '/../../finance/invoices/invoice_schema.php';

session_start();
invoice_require_staff();

$q = trim((string)($_GET['q'] ?? ''));
if (mb_strlen($q) < 2) {
    echo json_encode([]);
    exit;
}
$like = '%' . $q . '%';
$limit = 8;
$sql = "SELECT id, ref_no, make, model, year, chassis_no, engine_capacity, mileage,
               price, fob, final_value, currency
        FROM cars_stock
        WHERE ref_no LIKE ? OR chassis_no LIKE ? OR make LIKE ? OR model LIKE ?
           OR CONCAT_WS(' ', make, model) LIKE ?
        ORDER BY (ref_no = ?) DESC, make, model
        LIMIT $limit";

function search_stock(mysqli $db, string $sql, string $like, string $q): array
{
    $stmt = $db->prepare($sql);
    if (!$stmt) return [];
    $stmt->bind_param('ssssss', $like, $like, $like, $like, $like, $q);
    $stmt->execute();
    return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
}

$rows = search_stock($conn, $sql, $like, $q);

$partnerConfigPath = '/home2/yqjezvte/partner_db_config.php';
if (count($rows) < $limit && is_readable($partnerConfigPath)) {
    $p = include $partnerConfigPath;
    if (is_array($p) && !empty($p['db'])) {
        mysqli_report(MYSQLI_REPORT_OFF);
        $pconn = @new mysqli($p['host'] ?? 'localhost', $p['user'] ?? '', $p['pass'] ?? '', $p['db']);
        if (!$pconn->connect_error) {
            $pconn->set_charset('utf8mb4');
            $rows = array_merge($rows, search_stock($pconn, $sql, $like, $q));
            $pconn->close();
        }
    }
}

// One entry per ref, own stock first; price falls back like the stock list does.
$seen = [];
$out = [];
foreach ($rows as $r) {
    $key = strtoupper(trim((string)($r['ref_no'] ?: $r['chassis_no'] ?: $r['id'])));
    if (isset($seen[$key])) continue;
    $seen[$key] = true;
    $price = $r['fob'] ?? null;
    if ($price === null || $price === '' || (float)$price == 0) $price = $r['final_value'] ?? null;
    if ($price === null || $price === '' || (float)$price == 0) $price = $r['price'] ?? null;
    $out[] = [
        'id' => $r['id'], 'ref_no' => $r['ref_no'], 'make' => $r['make'], 'model' => $r['model'],
        'year' => $r['year'], 'chassis_no' => $r['chassis_no'], 'engine_capacity' => $r['engine_capacity'],
        'mileage' => $r['mileage'], 'price' => $price !== null ? (float)str_replace(',', '', (string)$price) : null,
        'currency' => $r['currency'] ?: 'USD',
    ];
    if (count($out) >= $limit) break;
}
echo json_encode($out);
