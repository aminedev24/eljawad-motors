import React from 'react';
import Link from 'next/link';
import ImageWithLoader from '../misc/imageWithLoader';
import { SITE } from '../utilities/siteConfig';

const footerLinks = [
  { href: '/stock-list', text: 'Browse Stock' },
  { href: '/contact', text: 'Contact' },
  { href: '/help/help', text: 'Help' },
];

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-minimal">
        <Link href="/" aria-label="Go to homepage" className="footer-brand">
          <ImageWithLoader
            className={`footer-logo ${SITE.logoClass}`}
            alt={`${SITE.legalName} logo`}
            src={SITE.logoLight}
          />
        </Link>
        <nav className="footer-links" aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.text}
            </Link>
          ))}
        </nav>
      </div>
      <p className="footer-copy">
        &copy; {new Date().getFullYear()} {SITE.legalNameEnd} All Rights Reserved.
      </p>
    </footer>
  );
};

export default Footer;
