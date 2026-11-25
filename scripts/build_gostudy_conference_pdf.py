"""Dense 10-page Go Study conference + competitive brief. A4, tight margins."""
from __future__ import annotations

import os
from io import BytesIO

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "Go-Study-Conference-Brief.pdf")
W, H = A4  # 595.27 x 841.89
ML, MR, MT, MB = 16, 16, 14, 14
CW = W - ML - MR
NAVY = HexColor("#0F2A3A")
TEAL = HexColor("#1A6B6B")
GOLD = HexColor("#C4A35A")
INK = HexColor("#1A1A1A")
MUTED = HexColor("#4A5560")
RULE = HexColor("#C8D0D4")
PALE = HexColor("#F3F5F4")
PALE2 = HexColor("#E8EEED")
RED = HexColor("#8B3A3A")
WIN = HexColor("#1F6B4A")

FONT = "Helvetica"
FONTB = "Helvetica-Bold"
for path, name, bold in (
    (r"C:\Windows\Fonts\segoeui.ttf", "Segoe", False),
    (r"C:\Windows\Fonts\segoeuib.ttf", "Segoe-Bold", True),
):
    if os.path.exists(path):
        pdfmetrics.registerFont(TTFont(name, path))
        if bold:
            FONTB = name
        else:
            FONT = name


def wrap(c, text, font, size, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if c.stringWidth(t, font, size) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def draw_wrapped(c, text, x, y, font, size, max_w, leading, color=INK, max_lines=99):
    c.setFillColor(color)
    c.setFont(font, size)
    n = 0
    for line in wrap(c, text, font, size, max_w):
        if n >= max_lines:
            break
        c.drawString(x, y, line)
        y -= leading
        n += 1
    return y


def footer(c, page, total=10):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, 12, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FONT, 6.5)
    c.drawString(ML, 3.5, "Go Study!  |  Conference & competitive brief  |  Internal  |  Sep 2026")
    c.drawRightString(W - MR, 3.5, f"{page} / {total}")


def header_bar(c, kicker, title):
    c.setFillColor(NAVY)
    c.rect(0, H - 28, W, 28, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 30, W, 2.2, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FONT, 7)
    c.drawString(ML, H - 11, kicker.upper())
    c.setFont(FONTB, 11)
    c.drawString(ML, H - 23, title)
    return H - 36


def box(c, x, y, w, h, fill=PALE, stroke=RULE):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.4)
    c.roundRect(x, y, w, h, 2, fill=1, stroke=1)


def hrule(c, y, x=None, w=None):
    c.setStrokeColor(RULE)
    c.setLineWidth(0.5)
    x0 = ML if x is None else x
    c.line(x0, y, (x0 + (CW if w is None else w)), y)


def fig_to_reader(fig):
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=160, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return ImageReader(buf)


def chart_radar():
    labels = [
        "APC math",
        "Class/serie",
        "Simulator",
        "Offline PDF",
        "Video",
        "Mocks",
        "Official SIS",
        "Volume",
        "Parent ops",
        "HW AI",
    ]
    series = {
        "Go Study!": [9, 9.2, 9, 8, 2, 3, 1, 5, 3.2, 2],
        "uLesson": [2, 3, 3, 4, 9, 8, 1, 8, 7, 6],
        "Pronote": [7, 4, 1, 2, 1, 1, 10, 3, 9, 1],
        "Annabac": [3, 6, 1, 6, 4, 3, 1, 8, 2, 1],
    }
    N = len(labels)
    ang = np.linspace(0, 2 * np.pi, N, endpoint=False)
    ang = np.concatenate([ang, [ang[0]]])
    fig, ax = plt.subplots(figsize=(3.55, 3.35), subplot_kw=dict(polar=True))
    fig.patch.set_facecolor("#F3F5F4")
    ax.set_facecolor("#F3F5F4")
    colors = ["#1A6B6B", "#C4A35A", "#0F2A3A", "#8B3A3A"]
    for (name, vals), col in zip(series.items(), colors):
        v = vals + [vals[0]]
        ax.plot(ang, v, color=col, lw=1.3, label=name)
        ax.fill(ang, v, color=col, alpha=0.09)
    ax.set_xticks(ang[:-1])
    ax.set_xticklabels(labels, fontsize=6)
    ax.tick_params(axis="x", pad=2)
    ax.set_ylim(0, 10)
    ax.set_yticks([5, 10])
    ax.set_yticklabels(["5", "10"], fontsize=5.5, color="#4A5560")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.06), ncol=4, fontsize=6, frameon=False)
    ax.set_title("Capability 0-10 (not users)", fontsize=7.5, pad=8, color="#0F2A3A", fontweight="bold")
    fig.tight_layout()
    return fig_to_reader(fig)


def chart_bars():
    cats = [
        "Bulletin OS (APC)",
        "Exact 1ere vs Tle",
        "What-if yearly avg",
        "Offline papers+books",
        "Video library",
        "CBT / mocks",
        "School SIS grades",
        "Corriges depth",
        "Parent reports",
        "Camera homework AI",
    ]
    gs = [9.5, 9.5, 9.2, 8.2, 1.8, 2.8, 1.2, 4.5, 2.5, 1.5]
    best = [7.0, 6.0, 4.0, 7.0, 9.2, 9.0, 10.0, 8.5, 8.0, 9.5]
    fig, ax = plt.subplots(figsize=(6.4, 3.55))
    fig.patch.set_facecolor("#F3F5F4")
    ax.set_facecolor("#F3F5F4")
    y = np.arange(len(cats))
    h = 0.38
    ax.barh(y + h / 2, gs, h, label="Go Study!", color="#1A6B6B")
    ax.barh(y - h / 2, best, h, label="Best rival on that axis", color="#C4A35A")
    ax.set_yticks(y)
    ax.set_yticklabels(cats, fontsize=7)
    ax.set_xlim(0, 10.5)
    ax.set_xlabel("Capability score 0-10 (author assessment of product, not downloads)", fontsize=6.5)
    ax.tick_params(axis="x", labelsize=6.5)
    ax.invert_yaxis()
    ax.legend(fontsize=7, frameon=False, loc="lower right")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.set_title("Where Go Study! leads vs the strongest rival on each axis", fontsize=8, color="#0F2A3A", fontweight="bold")
    fig.tight_layout()
    return fig_to_reader(fig)


def chart_stack():
    labels = ["Plan year\n(bulletin)", "Find the\nright paper", "Learn the\nlesson", "Drill under\nexam clock", "Official\nmarks"]
    data = {
        "Go Study!": [9.2, 8.4, 2.2, 3.0, 1.4],
        "Video apps": [2.5, 3.5, 9.0, 6.5, 1.5],
        "CBT apps": [3.0, 3.2, 3.5, 9.0, 1.5],
        "Pronote/ENT": [6.5, 2.0, 1.5, 1.5, 9.8],
        "WhatsApp PDFs": [0.8, 7.2, 1.5, 2.0, 0.5],
    }
    fig, ax = plt.subplots(figsize=(6.5, 2.55))
    fig.patch.set_facecolor("#F3F5F4")
    ax.set_facecolor("#F3F5F4")
    colors = ["#1A6B6B", "#0F2A3A", "#C4A35A", "#5C6B73", "#8B3A3A"]
    x = np.arange(len(labels))
    n = len(data)
    w = 0.15
    for i, ((name, vals), col) in enumerate(zip(data.items(), colors)):
        ax.bar(x + (i - n / 2) * w + w / 2, vals, w, label=name, color=col)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=6.5)
    ax.set_ylabel("Relative strength 0-10", fontsize=6.5)
    ax.set_ylim(0, 10.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.set_title("Five student jobs — relative product strength (not market share)", fontsize=7.5, color="#0F2A3A", fontweight="bold", pad=18)
    fig.legend(list(data.keys()), loc="upper center", ncol=5, frameon=False, fontsize=6, bbox_to_anchor=(0.5, 1.02))
    fig.tight_layout()
    fig.subplots_adjust(top=0.84)
    return fig_to_reader(fig)


def chart_roadmap():
    fig, ax = plt.subplots(figsize=(6.4, 2.15))
    fig.patch.set_facecolor("#F3F5F4")
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 4)
    ax.axis("off")
    ax.set_title("90-day conference follow-through (product, not vanity metrics)", fontsize=8, color="#0F2A3A", fontweight="bold", loc="left")
    items = [
        (0.2, 2.6, 3.6, 1.0, "#1A6B6B", "D1-30  School stand\n1ere/Tle demo + codes"),
        (4.0, 2.6, 3.6, 1.0, "#0F2A3A", "D31-60  Taxonomy QA\ncorriges tagged by serie"),
        (7.8, 2.6, 3.9, 1.0, "#C4A35A", "D61-90  One drill loop\n(interro-style, not video)"),
        (0.2, 0.45, 5.5, 1.15, "#5C6B73", "Do not: clone uLesson video factory"),
        (5.9, 0.45, 5.8, 1.15, "#8B3A3A", "Do not: mix 1ere C with Tle C ever"),
    ]
    for x, y, w, h, col, txt in items:
        ax.add_patch(plt.Rectangle((x, y), w, h, facecolor=col, edgecolor="none"))
        ax.text(x + 0.12, y + h / 2, txt, va="center", ha="left", color="white", fontsize=6.4, fontweight="bold")
    fig.tight_layout()
    return fig_to_reader(fig)


