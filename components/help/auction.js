import React from 'react';
import Link from 'next/link';
import Section from '../common/Section';
import Button from '../common/Button';

const HOW_IT_WORKS_STEPS = [
  { step: '01', title: 'Send Your Deposit' },
  { step: '02', title: 'Discuss Your Requirements' },
  { step: '03', title: 'We Secure the Car' },
  { step: '04', title: 'Final Payment and Shipping' },
];

const AUCTION_STATS = [
  { value: '45,000+', label: 'Vehicles listed daily' },
  { value: '190+', label: 'Auction houses nationwide' },
  { value: 'USS · TAA · JU', label: 'Major auction operators' },
];

const AuctionLanding = () => {
  return (
    <div>
      <Section tone="navy" className="text-center">
        <h2 className="font-display text-2xl md:text-4xl font-bold mb-4">
          Source Cars from Japanese Auctions with Eljawad Motors Inc.
        </h2>
        <p className="max-w-2xl mx-auto opacity-90">
          At Eljawad Motors Inc., we connect overseas buyers with reliable suppliers in Japan, granting you access to high-quality cars directly from auctions at exceptionally fair prices. Whether you&rsquo;re an individual buyer or a dealer, our goal is to simplify the process and maximize your value.
        </p>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-sm opacity-90">
          <li>Fair and Transparent Pricing</li>
          <li>Tailored Dealer Packages</li>
          <li>Efficient Work</li>
        </ul>
      </Section>

      <Section tone="light" id="network-stats">
        <h2 className="text-2xl font-semibold text-center mb-4">Why Japanese Car Auctions?</h2>
        <p className="max-w-2xl mx-auto text-center text-gray-700 mb-10">
          Japanese car auctions, operated by major auction houses like USS, TAA, and JU, are among the most reliable and efficient markets for sourcing quality vehicles.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
          {AUCTION_STATS.map((s) => (
            <div key={s.label} className="border border-gray-200 py-6 px-4">
              <div className="font-display text-3xl md:text-4xl font-bold text-brand-orange">{s.value}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="muted" id="how-it-works">
        <h2 className="text-2xl font-semibold text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {HOW_IT_WORKS_STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="font-display text-3xl font-bold text-brand-navy mb-2">{s.step}</div>
              <div className="text-sm font-semibold text-gray-700">{s.title}</div>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto mt-12 border-t border-gray-300 pt-8">
          <h3 className="text-lg font-semibold text-center mb-3">Already Found the Car You Want?</h3>
          <p className="text-center text-gray-700 mb-4">
            If you&rsquo;re already browsing auction platforms and have a specific car in mind, we can help you secure it! Simply provide us with:
          </p>
          <ul className="max-w-md mx-auto list-disc pl-6 text-gray-700 space-y-1">
            <li>The lot number</li>
            <li>The make and model</li>
            <li>The auction date</li>
          </ul>
        </div>
      </Section>


      <Section tone="light">
        <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
          <div>
            <h3 className="text-xl font-semibold mb-3">Service Fee</h3>
            <p className="text-gray-700">
              We charge a transparent service fee per car. Please get in touch with us to learn more about the fee structure and additional services available.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-3">Exclusive Benefits</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Flexible Payment Options</li>
              <li>Container Consolidation Services</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="muted" className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Start Your Auction Journey with Eljawad Motors Inc.</h2>
        <p className="max-w-2xl mx-auto text-gray-700 mb-2">
          Take control of your car-sourcing experience with Eljawad Motors Inc. Whether you&rsquo;re ready to buy or need assistance with the process, we&rsquo;re here to help.
        </p>
        <p className="text-gray-700">
          <strong><Link className="cta-link" href="/contact">Contact us today</Link></strong> to discuss your needs and secure the best vehicles from Japanese auctions.
        </p>
      </Section>
    </div>
  );
};

export default AuctionLanding;
