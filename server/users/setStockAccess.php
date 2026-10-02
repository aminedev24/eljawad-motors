<?php
// Staff switch for a self-registered customer's stock access tier
// ('free' preview or 'full' catalog — see core/stock_access.php).
// POST JSON { user_id, access: 'full' | 'free' }. Activating emails the customer.
session_start();
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/csrf.php';
require_once __DIR__ . '/../core/stock_access.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../core/mailer.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'] ?? '', ['admin', 'sales'], true)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized']);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}
csrf_validate();

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$userId = (int)($data['user_id'] ?? 0);
$access = $data['access'] ?? '';
if ($userId <= 0 || !in_array($access, ['free', 'full'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid input']);
    exit;
}

stock_access_ensure_schema($conn);

$stmt = $conn->prepare("SELECT full_name, email, stock_access FROM users WHERE id = ?");
$stmt->bind_param('i', $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$user) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'User not found']);
    exit;
}

$stmt = $conn->prepare("UPDATE users SET stock_access = ?, stock_access_updated_at = NOW() WHERE id = ?");
$stmt->bind_param('si', $access, $userId);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to update access']);
    exit;
}
$stmt->close();

$emailed = false;
if ($access === 'full' && $user['stock_access'] !== 'full') {
    $emailed = notifyActivated($user['full_name'], $user['email']);
}

echo json_encode(['status' => 'success', 'stock_access' => $access, 'emailed' => $emailed]);
$conn->close();

function notifyActivated(string $fullName, string $email): bool
{
    $name = htmlspecialchars($fullName ?: 'there', ENT_QUOTES, 'UTF-8');
    $stockUrl = SITE_URL . '/stock-list';
    $mail = new PHPMailer(true);
    try {
        configureMailer($mail);
        $mail->addAddress($email, $fullName);
        $mail->addReplyTo(siteContactEmail(), SITE_NAME);
        $mail->isHTML(true);
        $mail->Subject = 'Your ' . SITE_NAME . ' account is activated';
        $mail->Body = "<p>Hi {$name},</p>"
            . "<p>Your account now has full access to our stock: every vehicle with photos, specifications and prices.</p>"
            . "<p><a href=\"{$stockUrl}\">Browse the full stock</a></p>"
            . "<p>Questions? Just reply to this email.</p><p>" . SITE_NAME . "</p>";
        $mail->AltBody = "Hi " . ($fullName ?: 'there') . ",\n\nYour account now has full access to our stock.\n\nBrowse it here: {$stockUrl}\n\n" . SITE_NAME;
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('Activation email failed: ' . $e->getMessage());
        return false;
    }
}
