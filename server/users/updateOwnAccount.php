<?php
// Change the logged-in staff member's OWN email and/or password (admin panel >
// Account Settings). Separate from updateUser.php, which admins use to edit
// other people's profiles and which never touches passwords.
session_start();
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/csrf.php';

function fail(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Method not allowed.');
}
csrf_validate();

// Staff accounts live in `users`. Customer logins come from the separate
// `customers` table and can share id numbers, so also match the session email.
if (!isset($_SESSION['user_id'], $_SESSION['email']) || !in_array($_SESSION['role'] ?? '', ['admin', 'sales'], true)) {
    fail(403, 'Not authorized.');
}
$userId = (int)$_SESSION['user_id'];

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$currentPass = (string)($data['current_pass'] ?? '');
$newEmail = trim((string)($data['email'] ?? ''));
$newPass = (string)($data['password'] ?? '');

if ($currentPass === '') {
    fail(400, 'Enter your current password to save changes.');
}
if ($newEmail === '' && $newPass === '') {
    fail(400, 'Nothing to change: enter a new email or a new password.');
}
if ($newEmail !== '' && !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
    fail(400, 'That email address is not valid.');
}
if ($newPass !== '' && strlen($newPass) < 8) {
    fail(400, 'The new password must be at least 8 characters.');
}

$stmt = $conn->prepare('SELECT password FROM users WHERE id = ? AND email = ?');
$stmt->bind_param('is', $userId, $_SESSION['email']);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$row || !password_verify($currentPass, $row['password'])) {
    fail(401, 'Your current password is incorrect.');
}

$sets = [];
$types = '';
$params = [];
if ($newEmail !== '' && strcasecmp($newEmail, $_SESSION['email']) !== 0) {
    $check = $conn->prepare('SELECT 1 FROM users WHERE email = ? AND id <> ?');
    $check->bind_param('si', $newEmail, $userId);
    $check->execute();
    $taken = (bool)$check->get_result()->fetch_row();
    $check->close();
    if ($taken) {
        fail(409, 'Another account already uses that email.');
    }
    $sets[] = 'email = ?';
    $types .= 's';
    $params[] = $newEmail;
}
if ($newPass !== '') {
    $sets[] = 'password = ?';
    $types .= 's';
    $params[] = password_hash($newPass, PASSWORD_DEFAULT);
}
if (!$sets) {
    fail(400, 'Nothing to change: that is already your email.');
}

$types .= 'i';
$params[] = $userId;
$upd = $conn->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?');
$upd->bind_param($types, ...$params);
if (!$upd->execute()) {
    fail(500, 'Could not save your changes. Please try again.');
}
$upd->close();

// Keep the session in step so the header/profile show the new email.
if ($newEmail !== '') {
    $_SESSION['email'] = $newEmail;
}

echo json_encode(['status' => 'success', 'message' => 'Account updated successfully.']);
$conn->close();
