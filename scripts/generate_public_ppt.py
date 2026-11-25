import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR = os.path.join(REPO_ROOT, "docs", "presentations")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "Go-Study-Presentation-1-General-Public.pptx")

# Mascot & Assets
MASCOT_DIR = os.path.join(REPO_ROOT, "public", "mascot")
APP_ICON = os.path.join(REPO_ROOT, "public", "icon.png")

# Palette: Go Study Cartoon / Neo-brutalist Theme
BG_COLOR       = RGBColor(0xED, 0xEA, 0xE5)  # Warm sketch canvas #EDEAE5
INK_BLACK      = RGBColor(0x1A, 0x1A, 0x1A)  # Ink #1A1A1A
WHITE          = RGBColor(0xFF, 0xFF, 0xFF)  # Pure White
YELLOW         = RGBColor(0xF5, 0xC8, 0x42)  # Highlighter Yellow #F5C842
YELLOW_PALE    = RGBColor(0xFE, 0xF9, 0xC3)  # #FEF9C3
CORAL          = RGBColor(0xEF, 0x44, 0x44)  # Warm Red / Coral #EF4444
CORAL_PALE     = RGBColor(0xFE, 0xE2, 0xE2)  # #FEE2E2
SKY_BLUE       = RGBColor(0x02, 0x84, 0xC7)  # Electric Sky Blue #0284C7
SKY_BLUE_PALE  = RGBColor(0xE0, 0xF2, 0xFE)  # #E0F2FE
BLUE           = SKY_BLUE
BLUE_PALE      = SKY_BLUE_PALE
GREEN          = RGBColor(0x16, 0xA3, 0x4A)  # Success Green #16A34A
GREEN_PALE     = RGBColor(0xDC, 0xFC, 0xE7)  # #DCFCE7
PURPLE         = RGBColor(0x93, 0x33, 0xEA)  # Purple #9333EA
PURPLE_PALE    = RGBColor(0xF3, 0xE8, 0xFF)  # #F3E8FF
MUTED_TEXT     = RGBColor(0x52, 0x52, 0x5B)  # Zinc-600 #52525B
GOLD_PREMIUM   = RGBColor(0xC9, 0x96, 0x0C)  # Metallic Gold #C9960C

FONT_HEADING = "Segoe UI"
FONT_BODY = "Segoe UI"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

def create_slide():
    slide = prs.slides.add_slide(blank_layout)
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_COLOR
    bg.line.fill.background()
    return slide

def add_cartoon_card(slide, left, top, width, height, fill_color=WHITE, offset_pt=5, border_width_pt=2.2, border_color=INK_BLACK):
    if offset_pt > 0:
        shadow = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            left + Inches(offset_pt / 72.0),
            top + Inches(offset_pt / 72.0),
            width,
            height
        )
        shadow.fill.solid()
        shadow.fill.fore_color.rgb = INK_BLACK
        shadow.line.fill.background()
    
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = fill_color
    card.line.color.rgb = border_color
    card.line.width = Pt(border_width_pt)
    return card

def add_badge(slide, left, top, text, bg_color=YELLOW, text_color=INK_BLACK, width=Inches(2.4), height=Inches(0.4)):
    badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    badge.fill.solid()
    badge.fill.fore_color.rgb = bg_color
    badge.line.color.rgb = INK_BLACK
    badge.line.width = Pt(1.8)
    tf = badge.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.1)
    tf.margin_right = Inches(0.1)
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = PP_ALIGN.CENTER
    p.font.name = FONT_HEADING
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = text_color
    return badge

def add_slide_header(slide, tag_text, title_text, subtitle_text=""):
    add_badge(slide, Inches(0.8), Inches(0.42), tag_text, bg_color=YELLOW, width=Inches(2.5), height=Inches(0.36))
    
    tx_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.8))
    tf = tx_box.text_frame
    tf.word_wrap = True
    tf.margin_top = 0
    tf.margin_left = 0
    p = tf.paragraphs[0]
    p.text = title_text
    p.font.name = FONT_HEADING
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = INK_BLACK
    
    if subtitle_text:
        p2 = tf.add_paragraph()
        p2.text = subtitle_text
        p2.font.name = FONT_BODY
        p2.font.size = Pt(13)
        p2.font.color.rgb = MUTED_TEXT
        p2.space_before = Pt(3)

