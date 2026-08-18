"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface InstituteSettings {
  id: string;
  name: string;
  tagline: string;
  logo_url: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  academic_year: string;
  available_academic_years: string[];
}

interface SettingsContextType {
  settings: InstituteSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  setActiveAcademicYear: (year: string) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  loading: true,
  refreshSettings: async () => {},
  setActiveAcademicYear: () => {}
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<InstituteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('institute_settings')
        .select('*')
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching settings:", error);
      }
      if (data) {
        // Look for session override
        let sessionYear = null;
        if (typeof window !== 'undefined') {
          sessionYear = sessionStorage.getItem('active_academic_year');
        }
        
        // Override the global academic year with the session one if it exists
        setSettings({
          ...data,
          academic_year: sessionYear || data.academic_year
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setActiveAcademicYear = (year: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_academic_year', year);
    }
    if (settings) {
      setSettings({ ...settings, academic_year: year });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, setActiveAcademicYear }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
