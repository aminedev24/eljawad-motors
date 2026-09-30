import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiAuth } from '../utilities/apiBase';
import { setCsrfToken, getCsrfToken } from '../utilities/csrfToken';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // No user data in cookies
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldRefreshSession, setShouldRefreshSession] = useState(false);
  const [isImpersonating , setIsImpersonating] = useState(false);

  // API URL setup
  const apiUrl = apiAuth;
  const isLocalDev =
    process.env.NODE_ENV === "development" && apiUrl.includes("localhost/artisbay-next/server");

  // Ensure a CSRF token is available before a state-changing request.
  // The token is normally populated by checkSession() on mount, but the
  // login form can be submitted before that request finishes, so fetch it
  // on demand rather than sending an empty X-CSRF-Token header.
  const ensureCsrfToken = async () => {
    if (getCsrfToken()) return getCsrfToken();
    try {
      const response = await fetch(`${apiUrl}/check_session.php`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.csrf) setCsrfToken(data.csrf);
    } catch (error) {
      console.error('Error obtaining CSRF token:', error);
    }
    return getCsrfToken();
  };

  // Login Function
  const login = async (email, password) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
  
    try {
      await ensureCsrfToken();
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        return { status: "error", message: "Could not obtain a CSRF token. Please try again." };
      }

      const formData = new URLSearchParams();
      formData.append("email", email);
      formData.append("password", password);
  
      const response = await fetch(`${apiUrl}/login2.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-Token": csrfToken,
        },
        body: formData.toString(),
        credentials: "include",
      });
  
      const data = await response.json();
      //console.log(data)
      if (data.status === "success") {
        /*
        Cookies.set("session_token", data.token, {
          expires: 7,
          secure: true,
          sameSite: "Strict",
        });
        */
        setUser(data.user);
        //user.name[0].toUpperCase();
      }
  
      return data; // Return server response to be handled by calling function
    } catch (error) {
      console.error("Error logging in:", error);
      throw new Error("Failed to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };


  // Logout Function
  const logout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/logout.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.status === 'success') {
        setUser(null);
        //Cookies.remove('session_token'); // Remove the session token
        window.location.reload();
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

 // Main session check method
 const checkSession = async () => {
  try {
    const controller = new AbortController();
    // Generous timeout: a slow shared host would otherwise look like "logged
    // out" and bounce admins off /admin (the gate redirects when user is null).
    const timeout = setTimeout(() => controller.abort(new DOMException('Session check timeout', 'AbortError')), 8000);
    const response = await fetch(`${apiUrl}/check_session.php`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    
    if (data.csrf) setCsrfToken(data.csrf);

    if (data.status === 'success') {
      setUser(data.user);
      return data.user;
    } else {
      setUser(null);
      return null;
    }
  } catch (error) {
    if (error.name !== 'AbortError' && !isLocalDev) {
      console.error('Error checking session:', error);
    }
    return null;
  } finally {
    setLoading(false);
  }
};

//console.log(user)
// Initial session check on component mount
useEffect(() => {
  checkSession();
}, []);


// Session refresh trigger
useEffect(() => {
  if (shouldRefreshSession) {
    checkSession();
    setShouldRefreshSession(false);
  }
}, [shouldRefreshSession]);

const triggerSessionRefresh = () => {
  setShouldRefreshSession(true);
};


  return (
    <UserContext.Provider value={{ user, loading, login, logout, triggerSessionRefresh, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for consuming UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
