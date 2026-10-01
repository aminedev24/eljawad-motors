import { apiBaseUrl } from "../../utilities/apiBase";

export const API_URL = apiBaseUrl;

// Eljawad Motors' own bank accounts aren't set up yet. These presets used to
// hold Artisbay's accounts under Eljawad's name, which would have sent
// customers' payments to another company - so they are empty for now and
// invoices show BANK_DETAILS_PENDING_NOTICE instead of a bank section.
// To enable payments, fill in the real details; the bank sections come back
// on every invoice automatically (see hasBankDetails). Fields used:
//   USD:      beneficiaryName, bankName, branchName, bankAddress, swiftCode,
//             accountNumber, beneficiaryAddress
//   JPY/EUR:  beneficiaryName, iban, "swift/bic", "bank name and address"
export const BANK_DETAILS = {
  USD: {},
  JPY: {},
  EUR: {},
};

export const BANK_DETAILS_PENDING_NOTICE =
  "Bank details for this payment will be sent to you separately by our team. " +
  "Please do not pay to any account until you receive them from @eljawad.com. " +
  "Questions: contact@eljawad.com";

// True once a currency's preset has an actual account to pay into.
export const hasBankDetails = (d) =>
  Boolean(d && d.beneficiaryName && (d.accountNumber || d.iban));

export const PURPOSE_DESCRIPTIONS = {
  "Vehicle Purchase": "This payment is to order cars from the auctions in Japan",
  "Auto Parts Order": "This payment is to order auto parts",
  "Paying My Vehicle": "I am paying for an existing order",
};

export const NUMERIC_FIELDS = ["depositAmount", "engineCapacity", "mileage"];

export const REQUIRED_FIELDS = [
  "fullName",
  "country",
  "phone",
  "email",
  "depositAmount",
  "depositDescription",
  "depositPurpose",
  "address",
];
