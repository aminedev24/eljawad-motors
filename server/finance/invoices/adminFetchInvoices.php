<?php
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/headers.php';
require_once __DIR__ . '/invoice_schema.php';

session_start();
invoice_require_staff();
ensure_invoice_columns($conn);

$sql = "SELECT i.*, u.full_name AS created_by_name
        FROM invoices i
        LEFT JOIN users u ON u.id = i.created_by
        ORDER BY i.created_at DESC, i.id DESC";
$result = $conn->query($sql);

$invoices = [];
while ($row = $result->fetch_assoc()) {
    $row['status'] = $row['status'] ?: 'sent';
    $invoices[] = $row;
}

header('Content-Type: application/json');
echo json_encode($invoices);
$conn->close();
