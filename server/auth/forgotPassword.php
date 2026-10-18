<?php
// Include your database connection
require_once __DIR__ . '/../core/db_connection.php';
//require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../vendor/autoload.php';   // <-- fixes missing

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/mailer.php';
require_once __DIR__ . '/../core/email_layout.php';

// If it's a preflight request (OPTIONS), send a 200 response without processing further
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header("Access-Control-Max-Age: 86400"); // Cache the preflight response for 24 hours
    http_response_code(200);
    exit;
}

define('BASE_URL', SITE_URL); // from core/site.php (via mailer.php)

// If it's a POST request, process the forgot password request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get raw POST data (JSON) from the request body
    $input = json_decode(file_get_contents('php://input'), true);

    // Check if the email field exists in the input
    if (isset($input['email'])) {
        $email = trim($input['email']); // Sanitize the email input

        // Validate the email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid email address.']);
            exit;
        }

        // Check if the email exists in the users table
        $query = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $query->bind_param("s", $email);
        $query->execute();
        $result = $query->get_result();

        if ($result->num_rows > 0) {
            // User exists, generate a secure random token and expiry time
            $user = $result->fetch_assoc();
            $token = bin2hex(random_bytes(32)); // Generate a secure random token
            $expiry = date('Y-m-d H:i:s', strtotime('+1 hour')); // Token valid for 1 hour

            // Save the token and expiry in the password_resets table
            $insert = $conn->prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)");
            $insert->bind_param("iss", $user['id'], $token, $expiry);
            $insert->execute();

            // Send password reset email using PHPMailer
            $resetLink = BASE_URL . "/reset-password/$token"; // Updated for React route
            $subject = "Password Reset Request";
            $message = emailLayout('Reset your password', 'Account security',
                emailParagraph('Hello,')
                . emailParagraph('We received a request to reset the password for your account. Use the button below to choose a new one. The link is valid for 1 hour.')
                . emailButton($resetLink, 'Reset password')
                . emailFallbackLink($resetLink)
                . emailNote('Didn\'t ask for this? You can ignore this email and your password will stay the same. If you keep getting these, contact us at ' . emailEsc(siteContactEmail()) . '.')
                . emailSignoff()
            );
            
        
        
        
        
            // Create a new PHPMailer instance
            $mail = new PHPMailer(true);

            try {
                // Recipients
                configureMailer($mail);
                $mail->addAddress($email); // Add the recipient's email address

                // Content
                $mail->isHTML(true); // Set email format to plain text
                $mail->Subject = $subject;
                $mail->Body    = $message;

                // Send email
                if ($mail->send()) {
                    echo json_encode(['status' => 'success', 'message' => 'Password reset email sent.']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Failed to send email. Please try again.']);
                }
            } catch (Exception $e) {
                echo json_encode(['status' => 'error', 'message' => "Mailer Error: {$mail->ErrorInfo}"]);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Email not found.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Email not provided.']);
    }
}
?>
