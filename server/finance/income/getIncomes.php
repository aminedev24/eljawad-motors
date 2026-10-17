<?php
// GET - staff only.
//   ?consume_targets=<deposit id>  the customer's reservations it can be applied to
//   ?search=&filter=unset|set      every income with its consumptions

require_once __DIR__ . '/../../core/headers.php';
mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/income_lib.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if (!income_is_staff()) income_fail('Staff access required', 403);
income_ensure_schema($conn);

if (!empty($_GET['consume_targets'])) {
    $id = (int)$_GET['consume_targets'];
    $stmt = $conn->prepare("SELECT user_id, currency FROM deposits WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $dep = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$dep || $dep['user_id'] === null) income_fail('Set a customer first');

    $stmt = $conn->prepare("SELECT id, vehicle_ref, make, model, agreed_price, amount_paid, amount_remaining, currency, status
                            FROM reserved_vehicles
                            WHERE user_id = ? AND status NOT IN ('cancelled','expired')
                            ORDER BY created_at DESC");
    $stmt->bind_param('i', $dep['user_id']);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    foreach ($rows as &$r) {
        $r['agreed_price'] = income_reservation_price($conn, $r);
        $r['vehicle_name'] = income_vehicle_name($r);
    }
    unset($r);
    echo json_encode(['success' => true, 'reservations' => $rows]);
    exit;
}

$search = trim((string)($_GET['search'] ?? ''));
$filter = (string)($_GET['filter'] ?? '');
$where = [];
$types = '';
$params = [];
if ($search !== '') {
    $like = "%$search%";
    $where[] = "(d.remitter LIKE ? OR d.note LIKE ? OR d.staff LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
    $types .= 'sssss';
    array_push($params, $like, $like, $like, $like, $like);
}
if ($filter === 'unset') $where[] = "d.user_id IS NULL";
if ($filter === 'set')   $where[] = "d.user_id IS NOT NULL";

$sql = "SELECT d.*, u.full_name AS user_name, u.email AS user_email, u.created_by_admin AS user_staff_id,
               ab.full_name AS assigned_by_name,
               COALESCE((SELECT SUM(a.amount) FROM deposit_allocations a WHERE a.deposit_id = d.id), 0) AS consumed
        FROM deposits d
        LEFT JOIN users u  ON d.user_id = u.id
        LEFT JOIN users ab ON d.assigned_by = ab.id"
     . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
     . " ORDER BY d.date DESC, d.id DESC";
$stmt = $conn->prepare($sql);
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$deposits = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$byDeposit = [];
$ids = array_map('intval', array_column($deposits, 'id'));
if ($ids) {
    $res = $conn->query("SELECT a.id, a.deposit_id, a.reservation_id, a.amount, a.percent, a.created_at,
                                r.vehicle_ref, r.make, r.model, r.currency, r.agreed_price, r.amount_paid, r.amount_remaining,
                                s.full_name AS created_by_name
                         FROM deposit_allocations a
                         JOIN reserved_vehicles r ON r.id = a.reservation_id
                         LEFT JOIN users s ON s.id = a.created_by
                         WHERE a.deposit_id IN (" . implode(',', $ids) . ")
                         ORDER BY a.created_at");
    while ($res && ($a = $res->fetch_assoc())) {
        $a['vehicle_name'] = income_vehicle_name($a);
        unset($a['make'], $a['model']);
        $byDeposit[$a['deposit_id']][] = $a;
    }
}
foreach ($deposits as &$d) {
    $d['allocations'] = $byDeposit[$d['id']] ?? [];
    $d['leftover'] = round((float)$d['amount'] - (float)$d['consumed'], 2);
}
unset($d);

echo json_encode(['success' => true, 'deposits' => $deposits]);