def page1(c):
    y = header_bar(c, "Part A  |  Pages 1-5  |  Product for conference organisers", "Go Study!  —  what it can do, who it is for, how to show it")
    # identity strip
    box(c, ML, y - 52, CW, 50, NAVY, NAVY)
    c.setFillColor(GOLD)
    c.setFont(FONTB, 8)
    c.drawString(ML + 8, y - 14, "ONE SENTENCE")
    c.setFillColor(white)
    y2 = draw_wrapped(
        c,
        "Go Study! tells a student, in bulletin language, if they are on track for the year — and puts the right papers and books for their real class (6eme-Tle, series C/D/A4/G…) in their pocket, offline.",
        ML + 8,
        y - 28,
        FONT,
        8.2,
        CW - 16,
        11,
        white,
        3,
    )
    y = y - 62
    # 4 stats
    stats = [
        ("3", "grading systems", "APC / Togo, French bulletin, Nigerian GPA/CGPA"),
        ("2", "libraries", "Exam papers + books, exact class filters"),
        ("1", "simulator", "What-if marks vs yearly target"),
        ("FR/EN", "UI", "Guest or account, web + Android"),
    ]
    sw = (CW - 9) / 4
    for i, (a, b, d) in enumerate(stats):
        x = ML + i * (sw + 3)
        box(c, x, y - 44, sw, 42)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 14)
        c.drawString(x + 6, y - 18, a)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 7)
        c.drawString(x + 6, y - 28, b.upper())
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.2)
        draw_wrapped(c, d, x + 6, y - 38, FONT, 6.2, sw - 12, 8, MUTED, 1)
    y -= 58
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "The problem in the hall")
    y -= 3
    hrule(c, y)
    y -= 12
    cols = [
        "Students know last composition but not the yearly average if remaining interros and devoirs go a certain way. Calculators and rumours replace a bulletin formula.",
        "Past papers live in WhatsApp, Facebook (EduSocial-style pages), and generic Play Store dumps. 1ere C mixes with Tle C. Files die when the phone is wiped.",
        "Video apps teach WAEC/JAMB or French metro curriculum. They do not compute APC moyenne classe + composition with coefficients and optional 40/60.",
    ]
    cw = (CW - 8) / 3
    for i, t in enumerate(cols):
        x = ML + i * (cw + 4)
        box(c, x, y - 68, cw, 66)
        c.setFillColor(GOLD)
        c.setFont(FONTB, 7)
        c.drawString(x + 6, y - 12, f"0{i+1}")
        draw_wrapped(c, t, x + 6, y - 24, FONT, 7.2, cw - 12, 9.4, INK, 5)
    y -= 86
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Who sits in the room")
    y -= 3
    hrule(c, y)
    y -= 11
    rows = [
        ("College / lycee APC", "Interro, devoir, composition, coefficients, target /20. Primary use case for the APC market."),
        ("French-style bulletin", "Same three marks plus class comparison and appreciation. Sibling mode, not a separate product."),
        ("Nigerian university", "Credit units, 0-100 scores, GPA/CGPA, degree class. Same app, different maths adapter."),
        ("Parents / teachers", "Live picture of the year. Teachers do not need a portal to understand the student story."),
        ("Organisers / schools", "One taxonomy: 1ere C is not Tle C. Stand demos must pick a real serie, not 'lycee'."),
    ]
    for title, body in rows:
        box(c, ML, y - 22, CW, 21)
        c.setFillColor(TEAL)
        c.rect(ML, y - 22, 3, 21, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 7.5)
        c.drawString(ML + 10, y - 10, title)
        c.setFillColor(MUTED)
        c.setFont(FONT, 7)
        c.drawString(ML + 10, y - 19, body[:118] + ("…" if len(body) > 118 else ""))
        y -= 24
    y -= 14
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Four promises on the welcome screen (use these as slide titles)")
    y -= 3
    hrule(c, y)
    y -= 12
    promises = [
        ("Track every score", "Live average as marks land. Interro x1, devoir x1, composition x2 in the default APC weighting — plus official two-step moyenne."),
        ("Know what you need", "Alerts when a subject drags the year or a target becomes unreachable with remaining slots."),
        ("Plan the strategy", "Simulator: fill empty slots, save a plan ('14 in maths compo still hits 12')."),
        ("Papers in the pocket", "Filter class + year + exam type. Untyped files = Exercices. Download offline. Books catalog beside papers."),
    ]
    pw = (CW - 6) / 2
    for i, (t, b) in enumerate(promises):
        col = i % 2
        row = i // 2
        x = ML + col * (pw + 6)
        yy = y - row * 52
        box(c, x, yy - 46, pw, 46)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 8)
        c.drawString(x + 7, yy - 13, f"{i+1}.  {t}")
        draw_wrapped(c, b, x + 7, yy - 25, FONT, 7, pw - 14, 9.2, MUTED, 3)
    y = y - 108
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "What you put on a slide vs what you put on the phone")
    y -= 3
    hrule(c, y)
    y -= 10
    rows = [
        ("Slide (30s)", "Phone in the visitor's hand", "Do not"),
        ("Four promises", "Guest + 1ere C + two subjects", "A 20-slide company history"),
        ("1ere C vs Tle C", "Filter switch, same subject", "A folder named 'Lycee'"),
        ("Empty composition slot", "Simulator slider vs target", "A fake 16/20 with all marks filled"),
        ("Offline", "My downloads after airplane mode", "Streaming a 80MB PDF on hall Wi-Fi"),
        ("Honest limit", "Courses are links; no video LMS", "'We are uLesson for Togo'"),
    ]
    c.setFillColor(PALE2)
    c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont(FONTB, 6.5)
    c.drawString(ML + 4, y, rows[0][0])
    c.drawString(ML + 95, y, rows[0][1])
    c.drawString(ML + 330, y, rows[0][2])
    y -= 12
    c.setFont(FONT, 6.7)
    for i, r in enumerate(rows[1:]):
        if i % 2 == 0:
            c.setFillColor(PALE)
            c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(ML + 4, y, r[0])
        c.drawString(ML + 95, y, r[1])
        c.drawString(ML + 330, y, r[2])
        y -= 11
    y -= 8
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "MC / host lines (read, do not paraphrase into startup talk)")
    y -= 3
    hrule(c, y)
    y -= 10
    lines = [
        '"This is not the ministry. It is the bulletin on the phone, plus the papers for YOUR serie."',
        '"We will show 1ere D, then Tle D. If those lists mix, we failed — tell us."',
        '"Enter the notes you already have. The empty composition is the point of the slider."',
        '"WhatsApp is faster. This is the copy that still opens in airplane mode in June."',
        '"If you want video cours, that is another product. We will not fake it today."',
        '"Codes use the name in the Go Study! profile, not necessarily the name on the ID card."',
        '"Parents: the child types the marks. We do not pull from the school server."',
        '"Teachers: coefficients and the two-step moyenne are in settings, including 40/60."',
    ]
    for t in lines:
        box(c, ML, y - 16, CW, 15)
        c.setFillColor(INK)
        c.setFont(FONT, 6.8)
        c.drawString(ML + 6, y - 11, t[:108])
        y -= 16
    footer(c, 1)


