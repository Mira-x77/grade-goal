import { useState, useMemo } from "react";
import { X, Plus, BookOpen } from "lucide-react";
import { DayOfWeek, WeeklySchedule } from "@/types/schedule";
import { updateSchedule, markSetupCompleted, loadScheduleState } from "@/lib/schedule-storage";
import { scheduleAllReminders, requestNotificationPermission } from "@/lib/notification-scheduler";
import { getAppSubjectNames } from "@/lib/app-subjects";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const DAYS: { key: DayOfWeek; labelKey: keyof typeof import("@/lib/i18n").translations.en }[] = [
  { key: "monday", labelKey: "monday" },
  { key: "tuesday", labelKey: "tuesday" },
  { key: "wednesday", labelKey: "wednesday" },
  { key: "thursday", labelKey: "thursday" },
  { key: "friday", labelKey: "friday" },
];

interface ScheduleSetupProps {
  onComplete: () => void;
  onSkip: () => void;
  initialSchedule?: WeeklySchedule;
  embedded?: boolean;
}

export function ScheduleSetup({ onComplete, onSkip, initialSchedule, embedded }: ScheduleSetupProps) {
  const { t } = useLanguage();
  const appSubjects = useMemo(() => getAppSubjectNames(), []);
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    initialSchedule || {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
    }
  );
  const [currentInputs, setCurrentInputs] = useState<Record<DayOfWeek, string>>({
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
  });

  const addSubjectToDay = (day: DayOfWeek, subject: string) => {
    const trimmed = subject.trim();
    if (!trimmed) return;
    if (schedule[day].some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;

    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], trimmed],
    }));
  };

  const addSubject = (day: DayOfWeek) => {
    addSubjectToDay(day, currentInputs[day]);
    setCurrentInputs((prev) => ({ ...prev, [day]: "" }));
  };

  const removeSubject = (day: DayOfWeek, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    updateSchedule(schedule);
    markSetupCompleted();

    const hasSubjects = Object.values(schedule).some((subjects) => subjects.length > 0);

    if (hasSubjects) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        const state = loadScheduleState();
        await scheduleAllReminders(state.schedule, state.reminderSettings);
        toast.success(t("scheduleSavedWithReminders"));
      } else {
        toast.success(t("scheduleSavedEnableNotifications"));
      }
    } else {
      toast.success(t("scheduleSaved"));
    }

    onComplete();
  };

  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-background w-full pb-20"}>
      {!embedded && (
        <div className="px-6 pt-8 pb-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6" /> {t("weeklySchedule")}
            </h1>
            <p className="text-sm font-semibold text-muted-foreground mt-1">{t("addSubjectsReminder")}</p>
          </motion.div>
        </div>
      )}

      <div className={`flex flex-col gap-4 ${embedded ? "" : "px-6 pb-8"}`}>
        {DAYS.map(({ key, labelKey }) => (
          <motion.div
            key={key}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="rounded-2xl bg-card p-4 border-2 border-border"
          >
            <h3 className="font-black text-foreground text-sm mb-3">{t(labelKey)}</h3>

            {appSubjects.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-bold text-muted-foreground mb-2">{t("yourAppSubjects")}</p>
                <p className="text-[10px] font-semibold text-muted-foreground/80 mb-2">{t("tapSubjectToAdd")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {appSubjects.map((subject) => {
                    const onDay = schedule[key].some((s) => s.toLowerCase() === subject.toLowerCase());
                    return (
                      <button
                        key={subject}
                        type="button"
                        disabled={onDay}
                        onClick={() => addSubjectToDay(key, subject)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all active:scale-95 border-2 ${
                          onDay
                            ? "bg-muted text-muted-foreground border-border opacity-50 cursor-default"
                            : "bg-secondary text-foreground border-foreground/30 hover:bg-secondary/80"
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input
                placeholder={t("enterSubjectName")}
                value={currentInputs[key]}
                onChange={(e) => setCurrentInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSubject(key);
                }}
                className="flex-1 rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => addSubject(key)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {schedule[key].length > 0 && (
              <div className="flex flex-wrap gap-2">
                {schedule[key].map((subject, index) => (
                  <div
                    key={`${subject}-${index}`}
                    className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg"
                  >
                    <span className="text-sm font-bold">{subject}</span>
                    <button
                      type="button"
                      onClick={() => removeSubject(key, index)}
                      className="hover:bg-primary/20 rounded-full p-0.5 active:scale-95 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-primary py-3.5 text-base font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
          >
            {t("saveSchedule")}
          </button>
          {!embedded && (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-2xl bg-muted px-6 py-3.5 text-base font-bold text-foreground active:scale-95 transition-transform"
            >
              {t("skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
