<?php
// Copy this file to mail_secrets.php (gitignored) and fill in real values.
// mail_secrets.php must exist on the production server (public_html/
// eljawad-motors/server/core/); the deploy workflow never uploads or
// overwrites it. Locally, mail goes to MailHog and this file isn't needed.
//
// One mailbox per domain the site is served on (see SITE_BRANDS in site.php);
// mail is sent from the mailbox of the domain the visitor is on.
// username/password: the noreply mailbox created in cPanel > Email Accounts
// (full address as username, the mailbox password). Inquiries and copies go
// to contact@<domain> unless a mailbox sets 'contact_email'.
//
// host: the server's own hostname rather than mail.<domain> - SMTP on this
// host presents a *.hostgator.com certificate, so TLS only verifies for that name.
return [
    'host'   => 'gator4421.hostgator.com',
    'port'   => 465,              // SSL. (587 = STARTTLS: set 'secure' => 'tls')
    'secure' => 'ssl',
    'mailboxes' => [
        'eljawad.com' => [
            'username' => 'noreply@eljawad.com',
            'password' => 'REPLACE_WITH_MAILBOX_PASSWORD',
        ],
        'start-auction.com' => [
            'username' => 'noreply@start-auction.com',
            'password' => 'REPLACE_WITH_MAILBOX_PASSWORD',
        ],
    ],
];
