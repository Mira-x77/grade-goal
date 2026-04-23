import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AuthSheet from "@/components/AuthSheet";
import { Link } from "react-router-dom";

function BenefitText({ language }: { language: string }) {
  const { t } = useLanguage();
  const BENEFITS_KEYS = [
    { en: "benefit1En" as const, fr: "benefit1Fr" as const },
    { en: "benefit2En" as const, fr: "benefit2Fr" as const },
    { en: "benefit3En" as const, fr: "benefit3Fr" as const },
    { en: "benefit4En" as const, fr: "benefit4Fr" as const },
  ];
  const [idx, setIdx] = useState(0);
  const fr = language === "fr";

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % BENEFITS_KEYS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="text-center font-black text-white leading-snug whitespace-pre-line drop-shadow-md text-base md:text-xl"
      >
        {t(fr ? BENEFITS_KEYS[idx].fr : BENEFITS_KEYS[idx].en)}
      </motion.p>
    </AnimatePresence>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const { language, setLang, t } = useLanguage();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      localStorage.setItem("guest_mode", "true");
      navigate("/onboarding", { replace: true });
      if (navigator.onLine) {
        supabase.auth.signInAnonymously().catch(() => {});
      }
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-secondary/60 to-primary/40" />

      {/* Floating orbs */}
      <motion.div className="absolute -top-16 -left-16 w-52 h-52 md:w-80 md:h-80 rounded-full bg-primary/60 blur-sm"
        animate={{ y: [0, 18, 0], x: [0, 8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute -top-8 right-8 w-36 h-36 md:w-56 md:h-56 rounded-full bg-secondary/70 blur-sm"
        animate={{ y: [0, -14, 0], x: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
      <motion.div className="absolute top-24 right-4 w-20 h-20 md:w-32 md:h-32 rounded-full bg-background/30 blur-sm"
        animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
      <motion.div className="absolute top-1/2 -left-6 w-24 h-24 md:w-40 md:h-40 rounded-full bg-background/25 blur-sm"
        animate={{ y: [0, -12, 0], x: [0, 6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
      <motion.div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-44 h-44 md:w-64 md:h-64 rounded-full bg-primary/50 blur-sm"
        animate={{ y: [0, 16, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} />
      <motion.div className="absolute bottom-20 -left-8 w-28 h-28 md:w-44 md:h-44 rounded-full bg-secondary/40 blur-sm"
        animate={{ y: [0, -10, 0], x: [0, 8, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />

      {/* Wavy divider */}
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 390 844" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <path d="M0 420 Q100 340 200 420 Q300 500 390 420 L390 844 L0 844 Z" fill="hsl(var(--primary) / 0.25)" />
          <path d="M0 460 Q120 380 240 460 Q320 520 390 460 L390 844 L0 844 Z" fill="hsl(var(--background) / 0.08)" />
        </svg>
      </div>

      {/* Language toggle — top right */}
      <div className="relative z-10 flex justify-end px-6 pt-5 safe-area-top">
        <button
          onClick={() => setLang(language === "fr" ? "en" : "fr")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-white/40 bg-white/20 font-black text-xs text-white active:scale-95 transition-transform backdrop-blur-sm"
        >
          <Globe className="h-3.5 w-3.5" />
          {language === "fr" ? "FR" : "EN"}
        </button>
      </div>

      {/* Center content — title + rotating benefit text */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-8 md:px-16 text-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 22 }}
          className="flex flex-col items-center gap-4 max-w-md md:max-w-lg"
        >
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-lg">
            {t("welcome")}
          </h1>
          <div className="h-12 md:h-16 flex items-center justify-center">
            <BenefitText language={language} />
          </div>
        </motion.div>
      </div>

      {/* Bottom buttons */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 24 }}
        className="relative z-10 flex flex-col pb-[max(2.5rem,env(safe-area-inset-bottom))] md:pb-16"
      >
        <div className="flex items-end md:max-w-lg md:mx-auto md:w-full md:px-0 md:gap-4 md:rounded-2xl md:overflow-hidden">
          <button
            onClick={handleGuest}
            disabled={guestLoading}
            className="flex-1 py-5 text-sm font-black text-white/70 active:text-white transition-colors disabled:opacity-40"
          >
            {guestLoading ? "…" : t("continueWithoutSigning")}
          </button>
          <button
            onClick={() => setShowAuthSheet(true)}
            className="flex-1 bg-card rounded-tl-3xl md:rounded-2xl py-5 text-base font-black text-primary active:opacity-80 transition-opacity"
          >
            {t("signIn")}
          </button>
        </div>
      </motion.div>

      {/* Auth sheet */}
      <AuthSheet open={showAuthSheet} onClose={() => setShowAuthSheet(false)} />
    </div>
  );
}
