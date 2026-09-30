<?php
// Copy this file to mail_secrets.php (gitignored) and fill in real values.
// mail_secrets.php must exist on the production server (public_html/
// eljawad-motors/server/core/); the deploy workflow never uploads or
// overwrites it. Locally, mail goes to MailHog and this file isn't needed.
//
// username/password: the eljawad.com mailbox created in cPanel > Email Accounts
// (full address as username, the mailbox password).
//
// host: the server's own hostname rather than mail.eljawad.com - SMTP on this
// host presents a *.hostgator.com certificate, so TLS only verifies for that name.
return [
    'host'          => 'gator4421.hostgator.com',
    'port'          => 465,              // SSL. (587 = STARTTLS: set 'secure' => 'tls')
    'secure'        => 'ssl',
    'username'      => 'noreply@eljawad.com',
    'password'      => 'REPLACE_WITH_MAILBOX_PASSWORD',
    'from_email'    => 'noreply@eljawad.com',
    'from_name'     => 'Eljawad Motors',
    // Receives vehicle inquiries and agreement copies; shown as "contact us".
    'contact_email' => 'contact@eljawad.com',
];
