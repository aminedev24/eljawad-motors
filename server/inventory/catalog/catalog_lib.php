<?php
// Full Ichinomiya catalog (~80k cars), served on start-auction.com.
//
// import.php copies the partner's per-make files into ichinomiya_catalog every
// hour; search.php / facets.php page and filter it in MySQL, so the browser
// only ever receives one page of cars. eljawad.com keeps its curated
// cars_stock selection (server-scripts/process_upload.php) and never reads
// this table.

const CATALOG_TABLE = 'ichinomiya_catalog';
const CATALOG_META_TABLE = 'ichinomiya_catalog_meta';
// Sent to browsers, so it must not name the partner.
const CATALOG_COMPANY = 'catalog';
// Our own car numbers (SA-100001...), unrelated to the partner's refs so a
// listing can't be traced back to the partner's site.
const CATALOG_FIRST_SA_NO = 100001;
// Same margin the curated importer adds on top of the partner's USD price.
const CATALOG_MARKUP_RATE = 1.03;
// Overridable so the importer can be tested against a local fake partner.
define('CATALOG_PARTNER_BASE', getenv('CATALOG_PARTNER_BASE') ?: 'https://www.ichinomiya-motors.com');
// The partner's bot check hands browsers this cookie on first contact.
const CATALOG_HUMAN_COOKIE = 'humans_21909=1';

