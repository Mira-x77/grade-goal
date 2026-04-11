import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Shared stroke style — matches the app mascot exactly
const S = {
  stroke: "hsl(var(--foreground))",
  strokeWidth: 7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};
const SF = { ...S, fill: "hsl(var(--background))" };

// Each mini mascot is a self-contained SVG in 80×100 viewBox
// Poses: pointing, celebrating, reading, thinking, idle, sleeping, sad, running
const MASCOTS = [
  // 0 — pointing up (the hero pose from the app icon)
  <svg key="point" viewBox="0 0 80 100" width="56" height="70">
    <path d="M28 70 L28 32 Q28 14 40 14 Q52 14 52 32 L52 70" {...SF}/>
    <circle cx="33" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <circle cx="47" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <line x1="33" y1="38" x2="47" y2="38" {...S} strokeWidth={4}/>
    <line x1="34" y1="70" x2="34" y2="88" {...S}/>
    <line x1="46" y1="70" x2="46" y2="88" {...S}/>
    {/* arm up */}
    <path d="M28 42 Q14 32 10 16" {...S}/>
    <circle cx="9" cy="13" r="4" {...SF}/>
    {/* arm hip */}
    <path d="M52 48 Q64 52 65 62" {...S}/>
    <circle cx="66" cy="65" r="4" {...SF}/>
  </svg>,

  // 1 — celebrating (both arms up, open mouth)
  <svg key="celeb" viewBox="0 0 80 100" width="56" height="70">
    <path d="M28 70 L28 32 Q28 14 40 14 Q52 14 52 32 L52 70" {...SF}/>
    <circle cx="33" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <circle cx="47" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <path d="M33 37 Q40 46 47 37" {...S} strokeWidth={4}/>
    <line x1="34" y1="70" x2="34" y2="88" {...S}/>
    <line x1="46" y1="70" x2="46" y2="88" {...S}/>
    <path d="M28 40 Q12 28 8 14" {...S}/>
    <circle cx="7" cy="11" r="4" {...SF}/>
    <path d="M52 40 Q68 28 72 14" {...S}/>
    <circle cx="73" cy="11" r="4" {...SF}/>
    <text x="4" y="10" fontSize="8" fill="hsl(var(--secondary))" stroke="none">★</text>
    <text x="64" y="9" fontSize="8" fill="hsl(var(--secondary))" stroke="none">★</text>
  </svg>,

  // 2 — reading (holding book)
  <svg key="read" viewBox="0 0 80 110" width="56" height="77">
    <path d="M28 70 L28 32 Q28 14 40 14 Q52 14 52 32 L52 70" {...SF}/>
    <circle cx="33" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <circle cx="47" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <line x1="33" y1="38" x2="47" y2="38" {...S} strokeWidth={4}/>
    <line x1="34" y1="70" x2="34" y2="88" {...S}/>
    <line x1="46" y1="70" x2="46" y2="88" {...S}/>
    <path d="M28 48 Q20 58 22 70" {...S}/>
    <path d="M52 48 Q60 58 58 70" {...S}/>
    <rect x="20" y="68" width="40" height="28" rx="2" {...S} fill="hsl(var(--secondary)/0.3)"/>
    <line x1="40" y1="68" x2="40" y2="96" {...S} strokeWidth={3}/>
    <line x1="24" y1="76" x2="38" y2="76" {...S} strokeWidth={2.5}/>
    <line x1="24" y1="83" x2="38" y2="83" {...S} strokeWidth={2.5}/>
  </svg>,

  // 3 — thinking (hand on chin, question mark)
  <svg key="think" viewBox="0 0 80 100" width="56" height="70">
    <path d="M28 70 L28 32 Q28 14 40 14 Q52 14 52 32 L52 70" {...SF}/>
    <circle cx="33" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <circle cx="47" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <line x1="33" y1="38" x2="47" y2="38" {...S} strokeWidth={4}/>
    <line x1="34" y1="70" x2="34" y2="88" {...S}/>
    <line x1="46" y1="70" x2="46" y2="88" {...S}/>
    <path d="M52 46 Q64 42 60 34" {...S}/>
    <circle cx="58" cy="31" r="4" {...SF}/>
    <path d="M28 52 Q16 58 15 68" {...S}/>
    <circle cx="14" cy="71" r="4" {...SF}/>
    <circle cx="66" cy="22" r="2" fill="hsl(var(--foreground))" stroke="none"/>
    <circle cx="70" cy="14" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <circle cx="74" cy="6" r="4" {...SF}/>
    <text x="71" y="9" fontSize="6" fill="hsl(var(--foreground))" stroke="none" fontWeight="900">?</text>
  </svg>,

  // 4 — idle / waving
  <svg key="idle" viewBox="0 0 80 100" width="56" height="70">
    <path d="M28 70 L28 32 Q28 14 40 14 Q52 14 52 32 L52 70" {...SF}/>
    <circle cx="33" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <circle cx="47" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <line x1="33" y1="38" x2="47" y2="38" {...S} strokeWidth={4}/>
    <line x1="34" y1="70" x2="34" y2="88" {...S}/>
    <line x1="46" y1="70" x2="46" y2="88" {...S}/>
    <path d="M28 44 Q16 36 14 24" {...S}/>
    <circle cx="13" cy="21" r="4" {...SF}/>
    <path d="M52 50 Q64 54 65 64" {...S}/>
    <circle cx="66" cy="67" r="4" {...SF}/>
  </svg>,

  // 5 — sleeping (slumped, zzz)
  <svg key="sleep" viewBox="0 0 80 100" width="56" height="70">
    <g transform="rotate(-12, 40, 52)">
      <path d="M28 70 L28 32 Q28 14 40 14 Q52 14 52 32 L52 70" {...SF}/>
      <path d="M30 30 Q33 27 36 30" {...S} strokeWidth={3}/>
      <path d="M44 30 Q47 27 50 30" {...S} strokeWidth={3}/>
      <line x1="33" y1="38" x2="47" y2="38" {...S} strokeWidth={4}/>
      <line x1="34" y1="70" x2="34" y2="88" {...S}/>
      <line x1="46" y1="70" x2="46" y2="88" {...S}/>
      <path d="M28 48 Q16 58 14 72" {...S}/>
      <circle cx="13" cy="75" r="4" {...SF}/>
      <path d="M52 48 Q64 58 66 72" {...S}/>
      <circle cx="67" cy="75" r="4" {...SF}/>
    </g>
    <text x="54" y="28" fontSize="7" fill="hsl(var(--foreground))" stroke="none" fontWeight="900">z</text>
    <text x="61" y="19" fontSize="9" fill="hsl(var(--foreground))" stroke="none" fontWeight="900">z</text>
    <text x="69" y="10" fontSize="11" fill="hsl(var(--foreground))" stroke="none" fontWeight="900">Z</text>
  </svg>,

  // 6 — sad (drooping arms, sad mouth)
  <svg key="sad" viewBox="0 0 80 100" width="56" height="70">
    <path d="M28 70 L28 32 Q28 14 40 14 Q52 14 52 32 L52 70" {...SF}/>
    <circle cx="33" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <circle cx="47" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
    <path d="M33 42 Q40 36 47 42" {...S} strokeWidth={4}/>
    <line x1="34" y1="70" x2="34" y2="88" {...S}/>
    <line x1="46" y1="70" x2="46" y2="88" {...S}/>
    <path d="M28 48 Q16 60 14 74" {...S}/>
    <circle cx="13" cy="77" r="4" {...SF}/>
    <path d="M52 48 Q64 60 66 74" {...S}/>
    <circle cx="67" cy="77" r="4" {...SF}/>
    <path d="M33 34 Q32 40 33 43" {...S} strokeWidth={2.5}/>
  </svg>,

  // 7 — running / excited (leaning forward)
  <svg key="run" viewBox="0 0 80 100" width="56" height="70">
    <g transform="rotate(10, 40, 50)">
      <path d="M28 70 L28 32 Q28 14 40 14 Q52 14 52 32 L52 70" {...SF}/>
      <circle cx="33" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
      <circle cx="47" cy="30" r="3" fill="hsl(var(--foreground))" stroke="none"/>
      <path d="M33 37 Q40 44 47 37" {...S} strokeWidth={4}/>
      <line x1="34" y1="70" x2="30" y2="88" {...S}/>
      <line x1="46" y1="70" x2="54" y2="84" {...S}/>
      <path d="M28 42 Q12 36 8 24" {...S}/>
      <circle cx="7" cy="21" r="4" {...SF}/>
      <path d="M52 44 Q66 50 70 62" {...S}/>
      <circle cx="71" cy="65" r="4" {...SF}/>
    </g>
    <text x="2" y="18" fontSize="9" fill="hsl(var(--secondary))" stroke="none">✦</text>
    <text x="66" y="14" fontSize="7" fill="hsl(var(--secondary))" stroke="none">✦</text>
  </svg>,
];