# -------------------------------------------------------------
# SLIDE 1: COVER SLIDE
# -------------------------------------------------------------
def build_slide_1():
    s = create_slide()
    
    # Left Hero Card
    hero = add_cartoon_card(s, Inches(0.8), Inches(0.8), Inches(7.6), Inches(5.9), fill_color=WHITE, offset_pt=8)
    
    # Top Tag
    add_badge(s, Inches(1.3), Inches(1.3), "🚀 ALL-IN-ONE ACADEMIC COMPANION", bg_color=YELLOW, width=Inches(3.6), height=Inches(0.42))
    
    # Main Title
    tb = s.shapes.add_textbox(Inches(1.3), Inches(1.85), Inches(6.6), Inches(2.2))
    tf = tb.text_frame
    tf.word_wrap = True
    p1 = tf.paragraphs[0]
    p1.text = "Go Study!"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(48)
    p1.font.bold = True
    p1.font.color.rgb = INK_BLACK
    
    p2 = tf.add_paragraph()
    p2.text = "Track your grades. Simulate success. Ace every exam."
    p2.font.name = FONT_HEADING
    p2.font.size = Pt(19)
    p2.font.bold = True
    p2.font.color.rgb = BLUE
    p2.space_before = Pt(8)
    
    p3 = tf.add_paragraph()
    p3.text = "Built specifically for students & parents navigating APC Cameroon, French secondary schools, and Nigerian Universities."
    p3.font.name = FONT_BODY
    p3.font.size = Pt(13)
    p3.font.color.rgb = MUTED_TEXT
    p3.space_before = Pt(6)
    
    # Highlights Pills
    pill_items = [
        ("📊 Smart Grade Planner", GREEN_PALE, GREEN),
        ("🎯 What-If Simulator", YELLOW_PALE, INK_BLACK),
        ("📚 100+ Past Papers & Reader", SKY_BLUE_PALE, BLUE),
        ("⚡ 100% Offline Android & Web", PURPLE_PALE, PURPLE),
    ]
    for i, (text, bg_c, tx_c) in enumerate(pill_items):
        col = i % 2
        row = i // 2
        px = Inches(1.3 + col * 3.3)
        py = Inches(4.35 + row * 0.75)
        add_badge(s, px, py, text, bg_color=bg_c, text_color=tx_c, width=Inches(3.1), height=Inches(0.55))
    
    # Right Showcase Card
    right_card = add_cartoon_card(s, Inches(8.7), Inches(0.8), Inches(3.8), Inches(5.9), fill_color=YELLOW_PALE, offset_pt=8)
    
    # Mascot image
    mascot_path = os.path.join(MASCOT_DIR, "triumph.png")
    if os.path.exists(mascot_path):
        s.shapes.add_picture(mascot_path, Inches(9.2), Inches(1.2), width=Inches(2.8))
        
    # Mascot Caption Card
    sub_box = add_cartoon_card(s, Inches(8.95), Inches(4.4), Inches(3.3), Inches(1.8), fill_color=WHITE, offset_pt=4)
    stb = s.shapes.add_textbox(Inches(9.1), Inches(4.5), Inches(3.0), Inches(1.5))
    stf = stb.text_frame
    stf.word_wrap = True
    sp1 = stf.paragraphs[0]
    sp1.text = "Say Goodbye to Exam Anxiety"
    sp1.font.name = FONT_HEADING
    sp1.font.size = Pt(14)
    sp1.font.bold = True
    sp1.font.color.rgb = INK_BLACK
    
    sp2 = stf.add_paragraph()
    sp2.text = "Know your exact standing, simulate missing marks before exam day, and download revision past papers in 1 tap."
    sp2.font.name = FONT_BODY
    sp2.font.size = Pt(11)
    sp2.font.color.rgb = MUTED_TEXT
    sp2.space_before = Pt(4)

