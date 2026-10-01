import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { useUser } from "../../user/userContext";
import CountryList from "../../utilities/countryList";
import {
  fetchMakes,
  fetchModelsForMake,
} from "../../vehicles/vehicleData";
import {
  API_URL,
  BANK_DETAILS,
  INVOICE_NUMBER_PREFIX,
  NUMERIC_FIELDS,
  PURPOSE_DESCRIPTIONS,
  REQUIRED_FIELDS,
} from "./constants";
import {
  calculateExpiryDate,
  generateSerialNumber,
  getDefaultBankDetails,
  getInvoiceDate,
} from "./helpers";

const SAFE_STORAGE_KEY = "invoiceData";

// Parse a value that may be a raw number, a string like "61658", or a
// display string like "2,000 USD" into a plain number (or "" when empty).
const parseNumericValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "";
  }
  const match = String(value).match(/-?\d[\d,.]*/);
  if (!match) return "";
  const num = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(num) ? num : "";
};

const getStoredInvoiceData = () => {
  if (typeof window === "undefined") return {};
  try {
    // sessionStorage wins (same-tab public flow). The localStorage copy is
    // deliberately NOT removed on read so the prefill survives a remount or
    // refresh; it is cleared on submit via resetInvoiceState().
    const sessionValue = sessionStorage.getItem(SAFE_STORAGE_KEY);
    if (sessionValue) {
      sessionStorage.removeItem(SAFE_STORAGE_KEY);
      return JSON.parse(sessionValue);
    }
    const localValue = localStorage.getItem(SAFE_STORAGE_KEY);
    return localValue ? JSON.parse(localValue) : {};
  } catch (error) {
    console.error("Error parsing invoice data from storage:", error);
    return {};
  }
};

