import React from "react";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import getConfig from "next/config";
import { BANK_DETAILS_PENDING_NOTICE, INVOICE_TYPE_TITLES, hasBankDetails } from "../forms/invoiceForm/constants";

import {
  StyleSheet,
  Document,
  Page,
  View,
  Text,
  Image,
} from "@react-pdf/renderer";
import SalesAgreementPDF from "./salesAgreementPdf";
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

// react-pdf can't draw SVG, so the invoice uses PNG renders of the logo and a
// QR code pointing at eljawad.com (public/images/invoice/). Paths go through
// basePath so the GitHub Pages build (served under /eljawad-motors) works too.
const withBasePath = (path) => {
  const basePath = getConfig()?.publicRuntimeConfig?.basePath || "";
  return `${basePath}${path}`;
};

export const loadInvoiceAssets = async () => {
  if (invoiceAssetCache) {
    return invoiceAssetCache;
  }

  const [logo, qr] = await Promise.all([
    fetchAssetAsDataUri(withBasePath("/images/invoice/logo-eljawad.png")),
    fetchAssetAsDataUri(withBasePath("/images/invoice/qr-eljawad.png")),
  ]);

  invoiceAssetCache = { logo, qr };
  return invoiceAssetCache;
};

// Brand tokens (match tailwind.config.js / styles/globals.css)
const TEAL = "#0f4c5c";
const TEAL_DARK = "#0a3641";
const TEAL_TINT = "#eef5f6";
const ORANGE = "#e8622c";
const ORANGE_TINT = "#fdf0ea";
const INK = "#1f2937";
const MUTED = "#6b7280";
const LINE = "#d9e2e4";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 36,
    fontFamily: "Roboto",
    fontSize: 9,
    color: INK,
    lineHeight: 1.35,
  },
  bold: { fontWeight: 700 },

  // header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 150 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 20, fontWeight: 700, color: TEAL, letterSpacing: 1.5, lineHeight: 1 },
  serial: { fontSize: 8, color: MUTED, marginTop: 6 },
  rule: { flexDirection: "row", marginTop: 8, marginBottom: 10 },
  ruleTeal: { flex: 5, height: 3, backgroundColor: TEAL },
  ruleOrange: { flex: 1, height: 3, backgroundColor: ORANGE },

  // meta strip
  meta: { flexDirection: "row", backgroundColor: TEAL_TINT, borderRadius: 4, marginBottom: 10 },
  metaCell: { flex: 1, paddingVertical: 5, paddingHorizontal: 10 },
  metaCellDivider: { borderLeftWidth: 1, borderLeftColor: LINE },
  label: { fontSize: 7, color: MUTED, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 700, color: TEAL_DARK },

  // shipping strip (same look as the meta strip, lighter)
  shipping: { flexDirection: "row", borderWidth: 1, borderColor: LINE, borderRadius: 4, marginBottom: 10 },

  // parties
  parties: { flexDirection: "row", marginBottom: 10 },
  card: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 8, marginRight: 10 },
  cardName: { fontSize: 11, fontWeight: 700, color: TEAL_DARK, marginBottom: 3 },
  muted: { color: MUTED },
  qrBlock: { width: 84, alignItems: "center", justifyContent: "center" },
  qr: { width: 64, height: 64 },
  qrCaption: { fontSize: 7, color: MUTED, marginTop: 3, textAlign: "center" },

  // section titles
  sectionTitle: {
    fontSize: 8, fontWeight: 700, color: TEAL, letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 5,
  },

  // payment details
  payment: { marginBottom: 10 },
  payGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: LINE, borderRadius: 4, paddingVertical: 4 },
  payItem: { width: "50%", paddingVertical: 3, paddingHorizontal: 9 },
  payItemWide: { width: "100%", paddingVertical: 3, paddingHorizontal: 9 },
  pending: { backgroundColor: ORANGE_TINT, borderLeftWidth: 3, borderLeftColor: ORANGE, padding: 7, borderRadius: 2 },

  // important banner
  banner: { flexDirection: "row", backgroundColor: TEAL, borderRadius: 4, marginBottom: 10 },
  bannerTag: {
    backgroundColor: ORANGE, color: "#ffffff", fontWeight: 700, fontSize: 9,
    paddingVertical: 6, paddingHorizontal: 10, borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
  },
  bannerText: { flex: 1, color: "#ffffff", fontSize: 9, paddingVertical: 6, paddingHorizontal: 10 },
  bannerStrong: { fontWeight: 700, color: "#ffd9c7" },

  // tables
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 4, marginBottom: 10 },
  thRow: { flexDirection: "row", backgroundColor: TEAL },
  th: { color: "#ffffff", fontWeight: 700, fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 8 },
  tdRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: LINE },
  td: { paddingVertical: 5, paddingHorizontal: 8 },
  colDesc: { flex: 3 },
  colAmount: { flex: 1, textAlign: "right" },
  colEq: { flex: 1 },
  chassis: { flex: 1.4 },

  // instructions + totals
  bottom: { flexDirection: "row", marginBottom: 10 },
  instructions: { flex: 1, marginRight: 14 },
  bullet: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { width: 10, color: ORANGE, fontWeight: 700 },
  bulletText: { flex: 1 },
  note: { borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 7, marginBottom: 6 },
  totals: { width: 200 },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 9,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  grandRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: TEAL, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 4, marginTop: 4,
  },
  grandLabel: { color: "#ffffff", fontWeight: 700, fontSize: 9 },
  grandValue: { color: "#ffffff", fontWeight: 700, fontSize: 13 },

  // sign-off
  signoff: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4 },
  legal: { flex: 1, marginRight: 24, fontSize: 7.5, color: MUTED, lineHeight: 1.5 },
  signature: { width: 180, alignItems: "center" },
  signatureLine: { width: "100%", borderTopWidth: 1, borderTopColor: INK, marginBottom: 3, marginTop: 20 },
  signatureLabel: { fontSize: 8, color: MUTED },
  thanks: { fontSize: 9, fontWeight: 700, color: TEAL, marginTop: 6 },

  // page footer - kept in normal flow on purpose: an absolutely positioned
  // footer in the page margin made react-pdf re-paginate forever (the
  // preview froze the browser tab).
  footer: {
    flexDirection: "row", justifyContent: "space-between", marginTop: 10,
    borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6, fontSize: 7.5, color: MUTED,
  },
});

