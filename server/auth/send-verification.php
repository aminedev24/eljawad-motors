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
    $mail->Body    = "
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Email Verification</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f2f2f2;
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                }
                .email-container {
                    max-width: 600px;
                    margin: 30px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .email-header {
                    background-color: #1da1f2;
                    color: #ffffff;
                    padding: 20px;
                    text-align: center;
                    font-size: 24px;
                }
                .email-body {
                    padding: 20px;
                    color: #555555;
                    font-size: 16px;
                    line-height: 1.5;
                }
                .verification-code {
                    display: block;
                    margin: 20px auto;
                    padding: 10px 20px;
                    background-color: #e74c3c;
                    color: #ffffff;
                    font-size: 32px;
                    text-align: center;
                    letter-spacing: 2px;
                    border-radius: 4px;
                    width: fit-content;
                }
                .email-footer {
                    background-color: #f7f7f7;
                    padding: 10px 20px;
                    font-size: 14px;
                    color: #999999;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class='email-container'>
                <div class='email-header'>
                    Verify Your Email
                </div>
                <div class='email-body'>
                    <p>Hi <strong>$fullName</strong>,</p>
                    <p>Thank you for signing up. Please use the verification code below to confirm your email address:</p>
                    <div class='verification-code'>$verificationCode</div>
                    <p>If you did not request this, please ignore this email.</p>
                    <p>Best regards,<br>Eljawad Motors</p>
                </div>
                <div class='email-footer'>
                    &copy; " . date('Y') . " Eljawad Motors. All rights reserved.
                </div>
            </div>
        </body>
        </html>
    ";
    // Provide a plain text alternative for non-HTML email clients
    $mail->AltBody = "Hi $fullName,\n\nYour verification code is: $verificationCode\n\nPlease enter this code in the signup form to verify your email address.\n\nBest regards,\nEljawad Motors";
    
    $mail->send();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Mailer Error: ' . $mail->ErrorInfo]);
}
?>
