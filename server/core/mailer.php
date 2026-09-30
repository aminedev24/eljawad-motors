<?php
// Shared SMTP configuration for all outbound mail.
//
// Mail goes out through the eljawad.com cPanel mailbox on HostGator: the
// domain's SPF record (a mx include:websitewelcome.com) authorizes HostGator's
// servers and cPanel publishes the DKIM key, so Gmail etc. accept it. Server,
// login and addresses live in the host-only mail_secrets.php (see
// mail_secrets.example.php); nothing here is specific to one mailbox.

use PHPMailer\PHPMailer\PHPMailer;
// Every caller does `use PHPMailer\PHPMailer\Exception` and catches that, so
// throw PHPMailer's Exception - a plain \Exception slips past their catch and
// becomes an uncaught fatal (HTTP 500) instead of a JSON error.
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/site.php';

function isLocalDev(): bool
{
    return ($_SERVER['HTTP_HOST'] ?? '') === 'localhost' || ($_SERVER['SERVER_NAME'] ?? '') === 'localhost';
}

function mailSettings(): array
{
    static $settings = null;
    if ($settings !== null) {
        return $settings;
    }
    if (isLocalDev()) {
        // MailHog on localhost:1025 catches everything; no credentials needed.
        return $settings = [
            'host' => 'localhost', 'port' => 1025, 'secure' => '', 'username' => '', 'password' => '',
            'from_email' => 'noreply@eljawad.com', 'from_name' => SITE_NAME, 'contact_email' => 'contact@eljawad.com',
        ];
    }
    $secretsFile = __DIR__ . '/mail_secrets.php';
    if (!file_exists($secretsFile)) {
        throw new Exception(
            'Mail credentials not configured. Copy server/core/mail_secrets.example.php ' .
            'to server/core/mail_secrets.php and fill in the mailbox details.'
        );
    }
    $s = require $secretsFile;
    return $settings = [
        'host' => $s['host'] ?? 'gator4421.hostgator.com',
        'port' => (int)($s['port'] ?? 465),
        'secure' => $s['secure'] ?? PHPMailer::ENCRYPTION_SMTPS,
        'username' => $s['username'],
        'password' => $s['password'],
        'from_email' => $s['from_email'] ?? $s['username'],
        'from_name' => $s['from_name'] ?? SITE_NAME,
        'contact_email' => $s['contact_email'] ?? ($s['from_email'] ?? $s['username']),
    ];
}

// Inbox that receives internal copies: new vehicle inquiries, agreement BCCs.
// Also the "contact us" address shown in emails.
function siteContactEmail(): string
{
    try {
        return mailSettings()['contact_email'];
    } catch (Exception $e) {
        return 'contact@eljawad.com';
    }
}

function configureMailer(PHPMailer $mail): void
{
    $s = mailSettings();
    $mail->isSMTP();
    $mail->Host = $s['host'];
    $mail->Port = $s['port'];
    $mail->SMTPAuth = $s['username'] !== '';
    $mail->Username = $s['username'];
    $mail->Password = $s['password'];
    $mail->SMTPSecure = $s['secure'];
    $mail->SMTPAutoTLS = $s['secure'] !== '';
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($s['from_email'], $s['from_name']);
}
