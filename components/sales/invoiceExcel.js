import {
  BANK_DETAILS_PENDING_NOTICE,
  INVOICE_TYPE_TITLES,
  hasBankDetails,
} from "../forms/invoiceForm/constants";

const toNumber = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};

// One-sheet .xlsx copy of the invoice (same facts as the PDF). SheetJS is
// loaded only when someone actually exports, so it doesn't weigh on the page.
export const exportInvoiceXlsx = async (invoiceData, invoiceNumber) => {
  const XLSX = await import("xlsx");
  const currency = invoiceData.depositCurrency || "";
  const due = toNumber(invoiceData.depositAmount);
  const total = toNumber(invoiceData.totalPrice);
  const title = INVOICE_TYPE_TITLES[invoiceData.invoiceType] || "DEPOSIT INVOICE";

  const rows = [
    ["Eljawad Motors", ""],
    ["contact@eljawad.com · www.eljawad.com", ""],
    [title, ""],
    [],
    ["Invoice number", invoiceNumber],
    ["Invoice date", invoiceData.invoiceDate || ""],
    ["Valid until", invoiceData.expiryDate || ""],
    ["Purpose", invoiceData.depositPurpose || ""],
    [],
    ["BILLED TO", ""],
    ["Name", invoiceData.customerFullName || ""],
    ["Company", invoiceData.customerCompany || ""],
    ["Address", invoiceData.customerAddress || ""],
    ["Country", invoiceData.country || ""],
    ["Phone", invoiceData.customerPhone || ""],
    ["Email", invoiceData.customerEmail || ""],
  ];

  const vehicle = [
    ["Make", invoiceData.make],
    ["Model", invoiceData.model],
    ["Stock ref", invoiceData.vehicleRef],
    ["Chassis number", invoiceData.chasisNumber],
    ["Engine (cc)", toNumber(invoiceData.engineCapacity)],
    ["Mileage (km)", toNumber(invoiceData.mileage)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== "any");
  if (vehicle.length) rows.push([], ["VEHICLE", ""], ...vehicle);

  rows.push([], ["PAYMENT", ""], ["Description", invoiceData.depositDescription || ""], ["Currency", currency]);
  if (total && due !== null && total > due) {
    rows.push(
      ["Total price", total],
      [`Due now${invoiceData.paymentTerms ? ` (${invoiceData.paymentTerms})` : ""}`, due],
      ["Balance due", total - due],
    );
  } else {
    rows.push(["Amount due", due ?? invoiceData.depositAmount ?? ""]);
  }

  const shipping = [
    ["Destination", invoiceData.destinationCountry],
    ["Port of discharge", invoiceData.destinationPort],
    ["Pre-export inspection", invoiceData.preExportInspection],
  ].filter(([, v]) => v);
  if (shipping.length) rows.push([], ["SHIPPING", ""], ...shipping);

  rows.push([], ["PAYMENT DETAILS", ""]);
  if (hasBankDetails(invoiceData)) {
    [
      ["Beneficiary name", invoiceData.beneficiaryName],
      ["Bank name", invoiceData.bankName],
      ["Branch", invoiceData.branchName],
      ["Bank address", invoiceData.bankAddress],
      ["SWIFT", invoiceData.swiftCode || invoiceData["swift/bic"]],
      ["Account number", invoiceData.accountNumber],
      ["IBAN", invoiceData.iban],
      ["Bank name and address", invoiceData["bank name and address"]],
      ["Beneficiary address", invoiceData.beneficiaryAddress],
    ]
      .filter(([, v]) => v)
      .forEach((r) => rows.push(r));
  } else {
    rows.push(["Note", BANK_DETAILS_PENDING_NOTICE]);
  }
  if (invoiceData.bankNote) rows.push(["Note from the remitter", invoiceData.bankNote]);
  rows.push([], ["Put the invoice number in your transfer reference. Only pay into an account confirmed by an email from @eljawad.com.", ""]);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 28 }, { wch: 60 }];
  // Number format with thousands separators on the money/spec cells.
  Object.keys(sheet).forEach((ref) => {
    const cell = sheet[ref];
    if (ref[0] !== "!" && cell && cell.t === "n") cell.z = "#,##0";
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Invoice");
  XLSX.writeFile(book, `invoice-${invoiceNumber}.xlsx`);
};
