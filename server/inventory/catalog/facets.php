<?php
// Filter options and counts for the full catalog (makes, models per make,
// body types, transmissions, fuels, years), computed once per import.

require_once __DIR__ . '/../../core/headers.php';
mysqli_report(MYSQLI_REPORT_OFF);
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/catalog_lib.php';

$facets = catalog_get_meta($conn, 'facets');
if (!$facets) {
    http_response_code(503);
    echo json_encode(['error' => 'Catalog not available yet']);
    exit;
}
// Public, same for every visitor, and only changes once an hour.
header('Cache-Control: public, max-age=300');
echo json_encode($facets);