def page2(c):
    y = header_bar(c, "Part A  |  Capabilities  |  Do not skip setup when you demo", "What the student can actually do in the app")
    items = [
        ("01  Setup once", "French or English. Sign-in or guest. Grading system, class / serie / semester, subjects + coefficients, target average. Local-first (phone storage); signed-in users can sync."),
        ("02  Dashboard", "Current average vs target. Per-subject interro / devoir / composition. Performance alerts. Streak + mark history. Semesters. In-app announcements. Short product tour."),
        ("03  Simulator", "Sliders on empty slots. Live yearly average vs target. Save strategies. This is the moment that lands with a hall — 'who has done this with a calculator?'"),
        ("04  Planner / marks", "Add/edit subjects. Nigerian vs APC/French input sheets. Not-done marks excluded from APC moyenne. Optional 40/60 split in settings."),
        ("05  Week + reminders", "Monday-Friday timetable, today's subjects, local packing/revision reminders. Rolling window on native Android."),
        ("06  Exam papers", "Baccalaureat, Probatoire, BEPC, CEPD, CAP, concours, annales, composition, devoir, interro. Missing type = Exercices. Search, grid, preview, in-app PDF, download counts."),
        ("07  Books", "Separate catalog. Download, offline open, native share. Detail page per book."),
        ("08  My downloads", "Offline papers + books, storage use, delete, re-fetch from cloud. Survives bad network after first fetch."),
        ("09  Courses", "Catalog posts (level, category, featured). External link to the real class — a 'what next' layer, not a video LMS."),
        ("10  Feedback", "Request features, upvote, status labels (review / planned / in progress / done). Conference line: built with the room."),
        ("11  Settings", "Light/dark/system, accent, FR/EN, weights, rounding, notifications, sign-out, wipe local data. Android APK update prompt when admins publish."),
        ("12  Access model", "Core tracking + library usable without a paywall. Optional premium (remote toggle): redeemable codes, subject packs (~500 FCFA) vs all-subjects (~1 500 FCFA) for extra prep tools."),
    ]
    h = 42
    gap = 2
    for i, (t, b) in enumerate(items):
        col = i % 2
        row = i // 2
        x = ML + col * ((CW - 4) / 2 + 4)
        yy = y - row * (h + gap)
        box(c, x, yy - h, (CW - 4) / 2, h)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 7.5)
        c.drawString(x + 6, yy - 12, t)
        draw_wrapped(c, b, x + 6, yy - 24, FONT, 7, (CW - 4) / 2 - 12, 9.2, INK, 2)
    y = y - 6 * (42 + 2) - 6
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Eight-minute first session (stand or stage)")
    y -= 3
    hrule(c, y)
    y -= 10
    steps = [
        ("0:00", "Language FR/EN. Guest. Do not force sign-in."),
        ("0:40", "Grading = APC. Class = the visitor's real serie."),
        ("1:30", "Two subjects + coefficients from their bulletin."),
        ("2:20", "Target 12 or 14. Enter one interro. Watch the average."),
        ("3:20", "Open simulator. Leave compo empty. Drag. Save strategy."),
        ("4:40", "Library: their class only. Then Tle same serie — lists differ."),
        ("6:00", "Download one paper. Airplane mode. Open from My downloads."),
        ("7:20", "Books tab 20s. Feedback: 'what is missing for YOUR class'."),
    ]
    sw = (CW - 6) / 2
    for i, (t, b) in enumerate(steps):
        col, row = i % 2, i // 2
        x = ML + col * (sw + 6)
        yy = y - row * 22
        box(c, x, yy - 20, sw, 20)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 7)
        c.drawString(x + 5, yy - 13, t)
        c.setFillColor(INK)
        c.setFont(FONT, 6.7)
        c.drawString(x + 36, yy - 13, b[:78])
    y = y - 4 * 22 - 10
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Do not open on stage  |  If they already live in WhatsApp")
    y -= 3
    hrule(c, y)
    y -= 10
    left = [
        "Admin upload / debug / fix-state URLs",
        "Premium payment sheet unless codes are the offer",
        "Nigerian CGPA in a lycee hall",
        "A Tle paper while the mouth says 1ere",
        "Settings wipe-data (you will lose the demo)",
        "A 80MB book on hall Wi-Fi",
    ]
    right = [
        "Ask which class/serie the group uses.",
        "Show the same paper, labelled, in My downloads.",
        "Show 1ere vs Tle so the group admin sees the mess they have.",
        "Do not insult the group; offer it as backup shelf.",
        "Collect the missing type (devoir vs composition).",
        "Leave with one downloaded file on THEIR phone.",
    ]
    hw = (CW - 8) / 2
    for i in range(6):
        yy = y - i * 18
        box(c, ML, yy - 16, hw, 16)
        box(c, ML + hw + 8, yy - 16, hw, 16)
        c.setFillColor(RED)
        c.setFont(FONTB, 6.5)
        c.drawString(ML + 5, yy - 11, str(i + 1))
        c.setFillColor(INK)
        c.setFont(FONT, 6.5)
        c.drawString(ML + 16, yy - 11, left[i][:52])
        c.setFillColor(TEAL)
        c.setFont(FONTB, 6.5)
        c.drawString(ML + hw + 13, yy - 11, str(i + 1))
        c.setFillColor(INK)
        c.setFont(FONT, 6.5)
        c.drawString(ML + hw + 24, yy - 11, right[i][:54])
    y = y - 6 * 18 - 8
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Marks the hall must hear  |  Premium honesty")
    y -= 3
    hrule(c, y)
    y -= 10
    marks = [
        ("Word", "Weight default", "Say this"),
        ("Interro", "x1, classwork", "Small test. Enters Moy_classe."),
        ("Devoir", "x1, classwork", "Homework/test. Same bucket."),
        ("Composition", "x2 in UI labels; two-step with classe", "The big one. Empty slot = simulator."),
        ("Coefficient", "Subject weight", "Maths 4 vs EPS 1 changes the year."),
        ("40/60", "Optional split", "Only if THAT school uses it. Settings."),
        ("Not done", "Excluded", "Do not average a blank as zero by accident."),
        ("Target", "/20 APC", "12 mention / 14 bien. Student picks."),
        ("Exercices", "Exam type", "No official type on the PDF."),
    ]
    c.setFillColor(PALE2)
    c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
    c.setFont(FONTB, 6.4)
    c.setFillColor(NAVY)
    c.drawString(ML + 3, y, marks[0][0])
    c.drawString(ML + 70, y, marks[0][1])
    c.drawString(ML + 220, y, marks[0][2])
    y -= 12
    c.setFont(FONT, 6.5)
    for i, r in enumerate(marks[1:]):
        if i % 2 == 0:
            c.setFillColor(PALE)
            c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(ML + 3, y, r[0])
        c.drawString(ML + 70, y, r[1][:32])
        c.drawString(ML + 220, y, r[2][:70])
        y -= 11
    footer(c, 2)


