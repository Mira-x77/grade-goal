# Go Study! — Promotional Flyer Set

Five ready-to-post flyers built from **real screenshots of the running app** (light theme,
yellow accent, seeded student "Amina" — Tle · Série D · 1er Semestre, 33/39 marks, 15.7/20,
target 16/20, 7-day streak).

Design language: warm paper `#EDEAE5`, ink `#171614`, highlighter yellow `#F5C842`, white
cards with thick black outlines, hard offset shadows, Nunito 900 display type. Playful,
Duolingo-adjacent energy — no Duolingo assets or copy were used.

---

## Deliverables

| # | Format | File | Size (px) | Use |
|---|--------|------|-----------|-----|
| 1 | A4 portrait | `render/1x/01-a4.png` | 1240 × 1754 | Print / WhatsApp document / school noticeboard |
| 2 | Instagram square | `render/1x/02-square.png` | 1080 × 1080 | Feed post, Facebook, WhatsApp status-square |
| 3 | Instagram portrait | `render/1x/03-portrait.png` | 1080 × 1350 | IG feed (4:5), highest feed reach |
| 4 | Story / Reel | `render/1x/04-story.png` | 1080 × 1920 | IG / WhatsApp / TikTok story, Reel cover |
| 5 | Landscape banner | `render/1x/05-banner.png` | 1920 × 1080 | School screens, YouTube, slide deck, TV |

**Print-ready A4:** `Go-Study-Flyer-A4-print.pdf` — 1 page, 210.0 × 297.0 mm, 300 dpi
(2480 × 3508 source).

**Overview:** `render/contact-sheet.png` — all five formats side by side.

High-resolution masters at 2× live in `render/` (`01-a4.png` … `05-banner.png`,
2480 × 3508 through 3840 × 2160). Use `render/1x/` for the exact platform sizes above.

---

## What each flyer says

| Format | Headline | Screenshot shown |
|--------|----------|------------------|
| A4 | "Know your average. Own your results." | Home + Study Strategizer |
| Square | "School is hard. Your average shouldn't be." | Home |
| Portrait | "Plan the marks that move your average." | Study Strategizer |
| Story | "Your marks. Your average. Your plan." | Home |
| Banner | "Grades, papers, and a plan." | Library + Strategizer + Home |

Claims are limited to shipped, public-safe features:

- APC / French / Nigerian GPA grading systems
- 60+ past papers, 2015–2024, BAC / BEPC / Probatoire, nine subjects
- Impact-ranked Study Strategizer with target mode and saved strategies
- Free up to 3 subjects; Android & Web
- `goostudy.vercel.app`

---

## Files

```
presentations/flyers/
├── flyer.css                  shared design system (tokens, cards, chips, phone frame)
├── flyer-01-a4.html           A4 layout
├── flyer-02-square.html       square layout
├── flyer-03-portrait.html     portrait layout
├── flyer-04-story.html        story layout
├── flyer-05-banner.html       banner layout
├── contact-sheet.html         5-format overview page
├── render.mjs                 headless Chrome renderer (CDP)
├── capture.mjs                app screenshot capture (CDP + device emulation)
├── shots/                     real app screenshots used by the flyers
├── render/                    2× masters + contact sheet
├── render/1x/                 exact platform-size exports
└── Go-Study-Flyer-A4-print.pdf
```

Screenshots in `shots/` were captured at 390 × 844 CSS px with device pixel ratio 3, so
they stay crisp when scaled inside the phone frames. `shots/home.png`, `simulator.png` and
`library.png` are used by the layouts; `home-scroll.png`, `profile.png` and `quiz.png` are
kept as spare real captures.

---

## Re-rendering

Two local servers and a headless Chrome instance are needed.

```powershell
# 1. app (for screenshots only — skip if shots/ is already current)
npm run dev                       # http://127.0.0.1:5174

# 2. static server for the flyer HTML (repo root)
python -m http.server 5175 --bind 127.0.0.1

# 3. headless Chrome with CDP
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu `
  --hide-scrollbars --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\gostudy-cdp-profile" about:blank
```

Re-capture app screenshots (expects a seeded local app state):

```powershell
$env:SHOTS = '[{"name":"home","route":"/","settle":2000},
               {"name":"simulator","route":"/simulator","settle":2500},
               {"name":"library","route":"/library","settle":2500}]'
node presentations\flyers\capture.mjs
```

Re-render all five flyers:

```powershell
$env:FLYERS = '[{"name":"01-a4","url":"http://127.0.0.1:5175/presentations/flyers/flyer-01-a4.html","width":1240,"height":1754,"dsf":2},
               {"name":"02-square","url":"http://127.0.0.1:5175/presentations/flyers/flyer-02-square.html","width":1080,"height":1080,"dsf":2},
               {"name":"03-portrait","url":"http://127.0.0.1:5175/presentations/flyers/flyer-03-portrait.html","width":1080,"height":1350,"dsf":2},
               {"name":"04-story","url":"http://127.0.0.1:5175/presentations/flyers/flyer-04-story.html","width":1080,"height":1920,"dsf":2},
               {"name":"05-banner","url":"http://127.0.0.1:5175/presentations/flyers/flyer-05-banner.html","width":1920,"height":1080,"dsf":2}]'
node presentations\flyers\render.mjs
```

Then regenerate the 1× exports, contact sheet and PDF:

```powershell
node -e "const sharp=require('sharp');const fs=require('fs');const p='presentations/flyers/render';const out=p+'/1x';fs.mkdirSync(out,{recursive:true});const jobs=[['01-a4',1240,1754],['02-square',1080,1080],['03-portrait',1080,1350],['04-story',1080,1920],['05-banner',1920,1080]];(async()=>{for(const [n,w,h] of jobs) await sharp(p+'/'+n+'.png').resize(w,h,{fit:'fill'}).png({compressionLevel:9}).toFile(out+'/'+n+'.png')})()"

python -c "from PIL import Image; Image.open(r'presentations/flyers/render/01-a4.png').save(r'presentations/flyers/Go-Study-Flyer-A4-print.pdf','PDF',resolution=300.0)"
```

The contact sheet is rendered with the same `render.mjs` call using
`contact-sheet.html` at `2700 × 820`, `dsf 1.5`.

---

## Editing notes

- Sizes are snapped to device pixels so nothing resamples: 2× masters are exact multiples of
  the 1× platform sizes.
- Phone frames keep the 390:844 source aspect ratio, so screenshots are never side-cropped.
- All copy lives in the HTML files — edit there, then re-run the render step.
- Fonts load from `/public/fonts/nunito-*.woff2`; the renderer waits for
  `document.fonts.ready` and all images before capturing.
