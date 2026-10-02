// Stock visibility tiers, mirrored from server/core/stock_access.php:
//   guest — not logged in: stock pages show a login wall
//   free  — new self-registered account: 20 newest units in full, rest locked
//   full  — activated by sales (or staff)
// The server does the actual redaction; locked rows arrive with `locked: true`
// and only id/ref/make/model/status/one photo. This file only drives the UI.
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../user/userContext';

export const FREE_PREVIEW_COUNT = 20;
export const SALES_EMAIL = 'contact@eljawad.com';

export function useStockAccess() {
  const { user, loading } = useUser();
  const tier = !user ? 'guest' : user.stock_access === 'free' ? 'free' : 'full';
  return { tier, loading, user };
}

// The stock response differs per tier but is browser-cached for 5 minutes, so
// the tier goes into the URL: logging in or being activated fetches a fresh copy.
export function stockUrl(url, tier) {
  return `${url}${url.includes('?') ? '&' : '?'}tier=${tier}`;
}

export function unlockMailto(user, car) {
  const vehicle = car ? `${car.make || ''} ${car.model || ''}`.trim() + (car.ref_no ? ` (${car.ref_no})` : '') : '';
  const subject = vehicle ? `Unlock full stock access – ${vehicle}` : 'Unlock full stock access';
  const lines = [
    'Hello,',
    '',
    'I would like to unlock full access to your stock (all vehicles, specifications and prices).',
    vehicle && `I am particularly interested in: ${vehicle}`,
    '',
    user?.name && `Name: ${user.name}`,
    user?.email && `Account email: ${user.email}`,
  ].filter((l) => l !== false && l !== undefined && l !== null);
  return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

// Locked units have no price/year/specs; keep them after the unlocked ones
// whatever the sort, so a free account's preview always leads the list.
export const compareLockedLast = (a, b) => (a.locked ? 1 : 0) - (b.locked ? 1 : 0);

export function UnlockButton({ car, className = '', children }) {
  const { tier, user } = useStockAccess();
  const router = useRouter();
  if (tier === 'guest') {
    return (
      <Link
        href={`/register?from=${encodeURIComponent(router.asPath)}`}
        onClick={(e) => e.stopPropagation()}
        className={className}
      >
        {children || 'Sign up to view'}
      </Link>
    );
  }
  return (
    <a href={unlockMailto(user, car)} onClick={(e) => e.stopPropagation()} className={className}>
      {children || 'Contact sales to unlock'}
    </a>
  );
}

// Grey bars standing in for hidden text.
export const Censored = ({ className = 'w-16' }) => (
  <span aria-hidden="true" className={`inline-block h-2 rounded-sm bg-gray-300 align-middle ${className}`} />
);

// Full-page wall shown to logged-out visitors on stock pages.
export function LoginWall({ title = 'Log in to view our stock' }) {
  const router = useRouter();
  const from = encodeURIComponent(router.asPath);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <FontAwesomeIcon icon={faLock} className="mb-4 h-8 w-8 text-[var(--accent-color)]" />
      <h1 className="font-display text-2xl font-bold text-[var(--primary-color)]">{title}</h1>
      <p className="mt-3 text-sm text-gray-600">
        Our full inventory of Japanese used vehicles, with photos, specifications and FOB prices,
        is available to registered customers. Sign-up is free.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Link
          href={`/login?from=${from}`}
          className="rounded bg-[var(--primary-color)] px-6 py-2.5 text-sm font-extrabold uppercase tracking-wider text-white hover:opacity-90"
        >
          Log in
        </Link>
        <Link
          href={`/register?from=${from}`}
          className="rounded border-2 border-[var(--primary-color)] px-6 py-2.5 text-sm font-extrabold uppercase tracking-wider text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white"
        >
          Create free account
        </Link>
      </div>
    </div>
  );
}

// Banner for free accounts explaining what's locked and how to unlock it.
export function FreeTierBanner({ lockedCount }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded border border-[var(--accent-color)]/40 bg-[var(--accent-color)]/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className="font-bold text-[var(--primary-color)]">
          <FontAwesomeIcon icon={faLock} className="mr-1.5 h-3 w-3" />
          Free preview: you can see our {FREE_PREVIEW_COUNT} newest vehicles in full.
        </span>{' '}
        <span className="text-gray-600">
          {lockedCount > 0 ? `${lockedCount.toLocaleString()} more vehicles are locked. ` : ''}
          Contact our sales department to unlock the whole stock.
        </span>
      </div>
      <UnlockButton className="shrink-0 rounded bg-[var(--accent-color)] px-4 py-2 text-center text-xs font-extrabold uppercase tracking-wider text-white hover:opacity-90" />
    </div>
  );
}
