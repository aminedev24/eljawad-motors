<?php
// GET - the logged-in customer's payments ("My Payments"). Only incomes a
// staff member has set to this customer are visible; internal fields (SWIFT
// details, notes, staff) are never sent.

require_once __DIR__ . '/../../core/headers.php';
mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/income_lib.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if (empty($_SESSION['user_id'])) income_fail('Login required', 401);
income_ensure_schema($conn);
$userId = (int)$_SESSION['user_id'];

$stmt = $conn->prepare("SELECT d.id, d.date, d.amount, d.currency, d.bank_fees, d.remitter, d.country,
                               COALESCE((SELECT SUM(a.amount) FROM deposit_allocations a WHERE a.deposit_id = d.id), 0) AS consumed
                        FROM deposits d WHERE d.user_id = ? ORDER BY d.date DESC, d.id DESC");
$stmt->bind_param('i', $userId);
$stmt->execute();
$incomes = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$byDeposit = [];
$ids = array_map('intval', array_column($incomes, 'id'));
if ($ids) {
    $res = $conn->query("SELECT a.deposit_id, a.amount, a.created_at, r.vehicle_ref, r.make, r.model
                         FROM deposit_allocations a JOIN reserved_vehicles r ON r.id = a.reservation_id
                         WHERE a.deposit_id IN (" . implode(',', $ids) . ") ORDER BY a.created_at");
    while ($res && ($a = $res->fetch_assoc())) {
        $byDeposit[$a['deposit_id']][] = [
            'amount'       => $a['amount'],
            'date'         => $a['created_at'],
            'vehicle_ref'  => $a['vehicle_ref'],
            'vehicle_name' => income_vehicle_name($a),
        ];
    }
}

$totals = [];
foreach ($incomes as &$d) {
    $d['leftover'] = round((float)$d['amount'] - (float)$d['consumed'], 2);
    $d['allocations'] = $byDeposit[$d['id']] ?? [];
    $cur = $d['currency'] ?: 'USD';
    $totals[$cur] ??= ['currency' => $cur, 'received' => 0, 'consumed' => 0, 'leftover' => 0];
    $totals[$cur]['received'] += (float)$d['amount'];
    $totals[$cur]['consumed'] += (float)$d['consumed'];
    $totals[$cur]['leftover'] += $d['leftover'];
}
unset($d);

echo json_encode(['success' => true, 'incomes' => $incomes, 'totals' => array_values($totals)]);
