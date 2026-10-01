<?php
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/headers.php';
require_once __DIR__ . '/../../core/csrf.php';
require_once __DIR__ . '/invoice_schema.php';

session_start();
invoice_require_staff();
csrf_validate();
ensure_invoice_columns($conn);

function respond(int $code, array $body): void
{
    http_response_code($code);
    echo json_encode($body);
    exit;
}

// Look an invoice up by id (preferred) or invoice_number.
function find_invoice(mysqli $conn, array $data): ?array
{
    if (!empty($data['id'])) {
        $stmt = $conn->prepare('SELECT * FROM invoices WHERE id = ?');
        $id = (int)$data['id'];
        $stmt->bind_param('i', $id);
    } elseif (!empty($data['invoice_number'])) {
        $stmt = $conn->prepare('SELECT * FROM invoices WHERE invoice_number = ?');
        $stmt->bind_param('s', $data['invoice_number']);
    } else {
        return null;
    }
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc() ?: null;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'DELETE') {
    parse_str(file_get_contents('php://input'), $body);
    $number = $_GET['invoice_number'] ?? $body['invoice_number'] ?? null;
    if (!$number) respond(400, ['error' => 'Invoice number is required.']);
    $stmt = $conn->prepare('DELETE FROM invoices WHERE invoice_number = ?');
    $stmt->bind_param('s', $number);
    $stmt->execute();
    respond(200, ['success' => 'Invoice deleted.']);
}

if ($method !== 'PUT' && $method !== 'POST') {
    respond(405, ['error' => 'Method not allowed']);
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$invoice = find_invoice($conn, $data);
if (!$invoice) respond(404, ['error' => 'Invoice not found.']);
$id = (int)$invoice['id'];
$action = $data['action'] ?? 'update';

if ($action === 'status') {
    $status = $data['status'] ?? '';
    if (!in_array($status, INVOICE_STATUSES, true)) respond(400, ['error' => 'Unknown status.']);
    // An invoice that has gone out can't become a draft again.
    if ($status === 'draft' && !empty($invoice['sent_at'])) {
        respond(409, ['error' => 'This invoice was already sent, so it cannot go back to draft.']);
    }
    $sql = 'UPDATE invoices SET status = ?, updated_at = NOW()'
         . ($status === 'sent' ? ', sent_at = COALESCE(sent_at, NOW())' : '')
         . ($status === 'paid' ? ', paid_at = NOW()' : ', paid_at = NULL')
         . ' WHERE id = ?';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('si', $status, $id);
    $stmt->execute();
    respond(200, ['success' => "Invoice marked $status."]);
}

if ($action === 'update') {
    // Record-only edit (the PDF/email are not regenerated; use Regenerate for that).
    $editable = [
        'customer_name', 'email', 'customer_phone', 'customer_country', 'customer_company',
        'customer_address', 'deposit_amount', 'deposit_currency', 'deposit_purpose', 'description',
        'total_price', 'payment_terms', 'invoice_type', 'make', 'model', 'vehicle_ref',
        'chasis_number', 'mileage', 'engine_capacity', 'destination_country', 'destination_port',
        'pre_export_inspection', 'bank_note', 'expiry_date',
    ];
    $sets = [];
    $vals = [];
    foreach ($editable as $col) {
        if (!array_key_exists($col, $data)) continue;
        $v = is_string($data[$col]) ? trim($data[$col]) : $data[$col];
        $sets[] = "`$col` = ?";
        $vals[] = ($v === '' || $v === null) ? null : (string)$v;
    }
    if (!$sets) respond(400, ['error' => 'Nothing to update.']);
    $vals[] = $id;
    $stmt = $conn->prepare('UPDATE invoices SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE id = ?');
    $stmt->bind_param(str_repeat('s', count($vals) - 1) . 'i', ...$vals);
    try {
        $stmt->execute();
    } catch (\Throwable $e) {
        respond(400, ['error' => 'Could not save: check the values (e.g. the total price must be a number).']);
    }
    respond(200, ['success' => 'Invoice updated.']);
}

respond(400, ['error' => 'Unknown action.']);
