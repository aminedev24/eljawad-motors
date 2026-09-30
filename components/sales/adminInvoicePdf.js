import React, { useState } from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { InvoiceHeaders } from "./invoiceHeaders";
import SalesAgreementPDF from "./salesAgreementPdf";
import "./pdfFonts";
import styles from "./adminInvoicePdfStyles";

const AddressDetail = ({ label, value, labelStyle }) => (
  <View style={styles.addressRow}>
    <Text style={[styles.addressLabel, labelStyle]}>{label}</Text>
    <Text style={styles.addressColon}>:</Text>
    <Text style={styles.addressValue}> {value || ""}</Text>
  </View>
);

const AdminInvoicePdf = ({ invoiceData }) => {
  const invoiceNumber = invoiceData.invoiceCounter;
  const [commercial] = useState(true)
  const totalUnits = invoiceData.lineItems.length;
  const totalAmount = invoiceData.lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={false}>
        <InvoiceHeaders invoiceData={invoiceData} formattedInvoiceNumber={invoiceNumber} commercial={commercial} />
        <Text style={styles.invoiceTitle}>Invoice</Text>

        <View style={styles.addressColumnsContainer}>
          <View style={styles.addressColumn}>
            <View style={styles.addressBlock}>
              <Text style={styles.addressBlockTitle}>Customer</Text>
              <AddressDetail label="Name" value={invoiceData.customer.name} />
              <AddressDetail label="Address" value={invoiceData.customer.address} />
              <AddressDetail label="Phone" value={invoiceData.customer.phone} />
              <AddressDetail label="Country" value={invoiceData.customer.country} />
            </View>
            <View style={styles.addressBlock}>
              <Text style={styles.addressBlockTitle}>Bill To</Text>
              <AddressDetail label="Name" value={invoiceData.billTo.name} />
              <AddressDetail label="Address" value={invoiceData.billTo.address} />
              <AddressDetail label="Phone" value={invoiceData.billTo.phone} />
            </View>
            <View style={styles.shippingPairBlock}>
              <View style={styles.shippingPairItemLeft}>
                <View style={styles.shippingBlockContainer}>
                  <Text style={[styles.shippingBlockTitle]}>Ship Name</Text>
                  <Text style={styles.shippingBlockValue}>{invoiceData.shipInfo.shipName || "N/A"}</Text>
                </View>
              </View>
              <View style={styles.shippingPairItemLeft}>
                <View style={styles.shippingBlockContainer}>
                  <Text style={[styles.shippingBlockTitle]}>Port Of Loading</Text>
                  <Text style={styles.shippingBlockValue}>{invoiceData.shipInfo.portOfLoading || "N/A"}</Text>
                </View>
              </View>
              <View style={styles.shippingPairItemLeft}>
                <View style={styles.shippingBlockContainer}>
                  <Text style={[styles.shippingBlockTitle]}>Destination country</Text>
                  <Text style={styles.shippingBlockValue}>{invoiceData.shipInfo.destinationCountry || "N/A"}</Text>
                </View>
              </View>
            </View>
            <View style={styles.shippingPairBlock}>
              {[
                ["Booking REF", invoiceData.bookingDischarge.bookingRef],
                ["Port Of Discharge", invoiceData.bookingDischarge.portOfDischarge],
                ["BL Number", invoiceData.blNumber],
                ["Container Number", invoiceData.containerNumber],
              ].map(([label, val]) => (
                <View key={label} style={[styles.shippingPairItemLeft, styles.shippinPairBelow]}>
                  <View style={styles.shippingBlockContainer}>
                    <Text style={[styles.shippingBlockTitle, label === "Port Of Discharge" || label === "Container Number" ? styles.wideLabel : null]}>{label}</Text>
                    <Text style={[styles.shippingBlockValue, label === "Port Of Discharge" ? styles.wideLabel : null]}>{val || "N/A"}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.addressColumn}>
            <View style={styles.addressBlock}>
              <Text style={styles.addressBlockTitle}>Consignee</Text>
              <AddressDetail label="Name" value={invoiceData.consignee.name} />
              <AddressDetail label="Address" value={invoiceData.consignee.address} />
              <AddressDetail label="Phone" value={invoiceData.consignee.phone} />
              <AddressDetail label="Email" value={invoiceData.consignee.email} />
            </View>
            <View style={styles.addressBlock}>
              <Text style={styles.addressBlockTitle}>Notify Parties</Text>
              <AddressDetail label="Name" value={invoiceData.notifyParties.name} />
              <AddressDetail label="Address" value={invoiceData.notifyParties.address} />
              <AddressDetail label="Phone" value={invoiceData.notifyParties.phone} />
              <AddressDetail label="Email" value={invoiceData.notifyParties.email} />
            </View>
            <View style={[styles.addressBlock, styles.importerBlock]}>
              <Text style={styles.addressBlockTitle}>Importer - If Other Than Consignee</Text>
              <AddressDetail label="Name" value={invoiceData.importer.name} />
              <AddressDetail label="Address" value={invoiceData.importer.address} />
              <AddressDetail label="Phone" value={invoiceData.importer.phone} />
              <AddressDetail label="Email" value={invoiceData.importer.email} />
            </View>
          </View>
        </View>

        <View style={styles.importantNotice}>
          <Text style={styles.importantNoticeHeader}>IMPORTANT NOTICE</Text>
          <Text>Your invoice Number <Text style={styles.importantNumber}>{invoiceNumber}</Text> must be on the TT-slip!</Text>
          <Text>Without your invoice number, shipping will be delayed!!</Text>
        </View>

        <View style={styles.bankInfoContainer}>
          <Text style={styles.bankHeader}>BANK INFORMATION</Text>
          {invoiceData.currency === "USD" ? (
            <>
              {[
                ["Bank Name:", invoiceData.bankName, "Swift Code:", invoiceData.swiftCode],
                ["Bank Address:", invoiceData.bankAddress, "Account No:", invoiceData.accountNumber],
                ["Beneficiary:", invoiceData.beneficiaryName, "Branch Name:", invoiceData.branchName],
              ].map(([l1, v1, l2, v2]) => (
                <View key={l1} style={styles.bankRow}>
                  <Text style={styles.bankCellLabel}>{l1}</Text>
                  <Text style={styles.bankCellValuePair}>{v1}</Text>
                  <Text style={styles.bankCellLabelPair}>{l2}</Text>
                  <Text style={styles.bankCellValuePairLast}>{v2}</Text>
                </View>
              ))}
              <View style={styles.bankRowLast}>
                <Text style={styles.bankCellLabel}>Beneficiary Address:</Text>
                <Text style={styles.bankCellValuePair}>{invoiceData.beneficiaryAddress}</Text>
                <Text style={[styles.bankCellLabelPair, styles.bankCellHiddenText]}>placeholder</Text>
                <Text style={[styles.bankCellValuePairLast, styles.bankCellHiddenText]}>placeholder</Text>
              </View>
            </>
          ) : (
            <>
              {[
                ["Beneficiary Name:", invoiceData.beneficiaryName, "IBAN:", invoiceData.iban],
                ["SWIFT/BIC:", invoiceData["swift/bic"], "Bank Name & Address:", invoiceData["bank name and address"]],
              ].map(([l1, v1, l2, v2], idx) => (
                <View key={idx} style={styles.bankRow}>
                  <Text style={styles.bankCellLabel}>{l1}</Text>
                  <Text style={styles.bankCellValuePair}>{v1}</Text>
                  <Text style={styles.bankCellLabelPair}>{l2}</Text>
                  <Text style={styles.bankCellValuePairLast}>{v2}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.noteAndAmountContainer}>
          <View style={styles.noteContainer}>
            <Text style={styles.noteTitle}>NOTE</Text>
            {[
              "1 Please indicate the purpose of money transfer as 'CAR' or 'CAR PAYMENT'.",
              "2 This invoice is valid for 3 business days only from the date herein. The sale is conducted first come, first served basis and secured upon payment proof.",
              "3 Customer needs to pay remaining balance payment within 15 days from shipment date.",
              "4 Failure to meet payment terms instructed, Eljawad Motors Inc reserves the right to re-sell the car without any notice and no claim will be accepted.",
            ].map((text, i) => (
              <Text key={i} style={styles.noteText}>{text}</Text>
            ))}
          </View>
          <View style={styles.amountAndConfirmationContainer}>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Amount:</Text>
              <View style={styles.amountValueBox}>
                <Text style={styles.amountValue}>{totalAmount.toLocaleString()} {invoiceData.currency}</Text>
              </View>
              <Text style={styles.bankChargeText}>*Bank charge must be beared by remitter</Text>
            </View>
            <View style={[styles.invoiceFooter]}>
              <Text style={styles.invoiceSignatureText}>Authorised Sales Signature</Text>
              <Text style={styles.invoiceSignatureText}>Thank you for your business!</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {["No.", "Ref No.", "Chassis No", "Description of Goods", "Unit Price", "Freight", "Insurance", "Amount"].map((h, i) => (
              <Text key={h} style={[styles.tableColHeader, [styles.colNo, styles.colRef, styles.colMaker, styles.colDesc, styles.colUnit, styles.colFreight, styles.colAmount, styles.colAmount][i]]}>{h}</Text>
            ))}
          </View>
          {invoiceData.lineItems.map((item, index) => {
            const specParts = [];
            if (item.cc) specParts.push(`CC: ${item.cc}`);
            if (item.door) specParts.push(`Door: ${item.door}`);
            if (item.seat) specParts.push(`Seat: ${item.seat}`);
            if (item.shift) specParts.push(`Shift: ${item.shift}`);
            if (item.year) specParts.push(`Year: ${item.year}`);
            if (item.color) specParts.push(`Color: ${item.color}`);
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCol, styles.colNo]}>{index + 1}</Text>
                <Text style={[styles.tableCol, styles.colRef]}>{item.refNo}</Text>
                <Text style={[styles.tableCol, styles.colMaker]}>{item.chassisNo}</Text>
                <Text style={[styles.tableCol, styles.colDesc, { lineHeight: 1.3 }]}>{item.goodsDescription || ""}{specParts.length ? `\n${specParts.join(" ")}` : ""}</Text>
                <Text style={[styles.tableCol, styles.colUnit]}>{parseFloat(item.unitPrice).toLocaleString()}</Text>
                <Text style={[styles.tableCol, styles.colFreight]}>{parseFloat(item.freight).toLocaleString()}</Text>
                <Text style={[styles.tableCol, styles.colAmount]}>{parseFloat(item.insurance)}</Text>
                <Text style={[styles.tableCol, styles.colAmount]}>{parseFloat(item.amount).toLocaleString()}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footerTotals}>
          <View style={styles.footerLeft}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{totalUnits}</Text>
            <Text style={styles.totalLabel}>UNIT(S)</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.totalLabel}>TOTAL PRICE</Text>
            <Text style={styles.footerItem}>C&F</Text>
            <Text style={styles.footerItem}>{invoiceData.currency}</Text>
            <Text style={styles.totalValue}>{totalAmount.toLocaleString()}</Text>
          </View>
        </View>
      </Page>
      <Page size="A4" style={styles.page}>
        <SalesAgreementPDF invoiceData={invoiceData} />
      </Page>
    </Document>
  );
};

export default AdminInvoicePdf;
