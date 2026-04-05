import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Smartphone, Key, Check, Loader2 } from "lucide-react";
import { subscriptionService } from "@/services/subscriptionService";
import { toast } from "sonner";

interface PaymentSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subjectName?: string;   // if set → single subject pack; if undefined → all subjects
}

type Tab = "mobile" | "code";
type Provider = "flooz" | "mixx";

const PRICES = {
  single: 500,
  all: 1500,
};

const PROVIDERS: { id: Provider; name: string; network: string; color: string }[] = [
  { id: "flooz", name: "Flooz", network: "Moov Africa", color: "bg-blue-500" },
  { id: "mixx",  name: "Mixx by YAS", network: "YAS (ex-Togocom)", color: "bg-orange-500" },
];

export function PaymentSheet({ open, onClose, onSuccess, subjectName }: PaymentSheetProps) {
  const [tab, setTab] = useState<Tab>("mobile");
  const [provider, setProvider] = useState<Provider>("flooz");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileSent, setMobileSent] = useState(false);

  const price = subjectName ? PRICES.single : PRICES.all;
  const planLabel = subjectName ? `${subjectName} Pack` : "All Subjects";

  const handleClose = () => {
    if (loading) return;
    setPhone(""); setCode(""); setMobileSent(false);
    onClose();
  };

  // ── Mobile Money ──
  const handleMobileSubmit = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) { toast.error("Enter a valid phone number"); return; }
    setLoading(true);
    try {
      // UI-only for now — backend integration pending
      await new Promise(r => setTimeout(r, 1200)); // simulate network
      setMobileSent(true);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Access Code ──
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length > 4 && v.length <= 8) v = v.slice(0, 4) + "-" + v.slice(4);
    else if (v.length > 8) v = v.slice(0, 4) + "-" + v.slice(4, 8) + "-" + v.slice(8, 12);
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
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-w-md mx-auto bg-background rounded-t-3xl border-t-2 border-x-2 border-foreground overflow-hidden"
            style={{ maxHeight: "90vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Crown className="h-5 w-5 text-secondary" />
                  <h2 className="text-lg font-black text-foreground">{planLabel}</h2>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  3 months access · <span className="font-black text-foreground">{price.toLocaleString()} FCFA</span>
                </p>
              </div>
              <button onClick={handleClose} className="text-muted-foreground mt-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-4 pb-2">
              {([
                { id: "mobile" as Tab, label: "Mobile Money", icon: Smartphone },
                { id: "code"   as Tab, label: "Access Code",  icon: Key },
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

            {/* Content */}
            <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: "calc(90vh - 180px)" }}>
              {tab === "mobile" ? (
                <div className="flex flex-col gap-4 pt-2">
                  {!mobileSent ? (
                    <>
                      {/* Provider selection */}
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Choose provider</p>
                        {PROVIDERS.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setProvider(p.id)}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-3 border-2 transition-all active:scale-[0.98] ${
                              provider === p.id
                                ? "border-foreground card-shadow bg-card"
                                : "border-border bg-muted/50"
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

                      {/* Phone input */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Your {provider === "flooz" ? "Flooz" : "Mixx"} number</p>
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
                          You'll receive a USSD push to confirm {price.toLocaleString()} FCFA
                        </p>
                      </div>

                      <button
                        onClick={handleMobileSubmit}
                        disabled={loading || phone.replace(/\D/g, "").length < 8}
                        className="w-full rounded-2xl bg-foreground border-2 border-foreground py-4 font-black text-background card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                        {loading ? "Sending request..." : `Pay ${price.toLocaleString()} FCFA`}
                      </button>
                    </>
                  ) : (
                    /* Pending confirmation state */
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      <div className="h-16 w-16 rounded-full bg-secondary border-2 border-foreground flex items-center justify-center card-shadow">
                        <Smartphone className="h-8 w-8 text-foreground" />
                      </div>
                      <div>
                        <p className="font-black text-foreground text-lg">Check your phone</p>
                        <p className="text-sm font-semibold text-muted-foreground mt-1">
                          A USSD push has been sent to <span className="font-black text-foreground">+228 {phone}</span>
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground mt-2">
                          Confirm the payment of <span className="font-black text-foreground">{price.toLocaleString()} FCFA</span> on your phone to unlock access.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/60 border-2 border-border px-4 py-3 w-full text-left">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Once confirmed, your access will be activated automatically within a few seconds.
                        </p>
                      </div>
                      <button
                        onClick={() => setMobileSent(false)}
                        className="text-xs font-black text-muted-foreground active:scale-95 transition-transform"
                      >
                        Wrong number? Go back
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Access Code tab */
                <div className="flex flex-col gap-4 pt-2">
                  <div className="rounded-2xl bg-muted/50 border-2 border-border px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Have a code from a reseller or promotion? Enter it below to activate your access instantly.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Access code</p>
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
                    {loading ? "Activating..." : "Activate Code"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
