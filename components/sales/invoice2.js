import React, { useState, useEffect } from "react";
import { useUser } from "../user/userContext"; // Importing the useUser hook to access user data
import Modal from "../common/alertModal";
import GeneratePdfButton from "./invoicePdf";
import { generatePdfBlob } from "./invoicePdf"; // Import the generatePdfBlob function
import { apiBaseUrl } from '../utilities/apiBase';
import { getCsrfToken } from '../utilities/csrfToken';
import { INVOICE_TYPE_TITLES } from "../forms/invoiceForm/constants";
import { exportInvoiceXlsx } from "./invoiceExcel";

// Customer-entered text goes into an HTML email; escape it.
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (v, currency) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && String(v ?? "") !== "" ? `${n.toLocaleString("en-US")} ${currency || ""}`.trim() : "";
};

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
      const typeTitle = INVOICE_TYPE_TITLES[invoiceData.invoiceType] || "DEPOSIT INVOICE";
      const typeLabel = typeTitle.charAt(0) + typeTitle.slice(1).toLowerCase();
      const cur = invoiceData.depositCurrency;
      const totalNum = Number(String(invoiceData.totalPrice ?? "").replace(/,/g, "")) || 0;
      const dueNum = Number(String(invoiceData.depositAmount ?? "").replace(/,/g, "")) || 0;
      const li = (label, value) => (value ? `<li><strong>${label}:</strong> ${esc(value)}</li>` : "");
      const emailBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #0f4c5c;">Dear ${esc(invoiceData.customerFullName)},</h2>
          <p>Thank you for your order with <strong>Eljawad Motors</strong>. Your ${esc(typeLabel.toLowerCase())} is attached as a PDF. Here are the details:</p>
          <ul>
              ${li("Invoice Number", formattedInvoiceNumber)}
              ${li("Invoice Date", invoiceData.invoiceDate)}
              ${li("Valid Until", invoiceData.expiryDate)}
              ${li("Payment Description", invoiceData.depositDescription)}
              ${totalNum > dueNum ? li("Total Price", money(totalNum, cur)) : ""}
              ${li(`Amount Due Now${invoiceData.paymentTerms && totalNum > dueNum ? ` (${invoiceData.paymentTerms})` : ""}`, money(invoiceData.depositAmount, cur))}
              ${totalNum > dueNum ? li("Balance Due", money(totalNum - dueNum, cur)) : ""}
              ${li("Destination", [invoiceData.destinationCountry, invoiceData.destinationPort].filter(Boolean).join(", "))}
          </ul>
          <p>Please put the invoice number in your payment reference. Only pay into an account confirmed by an email from @eljawad.com.</p>
          <p>Questions? Contact us at <a href="mailto:contact@eljawad.com">contact@eljawad.com</a>.</p>
          <p style="color: #0f4c5c;"><strong>Best regards,</strong><br>Eljawad Motors</p>
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
          subject: `${typeLabel} ${formattedInvoiceNumber} from Eljawad Motors`,
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
          vehicleRef: invoiceData.vehicleRef,
          invoiceType: invoiceData.invoiceType,
          totalPrice: invoiceData.totalPrice,
          paymentTerms: invoiceData.paymentTerms,
          expiryDate: invoiceData.expiryDate,
          customerPhone: invoiceData.customerPhone,
          country: invoiceData.country,
          customerCompany: invoiceData.customerCompany,
          customerAddress: invoiceData.customerAddress,
          bankNote: invoiceData.bankNote,
          destinationCountry: invoiceData.destinationCountry,
          destinationPort: invoiceData.destinationPort,
          preExportInspection: invoiceData.preExportInspection,
        }),
      });

      if (!response.ok) {
        // Show the server's own reason (e.g. "saved as draft, but the email failed: ...").
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Failed to send invoice (HTTP ${response.status})`);
      }

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
      showAlert(error.message || "An error occurred while submitting the invoice.");
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
          <button onClick={() => exportInvoiceXlsx(invoiceData, formattedInvoiceNumber).catch((e) => showAlert(`Excel export failed: ${e.message}`))}>
            Excel
          </button>
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