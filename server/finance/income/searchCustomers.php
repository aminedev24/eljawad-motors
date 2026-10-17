<?php
// GET ?search= - staff only. Customer accounts (not staff) for the "Set
// customer" picker, with who is in charge of each.

require_once __DIR__ . '/../../core/headers.php';
mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/income_lib.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if (!income_is_staff()) income_fail('Staff access required', 403);
income_ensure_schema($conn);

$like = '%' . trim((string)($_GET['search'] ?? '')) . '%';
$stmt = $conn->prepare("SELECT u.id, u.full_name, u.email, u.phone, u.country, u.company, u.created_by_admin,
                               s.full_name AS created_by_name
                        FROM users u LEFT JOIN users s ON s.id = u.created_by_admin
                        WHERE u.role NOT IN ('admin','sales')
                          AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.company LIKE ?)
                        ORDER BY u.full_name LIMIT 50");
$stmt->bind_param('ssss', $like, $like, $like, $like);
$stmt->execute();
$users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// Sales only see customers they are in charge of (or nobody is).
if (!income_is_admin()) {
    $me = (int)$_SESSION['user_id'];
    $users = array_values(array_filter($users, fn($u) => $u['created_by_admin'] === null || (int)$u['created_by_admin'] === $me));
}
echo json_encode(['success' => true, 'users' => $users]);