# -------------------------------------------------------------
# SLIDE 2: THE REAL PROBLEMS STUDENTS & PARENTS FACE
# -------------------------------------------------------------
def build_slide_2():
    s = create_slide()
    add_slide_header(
        s,
        "⚠️ THE PROBLEM",
        "Why Traditional Studying & Grade Tracking Causes Unneeded Stress",
        "Most students don't fail from lack of effort — they fail from lack of clarity and scattered resources."
    )
    
    problems = [
        (
            "1. Grade Blindness",
            "Students calculate averages by hand on scraps of paper or wait for the end-of-term report card — when it's already too late to recover falling marks.",
            CORAL_PALE,
            CORAL,
            "❌ No warning before failing"
        ),
        (
            "2. Exam Paper Scramble",
            "Official past exam papers (Bac, Probatoire, BEPC, Compositions) are scattered across unreliable websites, photocopied poorly, or locked behind paywalls.",
            YELLOW_PALE,
            INK_BLACK,
            "❌ Wasted time & money"
        ),
        (
            "3. The 'What-If' Guesswork",
            "Students ask: 'How much do I need in Math or Physics to pass or get honors?' Nobody knows the exact point threshold with weighted coefficients.",
            SKY_BLUE_PALE,
            BLUE,
            "❌ Paralyzing exam fear"
        ),
        (
            "4. Complex Grading Systems",
            "Cameroon APC (40/60 compo splits), French benchmarks, and Nigerian 5.0 CGPAs have strict math rules that students struggle to track manually.",
            PURPLE_PALE,
            PURPLE,
            "❌ Confusing academic rules"
        ),
    ]
    
    card_w = Inches(2.7)
    card_h = Inches(4.6)
    card_y = Inches(2.0)
    
    for i, (title, desc, bg_c, accent_c, tag) in enumerate(problems):
        card_x = Inches(0.8 + i * 2.95)
        add_cartoon_card(s, card_x, card_y, card_w, card_h, fill_color=WHITE, offset_pt=5)
        
        # Pill on card
        add_badge(s, card_x + Inches(0.2), card_y + Inches(0.25), tag, bg_color=bg_c, text_color=accent_c, width=Inches(2.3), height=Inches(0.35))
        
        # Text
        tb = s.shapes.add_textbox(card_x + Inches(0.2), card_y + Inches(0.75), Inches(2.3), Inches(3.4))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(17)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        
        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(12)
        p2.font.color.rgb = MUTED_TEXT
        p2.space_before = Pt(8)
        
    # Mascot corner badge
    mascot_think = os.path.join(MASCOT_DIR, "think.png")
    if os.path.exists(mascot_think):
        s.shapes.add_picture(mascot_think, Inches(11.4), Inches(0.4), width=Inches(1.3))

# -------------------------------------------------------------
# SLIDE 3: MEET GO STUDY! (THE SOLUTION)
# -------------------------------------------------------------
def build_slide_3():
    s = create_slide()
    add_slide_header(
        s,
        "💡 THE SOLUTION",
        "Meet Go Study! — Your Pocket Academic Strategist",
        "A single, lightweight, distraction-free app designed to turn academic chaos into clear steps to success."
    )
    
    # Left 3 Pillars
    pillars = [
        (
            "🎯 Clear Target-Driven Learning",
            "Set your goal (e.g., 14.0/20 or 4.5 First Class CGPA). The app constantly shows your current pace, remaining points needed, and alerts you before danger zones.",
            GREEN_PALE,
            GREEN
        ),
        (
            "⚡ Offline-First Architecture",
            "No internet in your dorm or village? No problem! All logged grades, calculations, simulator models, and downloaded exam PDFs work 100% offline.",
            YELLOW_PALE,
            INK_BLACK
        ),
        (
            "📖 Comprehensive Past Exam Library",
            "Over 100+ real APC, Bac, Probatoire, and university exam papers ready to download, read, and practice directly inside the app with our built-in PDF viewer.",
            SKY_BLUE_PALE,
            BLUE
        ),
    ]
    
    for i, (title, desc, bg_c, tag_c) in enumerate(pillars):
        py = Inches(1.95 + i * 1.55)
        card = add_cartoon_card(s, Inches(0.8), py, Inches(7.8), Inches(1.35), fill_color=WHITE, offset_pt=4)
        
        # Indicator bar
        bar = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.95), py + Inches(0.2), Inches(0.15), Inches(0.95))
        bar.fill.solid()
        bar.fill.fore_color.rgb = tag_c
        bar.line.fill.background()
        
        tb = s.shapes.add_textbox(Inches(1.25), py + Inches(0.15), Inches(7.1), Inches(1.05))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        
        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(11.5)
        p2.font.color.rgb = MUTED_TEXT
        p2.space_before = Pt(3)
        
    # Right Cartoon Mascot Showcase Card
    rc = add_cartoon_card(s, Inches(8.9), Inches(1.95), Inches(3.6), Inches(4.7), fill_color=YELLOW_PALE, offset_pt=6)
    mascot_work = os.path.join(MASCOT_DIR, "work.png")
    if os.path.exists(mascot_work):
        s.shapes.add_picture(mascot_work, Inches(9.2), Inches(2.2), width=Inches(3.0))
        
    add_badge(s, Inches(9.1), Inches(5.4), "✨ Zero Ads • Zero Distractions", bg_color=WHITE, text_color=INK_BLACK, width=Inches(3.2), height=Inches(0.45))

