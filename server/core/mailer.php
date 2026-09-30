<?php
// Shared SMTP configuration for all @artisbay.com outbound mail.
//
// artisbay.com's SPF record only authorizes Google (_spf.google.com) to send as
// this domain. Sending "From: ...@artisbay.com" directly off the HostGator box
// (local mail()/sendmail, or the old MailHog dev config) gets rejected by
// HostGator's own outbound filter. Routing through authenticated Google
// Workspace SMTP instead makes the send match the domain's SPF policy.

use PHPMailer\PHPMailer\PHPMailer;
// Every caller does `use PHPMailer\PHPMailer\Exception` and catches that, so
// throw PHPMailer's Exception - a plain \Exception slips past their catch and
// becomes an uncaught fatal (HTTP 500) instead of a JSON error.
use PHPMailer\PHPMailer\Exception;

function isLocalDev(): bool
{
    return $_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['SERVER_NAME'] === 'localhost';
}

function configureArtisbayMailer(PHPMailer $mail, string $fromEmail, string $fromName): void
{
    if (isLocalDev()) {
        $mail->isSMTP();
        $mail->Host = 'localhost';
        $mail->Port = 1025;
        $mail->SMTPAuth = false;
        $mail->setFrom($fromEmail, $fromName);
        return;
    }

    $secretsFile = __DIR__ . '/mail_secrets.php';
    if (!file_exists($secretsFile)) {
        throw new Exception(
            'Mail credentials not configured. Copy server/core/mail_secrets.example.php ' .
            'to server/core/mail_secrets.php and fill in the Gmail app password.'
        );
    }
    $secrets = require $secretsFile;

    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = $secrets['username'];
    $mail->Password = $secrets['password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom($fromEmail, $fromName);
}
