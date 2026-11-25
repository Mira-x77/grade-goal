import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Language, getLanguage, setLanguage, translations } from "@/lib/i18n";

type TFunction = (key: keyof typeof translations.en) => string;

interface LanguageContextType {
  language: Language;
  setLang: (l: Language) => void;
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "fr",
  setLang: () => {},
  t: (key) => translations.fr[key] || translations.en[key],
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getLanguage);

  const setLang = (l: Language) => {
    setLanguage(l);
    setLanguageState(l);
  };

  const t = useCallback<TFunction>(
    (key) => translations[language][key] || translations.en[key],
    [language]
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // key={language} forces full remount on language change so static t() imports refresh too
  return (
    <LanguageContext.Provider value={{ language, setLang, t }}>
      <div key={language} className="contents">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}
