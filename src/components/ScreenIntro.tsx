import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Mascot from "@/components/Mascot";

interface ScreenIntroProps {
  screenKey: string;
  title: string;
  description: string;
  mascotPose?: "idle" | "pointing" | "celebrating" | "thinking" | "reading";
}

const STORAGE_PREFIX = "scoretarget_intro_seen_";

export default function ScreenIntro({ screenKey, title, description, mascotPose = "pointing" }: ScreenIntroProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_PREFIX + screenKey)) setVisible(true);
  }, [screenKey]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_PREFIX + screenKey, "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 z-[9990] bg-black/50"
          />
          <div className="fixed bottom-0 left-0 right-0 z-[9991] flex justify-center md:bottom-8">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-md bg-card rounded-t-3xl md:rounded-3xl pb-[max(2rem,env(safe-area-inset-bottom))] md:pb-8 pt-4"
              onClick={dismiss}
            >
              <div className="w-10 h-1.5 rounded-full bg-foreground/20 mx-auto mb-5 md:hidden" />
              <div className="flex items-start gap-4 px-5 pb-2 pt-2">
                <div className="shrink-0">
                  <Mascot pose={mascotPose} size={72} animate />
                </div>
                <div className="flex-1 pt-1">
                  <h2 className="text-lg font-black text-foreground leading-tight mb-1">{title}</h2>
                  <p className="text-sm font-semibold text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
