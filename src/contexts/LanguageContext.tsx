import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Language, getLanguage, setLanguage, translations } from "@/lib/i18n";

type TFunction = (key: keyof typeof translations.en) => string;

interface LanguageContextType {
  language: Language;
  setLang: (l: Language) => void;
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLang: () => {},
  t: (key) => translations.en[key],
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

  // key={language} forces full remount of the app tree on language change
  // so all components using the static t() from i18n also get fresh values
  return (
    <LanguageContext.Provider value={{ language, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
