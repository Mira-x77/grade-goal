import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { DayOfWeek } from "@/types/schedule";
import { loadScheduleState } from "@/lib/schedule-storage";
import { motion } from "framer-motion";
import { t } from "@/lib/i18n";

const DAY_MAP: Record<number, DayOfWeek> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
};

const DAY_NAMES: Record<DayOfWeek, () => string> = {
  monday: () => t("monday"),
  tuesday: () => t("tuesday"),
  wednesday: () => t("wednesday"),
  thursday: () => t("thursday"),
  friday: () => t("friday"),
};

export function TodaySubjects() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [packed, setPacked] = useState<Record<string, boolean>>({});
  const [dayName, setDayName] = useState<string>("");

  useEffect(() => {
    const today = new Date().getDay();
    const scheduleState = loadScheduleState();
    
    if (today >= 1 && today <= 5) {
      const day = DAY_MAP[today];
      setDayName(DAY_NAMES[day]());
      setSubjects(scheduleState.schedule[day]);
    } else {
      setDayName("Weekend");
      setSubjects([]);
    }
  }, []);

  const togglePacked = (subject: string) => {
    setPacked((prev) => ({ ...prev, [subject]: !prev[subject] }));
  };

  const allPacked = subjects.length > 0 && subjects.every((s) => packed[s]);

  if (subjects.length === 0) {
    return (
      <div className="min-h-screen bg-background w-full flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl bg-card p-8 border-2 border-border text-center"
        >
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-bold text-foreground">
            {dayName === "Weekend" 
              ? t("enjoyWeekend")
              : t("noSubjectsToday")}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full pb-20">
      <div className="px-6 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2"><BookOpen className="h-6 w-6" /> {t("todaysBooks")}</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">{dayName}</p>
        </motion.div>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-8">
        {allPacked && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-success/15 p-4 flex items-center gap-3"
          >
            <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
            <span className="text-sm font-bold text-success">{t("allBooksPacked")}</span>
          </motion.div>
        )}

        <div className="flex flex-col gap-3">
          {subjects.map((subject, index) => (
            <motion.div
              key={index}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                packed[subject]
                  ? "bg-success/10 border-2 border-success/30"
                  : "bg-card border-2 border-border"
              }`}
            >
              <Checkbox
                id={`subject-${index}`}
                checked={packed[subject] || false}
                onCheckedChange={() => togglePacked(subject)}
                className="h-6 w-6"
              />
              <label
                htmlFor={`subject-${index}`}
                className={`text-base font-bold flex-1 cursor-pointer ${
                  packed[subject] ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {subject}
              </label>
            </motion.div>
          ))}
        </div>

        <button
          onClick={() => window.history.back()}
          className="w-full rounded-2xl bg-muted py-3.5 text-base font-bold text-foreground active:scale-95 transition-transform mt-4"
        >
          {t("backToHome")}
        </button>
      </div>
    </div>
  );
}
