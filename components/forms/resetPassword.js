import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { apiBaseUrl } from '../utilities/apiBase';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const ResetPassword = ({ token: tokenProp }) => {
  const router = useRouter();
  const token = tokenProp || router.query?.token; // Get the token from the URL
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');

  const evaluatePasswordStrength = (password) => {
    let strength = 'Weak';
    const lengthCriteria = password.length >= 8;
    const numberCriteria = /[0-9]/.test(password);
    const specialCharCriteria = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const uppercaseCriteria = /[A-Z]/.test(password);
    const lowercaseCriteria = /[a-z]/.test(password);

    const criteriaMet = [lengthCriteria, numberCriteria, specialCharCriteria, uppercaseCriteria, lowercaseCriteria]
      .filter(Boolean).length;

    if (criteriaMet >= 4) {
      strength = 'Strong';
    } else if (criteriaMet === 3) {
      strength = 'Medium';
    }

    return { strength };
  };

  const handlePasswordChange = (event) => {
    const newPassword = event.target.value;
    const { strength } = evaluatePasswordStrength(newPassword);
    setPassword(newPassword);
    setPasswordStrength(strength);
  };

  const apiUrl = apiBaseUrl;

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (passwordStrength === 'Weak') {
      setMessage('Your password is too weak. Please choose a stronger password.');
      setMessageType('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/auth/reset_password.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      setMessage(data.message);
      setMessageType(data.status);

      if (data.status === 'success') {
        setTimeout(() => {
          router.push('/login'); // Navigate to the login page after a delay
        }, 2000);
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
      setMessageType('error');
    }
  };

  return (
    <div className="reset-password-container">
      <form onSubmit={handleResetPassword}>
        <img src="/images/logo-eljawad-dark.svg" alt="Logo" className="logo-form" />
        <h2>Reset Password</h2>
        <div className="password-input-group">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <div className="password-input-group">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <button type="submit">Reset Password</button>
        {message && <p className={`message ${messageType}`}>{message}</p>}
      </form>
    </div>
  );
};

export default ResetPassword;