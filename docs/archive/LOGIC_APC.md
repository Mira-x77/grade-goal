# APC Calculation Logic — Full Correction Log

## Files Modified
- `src/lib/exam-logic.ts`
- `src/lib/grading-apc.ts`
- `src/types/exam.ts`
- `src/pages/Home.tsx`
- `src/components/ResultsScreen.tsx`
- `src/components/MarksInput.tsx`
- `src/components/SubjectBreakdown.tsx`
- `src/components/FrenchClassView.tsx`
- `src/pages/Simulator.tsx`

---

## Correction 1 — Wrong subject average formula in `Home.tsx`

**File:** `src/pages/Home.tsx` — `SubjectsGlanceCard` component

**Bug:** Subject average was calculated inline as a simple count-based average:
```ts
// WRONG
const avg = marks.filter(m => m.value !== null).reduce((a, m) => a + m.value!, 0) / filled
```
This gave Physics = 8.33 instead of 8.00.

**Fix:** Replaced with the correct grading function based on system:
```ts
// CORRECT
const avg = gradingSystem === "apc"
  ? calcAPCSubjectAverage(sub.marks, weightedSplit)
  : calcSubjectAverage(sub.marks);
```

---

## Correction 2 — Wrong formula in `calcAPCSubjectAverage`

**File:** `src/lib/grading-apc.ts` — `calcAPCSubjectAverage()`

**Bug:** Default formula was simple average of all present marks:
```ts
// WRONG — (I + D + C) / 3
const available = [interro, dev, compo].filter(m => m !== null);
return available.reduce((a, b) => a + b, 0) / available.length;
```
This gave Physics = 8.33 instead of 8.00, and final average ~12.88 instead of 12.97.

**Fix:** Two-step Cameroonian school formula:
```ts
// CORRECT
// Step 1: Moy_classe = (Interro + Dev) / 2
// Step 2: Moy_sem    = (Moy_classe + Compo) / 2
```
Verified against official report:
- Physics: (10+8)/2 = 9 → (9+7)/2 = **8.00** ✅
- Sports (no Interro): Moy_classe = 15 → (15+18)/2 = **16.50** ✅
- Final: 311.25 / 24 = **12.97** ✅

---

## Correction 3 — Wrong formula in `calcSubjectAverage`

**File:** `src/lib/exam-logic.ts` — `calcSubjectAverage()`

**Bug:** Used weighted formula `(I + D + 2×C) / 4`:
```ts
// WRONG
if (compo !== null) { sum += compo * 2; weight += 2; }
return sum / weight;
```

**Fix:** Same two-step formula as APC:
```ts
// CORRECT
const moyClasse = avg of present classwork (interro, dev);
return (moyClasse + compo) / 2;
```

---

## Correction 4 — Wrong formula in `calcFullSubjectAverage`

**File:** `src/lib/exam-logic.ts` — `calcFullSubjectAverage()`

**Bug:**
```ts
// WRONG
return (interro + dev + 2 * compo) / 4;
```

**Fix:**
```ts
// CORRECT
const moyClasse = (interro + dev) / 2;
return (moyClasse + compo) / 2;
```

---

## Correction 5 — Wrong formula in `calcSubjectBounds`

**File:** `src/lib/exam-logic.ts` — `calcSubjectBounds()`

**Bug:**
```ts
// WRONG
const avg = (marks.interro! + marks.dev! + 2 * marks.compo!) / 4;
const min = (pessimistic.interro + pessimistic.dev + 2 * pessimistic.compo) / 4;
const max = (optimistic.interro + optimistic.dev + 2 * optimistic.compo) / 4;
```

**Fix:**
```ts
// CORRECT
const moyClasse = (marks.interro! + marks.dev!) / 2;
const avg = (moyClasse + marks.compo!) / 2;
// same pattern for min/max
```

---

## Correction 6 — Wrong solver in `calcMinimumMarkNeeded`

**File:** `src/lib/exam-logic.ts` — `calcMinimumMarkNeeded()`

**Bug:** Solver used old weighted formula algebra `(I + D + 2C) / 4`.

