<?php
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../core/mailer.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;



// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'error' => 'Invalid request method.']);
    exit;
}

// Retrieve and decode JSON input
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    echo json_encode(['status' => 'error', 'error' => 'Invalid input.']);
    exit;
}

// Extract fields from the JSON input (using null coalescing for defaults)
$customerId           = $data['customerId'] ?? '';
$registrationDate     = $data['registrationDate'] ?? '';
$customerCategory     = $data['customerCategory'] ?? '';
$country              = $data['country'] ?? '';
$defaultDestination   = $data['defaultDestination'] ?? '';
$customerName         = $data['customerName'] ?? '';
$person1              = $data['person1'] ?? '';
$person2              = $data['person2'] ?? '';
$tel1                 = $data['tel1'] ?? '';
$tel2                 = $data['tel2'] ?? '';
$fax                  = $data['fax'] ?? '';
$hp                   = $data['hp'] ?? '';
$mobile               = $data['mobile'] ?? '';
$incoterm             = $data['incoterm'] ?? '';
$autoMail             = isset($data['autoMail']) ? (int)$data['autoMail'] : 0;
$kent                 = isset($data['kent']) ? (int)$data['kent'] : 0;
$automet              = isset($data['automet']) ? (int)$data['automet'] : 0;
$email1               = $data['email1'] ?? '';
$email2               = $data['email2'] ?? '';
$skype                = $data['skype'] ?? '';
$consigneePost        = $data['consigneePost'] ?? '';
$consigneeAddress     = $data['consigneeAddress'] ?? '';  // New field
$consigneeEmail       = $data['consigneeEmail'] ?? '';
$consigneeRut         = $data['consigneeRut'] ?? '';
$notifyPost           = $data['notifyPost'] ?? '';
$notifyAddress        = $data['notifyAddress'] ?? '';       // New field
$notifyTel            = $data['notifyTel'] ?? '';           // New field
$notifyEmail          = $data['notifyEmail'] ?? '';
$notifyRut            = $data['notifyRut'] ?? '';
$notifyEoriNo         = $data['notifyEoriNo'] ?? '';
$myaDescription       = $data['myaDescription'] ?? '';
$comment              = $data['comment'] ?? '';
$salesStaff           = $data['salesStaff'] ?? '';
$pod                  = $data['pod'] ?? '';
$registrationSource   = $data['registrationSource'] ?? '';
$leadSource           = $data['leadSource'] ?? '';
$other                = $data['other'] ?? '';
$consignee            = $data['consignee'] ?? '';          // New field
$notify               = $data['notify'] ?? '';             // New field
$consigneeTel         = $data['consigneeTel'] ?? '';       // New field
$registrationStaff    = $data['registrationStaff'] ?? '';   
$notifyUser = $data['notifyUser'] ?? false;  // Typically this will be a string like 'true', 'on', or similar


// Function to generate a random password of specified length with symbols
function generateRandomPassword($length = 15) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    $charLen = strlen($chars);
    $password = '';
    for ($i = 0; $i < $length; $i++) {
        $password .= $chars[random_int(0, $charLen - 1)];
    }
    return $password;
}

$randomPassword = generateRandomPassword(15);
$passwordHash = password_hash($randomPassword, PASSWORD_DEFAULT);


// Updated SQL query including new fields (total 40 parameters)
$sql = "INSERT INTO customers 
  (customer_id, registration_date, customer_category, country, default_destination, customer_name, person1, person2, tel1, tel2, fax,
   hp, mobile, incoterm, auto_mail, kent, automet, email1, email2, skype, consignee_post, consignee_address, consignee_email, 
   consignee_rut, notify_post, notify_address, notify_tel, notify_email, notify_rut, notify_eori_no, mya_description, comment, 
   sales_staff, pod, registration_source, lead_source, other, consignee, notify, consignee_tel, registration_staff, password)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['status' => 'error', 'error' => 'Prepare failed: ' . $conn->error]);
    exit;
}

