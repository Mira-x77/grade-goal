import type { GradingEngine } from "./grading-engine";
import { apcEngine } from "./grading-apc-adapter";
import { frenchEngine } from "./grading-french-adapter";
import { nigerianEngine } from "./grading-nigerian";

export const GRADING_ENGINES: Record<string, GradingEngine> = {
  apc: apcEngine,
  french: frenchEngine,
  nigerian_university: nigerianEngine,
};

export function getEngine(systemId: string): GradingEngine {
  return GRADING_ENGINES[systemId] ?? GRADING_ENGINES["apc"];
}
