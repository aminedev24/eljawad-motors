<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header('Content-Type: application/json');
require_once __DIR__ . '/../core/site.php';

error_reporting(E_ALL);
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error.log');

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit();
}

$name    = trim($_POST['name']    ?? '');
$email   = trim($_POST['email']   ?? '');
$phone   = trim($_POST['phone']   ?? '');
$country = trim($_POST['country'] ?? '');
$message = trim($_POST['message'] ?? '');
$rating  = (int)($_POST['rating'] ?? 0);

if (empty($name) || empty($email) || empty($country) || empty($message) || $rating < 1 || $rating > 5) {
    echo json_encode(['status' => 'error', 'message' => 'Please fill in all required fields.']);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid email address.']);
    exit();
}

$name    = htmlspecialchars($name);
$email   = htmlspecialchars($email);
$phone   = htmlspecialchars($phone);
$country = htmlspecialchars($country);
$message = htmlspecialchars($message);
$stars   = str_repeat('★', $rating) . str_repeat('☆', 5 - $rating);

$to      = SITE_CONTACT_EMAIL;
$subject = "Customer Feedback – $name ($stars)";

$text_body = "New customer feedback received.\n\n" .
             "Name:    $name\n" .
             "Email:   $email\n" .
             ($phone ? "Phone:   $phone\n" : "") .
             "Country: $country\n" .
             "Rating:  $stars ($rating/5)\n\n" .
             "--- Experience ---\n" .
             "$message\n";

// Check for valid photo attachment
$has_photo = false;
$photo_data = '';
$photo_name = '';
$photo_mime = '';

if (!empty($_FILES['photo']['tmp_name'])) {
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    $mime    = mime_content_type($_FILES['photo']['tmp_name']);
    if (in_array($mime, $allowed) && $_FILES['photo']['size'] <= 8 * 1024 * 1024) {
        $has_photo  = true;
        $photo_data = base64_encode(file_get_contents($_FILES['photo']['tmp_name']));
        $photo_name = basename($_FILES['photo']['name']);
        $photo_mime = $mime;
    }
}

if ($has_photo) {
    $boundary = md5(uniqid(rand(), true));
    $headers  = "From: $name <$email>\r\n" .
                "Reply-To: $email\r\n" .
                "MIME-Version: 1.0\r\n" .
                "Content-Type: multipart/mixed; boundary=\"$boundary\"";

    $body  = "--$boundary\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n\r\n";
    $body .= $text_body . "\r\n";
    $body .= "--$boundary\r\n";
    $body .= "Content-Type: $photo_mime; name=\"$photo_name\"\r\n";
    $body .= "Content-Disposition: attachment; filename=\"$photo_name\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split($photo_data) . "\r\n";
    $body .= "--$boundary--";
} else {
    $headers = "From: $name <$email>\r\n" .
               "Reply-To: $email\r\n";
    $body = $text_body;
}

if (mail($to, $subject, $body, $headers)) {
    echo json_encode(['status' => 'success', 'message' => 'Thank you! Your feedback has been sent successfully.']);
} else {
    error_log("[feedback.php] mail() failed for $email");
    echo json_encode(['status' => 'error', 'message' => 'Unable to send feedback. Please contact us directly at ' . SITE_CONTACT_EMAIL]);
}
?>
