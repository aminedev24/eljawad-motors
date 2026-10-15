<?php
// Catalog photo n of car SA-xxxxx, fetched from the partner's image host and
// cached on disk, so browsers only ever load photos from our own domain.
//
// GET car=SA-100001, n=0

mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/stock_access.php';
require_once __DIR__ . '/../../core/rate_limit.php';
require_once __DIR__ . '/catalog_lib.php';

const CATALOG_IMG_CACHE = __DIR__ . '/cache';

$fail = function (int $code) {
    http_response_code($code);
    header('Cache-Control: no-store');
    exit;
};

$saNo = catalog_parse_sa((string)($_GET['car'] ?? ''));
$n = (int)($_GET['n'] ?? 0);
if ($saNo === null || $n < 0 || $n > 60) $fail(404);

$cacheFile = CATALOG_IMG_CACHE . "/$saNo/$n.img";
if (!is_file($cacheFile)) {
    // Reads the session for the limiter; cached photos skip both.
    stock_access_level($conn);
    rate_limit($conn, 'catalog_img', ['minute' => 600, 'hour' => 6000]);

    $row = catalog_find($conn, "SA-$saNo");
    $source = $row ? (catalog_source_images($row)[$n] ?? null) : null;
    if (!$source) $fail(404);
    // Some feed rows carry JSON-escaped slashes ("http:\/\/...").
    $source = preg_replace('#^http://#i', 'https://', str_replace('\\/', '/', trim($source)));

    $ch = curl_init($source);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; Start-Auction-Images/1.0)',
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if ($code !== 200 || !$body || stripos($type, 'image/') !== 0) $fail(404);

    @mkdir(dirname($cacheFile), 0755, true);
    // Write-then-rename so a half-written file is never served.
    $tmp = $cacheFile . '.' . getmypid();
    if (@file_put_contents($tmp, $body) !== false) @rename($tmp, $cacheFile);
}

$info = @getimagesizefromstring((string)@file_get_contents($cacheFile, false, null, 0, 65536));
header('Content-Type: ' . ($info['mime'] ?? 'image/jpeg'));
header('Cache-Control: public, max-age=604800');
header('Content-Length: ' . filesize($cacheFile));
readfile($cacheFile);
