import React from "react";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import AdminInvoicePdf from './adminInvoicePdf';
import { BANK_DETAILS_PENDING_NOTICE, hasBankDetails } from "../forms/invoiceForm/constants";

import {
  StyleSheet,
  Document,
  Page,
  View,
  Text,
  Image,
} from "@react-pdf/renderer";
import { FaEnvelope, FaGlobe } from "react-icons/fa";
import SalesAgreementPDF from "./salesAgreementPdf";
import { InvoiceHeaders } from "./invoiceHeaders";
import { formatNumberWithUnit } from "../utilities/numberFormat";
import "./pdfFonts";

const resolvePublicAsset = (relativePath) => {
  if (!relativePath) {
    return relativePath;
  }

  if (/^https?:\/\//i.test(relativePath)) {
    return relativePath;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${relativePath}`;
  }

  const fallbackBase =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "";

  if (fallbackBase) {
    const base = fallbackBase.endsWith("/")
      ? fallbackBase.slice(0, -1)
      : fallbackBase;
    return `${base}${relativePath}`;
  }

  return relativePath;
};

const arrayBufferToBase64 = (buffer) => {
  if (typeof window === "undefined") {
    return Buffer.from(buffer).toString("base64");
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const fetchAssetAsDataUri = async (relativePath, fallbackMime = "image/png") => {
  const resolvedUrl = resolvePublicAsset(relativePath);

  try {
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new Error(`Failed to load asset: ${resolvedUrl}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || fallbackMime;
    const base64 = arrayBufferToBase64(arrayBuffer);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(error);
    return resolvedUrl;
  }
};

let invoiceAssetCache = null;

export const loadInvoiceAssets = async () => {
  if (invoiceAssetCache) {
    return invoiceAssetCache;
  }

  const [signature, stamp] = await Promise.all([
    fetchAssetAsDataUri("/images/signature/absignature.png"),
    fetchAssetAsDataUri("/images/signature/abstamp.png"),
  ]);

  invoiceAssetCache = { signature, stamp };
  return invoiceAssetCache;
};

