<?php

require_once __DIR__ . '/../../core/headers.php';
mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/stock_loader.php';

// The catalog build lives in stock_loader.php (shared with fetchVehicle.php).
// What each visitor actually receives depends on their access tier — see
// core/stock_access.php.
//
// NOTE: the artisbay deploy workflow does not ship this file automatically.
// Before uploading it to the live server, diff against the live copy
// (it was hotfixed server-side in the past).

$cars = load_public_stock($conn);
$previewKeys = stock_free_preview_keys($cars);
stock_store_preview_keys($previewKeys);

$level = stock_access_level($conn);
$isStaff = in_array(strtolower((string)($_SESSION['role'] ?? '')), ['admin', 'sales'], true);
if (!$isStaff) {
  // Reservation holder details are for the admin car manager only.
  foreach ($cars as &$row) {
    unset($row['buyer_name'], $row['buyer_email'], $row['buyer_country']);
  }
  unset($row);
}
$cars = stock_apply_access($cars, $level, $previewKeys);

// ------------------------------------------------------------
// Output stock
// ------------------------------------------------------------
// Cache-Control: the full catalog only changes on the daily 4am import
// (or an occasional manual re-import), but this response is 7MB+ and takes
// several seconds to generate/transfer. Without caching, every single page
// load/refresh re-fetches the whole thing from scratch, which is slow and
// makes an already-heavy request more likely to stall or fail partway on a
// slow connection (showing up as missing thumbnails or a vanished stock
// section on the homepage). 5 minutes is short enough that a fresh import
// still shows up quickly, long enough to make repeat views in one session
// free.
// The response now differs per visitor, so it must never sit in a shared
// cache; the frontend adds ?tier=<level> to the URL so a browser-cached copy
// from before login/activation isn't reused.
header('Cache-Control: private, max-age=300');
header('Vary: Cookie');
http_response_code(200);
echo json_encode($cars);
?>