const formatAmount = (value) => {
  const raw = value == null ? "" : String(value).replace(/,/g, "").trim();
  const num = Number(raw);
  if (raw === "" || !Number.isFinite(num)) return value || "";
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

// The form pre-fills make/model with "any", which isn't a real vehicle.
const realValue = (v) => {
  const t = v == null ? "" : String(v).trim();
  return t && !/^(any|not specified|n\/a|-)$/i.test(t) ? t : "";
};
const hasVehicleDetails = (d) =>
  ["make", "model", "chasisNumber", "engineCapacity", "mileage"].some((k) => realValue(d[k]));

const INSTRUCTIONS = [
  "All transfer fees must be paid by the sender so the full amount arrives.",
  "Put the invoice number in the payment reference so we can match your payment.",
  "Funds are applied once received in full. Please tell us when you have paid.",
  "International transfers can take 3-5 business days to arrive.",
];

const Bullets = ({ items }) => (
  <View>
    {items.map((item) => (
      <View key={item} style={styles.bullet}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

const PayItem = ({ label, value, wide }) => (
  <View style={wide ? styles.payItemWide : styles.payItem}>
    <Text style={styles.label}>{label}</Text>
    <Text>{value || "-"}</Text>
  </View>
);

const MyPdfDocument = ({ invoiceData, assets = {} }) => {
  const invoiceNumber = invoiceData.invoiceNumber || "";
  const formattedInvoiceNumber = invoiceNumber.replace(/(\b\w+\b)-\1-/, "$1-");
  const currency = invoiceData.depositCurrency || "";
  const money = (v) => `${formatAmount(v)} ${currency}`.trim();
  const amount = money(invoiceData.depositAmount);
  const totalNum = Number(String(invoiceData.totalPrice ?? "").replace(/,/g, "")) || 0;
  const dueNum = Number(String(invoiceData.depositAmount ?? "").replace(/,/g, "")) || 0;
  const hasBalance = totalNum > 0 && totalNum > dueNum;
  const title = INVOICE_TYPE_TITLES[invoiceData.invoiceType] || "DEPOSIT INVOICE";
  const shipping = [
    ["Destination", invoiceData.destinationCountry],
    ["Port of discharge", invoiceData.destinationPort],
    ["Pre-export inspection", invoiceData.preExportInspection],
  ];
  const hasShipping = shipping.some(([, v]) => v);
  const isUsd = invoiceData.depositCurrency === "USD";

  return (
    <Document title={`${title} ${formattedInvoiceNumber}`} author="Eljawad Motors">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {assets.logo ? <Image style={styles.logo} src={assets.logo} /> : <Text style={styles.title}>Eljawad Motors</Text>}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            {invoiceData.serialNumber ? <Text style={styles.serial}>{invoiceData.serialNumber}</Text> : null}
          </View>
        </View>
        <View style={styles.rule}>
          <View style={styles.ruleTeal} />
          <View style={styles.ruleOrange} />
        </View>

        {/* Invoice meta */}
        <View style={styles.meta}>
          {[
            ["Invoice No.", formattedInvoiceNumber],
            ["Invoice date", invoiceData.invoiceDate],
            ["Valid until", invoiceData.expiryDate],
            ["Purpose", invoiceData.depositPurpose],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.metaCell, i > 0 && styles.metaCellDivider]}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.metaValue}>{value || "-"}</Text>
            </View>
          ))}
        </View>

        {/* Parties */}
        <View style={styles.parties}>
          <View style={styles.card}>
            <Text style={styles.label}>Billed to</Text>
            <Text style={styles.cardName}>{invoiceData.customerFullName}</Text>
            {invoiceData.customerCompany ? <Text>{invoiceData.customerCompany}</Text> : null}
            <Text>{invoiceData.customerAddress}</Text>
            <Text style={styles.muted}>{invoiceData.customerPhone}</Text>
            <Text style={styles.muted}>{invoiceData.customerEmail}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.cardName}>Eljawad Motors</Text>
            <Text>Sale and export of used vehicles and auto parts</Text>
            <Text style={styles.muted}>contact@eljawad.com</Text>
            <Text style={styles.muted}>www.eljawad.com</Text>
          </View>
          {assets.qr ? (
            <View style={styles.qrBlock}>
              <Image style={styles.qr} src={assets.qr} />
              <Text style={styles.qrCaption}>Scan to visit eljawad.com</Text>
            </View>
          ) : null}
        </View>

        {hasShipping && (
          <View style={styles.shipping}>
            {shipping.map(([label, value], i) => (
              <View key={label} style={[styles.metaCell, i > 0 && styles.metaCellDivider]}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.bold}>{value || "-"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Payment details */}
        <View style={styles.payment}>
          <Text style={styles.sectionTitle}>Payment details</Text>
          {!hasBankDetails(invoiceData) ? (
            <View style={styles.pending}>
              <Text>{BANK_DETAILS_PENDING_NOTICE}</Text>
            </View>
          ) : isUsd ? (
            <View style={styles.payGrid}>
              <PayItem label="Beneficiary name" value={invoiceData.beneficiaryName} />
              <PayItem label="Account number" value={invoiceData.accountNumber} />
              <PayItem label="Bank name" value={invoiceData.bankName} />
              <PayItem label="SWIFT code" value={invoiceData.swiftCode} />
              <PayItem label="Branch name" value={invoiceData.branchName} />
              <PayItem label="Bank address" value={invoiceData.bankAddress} />
              <PayItem label="Beneficiary address" value={invoiceData.beneficiaryAddress} wide />
            </View>
          ) : (
            <View style={styles.payGrid}>
              <PayItem label="Beneficiary name" value={invoiceData.beneficiaryName} />
              <PayItem label="IBAN" value={invoiceData.iban} />
              <PayItem label="SWIFT / BIC" value={invoiceData["swift/bic"]} />
              <PayItem label="Bank name and address" value={invoiceData["bank name and address"]} />
            </View>
          )}
        </View>

        {/* Important */}
        <View style={styles.banner}>
          <Text style={styles.bannerTag}>IMPORTANT</Text>
          <Text style={styles.bannerText}>
            Put <Text style={styles.bold}>{formattedInvoiceNumber}</Text> in your transfer reference.{" "}
            <Text style={styles.bannerStrong}>Beware of scams:</Text> only pay into an account confirmed by
            an email from @eljawad.com.
          </Text>
        </View>

        {/* Description */}
        <View style={styles.table}>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.colDesc]}>Payment description</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>
          <View style={styles.tdRow}>
            <Text style={[styles.td, styles.colDesc]}>{invoiceData.depositDescription}</Text>
            <Text style={[styles.td, styles.colAmount, styles.bold]}>{amount}</Text>
          </View>
        </View>

        {hasVehicleDetails(invoiceData) && (
          <View style={styles.table}>
            <View style={styles.thRow}>
              <Text style={[styles.th, styles.colEq]}>Make</Text>
              <Text style={[styles.th, styles.colEq]}>Model</Text>
              <Text style={[styles.th, styles.colEq]}>Engine</Text>
              <Text style={[styles.th, styles.colEq]}>Mileage</Text>
              <Text style={[styles.th, styles.chassis]}>Chassis number</Text>
            </View>
            <View style={styles.tdRow}>
              <Text style={[styles.td, styles.colEq]}>{realValue(invoiceData.make) || "-"}</Text>
              <Text style={[styles.td, styles.colEq]}>{realValue(invoiceData.model) || "-"}</Text>
              <Text style={[styles.td, styles.colEq]}>
                {invoiceData.engineCapacity ? `${formatNumberWithUnit(invoiceData.engineCapacity)} cc` : "-"}
              </Text>
              <Text style={[styles.td, styles.colEq]}>
                {invoiceData.mileage ? `${formatNumberWithUnit(invoiceData.mileage)} km` : "-"}
              </Text>
              <Text style={[styles.td, styles.chassis]}>{realValue(invoiceData.chasisNumber) || "-"}</Text>
            </View>
          </View>
        )}

        {/* Instructions / note + totals */}
        <View style={styles.bottom}>
          <View style={styles.instructions}>
            {invoiceData.bankNote ? (
              <View style={styles.note}>
                <Text style={styles.sectionTitle}>Note from the remitter</Text>
                <Text>{invoiceData.bankNote}</Text>
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Bullets items={INSTRUCTIONS} />
          </View>
          <View style={styles.totals}>
            {hasBalance ? (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.muted}>Total price</Text>
                  <Text>{money(totalNum)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.muted}>
                    Due now{invoiceData.paymentTerms ? ` (${invoiceData.paymentTerms})` : ""}
                  </Text>
                  <Text>{amount}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.muted}>Balance due</Text>
                  <Text>{money(totalNum - dueNum)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.totalRow}>
                <Text style={styles.muted}>Amount</Text>
                <Text>{amount}</Text>
              </View>
            )}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>{hasBalance ? "DUE NOW" : "GRAND TOTAL"}</Text>
              <Text style={styles.grandValue}>{amount}</Text>
            </View>
          </View>
        </View>

        {/* Sign-off */}
        <View style={styles.signoff}>
          <Text style={styles.legal}>
            This invoice is intended solely for legal and official purposes. Any unauthorized use,
            modification, or misrepresentation of its content is strictly prohibited and may result in
            legal action.
          </Text>
          <View style={styles.signature}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Authorised sales signature</Text>
            <Text style={styles.thanks}>Thank you for your business!</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Eljawad Motors · contact@eljawad.com · www.eljawad.com</Text>
          <Text>Invoice {formattedInvoiceNumber}</Text>
        </View>
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

  return <button onClick={handleGeneratePdf}>Download PDF</button>;
};

export default GeneratePdfButton;
