"""
Professional Go Study! Presentations - Polished & Spacious Design
All elements properly fitted within safe margins
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR = os.path.join(REPO_ROOT, "docs", "presentations")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Professional color palette
NAVY = RGBColor(0x1E, 0x40, 0xAF)
LIGHT_BLUE = RGBColor(0xE7, 0xF1, 0xFF)
CYAN = RGBColor(0x06, 0xB6, 0xD4)
GREEN = RGBColor(0x10, 0xB9, 0x81)
ORANGE = RGBColor(0xF9, 0x73, 0x16)
PURPLE = RGBColor(0x7C, 0x3A, 0xED)
GOLD = RGBColor(0xEA, 0xB3, 0x08)
RED = RGBColor(0xEF, 0x44, 0x44)
DARK_GRAY = RGBColor(0x1F, 0x29, 0x37)
LIGHT_GRAY = RGBColor(0xF8, 0xFA, 0xFC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
TEXT_DARK = RGBColor(0x1E, 0x29, 0x3B)
TEXT_MUTED = RGBColor(0x64, 0x74, 0x8B)

# Safe margins
MARGIN_LEFT = Inches(0.8)
MARGIN_RIGHT = Inches(0.8)
MARGIN_TOP = Inches(0.6)
MARGIN_BOTTOM = Inches(0.6)
CONTENT_WIDTH = Inches(13.333) - MARGIN_LEFT - MARGIN_RIGHT
CONTENT_HEIGHT = Inches(7.5) - MARGIN_TOP - MARGIN_BOTTOM

def create_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    return prs

def add_slide(prs, bg_color=LIGHT_GRAY):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = bg_color
    bg.line.fill.background()
    return slide

def add_shape(slide, left, top, width, height, fill_color, border_color=None, border_width=0):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(border_width)
    else:
        shape.line.fill.background()
    shape.adjustments[0] = 0.05  # Rounded corners
    return shape

def add_title(slide, text, color=TEXT_DARK, size=44):
    tb = slide.shapes.add_textbox(MARGIN_LEFT, MARGIN_TOP, CONTENT_WIDTH, Inches(1))
    tf = tb.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.text = text
    p.font.name = "Segoe UI"
    p.font.size = Pt(size)
    p.font.bold = True
    p.font.color.rgb = color
    p.alignment = PP_ALIGN.LEFT
    return tb

def add_text_block(slide, left, top, width, height, text, size=14, bold=False, color=TEXT_DARK, align=PP_ALIGN.LEFT):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.text = text
    p.font.name = "Segoe UI"
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.alignment = align
    p.line_spacing = 1.3
    return tb

# ==================== PRESENTATION 1: GENERAL PUBLIC ====================
print("\n🎨 Creating Presentation 1: General Public...")
prs1 = create_pptx()

# Slide 1: Title
slide = add_slide(prs1, NAVY)
add_shape(slide, Inches(2), Inches(2.5), Inches(9.3), Inches(2.5), WHITE)
add_text_block(slide, Inches(2.5), Inches(2.8), Inches(8.3), Inches(0.8), "Go Study!", 72, True, NAVY, PP_ALIGN.CENTER)
add_text_block(slide, Inches(2.5), Inches(3.7), Inches(8.3), Inches(0.5), "Your Smart Exam Companion", 28, False, TEXT_MUTED, PP_ALIGN.CENTER)
add_text_block(slide, Inches(2.5), Inches(4.3), Inches(8.3), Inches(0.4), "Stop Guessing • Start Strategizing • Pass Smarter", 16, True, CYAN, PP_ALIGN.CENTER)
print("✅ Slide 1: Title")

# Slide 2: The Problem
slide = add_slide(prs1)
add_title(slide, "😰 The Problem Students Face", RED)
problems = [
    ("📊", "Can't Calculate Average", "APC grading is complex. Students don't know if they're on track."),
    ("🎯", "No Clear Strategy", "Which test matters most? Students guess instead of planning."),
    ("📚", "Papers Scattered", "Old exams are on WhatsApp or photocopies, hard to organize."),
    ("😓", "Stress & Uncertainty", "Not knowing creates anxiety and wastes study time.")
]
card_w = Inches(5.5)
card_h = Inches(2.2)
gap = Inches(0.5)
for i, (icon, title, desc) in enumerate(problems):
    row, col = i // 2, i % 2
    left = MARGIN_LEFT + col * (card_w + gap)
    top = Inches(1.8) + row * (card_h + gap)
    add_shape(slide, left, top, card_w, card_h, WHITE, RED, 2)
    add_text_block(slide, left + Inches(0.3), top + Inches(0.3), Inches(0.6), Inches(0.6), icon, 36, False, RED, PP_ALIGN.CENTER)
    add_text_block(slide, left + Inches(1.1), top + Inches(0.3), card_w - Inches(1.4), Inches(0.5), title, 18, True, RED)
    add_text_block(slide, left + Inches(0.3), top + Inches(0.95), card_w - Inches(0.6), Inches(1.1), desc, 13, False, TEXT_DARK)
print("✅ Slide 2: Problems")

# Slide 3: The Solution
slide = add_slide(prs1)
add_title(slide, "✨ The Solution", GREEN)
add_shape(slide, MARGIN_LEFT, Inches(1.8), CONTENT_WIDTH, Inches(4.5), RGBColor(0xF0, 0xFD, 0xF4), GREEN, 2)
add_text_block(slide, MARGIN_LEFT + Inches(0.5), Inches(2.1), CONTENT_WIDTH - Inches(1), Inches(0.6), "Go Study! Solves All of This", 32, True, GREEN, PP_ALIGN.CENTER)
solutions = [
    ("🧮", "Grade Calculator", "Instant average with APC/French/Nigerian systems"),
    ("🎯", "Score Strategizer", "Plan what you need to hit your target"),
    ("📱", "Exam Library", "Download past papers, study offline")
]
sol_w = Inches(3.6)
for i, (icon, title, desc) in enumerate(solutions):
    left = MARGIN_LEFT + Inches(0.8) + i * Inches(3.9)
    top = Inches(3.1)
    add_text_block(slide, left, top, sol_w, Inches(0.7), icon, 48, False, GREEN, PP_ALIGN.CENTER)
    add_text_block(slide, left, top + Inches(0.8), sol_w, Inches(0.4), title, 16, True, TEXT_DARK, PP_ALIGN.CENTER)
    add_text_block(slide, left, top + Inches(1.25), sol_w, Inches(0.8), desc, 12, False, TEXT_MUTED, PP_ALIGN.CENTER)
add_shape(slide, Inches(3.5), Inches(5.8), Inches(6.3), Inches(0.7), GOLD)
add_text_block(slide, Inches(3.7), Inches(5.95), Inches(5.9), Inches(0.4), "🚀 From Panic Mode to Pass Mode", 18, True, WHITE, PP_ALIGN.CENTER)
print("✅ Slide 3: Solution")

# Slide 4: Grade Calculator
slide = add_slide(prs1)
add_title(slide, "🧮 Grade Calculator", CYAN)
add_shape(slide, MARGIN_LEFT, Inches(1.8), CONTENT_WIDTH, Inches(2), LIGHT_BLUE)
add_text_block(slide, MARGIN_LEFT + Inches(0.5), Inches(2.1), CONTENT_WIDTH - Inches(1), Inches(0.5), "Know Your Average Instantly", 26, True, CYAN)
add_text_block(slide, MARGIN_LEFT + Inches(0.5), Inches(2.7), CONTENT_WIDTH - Inches(1), Inches(1), "Enter marks for Interro, Devoir, and Composition. Go Study! calculates your weighted average using the official APC system. No more manual errors!", 15, False, TEXT_DARK)
add_text_block(slide, MARGIN_LEFT, Inches(4.1), CONTENT_WIDTH, Inches(0.4), "How It Works:", 20, True, TEXT_DARK)
steps = ["1️⃣ Add subjects with coefficients", "2️⃣ Enter marks for each test", "3️⃣ See average update in real-time", "4️⃣ Color-coded feedback"]
for i, step in enumerate(steps):
    top = Inches(4.6) + i * Inches(0.55)
    add_shape(slide, MARGIN_LEFT + Inches(0.3), top, CONTENT_WIDTH - Inches(0.6), Inches(0.45), WHITE, CYAN, 1)
    add_text_block(slide, MARGIN_LEFT + Inches(0.5), top + Inches(0.08), CONTENT_WIDTH - Inches(1), Inches(0.3), step, 13, True, TEXT_DARK)
print("✅ Slide 4: Calculator")

# Slide 5: Score Strategizer
slide = add_slide(prs1)
add_title(slide, "🎯 Score Strategizer", PURPLE)
add_shape(slide, MARGIN_LEFT, Inches(1.8), CONTENT_WIDTH, Inches(2), RGBColor(0xF5, 0xF3, 0xFF))
add_text_block(slide, MARGIN_LEFT + Inches(0.5), Inches(2.1), CONTENT_WIDTH - Inches(1), Inches(0.5), "Plan Your Path to Success", 26, True, PURPLE)
add_text_block(slide, MARGIN_LEFT + Inches(0.5), Inches(2.7), CONTENT_WIDTH - Inches(1), Inches(1), "Set your target average. The Strategizer shows exactly what scores you need in upcoming tests. Drag sliders to find the easiest path to your goal!", 15, False, TEXT_DARK)
benefits = [
    ("📈", "Focus on high-coefficient subjects"),
    ("🎲", "Test different score scenarios"),
    ("💪", "Know exactly what you need"),
    ("🧠", "Stop wasting time on low-impact subjects")
]
for i, (icon, text) in enumerate(benefits):
    row, col = i // 2, i % 2
    left = MARGIN_LEFT + Inches(0.5) + col * Inches(5.8)
    top = Inches(4.2) + row * Inches(0.7)
    add_shape(slide, left, top, Inches(5.3), Inches(0.6), WHITE, PURPLE, 1)
    add_text_block(slide, left + Inches(0.2), top + Inches(0.12), Inches(5), Inches(0.35), f"{icon} {text}", 13, True, TEXT_DARK)
print("✅ Slide 5: Strategizer")

# Slide 6: Exam Library
slide = add_slide(prs1)
add_title(slide, "📚 Offline Exam Library", ORANGE)
add_shape(slide, MARGIN_LEFT, Inches(1.8), CONTENT_WIDTH, Inches(2), RGBColor(0xFF, 0xF7, 0xED))
add_text_block(slide, MARGIN_LEFT + Inches(0.5), Inches(2.1), CONTENT_WIDTH - Inches(1), Inches(0.5), "Access Past Papers Anytime, Anywhere", 26, True, ORANGE)
add_text_block(slide, MARGIN_LEFT + Inches(0.5), Inches(2.7), CONTENT_WIDTH - Inches(1), Inches(1), "Download papers by subject, year, and type (BAC, BEPC). Study offline. Filter by class and series to see only what's relevant to you.", 15, False, TEXT_DARK)
features = ["📥 One-tap download", "🔍 Smart filters", "📱 Read offline", "🗂️ Auto-organized", "🌙 Browse phone", "⚡ Fast search"]
for i, feat in enumerate(features):
    row, col = i // 3, i % 3
    left = MARGIN_LEFT + Inches(0.3) + col * Inches(3.8)
    top = Inches(4.2) + row * Inches(0.7)
    add_shape(slide, left, top, Inches(3.5), Inches(0.6), WHITE, ORANGE, 1)
    add_text_block(slide, left + Inches(0.2), top + Inches(0.12), Inches(3.2), Inches(0.35), feat, 13, True, TEXT_DARK)
print("✅ Slide 6: Library")

# Slide 7: Premium
slide = add_slide(prs1)
add_title(slide, "👑 Premium Features", GOLD)
add_shape(slide, MARGIN_LEFT + Inches(1), Inches(1.7), CONTENT_WIDTH - Inches(2), Inches(1.4), GOLD)
add_text_block(slide, MARGIN_LEFT + Inches(1.3), Inches(2), CONTENT_WIDTH - Inches(2.6), Inches(0.4), "Get Premium Access", 24, True, WHITE, PP_ALIGN.CENTER)
add_text_block(slide, MARGIN_LEFT + Inches(1.3), Inches(2.5), CONTENT_WIDTH - Inches(2.6), Inches(0.5), "1 Month = 1,500 FCFA  •  Request at your school registry", 14, True, RGBColor(0xFF, 0xF7, 0xED), PP_ALIGN.CENTER)
benefits = [
    ("♾️", "Unlimited Downloads", "No 5-paper monthly limit"),
    ("🔓", "All Papers", "Every subject & year"),
    ("📖", "Book Library", "Textbooks & guides"),
    ("🎯", "Advanced Tools", "Deep analytics"),
    ("💾", "2 Devices", "Phone + tablet"),
    ("⚡", "Priority Support", "Fast help")
]
card_w = Inches(3.6)
card_h = Inches(1.2)
for i, (icon, title, desc) in enumerate(benefits):
    row, col = i // 3, i % 3
    left = MARGIN_LEFT + Inches(0.5) + col * Inches(3.8)
    top = Inches(3.5) + row * Inches(1.4)
    add_shape(slide, left, top, card_w, card_h, RGBColor(0xFF, 0xF7, 0xED), GOLD, 1)
    add_text_block(slide, left + Inches(0.2), top + Inches(0.15), Inches(0.5), Inches(0.4), icon, 24, False, GOLD, PP_ALIGN.CENTER)
    add_text_block(slide, left + Inches(0.75), top + Inches(0.15), card_w - Inches(1), Inches(0.35), title, 14, True, TEXT_DARK)
    add_text_block(slide, left + Inches(0.75), top + Inches(0.55), card_w - Inches(1), Inches(0.5), desc, 11, False, TEXT_MUTED)
print("✅ Slide 7: Premium")

# Slide 8: Get Started
slide = add_slide(prs1)
add_title(slide, "🚀 Get Started in 3 Steps", GREEN)
steps_data = [
    ("1", "📲", "Download Go Study!", "Get the app from your school or WhatsApp. Install on Android.", LIGHT_BLUE),
    ("2", "✏️", "Set Up Profile", "Add name, class, subjects, and target average.", RGBColor(0xF5, 0xF3, 0xFF)),
    ("3", "🎯", "Start Studying!", "Calculate grades, plan strategy, download papers. Pass with confidence!", RGBColor(0xF0, 0xFD, 0xF4))
]
for i, (num, icon, title, desc, color) in enumerate(steps_data):
    top = Inches(1.9) + i * Inches(1.6)
    add_shape(slide, MARGIN_LEFT + Inches(0.5), top, CONTENT_WIDTH - Inches(1), Inches(1.4), color, TEXT_DARK, 2)
    # Number circle
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, MARGIN_LEFT + Inches(0.8), top + Inches(0.45), Inches(0.5), Inches(0.5))
    circle.fill.solid()
    circle.fill.fore_color.rgb = TEXT_DARK
    circle.line.fill.background()
    add_text_block(slide, MARGIN_LEFT + Inches(0.8), top + Inches(0.45), Inches(0.5), Inches(0.5), num, 22, True, WHITE, PP_ALIGN.CENTER)
    add_text_block(slide, MARGIN_LEFT + Inches(1.5), top + Inches(0.3), Inches(0.7), Inches(0.7), icon, 36, False, TEXT_DARK, PP_ALIGN.CENTER)
    add_text_block(slide, MARGIN_LEFT + Inches(2.3), top + Inches(0.3), CONTENT_WIDTH - Inches(3.8), Inches(0.4), title, 20, True, TEXT_DARK)
    add_text_block(slide, MARGIN_LEFT + Inches(2.3), top + Inches(0.75), CONTENT_WIDTH - Inches(3.8), Inches(0.6), desc, 13, False, TEXT_MUTED)
add_shape(slide, Inches(3.5), Inches(6.5), Inches(6.3), Inches(0.7), GOLD)
add_text_block(slide, Inches(3.7), Inches(6.65), Inches(5.9), Inches(0.4), "🎓 Join Thousands Passing Smarter!", 18, True, WHITE, PP_ALIGN.CENTER)
print("✅ Slide 8: Get Started")

# Slide 9: Thank You
slide = add_slide(prs1, NAVY)
add_shape(slide, Inches(2.5), Inches(2.3), Inches(8.3), Inches(3), WHITE)
add_text_block(slide, Inches(3), Inches(2.7), Inches(7.3), Inches(0.8), "Thank You! 🎉", 52, True, NAVY, PP_ALIGN.CENTER)
add_text_block(slide, Inches(3), Inches(3.6), Inches(7.3), Inches(1.2), "Go Study! is built by students, for students.\n\nStop guessing. Start strategizing.\nPass smarter with Go Study!", 16, False, TEXT_DARK, PP_ALIGN.CENTER)
add_shape(slide, Inches(3.5), Inches(5.6), Inches(6.3), Inches(0.6), CYAN)
add_text_block(slide, Inches(3.7), Inches(5.75), Inches(5.9), Inches(0.3), "📧 Questions? Contact your school registry", 14, True, WHITE, PP_ALIGN.CENTER)
print("✅ Slide 9: Thank You")

prs1.save(os.path.join(OUTPUT_DIR, "Go-Study-Presentation-1-General-Public.pptx"))
print("🎉 Presentation 1 saved!")

print(f"\n✨ Done! All presentations saved to: {OUTPUT_DIR}")
print("\nOpen the files to view your professionally designed presentations.")
