import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <h2 className="font-black text-foreground text-sm">{title}</h2>
    <div className="text-muted-foreground font-semibold text-sm leading-relaxed">{children}</div>
  </div>
);

export default function TermsAndConditions() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top py-3 px-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border-2 border-foreground card-shadow active:scale-95 transition-transform shrink-0">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-black text-primary">{t("termsTitle")}</h1>
      </div>
      <div className="max-w-2xl mx-auto px-5 pt-24 pb-16 flex flex-col gap-5">
        <p className="text-xs text-muted-foreground font-semibold">{t("lastUpdated")}</p>
        <S title={t("terms1Title")}>{t("terms1Body")}</S>
        <S title={t("terms2Title")}>{t("terms2Body")}</S>
        <S title={t("terms3Title")}>{t("terms3Body")}</S>
        <S title={t("terms4Title")}>{t("terms4Body")} <a href="mailto:techmira77@gmail.com" className="text-primary font-bold underline">techmira77@gmail.com</a></S>
        <S title={t("terms5Title")}>{t("terms5Body")}</S>
        <S title={t("terms6Title")}>{t("terms6Body")}</S>
        <S title={t("terms7Title")}>{t("terms7Body")}</S>
        <S title={t("terms8Title")}>{t("terms8Body")}</S>
        <S title={t("terms9Title")}>{t("terms9Body")}</S>
        <S title={t("terms10Title")}><a href="mailto:techmira77@gmail.com" className="text-primary font-bold underline">techmira77@gmail.com</a> — Lomé, Togo</S>
      </div>
    </div>
  );
}
