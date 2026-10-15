<?php
// One page of the full catalog, filtered and sorted in MySQL.
//
// GET make, model, bodyType, transmission, fuel, minPrice, maxPrice, yearFrom,
//     yearTo, search, sort (newest|price|price_desc|mileage|popularity), page, perPage
// → { total, page, perPage, cars: [cars_stock-shaped rows] }
//
// Access tiers match fetchStock.php: guests and free accounts get locked rows
// (one photo + make/model), except a free account's preview of the newest
// STOCK_FREE_PREVIEW_COUNT cars.

require_once __DIR__ . '/../../core/headers.php';
mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/stock_access.php';
require_once __DIR__ . '/catalog_lib.php';

$table = CATALOG_TABLE;
$q = fn(string $key) => trim((string)($_GET[$key] ?? ''));

$where = [];
$types = '';
$params = [];
$add = function (string $sql, string $type, $value) use (&$where, &$types, &$params) {
    $where[] = $sql;
    $types .= $type;
    $params[] = $value;
};

if ($q('make') !== '') $add('make = ?', 's', $q('make'));
if ($q('model') !== '') $add('model LIKE ?', 's', '%' . $q('model') . '%');
if ($q('bodyType') !== '') $add('body = ?', 's', $q('bodyType'));
if ($q('transmission') !== '') $add('trans = ?', 's', $q('transmission'));
if ($q('fuel') !== '') $add('fuel = ?', 's', $q('fuel'));
if (is_numeric($q('minPrice'))) $add('price_usd >= ?', 'i', (int)$q('minPrice'));
if (is_numeric($q('maxPrice'))) $add('price_usd BETWEEN 1 AND ?', 'i', (int)$q('maxPrice'));
if (is_numeric($q('yearFrom'))) $add('year >= ?', 'i', (int)$q('yearFrom'));
if (is_numeric($q('yearTo'))) $add('year <= ?', 'i', (int)$q('yearTo'));
// Every word must appear somewhere in the car's text (make, model, grade,
// chassis, ref, year...), like the client-side search it replaces.
// "SA-628413" (the ref shown on cards) normalizes to "sa 628413"; join it back.
$search = preg_replace('/\bsa (\d+)\b/', 'sa$1', catalog_normalize($q('search')));
foreach (array_slice(array_filter(explode(' ', $search)), 0, 6) as $token) {
    $add('search_text LIKE ?', 's', '%' . $token . '%');
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$orderSql = match ($q('sort')) {
    'price'      => 'ORDER BY (price_usd = 0), price_usd ASC, source_ref',
    'price_desc' => 'ORDER BY price_usd DESC, source_ref',
    'mileage'    => 'ORDER BY (mileage = 0), mileage ASC, source_ref',
    'popularity' => 'ORDER BY year DESC, first_seen DESC, source_ref',
    default      => 'ORDER BY first_seen DESC, year DESC, source_ref DESC',
};

$perPage = max(1, min(60, (int)($_GET['perPage'] ?? 15)));
$page = max(1, (int)($_GET['page'] ?? 1));

$run = function (string $sql) use ($conn, $types, $params) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) return null;
    if ($types !== '') $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();
    $stmt->close();
    return $res;
};

$countRes = $run("SELECT COUNT(*) FROM `$table` $whereSql");
if (!$countRes) {
    http_response_code(503);
    echo json_encode(['error' => 'Catalog not available yet']);
    exit;
}
$total = (int)$countRes->fetch_row()[0];
$page = min($page, max(1, (int)ceil($total / $perPage)));
$offset = ($page - 1) * $perPage;

$rows = [];
$res = $run("SELECT * FROM `$table` $whereSql $orderSql LIMIT $perPage OFFSET $offset");
while ($res && ($r = $res->fetch_assoc())) $rows[] = catalog_to_stock_row($r);

$level = stock_access_level($conn);
if ($level !== 'full') {
    $rows = stock_apply_access($rows, $level, $level === 'free' ? catalog_preview_keys($conn) : []);
}

header('Cache-Control: private, max-age=60');
header('Vary: Cookie');
echo json_encode(['total' => $total, 'page' => $page, 'perPage' => $perPage, 'cars' => $rows]);
