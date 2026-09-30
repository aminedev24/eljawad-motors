<?php
// server/users/updateUser.php
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
session_start();

// simple admin check – adjust to match your auth logic
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['status'=>'error','message'=>'Not authorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
// CustomerList.jsx sends the id as `id`, getUsers.js as `user_id`.
$userId = intval($data['user_id'] ?? $data['id'] ?? 0);
$fields = ['full_name','email','country','phone','address','company'];
$updates = [];
$params  = [];
$types   = '';

foreach ($fields as $f) {
    if (isset($data[$f])) {
        $updates[] = "`$f` = ?";
        $params[]  = trim($data[$f]);
        $types    .= 's';
    }
}

if (empty($userId) || empty($updates)) {
    echo json_encode(['status'=>'error','message'=>'Invalid input']);
    exit;
}

$stmt = $conn->prepare('UPDATE users SET '.implode(',',$updates).' WHERE id = ?');
$types .= 'i';
$params[] = $userId;
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    echo json_encode(['status'=>'success']);
} else {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>$stmt->error]);
}
$stmt->close();
$conn->close();

?>