# -------------------------------------------------------------
# SLIDE 4: TOOL 1 — SMART GRADE PLANNER & DASHBOARD
# -------------------------------------------------------------
def build_slide_4():
    s = create_slide()
    add_slide_header(
        s,
        "🛠️ TOOL #1: PLANNER & DASHBOARD",
        "Smart Grade Tracking & Early Warning Dashboard",
        "Know your exact average in real-time — with official coefficient weights and automated alerts."
    )
    
    # Left Card: Problem Solved
    c1 = add_cartoon_card(s, Inches(0.8), Inches(1.95), Inches(5.6), Inches(4.7), fill_color=WHITE, offset_pt=5)
    add_badge(s, Inches(1.1), Inches(2.2), "🚨 PROBLEM IT SOLVES", bg_color=CORAL_PALE, text_color=CORAL, width=Inches(2.4), height=Inches(0.35))
    
    tb1 = s.shapes.add_textbox(Inches(1.1), Inches(2.7), Inches(5.0), Inches(3.6))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    
    bullets = [
        ("No More Math Mistakes:", "Secondary and university marks use complex coefficient weights. Go Study applies official formulas automatically."),
        ("No End-of-Term Surprises:", "Instead of waiting 3 months for report cards, students see their live average after every single interro or test."),
        ("At-Risk Subject Alerts:", "Color-coded indicators warn students immediately if a high-coefficient subject falls below passing grade."),
    ]
    for i, (head, body) in enumerate(bullets):
        p = tf1.paragraphs[0] if i == 0 else tf1.add_paragraph()
        p.text = f"• {head} "
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        if i > 0:
            p.space_before = Pt(12)
        
        run = p.add_run()
        run.text = body
        run.font.name = FONT_BODY
        run.font.size = Pt(12)
        run.font.bold = False
        run.font.color.rgb = MUTED_TEXT

    # Right Card: How to Use It
    c2 = add_cartoon_card(s, Inches(6.8), Inches(1.95), Inches(5.7), Inches(4.7), fill_color=YELLOW_PALE, offset_pt=5)
    add_badge(s, Inches(7.1), Inches(2.2), "📝 HOW TO USE IT IN 3 STEPS", bg_color=WHITE, text_color=INK_BLACK, width=Inches(2.8), height=Inches(0.35))
    
    steps = [
        ("Step 1: Pick Class & Target", "Choose your class (e.g. 1ère C or 3ème) and set your target average (e.g. 14/20)."),
        ("Step 2: Log Marks in Seconds", "Enter your Interro, Devoir, or Compo scores as teachers hand them back in class."),
        ("Step 3: Watch Your Progress", "Watch your live dashboard update immediately with current average and streak rewards."),
    ]
    
    for i, (title, desc) in enumerate(steps):
        sy = Inches(2.75 + i * 1.05)
        step_card = add_cartoon_card(s, Inches(7.1), sy, Inches(5.1), Inches(0.95), fill_color=WHITE, offset_pt=3)
        stb = s.shapes.add_textbox(Inches(7.25), sy + Inches(0.08), Inches(4.8), Inches(0.8))
        stf = stb.text_frame
        stf.word_wrap = True
        
        sp = stf.paragraphs[0]
        sp.text = title
        sp.font.name = FONT_HEADING
        sp.font.size = Pt(13)
        sp.font.bold = True
        sp.font.color.rgb = BLUE
        
        sp2 = stf.add_paragraph()
        sp2.text = desc
        sp2.font.name = FONT_BODY
        sp2.font.size = Pt(11)
        sp2.font.color.rgb = MUTED_TEXT

    mascot_write = os.path.join(MASCOT_DIR, "write.png")
    if os.path.exists(mascot_write):
        s.shapes.add_picture(mascot_write, Inches(11.3), Inches(0.4), width=Inches(1.2))

