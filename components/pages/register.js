import React, {  useState } from 'react';
import { countries } from '../utilities/countries';
import useCheckScreenSize from '../utilities/screenSize';
/*import SignupForm from '../forms/registerForm';*/
import TermsAndConditions from "../help/terms";
import PrivacyPolicy from '../help/privacy'; // Import the PrivacyPolicy component
//import '../../css/pages/register.css';
import SignupForm from '../forms/registerForm2';
const RegisterForm = () => {
  const [modalType, setModalType] = useState(null); // State to manage which modal is open
  const { isSmallScreen } = useCheckScreenSize();
  const [, setIsTermsModalOpen] = useState(false); // Modal state for terms
  //const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false); // Modal state for privacy

  return (
    <div className='register-wrapper'>
      <div className="register-container">
        <div className="account-container">
          <img src={`/images/logo-eljawad-dark.svg`} alt="Logo" className="logo-form" />

          <div className="header">
            <span className="person-icon">
              <i className="fas fa-user-plus"></i>
            </span>
            <h2>Create an Account</h2>
          </div>

          <SignupForm setIsModalOpen={setIsTermsModalOpen} modalType={modalType} setModalType={setModalType} />

       
        </div>

        {/* Modals */}
      {modalType === 'terms' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div style={{maxHeight: isSmallScreen ? '60dvh': '90dvh'}} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <TermsAndConditions />
            <button className="close-modal" onClick={() => setModalType(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {modalType === 'privacy' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <PrivacyPolicy />
            <button className="close-modal" onClick={() => setModalType(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default RegisterForm;