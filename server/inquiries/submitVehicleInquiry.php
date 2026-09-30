<?php

// Vehicle inquiry submission for sold / under-negotiation units shown on
// the details page. Stores the inquiry and notifies the sales team by email.
// Mirrors the pattern of server/customers/sendInquiry.php and the shared
// SMTP helper (server/core/mailer.php) so dev uses MailHog and production
// uses authenticated Google Workspace SMTP.

require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/db_migrations.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/mailer.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$name = trim((string)($input['name'] ?? ''));
$email = trim((string)($input['email'] ?? ''));
$phone = trim((string)($input['phone'] ?? ''));
$country = trim((string)($input['country'] ?? ''));
$city = trim((string)($input['city'] ?? ''));
$address = trim((string)($input['address'] ?? ''));
$message = trim((string)($input['message'] ?? ''));
$vehicle_ref = trim((string)($input['vehicle_ref'] ?? ''));
$vehicle_name = trim((string)($input['vehicle_name'] ?? ''));
$vehicle_status = trim((string)($input['vehicle_status'] ?? ''));
$vehicle_details = $input['vehicle_details'] ?? null;
if (is_array($vehicle_details)) {
    $vehicle_details = json_encode($vehicle_details);
}
$vehicle_details = is_string($vehicle_details) ? trim($vehicle_details) : '';
if ($vehicle_details !== '' && $vehicle_details[0] !== '{') {
    $vehicle_details = '';
}

$page_url = trim((string)($input['page_url'] ?? ''));
if ($page_url === '' || !filter_var($page_url, FILTER_VALIDATE_URL)) {
    $page_url = SITE_URL;
}

if ($name === '' || $email === '' || $phone === '' || $country === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Please fill in all required fields.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Please enter a valid email address.']);
    exit;
}

// Create table if it does not exist
$createTableSql = "
CREATE TABLE IF NOT EXISTS vehicle_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_ref VARCHAR(255) DEFAULT NULL,
  vehicle_name VARCHAR(255) DEFAULT NULL,
  vehicle_status VARCHAR(50) DEFAULT NULL,
  vehicle_details TEXT DEFAULT NULL,
  page_url VARCHAR(500) DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100) DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
$conn->query($createTableSql);
ensure_columns($conn, 'vehicle_inquiries', [
    'vehicle_details' => 'TEXT DEFAULT NULL',
    'page_url' => 'VARCHAR(500) DEFAULT NULL',
]);

$stmt = $conn->prepare(
    "INSERT INTO vehicle_inquiries
     (vehicle_ref, vehicle_name, vehicle_status, vehicle_details, page_url, name, email, phone, country, city, address, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare inquiry.']);
    exit;
}

$stmt->bind_param(
    'ssssssssssss',
    $vehicle_ref,
    $vehicle_name,
    $vehicle_status,
    $vehicle_details,
    $page_url,
    $name,
    $email,
    $phone,
    $country,
    $city,
    $address,
    $message
);

if (!$stmt->execute()) {
    error_log('Vehicle inquiry insert failed: ' . $stmt->error);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to save inquiry.']);
    exit;
}
$inquiryId = $stmt->insert_id;

// Notify the sales team by email. A failed send must not break the inquiry
// submission — the row is already saved.
try {
    $details = [];
    $decoded = json_decode($vehicle_details, true);
    if (is_array($decoded)) {
        $labelMap = [
            'ref_no' => 'Ref No',
            'year' => 'Year',
            'make' => 'Make',
            'model' => 'Model',
            'model_code' => 'Model Code',
            'body_type' => 'Body Type',
            'color' => 'Color',
            'mileage' => 'Mileage',
            'fuel' => 'Fuel',
            'transmission' => 'Transmission',
            'engine_capacity' => 'Engine',
            'drive' => 'Drive',
            'doors' => 'Doors',
            'seats' => 'Seats',
            'chassis' => 'Chassis No',
        ];
        foreach ($labelMap as $key => $label) {
            $value = trim((string)($decoded[$key] ?? ''));
            if ($value !== '' && $value !== 'N/A' && $value !== 'n/a') {
                $details[] = sprintf('%-22s: %s', $label, $value);
            }
        }
    }

    $statusLabel = strtoupper($vehicle_status === 'reserved' ? 'under negotiation' : $vehicle_status);
    $now = date('Y-m-d H:i:s T');

    $mail = new PHPMailer(true);
    configureMailer($mail);
    $mail->addAddress(siteContactEmail());
    $mail->isHTML(false);
    $mail->Subject = 'Vehicle Inquiry #' . $inquiryId . ' — ' . ($vehicle_name ?: 'Vehicle');

    $body = "New vehicle inquiry received\n";
    $body .= str_repeat('=', 60) . "\n\n";
    $body .= "INQUIRY\n";
    $body .= str_repeat('-', 60) . "\n";
    $body .= sprintf("%-22s: #%d\n", 'Inquiry ID', $inquiryId);
    $body .= sprintf("%-22s: %s\n", 'Date / Time', $now);
    $body .= sprintf("%-22s: %s\n", 'Status', $statusLabel ?: '—');
    $body .= sprintf("%-22s: %s\n", 'Source page', $page_url);
    $body .= "\nVEHICLE\n";
    $body .= str_repeat('-', 60) . "\n";
    $body .= sprintf("%-22s: %s\n", 'Ref No', $vehicle_ref ?: '—');
    $body .= sprintf("%-22s: %s\n", 'Name', $vehicle_name ?: '—');
    if (count($details) > 0) {
        $body .= implode("\n", $details) . "\n";
    }
    $body .= "\nCUSTOMER\n";
    $body .= str_repeat('-', 60) . "\n";
    $body .= sprintf("%-22s: %s\n", 'Name', $name);
    $body .= sprintf("%-22s: %s\n", 'Email', $email);
    $body .= sprintf("%-22s: %s\n", 'Phone', $phone ?: '—');
    $body .= sprintf("%-22s: %s\n", 'Country', $country ?: '—');
    $body .= sprintf("%-22s: %s\n", 'City', $city ?: '—');
    $body .= sprintf("%-22s: %s\n", 'Address', $address ?: '—');
    $body .= "\nMESSAGE\n";
    $body .= str_repeat('-', 60) . "\n";
    $body .= ($message !== '' ? $message : '(no message)') . "\n";
    $mail->Body = $body;
    $mail->send();
} catch (Exception $e) {
    error_log('Vehicle inquiry email not sent: ' . ($mail->ErrorInfo ?? $e->getMessage()));
}

http_response_code(200);
echo json_encode(['status' => 'success', 'message' => 'Inquiry sent successfully!']);