# -------------------------------------------------------------
# SLIDE 5: TOOL 2 — THE WHAT-IF GRADE SIMULATOR
# -------------------------------------------------------------
def build_slide_5():
    s = create_slide()
    add_slide_header(
        s,
        "🛠️ TOOL #2: WHAT-IF SIMULATOR",
        "The 'What-If' Simulator: Remove Guesswork Before Exam Day",
        "Test future exam scores with interactive sliders to discover the exact path to passing or honors."
    )
    
    # Left Card
    c1 = add_cartoon_card(s, Inches(0.8), Inches(1.95), Inches(5.6), Inches(4.7), fill_color=WHITE, offset_pt=5)
    add_badge(s, Inches(1.1), Inches(2.2), "🚨 PROBLEM IT SOLVES", bg_color=CORAL_PALE, text_color=CORAL, width=Inches(2.4), height=Inches(0.35))
    
    tb1 = s.shapes.add_textbox(Inches(1.1), Inches(2.7), Inches(5.0), Inches(3.6))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    
    bullets = [
        ("The 'Do I Still Have a Chance?' Panic:", "Before finals, students waste energy stressing over whether it's even mathematically possible to recover. The simulator gives the exact truth instantly."),
        ("Misguided Revision Effort:", "Students often spend hours studying subjects where marks won't move their average. The simulator shows which coefficient yields the biggest jump."),
        ("Clear Strategy for Exam Week:", "Replace panic with a concrete roadmap: 'If I score 13 in French and 15 in Physics, my target is 100% achieved.'"),
    ]
    for i, (head, body) in enumerate(bullets):
        p = tf1.paragraphs[0] if i == 0 else tf1.add_paragraph()
        p.text = f"• {head} "
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        if i > 0:
            p.space_before = Pt(12)
        
        run = p.add_run()
        run.text = body
        run.font.name = FONT_BODY
        run.font.size = Pt(12)
        run.font.bold = False
        run.font.color.rgb = MUTED_TEXT

    # Right Card: How to Use It
    c2 = add_cartoon_card(s, Inches(6.8), Inches(1.95), Inches(5.7), Inches(4.7), fill_color=SKY_BLUE_PALE, offset_pt=5)
    add_badge(s, Inches(7.1), Inches(2.2), "🎮 INTERACTIVE SIMULATION IN ACTION", bg_color=WHITE, text_color=BLUE, width=Inches(3.3), height=Inches(0.35))
    
    features = [
        ("1. Dynamic Sliders", "Adjust prospective marks for upcoming Compositions or Exams from 0 to 20.", "🎚️"),
        ("2. Instant Target Impact", "Watch the target thermometer turn green when your simulation clears the target average.", "🎯"),
        ("3. Save Winning Strategies", "Store multiple scenarios (Conservative vs Ambitious) and keep your study goal in sight.", "💾"),
    ]
    
    for i, (title, desc, icon) in enumerate(features):
        sy = Inches(2.75 + i * 1.05)
        step_card = add_cartoon_card(s, Inches(7.1), sy, Inches(5.1), Inches(0.95), fill_color=WHITE, offset_pt=3)
        stb = s.shapes.add_textbox(Inches(7.25), sy + Inches(0.08), Inches(4.8), Inches(0.8))
        stf = stb.text_frame
        stf.word_wrap = True
        
        sp = stf.paragraphs[0]
        sp.text = f"{icon} {title}"
        sp.font.name = FONT_HEADING
        sp.font.size = Pt(13)
        sp.font.bold = True
        sp.font.color.rgb = INK_BLACK
        
        sp2 = stf.add_paragraph()
        sp2.text = desc
        sp2.font.name = FONT_BODY
        sp2.font.size = Pt(11)
        sp2.font.color.rgb = MUTED_TEXT

    mascot_analyze = os.path.join(MASCOT_DIR, "analyze.png")
    if os.path.exists(mascot_analyze):
        s.shapes.add_picture(mascot_analyze, Inches(11.3), Inches(0.4), width=Inches(1.2))