// Define styles for the PDF
const styles = StyleSheet.create({
  text: { // This is a general style you defined but might not be used everywhere
    hyphenationCallback: null,
    wordBreak: "break-word",
  },

  invoiceContainer: {
    padding: "5px 10px",
    fontFamily: "Roboto",
    minHeight: "100%",
  },
 
  contactInfo: {
    maxWidth: "32%",
  },
  contactInfoText: {
    margin: 0,
    fontSize: "11px",
    lineHeight: 1.5, // Adjust line height for better readability
    marginBottom: "5px",
  },

  icon: {
    color: "#1e3a8a",
    marginRight: "5px",
    display: "inline-block",
  },
  companyName: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "5px",
    paddingBottom: "10px",
  },
  invoiceTitle: {
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "bold",
    marginTop: 5,
  },
  invoiceInfo: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: "5px",
    position: "relative",
  },
  left: {
    width: "48%",
  },
  right: {
    width: "45%",
    textAlign: "right",
  },
  rightImage: {
    position: "absolute",
    top: 0,
    right: "5%",
    width: "100px",
  },
  invoiceBankInfo: {
    marginBottom: "5px",
  },
  bankInfoText: {
    margin: 0,
    fontSize: "11px",
    lineHeight: 1.5, // Consistent line height
  },
  important: {
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    marginBottom: "5px",
    display: "flex",
    flexDirection: "row",
    gap: "4px",
  },
  notice: {
    backgroundColor: "#1da1f2",
    color: "#000",
    fontWeight: "bold",
    padding: "10px",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    display: "flex",
    alignItems: "center",
    flex: 2,
    fontSize: "11px",
  },
  invoiceNumber: {
    alignSelf: "center",
    flex: 3.5,
    fontWeight: "bold",
    fontSize: "11px",
  },
  warning: {
    backgroundColor: "transparent",
    marginLeft: 0,
    fontWeight: "bold",
    flex: 6,
    fontSize: "11px",
    alignSelf: "center",
  },
  red: {
    color: "red",
  },
  itemsTable: {
    display: "table",
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "5px",
  },
  tableRow: {
    display: "table-row",
  },
  tableHeader: {
    display: "table-cell",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    padding: "5px",
    textAlign: "left",
    fontWeight: "bold",
    backgroundColor: "#1da1f2",
    fontSize: "11px",
    color: "#fff",
  },
  tableCell: {
    display: "table-cell",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    padding: "5px",
    textAlign: "left",
    fontSize: "11px",
  },
  noteAmountContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "5px",
  },
  note: {
    width: "57%",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    hyphenationCallback: null, // Prevents hyphenation
    wordBreak: "break-word", // Ensures words break naturally
    padding: "5px",
  },
  amountContainer: {
    width: "40%",
  },
  amountTable: {
    display: "table",
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "5px",
  },
  amountTableRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
  },
  amountTableHeader: {
    flex: 1,
    textAlign: "left",
    padding: "8px",
    fontWeight: "bold",
    backgroundColor: "#1da1f2",
    fontSize: "11px",
    color: "#fff",
  },
  amountTableCell: {
    flex: 1,
    textAlign: "right",
    padding: "8px",
    fontSize: "11px",
  },
  instructions: {
    marginBottom: "5px",
    maxWidth: "57%",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    hyphenationCallback: null, // Prevents hyphenation
    wordBreak: "break-word", // Ensures words break naturally
  },
  instructionsList: {
    margin: 0,
    paddingLeft: "10px",
    listStyleType: "disc",
  },
  instructionsListItem: {
    fontSize: "11px",
    lineHeight: 1.5, // Consistent line height
    marginBottom: "5px",
  },
  invoiceFooterContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  footerRowContainer: {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
   alignItems: "center",
 },
  invoiceFooter: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  signatureContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  signature: {
    width: "100px",
    position: "relative",
    left: "25%",
  },
  stamp: {
    width: "50px",
  },
 
  tableRows: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
  },
  tableHeaders: {
    flex: "1",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    padding: "5px",
    textAlign: "left",
    fontWeight: "bold",
    backgroundColor: "#1da1f2",
    fontSize: "11px",
    color: "#fff",
  },
  tableCells: {
    flex: "1",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    padding: "5px",
    textAlign: "left",
    fontSize: "11px",
  },
  noticeContainer: {
    padding: "10px",
    backgroundColor: "#f9f9f9",
    borderLeftWidth: 5,
    borderLeftColor: "#1da1f2",
  },
  noticeText: {
    fontSize: "10px",
    color: "#333",
    textAlign: "justify",
    lineHeight: "1.5",
    fontWeight: "600",
  },

  /* new table layout header top cell bottom */
  table: {
    borderWidth: 1,
    borderColor: "#000",
    marginTop: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row", // This displays cells horizontally
  },
  cell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
    fontSize: "11px",
    padding: "5px",
    // For general cells, you might want words to break nicely if they are too long
    wordBreak: "break-word", // Allows breaking at appropriate points (like spaces)
    // If you want to disable hyphenation for ALL table cells:
    hyphenationCallback: null,
    // whiteSpace: "normal", // Default, allows wrapping
  },
  chassisCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    textAlign: "center",
    fontSize: "11px",
    padding: "5px",
    hyphenationCallback: null, // <--- ADD THIS LINE
    // You can also use: hyphenationCallback: (word) => [word],
    // These properties help prevent the text from wrapping if it's too long,
    // but hyphenationCallback is the key for the hyphen issue.
    whiteSpace: "nowrap",    // Prevents the string from wrapping to a new line
    wordBreak: "keep-all",   // Tries to keep the entire "word" (the chassis number) together
    hyphenationCallback: word => [word],
  },
  headerCell: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: "11px",
    backgroundColor: "#1da1f2",
    padding: "5px",
    wordBreak: "break-word", // Break long words
    whiteSpace: "normal", // Allow text wrapping
    overflow: "hidden", // Prevent overflow
  },
});
function formatStringWithNumber(input) {
  // Convert the input to a string (handles numbers or other types)
  const str = input != null ? input.toString() : "";
  return str.replace(/\d+/g, (match) => Number(match).toLocaleString());
}

