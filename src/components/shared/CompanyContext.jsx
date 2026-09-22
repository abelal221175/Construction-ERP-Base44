import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [currentCompany, setCurrentCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const companyList = await base44.entities.Company.list();
        setCompanies(companyList);
        
        const user = await base44.auth.me();
        const settings = await base44.entities.AppSettings.filter({ user_id: user.id });
        
        if (settings.length > 0 && settings[0].current_company_id) {
          const company = companyList.find(c => c.id === settings[0].current_company_id);
          if (company) {
            setCurrentCompany(company);
          } else if (companyList.length > 0) {
            setCurrentCompany(companyList[0]);
          }
        } else if (companyList.length > 0) {
          setCurrentCompany(companyList[0]);
        }
      } catch (error) {
        console.error('Error loading companies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCompanies();
  }, []);

  const selectCompany = async (company) => {
    setCurrentCompany(company);
    try {
      const user = await base44.auth.me();
      const settings = await base44.entities.AppSettings.filter({ user_id: user.id });
      if (settings.length > 0) {
        await base44.entities.AppSettings.update(settings[0].id, { current_company_id: company.id });
      } else {
        await base44.entities.AppSettings.create({ user_id: user.id, current_company_id: company.id });
      }
    } catch (error) {
      console.error('Error saving company preference');
    }
  };

  const refreshCompanies = async () => {
    const companyList = await base44.entities.Company.list();
    setCompanies(companyList);
  };

  return (
    <CompanyContext.Provider value={{ 
      currentCompany, 
      companies, 
      selectCompany, 
      refreshCompanies,
      isLoading 
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export default CompanyContext;