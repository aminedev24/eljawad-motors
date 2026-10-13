import { useEffect, useState } from 'react';

// Brand and addresses for the domain the site is opened on. One build serves
// every domain, so this is decided in the browser. Keep in sync with
// SITE_BRANDS in server/core/site.php, which sends the emails.
const SITES = {
  'eljawad.com': { name: 'Eljawad Motors' },
  'start-auction.com': { name: 'Start Auction' },
};
const DEFAULT_DOMAIN = 'eljawad.com';

const siteFor = (hostname = '') => {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  const domain = SITES[host] ? host : DEFAULT_DOMAIN;
  return {
    domain,
    name: SITES[domain].name,
    contactEmail: `contact@${domain}`,
    website: `www.${domain}`,
  };
};

// For code that runs on a click (PDFs, Excel, emails), when window exists.
export const getSite = () =>
  siteFor(typeof window !== 'undefined' ? window.location.hostname : '');

// For rendered pages: the static export is built with the default domain, so
// switch after mount to avoid a hydration mismatch.
export const useSite = () => {
  const [site, setSite] = useState(() => siteFor());
  useEffect(() => setSite(getSite()), []);
  return site;
};
