<?php
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
session_start();

// Full user/customer list incl. emails, phones and addresses - staff only.
// Used by the admin panel and the staff invoice/stock/accountancy forms.
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'] ?? '', ['admin', 'sales'], true)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized']);
    exit;
}

$response = ['status' => 'success', 'data' => []];

// Fetch users
$userQuery = "SELECT id, full_name, email, phone, country,joined_date, company , address, role, 'user' as type FROM users";
$userResult = $conn->query($userQuery);
if ($userResult) {
    while ($row = $userResult->fetch_assoc()) {
        $response['data'][] = [
            'id' => $row['id'],
            'type' => 'user',
            'label' => $row['full_name'],
            'value' => $row['id'], // Unique key
            'full_name' => $row['full_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'country' => $row['country'],
            'address' => $row['address'],
            'joined_date' => $row['joined_date'],
            "company" => $row['company'],
            'role' => $row['role'],
             // Add any additional fields you need here
        ];
    }
}

// Fetch customers
$customerQuery = "SELECT * FROM customers";
$customerResult = $conn->query($customerQuery);
if ($customerResult) {
    while ($row = $customerResult->fetch_assoc()) {
        $response['data'][] = [
            'id' => $row['id'],
            'type' => 'customer',
            'label' => $row['customer_name'],
            'value' => 'customer_' . $row['id'], // Unique key
            'customer_name' => $row['customer_name'],
            'country' => $row['country'],
            'tel1' => $row['tel1'],
            'email1' => $row['email1'],
            'default_destination' => $row['default_destination'],
            'person1' => $row['person1'],
            'person2' => $row['person2'],
            'tel2' => $row['tel2'],
            'fax' => $row['fax'],
            'mobile' => $row['mobile'],
            'notify_email' => $row['email2'] ?? '',
            'registration_date' => $row['registration_date'],
            'customer_category' => $row['customer_category'],
            'role' => $row['role'] ?? 'customer',
            'country' => $row['country'],
            'consignee_address' => $row['consignee_address'],
            // Add any additional fields you need here
          
        ];
    }
}

header('Content-Type: application/json');
echo json_encode($response);
$conn->close();
?>
