<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header('Content-Type: application/json'); // Ensure JSON response
require_once __DIR__ . '/../core/site.php';

error_reporting(E_ALL);
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error.log');

error_log("Script started"); // Test log


if ($_SERVER["REQUEST_METHOD"] == "OPTIONS") {
    http_response_code(200); // Handle OPTIONS request for CORS preflight
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    error_log(print_r($_POST, true)); // Log the received POST data

    // Define required fields
    $required_fields = ['name', 'email', 'country', 'phone', 'enquiry', 'message'];

    // Check for missing fields
    foreach ($required_fields as $field) {
        if (empty($_POST[$field])) {
            $error_message = "Field '$field' is required.";
            error_log("[ERROR] $error_message");
            echo json_encode(['status' => 'error', 'message' => $error_message]);
            exit();
        }
    }

    // Get and sanitize form data
    $name = htmlspecialchars($_POST['name']);
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $country = htmlspecialchars($_POST['country']);
    $phone = htmlspecialchars($_POST['phone']);
    $enquiry = htmlspecialchars($_POST['enquiry']);
    $company = !empty($_POST['company']) ? htmlspecialchars($_POST['company']) : '';
    $city = !empty($_POST['city']) ? htmlspecialchars($_POST['city']) : '';
    $address = !empty($_POST['address']) ? htmlspecialchars($_POST['address']) : '';
    $prefecture = !empty($_POST['prefecture']) ? htmlspecialchars($_POST['prefecture']) : '';
    $message = htmlspecialchars($_POST['message']);
  

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error_message = 'Invalid email format.';
        error_log("[ERROR] $error_message");
        echo json_encode(['status' => 'error', 'message' => $error_message]);
        exit();
    }

    // Set the recipient email address
    $to = SITE_CONTACT_EMAIL;
    $subject = $enquiry;

    // Create the email content
    $email_content = "Name: $name\n";
    $email_content .= "Email: $email\n";
    $email_content .= "Country: $country\n";
    $email_content .= "Phone: $phone\n";
    $email_content .= "Enquiry Type: $enquiry\n";
  // Array of optional fields
    $optional_fields = [
        'Company' => $company,
        'City' => $city,
        'Address' => $address,
        'Prefecture' => $prefecture,
    ];
    // Loop through optional fields and append if not empty
    foreach ($optional_fields as $label => $value) {
        if (!empty($value)) {
            $email_content .= "$label: $value\n";
        }
    }
    $email_content .= "Message:\n$message\n";

    error_log("Email Content:\n$email_content"); // Log the email content

    // Set the email headers
    $headers = "From: $name <$email>";

    // Attempt to send the email
    if (mail($to, $subject, $email_content, $headers)) {
        echo json_encode(['status' => 'success', 'message' => 'Email sent successfully.']);
    } else {
        $error_message = 'Unable to send email. Please check your mail server configuration.';
        error_log("[ERROR] $error_message");
        echo json_encode(['status' => 'error', 'message' => $error_message]);
    }
} else {
    $error_message = 'Invalid request method.';
    error_log("[ERROR] $error_message");
    echo json_encode(['status' => 'error', 'message' => $error_message]);
}
?>