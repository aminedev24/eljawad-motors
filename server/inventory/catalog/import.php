<?php
// Hourly import of the full Ichinomiya catalog into ichinomiya_catalog (see
// catalog_lib.php). Command line only:
//
//   cPanel cron: 30 * * * * . /home2/yqjezvte/.import_env && php /home2/yqjezvte/public_html/eljawad-motors/server/inventory/catalog/import.php >> /home2/yqjezvte/catalog_import.log 2>&1
//
// .import_env provides ICHINOMIYA_PARTNER_KEY; the database comes from the
// site's own core/db_connection.php. Each run loads every make into a fresh
// table and swaps it in with one RENAME, so visitors see the old catalog or
// the new one, never a partial one. Photo galleries fetched on demand and each
// car's first-seen date carry over from the previous run.

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/catalog_lib.php';
mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';

$force = in_array('--force', $argv, true);
$log = fn(string $level, string $msg) => print("[$level] " . date('c') . " $msg\n");

$lock = fopen(sys_get_temp_dir() . '/start_auction_catalog_import.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
    $log('INFO', 'previous import still running; skipping this run.');
    exit;
}

if (!isset($conn) || $conn->connect_error) {
    $log('ERROR', 'database connection failed');
    exit(1);
}
$conn->set_charset('utf8mb4');
catalog_ensure_schema($conn);

// ------------------------------------------------------------ partner data
$stock = catalog_http_get(CATALOG_PARTNER_BASE . '/api/search.php?type=stock');
$makes = array_values(array_filter(array_map(fn($b) => (string)($b['name'] ?? ''), $stock['brands'] ?? [])));
if (!$makes) {
    $log('ERROR', 'could not read the partner make list; catalog left unchanged');
    exit(1);
}

$unavailable = [];
foreach (['get-sold-refs', 'get-reserved-refs'] as $endpoint) {
    $data = catalog_http_get(CATALOG_PARTNER_BASE . "/core-services/$endpoint.php");
    if (!is_array($data['refs'] ?? null)) {
        $log('WARN', "could not read $endpoint; those cars stay listed this run");
        continue;
    }
    foreach ($data['refs'] as $r) $unavailable[(string)$r] = true;
}

// ------------------------------------------------------------ staging table
$table = CATALOG_TABLE;
$conn->query("DROP TABLE IF EXISTS `{$table}_new`");
if (!$conn->query("CREATE TABLE `{$table}_new` LIKE `$table`")) {
    $log('ERROR', 'could not create staging table: ' . $conn->error);
    exit(1);
}

$columns = ['source_ref', 'make', 'model', 'grade', 'model_code', 'year', 'cc', 'trans', 'mileage', 'body',
            'fuel', 'color', 'drive', 'steering', 'seats', 'doors', 'chassis', 'score', 'price_usd', 'img',
            'options', 'search_text', 'first_seen'];
$now = date('Y-m-d H:i:s');
$currentYear = (int)date('Y');
$batch = [];
$inserted = 0;
$skipped = 0;
$failedMakes = [];

$flush = function () use (&$batch, &$inserted, $conn, $table, $columns, $log) {
    if (!$batch) return;
    $values = [];
    foreach ($batch as $row) {
        $values[] = '(' . implode(',', array_map(fn($v) => is_int($v) ? (string)$v : "'" . $conn->real_escape_string((string)$v) . "'", $row)) . ')';
    }
    // INSERT IGNORE: a car listed under two makes keeps its first row.
    $sql = "INSERT IGNORE INTO `{$table}_new` (`" . implode('`,`', $columns) . "`) VALUES " . implode(',', $values);
    if ($conn->query($sql)) {
        $inserted += $conn->affected_rows;
    } else {
        $log('WARN', 'batch insert failed: ' . $conn->error);
    }
    $batch = [];
};

