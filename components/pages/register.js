import React, { useEffect, useState } from 'react';
import TermsAndConditions from "../help/terms";
import PrivacyPolicy from '../help/privacy';
import SignupForm from '../forms/registerForm2';

const POLICY_MODALS = {
  terms: { title: 'Terms & Conditions', Component: TermsAndConditions },
  privacy: { title: 'Privacy Policy', Component: PrivacyPolicy },
};

// Terms / privacy shown over the form rather than beside it.
const PolicyModal = ({ type, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const { title, Component } = POLICY_MODALS[type];
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 id="policy-modal-title" className="text-lg font-bold text-[var(--primary-color)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm leading-relaxed text-gray-700">
          <Component />
        </div>
        <div className="border-t border-gray-200 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-[var(--primary-color)] px-5 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const RegisterForm = () => {
  const [modalType, setModalType] = useState(null); // 'terms' | 'privacy' | null

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

          <SignupForm setModalType={setModalType} />
        </div>
      </div>

      {modalType && <PolicyModal type={modalType} onClose={() => setModalType(null)} />}
    </div>
  );
};

export default RegisterForm;
