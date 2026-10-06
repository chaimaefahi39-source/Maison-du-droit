import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, type LanguageCode } from '../i18n/translations';

export type Language = LanguageCode;

const LANGUAGE_STORAGE_KEY = 'mdd_language';

type LanguageContextType = {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: keyof typeof translations['fr']) => string;
  isRTL: boolean;
  textAlign: 'right' | 'left';
  flexDirection: 'row-reverse' | 'row';
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('fr');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'fr' || stored === 'ar' || stored === 'en') {
          setLanguageState(stored);
        }
      } catch (e) {
        console.warn('Failed to load language preference:', e);
      }
    })();
  }, []);

  const setLanguage = async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  };

  const t = (key: keyof typeof translations['fr']): any => {
    const langDict = translations[language] || translations['fr'];
    return langDict[key] ?? translations['fr'][key] ?? key;
  };

  const isRTL = language === 'ar';
  const textAlign = isRTL ? 'right' : 'left';
  const flexDirection = isRTL ? 'row-reverse' : 'row';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, textAlign, flexDirection }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
