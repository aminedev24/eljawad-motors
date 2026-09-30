import React from "react";
import Head from "next/head";

import Modal from "../common/alertModal";
import InvoiceModal from "../sales/invoice2";

import { useInvoiceFormState } from "./invoiceForm/useInvoiceFormState";
import {
  AuthPrompt,
  UserInfoSection,
  PaymentDetailsSection,
  BankNoteSection,
  SubmitSection,
} from "./invoiceForm/sections";

const ProformaInvoiceForm = () => {
  const {
    user,
    phoneCode,
    formData,
    handleChange,
    handleSubmit,
    makes,
    models,
    handleMakeChange,
    isSubmitting,
    isModalOpen,
    submittedInvoiceData,
    handleEditInvoice,
    handleCloseModal,
    regenerate,
    regenerateParam,
    resetInvoiceState,
    handleTypingStart,
    isBankNoteEditable,
    toggleBankNoteEditable,
    showModal,
    modalMessage,
    modalType,
    isDataLoaded,
    handleLoginRedirect,
    handleRegisterRedirect,
  } = useInvoiceFormState();

  return (
    <>
      <Head>
        <title>Eljawad Motors Inc. | Invoice Generator</title>
        <meta name="description" content="Easily generate invoices." />
      </Head>
      <div className="enquiry-wrapper invoice-wrapper">
        {showModal && (
          <Modal
            message={modalMessage}
            onClose={handleCloseModal}
            type={modalType}
          />
        )}

        <form onSubmit={handleSubmit}>
          <div className="enquiryContainer contact-container">
            <img src="/images/logo-eljawad-dark.svg" alt="Logo" className="logo-form" />

            <h2 className="header">Proforma Invoice Generation</h2>

            <AuthPrompt
              user={user}
              onLogin={handleLoginRedirect}
              onRegister={handleRegisterRedirect}
            />

            <p className="invoice-prompt">
              Please fill out the details below to generate a proforma invoice.
            </p>

            <UserInfoSection
              formData={formData}
              onChange={handleChange}
              phoneCode={phoneCode}
              isDataLoaded={isDataLoaded}
              user={user}
            />

            <PaymentDetailsSection
              formData={formData}
              onChange={handleChange}
              makes={makes}
              models={models}
              onMakeChange={handleMakeChange}
              handleTypingStart={handleTypingStart}
            />

            <BankNoteSection
              isEditable={isBankNoteEditable}
              onToggleEditable={toggleBankNoteEditable}
              formData={formData}
              onChange={handleChange}
            />

            <SubmitSection
              isSubmitting={isSubmitting}
              regenerate={regenerate}
              onReset={resetInvoiceState}
            />
          </div>
        </form>

        {isModalOpen && submittedInvoiceData && (
          <InvoiceModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            invoiceData={submittedInvoiceData}
            onEdit={handleEditInvoice}
            regenerateParam={regenerateParam}
            resetInvoiceState={resetInvoiceState}
          />
        )}
      </div>
    </>
  );
};

export default ProformaInvoiceForm;
