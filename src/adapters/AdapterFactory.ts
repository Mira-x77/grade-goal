/**
 * AdapterFactory.ts — Factory for creating system adapters
 * 
 * ENFORCEMENT: This is the ONLY way to get an adapter.
 * Direct adapter instantiation is prohibited.
 */

import { AcademicSystemAdapter } from "./AcademicSystemAdapter";
import { APCAdapter } from "./APCAdapter";
import { FrenchAdapter } from "./FrenchAdapter";
import { NigerianAdapter } from "./NigerianAdapter";
import { GradingSystem } from "@/types/exam";

const adapters: Record<GradingSystem, AcademicSystemAdapter> = {
  apc: new APCAdapter(),
  french: new FrenchAdapter(),
  nigerian_university: new NigerianAdapter(),
};

/**
 * Get the appropriate adapter for a grading system
 * 
 * @param gradingSystem - The grading system identifier
 * @returns The corresponding adapter
 * @throws Error if system is not supported
 */
export function getAdapter(gradingSystem: GradingSystem): AcademicSystemAdapter {
  const adapter = adapters[gradingSystem];
  
  if (!adapter) {
    throw new Error(`Unsupported grading system: ${gradingSystem}`);
  }
  
  return adapter;
}

/**
 * Check if a grading system is supported
 */
export function isSystemSupported(gradingSystem: string): gradingSystem is GradingSystem {
  return gradingSystem in adapters;
}
