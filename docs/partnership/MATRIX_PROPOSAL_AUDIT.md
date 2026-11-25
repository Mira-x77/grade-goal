# Matrix Industrie partnership proposal - fact check against the app

Audit of every product claim in the draft proposal, checked against the code
and the live R2 catalogue on 24 November 2026. Nothing in this file changes the
app; it lists what the proposal may say today, what must be reworded, and what
would have to be built for the rest to be true.

Verdict: **the app supports most of the "About GoStudy" section, but three
commercial claims are not backed by the product yet - advertising metrics, the
Courses menu, and one code = one device.**

---

## 1. Claims that are true today

| Proposal claim | Reality | Evidence |
|---|---|---|
| Grade calculator with the right coefficients per system | APC, French/AEFE and Nigerian University engines, each with its own coefficient rules | `src/lib/grading-{apc,french,nigerian}.ts`, `grading-engine-registry.ts` |
| Target tracker | "Surpassing / On track / Behind" analysis against the student's goal | `src/lib/target-advisor.ts`, `src/test/target-advisor.test.ts` |
| What-if simulator | Dedicated screen where marks are changed and the average recomputed | `src/pages/Simulator.tsx`, route `/simulator` |
| Study planner | Schedule screen (today/week tabs) plus local reminders | `src/pages/ScheduleManager.tsx`, `notification-scheduler.ts` |
| Exam library, downloadable offline | 395 papers, 415 books (2.03 GB); downloads saved to the device and reopen offline | `catalog/papers.json`, `books.json`, `downloadService` |
| Book library | 415 books in the same catalogue | `catalog/books.json` |
| Feeds page | "Actus" tab with 5 published posts, images and external links | `src/pages/Courses.tsx`, `catalog/feed.json` |
| Free plan: 3 subjects, 5 downloads/month | Enforced in code | `FREE_SUBJECT_LIMIT = 3`, `FREE_DOWNLOAD_LIMIT = 5` |
| Premium by activation code, no card | Codes are redeemed in-app and bind to devices | `RedeemCodeSheet.tsx`, migrations `019`, `023` |
| Premium price 18,000 FCFA/year | Matches the pricing table (1,500 FCFA/month, 18,000 FCFA/12 months) | `src/lib/code-pricing.ts` |
| Android ~15 MB, plus web | APK 13.8 MB, web build shipped | `releases/GoStudy-1.3.4-v16/`, `dist/` |
| French and English | Two locales, French by default | `src/lib/i18n.ts` (`Language = "en" \| "fr"`) |
| Storage 1 GB exceeded, PDFs and feed now on R2, auth and code sync on hold | Exactly the current state - 402 on every Supabase call | `pending/01-move-pdfs-to-r2.md` |
| No phone number, location, contacts or payment details | Manifest asks only for internet, storage, notifications, vibration; guest mode needs no account | `AndroidManifest.xml`, `guest-auth.ts` |
| Offline-first | Library, filters, Actus and already-downloaded files work without a connection | verified in the desktop build (395/415/5 offline) |

## 2. Claims that are wrong or overstated - reword

| Proposal says | Actual | Fix |
|---|---|---|
| "60+ papers (BAC, BEPC, Probatoire, 2015-2024)" | **395 papers**, 2002-2027 (313 from 2026), plus CEPD, CAP, Concours, Annales, Devoirs | Say "395 papers and 415 books, 2002-2027, covering BEPC, BAC, Probatoire, CEPD, CAP and entrance exams" |
| "Built around APC, WAEC and French education systems" | Content and grading are APC/French. **Zero WAEC/NECO papers** in the catalogue; the "Nigerian" engine is **university GPA/CGPA**, not WAEC A1-F9 | Say "APC, French and Nigerian university grading"; move WAEC to the roadmap |
| "Study strategizer ... splits study hours accordingly" | It ranks subjects by coefficient-weighted impact on the average (true), but **no automatic hour allocation** exists | Say "ranks subjects by coefficient and distance from target"; hour splitting is a future update |
| "Free ... 1 device" | 3 subjects and 5 downloads are enforced; **free devices are not capped** (only premium codes bind 2 devices) | Drop "1 device" from the free plan |
| "Each code is tied to one device" | One premium code works on **up to 2 devices** | Say "up to 2 devices per code" - or change the app (see 4) |
| "Windows version in development" | Built and tested on 24 Nov 2026: installer 168.5 MB, portable 137 MB, offline catalogue + PDF cache | Say "Windows app built and ready for pilot devices" |
| "Advertising available now ... seen by every student" | A post can be published to Actus, but there is **no ad slot, no sponsor label and no impression/click counting**, and editing Actus is currently blocked because admin reads Supabase only | Move to "pilot campaign, manually published" until the ad slot ships |
| "I will report impressions and clicks every month" | Analytics tracks sessions, page views and events, but **not ad impressions or clicks**; the analytics table is also on the restricted Supabase project | Needs the ad counter in 3 before promising numbers |
| "Reach is the real number of active users: 50" | Active-user numbers come from Supabase analytics, currently returning 402 | Present 50 as "installs to date", not measured MAU |

