<?php
// Income management (ported from ichinomiya-motors):
//
//   1. An admin records a received payment (deposits row, user_id NULL -
//      invisible to every customer).
//   2. Staff in charge of a customer set the payment to that customer.
//   3. Staff "consume" it: apply part of it to one of the customer's
//      reservations (deposit_allocations row), which raises the reservation's
//      amount_paid. Each consumption can be undone.
//
// "In charge" = admin, or the staff account that created the customer
// (users.created_by_admin). Customers nobody created (self-registered) can
// be handled by any staff.

require_once __DIR__ . '/../../core/db_migrations.php';

function income_is_staff(): bool
{
    return !empty($_SESSION['user_id']) && in_array($_SESSION['role'] ?? '', ['admin', 'sales'], true);
}

function income_is_admin(): bool
{
    return !empty($_SESSION['user_id']) && ($_SESSION['role'] ?? '') === 'admin';
}

function income_fail(string $msg, int $code = 200): void
{
    if ($code !== 200) http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function income_column(mysqli $conn, string $table, string $column): ?array
{
    $stmt = $conn->prepare("SELECT DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    $stmt->bind_param('ss', $table, $column);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

// Idempotent: brings the older deposits/reserved_vehicles/users tables up to
// what income management needs. Cheap after the first run (a few
// information_schema lookups).
function income_ensure_schema(mysqli $conn): void
{
    static $done = false;
    if ($done) return;
    $done = true;

    // deposits.user_id used to hold the admin who typed the row in, and the
    // customer was only linked through deposits.name = users.full_name. The
    // first run (when assigned_at is added) re-links old rows by that name.
    $firstRun = income_column($conn, 'deposits', 'assigned_at') === null;
    ensure_columns($conn, 'deposits', [
        'assigned_by' => 'INT NULL DEFAULT NULL',
        'assigned_at' => 'DATETIME NULL DEFAULT NULL',
    ]);
    if ($firstRun) {
        $conn->query("UPDATE deposits d LEFT JOIN users u ON u.full_name = d.name SET d.user_id = u.id");
    }

    // Amounts with cents, and optional fields that used to be NOT NULL with no
    // default (which made inserts from the old form fail).
    if ((income_column($conn, 'deposits', 'amount')['DATA_TYPE'] ?? '') !== 'decimal') {
        $conn->query("ALTER TABLE deposits
            MODIFY amount DECIMAL(15,2) NOT NULL DEFAULT 0,
            MODIFY bank_fees DECIMAL(15,2) NOT NULL DEFAULT 0,
            MODIFY name VARCHAR(100) NULL DEFAULT NULL,
            MODIFY remitter VARCHAR(255) NOT NULL DEFAULT '',
            MODIFY country VARCHAR(100) NOT NULL DEFAULT '',
            MODIFY consumption_type VARCHAR(50) NULL DEFAULT NULL,
            MODIFY consumption_value VARCHAR(255) NULL DEFAULT NULL,
            MODIFY swift_details TEXT NULL,
            MODIFY currency VARCHAR(10) NOT NULL DEFAULT 'USD'");
    }

    // Deleting a customer must not delete the payments they made.
    $fk = $conn->query("SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
                        WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'deposits' AND CONSTRAINT_NAME = 'fk_user_name'");
    if ($fk && ($row = $fk->fetch_row()) && $row[0] === 'CASCADE') {
        $conn->query("ALTER TABLE deposits DROP FOREIGN KEY fk_user_name");
        $conn->query("ALTER TABLE deposits ADD CONSTRAINT fk_user_name FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
    }

    ensure_columns($conn, 'reserved_vehicles', [
        'currency'         => "VARCHAR(10) NOT NULL DEFAULT 'USD'",
        'amount_paid'      => 'DECIMAL(15,2) NOT NULL DEFAULT 0',
        'amount_remaining' => 'DECIMAL(15,2) NULL DEFAULT NULL',
    ]);
    ensure_columns($conn, 'users', ['created_by_admin' => 'INT NULL DEFAULT NULL']);

    $idType = income_column($conn, 'deposits', 'id')['DATA_TYPE'] ?? 'bigint';
    $depositIdType = $idType === 'bigint' ? 'BIGINT UNSIGNED' : 'INT';
    $conn->query("CREATE TABLE IF NOT EXISTS deposit_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        deposit_id $depositIdType NOT NULL,
        reservation_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        percent DECIMAL(5,2) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_deposit (deposit_id),
        INDEX idx_reservation (reservation_id),
        CONSTRAINT fk_alloc_deposit FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE RESTRICT,
        CONSTRAINT fk_alloc_reservation FOREIGN KEY (reservation_id) REFERENCES reserved_vehicles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

// Admin, or the staff account that created this customer, or anyone when
// nobody did.
function income_in_charge_of(mysqli $conn, int $customerId): bool
{
    if (income_is_admin()) return true;
    $stmt = $conn->prepare("SELECT created_by_admin FROM users WHERE id = ? AND role NOT IN ('admin','sales')");
    $stmt->bind_param('i', $customerId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) return false;
    return $row['created_by_admin'] === null || (int)$row['created_by_admin'] === (int)$_SESSION['user_id'];
}

function income_vehicle_name(array $r): string
{
    return trim(($r['make'] ?? '') . ' ' . ($r['model'] ?? '')) ?: (string)($r['vehicle_ref'] ?? '');
}

// The reservation's price: its agreed price, or the listed price of the car
// it reserves (curated stock or catalog) when no price was agreed.
function income_reservation_price(mysqli $conn, array $res): float
{
    if ((float)($res['agreed_price'] ?? 0) > 0) return (float)$res['agreed_price'];
    $ref = (string)($res['vehicle_ref'] ?? '');
    if ($ref === '') return 0.0;
    $stmt = $conn->prepare("SELECT price FROM cars_stock WHERE ref_no = ? LIMIT 1");
    if ($stmt) {
        $stmt->bind_param('s', $ref);
        $stmt->execute();
        $price = (float)preg_replace('/[^\d.]/', '', (string)($stmt->get_result()->fetch_row()[0] ?? ''));
        $stmt->close();
        if ($price > 0) return $price;
    }
    if (preg_match('/^SA-?(\d+)$/i', $ref, $m)) {
        $stmt = $conn->prepare("SELECT price_usd FROM ichinomiya_catalog WHERE sa_no = ? LIMIT 1");
        if ($stmt) {
            $saNo = (int)$m[1];
            $stmt->bind_param('i', $saNo);
            $stmt->execute();
            $price = (float)($stmt->get_result()->fetch_row()[0] ?? 0);
            $stmt->close();
            if ($price > 0) return $price;
        }
    }
    return 0.0;
}

// Locks and returns a deposit with what has been consumed from it so far.
function income_lock_deposit(mysqli $conn, int $id): array
{
    $stmt = $conn->prepare("SELECT d.*, COALESCE((SELECT SUM(a.amount) FROM deposit_allocations a WHERE a.deposit_id = d.id), 0) AS consumed
                            FROM deposits d WHERE d.id = ? FOR UPDATE");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $dep = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$dep) {
        $conn->rollback();
        income_fail('Income not found');
    }
    return $dep;
}
