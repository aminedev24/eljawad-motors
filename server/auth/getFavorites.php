<?php

// List the logged-in user's saved vehicles. The stored snapshot is enriched
// with live current-stock data (price, status, current image) when the unit
// is still in cars_stock, so badges and prices stay accurate.

session_start();
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../inventory/cars/stock_loader.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Please log in to view saved vehicles.']);
    exit;
}
$userId = (int)$_SESSION['user_id'];

$conn->query("
    CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ref_no VARCHAR(255) NOT NULL,
        make VARCHAR(100) DEFAULT NULL,
        model VARCHAR(100) DEFAULT NULL,
        year VARCHAR(20) DEFAULT NULL,
        price DECIMAL(15,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        image VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_favorite (user_id, ref_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$sql = "SELECT
            f.id AS favorite_id,
            f.ref_no,
            COALESCE(NULLIF(TRIM(c.make), ''), f.make)        AS make,
            COALESCE(NULLIF(TRIM(c.model), ''), f.model)      AS model,
            COALESCE(NULLIF(TRIM(c.year), ''), f.year)        AS year,
            COALESCE(NULLIF(TRIM(c.price), ''), f.price, 0)             AS price,
            COALESCE(NULLIF(TRIM(c.currency), ''), f.currency, 'USD')   AS currency,
            COALESCE(c.image_urls, f.image)                   AS image,
            COALESCE(c.status, '')                            AS status,
            f.created_at
        FROM favorites f
        LEFT JOIN cars_stock c ON c.ref_no COLLATE utf8mb4_general_ci = f.ref_no
        WHERE f.user_id = ?
        ORDER BY f.id DESC";

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare favorites query.']);
    exit;
}
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$vehicles = [];
// Free accounts only see full details for their preview units.
$accessLevel = stock_access_level($conn);
$previewKeys = $accessLevel === 'free' ? stock_preview_keys_cached($conn) : [];
while ($row = $result->fetch_assoc()) {
    if ($accessLevel === 'free' && !isset($previewKeys[strtoupper(trim((string)$row['ref_no']))])) {
        $row['year'] = null;
        $row['price'] = null;
        $row['locked'] = true;
    }
    $vehicles[] = $row;
}

echo json_encode(['status' => 'success', 'vehicles' => $vehicles]);
$conn->close();
