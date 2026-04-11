import { useState } from "react";
import { X, Crown, Smartphone, Key, Check, Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { subscriptionService } from "@/services/subscriptionService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface PaymentSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onBack?: () => void;
  subjectName?: string;
  amount?: number;
}

type Tab = "mobile" | "code";
type Provider = "flooz" | "mixx";

const PRICES = { single: 500, all: 1500 };

const PROVIDERS: { id: Provider; name: string; network: string; color: string }[] = [
  { id: "flooz", name: "Flooz",       network: "Moov Africa",       color: "bg-blue-500"   },
  { id: "mixx",  name: "Mixx by YAS", network: "YAS (ex-Togocom)", color: "bg-orange-500" },
];

export function PaymentSheet({ open, onClose, onSuccess, onBack, subjectName, amount }: PaymentSheetProps) {
  const { t } = useLanguage();
  const [tab, setTab]               = useState<Tab>("mobile");
  const [provider, setProvider]     = useState<Provider>("flooz");
  const [phone, setPhone]           = useState("");
  const [code, setCode]             = useState("");
  const [loading, setLoading]       = useState(false);
  const [mobileSent, setMobileSent] = useState(false);

  const price     = amount ?? (subjectName ? PRICES.single : PRICES.all);
  const planLabel = subjectName ? `${subjectName} Pack` : t("allSubjectsPass");

  const handleClose = () => {
    if (loading) return;
    setPhone(""); setCode(""); setMobileSent(false);
    onClose();
  };

  const handleMobileSubmit = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setMobileSent(true);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length > 4 && v.length <= 8)  v = v.slice(0, 4) + "-" + v.slice(4);
    else if (v.length > 8)              v = v.slice(0, 4) + "-" + v.slice(4, 8) + "-" + v.slice(8, 12);
    setCode(v);
  };

  const handleCodeActivate = async () => {
    if (code.replace(/-/g, "").length !== 12) { toast.error("Enter a valid 12-character code"); return; }
    setLoading(true);
    try {
      await subscriptionService.activatePremiumCode(code);
      toast.success("Access granted!");
      onSuccess();
      handleClose();
    } catch (e: any) {
      toast.error(e.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onBackdropClick={handleClose} zIndex={70}>
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
        <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-muted-foreground active:scale-95 transition-transform shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Crown className="h-5 w-5 text-premium" />
              <h2 className="text-lg font-black text-foreground">{planLabel}</h2>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {t("monthsAccess")} · <span className="font-black text-foreground">{price.toLocaleString()} FCFA</span>
            </p>
          </div>
        </div>
        <button onClick={handleClose} className="text-muted-foreground mt-1 active:scale-95 transition-transform">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-4 pb-2 shrink-0">
        {([
          { id: "mobile" as Tab, label: t("mobileMoney"), icon: Smartphone },
          { id: "code"   as Tab, label: t("accessCode"),  icon: Key },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition-all border-2 ${
              tab === id
                ? "bg-secondary border-foreground card-shadow text-foreground"
                : "bg-muted border-transparent text-muted-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 min-h-0">
        {tab === "mobile" ? (
          <div className="flex flex-col gap-4 pt-2">
            {!mobileSent ? (
              <>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{t("chooseProvider")}</p>
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 border-2 transition-all active:scale-[0.98] ${
                        provider === p.id ? "border-foreground card-shadow bg-card" : "border-border bg-muted/50"
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-xl ${p.color} flex items-center justify-center shrink-0`}>
                        <Smartphone className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-sm text-foreground">{p.name}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground">{p.network}</p>
                      </div>
                      {provider === p.id && <Check className="h-4 w-4 text-foreground ml-auto" />}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">
                    {t("yourNumber")} {provider === "flooz" ? "Flooz" : "Mixx"}
                  </p>
                  <div className="flex items-center gap-2 rounded-2xl border-2 border-foreground bg-card px-4 py-3 card-shadow">
                    <span className="text-sm font-black text-muted-foreground">+228</span>
                    <input
                      type="tel"
                      placeholder="XX XX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 bg-transparent text-sm font-black text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      maxLength={12}
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {t("ussdPushConfirm")} {price.toLocaleString()} FCFA
                  </p>
                </div>

                <button
                  onClick={handleMobileSubmit}
                  disabled={loading || phone.replace(/\D/g, "").length < 8}
                  className="w-full rounded-2xl bg-foreground border-2 border-foreground py-4 font-black text-background card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {loading ? t("sendingRequest") : `${t("pay")} ${price.toLocaleString()} FCFA`}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="h-16 w-16 rounded-full bg-secondary border-2 border-foreground flex items-center justify-center card-shadow">
                  <Smartphone className="h-8 w-8 text-foreground" />
                </div>
                <div>
                  <p className="font-black text-foreground text-lg">{t("checkYourPhone")}</p>
                  <p className="text-sm font-semibold text-muted-foreground mt-1">
                    {t("ussdSentTo")} <span className="font-black text-foreground">+228 {phone}</span>
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground mt-2">
                    {t("confirmPayment")} <span className="font-black text-foreground">{price.toLocaleString()} FCFA</span> {t("onYourPhone")}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/60 border-2 border-border px-4 py-3 w-full text-left">
                  <p className="text-xs font-semibold text-muted-foreground">{t("accessActivated")}</p>
                </div>
                <button
                  onClick={() => setMobileSent(false)}
                  className="text-xs font-black text-muted-foreground active:scale-95 transition-transform"
                >
                  {t("wrongNumber")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            <div className="rounded-2xl bg-muted/50 border-2 border-border px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">{t("haveCode")}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">{t("accessCodeLabel")}</p>
              <input
                type="text"
                placeholder="XXXX-XXXX-XXXX"
                value={code}
                onChange={handleCodeChange}
                maxLength={14}
                className="w-full rounded-2xl border-2 border-foreground bg-card px-4 py-4 text-xl font-black text-foreground text-center tracking-widest placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-secondary card-shadow"
              />
              <p className="text-[10px] font-semibold text-muted-foreground text-center">
                12-character code · Format: XXXX-XXXX-XXXX
              </p>
            </div>
            <button
              onClick={handleCodeActivate}
              disabled={loading || code.replace(/-/g, "").length !== 12}
              className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Key className="h-5 w-5" />}
              {loading ? t("activating") : t("activateCode")}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
