/**
 * Replaces premium-gated UI when PREMIUM_ENABLED = false.
 * Drop-in for LockedPreview, upgrade banners, and premium tabs.
 */
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ComingSoonProps {
  title?: string;
  className?: string;
  /** If true, renders as a compact inline badge instead of a card */
  inline?: boolean;
}

export function ComingSoon({ title, className = "", inline = false }: ComingSoonProps) {
  const { language } = useLanguage();
  const label = language === "fr" ? "Bientôt disponible" : "Coming Soon";
  const sub   = language === "fr" ? "Cette fonctionnalité arrive prochainement." : "This feature is coming in a future update.";

  if (inline) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-black ${className}`}>
        <Sparkles className="h-3 w-3" />
        {label}
      </span>
    );
  }

  return (
    <div className={`rounded-2xl bg-card border-2 border-border flex flex-col items-center justify-center gap-3 py-10 px-6 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Sparkles className="h-6 w-6 text-muted-foreground" />
      </div>
      {title && <p className="font-black text-foreground text-sm">{title}</p>}
      <p className="font-black text-primary text-sm">{label}</p>
      <p className="text-xs font-semibold text-muted-foreground">{sub}</p>
    </div>
  );
}
