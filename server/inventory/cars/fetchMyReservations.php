<?php

// Customer-facing reservations & orders for the logged-in user's profile.
// Mirrors ichinomiya's "My Reservations" / "My Orders" tabs:
//   reservations = active holds (reserved / pending_payment)
//   orders       = anything progressed past the hold stage

session_start();
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/db_migrations.php';
require_once __DIR__ . '/../../core/headers.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Please log in to view your reservations."]);
    exit;
}
$userId = (int)$_SESSION['user_id'];

// Release holds that expired so the customer profile shows them as orders
// instead of active reservations.
require_once __DIR__ . '/reservation_helpers.php';
releaseExpiredReservations($conn);

// Guard columns added by other reservation paths so this always works
// regardless of which script created the table first.
ensure_columns($conn, 'reserved_vehicles', [
    'agreed_price' => 'DECIMAL(15,2) DEFAULT 0',
    'expires_at' => 'DATETIME DEFAULT NULL',
]);
// amount_paid / payments come from income management (deposit_allocations).
require_once __DIR__ . '/../../finance/income/income_lib.php';
require_once __DIR__ . '/../catalog/catalog_lib.php';
income_ensure_schema($conn);

$sql = "SELECT
            rv.id,
            rv.vehicle_ref,
            rv.make,
            rv.model,
            rv.destination_country,
            rv.deposit_amount,
            rv.deposit_currency,
            rv.payment_plan,
            COALESCE(NULLIF(rv.agreed_price, 0), c.price, 0) AS price,
            COALESCE(c.currency, rv.deposit_currency, 'USD') AS currency,
            rv.expires_at,
            rv.status,
            rv.amount_paid,
            rv.amount_remaining,
            rv.currency AS payment_currency,
            rv.created_at,
            c.status AS vehicle_status,
            c.image_urls AS image
        FROM reserved_vehicles rv
        LEFT JOIN cars_stock c ON c.ref_no COLLATE utf8mb4_general_ci = rv.vehicle_ref
        WHERE rv.user_id = ?
        ORDER BY rv.id DESC";

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to prepare reservations query."]);
    exit;
}
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$rows = $result->fetch_all(MYSQLI_ASSOC);

// Payments applied to each reservation by staff (income management).
$payments = [];
$ids = array_map('intval', array_column($rows, 'id'));
if ($ids) {
    $res = $conn->query("SELECT a.reservation_id, a.amount, a.created_at, d.date AS income_date, d.remitter
                         FROM deposit_allocations a JOIN deposits d ON d.id = a.deposit_id
                         WHERE a.reservation_id IN (" . implode(',', $ids) . ") ORDER BY a.created_at");
    while ($res && ($p = $res->fetch_assoc())) $payments[$p['reservation_id']][] = $p;
}

$reservations = [];
$orders = [];
foreach ($rows as $row) {
    $row['currency'] = $row['currency'] ?: 'USD';
    $row['price'] = (float)($row['price'] ?? 0);
    $row['deposit_amount'] = (float)($row['deposit_amount'] ?? 0);
    // Paid / remaining are tracked in the reservation's own currency.
    $row['payment_currency'] = $row['payment_currency'] ?: 'USD';
    $row['agreed_price'] = $row['price'];
    $row['amount_paid'] = (float)($row['amount_paid'] ?? 0);
    $row['amount_remaining'] = $row['amount_remaining'] !== null
        ? (float)$row['amount_remaining']
        : max(0, $row['price'] - $row['amount_paid']);
    $row['payments'] = $payments[$row['id']] ?? [];
    // Catalog cars (SA-xxxxxx) aren't in cars_stock: photo via our image proxy.
    if (empty($row['image']) && catalog_parse_sa((string)$row['vehicle_ref']) !== null
        && ($catalogRow = catalog_find($conn, (string)$row['vehicle_ref']))) {
        $row['image'] = json_encode([catalog_image_url($catalogRow, 0)], JSON_UNESCAPED_SLASHES);
    }

    $status = $row['status'] ?? 'reserved';
    if (in_array($status, ['reserved', 'pending_payment'], true)) {
        $reservations[] = $row;
    } else {
        $orders[] = $row;
    }
}

echo json_encode([
    "status" => "success",
    "reservations" => $reservations,
    "orders" => $orders,
]);
$conn->close();
