<?php

// Set the session garbage collection max lifetime to 600 seconds (10 minutes)
ini_set('session.gc_maxlifetime', 600);

// Set the session cookie parameters so that the cookie itself expires in 600 seconds
session_set_cookie_params(600);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';   


session_start();
//header("Content-Type: application/json");
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/mailer.php';
require_once __DIR__ . '/../core/email_layout.php';

// Get the POST data as JSON
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['email']) || !isset($data['fullName'])) {
    echo json_encode(['success' => false, 'error' => 'Email and name are required.']);
    exit;
}

$email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
$fullName = filter_var($data['fullName'], FILTER_SANITIZE_STRING);

// Check if the email already exists in the database
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(['success' => false, 'error' => 'This email is already registered. Please login or use a different email.']);
    $stmt->close();
    exit;
}
$stmt->close();

// Generate a random 6-digit verification code
$verificationCode = rand(100000, 999999);

// Store the verification code and email in session (or save in your database)
$_SESSION['verification_code'] = $verificationCode;
$_SESSION['verification_email'] = $email;

$mail = new PHPMailer(true);

try {
    // Server settings
    configureMailer($mail);

    // Recipients
    $mail->addAddress($email, $fullName);
    
    // Content: Prepare a well-formatted HTML email
    $mail->isHTML(true);                                  
    $mail->Subject = 'Verify Your Email Address';
    $mail->Body = emailLayout('Confirm your email address', 'Sign up',
        emailParagraph('Hi <strong>' . emailEsc($fullName) . '</strong>,')
        . emailParagraph('Thanks for signing up with ' . emailEsc(SITE_NAME) . '. Enter this code in the sign-up form to confirm your email address:')
        . emailCode((string)$verificationCode)
        . emailNote('The code expires in 10 minutes. If you did not sign up, you can ignore this email.')
        . emailSignoff()
    );
    // Provide a plain text alternative for non-HTML email clients
    $mail->AltBody = "Hi $fullName,\n\nYour verification code is: $verificationCode\n\nPlease enter this code in the signup form to verify your email address.\n\nBest regards,\n" . SITE_NAME . "";
    
    $mail->send();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Mailer Error: ' . $mail->ErrorInfo]);
}
?>