# -------------------------------------------------------------
# SLIDE 6: TOOL 3 — PAST EXAM PAPERS & PDF READER
# -------------------------------------------------------------
def build_slide_6():
    s = create_slide()
    add_slide_header(
        s,
        "🛠️ TOOL #3: EXAM LIBRARY & PDF READER",
        "100+ Past Exam Papers & In-App Offline PDF Reader",
        "Official national past exams (Bac, Probatoire, BEPC, Compositions) ready in your pocket."
    )
    
    # 3 Column Cards
    cols = [
        (
            "📚 Huge Exam Paper Archive",
            "Covers 6ème through Terminale with all academic séries (A, C, D, TI, Nigerian university).\n\nBrowse by subject, year, class, and examination body (Official Bac, Regional Mock Exams, Terminale Compositions).",
            GREEN_PALE,
            GREEN,
            "100+ REAL EXAMS"
        ),
        (
            "⬇️ Download Once, Read Offline",
            "No expensive data bundles required during study sessions.\n\nTap download once and the paper is securely saved to your device. Practice past questions anywhere, anytime, with zero internet connection.",
            YELLOW_PALE,
            INK_BLACK,
            "100% OFFLINE READY"
        ),
        (
            "📱 Built-In PDF Reader + Local Explorer",
            "No need to download slow external PDF apps.\n\nGo Study includes a high-speed built-in reader with pinch-to-zoom. It even lets you browse and read any personal PDF stored in your phone folders!",
            SKY_BLUE_PALE,
            BLUE,
            "POWERFUL READER"
        ),
    ]
    
    card_w = Inches(3.65)
    card_h = Inches(4.7)
    card_y = Inches(1.95)
    
    for i, (title, desc, bg_c, tag_c, tag_txt) in enumerate(cols):
        card_x = Inches(0.8 + i * 4.0)
        add_cartoon_card(s, card_x, card_y, card_w, card_h, fill_color=WHITE, offset_pt=5)
        
        add_badge(s, card_x + Inches(0.2), card_y + Inches(0.25), tag_txt, bg_color=bg_c, text_color=tag_c, width=Inches(3.25), height=Inches(0.35))
        
        tb = s.shapes.add_textbox(card_x + Inches(0.2), card_y + Inches(0.75), Inches(3.25), Inches(3.6))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        
        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(12)
        p2.font.color.rgb = MUTED_TEXT
        p2.space_before = Pt(10)
        
    mascot_read = os.path.join(MASCOT_DIR, "read.png")
    if os.path.exists(mascot_read):
        s.shapes.add_picture(mascot_read, Inches(11.3), Inches(0.4), width=Inches(1.2))

# -------------------------------------------------------------
# SLIDE 7: TOOL 4 — BOOKS & COURSE DISCOVERY
# -------------------------------------------------------------
def build_slide_7():
    s = create_slide()
    add_slide_header(
        s,
        "🛠️ TOOL #4: DIGITAL BOOKS & COURSES",
        "Academic Textbooks & Curated Learning Catalog",
        "Everything a student needs to revise and understand complex concepts in one verified library."
    )
    
    # Left Box: Books
    c1 = add_cartoon_card(s, Inches(0.8), Inches(1.95), Inches(5.6), Inches(4.7), fill_color=WHITE, offset_pt=5)
    add_badge(s, Inches(1.1), Inches(2.2), "📖 DIGITAL REVISION BOOKS", bg_color=YELLOW_PALE, text_color=INK_BLACK, width=Inches(2.8), height=Inches(0.35))
    
    tb1 = s.shapes.add_textbox(Inches(1.1), Inches(2.7), Inches(5.0), Inches(3.6))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    
    book_points = [
        ("Official Curriculum Guides:", "Access summaries, methodology guides, and formula sheets aligned with your national syllabus."),
        ("Smart Storage Manager:", "See exactly how much phone storage your books and papers take, with one-tap cleanup and re-download anytime."),
        ("Native Sharing:", "Easily share revision materials with classmates via WhatsApp, Bluetooth, or Telegram directly from the app."),
    ]
    for i, (head, body) in enumerate(book_points):
        p = tf1.paragraphs[0] if i == 0 else tf1.add_paragraph()
        p.text = f"• {head} "
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        if i > 0:
            p.space_before = Pt(12)
        
        run = p.add_run()
        run.text = body
        run.font.name = FONT_BODY
        run.font.size = Pt(12)
        run.font.bold = False
        run.font.color.rgb = MUTED_TEXT

    # Right Box: Courses
    c2 = add_cartoon_card(s, Inches(6.8), Inches(1.95), Inches(5.7), Inches(4.7), fill_color=WHITE, offset_pt=5)
    add_badge(s, Inches(7.1), Inches(2.2), "🎓 CURATED VIDEO COURSES", bg_color=PURPLE_PALE, text_color=PURPLE, width=Inches(2.8), height=Inches(0.35))
    
    tb2 = s.shapes.add_textbox(Inches(7.1), Inches(2.7), Inches(5.1), Inches(3.6))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    
    course_points = [
        ("Handpicked Video Tutorials:", "Stuck on a Math theorem or Chemistry equation? Browse top-rated free video lessons categorized by subject."),
        ("Filtered by Grade Level:", "No searching through irrelevant YouTube clips — all courses are tagged by class (6ème to Terminale & Uni)."),
        ("Community Feedback Board:", "Students can vote on new courses, suggest past papers, and help shape upcoming updates!"),
    ]
    for i, (head, body) in enumerate(course_points):
        p = tf2.paragraphs[0] if i == 0 else tf2.add_paragraph()
        p.text = f"• {head} "
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        if i > 0:
            p.space_before = Pt(12)
        
        run = p.add_run()
        run.text = body
        run.font.name = FONT_BODY
        run.font.size = Pt(12)
        run.font.bold = False
        run.font.color.rgb = MUTED_TEXT

    mascot_reward = os.path.join(MASCOT_DIR, "reward.png")
    if os.path.exists(mascot_reward):
        s.shapes.add_picture(mascot_reward, Inches(11.3), Inches(0.4), width=Inches(1.2))