foreach ($makes as $make) {
    $file = preg_replace('/[^A-Za-z0-9_\-]/', '_', strtoupper($make));
    $data = catalog_http_get(CATALOG_PARTNER_BASE . "/makes/$file.json", 60);
    if (!is_array($data['vehicles'] ?? null)) {
        $failedMakes[] = $make;
        continue;
    }
    foreach ($data['vehicles'] as $car) {
        $ref = trim((string)($car['ref'] ?? ''));
        $year = (int)($car['year'] ?? 0);
        $carMake = trim((string)($car['make'] ?? ''));
        $model = trim((string)($car['model'] ?? ''));
        // Future model years are a known partner-feed glitch.
        if ($ref === '' || isset($unavailable[$ref]) || $carMake === '' || $model === '' || $year <= 0 || $year > $currentYear) {
            $skipped++;
            continue;
        }
        $priceUsd = (float)($car['price_usd'] ?? 0);
        $options = is_array($car['options'] ?? null) ? array_values(array_filter(array_map('strval', $car['options']))) : [];
        $fields = [
            'make' => $carMake, 'model' => $model, 'grade' => (string)($car['grade'] ?? ''),
            'model_code' => (string)($car['model_code'] ?? ''), 'trans' => (string)($car['trans'] ?? ''),
            'body' => (string)($car['body'] ?? ''), 'fuel' => (string)($car['fuel'] ?? ''),
            'color' => (string)($car['color'] ?? ''), 'drive' => (string)($car['drive'] ?? ''),
            'steering' => (string)($car['steering'] ?? ''), 'chassis' => (string)($car['chassis'] ?? ''),
        ];
        $batch[] = [
            $ref, $fields['make'], $fields['model'], mb_substr($fields['grade'], 0, 150), mb_substr($fields['model_code'], 0, 50),
            $year, (int)preg_replace('/\D/', '', (string)($car['cc'] ?? '')), $fields['trans'],
            (int)($car['mileage'] ?? 0), $fields['body'], $fields['fuel'], $fields['color'], $fields['drive'],
            $fields['steering'], (string)($car['seats'] ?? ''), (string)($car['doors'] ?? ''), $fields['chassis'],
            (string)($car['score'] ?? ''), $priceUsd > 0 ? (int)round($priceUsd * CATALOG_MARKUP_RATE) : 0,
            mb_substr(trim((string)($car['img'] ?? '')), 0, 500), json_encode($options, JSON_UNESCAPED_UNICODE),
            // No partner ref here: searching it would confirm which of the
            // partner's cars we list.
            mb_substr(catalog_normalize(implode(' ', [$fields['make'], $fields['model'], $fields['grade'],
                $fields['model_code'], $fields['chassis'], $year, $fields['body'], $fields['trans'],
                $fields['fuel'], $fields['color']])), 0, 600),
            $now,
        ];
        if (count($batch) >= 500) $flush();
    }
    unset($data);
}
$flush();

if ($failedMakes) $log('WARN', 'no data for ' . count($failedMakes) . ' makes: ' . implode(', ', array_slice($failedMakes, 0, 15)));

// ------------------------------------------------------------ safety check
$previous = (int)($conn->query("SELECT COUNT(*) FROM `$table`")->fetch_row()[0] ?? 0);
if ($inserted === 0 || (!$force && $previous > 0 && $inserted < $previous * 0.6)) {
    $conn->query("DROP TABLE IF EXISTS `{$table}_new`");
    $log('ERROR', "only $inserted cars fetched (previous import: $previous); catalog left unchanged. Run with --force to accept.");
    exit(1);
}

