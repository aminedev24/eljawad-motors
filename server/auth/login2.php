<?php
session_set_cookie_params([
    'lifetime' => 42000,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Strict',
]);
ini_set('session.gc_maxlifetime', 42000);
session_start();

require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/csrf.php';
require_once __DIR__ . '/../core/stock_access.php';

require_once __DIR__ . '/../vendor/autoload.php';   // <-- fixes missing file
require_once __DIR__ . '/../core/mailer.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

define('BASE_URL', SITE_URL); // from core/site.php (via mailer.php)

header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Invalid request method."]);
    exit;
}

csrf_validate();

$email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
$password = $_POST['password'] ?? '';

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    exit;
}

$user = null;
$passwordCorrect = false;
$role = null;

// 🔍 Check users table
$stmt = $conn->prepare("SELECT id, uid, full_name, email, role, is_verified, verification_token, password FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $stmt->bind_result($id, $uid, $fullName, $emailFromDb, $role, $isVerified, $verificationToken, $hashedPassword);
    $stmt->fetch();
    $passwordCorrect = password_verify($password, $hashedPassword);

    if ($passwordCorrect) {
        $user = [
            "source" => "users",
            "id" => $id,
            "uid" => $uid,
            "name" => $fullName,
            "email" => $emailFromDb,
            "role" => $role,
            "is_verified" => $isVerified,
            "verification_token" => $verificationToken
        ];
    }
}

$stmt->close();

// 🔍 If not found in users, check customers
if (!$passwordCorrect) {
    $stmt = $conn->prepare("SELECT id, customer_id, customer_name, email1, role, password FROM customers WHERE email1 = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        $stmt->bind_result($id, $customer_id, $customer_name, $emailFromDb, $role, $hashedPassword);
        $stmt->fetch();
        $passwordCorrect = password_verify($password, $hashedPassword);

        if ($passwordCorrect) {
            $user = [
                "source" => "customers",
                "id" => $id,
                "uid" => $customer_id,
                "name" => $customer_name,
                "email" => $emailFromDb,
                "role" => $role,
                "is_verified" => true,
                "verification_token" => null
            ];
        }
    }

    $stmt->close();
}

// ❌ If no match or incorrect password
if (!$passwordCorrect || !$user) {
    usleep(50000); // mitigate timing attacks
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    exit;
}

// Local development only: skip the emailed admin code under PHP's built-in
// server (`php -S`, as used by `npm run dev:php` / `dev:full`). PHP_SAPI is
// 'cli-server' only there - never under Apache/LiteSpeed on HostGator - and,
// unlike the Host header, a client can't spoof it.
$skipAdminEmailCode = PHP_SAPI === 'cli-server';

// 🔐 Handle Admin Verification (only for users)
if (!$skipAdminEmailCode && $user['role'] === 'admin' && $user['source'] === 'users' && (!isset($_SESSION['admin_verified']) || $_SESSION['admin_verified'] !== true)) {
    $token = bin2hex(random_bytes(16));
    $verificationCode = random_int(100000, 999999); // 6-digit code

    $updateStmt = $conn->prepare("UPDATE users SET verification_token = ?, verification_code = ?, verification_attempts = 0 WHERE id = ?");
    $updateStmt->bind_param("ssi", $token, $verificationCode, $user['id']);
    $updateStmt->execute();
    $updateStmt->close();

    sendVerificationEmail($user['email'], $user['name'], $token, $verificationCode);

    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Email verification required. Check your inbox."]);
    exit;
}

// ✅ Set Session
session_regenerate_id();
$_SESSION['user_id'] = $user['id'];
$_SESSION['full_name'] = $user['name'];
$_SESSION['uid'] = $user['uid'];
$_SESSION['email'] = $user['email'];
$_SESSION['role'] = $user['role'];
$_SESSION['auth_source'] = $user['source'];

$updateSession = $conn->prepare("
    INSERT INTO user_sessions (uid, user_name, user_id, is_logged_in, last_login)
    VALUES (?, ?, ?, TRUE, NOW())
    ON DUPLICATE KEY UPDATE is_logged_in = TRUE, last_login = NOW()
");
$updateSession->bind_param("ssi", $user['uid'], $user['name'], $user['id']);
$updateSession->execute();
$updateSession->close();

// 🎉 Return Success
http_response_code(200);
echo json_encode([
    "status" => "success",
    "message" => "Login successful.",
    "user" => [
        "id" => $user['id'],
        "uid" => $user['uid'],
        "name" => $user['name'],
        "email" => $user['email'],
        "role" => $user['role'],
        "source" => $user['source'],
        "stock_access" => stock_access_level($conn)
    ]
]);

$conn->close();


function sendVerificationEmail($email, $fullName, $token, $verificationCode) {
    $mail = new PHPMailer(true);
    try {
        configureMailer($mail);
        $mail->addAddress($email, $fullName);
        $mail->isHTML(true);
        $mail->Subject = 'Verify Your Email Address';

        $verificationLink = BASE_URL . '/verify_email?token=' . $token;
        $mail->Body = "
            <p>Hello {$fullName},</p>
            <p>Please click the link below to verify your email address and complete your login:</p>
            <p><a href='{$verificationLink}'>Verify Email</a></p>
            <p>Or enter this verification code: <b>{$verificationCode}</b></p>
            <p>If you did not attempt to log in, please ignore this email.</p>
        ";
        $mail->AltBody = "Hello {$fullName},\n\nPlease verify your email address by visiting: {$verificationLink}\nOr enter this code: {$verificationCode}";

        $mail->send();
    } catch (Exception $e) {
        error_log("Verification email could not be sent. Mailer Error: {$mail->ErrorInfo}");
    }
}
?>
