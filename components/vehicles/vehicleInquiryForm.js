// vehicleInquiryForm.js — Lightweight availability inquiry for sold /
// under-negotiation vehicles. Mirrors the details-page inquiry form on
// ichinomiya-motors (destination + request inputs + success state) instead
// of the payment-based RequestNowModal, since these units cannot be
// reserved or paid for directly.
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faPaperPlane, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { apiBaseUrl } from "../utilities/apiBase";
import { useUser } from "../user/userContext";

// Mirrors the destination-country list used by the ichinomiya-motors
// details-page inquiry form (196 countries + an International fallback).
const COUNTRIES = [
  "International",
  "AFGHANISTAN", "ALBANIA", "ALGERIA", "AMERICAN SAMOA", "ANDORRA", "ANGOLA", "ANGUILLA",
  "ANTIGUA AND BARBUDA", "ARGENTINA", "ARMENIA", "ARUBA", "AUSTRALIA", "AUSTRIA",
  "AZERBAIJAN", "BAHAMAS", "BAHRAIN", "BANGLADESH", "BARBADOS", "BELARUS", "BELGIUM",
  "BELIZE", "BENIN", "BERMUDA", "BHUTAN", "BOLIVIA", "BOSNIA AND HERZEGOVINA",
  "BOTSWANA", "BRAZIL", "BRUNEI DARUSSALAM", "BULGARIA", "BURKINA FASO", "BURUNDI",
  "CAMBODIA", "CAMEROON", "CANADA", "CAPE VERDE", "CAYMAN ISLANDS",
  "CENTRAL AFRICAN REPUBLIC", "CHAD", "CHILE", "CHINA", "COLOMBIA", "COMOROS", "CONGO",
  "COOK ISLANDS", "COSTA RICA", "CROATIA", "CYPRUS", "CZECH REPUBLIC",
  "DEMOCRATIC REPUBLIC OF THE CONGO", "DENMARK", "DJIBOUTI", "DOMINICA",
  "DOMINICAN REPUBLIC", "EAST TIMOR", "ECUADOR", "EGYPT", "EL SALVADOR",
  "EQUATORIAL GUINEA", "ERITREA", "ESTONIA", "ETHIOPIA", "FIJI", "FINLAND", "FRANCE",
  "FRENCH GUIANA", "FRENCH POLYNESIA", "GABON", "GAMBIA", "GEORGIA", "GERMANY", "GHANA",
  "GIBRALTAR", "GREECE", "GREENLAND", "GRENADA", "GUADELOUPE", "GUAM", "GUATEMALA",
  "GUINEA", "GUYANA", "HAITI", "HONDURAS", "HONG KONG", "HUNGARY", "ICELAND", "INDIA",
  "INDONESIA", "IRELAND", "ISRAEL", "ITALY", "JAMAICA", "JAPAN", "JORDAN", "KAZAKHSTAN",
  "KENYA", "KIRIBATI", "KUWAIT", "KYRGYZSTAN", "LAOS", "LATVIA", "LEBANON", "LESOTHO",
  "LIBERIA", "LIBYAN", "LIECHTENSTEIN", "LITHUANIA", "LUXEMBOURG", "MACAU", "MADAGASCAR",
  "MALAWI", "MALAYSIA", "MALDIVES", "MALI", "MALTA", "MARSHALL ISLANDS", "MAURITANIA",
  "MAURITIUS", "MEXICO", "MICRONESIA", "MOLDOVA", "MONACO", "MONGOLIA", "MONTENEGRO",
  "MOROCCO", "MOZAMBIQUE", "MYANMAR", "NAMIBIA", "NAURU", "NEPAL", "NETHERLANDS",
  "NEW CALEDONIA", "NEW ZEALAND", "NICARAGUA", "NIGER", "NIGERIA", "NORWAY", "OMAN",
  "PAKISTAN", "PALAU", "PANAMA", "PAPUA NEW GUINEA", "PARAGUAY", "PERU", "PHILIPPINES",
  "POLAND", "PORTUGAL", "PUERTO RICO", "QATAR", "REUNION", "ROMANIA", "RUSSIA", "RWANDA",
  "SAINT LUCIA", "SAINT VINCENT AND THE GRENADINES", "SAMOA", "SAUDI ARABIA", "SENEGAL",
  "SERBIA", "SEYCHELLES", "SIERRA LEONE", "SINGAPORE", "SLOVAKIA", "SLOVENIA",
  "SOLOMON ISLANDS", "SOMALIA", "SOUTH AFRICA", "SOUTH SUDAN", "SPAIN", "SRI LANKA",
  "SUDAN", "SWEDEN", "SWITZERLAND", "TAIWAN", "TAJIKISTAN", "TANZANIA", "THAILAND",
  "TOGO", "TONGA", "TRINIDAD", "TUNISIA", "TURKEY", "TURKMENISTAN", "UGANDA", "UKRAINE",
  "UNITED ARAB EMIRATES", "UNITED KINGDOM", "UNITED STATES", "URUGUAY", "UZBEKISTAN",
  "VANUATU", "VATICAN CITY", "VIET NAM", "YEMEN", "ZAMBIA", "ZIMBABWE",
];

