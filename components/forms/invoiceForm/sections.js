import React from "react";
import CreatableSelect from "react-select/creatable";

import CountryList from "../../utilities/countryList";
import Tooltip from "../../utilities/toolTip";
import { INVOICE_TYPES, PAYMENT_TERMS, PRE_EXPORT_INSPECTION_OPTIONS } from "./constants";

export const AuthPrompt = ({ user, onLogin, onRegister }) => {
  if (user) return null;

  return (
    <div className="login-note">
      <span>Log in for a quick auto-fill.</span>
      <button type="button" onClick={onLogin}>
        Log In
      </button>
      <button type="button" onClick={onRegister}>
        Register
      </button>
    </div>
  );
};

const fmt = (n) => (n === "" || n === null || n === undefined ? "" : Number(n).toLocaleString("en-US"));

export const UserInfoSection = ({
  formData,
  onChange,
  phoneCode,
  customerMatches = [],
  onSelectCustomer,
}) => (
  <div className="form-section">
    <h3>Customer</h3>
    <div className="form-group">
      <div className="half-width invoice-autocomplete">
        <label htmlFor="fullName">
          Full Name<span className="required-star">*</span>
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={onChange}
          placeholder="Type a name or email to find a customer"
          autoComplete="off"
          required
        />
        {customerMatches.length > 0 && (
          <ul className="invoice-suggestions" role="listbox" aria-label="Matching customers">
            {customerMatches.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onSelectCustomer(c)}>
                  <strong>{c.fullName || c.email}</strong>
                  <span>{[c.email, c.country].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="half-width">
        <label htmlFor="company">Company</label>
        <input
          type="text"
          id="company"
          name="company"
          value={formData.company}
          onChange={onChange}
          placeholder="Company"
        />
      </div>
    </div>
    <div className="form-group">
      <div className="half-width">
        <label htmlFor="country">
          Country<span className="required-star">*</span>
        </label>
        <select id="country" name="country" value={formData.country} onChange={onChange} required>
          <option value="">Select Country</option>
          {CountryList()
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((country) => (
              <option key={country.label} value={country.label}>
                {country.label}
              </option>
            ))}
        </select>
      </div>
      <div className="half-width">
        <label htmlFor="phone">
          Phone<span className="required-star">*</span>
        </label>
        <div className="phone-number-group">
          {phoneCode && <span className="phone-code">{phoneCode}</span>}
          <input
            type="tel"
            id="phone"
            name="phone"
            className={phoneCode ? "shrink" : ""}
            value={formData.phone}
            onChange={onChange}
            placeholder="Phone number"
            required
          />
        </div>
      </div>
    </div>
    <div className="form-group">
      <div className="half-width">
        <label htmlFor="address">
          Address<span className="required-star">*</span>
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={onChange}
          placeholder="Address"
          required
        />
      </div>
      <div className="half-width">
        <label htmlFor="email">
          E-mail<span className="required-star">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          placeholder="E-mail"
          required
        />
      </div>
    </div>
  </div>
);

const VehiclePicker = ({ query, onQuery, results, searching, onSelect }) => (
  <div className="form-group" style={{ flexDirection: "column" }}>
    <div className="full-width invoice-autocomplete">
      <label htmlFor="vehicleSearch">Find the vehicle</label>
      <input
        type="search"
        id="vehicleSearch"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search stock by ref, make, model or chassis - fills the details and price below"
        autoComplete="off"
      />
      {query.trim().length >= 2 && (
        <ul className="invoice-suggestions" role="listbox" aria-label="Matching vehicles">
          {searching && results.length === 0 && <li className="invoice-suggestions-note">Searching…</li>}
          {!searching && results.length === 0 && <li className="invoice-suggestions-note">No vehicles match.</li>}
          {results.map((v) => (
            <li key={`${v.ref_no}-${v.id}`}>
              <button type="button" onClick={() => onSelect(v)}>
                <strong>{[v.make, v.model, v.year].filter(Boolean).join(" ")}</strong>
                <span>
                  {[v.ref_no && `Ref ${v.ref_no}`, v.chassis_no, v.price ? `${v.currency} ${fmt(v.price)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

export { VehiclePicker };

export const PaymentDetailsSection = ({
  formData,
  onChange,
  makes,
  models,
  onMakeChange,
  handleTypingStart,
  isVehiclePurpose,
  vehiclePicker,
}) => {
  const total = Number(formData.totalPrice) || 0;
  const due = Number(formData.depositAmount) || 0;
  const balance = total > due ? total - due : 0;

  return (
    <div className="form-section" style={{ paddingBottom: isVehiclePurpose ? "15px" : undefined }}>
      <h3>Payment Details</h3>

      <div className="form-group" style={{ flexDirection: "column" }}>
        <span className="invoice-field-label">Invoice type</span>
        <div className="invoice-segmented" role="radiogroup" aria-label="Invoice type">
          {INVOICE_TYPES.map((t) => (
            <label key={t.value} className={formData.invoiceType === t.value ? "active" : ""}>
              <input
                type="radio"
                name="invoiceType"
                value={t.value}
                checked={formData.invoiceType === t.value}
                onChange={onChange}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <div className="half-width">
          <label htmlFor="depositPurpose">
            Payment Purpose<span className="required-star">*</span>
          </label>
          <select id="depositPurpose" name="depositPurpose" value={formData.depositPurpose} onChange={onChange} required>
            <option value="Vehicle Purchase">Vehicle Purchase</option>
            <option value="Auto Parts Order">Auto Parts Order</option>
            <option value="Paying My Vehicle">Paying My Vehicle</option>
          </select>
        </div>
        <div className="half-width">
          <label htmlFor="depositCurrency">
            Currency<span className="required-star">*</span>
          </label>
          <select id="depositCurrency" name="depositCurrency" value={formData.depositCurrency} onChange={onChange}>
            <option value="USD">USD</option>
            <option value="JPY">JPY</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      {isVehiclePurpose && vehiclePicker}

      <div className="form-group">
        <div className="half-width">
          <label htmlFor="totalPrice">Total price</label>
          <input
            type="text"
            inputMode="decimal"
            id="totalPrice"
            name="totalPrice"
            value={fmt(formData.totalPrice)}
            onChange={onChange}
            placeholder="Full price (optional)"
          />
        </div>
        <div className="half-width">
          <label htmlFor="paymentTerms">Payment terms</label>
          <select id="paymentTerms" name="paymentTerms" value={formData.paymentTerms} onChange={onChange}>
            <option value="">No terms (enter the amount)</option>
            {PAYMENT_TERMS.map((t) => (
              <option key={t} value={t}>
                {t} of total
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <div className="half-width">
          <label htmlFor="depositAmount">
            Amount due now<span className="required-star">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="depositAmount"
            name="depositAmount"
            value={fmt(formData.depositAmount)}
            onChange={onChange}
            placeholder="Amount due on this invoice"
            required
          />
        </div>
        <div className="half-width invoice-amount-summary" aria-live="polite">
          {total > 0 ? (
            <>
              <span>
                Due now <strong>{formData.depositCurrency} {fmt(due)}</strong>
              </span>
              <span>
                Balance <strong>{formData.depositCurrency} {fmt(balance)}</strong>
              </span>
            </>
          ) : (
            <span>Add a total price to show the balance due.</span>
          )}
        </div>
      </div>

      {isVehiclePurpose && (
        <>
          <div className="form-group">
            <div className="half-width">
              <label htmlFor="make">
                Make<span className="required-star">*</span>
              </label>
              <CreatableSelect
                id="make"
                name="make"
                options={makes.map((make) => ({ value: make, label: make.charAt(0).toUpperCase() + make.slice(1) }))}
                placeholder="Make (any)"
                value={
                  formData.make && formData.make !== "any"
                    ? { value: formData.make, label: formData.make.charAt(0).toUpperCase() + formData.make.slice(1) }
                    : null
                }
                onChange={(selectedOption) => {
                  const value = selectedOption ? selectedOption.value : "any";
                  const event = { target: { name: "make", value } };
                  onMakeChange(event);
                  onChange(event);
                }}
                isClearable
              />
            </div>
            <div className="half-width">
              <label htmlFor="model">
                Model <span className="required-star">*</span>
              </label>
              <CreatableSelect
                id="model"
                name="model"
                options={models.map((model) => ({ value: model, label: model }))}
                placeholder="Model (any)"
                value={formData.model && formData.model !== "any" ? { value: formData.model, label: formData.model } : null}
                onChange={(selectedOption) =>
                  onChange({ target: { name: "model", value: selectedOption ? selectedOption.value : "any" } })
                }
                isClearable
              />
            </div>
          </div>
          <div className="form-group">
            <div className="half-width">
              <label htmlFor="chasisNumber">Chassis Number</label>
              <input type="text" id="chasisNumber" name="chasisNumber" value={formData.chasisNumber} onChange={onChange} placeholder="Chassis Number" />
            </div>
            <div className="half-width">
              <label htmlFor="vehicleRef">Stock ref</label>
              <input type="text" id="vehicleRef" name="vehicleRef" value={formData.vehicleRef} onChange={onChange} placeholder="e.g. ELJ-0012" />
            </div>
          </div>
          <div className="form-group">
            <div className="half-width">
              <label htmlFor="engineCapacity">Engine capacity (cc)</label>
              <input type="text" id="engineCapacity" name="engineCapacity" value={fmt(formData.engineCapacity)} onChange={onChange} placeholder="Engine capacity" />
            </div>
            <div className="half-width">
              <label htmlFor="mileage">Mileage (km)</label>
              <input type="text" id="mileage" name="mileage" value={fmt(formData.mileage)} onChange={onChange} placeholder="Mileage" />
            </div>
          </div>
        </>
      )}

      <div className="form-group" style={{ flexDirection: "column" }}>
        <label htmlFor="depositDescription">
          Payment Description<span className="required-star">*</span>
          <Tooltip
            onTypingStart={handleTypingStart}
            message="Please describe what you are paying for, e.g., Toyota Land Cruiser 2013"
          />
        </label>
        <textarea
          id="depositDescription"
          name="depositDescription"
          value={formData.depositDescription}
          onChange={onChange}
          placeholder="Payment description"
          required
          rows="4"
        ></textarea>
      </div>
    </div>
  );
};

export const ShippingSection = ({ formData, onChange }) => (
  // Bottom padding leaves room for the "Note (By The Remitter)" label that sits
  // just below (the payment section used to provide this gap).
  <div className="form-section" style={{ paddingBottom: "15px" }}>
    <h3>Shipping</h3>
    <div className="form-group">
      <div className="half-width">
        <label htmlFor="destinationCountry">Destination country</label>
        <select id="destinationCountry" name="destinationCountry" value={formData.destinationCountry} onChange={onChange}>
          <option value="">Not specified</option>
          {CountryList()
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((country) => (
              <option key={country.label} value={country.label}>
                {country.label}
              </option>
            ))}
        </select>
      </div>
      <div className="half-width">
        <label htmlFor="destinationPort">Port of discharge</label>
        <input
          type="text"
          id="destinationPort"
          name="destinationPort"
          value={formData.destinationPort}
          onChange={onChange}
          placeholder="e.g. Mombasa"
        />
      </div>
    </div>
    <div className="form-group">
      <div className="half-width">
        <label htmlFor="preExportInspection">Pre-export inspection</label>
        <select id="preExportInspection" name="preExportInspection" value={formData.preExportInspection} onChange={onChange}>
          <option value="">Not specified</option>
          {PRE_EXPORT_INSPECTION_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
);

export const BankNoteSection = ({
  isEditable,
  onToggleEditable,
  formData,
  onChange,
}) => (
  <div className="input-group">
    <label id="bankNoteLabel" htmlFor="bankNote">
      Note (By The Remitter)
      <button type="button" onClick={onToggleEditable} className="edit-button">
        {isEditable ? "Save" : "Edit"}
      </button>
    </label>
    {isEditable ? (
      <textarea
        name="bankNote"
        value={formData.bankNote}
        onChange={onChange}
        placeholder="Leave Blank if not applicable"
        id="bankNoteInput"
        rows="4"
      ></textarea>
    ) : (
      <div className="bank-note-wrapper">
        <div className="bank-note-display">
          {formData.bankNote || "No note added."}
        </div>
      </div>
    )}
  </div>
);

export const SubmitSection = ({ isSubmitting, regenerate, onReset }) => (
  <div className="submit-section">
    <button type="submit" disabled={isSubmitting}>
      {isSubmitting && <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />}
      {isSubmitting ? " Generating..." : regenerate ? " Regenerate Invoice" : " Generate Invoice"}
    </button>
    {regenerate && (
      <button
        onClick={onReset}
        style={{ background: "var(--secondary-color)" }}
        type="button"
      >
        Reset Invoice
      </button>
    )}
  </div>
);
