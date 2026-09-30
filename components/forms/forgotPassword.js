import { apiBaseUrl } from '../utilities/apiBase';
﻿import React, { useState } from 'react';
//import '../../css/forgotPassword.css';
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const apiUrl = apiBaseUrl;


  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/auth/forgotPassword.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setMessage(data.message);
      setMessageType(data.status);
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
      setMessageType('error');
    }
  };

  return (
    <div className="forgot-password-container">

      <form onSubmit={handleForgotPassword}>
      <img src={`/images/logo-eljawad-dark.svg`} alt="Logo" className="logo-form" />

        <h2>Forgot Password</h2>
        <input
          type="email"
          name='email'
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Link</button>
      </form>
      {message && <p className={`message ${messageType}`}>{message}</p>}
    </div>
  );
};

export default ForgotPassword;