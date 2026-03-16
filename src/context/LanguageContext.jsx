import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from '../i18n.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('leagl_lang');
    return saved && translations[saved] ? saved : 'nl';
  });

  const setLang = useCallback((l) => {
    if (translations[l]) {
      localStorage.setItem('leagl_lang', l);
      setLangState(l);
    }
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations['nl']?.[key] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
