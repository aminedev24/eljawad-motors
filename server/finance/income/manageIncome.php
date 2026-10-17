<?php
// POST JSON {action, ...} - staff only. See income_lib.php for the flow.
//   create / update / delete     admin only
//   set_customer {id, user_id}   staff in charge of that customer
//   unset_customer {id}          admin only, nothing consumed yet
//   consume {id, reservation_id, amount}
//   unconsume {allocation_id}

require_once __DIR__ . '/../../core/headers.php';
mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/csrf.php';
require_once __DIR__ . '/income_lib.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if (!income_is_staff()) income_fail('Staff access required', 403);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') income_fail('Invalid request method', 405);
csrf_validate();

income_ensure_schema($conn);
$data   = json_decode(file_get_contents('php://input'), true) ?: [];
$action = (string)($data['action'] ?? '');
$me     = (int)$_SESSION['user_id'];

if (in_array($action, ['create', 'update', 'delete', 'unset_customer'], true) && !income_is_admin()) {
    income_fail('Only an admin can do this', 403);
}

$exec = function (string $sql, string $types = '', array $params = []) use ($conn) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new RuntimeException($conn->error);
    if ($types !== '') $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) throw new RuntimeException($stmt->error);
    $stmt->close();
};

try {
    if ($action === 'create' || $action === 'update') {
        $currency = in_array($data['currency'] ?? '', ['USD', 'JPY', 'EUR'], true) ? $data['currency'] : 'USD';
        $f = [
            'date'          => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($data['date'] ?? '')) ? $data['date'] : date('Y-m-d'),
            'amount'        => round((float)($data['amount'] ?? 0), 2),
            'currency'      => $currency,
            'bank_fees'     => round((float)($data['bank_fees'] ?? 0), 2),
            'remitter'      => trim((string)($data['remitter'] ?? '')),
            'country'       => trim((string)($data['country'] ?? '')),
            'swift_details' => trim((string)($data['swift_details'] ?? '')),
            'note'          => trim((string)($data['note'] ?? '')),
        ];
        if ($f['amount'] <= 0) income_fail('Amount must be greater than 0');

        if ($action === 'create') {
            // Staff = whoever records the income; not editable afterwards.
            $staff = (string)($_SESSION['full_name'] ?? '');
            $exec("INSERT INTO deposits (date, amount, currency, bank_fees, remitter, country, swift_details, note, staff)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 'sdsdsssss',
                  [$f['date'], $f['amount'], $f['currency'], $f['bank_fees'], $f['remitter'], $f['country'], $f['swift_details'], $f['note'], $staff]);
            $id = (int)$conn->insert_id;
        } else {
            $id = (int)($data['id'] ?? 0);
            $conn->begin_transaction();
            $dep = income_lock_deposit($conn, $id);
            if ((float)$dep['consumed'] > 0) {
                // Amount and currency drive what has already been applied to vehicles.
                if ($f['amount'] < round((float)$dep['consumed'], 2)) {
                    $conn->rollback();
                    income_fail('Amount cannot be lower than what is already consumed (' . $dep['consumed'] . ')');
                }
                if ($f['currency'] !== $dep['currency']) {
                    $conn->rollback();
                    income_fail('Currency cannot change after the income has been consumed');
                }
            }
            $exec("UPDATE deposits SET date = ?, amount = ?, currency = ?, bank_fees = ?, remitter = ?, country = ?, swift_details = ?, note = ? WHERE id = ?",
                  'sdsdssssi', [$f['date'], $f['amount'], $f['currency'], $f['bank_fees'], $f['remitter'], $f['country'], $f['swift_details'], $f['note'], $id]);
            $conn->commit();
        }
        echo json_encode(['success' => true, 'message' => 'Income saved', 'id' => $id]);

    } elseif ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        $conn->begin_transaction();
        $dep = income_lock_deposit($conn, $id);
        if ((float)$dep['consumed'] > 0) {
            $conn->rollback();
            income_fail('This income has been consumed. Undo the consumptions first.');
        }
        $exec("DELETE FROM deposits WHERE id = ?", 'i', [$id]);
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Income deleted']);

    } elseif ($action === 'set_customer') {
        $id = (int)($data['id'] ?? 0);
        $customerId = (int)($data['user_id'] ?? 0);
        if (!$customerId) income_fail('Choose a customer');
        if (!income_in_charge_of($conn, $customerId)) income_fail('You are not in charge of this customer', 403);

        $conn->begin_transaction();
        $dep = income_lock_deposit($conn, $id);
        if ($dep['user_id'] !== null) {
            $conn->rollback();
            income_fail('This income is already set to a customer');
        }
        // name kept in step with the customer for the older profile balance.
        $exec("UPDATE deposits d JOIN users u ON u.id = ?
               SET d.user_id = u.id, d.name = u.full_name, d.assigned_by = ?, d.assigned_at = NOW()
               WHERE d.id = ?", 'iii', [$customerId, $me, $id]);
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Customer set']);

    } elseif ($action === 'unset_customer') {
        $id = (int)($data['id'] ?? 0);
        $conn->begin_transaction();
        $dep = income_lock_deposit($conn, $id);
        if ((float)$dep['consumed'] > 0) {
            $conn->rollback();
            income_fail('This income has been consumed. Undo the consumptions first.');
        }
        $exec("UPDATE deposits SET user_id = NULL, name = NULL, assigned_by = NULL, assigned_at = NULL WHERE id = ?", 'i', [$id]);
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Customer removed']);

    } elseif ($action === 'consume') {
        $id            = (int)($data['id'] ?? 0);
        $reservationId = (int)($data['reservation_id'] ?? 0);
        $amount        = round((float)($data['amount'] ?? 0), 2);
        if ($amount <= 0) income_fail('Amount must be greater than 0');

        $conn->begin_transaction();
        $dep = income_lock_deposit($conn, $id);
        if ($dep['user_id'] === null) { $conn->rollback(); income_fail('Set a customer first'); }
        if (!income_in_charge_of($conn, (int)$dep['user_id'])) { $conn->rollback(); income_fail('You are not in charge of this customer', 403); }

        $stmt = $conn->prepare("SELECT * FROM reserved_vehicles WHERE id = ? FOR UPDATE");
        $stmt->bind_param('i', $reservationId);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$res || (int)$res['user_id'] !== (int)$dep['user_id']) { $conn->rollback(); income_fail('Vehicle not found under this customer'); }
        if (in_array($res['status'], ['cancelled', 'expired'], true)) { $conn->rollback(); income_fail('This reservation is ' . $res['status']); }
        if (($res['currency'] ?: 'USD') !== ($dep['currency'] ?: 'USD')) {
            $conn->rollback();
            income_fail("Currency mismatch: income is {$dep['currency']}, vehicle is {$res['currency']}");
        }
        $price = income_reservation_price($conn, $res);
        if ($price <= 0) { $conn->rollback(); income_fail('This reservation has no price yet'); }

        $leftover  = round((float)$dep['amount'] - (float)$dep['consumed'], 2);
        $remaining = round($price - (float)$res['amount_paid'], 2);
        if ($amount > $leftover)  { $conn->rollback(); income_fail("Only {$dep['currency']} $leftover left on this income"); }
        if ($amount > $remaining) { $conn->rollback(); income_fail("Only {$res['currency']} $remaining remaining on this vehicle"); }

        // The share of the price actually applied (a 50% pick capped by the
        // income leftover is stored as what really went in).
        $percent = round($amount / $price * 100, 2);
        $exec("INSERT INTO deposit_allocations (deposit_id, reservation_id, amount, percent, created_by) VALUES (?, ?, ?, ?, ?)",
              'iiddi', [$id, $reservationId, $amount, $percent, $me]);
        $paid = round((float)$res['amount_paid'] + $amount, 2);
        // A reservation without an agreed price gets the listed price it was paid against.
        $exec("UPDATE reserved_vehicles SET agreed_price = ?, amount_paid = ?, amount_remaining = ? WHERE id = ?",
              'dddi', [$price, $paid, max(0, round($price - $paid, 2)), $reservationId]);
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Consumed']);

    } elseif ($action === 'unconsume') {
        $allocId = (int)($data['allocation_id'] ?? 0);
        $conn->begin_transaction();
        $stmt = $conn->prepare("SELECT * FROM deposit_allocations WHERE id = ? FOR UPDATE");
        $stmt->bind_param('i', $allocId);
        $stmt->execute();
        $alloc = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$alloc) { $conn->rollback(); income_fail('Consumption not found'); }
        $dep = income_lock_deposit($conn, (int)$alloc['deposit_id']);
        if (!income_in_charge_of($conn, (int)$dep['user_id'])) { $conn->rollback(); income_fail('You are not in charge of this customer', 403); }

        $stmt = $conn->prepare("SELECT * FROM reserved_vehicles WHERE id = ? FOR UPDATE");
        $stmt->bind_param('i', $alloc['reservation_id']);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $exec("DELETE FROM deposit_allocations WHERE id = ?", 'i', [$allocId]);
        if ($res) {
            $paid = max(0, round((float)$res['amount_paid'] - (float)$alloc['amount'], 2));
            $exec("UPDATE reserved_vehicles SET amount_paid = ?, amount_remaining = ? WHERE id = ?",
                  'ddi', [$paid, max(0, round((float)$res['agreed_price'] - $paid, 2)), $res['id']]);
        }
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Consumption undone']);

    } else {
        income_fail('Invalid action');
    }
} catch (Throwable $e) {
    $conn->rollback();
    error_log('[manageIncome.php] ' . $action . ': ' . $e->getMessage());
    income_fail('Database error');
}
