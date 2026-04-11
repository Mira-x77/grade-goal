/**
 * AcademicSystemAdapter.ts — Adapter interface for all academic systems
 * 
 * ENFORCEMENT: Every academic system MUST implement this interface.
 * UI components MUST NOT access raw system data directly.
 */

import { DashboardData } from "@/types/dashboard";
import { AppState } from "@/types/exam";

export interface AcademicSystemAdapter {
  /**
   * Convert raw AppState to system-agnostic DashboardData
   * 
   * RULES:
   * - MUST return valid DashboardData with no undefined fields
   * - MUST handle empty/partial data gracefully
   * - MUST compute all derived values (averages, GPAs, grades)
   */
  toDashboardData(appState: AppState): DashboardData;
  
  /**
   * System identifier
   */
  readonly systemId: "APC" | "FRENCH" | "NIGERIAN";
}
