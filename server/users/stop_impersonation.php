<?php
session_start();
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
// Check if impersonation is active
if (!isset($_SESSION['impersonator'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Not impersonating anyone']);
    exit;
}

$admin_id = $_SESSION['impersonator'];  // Original admin's ID
$impersonated_user_id = $_SESSION['user']['id'] ?? null; // The impersonated user's ID

if (!$impersonated_user_id) {
    http_response_code(400);
    echo json_encode(['error' => 'No impersonated user found']);
    exit;
}

// Log the end of impersonation in the database
$update_stmt = $conn->prepare("UPDATE impersonation_logs SET end_time = NOW() WHERE admin_id = ? AND user_id = ? AND end_time IS NULL");
if (!$update_stmt) {
    error_log("Prepare failed: " . $conn->error);
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $conn->error]);
    exit;
}
$update_stmt->bind_param("ii", $admin_id, $impersonated_user_id);
$update_stmt->execute();
$update_stmt->close();

// Fetch the original admin details from the database
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $admin_id);
$stmt->execute();
$result = $stmt->get_result();
$admin = $result->fetch_assoc();
$stmt->close();

if (!$admin) {
    http_response_code(500);
    echo json_encode(['error' => 'Admin user not found']);
    exit;
}

// Restore the admin's session details
$_SESSION['user'] = $admin;
$_SESSION['role'] = $admin['role'];
$_SESSION['user_id'] = $admin['id'];
$_SESSION['full_name'] = $admin['full_name'];
$_SESSION['uid'] = $admin['uid'];
$_SESSION['email'] = $admin['email'];
$_SESSION['auth_source'] = 'users';

// Remove the impersonation flag
unset($_SESSION['impersonator']);

// Optionally, force the session data to be saved immediately
session_write_close();

// Build a JSON response to mimic a normal login for admin
$response = [
    "status"  => "success",
    "message" => "Reverted back to admin account.",
    "user"    => [
        "id"    => $admin['id'],
        "uid"   => isset($admin['uid']) ? $admin['uid'] : null,
        "name"  => $admin['full_name'],
        "email" => $admin['email'],
        "role"  => $admin['role']
    ]
];

echo json_encode($response);
exit;
?>
