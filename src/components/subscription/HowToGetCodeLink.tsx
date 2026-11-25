import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface HowToGetCodeLinkProps {
  /** Called before navigation (e.g. close the sheet). */
  onNavigate?: () => void;
  className?: string;
}

export function HowToGetCodeLink({ onNavigate, className = "" }: HowToGetCodeLinkProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleClick = () => {
    onNavigate?.();
    navigate("/premium/how-to-get-code");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-sm font-bold text-primary underline underline-offset-4 decoration-primary/50 hover:decoration-primary active:opacity-70 transition-all text-center w-full py-1 ${className}`}
    >
      {t("howToGetCode")}
    </button>
  );
}
