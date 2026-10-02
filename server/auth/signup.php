<?php
session_start();


require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/stock_access.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../core/mailer.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;



// Ensure the session contains the user's email and that the email has been verified (from a previous process)
if (!isset($_SESSION['verification_email']) || empty($_SESSION['verification_email'])) {
    echo json_encode(['success' => false, 'error' => 'Email is missing from session.']);
    exit;
}

$email = trim($_SESSION['verification_email']);

// Check if the user already exists in the database
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // The user exists; assume they are verified and prompt to log in
    echo json_encode(['success' => false, 'error' => 'This email is already registered. Please login or use a different email.']);
    $stmt->close();
    exit;
}
$stmt->close();

// Ensure the user has verified their email
if (!isset($_SESSION['is_verified']) || !$_SESSION['is_verified']) {
    echo json_encode(['success' => false, 'error' => 'Email not verified.']);
    exit;
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Sanitize and validate inputs
    $fullName = isset($_POST['full-name']) ? trim($_POST['full-name']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? trim($_POST['password']) : '';
    $country = isset($_POST['country']) ? trim($_POST['country']) : '';
    $phone = isset($_POST['phone']) ? trim($_POST['phone']) : '';
    $company = isset($_POST['company']) ? trim($_POST['company']) : '';
    $address = isset($_POST['address']) ? trim($_POST['address']) : '';
    
    // Validate that all fields are filled
    if (empty($fullName) || empty($email) || empty($password) || empty($country) || empty($phone)) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'All fields are required.']);
        exit;
    }

    // Validate the email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Invalid email format.']);
        exit;
    }

    // Check if the email or phone number already exists
    $userCheckQuery = $conn->prepare("SELECT id FROM users WHERE email = ? OR phone = ?");
    $userCheckQuery->bind_param("ss", $email, $phone);
    $userCheckQuery->execute();
    $userCheckResult = $userCheckQuery->get_result();

    if ($userCheckResult->num_rows > 0) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Email or phone number already exists. Please try to login.']);
        $userCheckQuery->close();
        exit;
    }

    // Generate a unique ID for the user
    $uid = uniqid('user_', true);
    $_SESSION['uid'] = $uid;
    $is_verified = $_SESSION['is_verified'];

    // Hash the password for security
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Self-registered accounts start on the free stock preview until staff
    // activate them (see core/stock_access.php).
    stock_access_ensure_schema($conn);

    // Prepare and bind the database statement for inserting the user
    $stmt = $conn->prepare("INSERT INTO users (uid, full_name, email, password, country, phone, company, address,is_verified, joined_date, stock_access) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'free')");
    $stmt->bind_param("sssssssss", $uid, $fullName, $email, $hashedPassword, $country, $phone, $company, $address, $is_verified);

    if ($stmt->execute()) {
        // Tell sales a new account is waiting for stock activation.
        notifySignup($fullName, $email, $country, $phone, $company, $address);

        echo json_encode(['success' => true, 'uid' => $uid]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error: ' . $stmt->error]);
    }

    // Close statement and connection
    $stmt->close();
    $userCheckQuery->close();
}

$conn->close();

function notifySignup($fullName, $email, $country, $phone, $company, $address) {
    $esc = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    $activateUrl = SITE_URL . '/admin?tab=customers';
    $rows = '';
    foreach (['Name' => $fullName, 'Email' => $email, 'Country' => $country, 'Phone' => $phone, 'Company' => $company, 'Address' => $address] as $label => $value) {
        $rows .= "<tr><td style=\"padding:4px 12px 4px 0;color:#6b7280\">{$label}</td><td style=\"padding:4px 0\">" . $esc($value ?: '-') . "</td></tr>";
    }
    $mail = new PHPMailer(true);
    try {
        configureMailer($mail);
        $mail->addAddress(siteContactEmail());
        $mail->addReplyTo($email, $fullName);
        $mail->isHTML(true);
        $mail->Subject = 'New sign-up awaiting stock activation: ' . $fullName;
        $mail->Body = "<p>A new customer has signed up. They can see the " . STOCK_FREE_PREVIEW_COUNT
            . " newest vehicles; the rest of the stock stays locked until you activate their account.</p>"
            . "<table style=\"font-size:14px\">{$rows}</table>"
            . "<p><a href=\"{$activateUrl}\">Open Customer Management to activate</a></p>";
        $mail->AltBody = "New sign-up awaiting stock activation\n\nName: $fullName\nEmail: $email\nCountry: $country\nPhone: $phone\nCompany: $company\nAddress: $address\n\nActivate: $activateUrl";
        $mail->send();
    } catch (Exception $e) {
        // The account is created either way; staff still see it in the admin list.
        error_log('Signup notification failed: ' . $e->getMessage());
    }
}
?>