def page3(c):
    y = header_bar(c, "Part A  |  Library taxonomy is the product", "Class lists, exam types, and the live-demo rule")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Official class list the filters use (exact string match — no prefix tricks)")
    y -= 3
    hrule(c, y)
    y -= 10
    groups = [
        ("College", "6eme, 5eme, 4eme, 3eme"),
        ("2nde", "2nde, 2nde A4, 2nde CD, 2nde E, 2nde F, 2nde G"),
        ("1ere", "1ere, 1ere A4, 1ere C, 1ere D, 1ere E, 1ere F, 1ere G"),
        ("Tle", "Tle, Tle A4, Tle C, Tle D, Tle E, Tle F, Tle G"),
        ("Other", "CEPD, CAP, Primaire, CP1-CM2, Autre (mixed compilations)"),
    ]
    gh = 18
    for t, b in groups:
        box(c, ML, y - gh, 52, gh - 2, PALE2)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 7)
        c.drawString(ML + 4, y - 12, t)
        c.setFont(FONT, 7.2)
        c.setFillColor(INK)
        c.drawString(ML + 58, y - 12, b)
        y -= gh
    y -= 6
    box(c, ML, y - 36, CW, 34, HexColor("#FFF8E8"), GOLD)
    c.setFillColor(NAVY)
    c.setFont(FONTB, 8)
    c.drawString(ML + 8, y - 12, "Live demo rule (print this on the run-of-show)")
    draw_wrapped(
        c,
        "Pick one real class (e.g. 1ere D) and stay on it until the library segment. Then switch to Tle D and show the lists do not mix. That single contrast proves you understand the school system. Never demo 'lycee' as one bucket.",
        ML + 8,
        y - 24,
        FONT,
        7.2,
        CW - 16,
        9.4,
        INK,
        2,
    )
    y -= 46
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Exam types + tagging rules already in the product")
    y -= 3
    hrule(c, y)
    y -= 11
    rules = [
        ("Types", "BEPC, CEPD, CAP, Baccalaureat, Probatoire, Concours, Annales, Composition, Devoir, Interro, Exercices."),
        ("No type", "Call it Exercices. Practice / revision dumps go here too."),
        ("BAC1 / Probatoire", "1ere — never Tle."),
        ("BAC II / Baccalaureat", "Tle."),
        ("G-LOME", "Region, not serie G."),
        ("2nd semestre", "Not 2nde."),
        ("Mixed 'all classes'", "Autre — do not stuff into 3eme or Tle C."),
    ]
    for t, b in rules:
        c.setFillColor(TEAL)
        c.setFont(FONTB, 7.5)
        c.drawString(ML, y, t)
        c.setFillColor(INK)
        c.setFont(FONT, 7.2)
        c.drawString(ML + 92, y, b)
        y -= 11
    y -= 4
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Suggested 60-75 min programme")
    y -= 3
    hrule(c, y)
    y -= 8
    agenda = [
        ("5", "Opening", "Four welcome promises. Phone in the air, not a slide wall."),
        ("10", "Onboarding", "Create 1ere C. Two subjects + coefficients. Target 12 or 14/20."),
        ("10", "Dashboard", "Enter interro + devoir. Average moves. Point at a weak-subject alert."),
        ("10", "Simulator", "Leave composition empty; drag slider; save strategy."),
        ("15", "Library", "1ere C then Tle C. Year + type. Open PDF, download, show offline. Books if time."),
        ("5", "Schedule", "Mon-Fri subjects; mention reminders."),
        ("10", "Q&A", "Parents (data), teachers (coefficients, APC formula), students (guest vs account)."),
        ("Stand", "After", "Guest mode on a tablet. Help people pick THEIR class + serie."),
    ]
    c.setFillColor(PALE2)
    c.rect(ML, y - 12, CW, 12, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont(FONTB, 6.5)
    c.drawString(ML + 4, y - 8, "MIN")
    c.drawString(ML + 40, y - 8, "BLOCK")
    c.drawString(ML + 110, y - 8, "WHAT TO SHOW")
    y -= 14
    for a, b, d in agenda:
        c.setFont(FONTB, 7)
        c.setFillColor(TEAL)
        c.drawString(ML + 4, y, a)
        c.setFillColor(NAVY)
        c.drawString(ML + 40, y, b)
        c.setFont(FONT, 7)
        c.setFillColor(INK)
        c.drawString(ML + 110, y, d)
        y -= 11
    y -= 6
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Success after the event")
    y -= 11
    draw_wrapped(
        c,
        "Attendees leave able to (1) enter their own marks and target, (2) run one simulation, (3) find papers for their class only. Collect class + serie on the contact sheet, not only 'lycee'. If you sell or gift codes, write the profile name rule on the flyer: Go Study! profile name, not necessarily the legal name on paper.",
        ML,
        y,
        FONT,
        7.4,
        CW,
        9.8,
        INK,
        4,
    )
    y -= 44
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Filter walkthrough — say these out loud")
    y -= 3
    hrule(c, y)
    y -= 10
    ex = [
        ("Student says", "You tap", "If the list is wrong"),
        ("Je suis en 1ere D", "Class = 1ere D (not 1ere, not Tle D)", "You used prefix match — product bug, stop demo"),
        ("C'est un devoir de maths 2024", "Subject + year + Devoir", "File tagged Exercices — say so, do not hide it"),
        ("Le bac", "Tle + Baccalaureat (or serie)", "BAC1 is Probatoire/1ere — do not open Tle"),
        ("On a un recueil pour tout le lycee", "Autre", "Never park it in 3eme or Tle C"),
        ("G-LOME sur le titre", "Ignore region; use the class in the filename/body", "Do not tag 1ere G from Lome"),
        ("2e semestre", "Keep the class; semestre is not 2nde", "A classic false 2nde"),
    ]
    c.setFillColor(PALE2)
    c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
    c.setFont(FONTB, 6.4)
    c.setFillColor(NAVY)
    c.drawString(ML + 3, y, ex[0][0])
    c.drawString(ML + 130, y, ex[0][1])
    c.drawString(ML + 340, y, ex[0][2])
    y -= 12
    c.setFont(FONT, 6.5)
    for i, r in enumerate(ex[1:]):
        if i % 2 == 0:
            c.setFillColor(PALE)
            c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(ML + 3, y, r[0][:28])
        c.drawString(ML + 130, y, r[1][:48])
        c.drawString(ML + 340, y, r[2][:42])
        y -= 11
    y -= 8
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Hall geography (60 min) — one room, two phones")
    y -= 3
    hrule(c, y)
    y -= 10
    geo = [
        ("Zone", "Who", "Object"),
        ("Stage table", "You", "Android A: 1ere D filled. HDMI if projector."),
        ("Stage table", "You", "Android B: empty guest. Give into the room."),
        ("Aisle", "Helper", "Collect class+serie on paper. No 'lycee'."),
        ("Back wall", "Stand", "Codes/flyers. Profile-name rule visible."),
        ("Wi-Fi", "Organiser", "Assume it dies. Pre-download 6 papers."),
        ("Spare", "You", "Browser bookmark of the web app."),
        ("Out", "Everyone", "One screenshot: average vs target."),
    ]
    c.setFillColor(PALE2)
    c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
    c.setFont(FONTB, 6.4)
    c.setFillColor(NAVY)
    c.drawString(ML + 3, y, geo[0][0])
    c.drawString(ML + 80, y, geo[0][1])
    c.drawString(ML + 150, y, geo[0][2])
    y -= 12
    c.setFont(FONT, 6.6)
    for i, r in enumerate(geo[1:]):
        if i % 2 == 0:
            c.setFillColor(PALE)
            c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(ML + 3, y, r[0])
        c.drawString(ML + 80, y, r[1])
        c.drawString(ML + 150, y, r[2][:78])
        y -= 11
    footer(c, 3)


def page4(c):
    y = header_bar(c, "Part A  |  Maths, platforms, data", "How averages work — and what is not a school SIS")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Three grading adapters (same app, different bulletin)")
    y -= 3
    hrule(c, y)
    y -= 12
    systems = [
        (
            "APC (Togolese standard)",
            "Moy_classe = mean of present classwork (interro, devoir); marks marked not-done are excluded. Moy_sem = (Moy_classe + compo)/2, truncated to 2 decimals like report-card software — or 40/60 if the school uses the split. Yearly = sum(subject_avg x coeff) / sum(coeff).",
        ),
        (
            "French-style",
            "Same three mark types plus optional class average, min/max, appreciation 1-5. Student vs class comparison. Use this if the school talks bulletin, not CGPA.",
        ),
        (
            "Nigerian university",
            "Credit units, scores 0-100, custom weighted assessments, letter grades, degree classification. Target is on the CGPA scale, not /20. Do not demo this in a lycee hall unless asked.",
        ),
    ]
    for t, b in systems:
        box(c, ML, y - 48, CW, 46)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 8)
        c.drawString(ML + 8, y - 12, t)
        draw_wrapped(c, b, ML + 8, y - 24, FONT, 7.2, CW - 16, 9.4, INK, 3)
        y -= 50
    y -= 2
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "What Go Study! is not")
    y -= 3
    hrule(c, y)
    y -= 11
    nots = [
        "Not MEPS / official ministry software. It follows official class lists and APC-style calculation; it does not issue diplomas.",
        "Not Pronote. Teachers do not push marks from a school server. The student (or parent helping) enters marks. That is a feature for informal use and a gap vs ENT.",
        "Not a video university. Courses are outbound links. Prep tools (top questions, step-by-step) are sketched / premium-gated — do not promise a full corriges video library on stage.",
        "Not iOS-first. Capacitor Android APK + responsive web. Say 'phone and browser', not 'every store'.",
    ]
    for t in nots:
        c.setFillColor(RED)
        c.setFont(FONTB, 8)
        c.drawString(ML, y, "—")
        draw_wrapped(c, t, ML + 12, y, FONT, 7.3, CW - 12, 9.6, INK, 2)
        y -= 22
    y -= 2
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Stack the organiser should know (one paragraph, not a tech talk)")
    y -= 3
    hrule(c, y)
    y -= 12
    draw_wrapped(
        c,
        "Student app: React, works as PWA and Android via Capacitor (filesystem for PDFs, local notifications, share, APK sideload updates). Backend: Supabase (auth, Postgres, storage). Admin panel uploads papers/books, courses, notifications targeted by grading system, feedback moderation, APK releases, subscription codes. Analytics exist; do not put vanity dashboards on the main stage.",
        ML,
        y,
        FONT,
        7.4,
        CW,
        9.8,
        INK,
        5,
    )
    y -= 58
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Q&A cards — memorize these four")
    y -= 3
    hrule(c, y)
    y -= 12
    qa = [
        ("Official?", "No. Student tool aligned to class lists and APC-style math."),
        ("1ere vs Tle mix?", "No. Exact class string. Demo it."),
        ("Mixed PDF compilation?", "Tagged Autre, not dumped into one serie."),
        ("Data?", "Grades first on the device; optional cloud sync when signed in. Privacy + terms in-app."),
    ]
    qw = (CW - 9) / 2
    for i, (q, a) in enumerate(qa):
        col = i % 2
        row = i // 2
        x = ML + col * (qw + 9)
        yy = y - row * 40
        box(c, x, yy - 36, qw, 36)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 7.5)
        c.drawString(x + 7, yy - 12, q)
        c.setFillColor(MUTED)
        c.setFont(FONT, 7)
        draw_wrapped(c, a, x + 7, yy - 24, FONT, 7, qw - 14, 9, MUTED, 2)
    y -= 88
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Worked APC example (use on the projector)")
    y -= 3
    hrule(c, y)
    y -= 10
    draw_wrapped(
        c,
        "Maths coeff 4: interro 12, devoir 10, compo empty. Moy_classe = 11. Moy_sem cannot finish the two-step until compo exists (or you simulate it). Physique coeff 3: all three marks present 9 / 11 / 13. Default: moy_classe=10, moy_sem=11.50 truncated. Yearly = weighted sum / sum(coeff). Simulator exists so the empty maths compo becomes a slider against the student's target, not a speech.",
        ML,
        y,
        FONT,
        7.2,
        CW,
        9.5,
        INK,
        4,
    )
    y -= 42
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Admin exists — keep it off stage")
    y -= 3
    hrule(c, y)
    y -= 10
    adm = [
        "Upload papers/books with class + year + type (Exercices if none).",
        "Edit/delete metadata when a Tle file was tagged 1ere.",
        "Notifications by grading system (APC vs Nigerian — do not spam the wrong hall).",
        "APK publish: version notes the student sees in-app.",
        "Codes for stands. Profile name on the flyer is the Go Study! name.",
        "Premium toggle is a policy switch, not a feature to demo as 'coming AI'.",
    ]
    aw = (CW - 8) / 2
    for i, t in enumerate(adm):
        col, row = i % 2, i // 2
        x = ML + col * (aw + 8)
        yy = y - row * 20
        c.setFillColor(TEAL)
        c.circle(x + 3, yy - 6, 2, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont(FONT, 6.8)
        c.drawString(x + 10, yy - 8, t[:70])
    footer(c, 4)


def page5(c):
    y = header_bar(c, "Part A  |  Close of product brief", "Talking points that survive a sceptical teacher")
    points = [
        "The maths is school maths: two-step moyenne, coefficients, optional 40/60 — not a generic GPA widget painted with a tricolour.",
        "The library is organised the way bulletins and examens are organised: class + serie + year + type.",
        "After first download, papers and books work without constant internet. That is the WhatsApp-group killer for exam week, if the taxonomy is trusted.",
        "Bilingual UI; Francophone secondary is the home turf. Nigerian university is a second island in the same binary, not the conference headline in Lome.",
        "Guest mode lets a stand convert in under three minutes. Account is for sync and codes, not a wall before value.",
    ]
    for i, t in enumerate(points):
        box(c, ML, y - 28, CW, 26)
        c.setFillColor(GOLD)
        c.setFont(FONTB, 10)
        c.drawString(ML + 8, y - 17, str(i + 1))
        draw_wrapped(c, t, ML + 24, y - 12, FONT, 7.4, CW - 32, 9.6, INK, 2)
        y -= 30
    y -= 4
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Stand kit (print, laminate, keep in the bag)")
    y -= 3
    hrule(c, y)
    y -= 11
    kit = [
        "One Android with 1ere C sample data + one with empty guest for the visitor.",
        "Flyer: four promises + class list + 'profile name for codes'.",
        "Do not show admin upload on stage. Content pipeline is back-office.",
        "If the network dies, open My downloads. That is the demo.",
        "Price talk: state YOUR event policy. Product supports free core + optional codes; do not invent national pricing on the mic.",
    ]
    for t in kit:
        c.setFillColor(TEAL)
        c.circle(ML + 3, y + 2, 2, fill=1, stroke=0)
        draw_wrapped(c, t, ML + 12, y, FONT, 7.4, CW - 12, 9.8, INK, 2)
        y -= 16
    y -= 6
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Failure modes the night before")
    y -= 3
    hrule(c, y)
    y -= 10
    fails = [
        ("Hall Wi-Fi dies", "My downloads already filled; airplane-mode rehearsal."),
        ("Visitor is Tle A4", "Have A4 sample, not only C/D. Else they think you ignore them."),
        ("Teacher asks official marks", "We are not Pronote. Student-entered. Offer that honestly."),
        ("Someone wants video cours", "Courses tab = links. Point to SchoolMouv/uLesson if that is their job."),
        ("Price ambush", "Read your event policy. Codes exist; do not invent FCFA on stage."),
        ("Wrong class in demo data", "Reset guest. Never show a Tle paper while saying 1ere."),
    ]
    fw = (CW - 6) / 2
    for i, (a, b) in enumerate(fails):
        col, row = i % 2, i // 2
        x = ML + col * (fw + 6)
        yy = y - row * 28
        box(c, x, yy - 26, fw, 26)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 6.8)
        c.drawString(x + 6, yy - 10, a)
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.4)
        draw_wrapped(c, b, x + 6, yy - 20, FONT, 6.4, fw - 12, 8, MUTED, 1)
    y = y - 90
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Anticipated questions — short answers")
    y -= 3
    hrule(c, y)
    y -= 10
    qas = [
        ("Is this legal / official?", "Legal student tool. Not a diploma. Privacy + terms in the app."),
        ("Will it steal the school's Pronote?", "No feed. Marks are typed. Different job."),
        ("Why not put every sujet?", "Taxonomy first. Autre for mixed PDFs. Completeness is a lie."),
        ("English UI for a FR hall?", "Toggle. Demo in the language of the room."),
        ("Can a parent buy a code?", "Yes if you sell codes. Profile name rule on the flyer."),
        ("iPhone?", "Browser works. Android APK is the native path today."),
        ("Cheating / leaked exams?", "Past papers and exercises. You do not traffic unreleased subjects."),
        ("Who enters wrong marks?", "The student. Simulator is a plan, not a conseil de classe."),
    ]
    qw = (CW - 6) / 2
    for i, (q, a) in enumerate(qas):
        col, row = i % 2, i // 2
        x = ML + col * (qw + 6)
        yy = y - row * 28
        box(c, x, yy - 26, qw, 26)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 6.3)
        c.drawString(x + 5, yy - 9, q[:48])
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.1)
        draw_wrapped(c, a, x + 5, yy - 18, FONT, 6.1, qw - 10, 7.8, MUTED, 1)
    y = y - 4 * 28 - 8
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Part A checklist — tick on the printout")
    y -= 3
    hrule(c, y)
    y -= 10
    ticks = [
        "Two phones charged; 1ere D sample on A; guest on B",
        "Six papers pre-downloaded (mix of series)",
        "Flyer with class list + profile-name rule",
        "Do not open admin, debug, Nigerian CGPA",
        "Say 1ere vs Tle out loud once",
        "Airplane-mode proof rehearsed",
        "Price/code policy written, not improvised",
        "Helper collects class+serie only",
        "Handoff: capability, not user count",
        "No 'we are uLesson' on the mic",
    ]
    tw = (CW - 6) / 2
    for i, t in enumerate(ticks):
        col, row = i % 2, i // 2
        x = ML + col * (tw + 6)
        yy = y - row * 14
        c.setStrokeColor(NAVY)
        c.setLineWidth(0.6)
        c.rect(x, yy - 8, 7, 7, fill=0, stroke=1)
        c.setFillColor(INK)
        c.setFont(FONT, 6.5)
        c.drawString(x + 11, yy - 7, t[:52])
    y = y - 5 * 14 - 8
    box(c, ML, y - 36, CW, 34, NAVY, NAVY)
    c.setFillColor(GOLD)
    c.setFont(FONTB, 7)
    c.drawString(ML + 8, y - 12, "HANDOFF TO PART B")
    c.setFillColor(white)
    draw_wrapped(
        c,
        "Pages 6-10: companies and channels on the same hour. Capability scores only — no user counts. Own the APC bulletin OS and the class-accurate shelf. Do not become a second-rate video LMS.",
        ML + 8,
        y - 24,
        FONT,
        7.1,
        CW - 16,
        9.2,
        white,
        2,
    )
    footer(c, 5)


