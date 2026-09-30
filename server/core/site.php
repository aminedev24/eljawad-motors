<?php
// Public identity of the site, used for links and names in outgoing emails.
define('SITE_NAME', 'Eljawad Motors');
define('SITE_URL', str_contains($_SERVER['HTTP_HOST'] ?? '', 'localhost')
    ? 'http://localhost:3000'
    : 'https://eljawad.com');
// PNG because most email clients (Gmail included) don't display SVG images.
define('SITE_EMAIL_LOGO', SITE_URL . '/images/logo-eljawad-email.png');
