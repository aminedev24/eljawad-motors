import { apiBaseUrl } from "../../utilities/apiBase";

export const API_URL = apiBaseUrl;

export const BANK_DETAILS = {
  USD: {
    beneficiaryName: "Eljawad Motors Inc",
    bankName: "SUMISHIN SBI NET BANK",
    branchName: "HOJIN DAI ICHI (BRANCH SORT CODE:106)",
    bankAddress: "3-2-1 Roppongi, Minato-ku, Tokyo-to",
    swiftCode: "NTSSJPJT",
    accountNumber: "2628940",
    beneficiaryAddress: "5-10-44, Kasagami, Tagajyo, Miyagi, Japan",
  },
  JPY: {
    beneficiaryName: "Eljawad Motors Inc",
    iban: "GB80 TRWI 2308 0126 4624 61",
    "swift/bic": "TRWIGB2LXXX",
    "bank name and address":
      "Wise Payments Limited, 56 Shoreditch High Street, London, E1 6JJ, United Kingdom",
  },
  EUR: {
    beneficiaryName: "Eljawad Motors Inc",
    iban: "BE47 9052 3539 7280",
    "swift/bic": "TRWIBEB1XXX",
    "bank name and address":
      "Wise, Rue du Trene 100, 3rd floor, Brussels, 1050, Belgium",
  },
};

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
