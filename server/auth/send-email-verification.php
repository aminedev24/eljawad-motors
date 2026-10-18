<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/mailer.php';
require_once __DIR__ . '/../core/email_layout.php';
function generateToken() {
    return bin2hex(random_bytes(32));
}

define('BASE_URL', SITE_URL); // from core/site.php (via mailer.php)

function sendVerificationEmail($userId, $email) {
    global $conn;

    $token = generateToken();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    // Delete any existing tokens
    $conn->query("DELETE FROM email_verifications WHERE user_id = $userId");

    // Insert new token
    $stmt = $conn->prepare("INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $userId, $token, $expiresAt);
    $stmt->execute();
    $stmt->close();

    $verification_link = BASE_URL . "/get_user_email_verification?token=" .$token;

    // Send email using PHPMailer
    $mail = new PHPMailer(true);
    try {
        configureMailer($mail);
        $mail->addAddress($email);
        $mail->isHTML(true);
        $mail->Subject = 'Verify Your Email Address';
        $mail->Body = emailLayout('Confirm your email address', 'Account',
            emailParagraph('Hi there,')
            . emailParagraph('Please confirm your email address to finish setting up your account.')
            . emailButton($verification_link, 'Verify email')
            . emailFallbackLink($verification_link)
            . emailNote('This link expires in 10 minutes. If you did not request it, you can ignore this email.')
            . emailSignoff()
        );

        $mail->send();
        echo json_encode(["status" => "success", "message" => "Verification email sent."]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Failed to send email. " . $mail->ErrorInfo]);
    }
}

// Read the incoming POST JSON data
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['email'])) {
    echo json_encode(["status" => "error", "message" => "No email provided."]);
    exit;
}

$email = $input['email'];

// Check if the email exists in the 'users' table
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // If not found in users table, check the 'customers' table
    $stmt = $conn->prepare("SELECT id FROM customers WHERE email1 = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
}

if ($result->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "User not found."]);
    exit;
}

$row = $result->fetch_assoc();
$userId = $row['id'];

$stmt->close();

// Call the function to send the verification email
sendVerificationEmail($userId, $email);
?>
