import { describe, it, expect } from "vitest";
import { getEngine, GRADING_ENGINES } from "./grading-engine-registry";

describe("getEngine", () => {
  it('returns the Nigerian engine for "nigerian_university"', () => {
    const engine = getEngine("nigerian_university");
    expect(engine.config.id).toBe("nigerian_university");
  });

  it('returns the APC engine for "apc"', () => {
    const engine = getEngine("apc");
    expect(engine.config.id).toBe("apc");
  });

  it('returns the French engine for "french"', () => {
    const engine = getEngine("french");
    expect(engine.config.id).toBe("french");
  });

  it('falls back to the APC engine for an unknown system ID', () => {
    const engine = getEngine("unknown_system");
    expect(engine.config.id).toBe("apc");
  });
});
