<?php
session_start();
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/headers.php';

// Every buyer's name, email and contact details: staff only (it used to
// accept any logged-in account, customers included).
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'] ?? '', ['admin', 'sales'], true)) {
    http_response_code(403);
    echo json_encode(["error" => "Not authorized."]);
    exit;
}

// Release holds that expired so the reservations list stays accurate.
require_once __DIR__ . '/reservation_helpers.php';
releaseExpiredReservations($conn);

try {
    $sql = "SELECT
                rv.id,
                rv.vehicle_ref AS ref_no,
                rv.make,
                rv.model,
                rv.user_full_name AS buyer_name,
                rv.user_email AS buyer_email,
                rv.destination_country AS buyer_country,
                rv.deposit_amount AS amount_paid,
                rv.deposit_currency AS currency,
                COALESCE(NULLIF(rv.agreed_price, 0), c.price) AS price,
                c.currency AS stock_currency,
                rv.expires_at,
                rv.status,
                rv.created_at,
                c.status AS vehicle_status,
                rv.user_id,
                rv.port AS destination_port,
                rv.inspection_required,
                rv.payment_plan,
                u.phone AS buyer_phone,
                u.address AS buyer_address,
                u.company AS buyer_company,
                u.country AS buyer_home_country,
                c.chassis_no,
                c.engine_capacity,
                c.mileage,
                c.year
            FROM reserved_vehicles rv
            LEFT JOIN cars_stock c ON c.ref_no COLLATE utf8mb4_general_ci = rv.vehicle_ref
            LEFT JOIN users u ON u.id = rv.user_id
            WHERE rv.status = 'reserved'
            ORDER BY rv.id DESC";

    $result = $conn->query($sql);

    $reservations = [];
    while ($row = $result->fetch_assoc()) {
        $row['currency'] = $row['currency'] ?: ($row['stock_currency'] ?: 'USD');
        $row['price'] = $row['price'] ?? 0;
        $row['amount_paid'] = $row['amount_paid'] ?? 0;
        unset($row['stock_currency']);
        $reservations[] = $row;
    }

    echo json_encode($reservations);
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
