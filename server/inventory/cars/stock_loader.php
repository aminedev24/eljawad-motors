<?php
require_once __DIR__ . '/../../core/stock_access.php';

// Builds the full public catalog (partner feed + Artisbay Lite-managed stock).
// Shared by fetchStock.php (the list) and fetchVehicle.php (to work out which
// units are in a free account's preview). Callers apply stock_apply_access().

// ------------------------------------------------------------
// Public stock = PARTNER stock only.
// The main database's cars_stock table holds only demo/sample rows
// (REF002 Honda Fit etc.) and is deliberately NOT queried — demo cars
// must never show on the site. If real Artisbay Lite-owned stock is ever
// added to the main database, reintroduce the merge here AND mirror
// it in vehicles_bot.php so the chatbot sees the same cars.
//
// NOTE: the deploy workflow does not ship this file automatically.
// Before uploading it to the live server, diff against the live copy
// (it was hotfixed server-side in the past).
// ------------------------------------------------------------

function is_future_year_row(array $row, int $currentYear): bool {
  $year = (int)($row['year'] ?? 0);
  return $year > $currentYear;
}

function load_public_stock(mysqli $conn): array {
  $cars = array();
  $currentYear = (int)date('Y');

  // Partner DB credentials live in a config file OUTSIDE the web root and
  // OUTSIDE the git repo, so nothing secret is ever committed.
  // The file returns: ['host'=>, 'db'=>, 'user'=>, 'pass'=>]
  $partnerConfigPath = '/home2/yqjezvte/partner_db_config.php';
  if (is_readable($partnerConfigPath)) {
    $p = include $partnerConfigPath;
    if (is_array($p) && !empty($p['db'])) {
      // Disable PHP 8.x mysqli exception mode so a failed partner
      // connection returns an empty list instead of a fatal error.
      mysqli_report(MYSQLI_REPORT_OFF);
      $pconn = @new mysqli(
        $p['host'] ?? 'localhost',
        $p['user'] ?? '',
        $p['pass'] ?? '',
        $p['db']
      );

      if (!$pconn->connect_error) {
        $pconn->set_charset('utf8mb4');
        $psql = "SELECT * FROM cars_stock ORDER BY make, model";
        $pres = $pconn->query($psql);
        if ($pres && $pres->num_rows > 0) {
          while ($prow = $pres->fetch_assoc()) {
            if (is_future_year_row($prow, $currentYear)) continue;
            // Internal purchase cost — never expose it publicly.
            unset($prow['buying_price']);
            array_push($cars, $prow);
          }
        }
        $pconn->close();
      }
    }
  }

  // ------------------------------------------------------------
  // Fallback: if no cars loaded from the partner config, try the
  // main connection. On production the partner stock lives in a
  // separate database; locally it sits in the same 'artisbay' DB.
  // ------------------------------------------------------------
  if (empty($cars)) {
    mysqli_report(MYSQLI_REPORT_OFF);
    $partnerDbCheck = $conn->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'yqjezvte_artisbay_third_party'");
    $tablePrefix = ($partnerDbCheck && $partnerDbCheck->num_rows > 0) ? 'yqjezvte_artisbay_third_party.' : '';
    $res = $conn->query("SELECT * FROM {$tablePrefix}cars_stock ORDER BY make, model");
    if ($res && $res->num_rows > 0) {
      while ($row = $res->fetch_assoc()) {
        if (is_future_year_row($row, $currentYear)) continue;
        unset($row['buying_price']);
        array_push($cars, $row);
      }
    }
  }

  // ------------------------------------------------------------
  // Append Artisbay Lite-managed stock: own cars that carry an explicit status
  // (in_stock / reserved / sold…) so reserved and sold units still appear in
  // the public catalog with a badge. Partner rows and demo rows (status NULL)
  // never qualify here — the partner feed above is still the bulk of the list.
  // ------------------------------------------------------------
  $own = [];
  $ownRes = $conn->query(
    "SELECT c.*, rv.user_full_name AS buyer_name, rv.user_email AS buyer_email,
            rv.destination_country AS buyer_country, rv.expires_at,
            rv.vehicle_ref AS active_reservation
     FROM cars_stock c
     LEFT JOIN reserved_vehicles rv ON rv.vehicle_ref = c.ref_no COLLATE utf8mb4_general_ci
          AND rv.status IN ('reserved','pending_payment')
          AND (rv.expires_at IS NULL OR rv.expires_at > NOW())
     WHERE c.status IS NOT NULL AND c.status <> ''"
  );
  if ($ownRes) {
    while ($row = $ownRes->fetch_assoc()) {
      // Expired/cancelled holds leave cars_stock.status stuck on 'reserved';
      // surface those units as back in stock so no stale badge shows publicly.
      if (strtolower(trim((string)$row['status'])) === 'reserved' && empty($row['active_reservation'])) {
        $row['status'] = 'in_stock';
      }
      $own[] = $row;
    }
  }
  $invRes = $conn->query("SELECT i.* FROM cars_inventory i");
  if ($invRes) {
    $seenRefs = [];
    foreach ($own as $row) {
      if ($row['ref_no']) $seenRefs[$row['ref_no']] = true;
    }
    while ($row = $invRes->fetch_assoc()) {
      if ($row['ref_no'] && isset($seenRefs[$row['ref_no']])) continue;
      $row['status'] = $row['status'] ?: 'sold';
      $own[] = $row;
    }
  }
  $allowedStatuses = ['in_stock', 'available', 'pending', 'reserved', 'sold'];
  $own = array_values(array_filter($own, function ($c) use ($allowedStatuses) {
    $status = strtolower($c['status'] ?? '');
    if (in_array($status, $allowedStatuses, true)) return true;
    return str_starts_with($status, 'sold');
  }));

  // Deduplicate: partner stock is read from the SAME cars_stock table that
  // carries Artisbay Lite-managed rows (locally the fallback path and the own-stock
  // query both read 'artisbay'.cars_stock). Without this, owned rows with an
  // explicit status are returned twice — once by the general SELECT and again
  // by the append below. Skip any own row whose ref_no (or chassis_no) already
  // made it into the main list, so each vehicle appears exactly once.
  $refKey = function ($row) {
    foreach (['ref_no', 'chassis_no', 'id'] as $field) {
      $value = trim((string)($row[$field] ?? ''));
      if ($value !== '') return strtoupper($value);
    }
    return null;
  };
  $seenKeys = [];
  foreach ($cars as $row) {
    $key = $refKey($row);
    if ($key !== null) $seenKeys[$key] = true;
  }
  foreach ($own as $row) {
    unset($row['buying_price']);
    $key = $refKey($row);
    if ($key !== null && isset($seenKeys[$key])) continue;
    $cars[] = $row;
  }
  return $cars;
}

// Which units are in a free account's preview. fetchStock.php refreshes this
// cache on every run; fetchVehicle.php reads it so a details page doesn't have
// to rebuild the whole catalog. Keyed by install dir so the artisbay and
// eljawad copies on the same host don't share one file.
function stock_preview_cache_path(): string {
  return sys_get_temp_dir() . '/stock_free_preview_' . md5(__DIR__) . '.json';
}

function stock_store_preview_keys(array $keys): void {
  @file_put_contents(stock_preview_cache_path(), json_encode(array_keys($keys)), LOCK_EX);
}

function stock_preview_keys_cached(mysqli $conn): array {
  $path = stock_preview_cache_path();
  if (is_readable($path) && time() - filemtime($path) < 3600) {
    $list = json_decode((string)file_get_contents($path), true);
    if (is_array($list)) return array_fill_keys($list, true);
  }
  $keys = stock_free_preview_keys(load_public_stock($conn));
  stock_store_preview_keys($keys);
  return $keys;
}
