export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export interface DaySchedule {
  day: DayOfWeek;
  subjects: string[];
}

export interface WeeklySchedule {
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
}

export interface ReminderSettings {
  eveningEnabled: boolean;
  morningEnabled: boolean;
  eveningTime: string; // HH:MM format
  morningTime: string; // HH:MM format
}

export interface ScheduleState {
  schedule: WeeklySchedule;
  reminderSettings: ReminderSettings;
  setupCompleted: boolean;
  setupSkipped: boolean;
}
