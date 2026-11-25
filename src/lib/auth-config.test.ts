import { describe, it, expect } from "vitest";
import { isOAuthCallbackUrl, withTimeout } from "./auth-config";

describe("auth-config", () => {
  it("detects OAuth callback URLs", () => {
    expect(isOAuthCallbackUrl("com.gostudy.student://auth/callback?code=abc")).toBe(true);
    expect(isOAuthCallbackUrl("http://localhost:5174/auth/callback?code=abc")).toBe(true);
    expect(isOAuthCallbackUrl("com.gostudy.student://paper/123")).toBe(false);
    expect(isOAuthCallbackUrl("https://example.com/about")).toBe(false);
  });

  it("withTimeout rejects slow promises", async () => {
    await expect(
      withTimeout(new Promise((r) => setTimeout(r, 200)), 50, "test"),
    ).rejects.toThrow("test timed out");
  });

  it("withTimeout resolves fast promises", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, "test")).resolves.toBe(42);
  });
});
