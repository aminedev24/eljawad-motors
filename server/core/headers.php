<?php
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Set the allowed origins dynamically
$allowedOrigins = ['http://localhost:3000', 'https://artisbay.com', 'https://www.artisbay.com', 'https://aurora-lumen.com', 'https://www.aurora-lumen.com', 'https://aminedev24.github.io', 'https://eljawad.com', 'https://www.eljawad.com'];

// Check if the incoming request's origin matches any of the allowed origins
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header("Access-Control-Allow-Credentials: true"); // Allow credentials (cookies, authorization headers, etc.)
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS"); // Allow specific methods
header("Access-Control-Allow-Headers: Content-Type, Authorization, Credentials, X-CSRF-Token");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); // No content for preflight requests
    exit();
}
?>
