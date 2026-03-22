import { Lock } from "lucide-react";
import { motion } from "framer-motion";

interface LockedPreviewProps {
  title: string;
  items: string[];
  onUnlockClick: () => void;
  unlockText: string;
  className?: string;
}

export function LockedPreview({
  title,
  items,
  onUnlockClick,
  unlockText,
  className = "",
}: LockedPreviewProps) {
  return (
    <div className={`relative bg-card rounded-2xl border border-border overflow-hidden ${className}`}>
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-black text-foreground text-lg">{title}</h3>
      </div>
      
      <div className="p-4 space-y-4">
        {items.map((item, index) => {
          const isBlurred = index > 0;
          return (
            <div 
              key={index}
              className={`p-4 rounded-xl border ${
                isBlurred 
                  ? "filter blur-sm select-none opacity-50 bg-muted/20 border-border/50" 
                  : "bg-background border-border shadow-sm"
              }`}
            >
              <div className="flex gap-3">
                <span className={`font-black ${isBlurred ? "text-muted-foreground" : "text-primary"}`}>
                  {index + 1}.
                </span>
                <p className={`text-sm ${isBlurred ? "text-muted-foreground font-medium" : "text-foreground font-semibold"}`}>
                  {item}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unlock Overlay */}
      {items.length > 1 && (
        <div className="absolute inset-0 top-20 flex flex-col items-center justify-center bg-gradient-to-t from-background via-background/90 to-transparent z-10">
          <div className="mt-10 p-6 flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mb-4 card-shadow">
              <Lock className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <p className="text-sm font-black text-foreground mb-4">
              {unlockText || `Unlock all ${items.length} high-probability questions`}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onUnlockClick}
              className="bg-primary text-primary-foreground font-black px-6 py-3 rounded-xl shadow-lg shadow-primary/20"
            >
              Unlock Now
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
