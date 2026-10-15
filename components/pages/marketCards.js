import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faGavel, faCheck, faLock } from '@fortawesome/free-solid-svg-icons';
import Button from '../common/Button';
import { useStockAccess, unlockMailto } from '../vehicles/stockAccess';
import { fetchCatalogFacets } from '../dataFetch/catalogApi';

// Start-Auction homepage: the two ways to buy, side by side. Fixed-price stock
// (the Ichinomiya feed) is members-only - "full" stock access, which staff
// grant in the admin panel once a customer pays for an Aurora Business tier.
const MemberNote = () => {
  const { tier, loading, user } = useStockAccess();
  if (loading) return null;
  if (tier === 'full') {
    return (
      <p className="text-xs text-green-700">
        <FontAwesomeIcon icon={faCheck} className="mr-2" />
        You have full member access.
      </p>
    );
  }
  return (
    <p className="text-xs text-gray-600">
      <FontAwesomeIcon icon={faLock} className="mr-2 text-brand-orange" />
      {tier === 'guest' ? (
        <>
          Prices and full details are for members.{' '}
          <Link href="/login" className="font-semibold text-brand-navy underline">Sign in</Link> or{' '}
          <Link href="/register" className="font-semibold text-brand-navy underline">create an account</Link>.
        </>
      ) : (
        <>
          Your account shows a preview.{' '}
          <a href={unlockMailto(user)} className="font-semibold text-brand-navy underline">Request member access</a>.
        </>
      )}
    </p>
  );
};

// Live size of the fixed-price catalog (refreshed by the hourly import).
const useCatalogTotal = () => {
  const [total, setTotal] = useState(null);
  useEffect(() => {
    fetchCatalogFacets().then((f) => setTotal(Number(f?.total) || null)).catch(() => {});
  }, []);
  return total;
};

const Card = ({ icon, eyebrow, title, text, points, cta, footer, stat }) => (
  <div className="flex flex-col border border-gray-200 border-t-4 border-t-brand-orange bg-white p-5 shadow-sm md:p-6">
    <div className="mb-1 flex items-center gap-2 text-brand-orange">
      <FontAwesomeIcon icon={icon} />
      <span className="font-display text-xs font-bold uppercase tracking-widest">{eyebrow}</span>
    </div>
    <h2 className="font-display mb-1 text-xl font-bold text-brand-navy md:text-2xl">{title}</h2>
    {stat}
    <p className="mb-3 text-sm text-gray-700 md:text-base">{text}</p>
    <ul className="mb-4 space-y-1 text-sm text-gray-700 md:text-base">
      {points.map((p) => (
        <li key={p} className="flex items-start gap-2">
          <FontAwesomeIcon icon={faCheck} className="mt-1 text-xs text-brand-orange" />
          <span>{p}</span>
        </li>
      ))}
    </ul>
    <div className="mt-auto space-y-3">
      {cta}
      {footer}
    </div>
  </div>
);

// Rounded down to the thousand ("79,000+") so it never overstates between
// imports; hidden when the count can't be loaded.
const StockCount = () => {
  const total = useCatalogTotal();
  if (!total || total < 1000) return null;
  return (
    <p className="mb-2 flex items-baseline gap-2">
      <span className="font-display text-3xl font-extrabold text-brand-orange md:text-4xl">
        {(Math.floor(total / 1000) * 1000).toLocaleString('en-US')}+
      </span>
      <span className="text-sm font-semibold uppercase tracking-wide text-brand-navy">vehicles available now</span>
    </p>
  );
};

const MarketCards = () => (
  // Same width and side padding as the inventory section below it.
  <section className="px-4 pt-4 md:pt-6">
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      <Card
        icon={faTag}
        eyebrow="Fixed price"
        title="Buy now, no bidding"
        stat={<StockCount />}
        text="Ready-to-export vehicles from our partner stock in Japan. The price you see is the price you pay."
        points={['Stock updated daily from Japan', 'Clear FOB prices, no surprises', 'Full specs and photos for members']}
        cta={<Button variant="accent" href="/stock-list" className="w-full !px-6 !py-2 sm:w-auto">Browse fixed-price stock</Button>}
        footer={<MemberNote />}
      />
      <Card
        icon={faGavel}
        eyebrow="Auctions"
        title="Bid at Japanese auctions"
        text="Source cars directly from major Japanese auction houses like USS, TAA and JU. We handle the bidding, inspection sheets and shipping."
        points={['45,000+ vehicles listed daily across 190+ auction houses', 'Inspection sheets before you bid', 'Already found a car? Send us the lot number']}
        cta={<Button variant="primary" href="https://auc.start-auction.com" className="w-full !px-6 !py-2 sm:w-auto">Explore auctions</Button>}
        footer={
          <p className="text-xs text-gray-600">
            Have a car in mind?{' '}
            <Link href="/contact" className="font-semibold text-brand-navy underline">Ask about an auction car</Link>.
          </p>
        }
      />
    </div>
  </section>
);

export default MarketCards;
