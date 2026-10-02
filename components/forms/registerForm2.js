import React, { useState, useEffect } from "react";
import CountryList from "../utilities/countryList";
import { useRouter } from "next/router";
import { useUser } from '../user/userContext';
import { apiBaseUrl } from '../utilities/apiBase';

const SignupForm = ({ setModalType }) => {
  const router = useRouter();
  const { user, loading } = useUser();

  // Steps: 1 = initial form, 2 = email verification, 3 = full signup form
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");

  const apiUrl = apiBaseUrl;

  // --- Step 1: Send Verification Email ---
  const sendEmailConfirmation = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/auth/send-verification.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ email, fullName })
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Verification email sent. Please check your email for the code.");
        setIsError(false);
        setStep(2);
      } else {
        setMessage("Error sending verification email: " + data.error);
        setIsError(true);
      }
    } catch (error) {
      console.error("Error sending email verification", error);
      setMessage("Error sending email verification.");
      setIsError(true);
    }
  };

  // --- Step 2: Verify the Email Code ---
  const verifyEmail = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/auth/verify-email.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, verificationCode })
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Email verified successfully!");
        setIsError(false);
        setStep(3);
      } else {
        setMessage("Verification failed: " + data.error);
        setIsError(true);
      }
    } catch (error) {
      console.error("Error verifying email", error);
      setMessage("Error verifying email.");
      setIsError(true);
    }
  };

  // Back one step. From step 3 that is step 1, not 2: the server discards the
  // code once it's verified, so changing the name/email means a new code.
  const goBack = () => {
    setMessage("");
    setIsError(false);
    setVerificationCode("");
    setStep(1);
  };

  const backButton = (
    <button type="button" className="back-step" onClick={goBack}>
      &larr; {step === 3 ? "Back to name & email" : "Back"}
    </button>
  );

  // --- Common Handlers ---
  const handleCountryChange = (event) => {
    const country = CountryList().find((c) => c.label === event.target.value);
    setSelectedCountry(event.target.value);
    setPhoneCode(country ? country.countryCode : "");
  };

  const handleInputChange = (setter, event) => {
    setter(event.target.value);
  };

  const evaluatePasswordStrength = (password) => {
    let strength = "Weak";
    const lengthCriteria = password.length >= 8;
    const numberCriteria = /[0-9]/.test(password);
    const specialCharCriteria = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const uppercaseCriteria = /[A-Z]/.test(password);
    const lowercaseCriteria = /[a-z]/.test(password);

    const criteriaMet = [lengthCriteria, numberCriteria, specialCharCriteria, uppercaseCriteria, lowercaseCriteria]
      .filter(Boolean).length;

    if (criteriaMet >= 4) {
      strength = "Strong";
    } else if (criteriaMet === 3) {
      strength = "Medium";
    }
    return { strength };
  };

  const handlePasswordChange = (event) => {
    const newPassword = event.target.value;
    const { strength } = evaluatePasswordStrength(newPassword);
    setPassword(newPassword);
    setPasswordStrength(strength);
  };

  // --- Step 3: Final Signup Submission ---
  const handleSignup = async (event) => {
    event.preventDefault();

    if (passwordStrength === "Weak") {
      setMessage("Your password is too weak. Please choose a stronger password.");
      setIsError(true);
      return;
    }
    if (!agreeToTerms) {
      setMessage("You must agree to the terms and conditions.");
      setIsError(true);
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setIsError(true);
      return;
    }

    setMessage("Signing up...");
    setIsError(false);

    const fullPhoneNumber = phoneCode ? `${phoneCode} ${phone}`.trim() : phone;

    const formData = {
      "full-name": fullName,
      email,
      password,
      country: selectedCountry,
      phone: fullPhoneNumber,
      company,
      address
    };

    try {
      const response = await fetch(`${apiUrl}/auth/signup.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: 'include',
        body: new URLSearchParams(formData).toString(),
      });
      const result = await response.json();
      if (result.success) {
        setMessage("Signup successful! Redirecting...");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setMessage(`Signup failed: ${result.error}`);
        setIsError(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("An error occurred. Please try again.");
      setIsError(true);
    }
  };

  // Redirect if the user is already logged in when the component mounts
  useEffect(() => {
    if (!loading && user) {
      const from = router.query?.from || '/'; // Use the previous location or fallback to homepage
      console.log('User already logged in, redirecting to:', from);
      router.push(from);
    }
  }, [loading, user, router]);

  return (
    <div className="signup-container">
      <div className="signup-form">
        {/* Step 1: Enter Name and Email */}
        {step === 1 && (
          <div className="step1">
            <form onSubmit={sendEmailConfirmation}>
              <div className="input-group">
                <input
                  type="text"
                  value={fullName}
                  required
                  onChange={(e) => handleInputChange(setFullName, e)}
                  placeholder="Your name"
                />
                <label>
                  Full Name <span className="required">*</span>
                </label>
              </div>
              <div className="input-group">
                <input
                  type="email"
                  value={email}
                  placeholder="Email"
                  required
                  onChange={(e) => handleInputChange(setEmail, e)}
                />
                <label>
                  Email <span className="required">*</span>
                </label>
              </div>
              <button type="submit">Submit</button>
            </form>

            {message && (
              <div className={`message ${isError ? "error" : "success"}`}>
                {message}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Verify the Email */}
        {step === 2 && (
          <div className="step2">
            <form onSubmit={verifyEmail}>
              <div className="input-group">
                <input
                  type="text"
                  value={verificationCode}
                  placeholder="Enter Verification Code"
                  onChange={(e) => handleInputChange(setVerificationCode, e)}
                  required
                />
                <label>
                  Verification Code <span className="required">*</span>
                </label>
              </div>
              <button type="submit">
                Verify Email
              </button>
              {backButton}
            </form>

            {message && (
              <div className={`message ${isError ? "error" : "success"}`}>
                {message}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Complete the Signup Form */}
        {step === 3 && (
          <form onSubmit={handleSignup}>
            <div className="input-group phone-number-group">
              {phoneCode && <span className="phone-code">{phoneCode}</span>}
              <input
                type="tel"
                id="phone"
                name="phone"
                value={phone}
                onChange={(e) => handleInputChange(setPhone, e)}
                required
                placeholder="Phone Number"
                className={phoneCode ? "shrink" : ""}
              />
              <label>
                Phone Number <span className="required">*</span>
              </label>
            </div>

            <div className="input-group">
              <select
                id="country"
                value={selectedCountry}
                onChange={handleCountryChange}
                name="country"
                className={selectedCountry ? "not-empty" : ""}
                required
              >
                <option value="">Select Country</option>
                {CountryList()
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((country) => (
                    <option key={country.code} value={country.label}>
                      {country.label}
                    </option>
                  ))}
              </select>
              <label className="country-label">
                Country <span className="required">*</span>
              </label>
            </div>

            <div className="input-group">
              <input
                type="text"
                placeholder="Address (e.g., City)"
                name="address"
                value={address}
                required
                onChange={(e) => handleInputChange(setAddress, e)}
              />
              <label>
                Address <span className="required">*</span>
              </label>
            </div>

            <div className="input-group">
              <input
                type="text"
                placeholder="Company"
                name="company"
                value={company}
                onChange={(e) => handleInputChange(setCompany, e)}
              />
              <label>Company</label>
            </div>

            <div className="input-group password">
              <input
                type="password"
                value={password}
                placeholder="Password"
                onChange={handlePasswordChange}
                required
              />
              <label>
                Password <span className="required">*</span>
              </label>
              {password && <div className="password-strength">Strength: {passwordStrength}</div>}
            </div>

            <div className="input-group confirm-password">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => handleInputChange(setConfirmPassword, e)}
                required
              />
              <label>
                Confirm Password <span className="required">*</span>
              </label>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="agree-to-terms"
                checked={agreeToTerms}
                required
                onChange={() => setAgreeToTerms(!agreeToTerms)}
              />
              <label htmlFor="agree-to-terms">
                I agree to the{" "}
                <span
                  className="terms-highlight"
                  onClick={(e) => {
                    e.preventDefault();
                    setModalType("terms");
                  }}
                >
                  Terms & Conditions
                </span>{" "}
                and the{" "}
                <span
                  className="terms-highlight"
                  onClick={(e) => {
                    e.preventDefault();
                    setModalType("privacy");
                  }}
                >
                  Privacy Policy
                </span>
              </label>
            </div>

            {message && (
              <div className={`message ${isError ? "error" : "success"}`}>
                {message}
              </div>
            )}

            <button type="submit">Sign Up</button>
            {backButton}
          </form>
        )}
      </div>
    </div>
  );
};

export default SignupForm;