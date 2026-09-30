//import { Link } from 'react-router-dom';
import AgreementForm from '../forms/agreementForm';


const TermsAndConditions = ({ userProfile, agreementType }) => {
  // Define the content of the agreement
  const agreementContent = (
    `
    <div>
      <p>These terms and conditions (hereinafter referred to as “Terms”) govern the use of the services provided by Eljawad Motors Inc. (hereinafter referred to as the “the Company”) through its online platform (hereinafter referred to as “the Service”). All registered users (hereinafter referred to as “Users”) agree to comply with the Terms outlined below. Specific terms regarding purchases can be found in the relevant sales conditions applicable to each transaction.</p>
      <h4>Article 1 (Scope of Application)</h4>
      <p>These Terms apply to all interactions between the Company and the Users related to the use of the Service. By accessing or using the Service, Users agree to be bound by these Terms.</p>
      <h4>Article 2 (User Registration)</h4>
      <p>Users must apply for registration through the method designated by the Company. Approval of registration is solely at the discretion of the Company. The Company reserves the right to reject any application under the following conditions, without being obligated to disclose the reasons for refusal:</p>
      <ul>
        <li>If the information provided during registration is deemed inaccurate or false.</li>
        <li>If the applicant has previously violated these Terms.</li>
        <li>If the Company deems the registration inappropriate for any reason.</li>
      </ul>
      <h4>Article 3 (User ID and Password Management)</h4>
      <p>Users are solely responsible for managing their User IDs and passwords. The transfer or sharing of login credentials with third parties is prohibited. Any activity performed using a User’s ID and password will be regarded as the responsibility of the User.</p>
      <h4>Article 4 (Prohibited Activities)</h4>
      <p>Users agree not to engage in any of the following actions while using the Service:</p>
      <ul>
        <li>Violating applicable laws, regulations, or public order and decency.</li>
        <li>Participating in any criminal activities.</li>
        <li>Interfering with or damaging the Company’s servers or networks.</li>
        <li>Disrupting the functionality or availability of the Service.</li>
        <li>Collecting or storing personal data about other Users without their consent.</li>
        <li>Impersonating other Users or entities.</li>
        <li>Engaging in activities that benefit criminal organizations, directly or indirectly.</li>
        <li>Any other actions deemed inappropriate by the Company.</li>
      </ul>
      <h4>Article 5 (Service Restrictions and Suspension)</h4>
      <p>The Company reserves the right to restrict or suspend access to all or part of the Service, without prior notice to Users, in the following circumstances:</p>
      <ul>
        <li>During system maintenance, updates, or inspections.</li>
        <li>When services cannot be provided due to natural disasters or other force majeure events such as earthquakes, fires, or blackouts.</li>
        <li>In the event of technical failures or disruptions in communication systems.</li>
        <li>Any other situation where the Company deems it necessary to suspend the Service.</li>
      </ul>
      <h4>Article 6 (Termination or Restriction of User Accounts)</h4>
      <p>The Company reserves the right to terminate or restrict a User’s access to the Service without prior notice under the following conditions:</p>
      <ul>
        <li>If the User violates these Terms.</li>
        <li>If the User registered with false information.</li>
        <li>In any other instance where the Company determines that the use of the Service is inappropriate.</li>
      </ul>
      <h4>Article 7 (Disclaimer of Liability)</h4>
      <p>The Company does not assume any responsibility for the accuracy or reliability of content provided by Users on the Service. Users agree that the Company shall not be held liable for any damages, losses, or disputes resulting from the use of the Service, regardless of fault. Additionally, the Company is not responsible for issues arising from the downloading or uploading of files through the Service. Any interactions, transactions, or disputes between Users or third parties are the sole responsibility of the involved parties.</p>
      <h4>Article 8 (Modification of Service Content)</h4>
      <p>The Company reserves the right to change or discontinue any aspect of the Service at any time without notice. The Company is not liable for any damages or inconveniences caused to Users or third parties as a result of these changes.</p>
      <h4>Article 9 (Amendment of Terms)</h4>
      <p>The Company reserves the right to amend these Terms at its discretion without prior notice to Users. Users will be subject to the latest version of the Terms as posted on the Company’s website at the time of use.</p>
      <h4>Article 10 (Communication and Notifications)</h4>
      <p>Any notices or communications between the Company and Users will be conducted via methods determined by the Company, such as email or postings on the platform.</p>
      <h4>Article 11 (Transfer of Rights)</h4>
      <p>Users may not transfer or assign their rights or obligations under these Terms to any third party without the Company’s written consent. Such rights may not be used as collateral.</p>
      <h4>Article 12 (Governing Law and Jurisdiction)</h4>
      <p>These Terms are governed by the laws of Japan. In the event of any disputes arising in connection with the Service, the Tokyo District Court or the court of jurisdiction where the Company’s headquarters is located shall have exclusive jurisdiction.</p>
    </div>
    `
  );

  return (
    <div className="terms-container">
      {userProfile && <h1>Terms and Conditions of Use</h1>}

      <div dangerouslySetInnerHTML={{ __html: agreementContent }} />
      {/* 
       <PDFDownloadLink
        document={<DynamicAgreementPDF
          agreementType={agreementType}
          fullContent={agreementContent}
        />}
        fileName="agreement.pdf"
        className="download-link"
      >
        {({ loading }) => (loading ? 'Loading document...' : 'Download Agreement PDF')}
      </PDFDownloadLink>
      */}
     

      {userProfile && <AgreementForm agreementType={agreementType} agreementContent={agreementContent} />}
    </div>
  );
}

export default TermsAndConditions;