**Fix:** Solver updated to match two-step formula:
```ts
// Solving for Compo:
//   x = 2 × neededAvg − Moy_classe

// Solving for Interro or Dev:
//   neededMoyClasse = 2 × neededAvg − compo
//   x = 2 × neededMoyClasse − otherClasswork
```

---

## Correction 7 — Wrong solver in `calcAPCMinimumMark`

**File:** `src/lib/grading-apc.ts` — `calcAPCMinimumMark()`

**Bug:** Default branch used old `/3` algebra.

**Fix:** Same two-step solver as `calcMinimumMarkNeeded`.

---

## Correction 8 — Display precision: subject averages

**Files:** `src/pages/Home.tsx`, `src/components/ResultsScreen.tsx`, `src/components/MarksInput.tsx`, `src/components/SubjectBreakdown.tsx`, `src/components/FrenchClassView.tsx`

**Bug:** All averages used `.toFixed(1)` — too imprecise, hid errors.

**Fix:** Two new display functions added to `src/lib/exam-logic.ts`:

```ts
// Subject averages — TRUNCATE (floor) to 2 decimal places
// Matches school report: 14.125 → "14.12", 17.125 → "17.12"
export function fmtAvg(value: number): string {
  return (Math.floor(value * 100) / 100).toFixed(2);
}

// Final/yearly average — ROUND to 2 decimal places
// 12.9688 → "12.97"
export function fmtFinalAvg(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}
```

Applied:
- `fmtAvg()` → all subject average displays
- `fmtFinalAvg()` → main dashboard hero, ResultsScreen overall, Simulator

---

## Correction 9 — Mark status system added

**File:** `src/types/exam.ts`

Added `MarkStatus` type and `markStatuses` field to `Subject`:
```ts
export type MarkStatus = "done" | "not_done" | "unknown";

interface Subject {
  markStatuses?: {
    interro: MarkStatus;
    dev: MarkStatus;
    compo: MarkStatus;
  };
}
```

**File:** `src/lib/exam-logic.ts` — `calcSubjectAverage()`

Marks with status `"not_done"` are excluded from calculation. Marks with a value and no status (or `"done"` / `"unknown"`) are included normally.

**File:** `src/lib/grading-apc.ts` — `calcAPCSubjectAverage()` and `calcAPCYearlyAverage()`

Same status-aware logic applied. `sub.markStatuses` passed through automatically.

---

## Ground Truth Validation

Official report (Secondes · Série C · 1st Semester):

| Subject | Coef | I | D | C | Avg | Points |
|---|---|---|---|---|---|---|
| Catéchèse | 1 | 19.50 | 20.00 | 14.50 | 17.12 | 17.12 |
| Français | 2 | 15.00 | 13.00 | 12.00 | 13.00 | 26.00 |
| Anglais | 2 | 17.00 | 17.00 | 17.00 | 17.00 | 34.00 |
| Histo-Géo | 2 | 9.00 | 15.00 | 16.00 | 14.00 | 28.00 |
| ECM | 2 | 16.00 | 15.00 | 17.00 | 16.25 | 32.50 |
| Philosophie | 1 | 10.00 | 12.00 | 11.00 | 11.00 | 11.00 |
| Mathématiques | 4 | 4.00 | 10.00 | 7.00 | 7.00 | 28.00 |
| Sciences Physiques | 3 | 10.00 | 8.00 | 7.00 | 8.00 | 24.00 |
| SVT | 3 | 12.00 | 18.00 | 18.00 | 16.50 | 49.50 |
| Dessin | 1 | 11.00 | 13.50 | 16.00 | 14.12 | 14.12 |
| Musique | 1 | 10.00 | 19.00 | 19.00 | 16.75 | 16.75 |
| EPS | 1 | — | 13.50 | 18.00 | 16.50 | 16.50 |
| Allemand | 1 | 11.00 | 16.00 | 14.00 | 13.75 | 13.75 |

**Total Points: 311.25 · Total Coef: 24 · Final Average: 12.97**
