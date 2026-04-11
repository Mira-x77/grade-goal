import { motion } from "framer-motion";
import { Flame, Trophy, Zap } from "lucide-react";
import { getStreak } from "@/lib/storage";
import { Subject } from "@/types/exam";
import { calcYearlyAverage } from "@/lib/exam-logic";

interface MotivationCardProps {
  subjects: Subject[];
  targetAverage: number;
}

const encouragements = {
  great: [
    "You're crushing it!",
    "Keep this energy!",
    "On fire today!",
    "Unstoppable!",
  ],
  good: [
    "Solid progress!",
    "You've got this!",
    "Stay focused!",
    "Almost there!",
  ],
  tough: [
    "Every point counts!",
    "Don't give up!",
    "Push through!",
    "You can turn this around!",
  ],
};

function getRandomMessage(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const MotivationCard = ({ subjects, targetAverage }: MotivationCardProps) => {
  const streak = getStreak();
  const currentAvg = calcYearlyAverage(subjects);
  
  const filledMarks = subjects.reduce((acc, s) => {
    return acc + (s.marks.interro !== null ? 1 : 0) + (s.marks.dev !== null ? 1 : 0) + (s.marks.compo !== null ? 1 : 0);
  }, 0);

  let message: string;
  if (currentAvg !== null && currentAvg >= targetAverage) {
    message = getRandomMessage(encouragements.great);
  } else if (currentAvg !== null && currentAvg >= targetAverage - 2) {
    message = getRandomMessage(encouragements.good);
  } else {
    message = getRandomMessage(encouragements.tough);
  }

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
            {streak.currentStreak} day{streak.currentStreak !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Message */}
        <div className="flex-1">
          <p className="font-black text-foreground">{message}</p>
          <p className="text-xs font-semibold text-muted-foreground">
            {filledMarks} mark{filledMarks !== 1 ? "s" : ""} tracked · Best streak: {streak.bestStreak} days
          </p>
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

