<?php
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'error' => 'Invalid request method.']);
    exit;
}

// --- Retrieve and Validate Input ---
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    echo json_encode(['status' => 'error', 'error' => 'Invalid input']);
    exit;
}

$required = ['full_name', 'email', 'country', 'phone', 'address'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        echo json_encode(['status' => 'error', 'error' => "Missing required field: $field"]);
        exit;
    }
}

// Sanitize and assign data
$fullName = $data['full_name'];
$email    = $data['email'];
$country  = $data['country'];
$phone    = $data['phone'];
$company  = isset($data['company']) ? $data['company'] : '';
$address  = $data['address'];

// --- Check if User Already Exists (using email) ---
$checkStmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
if (!$checkStmt) {
    echo json_encode(['status' => 'error', 'error' => 'Prepare failed: ' . $conn->error]);
    exit;
}
$checkStmt->bind_param("s", $email);
$checkStmt->execute();
$checkStmt->store_result();

if ($checkStmt->num_rows > 0) {
    echo json_encode(['status' => 'error', 'error' => 'A user with this email already exists.']);
    $checkStmt->close();
    exit;
}
$checkStmt->close();

// --- Generate additional user details ---
$uid = uniqid('user_', true);
$is_verified = 0;
$role = 'user';

// Function to generate a random password of specified length with symbols
function generateRandomPassword($length = 15) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    $charLen = strlen($chars);
    $password = '';
    for ($i = 0; $i < $length; $i++) {
        $password .= $chars[random_int(0, $charLen - 1)];
    }
    return $password;
}

$randomPassword = generateRandomPassword(15);
$passwordHash = password_hash($randomPassword, PASSWORD_DEFAULT);

// --- Insert User into the Database using a Prepared Statement ---
$stmt = $conn->prepare("INSERT INTO users (uid, full_name, email, password, country, phone, company, address, is_verified, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    echo json_encode(['status' => 'error', 'error' => 'Prepare failed: ' . $conn->error]);
    exit;
}
$stmt->bind_param("ssssssssis", $uid, $fullName, $email, $passwordHash, $country, $phone, $company, $address, $is_verified, $role);

if (!$stmt->execute()) {
    echo json_encode(['status' => 'error', 'error' => 'Error adding user: ' . $stmt->error]);
    exit;
}
$newUserId = (int)$conn->insert_id;
$stmt->close();

// The staff member who creates a customer is in charge of them (income
// management lets only them, or an admin, apply that customer's payments).
if (session_status() === PHP_SESSION_NONE) session_start();
if (in_array($_SESSION['role'] ?? '', ['admin', 'sales'], true)) {
    require_once __DIR__ . '/../finance/income/income_lib.php';
    income_ensure_schema($conn);
    $staffId = (int)$_SESSION['user_id'];
    $own = $conn->prepare("UPDATE users SET created_by_admin = ? WHERE id = ?");
    $own->bind_param('ii', $staffId, $newUserId);
    $own->execute();
    $own->close();
}

/*
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

$mail = new PHPMailer;
$mail->isSMTP();
$mail->Host = 'localhost'; // Your SMTP server
$mail->SMTPAuth = false;
$mail->SMTPSecure = false;
$mail->Port = 1025; // TCP port for TLS

configureMailer($mail);
$mail->addAddress($email, $fullName);
$mail->isHTML(true);

$mail->Subject = 'Your Account Has Been Created';
$mail->Body = "
<html>
  <head>
    <meta charset=\"UTF-8\">
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #333;
        line-height: 1.6;
        padding: 20px;
        margin: 0;
        background-color: #ffffff;
      }
      h1 {
        color: #1e3a8a;
        margin-bottom: 20px;
      }
      p {
        margin: 0 0 15px;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0 0 15px;
      }
      li {
        margin-bottom: 10px;
        padding-left: 20px;
        position: relative;
      }
      li:before {
        content: '\\2022';
        color: #1e3a8a;
        font-weight: bold;
        display: inline-block; 
        width: 1em;
        margin-left: -1em;
      }
      a {
        color: #1e3a8a;
        text-decoration: none;
      }
     
      .footer {
        background-color: #f9f9f9;
        padding: 20px;
        text-align: center;
        font-size: 14px;
        color: #777;
      }
      .footer img {
        width: 120px;
        height: auto;
        margin-bottom: 10px;
      }
      .footer p {
        margin: 5px 0;
      }
      .footer .contact-table {
        margin: 10px auto 0;
      }
      .footer .contact-table td {
        padding: 0 10px;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <h1>Dear $fullName,</h1>
    <p>We’re pleased to inform you that an account has been created for you on our website. You can now log in to manage your transactions, track orders, and access our services.</p>
    <ul>
      <li><strong>Email:</strong> $email</li>
      <li><strong>Temporary Password:</strong> $randomPassword</li>
      <li><strong>Login Link:</strong> <a href=\"" . SITE_URL . "/login\">" . SITE_URL . "/login</a></li>
    </ul>
    <p>Please log in and change your password as soon as possible for security reasons.</p>
    <p>If you have any questions or need assistance, feel free to contact us at <a href=\"mailto:" . SITE_CONTACT_EMAIL . "\">" . SITE_CONTACT_EMAIL . "</a></p>
    <p>Best Regards,</p>
    <p>" . SITE_NAME . "</p>
    <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">
      <tr>
        <td class=\"footer\">
          <img src=\"" . SITE_EMAIL_LOGO . "\" alt=\"" . SITE_NAME . "\">
          <p style=\"font-weight:bold;\">Your trusted platform for the sale and export of used vehicles and auto parts</p>
          <p>Registered in Japan | Registered with the Miyagi Ken Legal Affairs Bureau</p>
          <table class=\"contact-table\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">
            <tr>
              <td>
                <a href=\"mailto:" . SITE_CONTACT_EMAIL . "\">
                  <i class=\"fas fa-envelope\" style=\"vertical-align: middle;\"></i> " . SITE_CONTACT_EMAIL . "
                </a>
              </td>
              <td>
                <a href=\"" . SITE_URL . "\">
                  <i class=\"fas fa-globe\" style=\"vertical-align: middle;\"></i> " . SITE_DOMAIN . "
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
";


                  

    $mail->AltBody = "Hello, $fullName!\n\nYour account has been successfully created.\nEmail: $email\nPassword: $randomPassword\n\nPlease log in and change your password as soon as possible.";

if (!$mail->send()) {
    echo json_encode([
        'status' => 'error', 
        'error' => 'User added but email not sent: ' . $mail->ErrorInfo
    ]);
    exit;
}
*/
echo json_encode(['status' => 'success', 'message' => 'User added successfully.']);