const ORBIT_COUNT = MASCOTS.length;

// Rotating benefit copy
const BENEFITS = [
  { en: "Track every score.\nSee your average live.", fr: "Suivez chaque note.\nVoyez votre moyenne en direct." },
  { en: "Know exactly what\nyou need to pass.", fr: "Sachez exactement\nce qu'il vous faut pour réussir." },
  { en: "Plan your strategy.\nHit your target.", fr: "Planifiez votre stratégie.\nAtteignez votre objectif." },
  { en: "Past papers.\nRight in your pocket.", fr: "Anciens sujets.\nDirectement dans votre poche." },
];

function OrbitRing() {
  const angleRef = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useAnimationFrame((_, delta) => {
    angleRef.current -= (delta / 20000) * 360;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const base = (i / ORBIT_COUNT) * 360;
      const deg = base + angleRef.current;
      const rad = (deg * Math.PI) / 180;
      const r = 120;
      const x = Math.cos(rad) * r;
      const y = Math.sin(rad) * r;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
  });

  return (
    <div ref={containerRef} className="relative" style={{ width: 280, height: 280 }}>
      {MASCOTS.map((mascot, i) => (
        <div
          key={i}
          ref={el => { itemRefs.current[i] = el; }}
          className="absolute top-1/2 left-1/2"
          style={{ willChange: "transform" }}
        >
          <motion.div
            animate={{ y: [0, -5, 0, 5, 0], rotate: [0, i % 2 === 0 ? 4 : -4, 0, i % 2 === 0 ? -4 : 4, 0] }}
            transition={{ duration: 2.8 + i * 0.35, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          >
            {mascot}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

function BenefitText({ language }: { language: string }) {
  const [idx, setIdx] = useState(0);
  const fr = language === "fr";

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % BENEFITS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={idx}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.06 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="text-center font-black text-foreground leading-snug whitespace-pre-line"
        style={{ fontSize: "1.05rem" }}
      >
        {fr ? BENEFITS[idx].fr : BENEFITS[idx].en}
      </motion.p>
    </AnimatePresence>
  );
}

export default function AuthPage() {
  const { t, language, setLang } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const browserClosedRef = useRef(false);
  const pendingSessionRef = useRef(false);

  useEffect(() => {
    const handleBrowserFinished = () => {
      browserClosedRef.current = true;
      setOauthLoading(null);
      if (pendingSessionRef.current) setSignedIn(true);
    };
    Browser.addListener("browserFinished", handleBrowserFinished);
    return () => { Browser.removeAllListeners(); };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (browserClosedRef.current) {
          setSignedIn(true);
          setOauthLoading(null);
        } else {
          pendingSessionRef.current = true;
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const getRedirectUrl = () => {
    if (Capacitor.getPlatform() !== "web") return "com.scoretarget.app://auth/callback";
    return `${window.location.origin}/auth/callback`;
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError("");
    setOauthLoading(provider);
    try {
      const isNative = Capacitor.getPlatform() !== "web";
      if (isNative) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: "com.scoretarget.app://auth/callback", skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: "_self", presentationStyle: "popover" });
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { 
            redirectTo: getRedirectUrl(),
            skipBrowserRedirect: false,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          },
        });
        if (error) throw error;
        return;
      }
    } catch (e: any) {
      setError(e.message ?? t("somethingWentWrong"));
      setOauthLoading(null);
    }
  };

  const handleGuest = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      navigate("/onboarding");
    } catch (e: any) {
      setError(e.message ?? t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    localStorage.setItem("dev_bypass", "true");
    localStorage.setItem("scoretarget_state", JSON.stringify({
      studentName: "Dev", targetAverage: 16,
      subjects: [
        { id: "1", name: "Mathematics", coefficient: 5, isOptional: false, marks: [], average: 15 },
        { id: "2", name: "Physics", coefficient: 4, isOptional: false, marks: [], average: 12 },
      ],
      targetDate: null, settings: { gradingSystem: "apc" },
    }));
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col overflow-hidden">

      {/* Success overlay */}
      <AnimatePresence>
        {signedIn && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-5 px-8"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 border-2 border-success"
            >
              <CheckCircle2 className="h-10 w-10 text-success" />
            </motion.div>
            <div className="text-center">
              <p className="text-2xl font-black text-foreground">{t("signedIn")}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">{t("settingUpExperience")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language toggle */}
      <div className="flex justify-end px-6 pt-5 safe-area-top">
        <button
          onClick={() => setLang(language === "fr" ? "en" : "fr")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-foreground bg-card font-black text-xs text-foreground card-shadow active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Globe className="h-3.5 w-3.5" />
          {language === "fr" ? "FR" : "EN"}
        </button>
      </div>

      {/* Orbit + center copy */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
        <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
          <OrbitRing />
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 pointer-events-none">
            <p className="text-xs font-black text-secondary uppercase tracking-widest mb-2">Go Study!</p>
            <BenefitText language={language} />
          </div>
        </div>
      </div>

      {/* Auth buttons */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="px-6 pb-10 pt-4 flex flex-col gap-3"
      >
        <button
          onClick={() => handleOAuth("google")}
          disabled={!!oauthLoading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-card border-2 border-foreground py-3.5 text-sm font-black text-foreground active:scale-[0.98] transition-transform card-shadow disabled:opacity-60 disabled:pointer-events-none"
        >
          {oauthLoading === "google" ? (
            <span className="h-5 w-5 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {oauthLoading === "google" ? t("signingIn") : t("continueWithGoogle")}
        </button>

        <button
          onClick={() => handleOAuth("apple")}
          disabled={!!oauthLoading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-foreground border-2 border-foreground py-3.5 text-sm font-black text-background active:scale-[0.98] transition-transform card-shadow disabled:opacity-60 disabled:pointer-events-none"
        >
          {oauthLoading === "apple" ? (
            <span className="h-5 w-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          {oauthLoading === "apple" ? t("signingIn") : t("continueWithApple")}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-0.5 bg-foreground/15" />
          <span className="text-xs font-black text-muted-foreground">{t("orDivider")}</span>
          <div className="flex-1 h-0.5 bg-foreground/15" />
        </div>

        <button
          onClick={handleGuest}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-card border-2 border-foreground/30 py-3.5 text-sm font-black text-muted-foreground active:scale-[0.98] transition-transform disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? t("pleaseWait") : t("continueAsGuest")}
        </button>

        {error && (
          <p className="text-xs font-bold text-danger bg-danger/10 border-2 border-danger/30 rounded-xl px-4 py-3">{error}</p>
        )}

        <p className="text-center text-[10px] text-muted-foreground/70 font-semibold leading-relaxed">
          {t("guestLimitedFeatures")}
        </p>

        {import.meta.env.DEV && (
          <button
            onClick={handleDevBypass}
            className="w-full py-2 text-xs font-bold text-muted-foreground/40 border border-dashed border-muted-foreground/20 rounded-xl"
          >
            {t("devBypass")}
          </button>
        )}
      </motion.div>
    </div>
  );
}