def page6(c, img_stack):
    y = header_bar(c, "Part B  |  Pages 6-10  |  Market & strategy  |  users excluded from scoring", "Who else owns the student hour — and which job you should keep")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Strategy in one block")
    y -= 3
    hrule(c, y)
    y -= 11
    draw_wrapped(
        c,
        "Students do five jobs. Go Study! already binds job 1 (plan the year from the bulletin) to job 2 (open the correct paper). Rivals are stronger on jobs 3-5. Winning is not 'become an LMS'. Winning is remaining the only tool that speaks 1ere C vs Tle C and converts empty composition slots into a number the conseil de classe would recognise. Distribution still happens on WhatsApp; the product win is trust + offline + formula, not shouting louder in groups.",
        ML,
        y,
        FONT,
        7.5,
        CW,
        10,
        INK,
        5,
    )
    y -= 54
    c.drawImage(img_stack, ML, y - 158, width=CW, height=155, preserveAspectRatio=True, mask="auto")
    y -= 164
    c.setFillColor(MUTED)
    c.setFont(FONT, 6.2)
    c.drawString(ML, y, "Figure 1. Relative strength 0-10 on each student job. Not market share, not downloads.")
    y -= 12
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Four strategic plays (and the play you skip)")
    y -= 3
    hrule(c, y)
    y -= 12
    plays = [
        ("Own the bulletin OS", "Keep APC formula, coefficients, simulator, multi-semester. This is the moat video apps will not copy carefully."),
        ("Be the trusted shelf", "Exact taxonomy + offline. Out-organise EduSocial/WhatsApp, do not out-scrape them blindly."),
        ("School as channel", "Codes + stand + teacher who says 'enter your real notes'. Pronote-like data can wait."),
        ("One drill loop later", "Short interro-style practice tied to the paper just opened — not a 18k quiz factory."),
        ("Skip: video factory", "uLesson and SchoolMouv spend production like a studio. A thin course-link catalog is honest. A fake video tab is not."),
    ]
    pw = (CW - 8) / 2
    for i, (t, b) in enumerate(plays[:4]):
        col = i % 2
        row = i // 2
        x = ML + col * (pw + 8)
        yy = y - row * 48
        box(c, x, yy - 44, pw, 44)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 7.5)
        c.drawString(x + 6, yy - 12, t)
        draw_wrapped(c, b, x + 6, yy - 24, FONT, 6.8, pw - 12, 8.8, MUTED, 2)
    y -= 100
    box(c, ML, y - 32, CW, 30, HexColor("#F8EEEE"), RED)
    c.setFillColor(RED)
    c.setFont(FONTB, 7.5)
    c.drawString(ML + 8, y - 12, plays[4][0].upper())
    draw_wrapped(c, plays[4][1], ML + 8, y - 24, FONT, 7, CW - 16, 9, INK, 1)
    y -= 44
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Where students already go (channel map)")
    y -= 3
    hrule(c, y)
    y -= 10
    ch = [
        ("Channel", "Job they hire it for", "Your move"),
        ("WhatsApp groups", "Get the file today", "Be the organised offline copy, not another group"),
        ("Facebook / EduSocial", "See what dropped", "Catalog with class truth; do not race the page"),
        ("Photocopy / CDI", "Teacher-chosen sujet", "Respect it; phone is the search layer"),
        ("Pronote (if any)", "Official notes", "Do not compete; complement remaining slots"),
        ("uLesson / SchoolMouv", "Understand the chapter", "Link out; keep bulletin + papers"),
        ("Pass.ng / CBT", "WAEC clock", "Only relevant for Nigerian island, not lycee hall"),
        ("ChatGPT / Photomath", "Stuck on item 3", "Do not fake a camera solver this quarter"),
        ("YouScribe", "Long reading", "Books tab is narrower and exam-shaped"),
    ]
    c.setFillColor(PALE2)
    c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
    c.setFont(FONTB, 6.4)
    c.setFillColor(NAVY)
    c.drawString(ML + 3, y, ch[0][0])
    c.drawString(ML + 118, y, ch[0][1])
    c.drawString(ML + 280, y, ch[0][2])
    y -= 12
    c.setFont(FONT, 6.5)
    for i, r in enumerate(ch[1:]):
        if i % 2 == 0:
            c.setFillColor(PALE)
            c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(ML + 3, y, r[0][:26])
        c.drawString(ML + 118, y, r[1][:38])
        c.drawString(ML + 280, y, r[2][:58])
        y -= 11
    footer(c, 6)