# -------------------------------------------------------------
# SLIDE 8: TAILORED FOR YOUR EXACT SCHOOL SYSTEM
# -------------------------------------------------------------
def build_slide_8():
    s = create_slide()
    add_slide_header(
        s,
        "🌍 MULTI-CURRICULUM SUPPORT",
        "Built Specifically for Your Local School System",
        "Go Study changes its math, mark fields, and benchmarks depending on how your school grades."
    )
    
    systems = [
        (
            "🇨🇲 Cameroon APC System",
            "Secondary & High School",
            [
                "Interro, Devoir, and Composition inputs",
                "Official 40/60 classwork/compo weighting",
                "Full Série support (A, C, D, TI, etc.)",
                "Coefficient weighting per academic branch",
            ],
            SKY_BLUE_PALE,
            BLUE
        ),
        (
            "🇫🇷 French Grading System",
            "Lycées & Collèges",
            [
                "Three mark categories with customizable weights",
                "Comparison with class average (min/max)",
                "Teacher appreciation scale (1 to 5 stars)",
                "Honors thresholds (Mention AB, B, TB)",
            ],
            PURPLE_PALE,
            PURPLE
        ),
        (
            "🇳🇬 Nigerian University",
            "Higher Education",
            [
                "Full 5.0 CGPA & GPA calculator",
                "Credit-unit weighted assessment modules",
                "Degree classification (First Class, 2:1, 2:2)",
                "Semester-by-semester multi-year archive",
            ],
            GREEN_PALE,
            GREEN
        ),
    ]
    
    card_w = Inches(3.65)
    card_h = Inches(4.7)
    card_y = Inches(1.95)
    
    for i, (title, sub, items, bg_c, tag_c) in enumerate(systems):
        card_x = Inches(0.8 + i * 4.0)
        add_cartoon_card(s, card_x, card_y, card_w, card_h, fill_color=WHITE, offset_pt=5)
        
        add_badge(s, card_x + Inches(0.2), card_y + Inches(0.25), sub, bg_color=bg_c, text_color=tag_c, width=Inches(3.25), height=Inches(0.35))
        
        tb = s.shapes.add_textbox(card_x + Inches(0.2), card_y + Inches(0.75), Inches(3.25), Inches(3.6))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        
        for item in items:
            p_item = tf.add_paragraph()
            p_item.text = f"✔ {item}"
            p_item.font.name = FONT_BODY
            p_item.font.size = Pt(11.5)
            p_item.font.color.rgb = MUTED_TEXT
            p_item.space_before = Pt(8)

