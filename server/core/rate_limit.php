<?php
// Per-visitor request limits for endpoints that hand out stock data, so the
// catalog can't be copied wholesale by a script. A visitor is their account
// when logged in, otherwise their IP address; staff are never limited.
//
// Over the limit the request gets HTTP 429 and is logged once per window in
// rate_limit_log (who, which endpoint, when), so scraping attempts show up.

require_once __DIR__ . '/db_migrations.php';

function rate_limit_ensure_schema(mysqli $conn): void
{
    static $done = false;
    if ($done) return;
    $conn->query("CREATE TABLE IF NOT EXISTS `rate_limits` (
        `bucket` varchar(30) NOT NULL,
        `ident` varchar(80) NOT NULL,
        `window_key` varchar(20) NOT NULL,
        `hits` int unsigned NOT NULL DEFAULT 0,
        `updated_at` datetime NOT NULL,
        PRIMARY KEY (`bucket`, `ident`, `window_key`),
        KEY `updated_at` (`updated_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $conn->query("CREATE TABLE IF NOT EXISTS `rate_limit_log` (
        `id` int unsigned NOT NULL AUTO_INCREMENT,
        `bucket` varchar(30) NOT NULL,
        `ident` varchar(80) NOT NULL,
        `ip` varchar(45) NOT NULL DEFAULT '',
        `user_email` varchar(255) NOT NULL DEFAULT '',
        `window_key` varchar(20) NOT NULL,
        `limit_hit` int unsigned NOT NULL,
        `created_at` datetime NOT NULL,
        PRIMARY KEY (`id`),
        KEY `created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $done = true;
}

// Call after the session has been read (e.g. after stock_access_level()).
// $limits: ['minute' => 60, 'hour' => 600]
function rate_limit(mysqli $conn, string $bucket, array $limits): void
{
    $session = $_SESSION ?? []; // not set for visitors without a session cookie
    $role = strtolower((string)($session['role'] ?? ''));
    if (in_array($role, ['admin', 'sales'], true)) return;

    rate_limit_ensure_schema($conn);
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $ident = !empty($session['user_id']) ? 'user:' . (int)$session['user_id'] : 'ip:' . $ip;
    $now = time();
    $spans = ['minute' => 60, 'hour' => 3600];

    foreach ($limits as $span => $max) {
        $seconds = $spans[$span] ?? 60;
        $windowKey = $span[0] . intdiv($now, $seconds);
        $stmt = $conn->prepare("INSERT INTO rate_limits (bucket, ident, window_key, hits, updated_at)
                                VALUES (?, ?, ?, 1, NOW())
                                ON DUPLICATE KEY UPDATE hits = hits + 1, updated_at = NOW()");
        if (!$stmt) return; // never block visitors because the limiter itself failed
        $stmt->bind_param('sss', $bucket, $ident, $windowKey);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("SELECT hits FROM rate_limits WHERE bucket = ? AND ident = ? AND window_key = ?");
        $stmt->bind_param('sss', $bucket, $ident, $windowKey);
        $stmt->execute();
        $hits = (int)($stmt->get_result()->fetch_row()[0] ?? 0);
        $stmt->close();

        if ($hits > $max) {
            if ($hits === $max + 1) {
                $email = (string)($session['email'] ?? '');
                $log = $conn->prepare("INSERT INTO rate_limit_log (bucket, ident, ip, user_email, window_key, limit_hit, created_at)
                                       VALUES (?, ?, ?, ?, ?, ?, NOW())");
                if ($log) {
                    $log->bind_param('sssssi', $bucket, $ident, $ip, $email, $windowKey, $max);
                    $log->execute();
                    $log->close();
                }
            }
            $retry = $seconds - ($now % $seconds);
            http_response_code(429);
            header("Retry-After: $retry");
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Too many requests. Please slow down and try again shortly.', 'retry_after' => $retry]);
            exit;
        }
    }

    // Old counters are useless after an hour; prune now and then.
    if (random_int(1, 200) === 1) $conn->query("DELETE FROM rate_limits WHERE updated_at < NOW() - INTERVAL 2 HOUR");
}
