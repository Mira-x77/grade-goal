/**
 * AdapterFactory.ts — Factory for creating system adapters
 * 
 * Safe, case-insensitive, resilient adapter lookup.
 * Guaranteed never to throw or crash the UI.
 */

import { AcademicSystemAdapter } from "./AcademicSystemAdapter";
import { APCAdapter } from "./APCAdapter";
import { FrenchAdapter } from "./FrenchAdapter";
import { NigerianAdapter } from "./NigerianAdapter";
import { GradingSystem } from "@/types/exam";

const apcAdapter = new APCAdapter();
const frenchAdapter = new FrenchAdapter();
const nigerianAdapter = new NigerianAdapter();

/**
 * Get the appropriate adapter for a grading system.
 * Case-insensitive and supports aliases (aefe, french, apc, nigerian).
 * Defaults safely to APCAdapter if system is undefined or unknown.
 */
export function getAdapter(gradingSystem?: string | GradingSystem): AcademicSystemAdapter {
  const normalized = String(gradingSystem || "apc").toLowerCase().trim();

  if (normalized === "aefe" || normalized === "french") {
    return frenchAdapter;
  }
  if (normalized === "nigerian_university" || normalized === "nigerian" || normalized === "ng") {
    return nigerianAdapter;
  }

  return apcAdapter;
}

/**
 * Check if a grading system is supported
 */
export function isSystemSupported(gradingSystem: string): boolean {
  const normalized = String(gradingSystem || "").toLowerCase().trim();
  return ["apc", "french", "aefe", "nigerian_university", "nigerian"].includes(normalized);
}
