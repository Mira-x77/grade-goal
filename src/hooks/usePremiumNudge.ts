/**
 * usePremiumNudge — contextual premium nudge engine
 *
 * Rules:
 *  - Never shows if user is already premium
 *  - Each trigger has its own cooldown (stored in localStorage)
 *  - Max 1 nudge per calendar day across all triggers
 *  - Each trigger fires at most once per app session
 *
 * Triggers:
 *  1. "at_risk"       — avg below target but recovery still possible
 *  2. "bad_score"     — a low mark was just entered
 *  3. "strategy_saved"— user just saved a simulator strategy
 *  4. "library_open"  — first time opening library this session
 *  5. "paper_downloaded" — user just downloaded their first paper
 */

import { useCallback, useRef } from "react";
import { subscriptionService } from "@/services/subscriptionService";
import { PREMIUM_ENABLED } from "@/config/premium";

export type NudgeTrigger =
  | "at_risk"
  | "bad_score"
  | "strategy_saved"
  | "library_open"
  | "paper_downloaded";

interface NudgeConfig {
  cooldownDays: number;   // min days between same trigger firing
  sessionOnce: boolean;   // only fire once per app session
}

const CONFIGS: Record<NudgeTrigger, NudgeConfig> = {
  at_risk:           { cooldownDays: 3,  sessionOnce: true  },
  bad_score:         { cooldownDays: 2,  sessionOnce: true  },
  strategy_saved:    { cooldownDays: 5,  sessionOnce: true  },
  library_open:      { cooldownDays: 4,  sessionOnce: true  },
  paper_downloaded:  { cooldownDays: 7,  sessionOnce: true  },
};

const STORAGE_PREFIX = "gostudy_nudge_last_";
const DAILY_KEY      = "gostudy_nudge_day";

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now  = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function canShowToday(): boolean {
  const last = localStorage.getItem(DAILY_KEY);
  return last !== todayStr();
}

function markShownToday() {
  localStorage.setItem(DAILY_KEY, todayStr());
}

function canShowTrigger(trigger: NudgeTrigger): boolean {
  const key  = STORAGE_PREFIX + trigger;
  const last = localStorage.getItem(key);
  if (!last) return true;
  return daysSince(last) >= CONFIGS[trigger].cooldownDays;
}

function markTriggerShown(trigger: NudgeTrigger) {
  localStorage.setItem(STORAGE_PREFIX + trigger, new Date().toISOString());
}

// Track which triggers have already fired this session
const sessionFired = new Set<NudgeTrigger>();

export function usePremiumNudge(onShow: (trigger: NudgeTrigger) => void) {
  const checking = useRef(false);

  const fire = useCallback(async (trigger: NudgeTrigger) => {
    // Premium disabled for this release — suppress all nudges
    if (!PREMIUM_ENABLED) return;

    // Prevent concurrent checks
    if (checking.current) return;
    checking.current = true;

    try {
      // Already fired this session?
      if (CONFIGS[trigger].sessionOnce && sessionFired.has(trigger)) return;

      // Daily cap
      if (!canShowToday()) return;

      // Per-trigger cooldown
      if (!canShowTrigger(trigger)) return;

      // Check premium status
      const status = await subscriptionService.getStatus();
      if (status.hasPremiumAccess) return;

      // All checks passed — show the nudge
      sessionFired.add(trigger);
      markTriggerShown(trigger);
      markShownToday();
      onShow(trigger);
    } catch {
      // Silently fail — never break the app for a nudge
    } finally {
      checking.current = false;
    }
  }, [onShow]);

  return { fire };
}

/** Human-readable context message per trigger, shown in the PremiumIntroSheet subtitle */
export function nudgeSubtext(trigger: NudgeTrigger, language: "en" | "fr"): string {
  const map: Record<NudgeTrigger, { en: string; fr: string }> = {
    at_risk: {
      en: "You can still hit your target — get the prep tools to close the gap.",
      fr: "Tu peux encore atteindre ton objectif — utilise les outils pour combler l'écart.",
    },
    bad_score: {
      en: "That mark hurt your average. Get the top questions likely to appear next time.",
      fr: "Cette note a impacté ta moyenne. Découvre les questions les plus probables.",
    },
    strategy_saved: {
      en: "You've got a plan. Now get the prep tools to execute it.",
      fr: "Tu as un plan. Maintenant, utilise les outils pour le réaliser.",
    },
    library_open: {
      en: "Past papers are just the start — unlock model answers and step-by-step solutions.",
      fr: "Les anciens sujets ne sont qu'un début — débloque les corrigés détaillés.",
    },
    paper_downloaded: {
      en: "Great download! Want the model answers and solutions for this paper?",
      fr: "Bon téléchargement ! Tu veux les corrigés et solutions pour ce sujet ?",
    },
  };
  return map[trigger][language] ?? map[trigger].en;
}
