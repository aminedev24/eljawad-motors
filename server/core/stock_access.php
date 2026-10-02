<?php
// Stock visibility tiers. The catalog is gated server-side — the frontend
// only renders what these helpers let through, so nothing hidden here can be
// recovered from the network tab.
//
//   guest — not logged in: every row is locked (one photo + make/model only).
//           The stock pages themselves sit behind a login wall.
//   free  — self-registered customer not yet activated by staff: the
//           STOCK_FREE_PREVIEW_COUNT newest available units in full, the rest locked.
//   full  — activated customer, admin-created customer record, or staff.
//
// users.stock_access holds 'free' | 'full'. The column defaults to 'full' so
// accounts that existed before this gate keep full access; signup.php inserts
// new self-registrations as 'free', and an admin flips them to 'full'.

require_once __DIR__ . '/db_migrations.php';

const STOCK_FREE_PREVIEW_COUNT = 20;

function stock_access_ensure_schema(mysqli $conn): void
{
    static $done = false;
    if ($done) return;
    ensure_columns($conn, 'users', [
        'stock_access' => "VARCHAR(10) NOT NULL DEFAULT 'full'",
        'stock_access_updated_at' => 'DATETIME NULL DEFAULT NULL',
    ]);
    $done = true;
}

function stock_access_level(mysqli $conn): string
{
    if (session_status() === PHP_SESSION_NONE) {
        // No session cookie means a logged-out visitor; don't create a session for them.
        if (empty($_COOKIE[session_name()])) return 'guest';
        // Read-only: the stock response is large and slow, so don't hold the
        // session lock for its whole duration.
        session_start(['read_and_close' => true]);
    }
    if (empty($_SESSION['user_id'])) return 'guest';

    $role = strtolower((string)($_SESSION['role'] ?? ''));
    if (in_array($role, ['admin', 'sales'], true)) return 'full';
    // Customer records are created by staff, so they're activated by definition.
    if (($_SESSION['auth_source'] ?? '') === 'customers') return 'full';

    $userId = (int)$_SESSION['user_id'];
    $email = (string)($_SESSION['email'] ?? '');

    stock_access_ensure_schema($conn);
    $stmt = $conn->prepare("SELECT stock_access FROM users WHERE id = ? AND email = ? LIMIT 1");
    if ($stmt) {
        $stmt->bind_param('is', $userId, $email);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($row) return $row['stock_access'] === 'full' ? 'full' : 'free';
    }

    // Sessions started before auth_source existed: fall back to the customers table.
    $stmt = $conn->prepare("SELECT 1 FROM customers WHERE id = ? AND email1 = ? LIMIT 1");
    if ($stmt) {
        $stmt->bind_param('is', $userId, $email);
        $stmt->execute();
        $isCustomer = (bool)$stmt->get_result()->fetch_row();
        $stmt->close();
        if ($isCustomer) return 'full';
    }
    return 'guest';
}

// Same identity used to dedupe rows in the stock loader.
function stock_car_key(array $row): ?string
{
    foreach (['ref_no', 'chassis_no', 'id'] as $field) {
        $value = trim((string)($row[$field] ?? ''));
        if ($value !== '') return strtoupper($value);
    }
    return null;
}

function stock_is_available(array $row): bool
{
    $status = strtolower(trim((string)($row['status'] ?? '')));
    return $status !== 'reserved' && !str_starts_with($status, 'sold');
}

// Mirrors getCarRecency() in stockListV2.js: ship_date, falling back to model year.
function stock_recency(array $row): int
{
    $shipped = strtotime((string)($row['ship_date'] ?? ''));
    if ($shipped !== false && !empty($row['ship_date'])) return $shipped;
    $year = (int)($row['year'] ?? 0);
    return $year > 0 ? (int)mktime(0, 0, 0, 1, 1, $year) : 0;
}

// Keys of the newest available units a free account sees in full.
function stock_free_preview_keys(array $cars, int $limit = STOCK_FREE_PREVIEW_COUNT): array
{
    $available = array_values(array_filter($cars, 'stock_is_available'));
    usort($available, fn($a, $b) => stock_recency($b) <=> stock_recency($a));
    $keys = [];
    foreach ($available as $row) {
        $key = stock_car_key($row);
        if ($key === null || isset($keys[$key])) continue;
        $keys[$key] = true;
        if (count($keys) >= $limit) break;
    }
    return $keys;
}

function stock_first_image(array $row): ?string
{
    foreach (['image_urls', 'images'] as $field) {
        $value = $row[$field] ?? null;
        if (is_array($value)) {
            $list = $value;
        } else {
            $value = trim((string)$value);
            if ($value === '' || $value === '[]' || strtolower($value) === 'null') continue;
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $list = $decoded;
            } elseif (preg_match('#https?:\\\\?/\\\\?/[^\s"\']+#i', $value, $m)) {
                $list = [str_replace('\\/', '/', $m[0])];
            } else {
                $list = [$value];
            }
        }
        foreach ($list as $item) {
            if (is_string($item) && trim($item) !== '') return trim($item);
        }
    }
    return null;
}

// Strip a row down to what a locked card may show.
function stock_lock_row(array $row): array
{
    $image = stock_first_image($row);
    return [
        'id'         => $row['id'] ?? null,
        'ref_no'     => $row['ref_no'] ?? null,
        'stock_no'   => $row['stock_no'] ?? null,
        'make'       => $row['make'] ?? '',
        'model'      => $row['model'] ?? '',
        'status'     => $row['status'] ?? '',
        'image_urls' => json_encode($image ? [$image] : []),
        'locked'     => true,
    ];
}

function stock_apply_access(array $cars, string $level, ?array $previewKeys = null): array
{
    if ($level === 'full') return $cars;
    if ($level === 'free' && $previewKeys === null) $previewKeys = stock_free_preview_keys($cars);
    $out = [];
    foreach ($cars as $row) {
        $key = stock_car_key($row);
        $unlocked = $level === 'free' && $key !== null && isset($previewKeys[$key]);
        $out[] = $unlocked ? $row : stock_lock_row($row);
    }
    return $out;
}
