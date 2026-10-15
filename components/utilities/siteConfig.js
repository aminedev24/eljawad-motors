// Brand this build is for. eljawad.com and start-auction.com share one
// document root, so the site is built once per brand (NEXT_PUBLIC_SITE, set
// by the deploy workflow) and .htaccess serves each domain its own build.
// Keep in sync with SITE_BRANDS in server/core/site.php, which sends the emails.
const SITES = {
  'eljawad.com': {
    name: 'Eljawad Motors',
    // Company name in legal text, invoices and agreements.
    legalName: 'Eljawad Motors Inc.',
    logo: '/images/logo-eljawad-dark.svg', // on light backgrounds
    logoLight: '/images/logo-eljawad.svg', // on dark backgrounds (footer)
    logoClass: '',
    iconDir: '/icons',
    invoiceLogo: '/images/invoice/logo-eljawad.png',
    invoiceQr: '/images/invoice/qr-eljawad.png',
    // Shown when a car has no photo. Saved favourites store this path.
    vehiclePlaceholder: '/images/vehicles/artisbay-placeholder.svg',
  },
  'start-auction.com': {
    name: 'Start-Auction',
    legalName: 'Start-Auction',
    logo: '/images/logo-start-auction.png',
    logoLight: '/images/logo-start-auction-light.png',
    // Wide wordmark: needs more width than the Eljawad badge to stay legible.
    logoClass: 'logo-wide',
    iconDir: '/icons/start-auction',
    invoiceLogo: '/images/invoice/logo-start-auction.png',
    invoiceQr: '/images/invoice/qr-start-auction.png',
    vehiclePlaceholder: '/images/vehicles/start-auction-placeholder.svg',
    // Stock pages search the full Ichinomiya catalog on the server
    // (server/inventory/catalog) instead of loading the curated list.
    fullCatalog: true,
  },
};

const domain = SITES[process.env.NEXT_PUBLIC_SITE] ? process.env.NEXT_PUBLIC_SITE : 'eljawad.com';

export const SITE = {
  ...SITES[domain],
  domain,
  contactEmail: `contact@${domain}`,
  website: `www.${domain}`,
  // For the end of a sentence, where "Inc." already supplies the full stop.
  legalNameEnd: SITES[domain].legalName.endsWith('.') ? SITES[domain].legalName : `${SITES[domain].legalName}.`,
};
