import React from 'react';
import Link from 'next/link';
import ImageWithLoader from '../misc/imageWithLoader';

const footerLinks = [
  { href: '/stock-list', text: 'Browse Stock' },
  { href: '/shipping', text: 'Shipping' },
  { href: '/contact', text: 'Contact' },
  { href: '/help/help', text: 'Help' },
];

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-minimal">
        <Link href="/" aria-label="Go to homepage" className="footer-brand">
          <ImageWithLoader
            className="footer-logo"
            alt="Eljawad Motors Inc. logo"
            src="/images/logo-eljawad.svg"
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
        &copy; {new Date().getFullYear()} Eljawad Motors Inc. All Rights Reserved.
      </p>
    </footer>
  );
};

export default Footer;
