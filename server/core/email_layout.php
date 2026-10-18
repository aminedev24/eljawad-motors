<?php
// Shared look for every outgoing HTML email: a white card on a pale sage
// background, logo top-left with a small topic label, left-aligned content and
// a dark teal footer. Colors follow the site palette (styles/globals.css).
// Email clients ignore <style> blocks and most modern CSS, so everything is
// tables and inline styles.

require_once __DIR__ . '/site.php';

const EMAIL_TEAL = '#0f4c5c';
const EMAIL_GREEN = '#2a9d8f';
const EMAIL_ORANGE = '#e8622c';
const EMAIL_INK = '#16232a';
const EMAIL_TEXT = '#3d4f56';
const EMAIL_MUTED = '#7a8a90';
const EMAIL_FONT = 'Segoe UI, Roboto, Helvetica, Arial, sans-serif';

function emailEsc($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

// $label is the small uppercase topic shown next to the logo ("Account
// security", "Welcome", ...); $content is HTML built from the helpers below.
function emailLayout(string $title, string $label, string $content): string
{
    $font = EMAIL_FONT;
    $year = date('Y');
    $site = emailEsc(SITE_NAME);
    $contact = emailEsc(function_exists('siteContactEmail') ? siteContactEmail() : SITE_CONTACT_EMAIL);
    $logo = emailEsc(SITE_EMAIL_LOGO);
    $url = emailEsc(SITE_URL);
    $domain = emailEsc(SITE_DOMAIN);
    $titleHtml = emailEsc($title);
    $labelHtml = emailEsc(strtoupper($label));

    return "<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<title>{$titleHtml}</title>
</head>
<body style='margin:0;padding:0;background:#e9efed;'>
<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#e9efed;'>
<tr><td align='center' style='padding:32px 12px;'>
  <table role='presentation' width='600' cellpadding='0' cellspacing='0' border='0' style='width:100%;max-width:600px;background:#ffffff;font-family:{$font};'>
    <tr>
      <td width='72%' height='5' style='background:" . EMAIL_TEAL . ";font-size:0;line-height:0;'>&nbsp;</td>
      <td width='28%' height='5' style='background:" . EMAIL_ORANGE . ";font-size:0;line-height:0;'>&nbsp;</td>
    </tr>
    <tr><td colspan='2' style='padding:24px 36px 20px;border-bottom:1px solid #e3e9e8;'>
      <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'><tr>
        <td valign='middle'><a href='{$url}'><img src='{$logo}' alt='{$site}' width='150' style='display:block;width:150px;height:auto;border:0;'></a></td>
        <td valign='middle' align='right' style='font-size:11px;letter-spacing:2px;font-weight:600;color:" . EMAIL_GREEN . ";'>{$labelHtml}</td>
      </tr></table>
    </td></tr>
    <tr><td colspan='2' style='padding:32px 36px 36px;color:" . EMAIL_TEXT . ";font-size:15px;line-height:1.65;'>
      <h1 style='margin:0 0 20px;font-size:24px;line-height:1.3;font-weight:700;color:" . EMAIL_INK . ";'>{$titleHtml}</h1>
      {$content}
    </td></tr>
    <tr><td colspan='2' style='background:" . EMAIL_TEAL . ";padding:24px 36px;color:#c9dcdf;font-size:13px;line-height:1.6;'>
      <div style='font-size:15px;font-weight:700;color:#ffffff;'>{$site}</div>
      <div style='margin:2px 0 12px;'>Quality Japanese used vehicles, exported worldwide.</div>
      <a href='mailto:{$contact}' style='color:#f4a37f;text-decoration:none;'>{$contact}</a>
      <span style='color:#5f8a93;'>&nbsp;&middot;&nbsp;</span>
      <a href='{$url}' style='color:#f4a37f;text-decoration:none;'>{$domain}</a>
    </td></tr>
  </table>
  <div style='font-family:{$font};font-size:12px;color:" . EMAIL_MUTED . ";padding:16px 0 0;'>&copy; {$year} {$site}</div>
</td></tr>
</table>
</body>
</html>";
}

function emailParagraph(string $html): string
{
    return "<p style='margin:0 0 16px;'>{$html}</p>";
}

function emailButton(string $href, string $text): string
{
    $href = emailEsc($href);
    $text = emailEsc($text);
    return "<table role='presentation' cellpadding='0' cellspacing='0' border='0' style='margin:8px 0 24px;'><tr>
      <td style='background:" . EMAIL_ORANGE . ";border-radius:6px;'>
        <a href='{$href}' style='display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;'>{$text} &rarr;</a>
      </td></tr></table>";
}

// A one-time code, shown big and spaced out so it's easy to copy.
function emailCode(string $code): string
{
    $code = emailEsc($code);
    return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='margin:8px 0 24px;'><tr>
      <td style='background:#e8f4f2;border-left:4px solid " . EMAIL_GREEN . ";padding:18px 22px;'>
        <div style='font-size:11px;letter-spacing:2px;font-weight:600;color:" . EMAIL_MUTED . ";'>YOUR CODE</div>
        <div style='font-family:Consolas, Menlo, monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:" . EMAIL_TEAL . ";'>{$code}</div>
      </td></tr></table>";
}

// Label/value rows, e.g. login details or a new sign-up's contact info.
// Values are escaped; pass $rawValues = true when they are already HTML.
function emailDetails(array $rows, bool $rawValues = false): string
{
    $html = '';
    foreach ($rows as $label => $value) {
        $value = $rawValues ? $value : emailEsc($value === '' || $value === null ? '-' : $value);
        $html .= "<tr>
          <td valign='top' width='38%' style='padding:10px 16px 10px 0;border-bottom:1px solid #e3e9e8;font-size:12px;letter-spacing:1px;color:" . EMAIL_MUTED . ";white-space:nowrap;'>" . emailEsc(strtoupper($label)) . "</td>
          <td valign='top' style='padding:10px 0;border-bottom:1px solid #e3e9e8;font-size:15px;color:" . EMAIL_INK . ";word-break:break-word;'>{$value}</td>
        </tr>";
    }
    return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='margin:4px 0 24px;border-top:1px solid #e3e9e8;'>{$html}</table>";
}

// Small print under the main content: fallback links, "ignore this if..." notes.
function emailNote(string $html): string
{
    return "<p style='margin:0 0 10px;font-size:13px;line-height:1.6;color:" . EMAIL_MUTED . ";'>{$html}</p>";
}

function emailFallbackLink(string $href): string
{
    $href = emailEsc($href);
    return emailNote("Button not working? Paste this link into your browser:<br><a href='{$href}' style='color:" . EMAIL_GREEN . ";word-break:break-all;'>{$href}</a>");
}

function emailSignoff(): string
{
    return "<p style='margin:24px 0 0;'>Best regards,<br><strong style='color:" . EMAIL_INK . ";'>The " . emailEsc(SITE_NAME) . " team</strong></p>";
}
