<?php
require_once __DIR__ . '/../core/site.php';
$to = 'test@example.com';  // You can put any email address here
$subject = 'Test Email';
$message = 'This is a test email.';
$headers = 'From: ' . SITE_NOREPLY_EMAIL;

//phpinfo();

error_reporting(E_ALL);
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error.log');

error_log("Script started"); // Test log

// Force an error
if (mail($to, $subject, $message, $headers)) {
    echo 'Email sent successfully!';
} else {
    echo 'Email sending failed!';
}
?>
