<?php
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/headers.php';
require_once __DIR__ . '/stock_loader.php';

// Visitors must log in before opening any vehicle (see core/stock_access.php).
$accessLevel = stock_access_level($conn);
if ($accessLevel === 'guest') {
    http_response_code(401);
    echo json_encode(['error' => 'Login required', 'login_required' => true]);
    exit;
}

$identifier = isset($_GET['id']) ? trim($_GET['id']) : '';

if (!$identifier) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing vehicle identifier']);
    exit;
}

// The supplier/partner stock must be read from the SAME source that
// fetchStock.php uses to render the 3rd Party tab, otherwise a vehicle
// shown in the admin list cannot be imported. Resolution order:
//   1. partner DB credentials from the external config file (production)
//   2. partner DB schema visible to this MySQL user
//   3. local 'artisbay' DB (dev copy of the partner feed)
$pdo = null;
$partnerConfigPath = '/home2/yqjezvte/partner_db_config.php';
if (is_readable($partnerConfigPath)) {
    $p = include $partnerConfigPath;
    if (is_array($p) && !empty($p['db'])) {
        mysqli_report(MYSQLI_REPORT_OFF);
        $pconn = @new mysqli(
            $p['host'] ?? 'localhost',
            $p['user'] ?? '',
            $p['pass'] ?? '',
            $p['db']
        );
        if (!$pconn->connect_error) {
            $pconn->set_charset('utf8mb4');
            $stmt = $pconn->prepare(
                "SELECT * FROM cars_stock WHERE id = ? OR ref_no = ? OR chassis_no = ? LIMIT 1"
            );
            $stmt->bind_param('sss', $identifier, $identifier, $identifier);
            $stmt->execute();
            $result = $stmt->get_result();
            $car = $result->fetch_assoc();
            $stmt->close();
            $pconn->close();
        }
    }
}

if (empty($car)) {
    $partnerDbCheck = $conn->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'yqjezvte_artisbay_third_party'");
    $tablePrefix = ($partnerDbCheck && $partnerDbCheck->num_rows > 0) ? 'yqjezvte_artisbay_third_party.' : '';

    $stmt = $conn->prepare(
        "SELECT * FROM {$tablePrefix}cars_stock WHERE id = ? OR ref_no = ? OR chassis_no = ? LIMIT 1"
    );
    $stmt->bind_param("sss", $identifier, $identifier, $identifier);
    $stmt->execute();
    $result = $stmt->get_result();
    $car = $result->fetch_assoc();
}

if (empty($car)) {
    // Artisbay Lite-managed stock: own units (e.g. imported via the reservation /
    // partner-import flow) live in the MAIN database's cars_stock, which is not
    // the partner feed queried above. Without this fallback, the details page
    // 404s for exactly those vehicles even though they appear in search results.
    $stmt = $conn->prepare(
        "SELECT * FROM cars_stock WHERE id = ? OR ref_no = ? OR chassis_no = ? LIMIT 1"
    );
    $stmt->bind_param("sss", $identifier, $identifier, $identifier);
    $stmt->execute();
    $result = $stmt->get_result();
    $car = $result->fetch_assoc();
}

if (!$car) {
    http_response_code(404);
    echo json_encode(['error' => 'Vehicle not found']);
    exit;
}

// Stock list rows (fetchStock.php) carry an explicit status for
// Artisbay Lite-managed units; the raw feed row does not. Mirror the same
// resolution here so the details page shows the identical Reserved/Sold
// badge as the card: explicit status wins, then a reserved_vehicles
// record marks the unit reserved, then a cars_inventory entry is treated
// as sold (matching fetchStock's default). Holds that expired (or were
// cancelled) never count as active — a stale 'reserved' status is
// downgraded to in_stock so no outdated badge shows.
$refForReservation = $car['ref_no'] ?? $identifier;
$rawStatus = strtolower(trim((string)($car['status'] ?? '')));
if ($rawStatus === '') {
    $resCheck = $conn->prepare(
        "SELECT 1 FROM reserved_vehicles WHERE vehicle_ref = ? AND status IN ('reserved','pending_payment')
            AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1"
    );
    $resCheck->bind_param('s', $identifier);
    $resCheck->execute();
    $isReserved = (bool) $resCheck->get_result()->fetch_row();
    $resCheck->close();

    if ($isReserved) {
        $car['status'] = 'reserved';
    } else {
        $invCheck = $conn->prepare("SELECT 1 FROM cars_inventory WHERE ref_no = ? LIMIT 1");
        $invCheck->bind_param('s', $identifier);
        $invCheck->execute();
        $inInventory = (bool) $invCheck->get_result()->fetch_row();
        $invCheck->close();
        $car['status'] = $inInventory ? 'sold' : '';
    }
} elseif ($rawStatus === 'reserved') {
    $resCheck = $conn->prepare(
        "SELECT 1 FROM reserved_vehicles WHERE vehicle_ref = ? AND status IN ('reserved','pending_payment')
            AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1"
    );
    $resCheck->bind_param('s', $refForReservation);
    $resCheck->execute();
    $hasActiveHold = (bool) $resCheck->get_result()->fetch_row();
    $resCheck->close();
    if (!$hasActiveHold) {
        $car['status'] = 'in_stock';
    }
}

$isStaff = in_array(strtolower((string)($_SESSION['role'] ?? '')), ['admin', 'sales'], true);
if (!$isStaff) {
    unset($car['buying_price'], $car['buyer_name'], $car['buyer_email'], $car['buyer_phone'], $car['buyer_country']);
}
if ($accessLevel === 'free') {
    $key = stock_car_key($car);
    $previewKeys = stock_preview_keys_cached($conn);
    if ($key === null || !isset($previewKeys[$key])) $car = stock_lock_row($car);
}

http_response_code(200);
echo json_encode($car);
$conn->close();
