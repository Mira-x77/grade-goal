import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { DayOfWeek } from "@/types/schedule";
import { loadScheduleState } from "@/lib/schedule-storage";
import { useLanguage } from "@/contexts/LanguageContext";

const WEEKDAYS: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export function TodayScheduleCard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { dayLabel, subjects, isWeekend } = useMemo(() => {
    const today = new Date().getDay();
    const scheduleState = loadScheduleState();

    if (today >= 1 && today <= 5) {
      const day = WEEKDAYS[today - 1];
      return {
        dayLabel: t(day as keyof typeof import("@/lib/i18n").translations.en),
        subjects: scheduleState.schedule[day],
        isWeekend: false,
      };
    }

    return { dayLabel: t("weekend"), subjects: [] as string[], isWeekend: true };
  }, [t]);

  const preview = subjects.slice(0, 3).join(" · ");
  const extra = subjects.length > 3 ? ` +${subjects.length - 3}` : "";

  return (
    <button
      type="button"
      onClick={() => navigate("/schedule")}
      className="w-full flex items-center gap-4 rounded-2xl bg-card border-2 border-foreground p-4 card-shadow active:scale-[0.97] transition-transform text-left"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary border-2 border-foreground shrink-0">
        <BookOpen className="h-6 w-6 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-black text-foreground leading-tight">{t("mySchoolProgram")}</p>
        <p className="text-[12px] font-semibold text-muted-foreground mt-0.5 leading-tight">
          {isWeekend
            ? t("enjoyWeekend")
            : subjects.length > 0
              ? `${dayLabel}: ${preview}${extra}`
              : t("schoolScheduleCardDesc")}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
