<?php
// Columns the invoice system needs beyond the original Artisbay `invoices`
// table. Every invoice endpoint calls ensure_invoice_columns() first, so the
// live and local databases pick them up automatically (no manual migration).
// ensure_columns() only adds columns that are missing, so this is cheap and
// safe to run on every request.

require_once __DIR__ . '/../../core/db_migrations.php';

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'cancelled'];

function ensure_invoice_columns(mysqli $conn): void
{
    ensure_columns($conn, 'invoices', [
        'vehicle_ref'           => 'varchar(255) DEFAULT NULL',
        'invoice_type'          => "varchar(20) NOT NULL DEFAULT 'deposit'",   // proforma / deposit / commercial
        'status'                => "varchar(20) NOT NULL DEFAULT 'sent'",      // draft / sent / paid / cancelled
        'sent_at'               => 'datetime DEFAULT NULL',
        'paid_at'               => 'datetime DEFAULT NULL',
        'created_by'            => 'int(11) DEFAULT NULL',
        'updated_at'            => 'datetime DEFAULT NULL',
        'invoice_date'          => 'date DEFAULT NULL',
        'expiry_date'           => 'date DEFAULT NULL',
        'customer_phone'        => 'varchar(50) DEFAULT NULL',
        'customer_country'      => 'varchar(100) DEFAULT NULL',
        'customer_company'      => 'varchar(150) DEFAULT NULL',
        'customer_address'      => 'text DEFAULT NULL',
        'total_price'           => 'decimal(15,2) DEFAULT NULL',               // full price before payment terms
        'payment_terms'         => 'varchar(20) DEFAULT NULL',                 // 100% / 50% / 30%
        'bank_note'             => 'text DEFAULT NULL',
        'destination_country'   => 'varchar(100) DEFAULT NULL',
        'destination_port'      => 'varchar(150) DEFAULT NULL',
        'pre_export_inspection' => 'varchar(30) DEFAULT NULL',
    ]);
}

// Staff = admin or sales, matching the invoice generator page's audience.
function invoice_require_staff(): void
{
    if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'] ?? '', ['admin', 'sales'], true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Not authorized']);
        exit;
    }
}
