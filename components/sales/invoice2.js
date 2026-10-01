import React, { useState, useEffect } from "react";
import { useUser } from "../user/userContext"; // Importing the useUser hook to access user data
import Modal from "../common/alertModal";
import GeneratePdfButton from "./invoicePdf";
import { generatePdfBlob } from "./invoicePdf"; // Import the generatePdfBlob function
import { apiBaseUrl } from '../utilities/apiBase';
import { getCsrfToken } from '../utilities/csrfToken';

// Modal Component
const InvoiceModal = ({ isOpen, onClose, invoiceData, onEdit, setInvoiceState, regenerateParam , resetInvoiceState}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // Loading state
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState(""); // Could be 'alert', 'confirmation', or 'clear_all'
  const { user } = useUser(); // Accessing user data from the context
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfError, setPdfError] = useState("");

  // Preview the real PDF (the same document emailed to the customer) rather
  // than a separately maintained HTML copy that can drift from it.
  useEffect(() => {
    if (!isOpen || !invoiceData) return undefined;
    let cancelled = false;
    let url = null;
    setPdfUrl(null);
    setPdfError("");
    generatePdfBlob(invoiceData)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch((err) => {
        console.error("Invoice PDF preview failed:", err);
        if (!cancelled) setPdfError("The PDF preview could not be generated. Try Edit Invoice, then preview again.");
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, invoiceData]);

  if (!isOpen) return null;

  const apiUrl = apiBaseUrl;

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const showAlert = (message, type = "alert") => {
    setIsGeneratingPdf(true); // Show spinner
    setTimeout(() => {
      setIsGeneratingPdf(false); // Hide spinner
      setModalMessage(message);
      setModalType(type);
      setShowModal(true);
    }, 1000); // Delay for 1 second
  };

  const handleSendEmail = async () => {
    if (!user) {
      showAlert("You must be logged in to submit the invoice.");
      return;
    }

    try {
      setIsGeneratingPdf(true);

      // Step 1: Generate the PDF as a Blob
      console.log("Generating PDF...");
      const pdfBlob = await generatePdfBlob(invoiceData);
      console.log(`PDF size: ${(pdfBlob.size / 1024 / 1024).toFixed(2)} MB`);

      if (pdfBlob.size === 0) {
        throw new Error("Generated PDF Blob is empty.");
      }

      // Step 2: Convert PDF Blob to Base64
      const convertBlobToBase64 = (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(",")[1]); // Get Base64 string without the "data:" prefix
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

      const base64Pdf = await convertBlobToBase64(pdfBlob);
      console.log("PDF converted to Base64 successfully.");

      // Step 3: Construct email body (HTML format)
      const emailBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #004080;">Dear ${invoiceData.customerFullName},</h2>
          <p>Thank you for placing your order with <strong>Eljawad Motors Inc.</strong></p>
          <p>This is an automated email to provide you with the deposit invoice for your orders Below are the details of the invoice:</p>
          <h3 style="color: #004080;">Invoice Details:</h3>
          <ul>
              <li><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</li>
              <li><strong>Invoice Date:</strong> ${invoiceData.invoiceDate}</li>
              <li><strong>Payment Description:</strong> ${invoiceData.depositDescription}</li>
              <li><strong>Payment Amount:</strong> ${invoiceData.depositAmount} ${invoiceData.depositCurrency}</li>
              <li><strong>Due Date:</strong> Due immediately</li>
              <li><strong>Expiry Date:</strong> ${invoiceData.expiryDate}</li>
              <li><strong>Serial Number:</strong> ${invoiceData.serialNumber}</li>
          </ul>
          <p>Please process the Payment by the due date to proceed with your order. Once the payment is confirmed, we will begin processing your request and keep you informed of the next steps.</p>
          <p>For any questions or concerns, feel free to contact us at: <a href="mailto:contact@eljawad.com">contact@eljawad.com</a>.</p>
          <p>Thank you for choosing <strong>Eljawad Motors Inc.</strong>.</p>
          <p style="color: #004080;"><strong>Best regards,</strong><br>Eljawad Motors Inc.</p>
      </div>
    `;

      // Step 4: Send the email with the PDF attachment
      const response = await fetch(`${apiUrl}/finance/invoices/sendInvoice.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() || "" },
        body: JSON.stringify({
          to: invoiceData.customerEmail,
          bcc: "contact@eljawad.com",
          subject: `Automated Deposit Invoice from Eljawad Motors Inc.`,
          body: emailBody,
          attachment: base64Pdf,
          invoiceNumber: formattedInvoiceNumber,
          customerFullName: invoiceData.customerFullName,
          depositAmount: invoiceData.depositAmount,
          depositPurpose: invoiceData.depositPurpose,
          depositCurrency: invoiceData.depositCurrency,
          depositDescription: invoiceData.depositDescription,
          serialNumber: invoiceData.serialNumber,
          invoiceDate: invoiceData.invoiceDate,
          vehicleDescription: invoiceData.vehicleDescription,
          mileage: invoiceData.mileage,
          chasisNumber: invoiceData.chasisNumber,
          engineCapacity: invoiceData.engineCapacity,
          make: invoiceData.make,
          model: invoiceData.model,
        }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to send invoice");

      const data = await response.json();
      showAlert("Invoice sent successfully!");
        // Update the URL query to set regenerate=false
      // Update the URL query to set regenerate=false
      resetInvoiceState();

      
      // Reload the page after 3 seconds (3000 milliseconds)
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Error sending invoice:", error);
      showAlert("An error occurred while submitting the invoice.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const Spinner = () => (
    <div className="spinner">
      <div className="double-bounce1"></div>
      <div className="double-bounce2"></div>
    </div>
  );

  const handleEditInvoice = () => {
    onClose(); // Close the modal
    onEdit(invoiceData); // Pass the invoice data to the parent component for editing
  };
  const invoiceNumber = invoiceData.invoiceNumber;

  // Replace all repeated words separated by hyphens globally
  const formattedInvoiceNumber = invoiceNumber.replace(/(\b\w+\b)(-\1)+/, "$1");
  window.scrollTo(1,0);


  return (
    <div className="invoice-modal-overlay">
      {isGeneratingPdf && (
        <div className="spinner-overlay">
          <Spinner />
        </div>
      )}
      {!isGeneratingPdf && showModal && (
        <Modal
          message={modalMessage}
          onClose={handleCloseModal}
          type={modalType}
        />
      )}

      <div className="modal-content invoice-pdf-modal">
        <div className="invoice-pdf-toolbar">
          <div className="invoice-pdf-title">
            <strong>Invoice preview</strong>
            <span>
              {invoiceData.invoiceNumber}
              {invoiceData.customerFullName ? ` · ${invoiceData.customerFullName}` : ""}
            </span>
          </div>
          <button className="invoice-pdf-close" onClick={onClose} aria-label="Close preview">
            ×
          </button>
        </div>

        <div className="invoice-pdf-frame">
          {pdfError ? (
            <p className="invoice-pdf-status invoice-pdf-error">{pdfError}</p>
          ) : !pdfUrl ? (
            <div className="invoice-pdf-status">
              <Spinner />
              <p>Rendering the PDF…</p>
            </div>
          ) : (
            <iframe src={`${pdfUrl}#view=FitH&navpanes=0`} title="Invoice PDF preview" />
          )}
        </div>
        {pdfUrl && (
          <p className="invoice-pdf-hint">
            Preview not showing (common on phones)?{" "}
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Open the PDF in a new tab
            </a>
            .
          </p>
        )}

        <div className="action-buttons invoice-pdf-actions">
          {(user?.role === "admin" || process.env.NODE_ENV === "development") && (
            <GeneratePdfButton invoiceData={invoiceData} />
          )}
          <button onClick={handleEditInvoice}>Edit Invoice</button>
          <button
            className="invoice-pdf-send"
            onClick={handleSendEmail}
            disabled={isGeneratingPdf || !pdfUrl}
          >
            {isGeneratingPdf ? "Sending…" : "Email invoice to customer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;