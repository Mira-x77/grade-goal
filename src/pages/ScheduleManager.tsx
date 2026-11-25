import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ScheduleSetup } from "@/components/ScheduleSetup";
import { ReminderSettings } from "@/components/ReminderSettings";
import { TodaySubjects } from "@/components/TodaySubjects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadScheduleState, saveScheduleState } from "@/lib/schedule-storage";
import { cancelAllReminders } from "@/lib/notification-scheduler";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ScheduleManager() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [scheduleState, setScheduleState] = useState(loadScheduleState());
  const [activeTab, setActiveTab] = useState("today");
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(72);

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleResetSchedule = async () => {
    await cancelAllReminders();
    saveScheduleState({
      schedule: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
      },
      reminderSettings: scheduleState.reminderSettings,
      setupCompleted: false,
      setupSkipped: false,
    });
    toast.success(t("scheduleResetSuccess"));
    setScheduleState(loadScheduleState());
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-10 bg-background/90 backdrop-blur-lg border-b border-border safe-area-top"
      >
        <div className="header-inner flex items-center gap-3 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border-2 border-foreground active:scale-95 transition-transform shrink-0"
            aria-label={t("goBack")}
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-foreground leading-tight truncate">{t("scheduleTitle")}</h1>
            <p className="text-[11px] font-semibold text-muted-foreground leading-snug mt-0.5">
              {t("schoolScheduleCardDesc")}
            </p>
          </div>
        </div>
      </div>

      <div
        className="content-col flex-1 flex flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{ paddingTop: headerHeight + 12 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1 rounded-2xl border-2 border-border bg-muted/40 shrink-0">
            <TabsTrigger
              value="today"
              className="rounded-xl py-2.5 px-1 text-[11px] sm:text-xs font-black leading-tight whitespace-normal data-[state=active]:bg-card data-[state=active]:border-2 data-[state=active]:border-foreground data-[state=active]:shadow-none"
            >
              {t("todayTab")}
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="rounded-xl py-2.5 px-1 text-[11px] sm:text-xs font-black leading-tight whitespace-normal data-[state=active]:bg-card data-[state=active]:border-2 data-[state=active]:border-foreground data-[state=active]:shadow-none"
            >
              {t("weeklyScheduleTab")}
            </TabsTrigger>
            <TabsTrigger
              value="reminders"
              className="rounded-xl py-2.5 px-1 text-[11px] sm:text-xs font-black leading-tight whitespace-normal data-[state=active]:bg-card data-[state=active]:border-2 data-[state=active]:border-foreground data-[state=active]:shadow-none"
            >
              {t("reminderTimesTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4 flex-1 flex flex-col focus-visible:outline-none">
            <TodaySubjects embedded onSetupSchedule={() => setActiveTab("schedule")} />
          </TabsContent>

          <TabsContent value="schedule" className="mt-4 space-y-4 focus-visible:outline-none">
            <ScheduleSetup
              embedded
              initialSchedule={scheduleState.schedule}
              onComplete={() => {
                toast.success(t("scheduleUpdated"));
                setScheduleState(loadScheduleState());
              }}
              onSkip={() => navigate(-1)}
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="w-full rounded-2xl bg-danger/10 border-2 border-danger/30 py-3 text-sm font-black text-danger active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("resetEntireSchedule")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("resetScheduleConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("resetScheduleConfirmDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetSchedule}>{t("resetSchedule")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="reminders" className="mt-4 focus-visible:outline-none">
            <ReminderSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
