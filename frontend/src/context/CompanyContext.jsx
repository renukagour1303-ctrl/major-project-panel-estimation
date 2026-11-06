import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCompanyConfig } from '../services/companyConfigService.js';

const CompanyContext = createContext(null);

export const DEFAULT_COMPANY_CONFIG = {
  companyName: 'Sungroves Innovations LLP',
  phone: '+91 98765 43210',
  email: 'support@sungroves.com',
  address: 'Chhatrapati Sambhajinagar, Maharashtra, India',
  operatingHours: 'Mon - Sat: 9:00 AM - 6:30 PM',
  freeTrialInfo: '14-Day Free Feasibility Consultation & Remote Rooftop Assessment',
  proPrice: '₹4,999 / year'
};

export function CompanyProvider({ children }) {
  const [companyConfig, setCompanyConfig] = useState(DEFAULT_COMPANY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCompanyConfig = useCallback(async () => {
    try {
      const data = await fetchCompanyConfig();
      if (data) {
        setCompanyConfig(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (err) {
      console.warn('Could not load dynamic company config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCompanyConfig();
  }, [refreshCompanyConfig]);

  const updateLocalConfig = (updatedFields) => {
    setCompanyConfig(prev => ({
      ...prev,
      ...updatedFields
    }));
  };

  return (
    <CompanyContext.Provider value={{ companyConfig, isLoading, refreshCompanyConfig, updateLocalConfig }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    return {
      companyConfig: DEFAULT_COMPANY_CONFIG,
      isLoading: false,
      refreshCompanyConfig: () => {},
      updateLocalConfig: () => {}
    };
  }
  return context;
}
