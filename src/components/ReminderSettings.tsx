import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { ReminderSettings as ReminderSettingsType } from "@/types/schedule";
import { loadScheduleState, updateReminderSettings } from "@/lib/schedule-storage";
import { scheduleAllReminders, requestNotificationPermission, getScheduledNotificationsCount } from "@/lib/notification-scheduler";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { t } from "@/lib/i18n";

export function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettingsType>({
    eveningEnabled: true,
    morningEnabled: true,
    eveningTime: "19:00",
    morningTime: "05:00",
  });

  useEffect(() => {
    const state = loadScheduleState();
    setSettings(state.reminderSettings);
  }, []);

  const handleSave = async () => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (settings.eveningEnabled && !timeRegex.test(settings.eveningTime)) {
      toast.error("Invalid evening time format. Use HH:MM (e.g., 19:00)");
      return;
    }
    if (settings.morningEnabled && !timeRegex.test(settings.morningTime)) {
      toast.error("Invalid morning time format. Use HH:MM (e.g., 05:00)");
      return;
    }

    updateReminderSettings(settings);
    
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      toast.error("Please enable notifications in your device settings");
      return;
    }

    const state = loadScheduleState();
    
    const hasSubjects = Object.values(state.schedule).some(subjects => subjects.length > 0);
    if (!hasSubjects) {
      toast.error("Please add subjects to your schedule first");
      return;
    }

    const toastId = toast.loading("Scheduling reminders...");
    
    try {
      const success = await scheduleAllReminders(state.schedule, settings);
      
      if (success) {
        const count = await getScheduledNotificationsCount();
        toast.success(`Reminder settings saved! ${count} notifications scheduled for the next 4 weeks.`, { id: toastId });
      } else {
        toast.error("Failed to schedule reminders. Check console for details.", { id: toastId });
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast.error("An error occurred while scheduling reminders", { id: toastId });
    }
  };

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl bg-card p-5 border-2 border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="font-black text-foreground">{t("reminderSettings")}</h3>
      </div>
      <p className="text-xs text-muted-foreground font-semibold mb-4">
        {t("customizeReminders")}
      </p>

      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{t("eveningReminder")}</p>
              <p className="text-xs text-muted-foreground font-semibold">{t("remindNightBefore")}</p>
            </div>
            <button
              onClick={() => setSettings((prev) => ({ ...prev, eveningEnabled: !prev.eveningEnabled }))}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                settings.eveningEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-transform ${
                settings.eveningEnabled ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {settings.eveningEnabled && (
            <div className="ml-4">
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{t("time")}</label>
              <input
                type="time"
                value={settings.eveningTime}
                onChange={(e) => setSettings((prev) => ({ ...prev, eveningTime: e.target.value }))}
                className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{t("morningReminder")}</p>
              <p className="text-xs text-muted-foreground font-semibold">{t("remindSchoolDay")}</p>
            </div>
            <button
              onClick={() => setSettings((prev) => ({ ...prev, morningEnabled: !prev.morningEnabled }))}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                settings.morningEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-transform ${
                settings.morningEnabled ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {settings.morningEnabled && (
            <div className="ml-4">
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{t("time")}</label>
              <input
                type="time"
                value={settings.morningTime}
                onChange={(e) => setSettings((prev) => ({ ...prev, morningTime: e.target.value }))}
                className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          className="w-full rounded-2xl bg-primary py-3 text-base font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all"
        >
          {t("saveSettings")}
        </button>
      </div>
    </motion.div>
  );
}

