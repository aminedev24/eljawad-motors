<?php
require_once __DIR__ . '/../../vendor/autoload.php';   // <-- fixes missing file

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/headers.php';
require_once __DIR__ . '/../../core/mailer.php';
require_once __DIR__ . '/../../core/csrf.php';

// Sends arbitrary HTML + attachment from our noreply address, so it must never
// be callable anonymously (it was an open relay for fake 'Eljawad' invoices).
session_start();
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'] ?? '', ['admin', 'sales'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Not authorized']);
    exit;
}
csrf_validate();

$data = json_decode(file_get_contents('php://input'), true);

// Validate input data
$requiredFields = ['to', 'subject', 'body', 'attachment', 'invoiceNumber', 'customerFullName', 'depositAmount', 'depositDescription', 'depositPurpose'];
foreach ($requiredFields as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

// Extract data
$to = $data['to'];
$subject = $data['subject'];
$bcc = $data['bcc'];
$body = $data['body'];
$attachment = $data['attachment'];

// Decode the base64-encoded PDF file
$pdfData = base64_decode($attachment);
if (!$pdfData) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid PDF attachment']);
    exit;
}

// Extract additional invoice data
$invoiceNumber = $data['invoiceNumber'] ?? null;
$customerName = $data['customerFullName'] ?? null;
$depositAmount = $data['depositAmount']  ?? null; // This will contain the formatted value like "3,000 USD"
$depositDescription = $data['depositDescription'] ?? null;
$depositPurpose = $data['depositPurpose'] ?? null; // New deposit purpose field
$serialNumber = $data['serialNumber'] ?? null; 
$depositCurrency = $data['depositCurrency'] ?? null;
$invoiceDate = $data['invoiceDate'] ?? null;
$formattedDepositAmount = $depositAmount . ' ' . $depositCurrency;


// Conditionally extract vehicle-related fields
$vehicleDescription = $data['vehicleDescription'] ?? null;
$mileage            = $data['mileage'] ?? null;
$chasisNumber       = $data['chasisNumber'] ?? null;
$engineCapacity     = $data['engineCapacity'] ?? null;
$make               = $data['make'] ?? null;
$model              = $data['model'] ?? null;

// Get the user's IP address
$userIp = $_SERVER['REMOTE_ADDR'];

// Fetch the region from a geolocation API (ipinfo.io does not require an API key for basic requests)
$region = '';
try {
    // Using IPInfo API to get region information (no API key required for basic use)
    $ipInfoResponse = file_get_contents("http://ipinfo.io/{$userIp}/json");
    if ($ipInfoResponse) {
        $ipInfo = json_decode($ipInfoResponse, true);
        $region = $ipInfo['region'] ?? 'Unknown region';
    }
} catch (Exception $e) {
    $region = 'Unable to retrieve region';
}

// Insert invoice data into the database using mysqli
try {
// Prepare your INSERT query including the new vehicle fields
$stmt = $conn->prepare("INSERT INTO invoices 
    (invoice_number, customer_name, email, deposit_amount, description, deposit_purpose, vehicle_description, mileage, chasis_number, engine_capacity, make,model, deposit_currency, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?)");
if ($stmt) {
    $stmt->bind_param(
        'ssssssssssssss', // Adjust the types if needed (all strings in this case)
        $invoiceNumber, 
        $customerName, 
        $to, 
        $formattedDepositAmount, 
        $depositDescription, 
        $depositPurpose,
        $vehicleDescription, 
        $mileage, 
        $chasisNumber, 
        $engineCapacity,
        $make,
        $model,
        $depositCurrency,
        $invoiceDate
    );
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute statement: " . $stmt->error);
    }
    $stmt->close();
} else {
    throw new Exception("Failed to prepare statement: " . $conn->error);
}
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save invoice data: ' . $e->getMessage()]);
    exit;
}

// Create a new PHPMailer instance to send email to both the primary user and BCC
$mail = new PHPMailer(true);
try {
    // Recipients
    configureMailer($mail);
    $mail->addAddress($to); // Primary user email
    $mail->addBCC($bcc); // BCC for the additional recipient

    // Add the user's IP and region as part of the email body
    $bodyWithIpInfo = $body . "<br><br><strong>User IP:</strong> " . $userIp . "<br><strong>Region:</strong> " . $region;

    // Attachments
    $mail->addStringAttachment($pdfData, 'Invoice-' .$invoiceNumber . ".pdf" );

    // Content
    $mail->isHTML(true); // Set email format to HTML
    $mail->Subject = $subject;
    $mail->Body = $bodyWithIpInfo; // Add IP and region information to the email body

    // Send the email
    $mail->send();
    echo json_encode(['success' => 'Email sent successfully']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email: ' . $mail->ErrorInfo]);
}

// Close the database connection
$conn->close();
?>
