<?php
require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../core/mailer.php';
require_once __DIR__ . '/../core/email_layout.php';

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
        $mail->Subject = 'Your ' . SITE_NAME . ' Account Has Been Created!';

        $loginUrl = SITE_URL . '/login';


        $mail->Body = emailLayout('Welcome to ' . SITE_NAME, 'Welcome',
            emailParagraph('Dear <strong>' . emailEsc($customerName) . '</strong>,')
            . emailParagraph('An account has been created for you. You can now log in to follow your orders and transactions and use our services.')
            . emailDetails([
                'Username' => $customerName,
                'Temporary password' => $tempPassword,
            ])
            . emailButton($loginUrl, 'Log in')
            . emailNote('For your security, please change this password after your first login.')
            . emailSignoff()
        );

        $mail->AltBody = "Dear {$customerName},\n\n"
            . "An account has been created for you on " . SITE_NAME . ".\n\n"
            . "Username: {$customerName}\n"
            . "Temporary Password: {$tempPassword}\n"
            . "Login Link: {$loginUrl}\n\n"
            . "Please change your password after logging in.\n\n"
            . "Best regards,\n" . SITE_NAME . "";

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
