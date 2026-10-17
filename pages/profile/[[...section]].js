// profile2.js
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router'; // Changed from 'next/navigation' to 'next/router'
import useCheckScreenSize from '../../components/utilities/screenSize';
import Settings from '../../components/misc/settings';
import Privacy from '../../components/help/privacy';
import TermsConditions from '../../components/help/terms';
import AntiSocialPolicy from '../../components/help/asf';
import SalesAgreement from '../../components/sales/salesAgreement';
import InquiryList from '../../components/dataFetch/fetchIquiries';
import InvoiceList from '../../components/dataFetch/fetchInvoices';
import SavedVehicles from '../../components/dataFetch/fetchSavedVehicles';
import MyReservations from '../../components/dataFetch/fetchMyReservations';
import MyOrders from '../../components/dataFetch/fetchMyOrders';
import MyPayments from '../../components/user/payments';
import { useUser } from "../../components/user/userContext";
import Link from 'next/link';
import UserHomepage from '../../components/user/userHomepage';
import useAgreementStatus from '../../components/utilities/agreementStatus';
import { apiBaseUrl } from '../../components/utilities/apiBase';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser, faGear, faHeart, faCalendarCheck, faTruck, faEnvelope,
  faFileInvoice, faWallet, faUserShield, faFileLines,
  faGavel, faFileSignature, faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
// Admin-specific components are no longer directly imported here as they will be in AdminPanel.js

const apiUrl = apiBaseUrl;

const menuIcons = {
  'my-account': faUser,
  settings: faGear,
  'saved-vehicles': faHeart,
  'my-reservations': faCalendarCheck,
  'my-orders': faTruck,
  'vehicle-inquiries': faEnvelope,
  'invoices-list': faFileInvoice,
  'my-payments': faWallet,
  privacy: faUserShield,
  terms: faFileLines,
  'anti-social-policy': faGavel,
  'sales-contract': faFileSignature,
  'admin-panel': faShieldHalved,
};

