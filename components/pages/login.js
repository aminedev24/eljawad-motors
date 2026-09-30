import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUser } from '../user/userContext';
import useCheckScreenSize from '../utilities/screenSize';
import { apiBaseUrl } from '../utilities/apiBase';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const apiUrl = apiBaseUrl;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [, setPendingPassword] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [canResend, setCanResend] = useState(true);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [timeoutEnd, setTimeoutEnd] = useState(null);
  const router = useRouter();

  const { user, loading, login } = useUser();
  const hasHandledInitialAuth = useRef(false);

  // Redirect if the visitor already had a session when they landed on this
  // page. Guarded to run once (right after the initial session check) so it
  // doesn't fire again — and stomp on the "Welcome, X!" message/redirect —
  // when `user` flips from null to truthy because of a fresh handleLogin().
  useEffect(() => {
    if (loading || hasHandledInitialAuth.current) return;
    hasHandledInitialAuth.current = true;

    if (user) {
      setMessage(`Welcome back, ${user.name || user.email}!`);
      setMessageType('success');

      const timeoutId = setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);

      const from = router.query.from || '/';
      console.log('User already logged in, redirecting to:', from);

      const redirectTimeout = setTimeout(() => {
        router.push(from);
      }, 2000);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(redirectTimeout);
      };
    }
  }, [loading, user, router]);

  // Handle timeout countdown
  useEffect(() => {
    if (maxAttemptsReached && timeoutEnd) {
      const interval = setInterval(() => {
        const now = Date.now();
        if (now >= timeoutEnd) {
          setMaxAttemptsReached(false);
          setTimeoutEnd(null);
          setAttemptsLeft(5);
          setMessage('You can now try again.');
          setMessageType('info');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [maxAttemptsReached, timeoutEnd]);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await login(email, password);
      if (response.status === 'success') {
        setMessage(`Welcome, ${response.user.name || email}!`);
        setMessageType('success');

        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 5000);

        const from = router.query.from || '/';
        console.log('Redirecting to:', from);

        setTimeout(() => {
          router.push(from);
        }, 2000);
      } else if (
        response.message &&
        response.message.toLowerCase().includes('verification')
      ) {
        setShowVerification(true);
        setPendingEmail(email);
        setPendingPassword(password);
        setMessage('Verification code sent to your email.');
        setMessageType('info');
      } else {
        throw new Error(response.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
      console.error('Login error:', error);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (maxAttemptsReached) return;
    try {
      const res = await fetch(`${apiUrl}/auth/verify_code.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: pendingEmail,
          code: verificationCode,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessage('Verification successful! Logging you in...');
        setMessageType('success');
        setShowVerification(false);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage(data.message || 'Invalid code.');
        setMessageType('error');
        // Update attempts left if message contains "Attempts left"
        if (data.message && data.message.includes('Attempts left:')) {
          const match = data.message.match(/Attempts left: (\d+)/);
          if (match) {
            const left = parseInt(match[1]);
            setAttemptsLeft(left);
            if (left === 0) {
              setMaxAttemptsReached(true);
              setTimeoutEnd(Date.now() + 15 * 60 * 1000); // 15 minutes timeout
              setMessage('Maximum attempts reached. Please wait 15 minutes before trying again.');
              setMessageType('error');
            }
          }
        }
      }
    } catch (err) {
      setMessage('Verification failed.');
      setMessageType('error');
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    setCanResend(false);
    try {
      const res = await fetch(`${apiUrl}/auth/resend-verification.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: pendingEmail,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessage('Verification code resent to your email.');
        setMessageType('info');
        setAttemptsLeft(5); // Reset attempts on resend
      } else {
        setMessage(data.message || 'Failed to resend code.');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Failed to resend code.');
      setMessageType('error');
    }
    setTimeout(() => setCanResend(true), 30000); // Allow resend after 30 seconds
  };

  return (
    <div className="login-form-wrapper">
      <div className="login-container">
        <img
          src="/images/logo-eljawad-dark.svg"
          alt="Logo"
          className="logo-form"
        />
        <div className="header">
          <h2>Login</h2>
        </div>

        {showVerification ? (
          <form className="verification-form" onSubmit={handleVerifyCode}>
            <div className="input-group">
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
              <label htmlFor="verificationCode" className={verificationCode ? 'float' : ''}>
                Enter Verification Code
              </label>
            </div>
            <button
              type="submit"
              className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200 ${
                maxAttemptsReached ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={maxAttemptsReached}
            >
              Verify Code
            </button>
            <button
              type="button"
              className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200 ${
                !canResend || maxAttemptsReached ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={handleResendCode}
              disabled={!canResend || maxAttemptsReached}
            >
              {maxAttemptsReached
                ? `Wait ${Math.ceil((timeoutEnd - Date.now()) / 1000)}s`
                : canResend
                ? 'Resend Code'
                : 'Resend in 30s'}
            </button>
            {attemptsLeft < 5 && <p className="attempts-left">Attempts left: {attemptsLeft}</p>}
            {message && <p className={`message ${messageType}`}>{message}</p>}
          </form>
        ) : user ? (
          <p className="welcome-message">{message}</p>
        ) : (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <input
                type="email"
                id="email"
                value={email}
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="email" className={email ? 'float' : ''}>
                Email
              </label>
            </div>
            <div className="input-group password-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="password" className={password ? 'float' : ''}>
                Password
              </label>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <button type="submit" className="login-button">
              Login
            </button>
            <div className="forgot-password-link">
              <Link href="/forgot-password" className="cta-link">
                Forgot Password?
              </Link>
            </div>
            <div className="register-link">
              <span>Don't have an account? </span>
              <Link href="/register" className="cta-link">
                Register
              </Link>
            </div>
            {message && <p className={`message ${messageType}`}>{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
