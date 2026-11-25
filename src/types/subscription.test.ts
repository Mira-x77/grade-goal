import { describe, expect, it } from 'vitest';
import {
  applyPremiumGrant,
  hasPaidPremiumAccess,
  isSubscriptionActive,
  type LocalSubscription,
} from './subscription';

function freeSub(overrides: Partial<LocalSubscription> = {}): LocalSubscription {
  return {
    deviceId: 'device-1',
    tier: 'free',
    status: 'expired',
    unlockedSubjects: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('premium grant after expiry', () => {
  const now = new Date('2026-10-14T00:00:00.000Z');

  it('does not treat expired status as premium', () => {
    const sub = freeSub({
      tier: 'premium',
      status: 'expired',
      expiresAt: '2026-10-01T00:00:00.000Z',
    });
    expect(hasPaidPremiumAccess(sub, now)).toBe(false);
    expect(isSubscriptionActive(sub, now)).toBe(false);
  });

  it('unlocks premium from a new code even if local status is still expired', () => {
    const afterRedeem = applyPremiumGrant(
      freeSub({
        tier: 'free',
        status: 'expired',
        expiresAt: '2026-10-01T00:00:00.000Z',
        subscriptionCode: 'OLD1-OLD1-OLD1',
      }),
      {
        expiresAt: '2026-11-14T00:00:00.000Z',
        userId: 'user-1',
        deviceId: 'device-1',
        code: 'NEW1-NEW1-NEW1',
        now,
      }
    );

    expect(afterRedeem.tier).toBe('premium');
    expect(afterRedeem.status).toBe('active');
    expect(afterRedeem.subscriptionCode).toBe('NEW1-NEW1-NEW1');
    expect(hasPaidPremiumAccess(afterRedeem, now)).toBe(true);
    expect(isSubscriptionActive(afterRedeem, now)).toBe(true);
  });

  it('keeps the later of two expiry dates so a second code is not required to extend', () => {
    const first = applyPremiumGrant(freeSub(), {
      expiresAt: '2026-12-01T00:00:00.000Z',
      code: 'AAA1-AAA1-AAA1',
      now,
    });
    const second = applyPremiumGrant(first, {
      expiresAt: '2026-11-01T00:00:00.000Z',
      code: 'BBB1-BBB1-BBB1',
      now,
    });
    expect(second.expiresAt).toBe('2026-12-01T00:00:00.000Z');
    expect(hasPaidPremiumAccess(second, now)).toBe(true);
  });
});
