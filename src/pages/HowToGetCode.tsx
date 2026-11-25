import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Key, Shield, User, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { loadState } from "@/lib/storage";
import { RedeemCodeSheet } from "@/components/subscription/RedeemCodeSheet";
import registryIllustration from "@/assets/how-to-get-code/registry-illustration.png";
import { useCodePricing } from "@/hooks/useCodePricing";
import { formatCodePrice, pricingTiers } from "@/lib/code-pricing";
import { usePremium } from "@/contexts/AppConfigContext";
import { quotaEvents } from "@/lib/quotaEvents";

function StepCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card border-2 border-border p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-black border-2 border-foreground">
          {number}
        </span>
        <h3 className="text-sm font-black text-foreground leading-snug pt-1">{title}</h3>
      </div>
      <div className="text-sm font-semibold text-muted-foreground leading-relaxed pl-11">{children}</div>
    </div>
  );
}

function tierPriceLabel(
  months: number,
  priceStr: string,
  t: (key: keyof typeof import("@/lib/i18n").translations.en) => string,
): string {
  const tpl =
    months === 1
      ? t("howToGetCodePriceMonthTpl")
      : t("howToGetCodePriceMonthsTpl");
  return tpl.replace("{n}", String(months)).replace("{price}", priceStr);
}

export default function HowToGetCode() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { pricing } = useCodePricing();
  const { refresh: refreshPremium } = usePremium();
  const [showRedeem, setShowRedeem] = useState(false);
  const priceTiers = pricingTiers(pricing);
  const month1Price = formatCodePrice(pricing.month1, pricing.currency, language);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(72);
  const studentName = loadState()?.studentName?.trim() || "";

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  const protectRules = [
    t("howToGetCodeProtectShare"),
    t("howToGetCodeProtectOnce"),
    t("howToGetCodeProtectImmediate"),
    t("howToGetCodeProtectLost"),
    t("howToGetCodeProtectDuration"),
    t("howToGetCodeProtectNoGive"),
  ];

  const activateSteps = [
    t("howToGetCodeActivate1"),
    t("howToGetCodeActivate2"),
    t("howToGetCodeActivate3"),
    t("howToGetCodeActivate4"),
    t("howToGetCodeActivate5"),
  ];

  return (
    <>
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <div
          ref={headerRef}
          className="fixed top-0 left-0 right-0 z-10 bg-background/90 backdrop-blur-lg border-b border-border safe-area-top"
        >
          <div className="header-inner flex items-center gap-3 py-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border-2 border-foreground active:scale-95 transition-transform shrink-0"
              aria-label={t("goBack")}
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black text-foreground leading-tight">{t("howToGetCode")}</h1>
              <p className="text-[11px] font-semibold text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                {t("howToGetCodeSubtitle")}
              </p>
            </div>
          </div>
        </div>

        <div
          className="content-col flex flex-col gap-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          style={{ paddingTop: headerHeight + 16 }}
        >
          <div className="w-full max-w-md mx-auto aspect-[4/3] rounded-2xl border-2 border-border bg-card overflow-hidden flex items-center justify-center p-3">
            <img
              src={registryIllustration}
              alt=""
              decoding="async"
              className="max-h-full max-w-full w-auto h-auto object-contain"
            />
          </div>

          <div className="rounded-2xl bg-premium/10 border-2 border-premium/40 p-5 flex flex-col gap-3">
            <h3 className="text-sm font-black text-foreground">{t("howToGetCodePriceTitle")}</h3>
            <p className="text-2xl font-black text-premium tracking-tight">
              {t("howToGetCodeOneMonthTpl").replace("{price}", month1Price)}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">{t("howToGetCodePricingIntro")}</p>
            <ul className="text-sm font-semibold text-foreground space-y-1.5 list-disc pl-5">
              {priceTiers.map(({ months, price }) => (
                <li key={months}>
                  {tierPriceLabel(months, formatCodePrice(price, pricing.currency, language), t)}
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed border-t border-premium/20 pt-3">
              {t("howToGetCodePriceConfirm")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-black text-foreground px-1">{t("howToGetCodeStepsTitle")}</h3>

            <StepCard number={1} title={t("howToGetCodeStep1Title")}>
              {t("howToGetCodeStep1Body")}
            </StepCard>

            <StepCard number={2} title={t("howToGetCodeStep2Title")}>
              <blockquote className="border-l-4 border-primary/50 pl-3 text-foreground font-bold">
                &ldquo;{t("howToGetCodeStep2Quote")}&rdquo;
              </blockquote>
            </StepCard>

            <StepCard number={3} title={t("howToGetCodeStep3Title")}>
              <p>{t("howToGetCodeStep3Body")}</p>
              <p className="mt-2 text-xs font-bold text-primary">{t("howToGetCodeStep3Where")}</p>
              <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                {t("howToGetCodeStep3Important")}
              </p>
              <div className="mt-3 rounded-xl bg-secondary/50 border-2 border-foreground/20 px-3 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-bold text-muted-foreground">{t("howToGetCodeStep3YourName")}</span>
                </div>
                {studentName ? (
                  <span className="text-base font-black text-foreground break-words">{studentName}</span>
                ) : (
                  <p className="text-xs font-semibold text-muted-foreground">{t("howToGetCodeStep3NoName")}</p>
                )}
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="flex items-center justify-between gap-2 text-xs font-black text-primary active:opacity-70 transition-opacity mt-1"
                >
                  {t("howToGetCodeStep3ViewProfile")}
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </StepCard>

            <StepCard number={4} title={t("howToGetCodeStep4Title")}>
              <p>{t("howToGetCodeStep4Body")}</p>
              <ul className="mt-2 space-y-1 list-disc pl-4">
                {priceTiers.slice(0, 2).map(({ months, price }) => {
                  const priceStr = formatCodePrice(price, pricing.currency, language);
                  const tpl =
                    months === 1
                      ? t("howToGetCodeStep4ExampleTpl")
                      : t("howToGetCodeStep4ExamplesTpl");
                  return (
                    <li key={months}>
                      {tpl.replace("{n}", String(months)).replace("{price}", priceStr)}
                    </li>
                  );
                })}
                {priceTiers.length === 1 && (
                  <li>{t("howToGetCodeStep4Example2")}</li>
                )}
              </ul>
            </StepCard>

            <StepCard number={5} title={t("howToGetCodeStep5Title")}>
              {t("howToGetCodeStep5Body")}
            </StepCard>
          </div>

          <div className="rounded-2xl bg-card border-2 border-amber-500/40 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-black text-foreground">{t("howToGetCodeProtectTitle")}</h3>
            </div>
            <ul className="space-y-2 pl-1">
              {protectRules.map((rule) => (
                <li key={rule} className="flex items-start gap-2 text-sm font-semibold text-muted-foreground">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-card border-2 border-border p-4 flex flex-col gap-3">
            <h3 className="text-sm font-black text-foreground">{t("howToGetCodeActivateTitle")}</h3>
            <ol className="space-y-2">
              {activateSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm font-semibold text-muted-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs font-black">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <button
            type="button"
            onClick={() => setShowRedeem(true)}
            className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-base"
          >
            <Key className="h-5 w-5" />
            {t("howToGetCodeEnterCode")}
          </button>
        </div>
      </div>

      <RedeemCodeSheet
        open={showRedeem}
        onClose={() => setShowRedeem(false)}
        onSuccess={() => {
          void refreshPremium();
          quotaEvents.emit();
          setShowRedeem(false);
        }}
      />
    </>
  );
}
