---
inclusion: manual
---

# Mascot Character Context — "Go Study!"

## App Overview

**Name**: Go Study! (also referred to as Score Target internally)
**Platform**: Mobile-first React/Capacitor app (Android)
**Purpose**: Exam grade tracking and study preparation for secondary school students in Togo (West Africa)
**Core loop**: Enter marks → track average → set target → prepare for exams

---

## Target Audience

- **Age**: 13–18 years old (collège and lycée students)
- **Location**: Primarily Togo, West Africa
- **Context**: Students navigating either the APC (Togolese competency-based) or French Traditional grading systems
- **Motivation**: Academic achievement, passing exams, improving class ranking
- **Relationship with the app**: Daily check-ins, goal-setting, study prep

---

## Brand Identity

**Design system**: Hand-drawn, sketch-like, flat — no gradients, no heavy shadows. Think "sticker on a notebook."

**Color palette**:
- Background: warm off-white `#EDEAE5`
- Ink/primary: near-black `#1A1A1A`
- Accent: yellow highlighter `#F5C842`
- Success: green, Danger: red
- Cards: pure white with thick 2px black borders

**Typography**: Nunito (weights 700–900 used heavily) — friendly, rounded, energetic

**UI feel**: Bold, rounded corners (20px), offset drop shadows (3px 3px), sticker-like cards, mobile-first (max-width 448px)

**Tone of voice**: Encouraging, direct, non-judgmental, slightly playful. Examples:
- "Hey [Name]!" — personal greeting
- "Pass smarter, not harder" — aspirational
- "Tight, but doable" — honest but supportive
- "On track!" — positive reinforcement
- "Go Study!" — action-oriented tagline

---

## Existing Mascot

**Character**: A white blob with thick black outlines — round head, stubby arms, short leg stubs. Hand-drawn SVG style. Floats gently (framer-motion y-axis loop animation).

**Visual style**: Simple, minimal, expressive through pose and mouth shape only. No face details beyond dot eyes and a line/curve mouth. Rounded "hand" circles at arm ends.

**Accent color on character**: Yellow `#F5C842` used for the book (reading pose) and celebration stars.

**Current poses** (defined in `src/components/Mascot.tsx`):

| Pose | Context | Expression |
|---|---|---|
| `idle` | Default / standing | Neutral mouth, one arm raised, one on hip |
| `pointing` | Auth / welcome screens | Neutral mouth, one arm pointing up |
| `celebrating` | Success / on target | Open mouth (happy), both arms up, yellow stars |
| `thinking` | Onboarding / choosing | Neutral mouth, hand on chin, thought bubble with `?` |
| `sad` | Error / below target | Sad mouth, both arms drooping, single tear |
| `reading` | Library / exam prep | Neutral mouth, holding yellow book |
| `sleeping` | Empty state / no data | Closed eyes, tilted body, `zzz` text |

**Props**:
- `pose`: one of the 7 poses above (default: `"idle"`)
- `size`: number in px (used as both width and height, default: 120)
- `animate`: boolean — enables floating animation (default: true)

**Usage sizes in the app**:
- Auth page: 120px, pointing
- Onboarding: 110px, thinking / idle / pointing
- Home dashboard: 80px, dynamic (celebrating / thinking / sad based on performance)
- Empty states: 100px, pointing

---

## Mascot Personality

The mascot is the app's "study buddy" — it mirrors the student's academic situation emotionally without being preachy. It:

- **Celebrates** when the student is on track or hits their target
- **Thinks** when the student is setting up or making decisions
- **Reads** when the student is in study/prep mode
- **Droops** when grades are below target — empathetic, not punishing
- **Sleeps** when there's no data yet — lazy but cute, not broken

The character should feel like a friendly creature that lives in the student's phone and genuinely cares about their grades. It's not a teacher or authority figure — it's a peer-level companion.

---

## Design Constraints for New Poses / Variations

- SVG viewBox is `0 0 180 200`
- Body blob path is fixed (shared `<Body />` component) — do not alter the core shape
- Stroke style: `stroke="#1A1A1A"`, `strokeWidth=8`, `strokeLinecap="round"`, `strokeLinejoin="round"`
- Mouth variants available: `MouthNeutral`, `MouthSmile`, `MouthSad`, `MouthOpen`
- Arms are simple curved paths (`Q` bezier) ending in a circle (r=6) for the "hand"
- Legs are two straight lines from the body base
- Accent elements (stars, book, zzz) use yellow `#F5C842` or black `#1A1A1A`
- Keep it minimal — the character reads at very small sizes (80px)

---

## Suggested Future Poses (not yet implemented)

- `running` — legs animated, arms pumping (streak / urgency)
- `writing` — holding a pencil, focused (mark entry)
- `trophy` — holding a small trophy (milestone / achievement)
- `shocked` — wide eyes, arms out (unexpected result)
- `waving` — friendly wave (greeting / return user)

---

## Key Files

| File | Purpose |
|---|---|
| `src/components/Mascot.tsx` | Full SVG mascot component with all poses |
| `src/index.css` | Design tokens (colors, radius, fonts) |
| `src/pages/Home.tsx` | Main dashboard — dynamic pose selection logic |
| `src/components/OnboardingScreen.tsx` | Onboarding flow — mascot as guide |
| `src/types/exam.ts` | Domain types (Subject, MarkType, GradingSystem, AppState) |
