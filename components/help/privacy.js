import React from 'react';
import AgreementForm from '../forms/agreementForm';

const PrivacyPolicy = ({ userProfile, agreementType }) => {

  // Define the content as a plain text or HTML string
  const agreementContent = `
  <div>
    <p>At Eljawad Motors Inc., we are committed to protecting your privacy and ensuring that your personal information is handled securely and responsibly. This Privacy Policy outlines how we collect, use, store, and share your information when you interact with our services.</p>
      
    <h4>1. Information We Collect</h4>
    <ul>
      <li><strong>Personal Information:</strong> Name, email address, phone number, and billing details.</li>
      <li><strong>Transaction Information:</strong> Details of orders, payments, shipment records, and auction data.</li>
      <li><strong>Usage Data:</strong> Information about how you interact with our website and services, including IP address, browser type, and cookies.</li>
      <li><strong>Visual Documentation:</strong> Photos or videos of cars, tires, or other products related to your orders, captured during dismantling, packing, or shipping for transparency and service verification. These may also be stored in our database for marketing purposes or to improve our services.</li>
    </ul>
    
    <h4>2. How We Use Your Information</h4>
    <ul>
      <li>Processing orders and providing our services, including vehicle dismantling, packing, and shipping.</li>
      <li>Documenting and sharing photo or video records of cars, tires, or other products to ensure transparency during the shipping process.</li>
      <li>Using stored photos or videos for marketing, such as showcasing our services, or to improve operational processes.</li>
      <li>Communicating with you about your transactions or inquiries.</li>
      <li>Improving our platform and customer experience.</li>
      <li>Supporting marketing efforts, such as promoting responsible recycling or new product offerings.</li>
      <li>Complying with legal obligations and ensuring security.</li>
    </ul>
    
    <h4>3. Sharing Your Information</h4>
    <ul>
      <li><strong>Service Providers:</strong> Logistics companies, auction houses, or other partners directly involved in fulfilling your orders, including dismantling, packing, and shipping.</li>
      <li><strong>Legal Authorities:</strong> When required to comply with applicable laws or protect our legal rights.</li>
      <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets.</li>
    </ul>
    <p>We never sell your information to third parties.</p>
    
    <h4>4. Your Rights</h4>
    <ul>
      <li>Access, update, or delete your personal information.</li>
      <li>Opt-out of marketing communications.</li>
      <li>Request a copy of the information we hold about you.</li>
    </ul>
    <p>To exercise your rights, contact us at contact@artisbay.com.</p>
    
    <h4>5. Security of Your Information</h4>
    <p>We implement industry-standard security measures to protect your data. However, no online service can guarantee 100% security.</p>
    
    <h4>6. Cookies</h4>
    <p>We use cookies to enhance your experience. You can manage cookie preferences in your browser settings.</p>
    
    <h4>7. Updates to This Policy</h4>
    <p>This Privacy Policy may be updated periodically. The latest version will always be available on our website.</p>
    
    <h4>Contact Us</h4>
    <p>If you have any questions about this Privacy Policy, <Link className='cta-link' href='/contact'>please contact us.</Link></p>
    </div>
  `;

  return (
    <div className='terms-container'>
      {userProfile ? <h1>Privacy</h1> : ''}
      <div dangerouslySetInnerHTML={{ __html: agreementContent }} />
      {userProfile && <AgreementForm agreementType={agreementType} agreementContent={agreementContent} />}
    </div>
  );
};

export default PrivacyPolicy;