// Build the bind types string:
// First 14 fields are strings, then 3 integers (auto_mail, kent, automet), then remaining 23 fields are strings.
// Total: 14 + 3 + 23 = 40 parameters.
$bindTypes = str_repeat("s", 14) . "iii" . str_repeat("s", 25);

$stmt->bind_param($bindTypes,
    $customerId,
    $registrationDate,
    $customerCategory,
    $country,
    $defaultDestination,
    $customerName,
    $person1,
    $person2,
    $tel1,
    $tel2,
    $fax,
    $hp,
    $mobile,
    $incoterm,
    $autoMail,
    $kent,
    $automet,
    $email1,
    $email2,
    $skype,
    $consigneePost,
    $consigneeAddress,  // New field
    $consigneeEmail,
    $consigneeRut,
    $notifyPost,
    $notifyAddress,     // New field
    $notifyTel,         // New field
    $notifyEmail,
    $notifyRut,
    $notifyEoriNo,
    $myaDescription,
    $comment,
    $salesStaff,
    $pod,
    $registrationSource,
    $leadSource,
    $other,
    $consignee,         // New field
    $notify,            // New field
    $consigneeTel,     // New field
    $registrationStaff,
    $passwordHash
);

if ($notifyUser && filter_var($notifyEmail, FILTER_VALIDATE_EMAIL)) {
    sendNotifyEmail($notifyEmail, $customerName,$randomPassword);
}


function sendNotifyEmail($toEmail, $customerName, $tempPassword) {
    $mail = new PHPMailer(true);
    try {
        configureMailer($mail);
        $mail->addAddress($toEmail, $customerName);
        $mail->isHTML(true);
        $mail->Subject = 'Your Eljawad Motors Account Has Been Created!';

        $loginUrl = SITE_URL . '/login';


        $mail->Body = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;'>
            <div style='text-align: center; padding-bottom: 20px;'>
                        <img src='" . SITE_EMAIL_LOGO . "' alt='" . SITE_NAME . "' style='max-width: 220px; margin-bottom: 10px;' />
                <h2 style='color: #333;'>Welcome to Eljawad Motors</h2>
            </div>
            <p>Dear <strong>{$customerName}</strong>,</p>
            <p>We’re pleased to inform you that an account has been created for you on our website. You can now log in to manage your transactions, track orders, and access our services.</p>
            
            <div style='background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                <h4 style='margin-bottom: 10px;'>Here are your login details:</h4>
                <ul style='list-style: none; padding-left: 0;'>
                    <li><strong>Username:</strong> {$customerName}</li>
                    <li><strong>Temporary Password:</strong> " . htmlspecialchars($tempPassword) . "</li>
                    <li><strong>Login Link:</strong> <a href='{$loginUrl}' style='color: #007bff;'>{$loginUrl}</a></li>
                </ul>
            </div>

            <p style='margin-top: 20px;'>For security reasons, we recommend changing your password upon first login. If you have any questions or need assistance, feel free to contact us.</p>

            <p style='margin-top: 40px;'>Best regards,<br><strong>Eljawad Motors</strong></p>
        </div>
        ";

        $mail->AltBody = "Dear {$customerName},\n\n"
            . "An account has been created for you on Eljawad Motors.\n\n"
            . "Username: {$customerName}\n"
            . "Temporary Password: {$tempPassword}\n"
            . "Login Link: {$loginUrl}\n\n"
            . "Please change your password after logging in.\n\n"
            . "Best regards,\nEljawad Motors";

        $mail->send();
    } catch (Exception $e) {
        error_log("Notification email could not be sent. Mailer Error: {$mail->ErrorInfo}");
    }
}


if (!$stmt->execute()) {
    echo json_encode(['status' => 'error', 'error' => 'Execution failed: ' . $stmt->error]);
    exit;
}

$stmt->close();

echo json_encode(['status' => 'success', 'message' => 'Customer registered successfully']);
?>
