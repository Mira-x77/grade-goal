import { DayOfWeek, WeeklySchedule, ReminderSettings } from "@/types/schedule";
import { LocalNotifications } from "@capacitor/local-notifications";
import { t } from "@/lib/i18n";
import { loadScheduleState } from "@/lib/schedule-storage";

const DAY_MAP: Record<number, DayOfWeek> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
};

const DAY_LABEL_KEYS: Record<DayOfWeek, keyof typeof import("@/lib/i18n").translations.en> = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
};

function dayLabel(day: DayOfWeek): string {
  return t(DAY_LABEL_KEYS[day]);
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, "g"), value),
    template
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return false;
  }
}

export async function scheduleAllReminders(
  schedule: WeeklySchedule,
  settings: ReminderSettings
) {
  try {
    // Cancel all existing notifications first
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch (cancelError) {
      console.error("Error cancelling notifications:", cancelError);
    }

    const notifications: Array<{
      id: number;
      title: string;
      body: string;
      schedule: { at: Date };
    }> = [];
    let notificationId = 1000;

    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      for (let dayNum = 1; dayNum <= 5; dayNum++) {
        const day = DAY_MAP[dayNum];
        const subjects = schedule[day];

        if (!subjects || subjects.length === 0) continue;

        const subjectList = subjects.join(", ");
        const dayName = dayLabel(day);

        if (settings.eveningEnabled) {
          try {
            const eveningDayNum = dayNum === 1 ? 0 : dayNum - 1;
            const eveningDate = getNextOccurrence(eveningDayNum, settings.eveningTime);
            eveningDate.setDate(eveningDate.getDate() + weekOffset * 7);

            notifications.push({
              id: notificationId++,
              title: t("notifEveningTitle"),
              body: fillTemplate(t("notifEveningBody"), { day: dayName, subjects: subjectList }),
              schedule: { at: eveningDate },
            });
          } catch (err) {
            console.error(`Error creating evening notification for ${day}:`, err);
          }
        }

        if (settings.morningEnabled) {
          try {
            const morningDate = getNextOccurrence(dayNum, settings.morningTime);
            morningDate.setDate(morningDate.getDate() + weekOffset * 7);

            notifications.push({
              id: notificationId++,
              title: t("notifMorningTitle"),
              body: fillTemplate(t("notifMorningBody"), { day: dayName, subjects: subjectList }),
              schedule: { at: morningDate },
            });
          } catch (err) {
            console.error(`Error creating morning notification for ${day}:`, err);
          }
        }
      }
    }

    if (notifications.length === 0) return true;

    await LocalNotifications.schedule({ notifications });
    return true;
  } catch (error) {
    console.error("FATAL ERROR in scheduleAllReminders:", error);
    return false;
  }
}

/** Re-schedule reminders on app open so the rolling 4-week window stays fresh. */
export async function refreshRemindersIfNeeded(): Promise<void> {
  const state = loadScheduleState();
  if (!state.setupCompleted) return;

  const hasSubjects = Object.values(state.schedule).some((s) => s.length > 0);
  if (!hasSubjects) return;
  if (!state.reminderSettings.morningEnabled && !state.reminderSettings.eveningEnabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await scheduleAllReminders(state.schedule, state.reminderSettings);
}

function getNextOccurrence(dayOfWeek: number, time: string): Date {
  if (!time || !time.includes(":")) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const timeParts = time.split(":");
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: hours=${hours}, minutes=${minutes}`);
  }

  const now = new Date();
  const currentDay = now.getDay();

  let daysUntil = dayOfWeek - currentDay;

  if (daysUntil < 0) {
    daysUntil += 7;
  } else if (daysUntil === 0) {
    const targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);

    if (targetTime <= now) {
      daysUntil = 7;
    }
  }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntil);
  targetDate.setHours(hours, minutes, 0, 0);

  return targetDate;
}

export async function cancelAllReminders() {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch (error) {
    console.error("Failed to cancel notifications:", error);
  }
}

export async function getScheduledNotificationsCount(): Promise<number> {
  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications.length;
  } catch (error) {
    console.error("Failed to get pending notifications:", error);
    return 0;
  }
}
