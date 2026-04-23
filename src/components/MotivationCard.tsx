import { motion } from "framer-motion";
import { Flame, Trophy, Zap } from "lucide-react";
import { getStreak } from "@/lib/storage";
import { Subject } from "@/types/exam";
import { calcYearlyAverage } from "@/lib/exam-logic";
import { useLanguage } from "@/contexts/LanguageContext";

interface MotivationCardProps {
  subjects: Subject[];
  targetAverage: number;
}

const MotivationCard = ({ subjects, targetAverage }: MotivationCardProps) => {
  const { t } = useLanguage();
  const streak = getStreak();
  const currentAvg = calcYearlyAverage(subjects);

  const filledMarks = subjects.reduce((acc, s) => {
    return acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0);
  }, 0);

  const encourageGreatKeys = ["encourageGreat1", "encourageGreat2", "encourageGreat3", "encourageGreat4"] as const;
  const encourageGoodKeys  = ["encourageGood1",  "encourageGood2",  "encourageGood3",  "encourageGood4"]  as const;
  const encourageToughKeys = ["encourageTough1", "encourageTough2", "encourageTough3", "encourageTough4"] as const;

  const pick = <T extends readonly string[]>(arr: T) => arr[Math.floor(Math.random() * arr.length)];

  let messageKey: string;
  if (currentAvg !== null && currentAvg >= targetAverage) {
    messageKey = pick(encourageGreatKeys);
  } else if (currentAvg !== null && currentAvg >= targetAverage - 2) {
    messageKey = pick(encourageGoodKeys);
  } else {
    messageKey = pick(encourageToughKeys);
  }

  const plural = filledMarks !== 1 ? "s" : "";
  const statsText = t("marksTracked")
    .replace("{count}", String(filledMarks))
    .replace(/\{plural\}/g, plural)
    + " · " + t("bestStreakDays").replace("{days}", String(streak.bestStreak));

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl bg-card p-4 border-2 border-border"
    >
      <div className="flex items-center gap-4">
        {/* Streak */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
            <Flame className="h-6 w-6 text-accent" />
          </div>
          <span className="text-xs font-black text-foreground">
            {streak.currentStreak} {t("streakDays")}
          </span>
        </div>

        {/* Message */}
        <div className="flex-1">
          <p className="font-black text-foreground">{t(messageKey as any)}</p>
          <p className="text-xs font-semibold text-muted-foreground">{statsText}</p>
        </div>

        {/* Trophy */}
        {streak.currentStreak >= 3 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Trophy className="h-6 w-6 text-accent" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MotivationCard;

