import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

import HowToBuy               from '../../components/help/howtobuy';
import TermsAndConditions     from '../../components/help/terms';
import AntiSocialForcesPolicy from '../../components/help/asf';
import PaypalInfo             from '../../components/help/paypal';
import PaymentMethods         from '../../components/help/paymentMethods';
import AuctionLanding         from '../../components/help/auction';
import TelegraphicTransfer    from '../../components/help/telegraphicTransfer';
import PrivacyPolicy          from '../../components/help/privacy';
import FAQComponent           from '../../components/help/faq';

// ---- DATA: Only use serializable values (no JSX or React elements!) ----
const topicGroups = [
  {
    label: 'Help',
    topics: [
      { name: 'Frequently Asked Questions', slug: 'frequently-asked-questions', component: 'FAQComponent' },
      { name: 'Terms and Conditions', slug: 'terms-and-conditions', component: 'TermsAndConditions' },
      { name: 'Anti-Social Force Policy', slug: 'anti-social-force-policy', component: 'AntiSocialForcesPolicy' },
      { name: 'How to Buy Used Cars', slug: 'how-to-buy-used-cars', component: 'HowToBuy' },
      { name: 'Auction', slug: 'auction', component: 'AuctionLanding' },
    ],
  },
  {
    label: 'Buying',
    topics: [
      { name: 'About Payment', slug: 'about-payment', component: 'PaymentMethods' },
      { name: 'PayPal', slug: 'paypal', component: 'PaypalInfo' },
      { name: 'Telegraphic Transfer', slug: 'telegraphic-transfer', component: 'TelegraphicTransfer' },
      { name: 'Privacy Policy', slug: 'privacy-policy', component: 'PrivacyPolicy' },
    ],
  },
];
// ------------------------------------------------------------------------

const topicMeta = {
  help: {
    title: 'Help Center | Eljawad Motors Inc.',
    description: 'Find out how to buy, company profile, FAQs, and more.',
    keywords: 'Eljawad Motors, help, company profile, FAQs',
  },
  'how-to-buy-used-cars': {
    title: 'How to Buy Used Cars | Eljawad Motors Inc.',
    description: 'Step-by-step guide on purchasing used cars from Japanese auctions via Eljawad Motors.',
    keywords: 'buy used cars, Eljawad Motors, Japanese auctions, how to buy',
  },
};

const topicComponents = {
  FAQComponent,
  TermsAndConditions,
  AntiSocialForcesPolicy,
  HowToBuy,
  AuctionLanding,
  PaymentMethods,
  PaypalInfo,
  TelegraphicTransfer,
  PrivacyPolicy,
};

const allTopics = topicGroups.flatMap((group) => group.topics);

export default function HelpPage({ initialSlug }) {
  const router = useRouter();
  const { topic: topicParam } = router.query;
  const [topicsOpen, setTopicsOpen] = useState(false);

  const slug = useMemo(
    () => (topicParam || initialSlug || 'help').toString().toLowerCase(),
    [topicParam, initialSlug]
  );
  const selectedTopic = allTopics.find((t) => t.slug === slug) || null;

  const meta = topicMeta[slug] || (selectedTopic
    ? {
        title: `${selectedTopic.name} | Eljawad Motors Inc.`,
        description: `Learn more about ${selectedTopic.name} at Eljawad Motors Inc.`,
        keywords: `${selectedTopic.name.toLowerCase()}, Eljawad Motors Inc.`,
      }
    : topicMeta.help);

  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="keywords" content={meta.keywords} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
      </Head>

      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {slug === 'help' && (
          <h1 className="mb-8 font-display text-2xl font-bold text-brand-charcoal md:text-3xl">
            Help Center
          </h1>
        )}

        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          <nav aria-label="Help topics" className="shrink-0 md:w-56 md:self-start md:sticky md:top-28">
            {/* Mobile: hamburger toggle */}
            <button
              type="button"
              onClick={() => setTopicsOpen((v) => !v)}
              aria-expanded={topicsOpen}
              aria-controls="help-topics-panel"
              className="flex w-full items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--white)] px-4 py-3 text-sm font-bold text-[var(--text-color)] transition hover:border-brand-orange/50 md:hidden"
            >
              <span className="inline-flex items-center gap-2.5">
                <i className="fas fa-bars text-brand-orange" aria-hidden="true"></i>
                Help Topics
              </span>
              <i
                className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${topicsOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              ></i>
            </button>

            {/* Collapsible on mobile, static sidebar on desktop */}
            <div
              id="help-topics-panel"
              className={`${topicsOpen ? 'mt-3 block' : 'hidden'} rounded-lg border border-[var(--border-color)] bg-[var(--white)] p-4 md:mt-0 md:block md:rounded-none md:border-0 md:bg-transparent md:p-0`}
            >
              {topicGroups.map((group) => (
                <div key={group.label} className="mb-5 last:mb-0 md:mb-6">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </p>
                  <ul className="space-y-1">
                    {group.topics.map((topic) => (
                      <li key={topic.slug}>
                        <Link
                          href={`/help/${topic.slug}`}
                          aria-current={slug === topic.slug ? 'page' : undefined}
                          onClick={() => setTopicsOpen(false)}
                          className={`block rounded px-2 py-2 text-sm transition md:py-1.5 ${
                            slug === topic.slug
                              ? 'font-bold text-brand-orange'
                              : 'text-gray-600 hover:text-brand-navy'
                          }`}
                        >
                          {topic.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            {selectedTopic ? (
              <>
                <h2 className="mb-4 font-display text-xl font-bold text-brand-charcoal">
                  {selectedTopic.name}
                </h2>
                {(() => {
                  const Comp = topicComponents[selectedTopic.component];
                  return Comp ? <Comp /> : null;
                })()}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Choose a topic from the list to get started.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export async function getStaticPaths() {
  const allSlugs = ['help', ...allTopics.map((t) => t.slug)];

  return {
    paths: allSlugs.map((topic) => ({ params: { topic } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  return {
    props: {
      initialSlug: params.topic,
    },
  };
}
