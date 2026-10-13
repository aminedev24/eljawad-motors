<?php
// Shared SMTP configuration for all outbound mail.
//
// Mail goes out through the current domain's cPanel mailbox on HostGator
// (noreply@eljawad.com, noreply@start-auction.com, ...): each domain's SPF
// record authorizes HostGator's servers and cPanel publishes its DKIM key, so
// Gmail etc. accept it. Server and logins live in the host-only
// mail_secrets.php (see mail_secrets.example.php); site.php picks the domain.

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
            'from_email' => SITE_NOREPLY_EMAIL, 'from_name' => SITE_NAME, 'contact_email' => SITE_CONTACT_EMAIL,
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
    // Older single-mailbox files put username/password at the top level;
    // treat that as the mailbox for the domain of its address.
    $mailboxes = $s['mailboxes'] ?? [substr(strrchr($s['username'], '@'), 1) => $s];
    $box = $mailboxes[SITE_DOMAIN] ?? null;
    if ($box === null) {
        // Sending as another domain's mailbox would fail SPF/DKIM checks.
        throw new Exception('No mailbox for ' . SITE_DOMAIN . ' in server/core/mail_secrets.php.');
    }
    return $settings = [
        'host' => $box['host'] ?? $s['host'] ?? 'gator4421.hostgator.com',
        'port' => (int)($box['port'] ?? $s['port'] ?? 465),
        'secure' => $box['secure'] ?? $s['secure'] ?? PHPMailer::ENCRYPTION_SMTPS,
        'username' => $box['username'],
        'password' => $box['password'],
        'from_email' => $box['from_email'] ?? $box['username'],
        'from_name' => $box['from_name'] ?? SITE_NAME,
        'contact_email' => $box['contact_email'] ?? SITE_CONTACT_EMAIL,
    ];
}

// Inbox that receives internal copies: new vehicle inquiries, agreement BCCs.
// Also the "contact us" address shown in emails.
function siteContactEmail(): string
{
    try {
        return mailSettings()['contact_email'];
    } catch (Exception $e) {
        return SITE_CONTACT_EMAIL;
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
