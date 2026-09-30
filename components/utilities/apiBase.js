const isNativeMobile = typeof window !== 'undefined' &&
                       window.location.origin.includes('capacitor://');

const devBase = process.env.NEXT_PUBLIC_DEV_API || 'http://localhost/artisbay-inc/server';

// The HostGator-hosted production build sits on the same origin as the PHP
// backend, so the default relative '/server' works there. GitHub Pages hosts
// only the static export with no backend of its own, so its build sets
// NEXT_PUBLIC_API_BASE_URL to the real backend's absolute URL instead.
const staticProdBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/server';

const apiBase = isNativeMobile
  ? 'https://artisbay.com/eljawad-motors/server'
  : (process.env.NODE_ENV === 'development' ? devBase : staticProdBase);

export const apiAuth = `${apiBase}/auth`;
export const apiUsers = `${apiBase}/users`;
export const apiInventory = `${apiBase}/inventory`;
export const apiFinance = `${apiBase}/finance`;
export const api = `${apiBase}/api`;
export const apiBaseUrl = apiBase;