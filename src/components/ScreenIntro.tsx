import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import Mascot from "@/components/Mascot";

interface ScreenIntroProps {
  screenKey: string;
  title: string;
  description: string;
  mascotPose?: "idle" | "pointing" | "celebrating" | "thinking" | "reading";
  ctaLabel?: string;
  onCta?: () => void;
}

const STORAGE_PREFIX = "scoretarget_intro_seen_";

export default function ScreenIntro({
  screenKey, title, description,
  mascotPose = "pointing", ctaLabel = "Got it", onCta,
}: ScreenIntroProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_PREFIX + screenKey)) setVisible(true);
  }, [screenKey]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_PREFIX + screenKey, "true");
    setVisible(false);
    onCta?.();
  };

  return (
    <Sheet open={visible} onBackdropClick={dismiss} zIndex={9991}>
      {/* Handle */}
      <div className="w-10 h-1.5 rounded-full bg-foreground/20 mx-auto mt-4 mb-5 md:hidden" />

      {/* Dismiss X */}
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground active:scale-95 transition-transform"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex items-start gap-4 px-5 pb-6 pt-2">
        <div className="shrink-0">
          <Mascot pose={mascotPose} size={72} animate />
        </div>
        <div className="flex-1 pt-1">
          <h2 className="text-lg font-black text-foreground leading-tight mb-1">{title}</h2>
          <p className="text-sm font-semibold text-muted-foreground leading-relaxed mb-4">{description}</p>
          <button
            onClick={dismiss}
            className="w-full rounded-2xl bg-secondary border-2 border-foreground py-3 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