## 3. Missing capabilities - build or defer

| Capability | Needed for | State | Effort | Recommendation |
|---|---|---|---|---|
| Ad slot with sponsor label, impression + click counters, monthly export | "Advertising in GoStudy" | Not started | 2-4 days (needs a working backend - Supabase restored, or a Cloudflare Worker + D1/KV free tier) | **Build before signing** if Matrix money depends on it |
| Courses menu: lesson catalogue, paid access, admin CMS | "Courses menu", Matrix training offer | Not started - `/courses` is only the Actus feed, and there are no lesson or purchase tables | 1-2 weeks | Defer, as the draft already says "upcoming" |
| Automatic study-hour allocation by coefficient gap | "Study strategizer" wording | Not started | 2-3 days | Defer or reword |
| School/class tag + per-school usage report (uptime, papers opened) | 3-school pilot review | Not started; no school field in onboarding | 2-3 days | Build if the pilot review is contractual |
| WAEC/NECO secondary grading (A1-F9, 9-point) and WAEC papers | "WAEC" in the systems line | Not started | 1 day for the engine, content work for the papers | Defer; keep the claim out of the draft |
| One-device premium binding | "Each code is tied to one device" | App allows 2 devices per code | 0.5 day to change, but it removes the second-device feature | Change the proposal, not the app |
| Self-service Actus editing on R2 | "I will publish Matrix ads" | Admin Actus reads Supabase only; R2 feed is script-published | 1-2 days | Build, otherwise every ad change is a developer task |
| Partner credit inside the app | "Founding hardware partner" | No partner/About slot | 1 day (a pinned feed post is the cheap version) | Optional |

## 4. Sections that need no change

- **The problem**: storage at 1.63 GB of 1 GB, database 7%, services returning
  402 until 2 December 2026 - matches the live project.
- **Advice I am seeking**: the five questions are answerable and the current
  plan (free Supabase for auth only, delete the old storage objects, export
  users/codes, upgrade only past 50k MAU) is sound for the app's architecture.
- **Data protection**: grades stay on the device (local state + IndexedDB),
  permissions ask for no location/contacts/camera, and the privacy text states
  data is not sold. One caveat: the current privacy copy says "we do NOT use it
  for targeted advertising", so Matrix ads must be described as **contextual,
  shown to everyone**, never targeted - otherwise the policy needs rewriting.
- **Pilot structure** (prepare / run / review): feasible with what exists,
  provided the school tag and the ad metrics above are added before the review.

## 5. Suggested minimal edit list for the draft

1. Library numbers: 60+ -> **395 papers + 415 books, 2002-2027**.
2. Systems: drop **WAEC**, say **APC, French and Nigerian university**.
3. Free plan: keep 3 subjects + 5 downloads, remove **1 device**.
4. Premium codes: **up to 2 devices**, not one.
5. Windows: **built and pilot-ready**, not "in development".
6. Advertising: **one manually published campaign now**, measured reporting
   after the ad counter ships.
7. Study strategizer: ranking only, **no hour splitting yet**.
8. Courses menu: keep as **planned**, and say plainly that it does not exist.