# -------------------------------------------------------------
# SLIDE 9: WHY PARENTS & TEACHERS LOVE IT
# -------------------------------------------------------------
def build_slide_9():
    s = create_slide()
    add_slide_header(
        s,
        "🤝 COMMUNITY & IMPACT",
        "Why Students, Parents, and Teachers All Love Go Study!",
        "Academic success requires collaboration. Go Study creates a bridge of trust between home and school."
    )
    
    stakeholders = [
        (
            "👨‍👩‍👧 For Parents",
            "Total Visibility & Peace of Mind",
            [
                "Never get blindsided at the end of term by a surprise bad report card.",
                "See whether your child is on track for their target average weeks before exam week.",
                "Encourage positive study habits and celebrate small wins and streaks.",
            ],
            YELLOW_PALE,
            INK_BLACK
        ),
        (
            "🧑‍🏫 For Teachers & Tutors",
            "Prepared, Motivated Students",
            [
                "Students understand why coefficients matter and take responsibility for weak subjects.",
                "Direct access to genuine past exam questions without asking teachers for printed copies.",
                "Eliminates repetitive questions: 'Teacher, what mark do I need to pass?'",
            ],
            SKY_BLUE_PALE,
            BLUE
        ),
        (
            "🎒 For Students",
            "Confidence & Empowerment",
            [
                "Turn anxiety into a concrete game plan with clear numbers.",
                "Simulate different outcomes and walk into exam rooms with zero fear.",
                "100% private and accessible offline — your grades stay in your hands.",
            ],
            GREEN_PALE,
            GREEN
        ),
    ]
    
    card_w = Inches(3.65)
    card_h = Inches(4.7)
    card_y = Inches(1.95)
    
    for i, (title, subtitle, bullets, bg_c, tag_c) in enumerate(stakeholders):
        card_x = Inches(0.8 + i * 4.0)
        add_cartoon_card(s, card_x, card_y, card_w, card_h, fill_color=WHITE, offset_pt=5)
        
        add_badge(s, card_x + Inches(0.2), card_y + Inches(0.25), title, bg_color=bg_c, text_color=tag_c, width=Inches(3.25), height=Inches(0.35))
        
        tb = s.shapes.add_textbox(card_x + Inches(0.2), card_y + Inches(0.75), Inches(3.25), Inches(3.6))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = subtitle
        p.font.name = FONT_HEADING
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        
        for b in bullets:
            p_b = tf.add_paragraph()
            p_b.text = f"• {b}"
            p_b.font.name = FONT_BODY
            p_b.font.size = Pt(11)
            p_b.font.color.rgb = MUTED_TEXT
            p_b.space_before = Pt(8)

# -------------------------------------------------------------
# SLIDE 10: HOW TO GET STARTED & CALL TO ACTION
# -------------------------------------------------------------
def build_slide_10():
    s = create_slide()
    add_slide_header(
        s,
        "🚀 GET STARTED TODAY",
        "Start Tracking Your Success in Under 2 Minutes!",
        "Zero setup hurdles — works immediately as an Android App or on any Mobile Browser."
    )
    
    # Left: 3 Quick Steps
    steps = [
        ("1. Open the App (or Try Guest Mode)", "Install the Android APK or visit the web app. You can start immediately as a Guest with zero password hassle.", YELLOW_PALE),
        ("2. Select Your Class & Target", "Choose your grading system (APC Cameroon, French, or Nigerian University) and set your target grade.", SKY_BLUE_PALE),
        ("3. Enter Marks & Download Past Exams", "Input your first grades to unlock your live dashboard, simulate upcoming exams, and download revision PDFs.", GREEN_PALE),
    ]
    
    for i, (title, desc, bg_c) in enumerate(steps):
        sy = Inches(1.95 + i * 1.55)
        card = add_cartoon_card(s, Inches(0.8), sy, Inches(7.6), Inches(1.35), fill_color=WHITE, offset_pt=4)
        
        add_badge(s, Inches(1.0), sy + Inches(0.2), f"STEP {i+1}", bg_color=bg_c, text_color=INK_BLACK, width=Inches(1.2), height=Inches(0.35))
        
        tb = s.shapes.add_textbox(Inches(2.4), sy + Inches(0.12), Inches(5.8), Inches(1.1))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = INK_BLACK
        
        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(11)
        p2.font.color.rgb = MUTED_TEXT
        p2.space_before = Pt(3)

    # Right Big CTA Card
    rc = add_cartoon_card(s, Inches(8.7), Inches(1.95), Inches(3.8), Inches(4.7), fill_color=YELLOW, offset_pt=6)
    
    # App Icon & Mascot
    if os.path.exists(APP_ICON):
        s.shapes.add_picture(APP_ICON, Inches(10.1), Inches(2.2), width=Inches(1.0))
        
    mascot_triumph = os.path.join(MASCOT_DIR, "triumph.png")
    if os.path.exists(mascot_triumph):
        s.shapes.add_picture(mascot_triumph, Inches(9.2), Inches(3.2), width=Inches(2.8))
        
    cta_badge = add_badge(s, Inches(8.95), Inches(5.8), "🎯 Achieve Your Grade Goal!", bg_color=WHITE, text_color=INK_BLACK, width=Inches(3.3), height=Inches(0.5))

def main():
    print("Building Go Study Presentation 1 (General Public)...")
    build_slide_1()
    build_slide_2()
    build_slide_3()
    build_slide_4()
    build_slide_5()
    build_slide_6()
    build_slide_7()
    build_slide_8()
    build_slide_9()
    build_slide_10()
    
    prs.save(OUTPUT_PATH)
    print(f"SUCCESS: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