const fallbackCountry = "International";

const normalizeCountry = (value) => {
  if (!value) return null;
  const lower = String(value).trim().toLowerCase();
  if (!lower) return null;
  return COUNTRIES.find((c) => c.toLowerCase() === lower) || null;
};

const detectCountryBrowserHints = () => {
  if (typeof window === "undefined") return null;
  const language = navigator.language || "";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const lowerLang = language.toLowerCase();
  if (lowerLang.includes("tz")) return "TANZANIA";
  if (lowerLang.includes("na")) return "NAMIBIA";
  if (lowerLang.includes("cd") || lowerLang.includes("cg")) return "DEMOCRATIC REPUBLIC OF THE CONGO";
  if (lowerLang.includes("bi")) return "BURUNDI";
  if (lowerLang.includes("mw")) return "MALAWI";
  if (timeZone.toLowerCase().includes("africa")) {
    if (timeZone.toLowerCase().includes("nairobi")) return "TANZANIA";
    if (timeZone.toLowerCase().includes("maputo")) return "MALAWI";
    if (timeZone.toLowerCase().includes("lubumbashi") || timeZone.toLowerCase().includes("kinshasa")) {
      return "DEMOCRATIC REPUBLIC OF THE CONGO";
    }
    if (timeZone.toLowerCase().includes("harare")) return "NAMIBIA";
  }
  return null;
};

const fetchClientGeo = async () => {
  if (typeof window === "undefined") return null;
  const endpoints = ["https://ipapi.co/json/", "https://ipwho.is/"];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const country = data?.country_name || data?.country || data?.countryName;
      if (country) return normalizeCountry(country) || null;
    } catch (err) {
      // continue to next endpoint
    }
  }
  return null;
};

