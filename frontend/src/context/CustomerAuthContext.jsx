import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginCustomer, fetchCustomerProfile } from '../services/customerAuthService.js';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customerToken, setCustomerToken] = useState(() => {
    try {
      return localStorage.getItem('sungroves_customer_token') || null;
    } catch {
      return null;
    }
  });

  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('sungroves_customer_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCustomerLoading, setIsCustomerLoading] = useState(true);

  // Verify active customer session on load
  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      if (!customerToken) {
        if (isMounted) setIsCustomerLoading(false);
        return;
      }

      try {
        const profile = await fetchCustomerProfile(customerToken);
        if (isMounted && profile && profile.id) {
          setCustomer(profile);
          localStorage.setItem('sungroves_customer_info', JSON.stringify(profile));
        } else {
          customerLogout();
        }
      } catch (err) {
        console.warn('Customer session invalid or expired:', err.response?.data?.message || err.message);
        customerLogout();
      } finally {
        if (isMounted) setIsCustomerLoading(false);
      }
    }

    verifySession();
    return () => { isMounted = false; };
  }, [customerToken]);

  const customerLogin = async (email, password) => {
    const res = await loginCustomer(email, password);
    if (res && res.token && res.customer) {
      setCustomerToken(res.token);
      setCustomer(res.customer);
      try {
        localStorage.setItem('sungroves_customer_token', res.token);
        localStorage.setItem('sungroves_customer_info', JSON.stringify(res.customer));
      } catch (storageErr) {
        console.error('Failed to save customer token to localStorage:', storageErr);
      }
      return res;
    }
    throw new Error(res.message || 'Customer login failed.');
  };

  const updateCustomer = (updatedData) => {
    setCustomer(prev => {
      const merged = { ...(prev || {}), ...updatedData };
      try {
        localStorage.setItem('sungroves_customer_info', JSON.stringify(merged));
      } catch (err) {
        console.error('Failed to update customer info in localStorage:', err);
      }
      return merged;
    });
  };

  const setCustomerSession = (newCustomer, newToken = null) => {
    if (newCustomer) {
      setCustomer(newCustomer);
      try {
        localStorage.setItem('sungroves_customer_info', JSON.stringify(newCustomer));
      } catch (err) {
        console.error('Failed to save customer to localStorage:', err);
      }
    }
    if (newToken) {
      setCustomerToken(newToken);
      try {
        localStorage.setItem('sungroves_customer_token', newToken);
      } catch (err) {
        console.error('Failed to save customer token to localStorage:', err);
      }
    }
  };

  const customerLogout = () => {
    setCustomerToken(null);
    setCustomer(null);
    try {
      localStorage.removeItem('sungroves_customer_token');
      localStorage.removeItem('sungroves_customer_info');
    } catch (clearErr) {
      console.error('Failed to clear customer auth storage:', clearErr);
    }
  };

  const isCustomerLoggedIn = Boolean(customerToken && customer);

  return (
    <CustomerAuthContext.Provider
      value={{
        customerToken,
        customer,
        isCustomerLoggedIn,
        isCustomerLoading,
        customerLogin,
        customerLogout,
        updateCustomer,
        setCustomerSession
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
