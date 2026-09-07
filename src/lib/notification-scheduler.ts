import { DayOfWeek, WeeklySchedule, ReminderSettings } from "@/types/schedule";
import { LocalNotifications } from "@capacitor/local-notifications";

const DAY_MAP: Record<number, DayOfWeek> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
};

const DAY_NAMES: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

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
    console.log("Starting scheduleAllReminders");
    console.log("Settings:", settings);
    console.log("Schedule:", schedule);

    // Cancel all existing notifications first
    try {
      const pending = await LocalNotifications.getPending();
      console.log("Existing pending notifications:", pending.notifications.length);
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ 
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
        console.log("Cancelled existing notifications");
      }
    } catch (cancelError) {
      console.error("Error cancelling notifications:", cancelError);
    }

    const notifications: any[] = [];
    let notificationId = 1000; // Start with a higher ID to avoid conflicts

    // Schedule for the next 4 weeks
    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      // Schedule for each weekday
      for (let dayNum = 1; dayNum <= 5; dayNum++) {
        const day = DAY_MAP[dayNum];
        const subjects = schedule[day];

        if (!subjects || subjects.length === 0) continue;

        const subjectList = subjects.join(", ");

        // Evening reminder (day before)
        if (settings.eveningEnabled) {
          try {
            const eveningDayNum = dayNum === 1 ? 0 : dayNum - 1; // 0 = Sunday for Monday
            const eveningDate = getNextOccurrence(eveningDayNum, settings.eveningTime);
            eveningDate.setDate(eveningDate.getDate() + (weekOffset * 7));
            
            console.log(`Evening reminder for ${day}: ${eveningDate.toISOString()}`);
            
            notifications.push({
              id: notificationId++,
              title: "📚 Pack Your Books",
              body: `Tomorrow is ${DAY_NAMES[day]}. Pack your books for: ${subjectList}`,
              schedule: { at: eveningDate },
            });
          } catch (err) {
            console.error(`Error creating evening notification for ${day}:`, err);
          }
        }

        // Morning reminder (same day)
        if (settings.morningEnabled) {
          try {
            const morningDate = getNextOccurrence(dayNum, settings.morningTime);
            morningDate.setDate(morningDate.getDate() + (weekOffset * 7));
            
            console.log(`Morning reminder for ${day}: ${morningDate.toISOString()}`);
            
            notifications.push({
              id: notificationId++,
              title: "📖 Today's Books",
              body: `Today is ${DAY_NAMES[day]}. You need: ${subjectList}`,
              schedule: { at: morningDate },
            });
          } catch (err) {
            console.error(`Error creating morning notification for ${day}:`, err);
          }
        }
      }
    }

    console.log(`Total notifications to schedule: ${notifications.length}`);

    if (notifications.length === 0) {
      console.log("No notifications to schedule");
      return true;
    }

    // Log first few notifications for debugging
    console.log("Sample notifications:", notifications.slice(0, 3));

    // Schedule all notifications
    await LocalNotifications.schedule({ notifications });
    console.log("Successfully scheduled all notifications");

    // Verify they were scheduled
    const pending = await LocalNotifications.getPending();
    console.log(`Verified: ${pending.notifications.length} notifications are now pending`);

    return true;
  } catch (error) {
    console.error("FATAL ERROR in scheduleAllReminders:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
}

function getNextOccurrence(dayOfWeek: number, time: string): Date {
  console.log(`getNextOccurrence called with dayOfWeek=${dayOfWeek}, time=${time}`);
  
  // Validate time format
  if (!time || !time.includes(":")) {
    console.error("Invalid time format:", time);
    throw new Error(`Invalid time format: ${time}`);
  }

  const timeParts = time.split(":");
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  
  // Validate parsed values
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.error("Invalid time values:", { hours, minutes, time });
    throw new Error(`Invalid time values: hours=${hours}, minutes=${minutes}`);
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  console.log(`Current day: ${currentDay}, Target day: ${dayOfWeek}`);
  
  // dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  let daysUntil = dayOfWeek - currentDay;
  
  if (daysUntil < 0) {
    // Target day is in the past this week, schedule for next week
    daysUntil += 7;
  } else if (daysUntil === 0) {
    // Target day is today, check if time has passed
    const targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);
    
    if (targetTime <= now) {
      // Time has passed today, schedule for next week
      daysUntil = 7;
    }
  }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntil);
  targetDate.setHours(hours, minutes, 0, 0);

  console.log(`Calculated target date: ${targetDate.toISOString()}`);
  
  return targetDate;
}

async function getAllScheduledIds() {
  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications.map(n => ({ id: n.id }));
  } catch {
    return [];
  }
}

export async function cancelAllReminders() {
  try {
    const ids = await getAllScheduledIds();
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids });
    }
  } catch (error) {
    console.error("Failed to cancel notifications:", error);
  }
}

export async function getScheduledNotificationsCount(): Promise<number> {
  try {
    const pending = await LocalNotifications.getPending();
    console.log("Pending notifications:", pending.notifications.length);
    pending.notifications.forEach(n => {
      console.log(`ID: ${n.id}, Title: ${n.title}, Schedule: ${JSON.stringify(n.schedule)}`);
    });
    return pending.notifications.length;
  } catch (error) {
    console.error("Failed to get pending notifications:", error);
    return 0;
  }
}
