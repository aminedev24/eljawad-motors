<?php
session_start();
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../core/mailer.php';
require_once __DIR__ . '/../core/email_layout.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

define('BASE_URL', SITE_URL); // from core/site.php (via mailer.php)

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);

if (!$email) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email is required."]);
    exit;
}

$stmt = $conn->prepare("SELECT id, uid, full_name, role FROM users WHERE email = ? AND role = 'admin'");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $stmt->bind_result($id, $uid, $fullName, $role);
    $stmt->fetch();

    $token = bin2hex(random_bytes(16));
    $verificationCode = random_int(100000, 999999);

    $updateStmt = $conn->prepare("UPDATE users SET verification_token = ?, verification_code = ?, verification_attempts = 0 WHERE id = ?");
    $updateStmt->bind_param("ssi", $token, $verificationCode, $id);
    $updateStmt->execute();
    $updateStmt->close();

    sendVerificationEmail($email, $fullName, $token, $verificationCode);

    echo json_encode(["status" => "success", "message" => "Verification code resent."]);
} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "User not found or not admin."]);
}

$stmt->close();
$conn->close();

function sendVerificationEmail($email, $fullName, $token, $verificationCode) {
    $mail = new PHPMailer(true);
    try {
        configureMailer($mail);
        $mail->addAddress($email, $fullName);
        $mail->isHTML(true);
        $mail->Subject = 'Verify Your Email Address';

        $verificationLink = BASE_URL . '/verify_email?token=' . $token;
        $mail->Body = emailLayout('Verify your email to sign in', 'Account security',
            emailParagraph('Hello <strong>' . emailEsc($fullName) . '</strong>,')
            . emailParagraph('Confirm your email address to complete your login:')
            . emailButton($verificationLink, 'Verify email')
            . emailParagraph('Or enter this code on the login page:')
            . emailCode((string)$verificationCode)
            . emailNote('If you did not try to log in, you can ignore this email.')
            . emailSignoff()
        );
        $mail->AltBody = "Hello {$fullName},\n\nPlease verify your email address by visiting: {$verificationLink}\nOr enter this code: {$verificationCode}";

        $mail->send();
    } catch (Exception $e) {
        error_log("Verification email could not be sent. Mailer Error: {$mail->ErrorInfo}");
    }
}
?>
