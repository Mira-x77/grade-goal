import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4 px-6">
      <div className="w-36 h-36 rounded-3xl bg-secondary/20 border-2 border-border flex items-center justify-center">
        <span className="text-5xl">😞</span>
      </div>
      <h1 className="text-6xl font-black text-foreground">404</h1>
      <p className="text-lg font-black text-foreground">{t("pageNotFound")}</p>
      <p className="text-sm font-bold text-muted-foreground text-center">
        {t("mascotDoesntKnow")}
      </p>
      <a
        href="/"
        className="mt-2 rounded-2xl bg-secondary border-2 border-foreground px-6 py-3 text-sm font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
      >
        {t("goHome")}
      </a>
    </div>
  );
};

export default NotFound;
