<?php
// Public identity of the site, used for links, names and addresses in
// outgoing emails. The same backend serves several domains; the current one
// is picked from the request's host, and anything unknown (localhost,
// artisbay.com/eljawad-motors, the mobile app) falls back to the first entry.
// Each domain sends from noreply@<domain> and receives at contact@<domain>.
const SITE_BRANDS = [
    'eljawad.com' => [
        'name' => 'Eljawad Motors',
        // PNG because most email clients (Gmail included) don't display SVG images.
        'email_logo' => '/images/logo-eljawad-email.png',
    ],
    'start-auction.com' => [
        'name' => 'Start Auction',
        'email_logo' => '/images/logo-eljawad-email.png',
    ],
];

function siteDomain(): string
{
    $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/^www\./', '', $host);
    return array_key_exists($host, SITE_BRANDS) ? $host : array_key_first(SITE_BRANDS);
}

define('SITE_DOMAIN', siteDomain());
define('SITE_NAME', SITE_BRANDS[SITE_DOMAIN]['name']);
define('SITE_URL', str_contains($_SERVER['HTTP_HOST'] ?? '', 'localhost')
    ? 'http://localhost:3000'
    : 'https://' . SITE_DOMAIN);
define('SITE_EMAIL_LOGO', SITE_URL . SITE_BRANDS[SITE_DOMAIN]['email_logo']);
define('SITE_NOREPLY_EMAIL', 'noreply@' . SITE_DOMAIN);
define('SITE_CONTACT_EMAIL', 'contact@' . SITE_DOMAIN);
