<?php
session_start();
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
// Ensure the current user is an admin
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Ensure the impersonation request has a user ID
$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

$user_id = intval($input['user_id']);
$admin_id = $_SESSION['user_id'] ?? null; // Admin's ID from session

if (!$admin_id) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin session invalid']);
    exit;
}

// Fetch the target user from the database (retrieving only non-sensitive columns)
$stmt = $conn->prepare("SELECT id, uid, full_name, email, role FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Set the impersonator if not already set
if (!isset($_SESSION['impersonator'])) {
    $_SESSION['impersonator'] = $admin_id;
}

// Get admin name from session (make sure it was set during login)
$admin_name = isset($_SESSION['full_name']) ? $_SESSION['full_name'] : 'Unknown Admin';
// Get the impersonated user's name from the fetched data
$user_name = $user['full_name'];

// Log the impersonation in the database with admin name and user name
$log_stmt = $conn->prepare("INSERT INTO impersonation_logs (admin_id, user_id, admin_name, user_name, impersonated_at) VALUES (?, ?, ?, ?, NOW())");
if (!$log_stmt) {
    error_log("Prepare failed: " . $conn->error);
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $conn->error]);
    exit;
}
$log_stmt->bind_param("iiss", $admin_id, $user_id, $admin_name, $user_name);
$log_stmt->execute();
$log_stmt->close();

// Update session variables with impersonated user's details
$_SESSION['user'] = $user;
$_SESSION['role'] = $user['role'];
$_SESSION['user_id'] = $user['id'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['uid'] = $user['uid'];
$_SESSION['email'] = $user['email'];
$_SESSION['auth_source'] = 'users';

$isImpersonating = isset($_SESSION['impersonator']);

// Build a JSON response to mimic a normal login
$response = [
    "status"  => "success",
    "message" => "Logged in as user.",
    "user"    => [
        "id"              => $user['id'],
        "uid"             => isset($user['uid']) ? $user['uid'] : null,
        "name"            => $user['full_name'],
        "email"           => $user['email'],
        "role"            => $user['role'],
        "isImpersonating" => $isImpersonating
    ]
];

echo json_encode($response);
exit;
?>
