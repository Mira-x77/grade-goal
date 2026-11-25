"""
Builds the public Go Study! overview deck (10 slides, 16:9).

Design language mirrors the app:
  warm paper background, ink-black line work, highlighter yellow,
  rounded "sketch" cards, Nunito-like heavy type, mascot illustrations.

Run:  python presentations/build_deck.py
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.dml import MSO_LINE_DASH_STYLE

# ---------------------------------------------------------------- palette
INK = RGBColor(0x1A, 0x1A, 0x1A)
PAPER = RGBColor(0xED, 0xEA, 0xE5)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
YELLOW = RGBColor(0xF5, 0xC8, 0x42)
YELLOW_SOFT = RGBColor(0xFB, 0xE9, 0xA8)
MUTED = RGBColor(0x6B, 0x67, 0x60)
MUTED_LIGHT = RGBColor(0xD9, 0xD4, 0xCA)
LINE_GRAY = RGBColor(0xC9, 0xC3, 0xB7)
RED = RGBColor(0xD9, 0x53, 0x4F)
RED_SOFT = RGBColor(0xF6, 0xDF, 0xDD)
GREEN = RGBColor(0x3F, 0x7D, 0x5A)
GREEN_SOFT = RGBColor(0xDF, 0xEC, 0xE3)
AMBER = RGBColor(0xE0, 0xA2, 0x1A)
AMBER_SOFT = RGBColor(0xFA, 0xEC, 0xC8)

DISPLAY = "Segoe UI Black"
HEAVY = "Segoe UI"
SYMBOL = "Segoe UI Symbol"
HAND = "Segoe Print"

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
ICON = os.path.join(ASSETS, "icon_clean.png")

SW, SH = 13.333, 7.5
TOTAL = 10


# ---------------------------------------------------------------- primitives
def text(slide, x, y, w, h, s, size=12, color=INK, bold=False, font=HEAVY,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line=1.0, italic=False,
         space_after=0):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    for i, ln in enumerate(s.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line
        p.space_before = Pt(0)
        p.space_after = Pt(space_after)
        r = p.add_run()
        r.text = ln
        f = r.font
        f.name = font
        f.size = Pt(size)
        f.bold = bold
        f.italic = italic
        f.color.rgb = color
    return box


def rich(slide, x, y, w, h, parts, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, line=1.0):
    """parts: list of (text, size, bold, color[, font])"""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line
    for part in parts:
        s, size, bold, color = part[:4]
        fnt = part[4] if len(part) > 4 else HEAVY
        r = p.add_run()
        r.text = s
        f = r.font
        f.name = fnt
        f.size = Pt(size)
        f.bold = bold
        f.color.rgb = color
    return box


def rect(slide, x, y, w, h, fill=WHITE, line=INK, lw=2.0, radius=0.12,
         rot=0, dash=None):
    shp = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h)
    )
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid()
        shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(lw)
        if dash:
            shp.line.dash_style = dash
    shp.shadow.inherit = False
    try:
        shp.adjustments[0] = radius
    except Exception:
        pass
    if rot:
        shp.rotation = rot
    return shp


def oval(slide, x, y, w, h, fill=INK, line=None, lw=1.5):
    shp = slide.shapes.add_shape(
        MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(w), Inches(h)
    )
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(lw)
    shp.shadow.inherit = False
    return shp


def star(slide, x, y, size=0.28, color=YELLOW):
    shp = slide.shapes.add_shape(
        MSO_SHAPE.STAR_4_POINT, Inches(x), Inches(y), Inches(size), Inches(size)
    )
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def line(slide, x1, y1, x2, y2, color=INK, lw=1.0, dash=None):
    c = slide.shapes.add_connector(
        MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2)
    )
    c.line.color.rgb = color
    c.line.width = Pt(lw)
    if dash:
        c.line.dash_style = dash
    return c


def pill(slide, x, y, w, h, label, size=9.5, fill=YELLOW, line=None,
         color=INK, font=HEAVY, bold=True):
    rect(slide, x, y, w, h, fill=fill, line=line, lw=1.25, radius=0.5)
    text(slide, x, y, w, h, label, size=size, color=color, bold=bold,
         font=font, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def eyebrow(slide, label, x=0.72, y=0.52, w=None):
    if w is None:
        w = 0.16 * len(label) + 0.55
    pill(slide, x, y, w, 0.29, label, size=9, fill=YELLOW)
    return w


def bg(slide):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0,
                                 Inches(SW), Inches(SH))
    shp.fill.solid()
    shp.fill.fore_color.rgb = PAPER
    shp.line.fill.background()
    shp.shadow.inherit = False
    # push to back
    sp = shp._element
    sp.getparent().remove(sp)
    slide.shapes._spTree.insert(2, sp)


def footer(slide, n):
    line(slide, 0.72, 7.06, 12.61, 7.06, LINE_GRAY, 0.75)
    text(slide, 0.72, 7.13, 7.0, 0.22, "GO STUDY!  ·  PUBLIC OVERVIEW  ·  2026",
         size=7.5, color=MUTED, bold=True)
    text(slide, 11.4, 7.13, 1.2, 0.22, f"{n:02d} / {TOTAL:02d}", size=7.5,
         color=MUTED, bold=True, align=PP_ALIGN.RIGHT)


def headline(slide, s, y=0.95, size=38, w=11.9, x=0.72, color=INK):
    text(slide, x, y, w, 1.35, s, size=size, color=color, bold=True,
         font=DISPLAY, line=0.93)


def subhead(slide, s, y, size=13.5, w=10.5, x=0.72, color=MUTED):
    text(slide, x, y, w, 0.5, s, size=size, color=color, bold=False)


def card_number(slide, x, y, n, size=0.42, fill=INK, color=YELLOW):
    oval(slide, x, y, size, size, fill=fill)
    text(slide, x, y, size, size, n, size=10.5, color=color, bold=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def mascot(slide, name, x, y, w, h):
    slide.shapes.add_picture(os.path.join(ASSETS, name + ".png"),
                             Inches(x), Inches(y), Inches(w), Inches(h))


def notes(slide, s):
    slide.notes_slide.notes_text_frame.text = s


# ---------------------------------------------------------------- phone mock
def phone(slide, x, y, w=3.05, h=5.35):
    rect(slide, x + 0.08, y + 0.10, w, h, MUTED_LIGHT, None, 0, 0.11)
    rect(slide, x, y, w, h, WHITE, INK, 3.0, 0.11)
    rect(slide, x + 0.12, y + 0.12, w - 0.24, h - 0.24, WHITE, None, 0, 0.09)
    rect(slide, x + w / 2 - 0.38, y + 0.12, 0.76, 0.11, INK, None, 0, 0.5)

    text(slide, x + 0.28, y + 0.36, 1.6, 0.25, "GO STUDY!", size=9.5,
         bold=True, font=DISPLAY)
    pill(slide, x + w - 1.12, y + 0.35, 0.84, 0.22, "ON TRACK", size=6.5)

    text(slide, x + 0.28, y + 0.76, 2.0, 0.2, "YEARLY AVERAGE", size=6.5,
         color=MUTED, bold=True)
    rich(slide, x + 0.28, y + 0.94, 2.2, 0.65,
         [("14.2", 34, True, INK, DISPLAY), (" /20", 10, True, MUTED)])
    text(slide, x + 0.28, y + 1.55, 2.4, 0.22, "Target 15.0  ·  0.8 to go",
         size=7.5, color=MUTED, bold=True)

    rect(slide, x + 0.28, y + 1.82, w - 0.56, 0.11, MUTED_LIGHT, None, 0, 0.5)
    rect(slide, x + 0.28, y + 1.82, (w - 0.56) * 0.72, 0.11, INK, None, 0, 0.5)
    rect(slide, x + 0.28 + (w - 0.56) * 0.75, y + 1.76, 0.05, 0.23, RED, None, 0, 0.5)

    text(slide, x + 0.28, y + 2.08, 1.6, 0.2, "SUBJECTS", size=6.5,
         color=MUTED, bold=True)

    rows = [("Math", "8.0", 0.40, RED), ("Physics", "11.0", 0.55, AMBER),
            ("French", "16.0", 0.80, GREEN)]
    ry = y + 2.30
    for name, val, pct, col in rows:
        text(slide, x + 0.28, ry, 1.1, 0.18, name, size=7.5, bold=True)
        text(slide, x + w - 0.62, ry, 0.42, 0.18, val, size=7.5, bold=True,
             align=PP_ALIGN.RIGHT)
        rect(slide, x + 0.28, ry + 0.19, w - 0.56, 0.07, MUTED_LIGHT, None, 0, 0.5)
        rect(slide, x + 0.28, ry + 0.19, (w - 0.56) * pct, 0.07, col, None, 0, 0.5)
        ry += 0.50

    rect(slide, x + 0.28, y + 3.93, w - 0.56, 0.58, YELLOW, INK, 1.5, 0.14)
    text(slide, x + 0.40, y + 4.02, 1.7, 0.2, "TODAY'S PLAN", size=6.2, bold=True)
    text(slide, x + 0.40, y + 4.20, 2.1, 0.22, "Math · 2 hours", size=8.5, bold=True)

    nav = rect(slide, x + 0.24, y + h - 0.52, w - 0.48, 0.30, INK, None, 0, 0.5)
    for i, cx in enumerate([0.30, 0.38, 0.46, 0.54]):
        oval(slide, x + w * cx - 0.035, y + h - 0.44, 0.07, 0.07,
             YELLOW if i == 0 else WHITE)


# ---------------------------------------------------------------- slides
def slide_cover(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)

    # logo card
    rect(s, 0.66, 0.42, 1.30, 1.30, WHITE, INK, 2.0, 0.16)
    s.shapes.add_picture(ICON, Inches(0.75), Inches(0.50), Inches(1.12), Inches(1.12))
    pill(s, 10.60, 0.58, 2.04, 0.32, "PUBLIC OVERVIEW · 2026", size=8.5,
         fill=WHITE, line=INK)
    text(s, 2.18, 0.72, 5.4, 0.3, "FOR APC STUDENTS", size=10,
         color=MUTED, bold=True)
    text(s, 2.18, 1.00, 5.4, 0.3, "6ÈME → TERMINALE  ·  A4 / C / D / E", size=10,
         color=MUTED, bold=True)

    # yellow marker swipe behind second title line
    rect(s, 0.70, 3.10, 7.05, 0.58, YELLOW, None, 0, 0.18, rot=-1.2)

    text(s, 0.70, 1.95, 7.5, 1.85, "STUDY SMARTER.\nHIT YOUR GOAL.", size=52,
         bold=True, font=DISPLAY, line=0.95)

    text(s, 0.72, 4.05, 6.55, 1.0,
         "The all-in-one academic app that helps students track grades, "
         "find study priorities, and practise with real exam papers.",
         size=14.5, color=INK, line=1.25)

    pill(s, 0.72, 5.28, 1.85, 0.38, "APC-NATIVE", size=9.5, fill=WHITE, line=INK)
    pill(s, 2.72, 5.28, 1.80, 0.38, "OFFLINE-FIRST", size=9.5, fill=WHITE, line=INK)
    pill(s, 4.67, 5.28, 2.05, 0.38, "ANDROID + WEB", size=9.5, fill=WHITE, line=INK)

    oval(s, 0.72, 6.32, 0.11, 0.11, YELLOW)
    text(s, 0.94, 6.25, 4.5, 0.3, "goostudy.vercel.app", size=13, bold=True)

    # hero mascot + yellow sun
    oval(s, 9.12, 0.95, 3.20, 3.20, YELLOW)
    mascot(s, "triumph", 8.55, 1.15, 4.30, 3.30)
    star(s, 8.05, 4.38, 0.30)
    star(s, 12.35, 5.55, 0.24, WHITE)

    # sticky note
    note = rect(s, 8.32, 4.92, 3.45, 1.42, WHITE, INK, 2.0, 0.06, rot=-4.5)
    rect(s, 9.55, 4.82, 0.85, 0.22, YELLOW_SOFT, None, 0, 0.3, rot=-4.5)
    text(s, 8.58, 5.12, 3.0, 0.4, "395 EXAM PAPERS", size=18, bold=True,
         font=DISPLAY, align=PP_ALIGN.CENTER)
    text(s, 8.58, 5.55, 3.0, 0.25, "BAC · BEPC · PROBATOIRE", size=9, bold=True,
         color=MUTED, align=PP_ALIGN.CENTER)
    text(s, 8.58, 5.80, 3.0, 0.25, "2002 - 2027", size=9, bold=True,
         color=MUTED, align=PP_ALIGN.CENTER)

    text(s, 11.4, 7.13, 1.2, 0.22, "01 / 10", size=7.5, color=MUTED,
         bold=True, align=PP_ALIGN.RIGHT)

    notes(s, "Go Study! is a mobile-first academic companion built for the APC "
             "APC system. This public overview covers the student product, the "
             "content library, access model and roadmap — no confidential financials.")


def slide_problem(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "THE PROBLEM")
    headline(s, "Every term,\nstudents guess.", y=0.98, size=38)
    subhead(s, "The information exists. The tools don't fit the system.", y=2.20,
            size=13.5, w=7.1)

    items = [
        ("01", "GPA math by hand",
         "Coefficients, interro, devoir, compo — one slip changes the average."),
        ("02", "No clear priority",
         "Students revise everything equally, or whatever feels urgent that night."),
        ("03", "Past papers cost money",
         "Printed papers can top 10,000 FCFA and are often used once."),
        ("04", "Tutoring adds up",
         "Private lessons run\n2,000–5,000 FCFA each."),
    ]
    for i, (n, title, body) in enumerate(items):
        col, row = i % 2, i // 2
        x = 0.72 + col * 3.62
        y = 2.72 + row * 1.62
        rect(s, x, y, 3.40, 1.42, WHITE, INK, 1.8, 0.12)
        card_number(s, x + 0.20, y + 0.20, n, size=0.40)
        text(s, x + 0.72, y + 0.18, 2.5, 0.30, title, size=12.5, bold=True)
        text(s, x + 0.72, y + 0.52, 2.48, 0.80, body, size=9.4, color=MUTED,
             line=1.12)

    # right panel
    mascot(s, "think", 10.15, 0.55, 2.35, 1.80)
    rect(s, 8.05, 2.42, 4.55, 3.30, INK, None, 0, 0.10)
    pill(s, 8.28, 2.28, 1.55, 0.30, "THE RESULT", size=8.5)
    text(s, 8.32, 2.78, 3.9, 0.3, "The hidden cost", size=15, color=WHITE,
         bold=True, font=DISPLAY)

    results = [
        "Study hours go to the wrong subjects.",
        "Stress builds as exams get closer.",
        "Families pay separately for papers and lessons.",
    ]
    ry = 3.30
    for r in results:
        oval(s, 8.34, ry + 0.08, 0.10, 0.10, YELLOW)
        text(s, 8.58, ry, 3.65, 0.55, r, size=10.5, color=WHITE, line=1.15)
        ry += 0.66

    rect(s, 8.32, 5.10, 3.95, 0.42, YELLOW, None, 0, 0.18)
    text(s, 8.44, 5.16, 3.7, 0.30, "One affordable place to plan, practise and track.",
         size=8.6, bold=True)

    text(s, 0.72, 6.62, 9.8, 0.25,
         "Pricing references: typical private-lesson and printed-paper costs in the APC market (2026).",
         size=8, color=MUTED, italic=True)
    footer(s, 2)

    notes(s, "Frame the pain in the student's language: manual averages, unclear "
             "priorities, costly papers and lessons. Avoid inventing market statistics; "
             "the cost ranges are the public reference points used in our student materials.")


def slide_product(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "THE PRODUCT")
    headline(s, "One app. The whole term.", y=0.95, size=40)
    subhead(s, "Everything a student needs between the first test and the final exam.",
            y=1.78, size=13)

    feats = [
        ("01", "GPA calculator", "Instant averages with APC coefficients and 40/60 split."),
        ("02", "Target tracker", "Set an end-of-year goal; see if you're on track."),
        ("03", "What-if simulator", "Move missing marks and preview the result."),
        ("04", "Study strategizer", "Ranks subjects by impact on your average."),
        ("05", "Exam library", "395 papers from 2002 to 2027, including BAC, BEPC, Probatoire, CEPD and CAP."),
        ("06", "Book library", "Digital books, downloadable for offline study."),
        ("07", "Smart schedule", "Weekly timetable plus study reminders."),
        ("08", "Progress history", "Streaks, mark history and semester archive."),
    ]
    for i, (n, title, body) in enumerate(feats):
        col, row = i % 4, i // 4
        x = 0.72 + col * 3.02
        y = 2.26 + row * 1.72
        rect(s, x, y, 2.84, 1.55, WHITE, INK, 1.8, 0.12)
        card_number(s, x + 0.18, y + 0.17, n, size=0.36)
        text(s, x + 0.20, y + 0.62, 2.44, 0.28, title, size=12, bold=True)
        text(s, x + 0.20, y + 0.93, 2.45, 0.55, body, size=8.9, color=MUTED,
             line=1.10)

    rect(s, 0.72, 5.78, 11.88, 0.52, YELLOW, None, 0, 0.2)
    text(s, 0.92, 5.88, 11.5, 0.32,
         "FREE TO USE   ·   FRENCH & ENGLISH   ·   OFFLINE-FIRST   ·   ANDROID 7+   ·   ~15 MB",
         size=9.5, bold=True, align=PP_ALIGN.CENTER)

    text(s, 0.72, 6.58, 11.5, 0.28,
         "Built for the APC system; one grading engine also supports French and Nigerian university models.",
         size=8.4, color=MUTED, italic=True)
    footer(s, 3)

    notes(s, "Keep this slide at feature level, not implementation. The eight tiles map "
             "directly to shipped screens. The bottom strip is the public technical summary: "
             "free tier, bilingual, offline, small Android footprint.")


def slide_how(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "HOW IT WORKS")
    headline(s, "From download to first win.", y=0.95, size=40)
    subhead(s, "Four steps. About two minutes to set up.", y=1.78, size=13)

    steps = [
        ("01", "Set up your profile", "Pick class, series and target average.",
         "Guest mode available."),
        ("02", "Add your subjects", "Preset subject lists with coefficients.",
         "6ème → Terminale."),
        ("03", "Log your marks", "Interro, devoir, compo — instant average.",
         "Recalculates automatically."),
        ("04", "Study with a plan", "See priorities, download papers, track progress.",
         "Works offline after setup."),
    ]
    for i, (n, title, body, note) in enumerate(steps):
        col, row = i % 2, i // 2
        x = 0.72 + col * 3.65
        y = 2.22 + row * 1.56
        rect(s, x, y, 3.42, 1.36, WHITE, INK, 1.8, 0.12)
        card_number(s, x + 0.20, y + 0.20, n, size=0.42)
        text(s, x + 0.76, y + 0.18, 2.5, 0.30, title, size=12.5, bold=True)
        text(s, x + 0.76, y + 0.53, 2.45, 0.42, body, size=9.4, color=MUTED,
             line=1.10)
        oval(s, x + 0.78, y + 1.03, 0.07, 0.07, YELLOW)
        text(s, x + 0.94, y + 0.97, 2.3, 0.2, note, size=7.8, color=INK,
             bold=True)

    rect(s, 0.72, 5.42, 7.92, 0.50, YELLOW, None, 0, 0.2)
    text(s, 0.90, 5.51, 7.6, 0.30,
         "WORKS OFFLINE   ·   FRENCH / ENGLISH   ·   ANDROID 7+   ·   ~15 MB",
         size=8.8, bold=True, align=PP_ALIGN.CENTER)
    text(s, 0.72, 6.06, 7.8, 0.55,
         "No credit card. No paperwork. Students can start on the free tier and unlock "
         "premium later with a code from their school.",
         size=9.6, color=MUTED, line=1.18)

    phone(s, 9.32, 1.52, 3.05, 5.30)
    star(s, 8.82, 1.20, 0.26)

    footer(s, 4)

    notes(s, "Walk through the same four steps a student sees. The phone mock is the "
             "home dashboard: current average versus target, subject bars, today's plan. "
             "Everything except downloading new papers works offline.")


def slide_strategizer(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "STUDY STRATEGIZER")
    headline(s, "Ten hours.\nWhere do they go?", y=0.95, size=38, w=6.0)
    subhead(s, "The app scores every subject by coefficient and distance from target, "
               "then shows where extra time has the biggest impact.",
            y=2.25, size=11.5, w=5.0)

    bullets = [
        ("Weights by coefficient", "A coef-5 subject carries five times the weight of coef-1."),
        ("Focuses on the gap", "Low scores in high-coefficient subjects rise to the top."),
        ("Recalculates as marks change", "The plan updates after every new test or composition."),
    ]
    by = 3.20
    for i, (t, b) in enumerate(bullets):
        card_number(s, 0.72, by + 0.02, str(i + 1), size=0.32, fill=WHITE,
                    color=INK)
        text(s, 1.18, by - 0.02, 4.3, 0.25, t, size=10.8, bold=True)
        text(s, 1.18, by + 0.25, 4.35, 0.4, b, size=8.9, color=MUTED, line=1.10)
        by += 0.78

    rect(s, 0.72, 5.72, 5.15, 0.72, YELLOW, INK, 1.8, 0.14)
    text(s, 0.92, 5.84, 4.8, 0.44,
         "High coefficient + low score = first.", size=15.5, bold=True,
         font=DISPLAY)

    # example table card
    rect(s, 6.30, 1.92, 6.25, 4.22, WHITE, INK, 2.0, 0.10)
    text(s, 6.56, 2.14, 3.4, 0.3, "ILLUSTRATIVE PLAN · 10 HOURS", size=8.5,
         color=MUTED, bold=True)
    text(s, 6.56, 2.42, 3.8, 0.3, "This week's priorities", size=14, bold=True,
         font=DISPLAY)
    star(s, 11.92, 2.30, 0.30)

    headers = [("SUBJECT", 6.56), ("COEF", 8.55), ("AVG", 9.55), ("PLAN", 10.60)]
    for h, hx in headers:
        text(s, hx, 2.82, 0.9, 0.2, h, size=7, color=MUTED, bold=True)

    rows = [
        ("Math", "5", "8/20", "4h", 1.0, RED),
        ("Physics", "4", "11/20", "3h", 0.75, AMBER),
        ("French", "3", "16/20", "2h", 0.50, GREEN),
        ("English", "2", "15/20", "1h", 0.25, GREEN),
    ]
    ry = 3.08
    for name, coef, avg, hrs, frac, col in rows:
        text(s, 6.56, ry + 0.04, 1.5, 0.24, name, size=10.5, bold=True)
        text(s, 8.55, ry + 0.04, 0.6, 0.24, coef, size=10, color=MUTED, bold=True)
        text(s, 9.55, ry + 0.04, 0.8, 0.24, avg, size=10, color=MUTED, bold=True)
        text(s, 10.60, ry + 0.02, 0.65, 0.26, hrs, size=11, bold=True)
        rect(s, 6.56, ry + 0.36, 5.55, 0.10, MUTED_LIGHT, None, 0, 0.5)
        rect(s, 6.56, ry + 0.36, 5.55 * frac, 0.10, col, None, 0, 0.5)
        line(s, 6.48, ry + 0.52, 12.38, ry + 0.52, LINE_GRAY, 0.75)
        ry += 0.62

    rich(s, 6.56, 5.66, 4.0, 0.3,
         [("TOTAL ", 8, True, MUTED), ("10h", 12, True, INK),
          ("  allocated by impact", 8, True, MUTED)])

    text(s, 6.30, 6.30, 6.2, 0.3,
         "Illustrative example. Actual recommendations use the student's own marks, "
         "coefficients and target.", size=7.8, color=MUTED, italic=True)
    footer(s, 5)

    notes(s, "This is the intellectual core of the product: a transparent, rules-based "
             "recommendation. It is not a black box and does not need generative AI to be "
             "useful. Explain the example: Math is coef 5 and 8/20, so it earns the most time.")


def slide_library(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "CONTENT LIBRARY")
    headline(s, "A decade of exams.\nIn your pocket.", y=0.95, size=38, w=6.4)
    subhead(s, "Real papers, organised by exam, series and year — downloadable for offline study.",
            y=2.28, size=11.5, w=5.4)

    stats = [
        ("395", "exam papers"),
        ("25 yrs", "2002-2027 coverage"),
        ("9", "core subjects"),
        ("2", "libraries: papers + books"),
    ]
    for i, (big, label) in enumerate(stats):
        col, row = i % 2, i // 2
        x = 0.72 + col * 2.52
        y = 2.95 + row * 1.22
        rect(s, x, y, 2.34, 1.06, WHITE, INK, 1.8, 0.12)
        size = 28 if len(big) > 3 else 32
        text(s, x + 0.18, y + 0.12, 2.0, 0.55, big, size=size, bold=True,
             font=DISPLAY)
        text(s, x + 0.18, y + 0.70, 2.0, 0.24, label, size=8.3, color=MUTED,
             bold=True, line=1.0)

    # right list card
    rect(s, 6.20, 1.92, 6.30, 2.92, WHITE, INK, 2.0, 0.10)
    rows = [
        ("BAC", "39 papers", "Séries A4 · C · D · E", "2002–2027"),
        ("BEPC", "40 papers", "3ème preparation", "Recent years prioritised"),
        ("Probatoire", "18 papers", "1ère · series-specific", "Recent years"),
    ]
    ry = 2.16
    for i, (name, count, meta, years) in enumerate(rows):
        rich(s, 6.44, ry, 4.0, 0.32,
             [(name, 15, True, INK, DISPLAY), ("   " + count, 9, True, MUTED)])
        text(s, 6.44, ry + 0.28, 3.4, 0.22, meta, size=8.4, color=MUTED,
             bold=True)
        text(s, 11.15, ry + 0.05, 1.15, 0.22, years, size=7.2, color=MUTED,
             bold=True, align=PP_ALIGN.RIGHT)
        if i < 2:
            line(s, 6.44, ry + 0.72, 12.24, ry + 0.72, LINE_GRAY, 0.75)
        ry += 0.86

    text(s, 6.20, 5.02, 3.6, 0.24, "SUBJECTS COVERED", size=7.5, color=MUTED,
         bold=True)
    subs = ["Math", "Physics", "Chemistry", "SVT", "French", "English",
            "Philosophy", "History-Geo", "Economics"]
    for i, sub in enumerate(subs):
        col, row = i % 3, i // 3
        cx = 6.20 + col * 2.10
        cy = 5.28 + row * 0.38
        pill(s, cx, cy, 1.95, 0.31, sub, size=7.8, fill=PAPER, line=LINE_GRAY,
             color=INK, bold=True)

    mascot(s, "read", 0.78, 5.34, 1.55, 1.18)

    text(s, 0.72, 6.62, 9.5, 0.26,
         "The library grows continuously — schools can request specific papers and titles.",
         size=8.2, color=MUTED, italic=True)
    footer(s, 6)

    notes(s, "Content is the retention engine. Use ranges, not precise counts that may "
             "change weekly: 395 papers from 2002 to 2027, sixteen subjects, plus the book "
             "library. The free tier includes five downloads a month.")


def slide_market(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "WHY NOW")
    headline(s, "Mobile-first. Exam-driven.\nUnderserved.", y=0.95, size=38, w=10.6)
    subhead(s, "Start with the students whose results decide what happens next.", y=2.35,
            size=13)
    mascot(s, "analyze", 10.95, 0.52, 1.90, 1.45)

    cols = [
        ("START HERE", "APC secondary",
         "Seven year groups, arts, science and technical series, one national exam system. "
         "APC is the product's native language — not a translation.",
         ["6ème → Terminale", "A4 · C · D · E", "BEPC · Probatoire · BAC",
          "Bilingual FR / EN"]),
        ("BUILT TO EXPAND", "One engine, three systems",
         "The grading layer already supports APC, French-style schools and Nigerian "
         "university CGPA. New markets reuse the same core.",
         ["APC /20 averages", "French comparative views", "Nigerian GPA / CGPA",
          "Shared content library"]),
        ("THE MOMENT", "Study lives on the phone",
         "Students already pay for printed papers, textbooks and private lessons. "
         "A small monthly code can replace several one-off costs.",
         ["Android-first audience", "Offline study is essential", "School distribution works",
          "No card required"]),
    ]
    for i, (tag, title, body, bullets) in enumerate(cols):
        x = 0.72 + i * 4.03
        rect(s, x, 2.86, 3.80, 2.98, WHITE, INK, 1.8, 0.10)
        pill(s, x + 0.22, 2.98, 1.35, 0.26, tag, size=7.2)
        text(s, x + 0.22, 3.36, 3.3, 0.55, title, size=13.5, bold=True,
             font=DISPLAY, line=0.98)
        text(s, x + 0.22, 3.98, 3.34, 0.95, body, size=8.8, color=MUTED, line=1.16)
        by = 4.80
        for b in bullets:
            oval(s, x + 0.24, by + 0.06, 0.08, 0.08, YELLOW)
            text(s, x + 0.42, by - 0.02, 3.1, 0.22, b, size=7.8, bold=True)
            by += 0.245

    rect(s, 0.72, 6.02, 11.86, 0.62, INK, None, 0, 0.18)
    text(s, 0.94, 6.13, 1.85, 0.24, "WHERE WE ARE TODAY", size=7.2, color=YELLOW,
         bold=True)
    facts = ["Live on Android + web", "395 papers", "7 class levels", "3 grading systems"]
    fx = 3.15
    for f in facts:
        oval(s, fx - 0.20, 6.27, 0.08, 0.08, YELLOW)
        text(s, fx, 6.20, 2.2, 0.24, f, size=9.2, color=WHITE, bold=True)
        fx += 2.40

    footer(s, 7)

    notes(s, "For investors: this is a focused beachhead with a reusable engine. Do not "
             "quote TAM numbers without a source. The credible proof is product coverage: "
             "eight levels, three grading systems, live Android and web, 395 papers.")


def slide_access(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "ACCESS MODEL")
    headline(s, "Free to start. Premium when ready.", y=0.95, size=38)
    subhead(s, "A usable free tier, plus a low-cost premium tier sold through schools and resellers.",
            y=1.78, size=12.5, w=11.0)

    # free
    rect(s, 0.72, 2.24, 5.78, 3.34, WHITE, INK, 1.8, 0.10)
    text(s, 0.96, 2.40, 1.8, 0.3, "FREE", size=9, color=MUTED, bold=True)
    text(s, 0.96, 2.66, 3.8, 0.4, "Start today", size=18, bold=True, font=DISPLAY)
    free = [
        "GPA calculator — up to 3 subjects",
        "Target tracking & progress history",
        "Basic study strategizer",
        "5 exam-paper downloads / month",
        "1 device · works offline",
    ]
    fy = 3.22
    for f in free:
        text(s, 0.98, fy, 0.25, 0.24, "✓", size=10.5, color=GREEN, bold=True,
             font=SYMBOL)
        text(s, 1.28, fy - 0.01, 4.9, 0.24, f, size=9.6, bold=True)
        fy += 0.40
    pill(s, 0.96, 5.12, 1.55, 0.28, "NO CARD NEEDED", size=7, fill=PAPER,
         line=LINE_GRAY)

    # premium
    rect(s, 6.78, 2.24, 5.80, 3.34, INK, None, 0, 0.10)
    text(s, 7.02, 2.40, 2.2, 0.3, "PREMIUM", size=9, color=YELLOW, bold=True)
    text(s, 7.02, 2.66, 4.2, 0.4, "Everything unlocked", size=18, bold=True,
         font=DISPLAY, color=WHITE)
    prem = [
        "Unlimited subjects",
        "Unlimited exam-paper downloads",
        "Full book library access",
        "Advanced strategizer & exam prep",
        "2 devices — phone + tablet",
        "Priority support",
    ]
    py = 3.18
    for f in prem:
        text(s, 7.04, py, 0.25, 0.24, "✓", size=10.5, color=YELLOW, bold=True,
             font=SYMBOL)
        text(s, 7.34, py - 0.01, 4.9, 0.24, f, size=9.4, bold=True, color=WHITE)
        py += 0.34
    pill(s, 7.02, 5.12, 2.45, 0.28, "ACTIVATION CODE", size=7, fill=YELLOW)

    # pricing
    plans = [("1 MONTH", "1,500"), ("2 MONTHS", "2,800"),
             ("3 MONTHS", "4,000"), ("6 MONTHS", "7,500")]
    for i, (dur, price) in enumerate(plans):
        x = 0.72 + i * 3.03
        rect(s, x, 5.76, 2.84, 0.92, WHITE, INK, 1.6, 0.10)
        text(s, x, 5.86, 2.84, 0.2, dur, size=7, color=MUTED, bold=True,
             align=PP_ALIGN.CENTER)
        rich(s, x, 6.06, 2.84, 0.42,
             [(price, 17, True, INK), (" FCFA", 7.5, True, MUTED)],
             align=PP_ALIGN.CENTER)

    text(s, 0.72, 6.80, 11.8, 0.22,
         "Codes are distributed by schools and authorised resellers. Premium activates instantly; no payment details are stored in the app.",
         size=7.6, color=MUTED, italic=True)
    footer(s, 8)

    notes(s, "Public pricing only. Do not show school commission, wholesale rates or "
             "revenue projections in this version. The distribution story is the important "
             "part: schools and resellers sell activation codes, so there is no card rails "
             "dependency for students.")


def slide_trust(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "TRUST BY DESIGN")
    headline(s, "Your grades are yours.", y=0.95, size=40)
    subhead(s, "A study tool should not need a student's whole digital life.", y=1.80,
            size=13)

    # what we ask
    rect(s, 0.72, 2.30, 3.78, 3.62, WHITE, INK, 1.8, 0.10)
    rect(s, 0.72, 2.30, 3.78, 0.12, GREEN, None, 0, 0.5)
    text(s, 0.96, 2.58, 3.2, 0.3, "WHAT WE ASK FOR", size=8.5, color=GREEN,
         bold=True)
    text(s, 0.96, 2.88, 3.2, 0.4, "The minimum", size=18, bold=True, font=DISPLAY)
    asks = ["Name (for personalisation)", "Class level and series",
            "Marks you choose to enter", "In-app usage analytics"]
    ay = 3.50
    for a in asks:
        text(s, 0.98, ay, 0.25, 0.24, "✓", size=10, color=GREEN, bold=True,
             font=SYMBOL)
        text(s, 1.26, ay - 0.01, 3.0, 0.24, a, size=9.2, bold=True)
        ay += 0.42
    text(s, 0.96, 5.36, 3.2, 0.45, "Grades stay on the device and sync only when signed in.",
         size=8.2, color=MUTED, italic=True)

    # never
    rect(s, 4.78, 2.30, 3.78, 3.62, WHITE, INK, 1.8, 0.10)
    rect(s, 4.78, 2.30, 3.78, 0.12, RED, None, 0, 0.5)
    text(s, 5.02, 2.58, 3.2, 0.3, "WHAT WE NEVER ASK FOR", size=8.5, color=RED,
         bold=True)
    text(s, 5.02, 2.88, 3.2, 0.4, "Not needed", size=18, bold=True, font=DISPLAY)
    nevers = ["Phone number", "Location", "Contacts or messages",
              "Photos or personal files", "Payment details in-app"]
    ny = 3.50
    for a in nevers:
        text(s, 5.04, ny, 0.25, 0.24, "✕", size=9, color=RED, bold=True,
             font=SYMBOL)
        text(s, 5.32, ny - 0.01, 3.0, 0.24, a, size=9.2, bold=True)
        ny += 0.42

    # how
    rect(s, 8.84, 2.30, 3.76, 3.62, INK, None, 0, 0.10)
    text(s, 9.08, 2.58, 3.2, 0.3, "HOW IT WORKS", size=8.5, color=YELLOW,
         bold=True)
    text(s, 9.08, 2.88, 3.2, 0.4, "Private by default", size=18, bold=True,
         font=DISPLAY, color=WHITE)
    how = [("Offline-first", "Core tools run with no connection."),
           ("Encrypted in transit", "Cloud sync uses secure connections."),
           ("2-device limit", "Codes cannot be shared across students."),
           ("Delete anytime", "Wipe local data and downloads in Settings.")]
    hy = 3.50
    for t, b in how:
        text(s, 9.08, hy, 3.2, 0.22, t, size=9.2, bold=True, color=WHITE)
        text(s, 9.08, hy + 0.21, 3.15, 0.28, b, size=7.6, color=RGBColor(0xC9, 0xC5, 0xBE),
             line=1.05)
        hy += 0.56

    text(s, 0.72, 6.20, 11.8, 0.30,
         "Privacy policy and terms are public in-app. Student data is never sold.",
         size=8.4, color=MUTED, italic=True, align=PP_ALIGN.CENTER)
    star(s, 4.42, 6.02, 0.22)
    star(s, 8.72, 6.02, 0.22)

    footer(s, 9)

    notes(s, "This is a public-facing trust slide. Keep claims precise: local-first "
             "storage, encrypted transport, two-device activation, data deletion. Avoid "
             "absolute security claims or regulatory certifications unless verified.")


def slide_next(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s)
    eyebrow(s, "WHAT'S NEXT")
    headline(s, "Built for APC.\nReady to scale.", y=0.82, size=36, w=9.6)
    mascot(s, "triumph", 11.10, 0.42, 1.60, 1.24)
    star(s, 10.78, 1.56, 0.22)

    phases = [
        ("NOW", "Live and useful",
         ["Android + web app", "395 papers, 415 books, planner", "School code distribution",
          "Free tier + premium"]),
        ("NEXT", "Deeper value",
         ["More papers and titles", "School partner dashboard", "Expanded exam prep",
          "More languages and regions"]),
        ("LATER", "Wider reach",
         ["iOS release", "More grading systems", "District & ministry pilots",
          "Scholarship code programmes"]),
    ]
    for i, (tag, title, items) in enumerate(phases):
        x = 0.72 + i * 4.03
        y = 2.38
        fill = INK if i == 0 else WHITE
        rect(s, x, y, 3.80, 2.02, fill, None if i == 0 else INK,
             1.8 if i else 0, 0.10)
        text(s, x + 0.22, y + 0.14, 1.4, 0.24, tag, size=8,
             color=YELLOW if i == 0 else MUTED, bold=True)
        text(s, x + 0.22, y + 0.38, 3.2, 0.34, title, size=14, bold=True,
             font=DISPLAY, color=WHITE if i == 0 else INK)
        iy = y + 0.86
        for it in items:
            oval(s, x + 0.24, iy + 0.06, 0.08, 0.08, YELLOW if i == 0 else INK)
            text(s, x + 0.42, iy - 0.01, 3.05, 0.22, it, size=7.9, bold=True,
                 color=WHITE if i == 0 else INK)
            iy += 0.27

    # CTA band
    rect(s, 0.72, 4.70, 11.88, 1.52, YELLOW, INK, 2.2, 0.10)
    text(s, 0.98, 4.83, 2.0, 0.24, "FOR STUDENTS", size=7.5, color=INK, bold=True)
    text(s, 0.98, 5.06, 4.9, 0.62,
         "Download free.\nAsk your school for a code.", size=15, bold=True,
         font=DISPLAY, line=1.02)
    text(s, 0.98, 5.82, 4.6, 0.24,
         "Available on Android and web — free to start", size=8.2, bold=True)

    line(s, 6.10, 4.90, 6.10, 6.02, INK, 1.0, MSO_LINE_DASH_STYLE.DASH)

    text(s, 6.34, 4.83, 2.4, 0.24, "FOR SCHOOLS & INVESTORS", size=7.5, bold=True)
    text(s, 6.34, 5.06, 5.0, 0.32, "Book a pilot or demo.", size=15, bold=True,
         font=DISPLAY)
    text(s, 6.34, 5.44, 5.2, 0.46,
         "See the student app, the content library and the school code model in one session.",
         size=8.6, bold=True, line=1.12)
    text(s, 6.34, 5.88, 4.2, 0.24, "goostudy.vercel.app", size=10.5, bold=True)

    text(s, 0.72, 6.46, 11.8, 0.30,
         "GO STUDY!  ·  SMART STUDYING, BETTER GRADES.", size=9.5, bold=True,
         align=PP_ALIGN.CENTER)
    footer(s, 10)

    notes(s, "Close with two doors: students download and ask their school for a code; "
             "schools and investors book a pilot. Roadmap is directional, not a commitment "
             "with dates. End on the brand line.")


def build():
    prs = Presentation()
    prs.slide_width = Inches(SW)
    prs.slide_height = Inches(SH)
    slide_cover(prs)
    slide_problem(prs)
    slide_product(prs)
    slide_how(prs)
    slide_strategizer(prs)
    slide_library(prs)
    slide_market(prs)
    slide_access(prs)
    slide_trust(prs)
    slide_next(prs)

    out = os.path.join(HERE, "Go-Study-Public-Overview-2026.pptx")
    prs.save(out)
    print("saved", out, "slides:", len(prs.slides))


if __name__ == "__main__":
    build()