export const useInvoiceFormState = () => {
  const router = useRouter();
  const { user } = useUser();

  const [phoneCode, setPhoneCode] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedInvoiceData, setSubmittedInvoiceData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceCounter, setInvoiceCounter] = useState("");
  const [, setIsLoading] = useState(false);
  const [, setError] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isBankNoteEditable, setIsBankNoteEditable] = useState(false);
  const [selectedBankDetails, setSelectedBankDetails] = useState(BANK_DETAILS.JPY);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("");
  const [isTyping] = useState(false);

  const regenerateParam = router.query.regenerate === "true";
  const storedInvoiceData = useMemo(getStoredInvoiceData, []);

  const [invoiceState, setInvoiceState] = useState({
    invoiceData: storedInvoiceData,
    regenerate: regenerateParam,
  });

  useEffect(() => {
    setInvoiceState((prev) => ({
      ...prev,
      regenerate: regenerateParam,
    }));
  }, [regenerateParam]);

  const { invoiceData, regenerate } = invoiceState;

  const resetInvoiceState = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SAFE_STORAGE_KEY);
      localStorage.removeItem(SAFE_STORAGE_KEY);
    }

    setInvoiceState({
      invoiceData: null,
      regenerate: false,
    });

    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, regenerate: "false" },
      },
      undefined,
      { shallow: true },
    );
  }, [router]);

  const showAlert = useCallback((message, type = "alert") => {
    setTimeout(() => {
      setModalMessage(message);
      setModalType(type);
      setShowModal(true);
    }, 1000);
  }, []);

  const getFormDefaults = useCallback(
    (source = null, isRegenerate = false) => ({
      fullName: source?.customer_name || source?.fullName || "",
      company: source?.company || "",
      country: source?.country || "",
      phone: source?.phone || "",
      email: source?.email || "",
      address: source?.address || "",
      depositAmount: parseNumericValue(
        source?.deposit_amount ?? source?.depositAmount,
      ),
      depositCurrency:
        source?.deposit_currency || source?.depositCurrency || "JPY",
      depositDescription:
        source?.description ||
        source?.depositDescription ||
        "This payment is to order cars from the auctions in Japan",
      depositPurpose:
        source?.deposit_purpose || source?.depositPurpose || "Paying My Vehicle",
      expiryDate: source?.expiryDate || "",
      bankNote:
        (source?.deposit_purpose || source?.depositPurpose) === "order vehicle"
          ? ""
          : source?.bankNote ||
            "Car details, including chassis numbers, will be provided by the remitter upon completion of the car purchase.",
      chasisNumber:
        source?.chasis_number || source?.chasisNumber || source?.chassis_no || "",
      vehicleRef: source?.vehicle_ref || source?.vehicleRef || "",
      vehicleDescription:
        source?.vehicle_description ||
        source?.vehicleDescription ||
        [source?.make, source?.model].filter(Boolean).join(" "),
      engineCapacity:
        source?.engine_capacity || source?.engineCapacity || "",
      mileage: source?.mileage || source?.mileageValue || "",
      make: source?.make || "any",
      model: source?.model || "any",
      invoiceNumber: isRegenerate
        ? `RE-${generateSerialNumber({ regenerate: true, invoiceData: source })}`
        : source?.invoice_number ||
          generateSerialNumber({ regenerate: false, invoiceData: source }),
    }),
    [],
  );

  const [formData, setFormData] = useState(() =>
    getFormDefaults(storedInvoiceData, regenerateParam),
  );

  useEffect(() => {
    setSelectedBankDetails(getDefaultBankDetails(formData.depositCurrency));
  }, [formData.depositCurrency]);

  useEffect(() => {
    setFormData(getFormDefaults(invoiceData, regenerate));
  }, [getFormDefaults, invoiceData, regenerate]);

  const fetchInvoiceNumber = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/finance/invoices/getInvoiceNumber.php`);
      const data = await response.json();

      if (data.invoiceNumber) {
        setInvoiceCounter(
          regenerate ? invoiceData?.invoice_number : data.invoiceNumber,
        );
      } else {
        setError("Failed to fetch invoice number");
      }
    } catch (err) {
      console.error("Error fetching invoice number:", err);
      setError("An error occurred while fetching the invoice number");
    } finally {
      setIsLoading(false);
    }
  }, [invoiceData?.invoice_number, regenerate]);

  useEffect(() => {
    const loadMakes = async () => {
      const fetchedMakes = await fetchMakes();
      setMakes(fetchedMakes);
    };
    loadMakes();
  }, []);

  const handleMakeChange = async (event) => {
    const make = event.target.value;
    if (make && make !== "any") {
      const fetchedModels = await fetchModelsForMake(make);
      setModels(fetchedModels);
    } else {
      setModels([]);
    }
  };

  useEffect(() => {
    fetchInvoiceNumber();
  }, [fetchInvoiceNumber]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // If an admin issued this invoice for a buyer, keep the buyer's
        // details that were prefilled instead of overwriting them with the
        // logged-in admin's own profile.
        if (storedInvoiceData?.customer_name) return;
        const response = await fetch(`${API_URL}/users/getUserInfo.php`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Failed to fetch user data:", response.statusText);
          return;
        }

        const data = await response.json();

        if (!data || data.error || !data.data) {
          console.error("Invalid or missing data returned from API:", data);
          return;
        }

        const {
          full_name = "",
          company = "",
          country = "",
          phone = "",
          email = "",
          address = "",
        } = data.data;

        setFormData((prevState) => ({
          ...prevState,
          fullName: full_name,
          company,
          country,
          phone,
          email,
          address,
        }));

        if (country) {
          const selectedCountry = CountryList().find(
            (countryItem) => countryItem.label === country,
          );
          if (selectedCountry?.countryCode) {
            if (phone.startsWith(selectedCountry.countryCode)) {
              setPhoneCode(selectedCountry.countryCode);
              setFormData((prevState) => ({
                ...prevState,
                phone: phone.replace(selectedCountry.countryCode, ""),
              }));
            } else {
              setPhoneCode(selectedCountry.countryCode);
            }
          } else {
            setPhoneCode("");
          }
        }
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [router.asPath]);

  const handleChange = (e) => {
    if (regenerate) {
      showAlert(
        "This invoice is in regenerate mode. To modify invoice details, please click reset invoice to start over.",
      );
      return;
    }

    const { name, value } = e.target;

    if (NUMERIC_FIELDS.includes(name)) {
      const rawValue = value.replace(/,/g, "");
      let valueToSet =
        rawValue === "" || Number.isNaN(Number(rawValue))
          ? ""
          : Number(rawValue);

      if (name === "engineCapacity" && valueToSet !== "" && valueToSet > 6000) {
        valueToSet = 6000;
      }

      setFormData((prevState) => ({
        ...prevState,
        [name]: valueToSet,
      }));
    } else if (name === "country") {
      const selectedCountry = CountryList().find(
        (countryItem) => countryItem.label === value,
      );
      setPhoneCode(selectedCountry?.countryCode || "");
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    } else if (name === "depositPurpose") {
      const description = PURPOSE_DESCRIPTIONS[value] || "";
      setFormData((prevState) => {
        const updated = {
          ...prevState,
          depositPurpose: value,
          depositDescription: description,
        };

        updated.bankNote =
          value === "order vehicle"
            ? ""
            : prevState.bankNote;

        return updated;
      });
    } else if (name === "depositCurrency") {
      setSelectedBankDetails(getDefaultBankDetails(value));
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const invoiceDateObj = getInvoiceDate(regenerate, invoiceData);
    const invoiceDate = invoiceDateObj.toISOString().split("T")[0];
    const expiryDate = calculateExpiryDate(invoiceDate);

    try {
      await fetchInvoiceNumber();
      const isFormValid = REQUIRED_FIELDS.every((field) => formData[field]);

      if (isFormValid) {
        const fullPhoneNumber = phoneCode + formData.phone;

        const newInvoiceData = {
          customerFullName: formData.fullName,
          customerCompany: formData.company,
          customerAddress: formData.address,
          customerPhone: fullPhoneNumber,
          customerEmail: formData.email,
          country: formData.country,
          invoiceNumber: `${INVOICE_NUMBER_PREFIX}${invoiceCounter}`,
          invoiceDate,
          depositAmount: formData.depositAmount,
          depositCurrency: formData.depositCurrency,
          depositDescription: formData.depositDescription,
          depositPurpose: formData.depositPurpose,
          bankNote: formData.bankNote,
          vehicleRef: formData.vehicleRef,
          chasisNumber: formData.chasisNumber,
          vehicleDescription: formData.vehicleDescription,
          engineCapacity: formData.engineCapacity,
          mileage: formData.mileage,
          make: formData.make,
          model: formData.model,
          serialNumber: generateSerialNumber({ regenerate, invoiceData }),
          expiryDate,
          ...selectedBankDetails,
        };

        setTimeout(() => {
          setSubmittedInvoiceData(newInvoiceData);
          setIsModalOpen(true);
        }, 2000);
      } else {
        alert("Please fill in all required fields");
      }
    } catch (error) {
      alert("Failed to fetch invoice number. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInvoice = (incomingInvoiceData) => {
    const phoneNumber = incomingInvoiceData.customerPhone;
    let phoneCodeFromInvoice = "";
    let phoneWithoutCode = phoneNumber;

    const selectedCountry = CountryList().find((countryItem) =>
      phoneNumber.startsWith(countryItem.countryCode),
    );

    if (selectedCountry) {
      phoneCodeFromInvoice = selectedCountry.countryCode;
      phoneWithoutCode = phoneNumber.replace(phoneCodeFromInvoice, "");
    }

    setFormData((prev) => ({
      ...prev,
      fullName: incomingInvoiceData.customerFullName,
      company: incomingInvoiceData.customerCompany,
      country: incomingInvoiceData.country || "",
      phone: phoneWithoutCode,
      email: incomingInvoiceData.customerEmail,
      depositAmount: incomingInvoiceData.depositAmount || "",
      depositCurrency: incomingInvoiceData.depositCurrency,
      depositDescription: incomingInvoiceData.depositDescription,
      depositPurpose: incomingInvoiceData.depositPurpose,
      address: incomingInvoiceData.customerAddress,
      engineCapacity: incomingInvoiceData.engineCapacity,
      chasisNumber: incomingInvoiceData.chasisNumber,
      mileage: incomingInvoiceData.mileage,
      make: incomingInvoiceData.make,
      model: incomingInvoiceData.model,
    }));

    setPhoneCode(phoneCodeFromInvoice);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowModal(false);
    setSubmittedInvoiceData(null);
  };

  const handleTypingStart = (hideTooltip) => {
    if (isTyping && typeof hideTooltip === "function") {
      hideTooltip();
    }
  };

  const toggleBankNoteEditable = () => {
    setIsBankNoteEditable((prev) => !prev);
  };

  const handleLoginRedirect = () =>
    router.push("/login", undefined, { shallow: true });

  const handleRegisterRedirect = () =>
    router.push("/register", undefined, { shallow: true });

  return {
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
  };
};