def page7(c):
    y = header_bar(c, "Part B  |  Competitor cards 1/2  |  capability vs capability", "Named alternatives — what they are, where you beat them, where they beat you")
    cards = [
        (
            "WhatsApp / Telegram dumps",
            "Informal channel, not a company. Still the default 'app'. Free, social, instant, zero taxonomy.",
            "You: search, class/serie, offline library that survives the group being deleted, average+simulator in the same icon.",
            "They: zero onboarding, already on the phone, human commentary, leaked subjects the same afternoon.",
        ),
        (
            "EduSocial-style Facebook pages",
            "High-volume PDF firehose for Togo/region news + papers. Discovery engine for content you also catalogued.",
            "You: structured filters, no G-LOME mistaken for serie G, books vs papers split, in-app reader.",
            "They: cadence and reach of a media page; students already scroll there for 'sujet 2025'.",
        ),
        (
            "Generic Play 'Annales BAC Afrique' APKs",
            "Ad-supported ZIP of PDFs. Often one 'Terminale' bucket. Crashy viewers.",
            "You: exact 1ere vs Tle, Exercices vs Composition, My downloads, no surprise adware if you keep trust.",
            "They: huge file packs users already installed; SEO on Play for 'sujet bac'.",
        ),
        (
            "Annabac (Hatier) + print annales",
            "Gold-standard corriges for French bac series. Paper books teachers respect.",
            "You: APC/Togo series (A4, C, D, E, F, G), local compositions, device-native planner.",
            "They: editorial quality of corriges, brand in Francophone classrooms that follow France, print that works at 2am without battery.",
        ),
        (
            "SchoolMouv / Kartable",
            "French video + fiches for college/lycee metro programmes. Subscription pedagogy.",
            "You: bulletin simulator + local exam types (Probatoire, BEPC, CAP) the French apps ignore.",
            "They: hours of taught content, chapter structure, parents who pay for 'cours'.",
        ),
        (
            "Pronote / EcoleDirecte / ENT",
            "School system of record. Official marks, absences, homework from the establishment.",
            "You: works without a school contract; what-if on remaining slots; papers the ENT never ships.",
            "They: truth of the bulletin (not self-reported), teacher workflow, parent legal view, timetable from school.",
        ),
    ]
    h = 78
    for i, (name, who, win, lose) in enumerate(cards):
        yy = y - i * (h + 2)
        box(c, ML, yy - h, CW, h)
        c.setFillColor(NAVY)
        c.rect(ML, yy - h, 4, h, fill=1, stroke=0)
        c.setFont(FONTB, 8)
        c.drawString(ML + 12, yy - 11, name)
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.6)
        draw_wrapped(c, who, ML + 12, yy - 22, FONT, 6.6, CW - 20, 8.2, MUTED, 2)
        hw = (CW - 28) / 2
        c.setFillColor(WIN)
        c.setFont(FONTB, 6.2)
        c.drawString(ML + 12, yy - 42, "GO STUDY SURPASSES")
        draw_wrapped(c, win, ML + 12, yy - 52, FONT, 6.5, hw, 8.2, INK, 3)
        c.setFillColor(RED)
        c.setFont(FONTB, 6.2)
        c.drawString(ML + 16 + hw, yy - 42, "THEY SURPASS YOU")
        draw_wrapped(c, lose, ML + 16 + hw, yy - 52, FONT, 6.5, hw, 8.2, INK, 3)
    footer(c, 7)


