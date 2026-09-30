import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
//import { usePathname, useRouter } from 'next/navigation';
import { useRouter } from 'next/router';
import { useUser } from '../user/userContext';
import '@fortawesome/fontawesome-free/css/all.min.css';
import RevertImpersonationButton from '../utilities/handleRevert';
import Link from 'next/link';
import ImageWithLoader from '../misc/imageWithLoader';
import TopBar from './topbar';
import helpLinks from './helpLinks';
import auctionLinks from './auctionLinks';

const MOBILE_MENU_BREAKPOINT = 1000;
const AUTH_MAINTENANCE_MODE = false;
const AUTH_MAINTENANCE_FALLBACK_HREF = '/contact';

const Header = () => {

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Track mobile menu state
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRefs = useRef({});
  const headerRef = useRef(null);
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = router.pathname;

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const auctionActive = auctionLinks.some((link) => isActive(link.path));
  const helpActive = helpLinks.some((link) => isActive(link.path));

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown((prev) => (prev === dropdownName ? null : dropdownName));
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClickOutside = useCallback((event) => {
    if (
      activeDropdown &&
      dropdownRefs.current[activeDropdown] &&
      !dropdownRefs.current[activeDropdown].contains(event.target)
    ) {
      setActiveDropdown(null);
    }
  }, [activeDropdown]);

  const logoutHandler = () => {
    logout();
    setActiveDropdown(null);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown,handleClickOutside]);

  const [searchKeyword, setSearchKeyword] = useState('');
  const handleSearch = () => {
    router.push(`/stock-list?search=${encodeURIComponent(searchKeyword)}`);
  };

  // Keep the header box in sync with the active search everywhere on the
  // site: while actually on a filtered /stock-list?search=..., show that;
  // on any other page (a vehicle detail page, help, home...) fall back to
  // the last search the customer ran, so it doesn't just go blank the
  // moment they click away. stockListV2.js owns writing/clearing this key
  // (it clears it on Reset), so this is a read-only fallback here.
  useEffect(() => {
    const q = router.query?.search;
    const fromUrl = typeof q === 'string' ? q : Array.isArray(q) ? q[0] || '' : '';
    if (fromUrl) {
      setSearchKeyword(fromUrl);
      return;
    }
    try {
      setSearchKeyword(sessionStorage.getItem('eljawad_last_search') || '');
    } catch (e) {
      setSearchKeyword('');
    }
  }, [router.query?.search]);

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    setIsMobileMenuOpen(false); // Close mobile menu when route changes
  }, [pathname]);


  useEffect(() => {
  const leftLinks = document.querySelectorAll('.left-links > *').length;
  const rightLinks = document.querySelectorAll('.right-links > *').length;
  const totalLinks = leftLinks + rightLinks;
  //console.log(totalLinks)

  const rightLinksContainer = document.querySelector('.right-links');
  if (totalLinks % 2 !== 0) {
    rightLinksContainer.classList.add('odd-total');
  } else {
    rightLinksContainer.classList.remove('odd-total');
  }
}, [isMobileMenuOpen]);

  // Mobile/desktop layout itself is pure CSS (.mobile-only/.desktop-only,
  // .menu-toggle) so it's correct on first paint with no JS - this only
  // needs to auto-close an open mobile menu if the viewport is resized
  // wide enough that the desktop nav takes over instead.
  useEffect(() => {
    const closeIfDesktop = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth >= MOBILE_MENU_BREAKPOINT) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', closeIfDesktop);
    return () => {
      window.removeEventListener('resize', closeIfDesktop);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleOutsideMenu = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideMenu);
    document.addEventListener('touchstart', handleOutsideMenu);

    return () => {
      document.removeEventListener('mousedown', handleOutsideMenu);
      document.removeEventListener('touchstart', handleOutsideMenu);
    };
  }, [isMobileMenuOpen]);

  // .header-bottom is visible by default (desktop) and hidden by CSS below
  // the mobile breakpoint - this class only needs to re-show it once the
  // hamburger is tapped open.
  const mobileMenuClass = isMobileMenuOpen ? 'mobile-menu-open' : '';

  // Lock page scroll while the mobile menu overlay is open so the page
  // behind the panel can't scroll underneath it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('mobile-nav-open', isMobileMenuOpen);
    return () => document.body.classList.remove('mobile-nav-open');
  }, [isMobileMenuOpen]);

  const renderGuestAuth = () => (
    <div className="header-item signin-item">
      <div className="flex items-center gap-2">
        <i className="fas fa-user icon"></i>
        {AUTH_MAINTENANCE_MODE ? (
          <span
            className="signin-disabled-link"
            role="link"
            aria-disabled="true"
            title="Sign In/Up is temporarily unavailable"
          >
            Sign In/Up
          </span>
        ) : (
          <Link href="/login">Sign In/Up</Link>
        )}
      </div>
      {AUTH_MAINTENANCE_MODE && (
        <>
          <span className="maintenance-badge">Under maintenance, back soon</span>
          <Link href={AUTH_MAINTENANCE_FALLBACK_HREF} className="maintenance-help-link">
            Need help now? Contact us
          </Link>
        </>
      )}
    </div>
  );

  const renderDropdownItems = (links) =>
    links.map((link) => (
      <Fragment key={`${link.group || ''}-${link.text}`}>
        {link.group && <p className="dropdown-group">{link.group}</p>}
        <Link
          href={link.path}
          className={`dropdown-link${isActive(link.path.split('#')[0]) ? ' current' : ''}`}
          aria-current={isActive(link.path.split('#')[0]) ? 'page' : undefined}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className="dropdown-link-text">
            <span className="dropdown-link-title">{link.text}</span>
            {link.desc && <small className="dropdown-link-desc">{link.desc}</small>}
          </span>
        </Link>
      </Fragment>
    ));

  return (
    <div className={`header-wrapper${isScrolled ? ' is-scrolled' : ''}`} ref={headerRef}>
      <TopBar />
      <div className="header-container px-2 sm:px-4 lg:px-6">
        <header className="main-header header">
          <div className="header-top flex items-center gap-2">
            <div className="menu-logo-container flex shrink-0 items-center gap-3">
              <Link className="logo flex items-center shrink-0" href="/">
                <ImageWithLoader
                  src="/images/logo-eljawad-dark.svg"
                  alt="Eljawad Motors Inc. logo"
                  className="logo-img"
                />
              </Link>
            </div>

            {/* Mobile Search Input - always rendered, .mobile-only in CSS
                shows/hides it so it's correct on first paint, no JS gate */}
            <div role="search" aria-label="Search stock by keyword" className="header-search mobile-only relative flex min-w-0 flex-1 items-center gap-2 px-4 py-2 text-sm">
              <input
                type="text"
                placeholder="Search by keyword..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full min-w-0 bg-transparent text-sm outline-none"
              />
              <i className="fas fa-search search-icon" onClick={handleSearch}></i>
            </div>

            <div className="header-main-row desktop-only">
              <div role="search" aria-label="Search stock by keyword" className="header-search relative flex items-center gap-2 px-4 py-2 text-sm">
                <input
                  type="text"
                  placeholder="Search by keyword..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full bg-transparent text-sm outline-none"
                />
                <i className="fas fa-search search-icon" onClick={handleSearch}></i>
              </div>
              <div className="header-actions flex items-center gap-4">
                <div className="header-item flex items-center gap-2">
                  <Link href="/contact">Contact</Link>
                </div>
                {!user ? (
                  renderGuestAuth()
                ) : (
                  <>
                    <div className="header-item flex items-center gap-2">
                      <i className="fas fa-user icon"></i> <Link href="/profile">Profile</Link>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="header-item flex items-center gap-2">
                        <i className="fas fa-user-shield icon"></i> <Link href="/admin">Admin</Link>
                      </div>
                    )}
                    <button onClick={logoutHandler} className="header-item logout-btn flex items-center gap-2">
                      <i className="fas fa-sign-out-alt icon"></i> Sign Out
                    </button>
                    {user && user.isImpersonating && <RevertImpersonationButton />}
                  </>
                )}
              </div>
            </div>
          
            {/* Mobile Menu Toggle - .menu-toggle is display:none by default
                and display:flex under the mobile breakpoint in CSS, so this
                doesn't need a JS viewport gate either */}
            <button
              type="button"
              className="menu-toggle flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-navy/20 text-xl text-brand-navy"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                setActiveDropdown(null);
              }}
            >
              {isMobileMenuOpen ? (
                <i className="fas fa-times"></i>
              ) : (
                <i className="fas fa-bars"></i>
              )}
            </button>
          </div>

          <nav
            className="header-icons mobile-actions flex w-full items-center text-sm text-brand-navy"
            aria-label="Mobile quick actions"
          >
            <ul className="scrollbar-hide m-0 flex w-full list-none items-center p-0">
              <li className="header-item flex items-center gap-2">
                <Link href="/contact" aria-current={isActive('/contact') ? 'page' : undefined}>
                  <i className="fas fa-headset"></i> Contact
                </Link>
              </li>
              <li className="header-item flex items-center gap-2">
                <Link href="/stock-list" aria-current={isActive('/stock-list') ? 'page' : undefined}>
                  <i className="fas fa-warehouse"></i> Browse Stock
                </Link>
              </li>

              {!user ? (
                <li>{renderGuestAuth()}</li>
              ) : (
                <>
                  <li className="header-item flex items-center gap-2">
                    <i className="fas fa-user icon"></i> <Link href="/profile">Profile</Link>
                  </li>
                  {user?.role === 'admin' && (
                    <li className="header-item flex items-center gap-2">
                      <i className="fas fa-user-shield icon"></i> <Link href="/admin">Admin</Link>
                    </li>
                  )}
                  <li>
                    <button onClick={logoutHandler} className="header-item logout-btn flex items-center gap-2">
                      <i className="fas fa-sign-out-alt icon"></i> Sign Out
                    </button>
                  </li>
                  {user && user.isImpersonating && (
                    <li className="header-item flex items-center gap-2">
                      <RevertImpersonationButton />
                    </li>
                  )}
                </>
              )}
            </ul>
          </nav>

        {/* Mobile Menu Content */}
        <nav
          className={`header-bottom border-t border-brand-navy/10 pt-2 ${mobileMenuClass}`}
          aria-label="Primary navigation"
        >
          <ul className="left-links flex flex-col gap-4 md:flex-row md:items-center">
            <li className="flex items-center gap-2">
              <Link
                className="flex flex-col md:flex-row items-center"
                href="/stock-list"
                aria-current={isActive('/stock-list') ? 'page' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <i className="fas fa-warehouse icon"></i>
                Browse Stock
              </Link>
            </li>

            {/* Auction Dropdown */}
            <li
              className={`nav-item dropdown flex items-center gap-2${auctionActive ? ' is-active' : ''}`}
              ref={(el) => (dropdownRefs.current['auction'] = el)}
              onClick={() => toggleDropdown('auction')}
            >
              <i className="fas fa-gavel icon"></i>
              Auction <span className="arrow">▼</span>
              <div
                className={`dropdown-content ${
                  activeDropdown === 'auction' ? 'show' : ''
                }`}
              >
                {renderDropdownItems(auctionLinks)}
                <Link href="/contact" className="dropdown-cta">
                  Ask about an auction car
                </Link>
              </div>
            </li>
          </ul>

          <ul className="right-links flex flex-col gap-4 md:flex-row md:items-center">

            {/* Help Dropdown */}
            <li
              className={`nav-item dropdown flex items-center gap-2${helpActive ? ' is-active' : ''}`}
              ref={(el) => (dropdownRefs.current['overview'] = el)}
              onClick={() => toggleDropdown('overview')}
            >
              <i className="fas fa-circle-question icon"></i>
              Help <span className="arrow">▼</span>
              <div
                className={`dropdown-content help ${
                  activeDropdown === 'overview' ? 'show' : ''
                }`}
              >
                {renderDropdownItems(helpLinks)}
                <Link href="/contact" className="dropdown-cta">
                  More questions? Contact us
                </Link>
              </div>
            </li>
          </ul>
        </nav>
      </header>
    </div>
    </div>

  );
};

export default Header;
