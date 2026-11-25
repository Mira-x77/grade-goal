import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, CheckCircle2, CalendarDays } from "lucide-react";
import { DayOfWeek } from "@/types/schedule";
import { loadScheduleState } from "@/lib/schedule-storage";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const WEEKDAYS: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

interface TodaySubjectsProps {
  embedded?: boolean;
  onSetupSchedule?: () => void;
}

export function TodaySubjects({ embedded, onSetupSchedule }: TodaySubjectsProps) {
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [packed, setPacked] = useState<Record<string, boolean>>({});
  const [dayName, setDayName] = useState("");
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    const today = new Date().getDay();
    const scheduleState = loadScheduleState();

    if (today >= 1 && today <= 5) {
      const day = WEEKDAYS[today - 1];
      setDayName(t(day as keyof typeof import("@/lib/i18n").translations.en));
      setSubjects(scheduleState.schedule[day]);
      setIsWeekend(false);
    } else {
      setDayName(t("weekend"));
      setSubjects([]);
      setIsWeekend(true);
    }
  }, [t]);

  const togglePacked = (subject: string) => {
    setPacked((prev) => ({ ...prev, [subject]: !prev[subject] }));
  };

  const allPacked = subjects.length > 0 && subjects.every((s) => packed[s]);

  if (subjects.length === 0) {
    const EmptyIcon = isWeekend ? CalendarDays : BookOpen;

    return (
      <div
        className={
          embedded
            ? "flex flex-1 flex-col items-center justify-center text-center gap-5 w-full min-h-[52dvh] rounded-2xl bg-card border-2 border-border p-8"
            : "min-h-screen bg-background w-full flex items-center justify-center p-6"
        }
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={embedded ? "flex flex-col items-center gap-5 max-w-sm" : "rounded-2xl bg-card p-8 border-2 border-border text-center max-w-sm"}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border-2 border-border">
            <EmptyIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-black text-foreground">
              {isWeekend ? t("enjoyWeekend") : t("noSubjectsToday")}
            </p>
            <p className="text-sm font-semibold text-muted-foreground mt-2 leading-relaxed">
              {isWeekend ? t("weekendScheduleHint") : t("addSubjectsReminder")}
            </p>
          </div>
          {embedded && onSetupSchedule && (
            <button
              type="button"
              onClick={onSetupSchedule}
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-black text-primary-foreground border-2 border-foreground active:scale-[0.98] transition-transform"
            >
              {t("setupWeeklySchedule")}
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  const content = (
    <>
      {!embedded && (
        <div className="px-6 pt-8 pb-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6" /> {t("todaysBooks")}
            </h1>
            <p className="text-sm font-semibold text-muted-foreground mt-1">{dayName}</p>
          </motion.div>
        </div>
      )}

      {embedded && (
        <div className="mb-4">
          <h2 className="text-base font-black text-foreground">{t("todaysBooks")}</h2>
          <p className="text-sm font-semibold text-muted-foreground">{dayName}</p>
        </div>
      )}

      <div className={`flex flex-col gap-4 ${embedded ? "" : "px-6 pb-8"}`}>
        {allPacked && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-success/15 p-4 flex items-center gap-3 border-2 border-success/30"
          >
            <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
            <span className="text-sm font-bold text-success">{t("allBooksPacked")}</span>
          </motion.div>
        )}

        <div className="flex flex-col gap-3">
          {subjects.map((subject, index) => (
            <motion.div
              key={subject}
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

        {!embedded && (
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full rounded-2xl bg-muted py-3.5 text-base font-bold text-foreground active:scale-95 transition-transform mt-4"
          >
            {t("backToHome")}
          </button>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="w-full rounded-2xl bg-card p-4 border-2 border-border">{content}</div>;
  }

  return <div className="min-h-screen bg-background w-full pb-20">{content}</div>;
}