def page8(c):
    y = header_bar(c, "Part B  |  Competitor cards 2/2", "Anglophone Africa, libraries, and AI tutors")
    cards = [
        (
            "uLesson",
            "Nigeria-born video LMS: lessons, live help, mocks, parent SMS/WhatsApp reports, WAEC/JAMB/NECO/BECE. Studio-grade pedagogy for Anglophone exams.",
            "You: APC /20 bulletin, 1ere/Tle series, local compositions as PDFs, what-if yearly average, guest in minutes.",
            "They: taught video, homework AI, mock exams, learning analytics, teacher Classboard, multi-country packaging.",
        ),
        (
            "Pass.ng / similar CBT (Passnaija, Myschool practice)",
            "Readiness scores, WAEC-style banks, timed mocks, school heatmaps. Exam-clock product.",
            "You: still the only 'what mark do I need in composition' tool for APC coefficients; papers as real PDFs not only MCQ.",
            "They: auto-graded volume, weak-topic detection, institutional dashboard. You have almost none of this yet.",
        ),
        (
            "YouScribe",
            "Francophone digital library subscription — books, press, some school PDFs. Content mall.",
            "You: exam taxonomy + grade planner sitting on top of files; school-class filters; free core path.",
            "They: legal catalog breadth, reading UX for long books, publisher deals you will not match this year.",
        ),
        (
            "Photomath / Gauth / ChatGPT",
            "Camera or chat solves the exercise now. Students already use this during devoirs.",
            "You: year-level planning the chatbot will not keep; organised past papers; coefficients.",
            "They: instant method on any printed exercise, 24/7, no cataloguing. They steal the 'stuck on question 3' moment.",
        ),
        (
            "Khan Academy / OpenClassrooms",
            "Global or Francophone course platforms. Mastery paths, certificates.",
            "You: local exam artifacts and bulletin math. Courses in Go Study! are a thin outbound catalog — stay honest.",
            "They: instructional design depth and brand of 'learning'. Do not claim you replaced them.",
        ),
        (
            "Print + photocopies + school CDI",
            "Still real. Teachers staple sujets. CDI has books.",
            "You: search, phone, offline, simulator beside the PDF.",
            "They: no battery, teacher-chosen corriges, zero login. Respect this in the hall; do not mock it.",
        ),
    ]
    h = 78
    for i, (name, who, win, lose) in enumerate(cards):
        yy = y - i * (h + 2)
        box(c, ML, yy - h, CW, h)
        c.setFillColor(TEAL)
        c.rect(ML, yy - h, 4, h, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont(FONTB, 8)
        c.drawString(ML + 12, yy - 11, name)
        c.setFillColor(MUTED)
        c.setFont(FONT, 6.6)
        draw_wrapped(c, who, ML + 12, yy - 22, FONT, 6.6, CW - 20, 8.2, MUTED, 2)
        hw = (CW - 28) / 2
        c.setFillColor(WIN)
        c.setFont(FONTB, 6.2)
        c.drawString(ML + 12, yy - 42, "GO STUDY SURPASSES")
        draw_wrapped(c, win, ML + 12, yy - 52, FONT, 6.5, hw, 8.2, INK, 3)
        c.setFillColor(RED)
        c.setFont(FONTB, 6.2)
        c.drawString(ML + 16 + hw, yy - 42, "THEY SURPASS YOU")
        draw_wrapped(c, lose, ML + 16 + hw, yy - 52, FONT, 6.5, hw, 8.2, INK, 3)
    footer(c, 8)


def page9(c, img_radar, img_bars):
    y = header_bar(c, "Part B  |  Scorecards  |  0-10 product scores, users omitted on purpose", "Read the axes, not the logo size")
    c.drawImage(img_radar, ML, y - 200, width=268, height=198, preserveAspectRatio=True, mask="auto")
    c.drawImage(img_bars, ML + 270, y - 200, width=293, height=198, preserveAspectRatio=True, mask="auto")
    y -= 208
    c.setFillColor(MUTED)
    c.setFont(FONT, 6.2)
    c.drawString(ML, y, "Figure 2 (left) four-way radar. Figure 3 (right) Go Study! vs strongest rival per axis. Author assessment of shipped product, Sep 2026.")
    y -= 12
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "How to read this without lying to yourself")
    y -= 3
    hrule(c, y)
    y -= 11
    bullets = [
        "A 9 on 'class/serie filter' means the product refuses to mix 1ere C and Tle C. Most PDF apps score 2-4 here even with 'more files'.",
        "A 2 on video is correct. Do not raise it with a YouTube webview and call it pedagogy.",
        "Pronote's 10 on official feed is structural: they are the school. You cannot beat that with better UI; you beat it by existing when the school has no ENT.",
        "Annabac's corriges depth is editorial. Your path is tagged local sujets, not Hatier-quality overnight.",
        "If a funder asks for 'the uLesson graph', show Figure 1 (jobs) and say you are not in the video bar. That is discipline, not weakness.",
    ]
    for t in bullets:
        c.setFillColor(TEAL)
        c.rect(ML, y - 8, 2.5, 10, fill=1, stroke=0)
        y = draw_wrapped(c, t, ML + 8, y, FONT, 7.2, CW - 8, 9.4, INK, 3)
        y -= 4
    y -= 2
    # mini table
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Compact matrix (keep this table; it is the slide)")
    y -= 3
    hrule(c, y)
    y -= 10
    headers = ["Axis", "GS", "Best other", "Who is best other"]
    xs = [ML, ML + 210, ML + 250, ML + 320]
    c.setFillColor(PALE2)
    c.rect(ML, y - 3, CW, 12, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont(FONTB, 6.5)
    for htxt, x in zip(headers, xs):
        c.drawString(x + 2, y, htxt)
    y -= 12
    rows = [
        ("APC / Togo bulletin formula", "9", "7", "Pronote (if school uses it) — else nobody"),
        ("Exact 1ere vs Tle series", "9", "6", "Annabac series (FR metro, not Togo G/A4)"),
        ("What-if remaining marks", "9", "4", "Spreadsheets / CBT readiness (wrong formula)"),
        ("Offline papers + books", "8", "7", "YouScribe + dumps (more files, worse labels)"),
        ("Video / live teaching", "2", "9", "uLesson, SchoolMouv"),
        ("Auto-graded mocks", "3", "9", "Pass.ng / uLesson quizzes"),
        ("Official school marks", "1", "10", "Pronote / ENT"),
        ("Homework camera/chat AI", "2", "10", "Photomath / Gauth / ChatGPT"),
        ("Parent weekly report ops", "3", "8", "uLesson SMS/WhatsApp reports"),
        ("Editorial corriges", "4", "9", "Annabac print + teacher packs"),
    ]
    c.setFont(FONT, 6.6)
    for i, r in enumerate(rows):
        if i % 2 == 0:
            c.setFillColor(PALE)
            c.rect(ML, y - 3, CW, 11, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(xs[0] + 2, y, r[0])
        c.setFont(FONTB, 6.6)
        c.drawString(xs[1] + 2, y, r[1])
        c.setFont(FONT, 6.6)
        c.drawString(xs[2] + 2, y, r[2])
        c.drawString(xs[3] + 2, y, r[3][:42])
        y -= 11
    y -= 6
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Implications (write these in the margin of the printed copy)")
    y -= 3
    hrule(c, y)
    y -= 11
    impl = [
        "Lead with axes 9/9/9 (formula, serie, simulator). That is the conference story.",
        "Admit axes 1-3 in public: SIS, video, camera AI. Credit Pronote, uLesson, Photomath by name — teachers relax.",
        "Volume (5) is a content ops problem, not a pitch problem. Do not claim 'complete annales'.",
        "Mocks (3) is the only adjacent build that still looks like school (interro), not television.",
        "Parent ops (3) can wait; a PDF export of the year beats SMS theatre this quarter.",
    ]
    for t in impl:
        c.setFillColor(TEAL)
        c.rect(ML, y - 7, 2.2, 9, fill=1, stroke=0)
        y = draw_wrapped(c, t, ML + 8, y, FONT, 7.1, CW - 8, 9.2, INK, 2)
        y -= 2
    footer(c, 9)


def page10(c, img_road):
    y = header_bar(c, "Part B  |  Decisions  |  end of brief", "What to do with the comparison — 90 days and conference language")
    c.drawImage(img_road, ML, y - 128, width=CW, height=122, preserveAspectRatio=True, mask="auto")
    y -= 136
    c.setFillColor(MUTED)
    c.setFont(FONT, 6.2)
    c.drawString(ML, y, "Figure 4. Sequence, not a vision deck. Skip video; never break class taxonomy.")
    y -= 12
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Conference language: true sentences vs bait")
    y -= 3
    hrule(c, y)
    y -= 11
    pairs = [
        (
            "Say: 'This is the bulletin and the shelf for your serie.'",
            "Do not say: 'We are the African uLesson' or 'AI will mark your bac.'",
        ),
        (
            "Say: '1ere C papers stay in 1ere C. Tle C is another list.'",
            "Do not say: 'We have all sujets' (you do not; dumps will always have a file you lack).",
        ),
        (
            "Say: 'Enter the marks you already have; see the year.'",
            "Do not say: 'We replace the school' (Pronote owners in the room will shut you down).",
        ),
        (
            "Say: 'Download before exam week.'",
            "Do not say: 'Works fully offline forever' without showing My downloads first.",
        ),
    ]
    for a, b in pairs:
        box(c, ML, y - 28, CW * 0.52 - 4, 26, HexColor("#E7F0EC"))
        box(c, ML + CW * 0.52, y - 28, CW * 0.48, 26, HexColor("#F8EEEE"))
        draw_wrapped(c, a, ML + 5, y - 10, FONT, 6.7, CW * 0.52 - 14, 8.4, WIN, 2)
        draw_wrapped(c, b, ML + CW * 0.52 + 5, y - 10, FONT, 6.7, CW * 0.48 - 12, 8.4, RED, 2)
        y -= 30
    y -= 2
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "If you only remember five competitive facts")
    y -= 3
    hrule(c, y)
    y -= 12
    facts = [
        "1. Informal PDF channels beat you on speed and social proof; you beat them on taxonomy, offline shelf, and year planning.",
        "2. uLesson/SchoolMouv beat you on teaching; you beat them on APC bulletin + local class lists. Do not fight their studio.",
        "3. Pronote beats you on truth of marks; you beat it by existing without a school IT project.",
        "4. Annabac beats you on corriges prestige; you beat it on APC series and compositions that Hatier will not typeset.",
        "5. Photomath beats you on the stuck-now moment; you beat it on the year. Keep both jobs in the story, never pretend you solved question 3 with a camera.",
    ]
    for t in facts:
        y = draw_wrapped(c, t, ML, y, FONT, 7.3, CW, 9.6, INK, 2)
        y -= 3
    y -= 6
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(ML, y, "Decision log after the conference (fill the right column in ink)")
    y -= 3
    hrule(c, y)
    y -= 10
    dec = [
        ("Decision", "Default if you freeze", "Your note"),
        ("Sell codes at the stand?", "Only if inventory is printed tonight", ""),
        ("Lead demo class?", "1ere D then Tle D", ""),
        ("Promise video?", "No. Link out.", ""),
        ("Collect contacts as?", "Class + serie, not 'lycee'", ""),
        ("Next content push?", "Corriges tagged by serie, not random PDFs", ""),
        ("Build mocks?", "Interro-style on opened paper, 90-day cap", ""),
        ("Talk iOS?", "Browser. Do not date an App Store.", ""),
        ("Compare to uLesson?", "Jobs chart. You are not in the video bar.", ""),
    ]
    c.setFillColor(PALE2)
    c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
    c.setFont(FONTB, 6.4)
    c.setFillColor(NAVY)
    c.drawString(ML + 3, y, dec[0][0])
    c.drawString(ML + 130, y, dec[0][1])
    c.drawString(ML + 400, y, dec[0][2])
    y -= 12
    c.setFont(FONT, 6.5)
    for i, r in enumerate(dec[1:]):
        if i % 2 == 0:
            c.setFillColor(PALE)
            c.rect(ML, y - 2, CW, 11, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(ML + 3, y, r[0][:28])
        c.drawString(ML + 130, y, r[1][:58])
        c.setStrokeColor(RULE)
        c.setLineWidth(0.4)
        c.rect(ML + 398, y - 2, CW - 402, 10, fill=0, stroke=1)
        y -= 11
    y -= 6
    box(c, ML, y - 48, CW, 46, NAVY, NAVY)
    c.setFillColor(GOLD)
    c.setFont(FONTB, 7.5)
    c.drawString(ML + 8, y - 12, "CLOSE")
    c.setFillColor(white)
    draw_wrapped(
        c,
        "Go Study! is the student-side operating system for an APC year plus a class-accurate paper and book library. Everyone else is a firehose, a television, an official registry, or a calculator for a different exam. Build like that. Demo like that. Do not pad the story with users you do not have or videos you did not shoot.",
        ML + 8,
        y - 24,
        FONT,
        7.1,
        CW - 16,
        9.3,
        white,
        3,
    )
    footer(c, 10)


def main():
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    radar = chart_radar()
    bars = chart_bars()
    stack = chart_stack()
    road = chart_roadmap()
    c = canvas.Canvas(os.path.abspath(OUT), pagesize=A4)
    c.setTitle("Go Study! — Conference and competitive brief")
    c.setAuthor("Go Study!")
    c.setSubject("10-page product and competitor report for conference organisers")
    for fn in (page1, page2, page3, page4, page5):
        fn(c)
        c.showPage()
    page6(c, stack)
    c.showPage()
    page7(c)
    c.showPage()
    page8(c)
    c.showPage()
    page9(c, radar, bars)
    c.showPage()
    page10(c, road)
    c.save()
    print(os.path.abspath(OUT))


if __name__ == "__main__":
    main()