const VehicleInquiryForm = ({ car }) => {
  const { user } = useUser?.() || { user: null };
  const vehicleRef = car?.ref_no || car?.stock_no || car?.id || "";
  const vehicleName = [car?.year, car?.make, car?.model].filter(Boolean).join(" ");
  const rawStatus = String(car?.status || car?.availability || "").toLowerCase().trim();

  const vehicleDetails = {
    ref_no: vehicleRef,
    year: car?.year || "",
    make: car?.make || "",
    model: car?.model || "",
    model_code: car?.model_code || car?.modelCode || "",
    body_type: car?.category || car?.body || car?.body_type || car?.shape || car?.type || "",
    color: car?.color || "",
    mileage: car?.mileage ? `${car.mileage} km` : "",
    fuel: car?.fuel || "",
    transmission: car?.transmission || "",
    engine_capacity: car?.engine_capacity || car?.engineCapacity || car?.cc || car?.engine || "",
    drive: car?.drive || car?.drive_train || "",
    doors: car?.door || car?.doors || "",
    seats: car?.seat || car?.seats || "",
    chassis: car?.chassis_no || car?.chassis || car?.chassisNo || car?.vin_number || "",
  };

  const [form, setForm] = useState(() => ({
    name: user?.full_name || user?.name || "",
    email: user?.email || "",
    phone: user?.phone || user?.tel1 || "",
    country: normalizeCountry(user?.country) || fallbackCountry,
    city: "",
    address: user?.address || "",
    message:
      rawStatus === "sold"
        ? "I'm interested in a similar vehicle. Please contact me."
        : "I'm interested in this vehicle. Please contact me regarding availability.",
  }));
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    // Only fill the country while it is still the fallback, so a value the
    // user picked (or the profile returned) is never overwritten.
    const applyCountry = (value) => {
      const normalized = normalizeCountry(value);
      if (!normalized) return;
      setForm((prev) =>
        prev.country === fallbackCountry ? { ...prev, country: normalized } : prev
      );
    };

    const browser = detectCountryBrowserHints();
    if (browser) applyCountry(browser);

    fetchClientGeo()
      .then((country) => {
        if (mounted && country) applyCountry(country);
      })
      .catch(() => {});

    // The session only exposes name/email. Pull the full profile (phone,
    // country, address) so logged-in customers get those fields prefilled.
    if (user?.id) {
      fetch(`${apiBaseUrl}/users/profile.php`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((profile) => {
          if (!mounted || !profile || !profile.full_name) return;
          setForm((prev) => ({
            name: profile.full_name || prev.name,
            email: profile.email || prev.email,
            phone: profile.phone || prev.phone,
            address: profile.address || prev.address,
            country: normalizeCountry(profile.country) || prev.country,
          }));
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.country, apiBaseUrl]);

  const handleChange = useCallback((field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrorMessage("");
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (status === "sending") return;
      setStatus("sending");
      setErrorMessage("");

      try {
        const res = await fetch(`${apiBaseUrl}/inquiries/submitVehicleInquiry.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            vehicle_ref: vehicleRef,
            vehicle_name: vehicleName,
            vehicle_status: rawStatus,
            vehicle_details: vehicleDetails,
            page_url: typeof window !== "undefined" ? window.location.href : "https://eljawad.com",
            name: form.name,
            email: form.email,
            phone: form.phone,
            country: form.country,
            city: form.city,
            address: form.address,
            message: form.message,
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || result?.status !== "success") {
          setStatus("error");
          setErrorMessage(result?.message || "Unable to send your inquiry. Please try again.");
          return;
        }
        setStatus("sent");
      } catch (err) {
        setStatus("error");
        setErrorMessage("Unable to send your inquiry. Please try again.");
      }
    },
    [status, form, vehicleRef, vehicleName, rawStatus, vehicleDetails]
  );

  const inputClass =
    "w-full border-0 border-b-[1.5px] border-gray-300 bg-transparent px-0 py-1.5 text-sm text-gray-800 focus:border-[var(--primary-color)] focus:outline-none";
  const labelClass = "mb-1 block font-mono text-[9px] font-extrabold uppercase tracking-widest text-gray-400";

  return (
    <div className="w-full">
      <div>
        {status === "sent" ? (
          <div className="py-10 text-center">
            <FontAwesomeIcon icon={faCheckCircle} className="mb-3 text-4xl text-green-500" />
            <h3 className="mb-1 text-lg font-bold text-[var(--text-color)]">Request Sent!</h3>
            <p className="text-sm text-gray-500">We will reply to your email within 1 business day.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mb-4 text-xs text-gray-500">
              Please fill the <span className="text-red-500">*</span> required fields.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col">
                <span className={labelClass}>
                  Your Name <span className="text-red-500">*</span>
                </span>
                <input
                  required
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Full Name"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <span className={labelClass}>
                  Country <span className="text-red-500">*</span>
                </span>
                <select required value={form.country} onChange={handleChange("country")} className={inputClass}>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span className={labelClass}>
                  E-mail <span className="text-red-500">*</span>
                </span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  placeholder="E-mail Address"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <span className={labelClass}>
                  Phone <span className="text-red-500">*</span>
                </span>
                <input
                  required
                  value={form.phone}
                  onChange={handleChange("phone")}
                  placeholder="Telephone or Mobile No."
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <span className={labelClass}>City</span>
                <input value={form.city} onChange={handleChange("city")} placeholder="City" className={inputClass} />
              </label>
              <label className="flex flex-col">
                <span className={labelClass}>Address</span>
                <input
                  value={form.address}
                  onChange={handleChange("address")}
                  placeholder="Street, Town, Province"
                  className={inputClass}
                />
              </label>
            </div>

            <label className="mt-4 flex flex-col">
              <span className={labelClass}>Message</span>
              <textarea
                rows={4}
                value={form.message}
                onChange={handleChange("message")}
                placeholder={
                  rawStatus === "sold"
                    ? "I'm interested in a similar vehicle. Please contact me."
                    : "I'm interested in this vehicle. Please contact me regarding availability."
                }
                className={`${inputClass} resize-none`}
              />
            </label>

            {status === "error" && (
              <p className="mt-3 text-xs font-semibold text-red-600">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-5 flex items-center gap-2 bg-[var(--primary-color)] px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[var(--primary-color-hover)] disabled:opacity-60"
            >
              {status === "sending" ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Sending...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} /> Send Request
                </>
              )}
            </button>

            <ul className="mt-4 list-inside list-disc space-y-1 text-xs text-gray-400">
              <li>Fill out the required fields and click Send.</li>
              <li>You will receive a response via email within 1 business day.</li>
              <li>For sold units we will offer similar alternatives in your price range.</li>
            </ul>
          </form>
        )}
      </div>
    </div>
  );
};

export default VehicleInquiryForm;
