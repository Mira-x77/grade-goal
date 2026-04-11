/**
 * FrenchAdapter.ts — French system adapter
 * 
 * Converts French academic data to unified dashboard format
 * Extends APC with class comparison features
 */

import { AcademicSystemAdapter } from "./AcademicSystemAdapter";
import { DashboardData } from "@/types/dashboard";
import { AppState } from "@/types/exam";
import { APCAdapter } from "./APCAdapter";

export class FrenchAdapter implements AcademicSystemAdapter {
  readonly systemId = "FRENCH" as const;
  private apcAdapter = new APCAdapter();

  toDashboardData(appState: AppState): DashboardData {
    // French system uses same calculation as APC
    // The only difference is the french field for class comparison
    // which is handled separately in FrenchClassView component
    const dashboardData = this.apcAdapter.toDashboardData(appState);
    
    return {
      ...dashboardData,
      system: "FRENCH",
    };
  }
}