function catalog_ensure_schema(mysqli $conn): void
{
    $conn->query("CREATE TABLE IF NOT EXISTS `" . CATALOG_TABLE . "` (
        `source_ref` varchar(20) NOT NULL,
        `make` varchar(60) NOT NULL DEFAULT '',
        `model` varchar(100) NOT NULL DEFAULT '',
        `grade` varchar(150) NOT NULL DEFAULT '',
        `model_code` varchar(50) NOT NULL DEFAULT '',
        `year` smallint NOT NULL DEFAULT 0,
        `cc` int NOT NULL DEFAULT 0,
        `trans` varchar(20) NOT NULL DEFAULT '',
        `mileage` int NOT NULL DEFAULT 0,
        `body` varchar(50) NOT NULL DEFAULT '',
        `fuel` varchar(30) NOT NULL DEFAULT '',
        `color` varchar(40) NOT NULL DEFAULT '',
        `drive` varchar(20) NOT NULL DEFAULT '',
        `steering` varchar(30) NOT NULL DEFAULT '',
        `seats` varchar(5) NOT NULL DEFAULT '',
        `doors` varchar(5) NOT NULL DEFAULT '',
        `chassis` varchar(50) NOT NULL DEFAULT '',
        `score` varchar(10) NOT NULL DEFAULT '',
        `price_usd` int NOT NULL DEFAULT 0,
        `img` varchar(500) NOT NULL DEFAULT '',
        `images` text NULL,
        `options` text NULL,
        `search_text` varchar(600) NOT NULL DEFAULT '',
        `first_seen` datetime NOT NULL,
        `full_fetched_at` datetime NULL,
        `sa_no` int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY (`source_ref`),
        KEY `sa_no` (`sa_no`),
        KEY `make_model` (`make`, `model`),
        KEY `body` (`body`),
        KEY `price` (`price_usd`),
        KEY `year` (`year`),
        KEY `mileage` (`mileage`),
        KEY `first_seen` (`first_seen`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
    // Tables created before sa_no existed.
    require_once __DIR__ . '/../../core/db_migrations.php';
    ensure_columns($conn, CATALOG_TABLE, ['sa_no' => 'int unsigned NOT NULL DEFAULT 0']);
    $hasIndex = $conn->query("SHOW INDEX FROM `" . CATALOG_TABLE . "` WHERE Key_name = 'sa_no'");
    if ($hasIndex && $hasIndex->num_rows === 0) $conn->query("ALTER TABLE `" . CATALOG_TABLE . "` ADD INDEX `sa_no` (`sa_no`)");
    $conn->query("CREATE TABLE IF NOT EXISTS `" . CATALOG_META_TABLE . "` (
        `name` varchar(50) NOT NULL,
        `value` mediumtext NOT NULL,
        PRIMARY KEY (`name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
}

// Lower-case, punctuation-free text the keyword search matches against
// (mirrors normalizeText() in stockListV2.js).
function catalog_normalize(string $value): string
{
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', ' ', $value);
    return trim(preg_replace('/\s+/', ' ', $value));
}

function catalog_get_meta(mysqli $conn, string $name): ?array
{
    $stmt = $conn->prepare("SELECT value FROM `" . CATALOG_META_TABLE . "` WHERE name = ?");
    if (!$stmt) return null;
    $stmt->bind_param('s', $name);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_row();
    $stmt->close();
    $decoded = $row ? json_decode($row[0], true) : null;
    return is_array($decoded) ? $decoded : null;
}

function catalog_set_meta(mysqli $conn, string $name, array $value): void
{
    $json = json_encode($value, JSON_UNESCAPED_UNICODE);
    $stmt = $conn->prepare("REPLACE INTO `" . CATALOG_META_TABLE . "` (name, value) VALUES (?, ?)");
    $stmt->bind_param('ss', $name, $json);
    $stmt->execute();
    $stmt->close();
}

function catalog_sa_ref(array $r): string
{
    return 'SA-' . (int)$r['sa_no'];
}

// "SA-100001" / "sa100001" -> 100001, or null.
function catalog_parse_sa(string $identifier): ?int
{
    return preg_match('/^SA-?(\d+)$/i', trim($identifier), $m) ? (int)$m[1] : null;
}

// The partner's photo addresses for a row (full gallery when fetched).
function catalog_source_images(array $r): array
{
    $images = json_decode((string)($r['images'] ?? ''), true);
    if (!is_array($images) || !$images) $images = $r['img'] !== '' ? [$r['img']] : [];
    return array_values($images);
}

// Photos are served through img.php on our own domain, so browsers never see
// the partner's image host.
function catalog_image_url(array $r, int $n): string
{
    $https = ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $host = $_SERVER['HTTP_HOST'] ?? 'start-auction.com';
    return ($https ? 'https' : 'http') . "://$host/server/inventory/catalog/img.php?car=" . catalog_sa_ref($r) . "&n=$n";
}

// A catalog row in the same shape as a cars_stock row, so the existing card,
// list and detail components (ichinomiyaCardAdapter.js) render it unchanged.
// Nothing in it points back to the partner: our SA number instead of their
// ref, and photo URLs on our own domain.
function catalog_to_stock_row(array $r): array
{
    $images = array_map(fn($i) => catalog_image_url($r, $i), array_keys(catalog_source_images($r)));
    $options = json_decode((string)($r['options'] ?? ''), true);
    return [
        'id'              => catalog_sa_ref($r),
        'ref_no'          => catalog_sa_ref($r),
        'make'            => $r['make'],
        'model'           => $r['model'],
        'grade'           => $r['grade'],
        'model_code'      => $r['model_code'],
        'year'            => (string)$r['year'],
        'engine_capacity' => $r['cc'] ? (string)$r['cc'] : '',
        'mileage'         => (string)$r['mileage'],
        'transmission'    => $r['trans'],
        'fuel'            => $r['fuel'],
        'color'           => $r['color'],
        'drive'           => $r['drive'],
        'steering'        => $r['steering'],
        'seat'            => $r['seats'],
        'door'            => $r['doors'],
        'chassis_no'      => $r['chassis'],
        'category'        => $r['body'],
        'score'           => $r['score'],
        'price'           => $r['price_usd'] > 0 ? (string)$r['price_usd'] : '',
        'currency'        => 'USD',
        'image_urls'      => json_encode(array_values($images), JSON_UNESCAPED_SLASHES),
        'options'         => json_encode(is_array($options) ? $options : []),
        'company'         => CATALOG_COMPANY,
        'status'          => '',
        'first_seen'      => $r['first_seen'],
    ];
}

function catalog_http_get(string $url, int $timeout = 30): ?array
{
    $key = getenv('ICHINOMIYA_PARTNER_KEY') ?: '';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_USERAGENT      => 'Start-Auction-Catalog/1.0',
        CURLOPT_HTTPHEADER     => ["X-Partner-Key: $key", 'Accept: application/json'],
        CURLOPT_COOKIE         => CATALOG_HUMAN_COOKIE,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200 || !$body) return null;
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

// Full partner record (every photo, chassis, options) for one car, fetched
// the first time someone opens it and stored, so the hourly import never has
// to request 80k individual records.
function catalog_fill_full_record(mysqli $conn, array $row): array
{
    if (!empty($row['full_fetched_at'])) return $row;
    $full = catalog_http_get(CATALOG_PARTNER_BASE . '/api/search.php?ref=' . urlencode($row['source_ref']), 8);
    if (!$full || !empty($full['error'])) return $row;

    $images = is_array($full['images'] ?? null) ? array_values(array_filter(array_map('strval', $full['images']))) : [];
    if ($images) $row['images'] = json_encode($images, JSON_UNESCAPED_SLASHES);
    if (!empty($full['chassis'])) $row['chassis'] = (string)$full['chassis'];
    if (!empty($full['model_code'])) $row['model_code'] = (string)$full['model_code'];
    if (is_array($full['options'] ?? null)) $row['options'] = json_encode(array_values($full['options']), JSON_UNESCAPED_UNICODE);
    $row['full_fetched_at'] = date('Y-m-d H:i:s');

    $stmt = $conn->prepare("UPDATE `" . CATALOG_TABLE . "`
        SET images = ?, chassis = ?, model_code = ?, options = ?, full_fetched_at = ? WHERE source_ref = ?");
    if ($stmt) {
        $stmt->bind_param('ssssss', $row['images'], $row['chassis'], $row['model_code'], $row['options'], $row['full_fetched_at'], $row['source_ref']);
        $stmt->execute();
        $stmt->close();
    }
    return $row;
}

// The newest cars a free (not yet activated) account sees in full, keyed
// like stock_car_key() (the SA ref).
function catalog_preview_keys(mysqli $conn): array
{
    $keys = [];
    $res = $conn->query("SELECT sa_no FROM `" . CATALOG_TABLE . "`
                         ORDER BY first_seen DESC, year DESC, source_ref DESC LIMIT " . STOCK_FREE_PREVIEW_COUNT);
    while ($res && ($r = $res->fetch_row())) $keys['SA-' . (int)$r[0]] = true;
    return $keys;
}

// Looked up by our SA number only - never by the partner's ref, so the
// partner's numbers can't be used to probe which of their cars we list.
function catalog_find(mysqli $conn, string $identifier): ?array
{
    $saNo = catalog_parse_sa($identifier);
    if ($saNo === null) return null;
    $stmt = $conn->prepare("SELECT * FROM `" . CATALOG_TABLE . "` WHERE sa_no = ? LIMIT 1");
    if (!$stmt) return null;
    $stmt->bind_param('i', $saNo);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}
