<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/headers.php';
require_once __DIR__ . '/../../core/mailer.php';
require_once __DIR__ . '/../../core/csrf.php';
require_once __DIR__ . '/invoice_schema.php';

// Sends arbitrary HTML + attachment from our noreply address, so it must never
// be callable anonymously (it was an open relay for fake 'Eljawad' invoices).
session_start();
invoice_require_staff();
csrf_validate();

$data = json_decode(file_get_contents('php://input'), true) ?: [];

$requiredFields = ['to', 'subject', 'body', 'attachment', 'invoiceNumber', 'customerFullName', 'depositAmount', 'depositDescription', 'depositPurpose'];
foreach ($requiredFields as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

$pdfData = base64_decode($data['attachment'], true);
if (!$pdfData) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid PDF attachment']);
    exit;
}

$str = fn($key) => isset($data[$key]) && trim((string)$data[$key]) !== '' ? trim((string)$data[$key]) : null;
// The form's empty make/model placeholder is "any" - don't store it as data.
$vehicleStr = fn($key) => strcasecmp((string)$str($key), 'any') === 0 ? null : $str($key);
$num = function ($key) use ($data) {
    if (!isset($data[$key]) || $data[$key] === '') return null;
    $n = (float)str_replace(',', '', (string)$data[$key]);
    return is_finite($n) ? $n : null;
};
$date = function ($key) use ($str) {
    $v = $str($key);
    return $v && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
};
$oneOf = fn($key, array $allowed, $default) => in_array($str($key), $allowed, true) ? $str($key) : $default;

$invoiceNumber = $str('invoiceNumber');
$to = $str('to');
$currency = $str('depositCurrency') ?? '';

// Column => value. deposit_amount keeps its historical "3000 USD" display format.
$fields = [
    'customer_name'         => $str('customerFullName'),
    'email'                 => $to,
    'deposit_amount'        => trim(($str('depositAmount') ?? '') . ' ' . $currency),
    'deposit_currency'      => $currency ?: null,
    'description'           => $str('depositDescription'),
    'deposit_purpose'       => $str('depositPurpose'),
    'vehicle_description'   => $str('vehicleDescription'),
    'vehicle_ref'           => $str('vehicleRef'),
    'mileage'               => $str('mileage'),
    'chasis_number'         => $str('chasisNumber'),
    'engine_capacity'       => $str('engineCapacity'),
    'make'                  => $vehicleStr('make'),
    'model'                 => $vehicleStr('model'),
    'invoice_type'          => $oneOf('invoiceType', ['proforma', 'deposit', 'commercial'], 'deposit'),
    'invoice_date'          => $date('invoiceDate'),
    'expiry_date'           => $date('expiryDate'),
    'customer_phone'        => $str('customerPhone'),
    'customer_country'      => $str('country'),
    'customer_company'      => $str('customerCompany'),
    'customer_address'      => $str('customerAddress'),
    'total_price'           => $num('totalPrice'),
    'payment_terms'         => $oneOf('paymentTerms', ['100%', '50%', '30%'], null),
    'bank_note'             => $str('bankNote'),
    'destination_country'   => $str('destinationCountry'),
    'destination_port'      => $str('destinationPort'),
    'pre_export_inspection' => $oneOf('preExportInspection', ['Included', 'Not Included'], null),
];

// Save first (as draft); it only becomes 'sent' once the email actually goes out.
try {
    ensure_invoice_columns($conn);

    $find = $conn->prepare('SELECT id FROM invoices WHERE invoice_number = ? LIMIT 1');
    $find->bind_param('s', $invoiceNumber);
    $find->execute();
    $existing = $find->get_result()->fetch_assoc();
    $find->close();

    $cols = array_keys($fields);
    $vals = array_values($fields);
    if ($existing) {
        // Regenerated invoice: update the same record instead of duplicating it.
        $sql = 'UPDATE invoices SET ' . implode(', ', array_map(fn($c) => "`$c` = ?", $cols))
             . ", status = 'draft', updated_at = NOW() WHERE id = ?";
        $vals[] = (int)$existing['id'];
        $types = str_repeat('s', count($cols)) . 'i';
        $invoiceId = (int)$existing['id'];
    } else {
        $cols[] = 'invoice_number';
        $vals[] = $invoiceNumber;
        $cols[] = 'created_by';
        $vals[] = (int)$_SESSION['user_id'];
        $sql = 'INSERT INTO invoices (`' . implode('`, `', $cols) . "`, status, created_at)"
             . ' VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ", 'draft', NOW())";
        $types = str_repeat('s', count($cols) - 1) . 'i';
    }
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$vals);
    $stmt->execute();
    if (!$existing) $invoiceId = (int)$stmt->insert_id;
    $stmt->close();
// \Throwable, not Exception: `Exception` here is PHPMailer's (see `use` above),
// so database errors (mysqli_sql_exception) would slip past and fatal as a bare 500.
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save invoice data: ' . $e->getMessage()]);
    exit;
}

$mail = new PHPMailer(true);
try {
    configureMailer($mail);
    $mail->addAddress($to);
    if ($str('bcc')) $mail->addBCC($str('bcc'));
    $mail->addStringAttachment($pdfData, 'Invoice-' . $invoiceNumber . '.pdf');
    $mail->isHTML(true);
    $mail->Subject = $str('subject');
    $mail->Body = $data['body'];
    $mail->send();

    $sent = $conn->prepare("UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = ?");
    $sent->bind_param('i', $invoiceId);
    $sent->execute();
    echo json_encode(['success' => 'Email sent successfully', 'invoice_id' => $invoiceId]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Invoice saved as draft, but the email failed: ' . ($mail->ErrorInfo ?: $e->getMessage())]);
}

$conn->close();
