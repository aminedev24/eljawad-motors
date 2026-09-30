<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/mailer.php';
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
        $mail->Body = "
            <!DOCTYPE html>
            <html>
            <head>
            <title>Verify Your Email</title>
            <style>
                body {
                font-family: Arial, sans-serif;
                background-color: #f9f9f9;
                margin: 0;
                padding: 0;
                }
                .container {
                background-color: #ffffff;
                max-width: 600px;
                margin: 40px auto;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.05);
                }
                h1 {
                color: #333;
                }
                p {
                color: #555;
                line-height: 1.6;
                }
                .button {
                display: inline-block;
                background-color: #1da1f2;
                color: white;
                text-decoration: none;
                font-weight: bold;
                padding: 12px 24px;
                border-radius: 25px;
                margin-top: 20px;
                }
                .button:hover {
                background-color: #0056b3;
                }
                .footer {
                margin-top: 40px;
                font-size: 12px;
                color: #888;
                }
                a {
                color: #007bff;
                }
            </style>
            </head>
            <body>
            <div class='container'>
                <h1>Email Verification Required</h1>
                <p>Hi there,</p>
                <p>Please confirm your email address by clicking the button below to complete your registration.</p>
                <a href='$verification_link' class='button'>Verify Email</a>
                <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                <p><a href='$verification_link'>$verification_link</a></p>
                <p>If you did not request this, please ignore this email.</p>
                <div class='footer'>
                <p>Need help? Contact us at <a href='mailto:" . siteContactEmail() . "'>" . siteContactEmail() . "</a>.</p>
                <p>Best regards,<br>Eljawad Motors</p>
                </div>
            </div>
            </body>
            </html>
            ";

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
