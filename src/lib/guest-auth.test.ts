import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSignedInAccount,
  hasPersistedAccount,
  isGuestUser,
  persistSignedInAccount,
} from "./guest-auth";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(), signInAnonymously: vi.fn() } },
}));

vi.mock("@/lib/nativeStorage", () => ({
  mirrorToNative: vi.fn(),
}));

describe("isGuestUser", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("treats missing user as guest", () => {
    expect(isGuestUser(null)).toBe(true);
  });

  it("treats anonymous user as guest", () => {
    expect(isGuestUser({ id: "anon", is_anonymous: true } as never)).toBe(true);
  });

  it("treats signed-in user as not guest", () => {
    persistSignedInAccount({ id: "u1", is_anonymous: false } as never);
    expect(isGuestUser(null)).toBe(false);
    expect(hasPersistedAccount()).toBe(true);
  });

  it("stays signed-in offline even if session user is missing", () => {
    persistSignedInAccount({ id: "u1", is_anonymous: false } as never);
    expect(isGuestUser(undefined)).toBe(false);
  });

  it("clears persisted account on sign out", () => {
    persistSignedInAccount({ id: "u1", is_anonymous: false } as never);
    clearSignedInAccount();
    expect(isGuestUser(null)).toBe(true);
  });
});
