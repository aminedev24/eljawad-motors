<?php
// Include your database connection
require_once __DIR__ . '/../core/db_connection.php';
//require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../vendor/autoload.php';   // <-- fixes missing

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/mailer.php';

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
            $message = "
            <html>
            <head>
              <meta charset='UTF-8'>
              <title>Password Reset Request</title>
            </head>
            <body style='font-family: Arial, sans-serif; color: #333; margin:0; padding:0;'>
              <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td align='center'>
                    <table width='800' cellpadding='0' cellspacing='0' border='0' style='border: 1px solid #ddd; border-radius: 8px; overflow: hidden;'>
                      <!-- Header -->
                      <tr>
                        <td align='center' style='background-color: #1da1f2; color: #fff; padding: 10px;'>
                          <h2 style='margin: 0;'>Password Reset Request</h2>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style='padding: 20px; font-size: 16px; line-height: 1.6;'>
                          <p style='margin: 0 0 10px;'>Dear User,</p>
                          <p style='margin: 0 0 10px;'>We received a request to reset your password for your account. If you did not request this change, please disregard this email.</p>
                          <p style='margin: 0 0 10px;'>To reset your password, please click the link below. This link will expire in 1 hour for security reasons:</p>
                          <p style='text-align: center; margin: 20px 0;'>
                            <a href=\"$resetLink\" style='background-color: #f1892b; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;'>
                              Reset Your Password
                            </a>
                          </p>
                          <p style='margin: 0;'>If you encounter any issues or did not request this reset, please contact us immediately.</p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style='background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 14px; color: #777;'>
                          <img src='" . SITE_EMAIL_LOGO . "' alt='" . SITE_NAME . "' style='width: 200px; height: auto; margin-bottom: 10px;'>
                          <p style='margin: 5px 0; font-weight: bold;'>Your trusted platform for the sale and export of used vehicles and auto parts</p>
                          <!-- Contact Info using a table for layout -->
                          <table align='center' border='0' cellspacing='0' cellpadding='0' style='margin-top: 10px;'>
                            <tr>
                              <td style='padding: 0 10px;'>
                                <a href='mailto:" . siteContactEmail() . "' style='text-decoration: none; color: #1e398a; font-size: 14px;'>
                                  <i class='fas fa-envelope' style='vertical-align: middle;'></i> " . siteContactEmail() . "
                                </a>
                              </td>
                              <td style='padding: 0 10px;'>
                                <a href='" . SITE_URL . "' style='text-decoration: none; color: #1e398a; font-size: 14px;'>
                                  <i class='fas fa-globe' style='vertical-align: middle;'></i> eljawad.com
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            ";
            
        
        
        
        
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