// ------------------------------------------------------------ carry over + swap
// Galleries fetched on demand and first-seen dates survive the swap; cars
// whose price changed keep their gallery too (photos don't change with price).
$conn->query("UPDATE `{$table}_new` n JOIN `$table` o ON o.source_ref = n.source_ref
              SET n.first_seen = o.first_seen, n.images = o.images, n.full_fetched_at = o.full_fetched_at,
                  n.sa_no = o.sa_no,
                  n.chassis = IF(n.chassis = '', o.chassis, n.chassis),
                  n.model_code = IF(n.model_code = '', o.model_code, n.model_code)");
// New cars get the next SA numbers. The high-water mark lives in meta so a
// number is never reused, even after its car leaves the catalog.
$high = (int)(catalog_get_meta($conn, 'sa_high')['value'] ?? 0);
$high = max($high, CATALOG_FIRST_SA_NO - 1,
    (int)($conn->query("SELECT MAX(sa_no) FROM `$table`")->fetch_row()[0] ?? 0));
$conn->query("SET @sa := $high");
$conn->query("UPDATE `{$table}_new` SET sa_no = (@sa := @sa + 1) WHERE sa_no = 0 ORDER BY first_seen, source_ref");
$newHigh = (int)($conn->query("SELECT MAX(sa_no) FROM `{$table}_new`")->fetch_row()[0] ?? 0);
catalog_set_meta($conn, 'sa_high', ['value' => max($high, $newHigh)]);

$conn->query("DROP TABLE IF EXISTS `{$table}_old`");
if (!$conn->query("RENAME TABLE `$table` TO `{$table}_old`, `{$table}_new` TO `$table`")) {
    $log('ERROR', 'swap failed: ' . $conn->error);
    exit(1);
}
$conn->query("DROP TABLE IF EXISTS `{$table}_old`");

// ------------------------------------------------------------ filter facets
$facet = function (string $column) use ($conn, $table): array {
    $out = [];
    $res = $conn->query("SELECT `$column` AS name, COUNT(*) AS count FROM `$table`
                         WHERE `$column` <> '' GROUP BY `$column` ORDER BY count DESC");
    while ($res && ($r = $res->fetch_assoc())) $out[] = ['name' => (string)$r['name'], 'count' => (int)$r['count']];
    return $out;
};
$models = [];
$res = $conn->query("SELECT make, model, COUNT(*) AS count FROM `$table` GROUP BY make, model ORDER BY make, count DESC");
while ($res && ($r = $res->fetch_assoc())) $models[$r['make']][] = ['name' => $r['model'], 'count' => (int)$r['count']];
$years = [];
$res = $conn->query("SELECT DISTINCT year FROM `$table` WHERE year > 0 ORDER BY year DESC");
while ($res && ($r = $res->fetch_row())) $years[] = (int)$r[0];

// Same price bands as the homepage "Shop by budget" buttons (inventoryConsole.js).
$budgets = [];
foreach ([['', 10000], [10000, 20000], [20000, 40000], [40000, 75000], [75000, '']] as [$min, $max]) {
    $cond = 'price_usd > 0' . ($min !== '' ? " AND price_usd >= $min" : '') . ($max !== '' ? " AND price_usd <= $max" : '');
    $budgets["$min-$max"] = (int)($conn->query("SELECT COUNT(*) FROM `$table` WHERE $cond")->fetch_row()[0] ?? 0);
}

catalog_set_meta($conn, 'facets', [
    'total'         => $inserted,
    'updated_at'    => date('c'),
    'makes'         => $facet('make'),
    'bodies'        => $facet('body'),
    'transmissions' => $facet('trans'),
    'fuels'         => $facet('fuel'),
    'years'         => $years,
    'budgets'       => $budgets,
    'models'        => $models,
]);

// Cached photos (img.php) older than 30 days are fetched again on demand.
$cacheDir = __DIR__ . '/cache';
if (is_dir($cacheDir)) {
    $cutoff = time() - 30 * 86400;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($cacheDir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($it as $f) {
        if ($f->isFile() && $f->getMTime() < $cutoff) @unlink($f->getPathname());
        elseif ($f->isDir()) @rmdir($f->getPathname()); // only succeeds when empty
    }
}

$log('OK', "catalog: $inserted cars (previous $previous), skipped $skipped, " . count($unavailable) . ' sold/reserved at partner');
