# Go Study! — Public Overview Deck

A 10-slide, 16:9 presentation compiled from the school-admin and student presentations,
then checked against the app source.

## Files

| File | Purpose |
|------|---------|
| `Go-Study-Public-Overview-2026.pptx` | Editable deck (10 slides, speaker notes included) |
| `Go-Study-Public-Overview-2026.pdf` | Share/print version with fonts embedded |
| `build_deck.py` | Generator script — edit content here and re-run |
| `assets/` | Transparent mascot art and cleaned logo used by the deck |
| `render/` | PNG previews of every slide |

## The 10 slides

1. **Cover** — what the app is, who it is for, one-line promise.
2. **The problem** — manual averages, unclear priorities, paper and lesson costs.
3. **The product** — eight shipped tools, from GPA calculator to schedule and history.
4. **How it works** — four setup steps plus a phone dashboard mock.
5. **Study strategizer** — the impact-ranked study plan, with a worked example.
6. **Content library** — 60+ papers, 2015–2024, BAC/BEPC/Probatoire, nine subjects, books.
7. **Why now / market** — Cameroon beachhead, three grading systems, current coverage.
8. **Access model** — free vs premium, public student pricing, school code distribution.
9. **Trust** — data minimisation, offline-first, device limit, deletion.
10. **Roadmap + CTA** — now/next/later, student and school/investor calls to action.

## Public-safe choices

The deck deliberately leaves out anything that would expose internal operations or
unverified claims:

- No school commission percentages, wholesale rates, or revenue projections.
- No admin panel walkthrough, database/backend details, or code-generation mechanics.
- No user-count or traction numbers that are not verified in the repo.
- No contact details beyond the public website (`goostudy.vercel.app`).
- No claim that the app is on the Play Store; the CTA says Android and web.
- No "ad-free" claim (the free tier is not ad-supported).
- No "anonymous analytics" claim; it says "in-app usage analytics".

A few figures in the source markdown were corrected against the code:

- **7 class levels** (6ème → Terminale), not 8.
- **Free tier is capped at 3 subjects** (`FREE_SUBJECT_LIMIT`), so the free card says
  "up to 3 subjects"; premium lists "Unlimited subjects".
- The **10 years** of papers are presented as 2015–2024 coverage.

## Rebuild

```bash
python presentations/build_deck.py
```

The script writes the `.pptx`. To refresh the PDF/PNG previews on Windows:

```powershell
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open("...\Go-Study-Public-Overview-2026.pptx", $false, $false, $false)
$pres.Export("...\render", "PNG", 1600, 900)
$pres.SaveAs("...\Go-Study-Public-Overview-2026.pdf", 32)
$pres.Close(); $ppt.Quit()
```

## Design

The visual system mirrors the app: warm paper `#EDEAE5`, ink black `#1A1A1A`,
highlighter yellow `#F5C842`, heavy rounded type, thick outlines and the Go Study!
mascot. Display font is Segoe UI Black; body is Segoe UI. The PDF preserves the look
on machines without those fonts.