const ProfilePage = ({ initialSection = '' }) => {

  const [userr, setUserr] = useState(null);
  const { user, logout } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState(true);
  const [agreementType, setAgreementType] = useState('');
  const router = useRouter(); // Initialize useRouter
  const { section } = router.query || {}; // Get dynamic segment from router.query
  const { isSmallScreen } = useCheckScreenSize();

  const [suppressHighlight, setSuppressHighlight] = useState({});

  const agreementMapping = useMemo(() => ({
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    'anti-social-policy': 'Anti-Social Forces Policy',
  }), []);

  const agreementNames = useMemo(() => Object.values(agreementMapping), [agreementMapping]);

  // Tracked for a soft "needs your attention" nav highlight only - browsing
  // other sections is no longer gated behind accepting these.
  const { statuses } = useAgreementStatus(agreementNames, apiUrl);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    company: '',
    address: ''
  });

  const menuItems = useMemo(() => {
    let items = [
      { key: 'my-account', label: 'My Account', component: UserHomepage },
      { key: 'settings', label: 'Settings', component: Settings },
      { key: 'saved-vehicles', label: 'Saved Vehicles', component: SavedVehicles },
      { key: 'my-reservations', label: 'My Reservations', component: MyReservations },
      { key: 'my-orders', label: 'My Orders', component: MyOrders },
      { key: 'vehicle-inquiries', label: 'Vehicle Inquiries', component: InquiryList },
      { key: 'invoices-list', label: 'Invoices List', component: InvoiceList },
      { key: 'my-payments', label: 'My Payments', component: MyPayments },
      { key: 'privacy', label: 'Privacy', component: Privacy },
      { key: 'terms', label: 'Terms & Conditions', component: TermsConditions },
      { key: 'anti-social-policy', label: 'Anti-Social Forces Policy', component: AntiSocialPolicy },
      { key: 'sales-contract', label: 'Sales Contract', component: SalesAgreement },
    ];

    // Add a link to the admin panel ONLY if the user is an admin
    if (user?.role === 'admin') {
      items.push({ key: 'admin-panel', label: 'Admin Panel', path: '/admin/customers' }); // Link to default admin page
    }

    return items;
  }, [user]); // Re-calculate if user changes

  const rawSection = Array.isArray(section)
  ? section[0]
  : section || "";
  // "accountancy" was renamed to "my-payments"; old links still land there.
  const sectionStr = String(rawSection).toLowerCase() === "accountancy" ? "my-payments" : rawSection;

 


  const initialActive = initialSection || (sectionStr && menuItems.some(item => item.key === sectionStr.toLowerCase())
  ? sectionStr.toLowerCase()
  : "");
  
  const [activeContent, setActiveContent] = useState(initialActive || initialSection);


  useEffect(() => {
    switch (activeContent) {
      case 'terms':
        setAgreementType('Terms & Conditions');
        break;
      case 'privacy':
        setAgreementType('Privacy Policy');
        break;
      case 'anti-social-policy':
        setAgreementType('Anti-Social Forces Policy');
        break;
      case 'sales-contract':
        setAgreementType('Sales Agreement');
        break;
      default:
        setAgreementType('');
    }
  }, [activeContent]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${apiUrl}/users/profile.php`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setUserr(data);
        setFormData({
          name: data.full_name,
          country: data.country,
          company: data.company,
          address: data.address
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [apiUrl]);

  useEffect(() => {
    if (!loading && !userr) {
      router.push("/login");
    }
  }, [loading, userr, router]);

  useEffect(() => {
    if (user && section) {
      // If the user is an admin and tries to access a non-admin section directly
      // or if a regular user tries to access an invalid section.
      if (user.role === 'admin' && !menuItems.some(item => item.key === sectionStr.toLowerCase())) {
        // If it's not a profile route, redirect to admin panel
        if (!router.pathname.startsWith('/admin')) { // Check if the current route is not already an admin route
             router.push('/admin/customers'); // Default admin view
        }
      } else if (user.role !== 'admin' && !menuItems.some(item => item.key === sectionStr.toLowerCase())) {
        // For regular users, if the section is not in their menu, redirect to settings
        router.push('/profile/settings');
        setActiveContent('settings');
      } else {
        setActiveContent(sectionStr.toLowerCase());
      }
    }
  }, [section, router, user, menuItems]);


  const handleMenuClick = (item) => {
    setActiveContent(item.key);
    router.push(`/profile/${item.key}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--background-color)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary-color)]/20 border-t-[var(--accent-color)]" />
      </div>
    );
  }

  if (!userr) return null;

  // The conditional rendering for AdminPanel is now handled by the Pages Router directly
  // via pages/admin/index.js and pages/admin/[adminSection].js.
  // This ProfilePage component is now solely for user profile views.

  const DASHBOARD_KEYS = ['my-account', 'settings', 'saved-vehicles', 'my-reservations', 'my-orders', 'vehicle-inquiries', 'invoices-list', 'my-payments'];
  const LEGAL_KEYS = ['terms', 'privacy', 'anti-social-policy', 'sales-contract'];
  const dashboardTiles = menuItems.filter(item => DASHBOARD_KEYS.includes(item.key));
  const legalLinks = menuItems.filter(item => LEGAL_KEYS.includes(item.key));
  const isDashboard = activeContent === '';

  const ActiveComponent = menuItems.find(item => item.key === activeContent)?.component || UserHomepage;
  const activeItem = menuItems.find(item => item.key === activeContent);
  const isSpecialContent = isSmallScreen && (
    activeContent === 'terms' ||
    activeContent === 'privacy' ||
    activeContent === 'sales-contract' ||
    activeContent === 'anti-social-policy'
  );
  const isSpecialContent2 = (
    activeContent === 'terms' ||
    activeContent === 'privacy' ||
    activeContent === 'sales-contract' ||
    activeContent === 'anti-social-policy'
  );

  const style = {
    height: isSpecialContent ? '70dvh' : '',
    padding: isSpecialContent2 && activeContent !== 'my-account' ? '0' : '',
  };

  const displayName = userr.full_name || userr.name || '';
  const initials = (displayName.trim().split(/\s+/).map(w => w[0]).join('') || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8">
      {isDashboard ? (
        <>
          {/* Minimal identity row - no card, no fill, just text */}
          <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text-color)]">{displayName}</span>
              {String(userr.is_verified) === '1' && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--secondary-color)]">Verified</span>
              )}
              <span className="text-xs text-gray-400">{userr.email}</span>
            </div>
            <div className="flex items-center gap-4">
              {user?.role === 'admin' && (
                <Link href="/admin/customers" className="text-xs font-semibold text-gray-400 hover:text-[var(--accent-color)]">
                  Admin Panel
                </Link>
              )}
              <button onClick={logout} className="text-xs font-semibold text-gray-400 hover:text-[var(--text-color)]">
                Sign Out
              </button>
            </div>
          </div>

          {/* Dashboard tiles - the only navigation; drills into one section at a time */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {dashboardTiles.map((item) => {
              const Icon = menuIcons[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => handleMenuClick(item)}
                  className="flex flex-col items-center gap-2.5 py-2 text-center transition hover:opacity-70"
                >
                  <FontAwesomeIcon icon={Icon} className="h-5 w-5 text-[var(--primary-color)]" />
                  <span className="text-xs font-semibold text-[var(--text-color)]">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Account balance - plain, no box */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-t border-gray-100 pt-5 text-xs">
            <div>
              <span className="text-gray-400">Guaranty </span>
              <span className="font-mono font-semibold text-[var(--text-color)]">{userr.total_by_currency?.JPY?.guaranty || "0 JPY"}</span>
            </div>
            <div>
              <span className="text-gray-400">Extra Guaranty </span>
              <span className="font-mono font-semibold text-[var(--text-color)]">{userr.total_by_currency?.JPY?.extra_guaranty || "0 JPY"}</span>
            </div>
          </div>

          {/* Legal - de-emphasized, plain text links */}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
            {legalLinks.map((item, i) => {
              const agreementName = agreementMapping[item.key];
              const needsAttention =
                agreementName &&
                statuses[agreementName] === false &&
                !suppressHighlight[item.key];
              return (
                <span key={item.key} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gray-300">&middot;</span>}
                  <button onClick={() => handleMenuClick(item)} className="hover:text-[var(--text-color)]">
                    {item.label}
                    {needsAttention && <span className="ml-1 text-[var(--accent-color)]">&bull;</span>}
                  </button>
                </span>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => handleMenuClick({ key: '' })}
            className="mb-5 flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-[var(--text-color)]"
          >
            &larr; Account
          </button>
          <h1 className="mb-5 text-lg font-bold text-[var(--text-color)]">{activeItem?.label}</h1>
          <div style={style}>
            <ActiveComponent
              user={userr}
              setUser={setUserr}
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              userProfile={userProfile}
              agreementType={agreementType}
              setSuppressHighlight={setSuppressHighlight}
            />
          </div>
        </>
      )}
    </div>
  );
};

export async function getStaticPaths() {
  const sections = [
    'my-account',
    'settings', 
    'saved-vehicles',
    'my-reservations',
    'my-orders',
    'vehicle-inquiries',
    'invoices-list',
    'my-payments',
    'accountancy', // old address of My Payments, kept so existing links still open it
    'privacy',
    'terms',
    'anti-social-policy',
    'sales-contract'
  ];

  const paths = [
    { params: { section: [] } }, // /profile/
    ...sections.map(section => ({
      params: { 
        section: [section] 
      }
    }))
  ];

  return {
    paths,
    fallback: false
  };
}

export async function getStaticProps({ params }) {
  const { section } = params;
  const sectionStr = Array.isArray(section) ? section[0] || '' : section || '';

  return {
    props: {
      initialSection: sectionStr
    }
  };

}

export default ProfilePage;