const calculatePageHeight = (invoiceData) => {
  // Base A4 height (842 points for 11.69 inches)
  let baseHeight = 842;
  // Add extra space based on content conditions
  if (invoiceData.depositPurpose === "order vehicle") baseHeight += 20;
  if (invoiceData.bankNote) baseHeight += 10;
  return baseHeight;
};
var invoiceData, formattedInvoiceNumber;

const MyPdfDocument = ({ invoiceData, assets = {} }) => {
  const invoiceNumber = invoiceData.invoiceNumber;
  const formattedInvoiceNumber = invoiceNumber.replace(/(\b\w+\b)-\1-/, "$1-");
  //console.log(formattedInvoiceNumber);
  return (
    <Document>
      <Page style={styles.invoiceContainer} wrap={false}>
        {/*<InvoiceHeaders invoiceData={invoiceData} formattedInvoiceNumber={formattedInvoiceNumber} />
        {invoiceHeaders(i
        nvoiceData, formattedInvoiceNumber)}
        {/* Title */}
         <InvoiceHeaders 
          invoiceData={invoiceData} 
          formattedInvoiceNumber={formattedInvoiceNumber} 
          styles={styles}
        />
        <Text style={styles.invoiceTitle}>
          {invoiceData.depositPurpose == "order vehicle" ? "" : "Deposit"}{" "}
          Invoice
        </Text>

        {/* Invoice Info */}
        <View style={styles.invoiceInfo}>
          <View style={styles.left}>
            <Text style={styles.contactInfoText}>
              <Text style={{ fontWeight: "600" }}>Full name:</Text>{" "}
              {invoiceData.customerFullName}
            </Text>
            <Text style={styles.contactInfoText}>
              <Text style={{ fontWeight: "600" }}>Company:</Text>{" "}
              {invoiceData.customerCompany
                ? invoiceData.customerCompany
                : "not specified"}
            </Text>
            <Text style={styles.contactInfoText}>
              <Text style={{ fontWeight: "600" }}>Address:</Text>{" "}
              {invoiceData.customerAddress}
            </Text>
            <Text style={styles.contactInfoText}>
              <Text style={{ fontWeight: "600" }}>Phone Number:</Text>{" "}
              {invoiceData.customerPhone}
            </Text>
            <Text style={styles.contactInfoText}>
              <Text style={{ fontWeight: "600" }}>Email:</Text>{" "}
              {invoiceData.customerEmail}
            </Text>
          </View>
          <View style={styles.right}>
            <Image
              style={styles.rightImage}
              src={`/images/qr.jpeg`}
            />
          </View>
        </View>

        <View style={styles.invoiceBankInfo}>
          {!hasBankDetails(invoiceData) ? (
            <Text style={styles.contactInfoText}>
              <Text style={{ fontWeight: "bold" }}>Payment details:</Text>{" "}
              {BANK_DETAILS_PENDING_NOTICE}
            </Text>
          ) : invoiceData.depositCurrency === "USD" ? (
            <>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Beneficiary Name:</Text>{" "}
                {invoiceData.beneficiaryName}
              </Text>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Bank Name:</Text>{" "}
                {invoiceData.bankName}
              </Text>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Branch Name:</Text>{" "}
                {invoiceData.branchName}
              </Text>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Bank Address:</Text>{" "}
                {invoiceData.bankAddress}
              </Text>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Swift Code:</Text>{" "}
                {invoiceData.swiftCode}
              </Text>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Account Number:</Text>{" "}
                {invoiceData.accountNumber}
              </Text>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Beneficiary Address:</Text>{" "}
                {invoiceData.beneficiaryAddress}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Beneficiary Name:</Text>{" "}
                {invoiceData.beneficiaryName}
              </Text>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>IBAN:</Text>{" "}
                {invoiceData.iban}
              </Text>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>SWIFT/BIC:</Text>{" "}
                {invoiceData["swift/bic"]}
              </Text>
              <Text
                style={[
                  styles.contactInfoText,
                  {
                    maxWidth:
                      invoiceData.depositCurrency !== "USD" ? "65%" : "",
                  },
                ]}
              >
                <Text style={{ fontWeight: "bold" }}>
                  Bank Name and Address:
                </Text>{" "}
                {invoiceData["bank name and address"]}
              </Text>
            </>
          )}
        </View>

        {/* Important Section */}
        <View style={styles.important}>
          <View style={styles.notice}>
            <Text>Important</Text>
          </View>
          <View style={styles.invoiceNumber}>
            <Text>Invoice number: {formattedInvoiceNumber}</Text>
          </View>
          <View style={styles.warning}>
            <Text>
              <Text style={styles.red}>Be careful</Text>, avoid being scammed!
              Confirm our correct bank account before you send your money!
            </Text>
          </View>
        </View>

        {/* Description Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableRow}>
            <Text style={styles.tableHeader}>Payment Description</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>
              {invoiceData.depositDescription}
            </Text>
          </View>
        </View>

        {invoiceData.depositPurpose === "order vehicle" && (
          <View style={styles.table}>
            {/* Header Row */}
            <View style={styles.row}>
              <Text style={[styles.cell, styles.headerCell]}>Make</Text>
              <Text style={[styles.cell, styles.headerCell]}>Model</Text>
              <Text style={[styles.cell, styles.headerCell]}>
                Engine Capacity
              </Text>
              <Text style={[styles.cell, styles.headerCell]}>Mileage</Text>
              <Text style={[styles.cell, styles.headerCell]}>
                Chassis Number
              </Text>
            </View>
            {/* Data Row */}
            <View style={styles.row}>
              <Text style={styles.cell}>{invoiceData.make}</Text>
              <Text style={styles.cell}>{invoiceData.model}</Text>
              <Text style={styles.cell}>
                {formatNumberWithUnit(invoiceData.engineCapacity) || "not specified"} cc
              </Text>
              <Text style={styles.cell}>
                odo {formatNumberWithUnit(invoiceData.mileage) || "not specified"} km
              </Text>
              <Text style={[styles.cell, styles.chassisCell]}>
                {invoiceData.chasisNumber ? invoiceData.chasisNumber : "not specified"}
              </Text>
            </View>
          </View>
        )}

        {/* Note and Amount Section */}
        <View style={[styles.noteAmountContainer]}>
          {invoiceData.bankNote ? (
            <View style={styles.note}>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>
                  Note (By the Remitter):
                </Text>
              </Text>
              <Text style={styles.contactInfoText}>{invoiceData.bankNote}</Text>
            </View>
          ) : (
            <View style={styles.instructions}>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Instructions:</Text>
              </Text>
              <View style={styles.instructionsList}>
                <Text style={styles.instructionsListItem}>
                  •Please ensure all transfer fees are covered by the sender to
                  avoid any shortfall.
                </Text>
                <Text style={styles.instructionsListItem}>
                  •Include the invoice number in the payment reference for
                  accurate processing.
                </Text>
                <Text style={styles.instructionsListItem}>
                  •Funds will be applied upon receipt in full.Kindly notify us
                  once the payment is completed.
                </Text>
                <Text style={styles.instructionsListItem}>
                  •Please note that our bank is located in Japan and
                </Text>
                <Text style={styles.instructionsListItem}>
                  international transfers may take 3-5 business days to reflect.
                </Text>
              </View>
            </View>
          )}
          <View style={styles.amountContainer}>
            <View style={styles.amountTable}>
              {/* Deposit Amount Row */}
              <View style={styles.amountTableRow}>
                <Text style={styles.amountTableHeader}>Deposit amount</Text>
                <Text style={styles.amountTableCell}>
                  {invoiceData.depositAmount.toLocaleString()}{" "}
                  {invoiceData.depositCurrency}
                </Text>
              </View>
              {/* Grand Total Row */}
              <View style={styles.amountTableRow}>
                <Text style={styles.amountTableHeader}>Grand Total</Text>
                <Text style={styles.amountTableCell}>
                  {invoiceData.depositAmount.toLocaleString()}{" "}
                  {invoiceData.depositCurrency}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer Section */}
        <View
          style={[
            styles.invoiceFooterContainer,
            !invoiceData.bankNote && styles.footerRowContainer, // Apply row layout when instructions are in place of the note
          ]}
        >
          {/* Render instructions in the footer only if bankNote is present */}
          {invoiceData.bankNote && (
            <View style={styles.instructions}>
              <Text style={styles.contactInfoText}>
                <Text style={{ fontWeight: "bold" }}>Instructions:</Text>
              </Text>
              <View style={styles.instructionsList}>
                <Text style={styles.instructionsListItem}>
                  •Please ensure all transfer fees are covered by the sender to
                  avoid any shortfall.
                </Text>
                <Text style={styles.instructionsListItem}>
                  •Include the invoice number in the payment reference for
                  accurate processing.
                </Text>
                <Text style={styles.instructionsListItem}>
                  •Funds will be applied upon receipt in full.Kindly notify us
                  once the payment is completed.
                </Text>
                <Text style={styles.instructionsListItem}>
                  •Please note that our bank is located in Japan and
                </Text>
                <Text style={styles.instructionsListItem}>
                  international transfers may take 3-5 business days to reflect.
                </Text>
              </View>
            </View>
          )}
          <View
            style={[!invoiceData.bankNote && styles.invoiceFooterContainer]}
          >
            {/* Notice Container */}
            {!invoiceData.bankNote && (
              <View
                style={[
                  styles.noticeContainer,
                  !invoiceData.bankNote ? { maxWidth: "57%" } : {}, // Conditional style
                ]}
              >
                <Text style={styles.noticeText}>
                  This invoice is intended solely for legal and official
                  purposes. Any unauthorized use, modification, or
                  misrepresentation of its content is strictly prohibited and
                  may result in legal action.
                </Text>
              </View>
            )}
            <View style={[styles.invoiceFooter]}>
              <Text style={styles.contactInfoText}>
                Authorised Sales Signature
              </Text>
              <Text style={styles.contactInfoText}>
                Thank you for your business!
              </Text>
            </View>
          </View>
        </View>

        {/* Render noticeContainer below the footer if bankNote is present */}
        {invoiceData.bankNote && (
          <View style={styles.noticeContainer}>
            <Text style={styles.noticeText}>
              This invoice is intended solely for legal and official purposes.
              Any unauthorized use, modification, or misrepresentation of its
              content is strictly prohibited and may result in legal action.
            </Text>
          </View>
        )}
      </Page>
      
      <Page wrap={false}>
        <SalesAgreementPDF invoiceData={invoiceData} />
      </Page>
    </Document>
  );
};

// Function to generate the PDF as a Blob
export const generatePdfBlob = async (invoiceData) => {
  const assets = await loadInvoiceAssets().catch(() => ({}));
  const blob = await pdf(<MyPdfDocument invoiceData={invoiceData} assets={assets} />).toBlob();
  return blob;
};

// Function to generate and save the PDF
const GeneratePdfButton = ({ invoiceData }) => {
  const handleGeneratePdf = async () => {
    const assets = await loadInvoiceAssets().catch(() => ({}));
    const blob = await pdf(
      <MyPdfDocument invoiceData={invoiceData} assets={assets} />,
    ).toBlob();
    saveAs(
      blob,
      `invoice-${invoiceData.invoiceNumber.replace(/(\b\w+\b)-\1-/, "$1-")}.pdf`,
    );
  };

  return <button onClick={handleGeneratePdf}>Generate PDF</button>;
};

export default GeneratePdfButton;
