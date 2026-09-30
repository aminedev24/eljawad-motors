<?php
session_start();

require_once __DIR__ . '/../vendor/autoload.php';   // <-- fixes missing file

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../core/db_connection.php';
require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/mailer.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $rawData = file_get_contents("php://input");
    $data = json_decode($rawData, true);

    error_log("Received POST data: " . print_r($data, true));

    $fullName = $data['fullName'] ?? '';
    $email = $data['email'] ?? '';
    $terms = isset($data['terms']) && $data['terms'] ? 'Agreed' : 'Not Agreed';
    $agreementType = $data['agreementType'] ?? 'Unknown';
    $agreementContent = $data['agreementContent'] ?? '';

    if (!isset($_SESSION['user_id'])) {
        error_log("Error: User not logged in.");
        http_response_code(400);
        echo json_encode(["message" => "User is not logged in."]);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    $accepted_at = date("Y-m-d H:i:s");

    $stmt = $conn->prepare("INSERT INTO agreements (user_id, accepted_at, name, email, agreement_type) VALUES (?, ?, ?, ?, ?)");
    if ($stmt === false) {
        error_log("SQL prepare failed: " . $conn->error);
        http_response_code(500);
        echo json_encode(["message" => "Failed to prepare SQL statement."]);
        exit;
    }

    $stmt->bind_param("issss", $user_id, $accepted_at, $fullName, $email, $agreementType);
    if ($stmt->execute()) {
        error_log("Agreement stored successfully for user ID $user_id.");

        $mail = new PHPMailer(true);

        try {
            configureMailer($mail);
            $mail->addAddress($email, $fullName);
            $mail->addBCC(siteContactEmail());

            $mail->isHTML(true);
            $mail->Subject = "$agreementType agreement";
            $mail->CharSet = 'UTF-8';

            $mail->Body = "
                <html>...</html>
            "; // (trimmed for brevity - keep your full HTML content)

            $mail->send();
            error_log("Email sent successfully to: $email");

            http_response_code(200);
            echo json_encode(["message" => "Data received, confirmation email sent to customer, and agreement stored."]);
        } catch (Exception $e) {
            error_log("PHPMailer Exception: " . $mail->ErrorInfo);
            http_response_code(500);
            echo json_encode(["message" => "Error sending confirmation email: " . $mail->ErrorInfo]);
        }
    } else {
        error_log("Error inserting into agreements: " . $stmt->error);
        http_response_code(500);
        echo json_encode(["message" => "Error storing agreement data."]);
    }

    $stmt->close();
    $conn->close();
} else {
    error_log("Invalid request method: " . $_SERVER["REQUEST_METHOD"]);
    http_response_code(405);
    echo json_encode(["message" => "Invalid request method."]);
}
?>
