import { ScheduleState, WeeklySchedule, ReminderSettings } from "@/types/schedule";

const SCHEDULE_KEY = "scoretarget_schedule";

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
};

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  eveningEnabled: true,
  morningEnabled: true,
  eveningTime: "19:00",
  morningTime: "05:00",
};

export function saveScheduleState(state: ScheduleState) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(state));
}

export function loadScheduleState(): ScheduleState {
  const raw = localStorage.getItem(SCHEDULE_KEY);
  if (!raw) {
    return {
      schedule: DEFAULT_SCHEDULE,
      reminderSettings: DEFAULT_REMINDER_SETTINGS,
      setupCompleted: false,
      setupSkipped: false,
    };
  }
  try {
    return JSON.parse(raw) as ScheduleState;
  } catch {
    return {
      schedule: DEFAULT_SCHEDULE,
      reminderSettings: DEFAULT_REMINDER_SETTINGS,
      setupCompleted: false,
      setupSkipped: false,
    };
  }
}

export function updateSchedule(schedule: WeeklySchedule) {
  const state = loadScheduleState();
  state.schedule = schedule;
  state.setupCompleted = true;
  saveScheduleState(state);
}

export function updateReminderSettings(settings: ReminderSettings) {
  const state = loadScheduleState();
  state.reminderSettings = settings;
  saveScheduleState(state);
}

export function markSetupSkipped() {
  const state = loadScheduleState();
  state.setupSkipped = true;
  saveScheduleState(state);
}

export function markSetupCompleted() {
  const state = loadScheduleState();
  state.setupCompleted = true;
  saveScheduleState(state);
}
