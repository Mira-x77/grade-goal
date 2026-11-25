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
    """Add neo-brutalist card with thick border and shadow offset"""
    offset = Pt(offset_pt)
    
    # Shadow rectangle
    shadow = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left + offset, top + offset, width, height)
    shadow.fill.solid()
    shadow.fill.fore_color.rgb = INK_BLACK
    shadow.line.fill.background()
    
    # Main card
    card = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = fill_color
    card.line.color.rgb = border_color
    card.line.width = Pt(border_width_pt)
    
    return card

def add_text_box(slide, left, top, width, height, text, font_size=14, bold=False, color=INK_BLACK, align=PP_ALIGN.LEFT):
    """Add text box with proper formatting"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = align
    p.font.name = FONT_BODY
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    
    return txBox

def add_heading(slide, left, top, width, height, text, font_size=32, color=INK_BLACK):
    """Add heading text"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = PP_ALIGN.LEFT
    p.font.name = FONT_HEADING
    p.font.size = Pt(font_size)
    p.font.bold = True
    p.font.color.rgb = color
    
    return txBox

def add_icon_placeholder(slide, left, top, size, icon_emoji):
    """Add emoji icon placeholder"""
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    circle.fill.solid()
    circle.fill.fore_color.rgb = YELLOW_PALE
    circle.line.color.rgb = INK_BLACK
    circle.line.width = Pt(2)
    
    # Add emoji text
    txBox = slide.shapes.add_textbox(left, top, size, size)
    tf = txBox.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = icon_emoji
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(int(size.inches * 30))
    
    return circle

# ============================================================================
# SLIDE 1: Title / Cover
# ============================================================================
def slide_1_title():
    slide = create_slide()
    
    # Large title card
    card = add_cartoon_card(slide, Inches(1.5), Inches(1.8), Inches(10), Inches(3.5), YELLOW, offset_pt=8)
    
    # Main title
    add_heading(slide, Inches(2), Inches(2.2), Inches(9), Inches(1), 
                "Go Study!", font_size=72, color=INK_BLACK)
    
    # Subtitle
    add_text_box(slide, Inches(2), Inches(3), Inches(9), Inches(1),
                 "Your Smart Exam Companion 📚", font_size=28, bold=True, color=MUTED_TEXT)
    
    # Tagline
    add_text_box(slide, Inches(2), Inches(3.8), Inches(9), Inches(0.6),
                 "Stop Guessing. Start Strategizing. Pass Smarter.", 
                 font_size=18, color=INK_BLACK, align=PP_ALIGN.CENTER)
    
    # Footer badge
    footer_card = add_cartoon_card(slide, Inches(4.5), Inches(6), Inches(4.3), Inches(0.8), 
                                   SKY_BLUE_PALE, offset_pt=4)
    add_text_box(slide, Inches(4.7), Inches(6.15), Inches(4), Inches(0.5),
                 "🎯 For Students in Togo & Beyond", font_size=16, bold=True, 
                 color=SKY_BLUE, align=PP_ALIGN.CENTER)

# ============================================================================
# SLIDE 2: The Problem
# ============================================================================
def slide_2_problem():
    slide = create_slide()
    
    # Title
    add_heading(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), 
                "😰 The Problem Students Face", font_size=42, color=CORAL)
    
    # Problem cards
    problems = [
        {"icon": "📊", "title": "Can't Calculate Their Average", 
         "desc": "APC grading system is complex. Students don't know if they're on track until results come out."},
        {"icon": "🎯", "title": "No Clear Strategy", 
         "desc": "Which test matters most? Where should I focus? Students guess instead of planning."},
        {"icon": "📚", "title": "Past Papers Are Scattered", 
         "desc": "Old exam papers exist on WhatsApp, photocopies, or locked PDFs. Hard to find and organize."},
        {"icon": "😓", "title": "Stress & Uncertainty", 
         "desc": "Not knowing if you'll pass creates anxiety and wastes study time on wrong priorities."}
    ]
    
    card_width = Inches(5.5)
    card_height = Inches(2.3)
    gap = Inches(0.5)
    
    for i, prob in enumerate(problems):
        row = i // 2
        col = i % 2
        left = Inches(1) + col * (card_width + gap)
        top = Inches(1.5) + row * (card_height + gap)
        
        # Problem card
        card = add_cartoon_card(slide, left, top, card_width, card_height, CORAL_PALE, offset_pt=5)
        
        # Icon
        add_icon_placeholder(slide, left + Inches(0.3), top + Inches(0.3), Inches(0.7), prob["icon"])
        
        # Title
        add_text_box(slide, left + Inches(1.2), top + Inches(0.3), card_width - Inches(1.5), Inches(0.4),
                     prob["title"], font_size=18, bold=True, color=CORAL)
        
        # Description
        add_text_box(slide, left + Inches(0.3), top + Inches(1), card_width - Inches(0.6), Inches(1.1),
                     prob["desc"], font_size=14, color=INK_BLACK)

# ============================================================================
# SLIDE 3: The Solution
# ============================================================================
def slide_3_solution():
    slide = create_slide()
    
    # Title
    add_heading(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), 
                "✨ Go Study! Solves All of This", font_size=42, color=GREEN)
    
    # Solution hero card
    hero_card = add_cartoon_card(slide, Inches(1.5), Inches(1.6), Inches(10), Inches(4.8), 
                                 GREEN_PALE, offset_pt=8)
    
    # Three columns of solutions
    solutions = [
        {"icon": "🧮", "title": "Grade Calculator", 
         "desc": "Instantly know your average with APC, French, or Nigerian grading systems"},
        {"icon": "🎯", "title": "Score Strategizer", 
         "desc": "Plan exactly what scores you need in each test to hit your target"},
        {"icon": "📱", "title": "Offline Exam Library", 
         "desc": "Download & organize past papers by subject, year, and exam type"}
    ]
    
    col_width = Inches(3)
    for i, sol in enumerate(solutions):
        left = Inches(2) + i * Inches(3.3)
        top = Inches(2.2)
        
        # Icon
        add_icon_placeholder(slide, left, top, Inches(1), sol["icon"])
        
        # Title
        add_text_box(slide, left - Inches(0.3), top + Inches(1.2), col_width, Inches(0.4),
                     sol["title"], font_size=16, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
        
        # Description
        add_text_box(slide, left - Inches(0.5), top + Inches(1.7), col_width + Inches(0.4), Inches(1.5),
                     sol["desc"], font_size=12, color=INK_BLACK, align=PP_ALIGN.CENTER)
    
    # Bottom tagline
    tagline_card = add_cartoon_card(slide, Inches(3), Inches(5.8), Inches(7.3), Inches(0.9),
                                    YELLOW, offset_pt=5)
    add_text_box(slide, Inches(3.2), Inches(6), Inches(7), Inches(0.5),
                 "🚀 From Panic Mode to Pass Mode", font_size=20, bold=True,
                 color=INK_BLACK, align=PP_ALIGN.CENTER)

# ============================================================================
# SLIDE 4: Tool #1 - Grade Calculator
# ============================================================================
def slide_4_grade_calculator():
    slide = create_slide()
    
    # Title with icon
    add_heading(slide, Inches(1), Inches(0.5), Inches(11), Inches(0.7),
                "🧮 Tool #1: Grade Calculator", font_size=40, color=SKY_BLUE)
    
    # Main feature card
    feature_card = add_cartoon_card(slide, Inches(1.5), Inches(1.4), Inches(10), Inches(2.5),
                                    BLUE_PALE, offset_pt=6)
    
    # Feature description
    add_heading(slide, Inches(2), Inches(1.7), Inches(9), Inches(0.5),
                "Know Your Average Instantly", font_size=28, color=SKY_BLUE)
    
    add_text_box(slide, Inches(2), Inches(2.3), Inches(9), Inches(1.3),
                 "Enter your marks for Interro, Devoir, and Composition across all subjects. "
                 "Go Study! automatically calculates your weighted average using the official APC system. "
                 "No more manual errors or guesswork!",
                 font_size=16, color=INK_BLACK)
    
    # How it works steps
    add_heading(slide, Inches(1.5), Inches(4.2), Inches(10), Inches(0.5),
                "How It Works:", font_size=22, color=INK_BLACK)
    
    steps = [
        "1️⃣ Add your subjects with coefficients",
        "2️⃣ Enter marks for each test type (Interro, Devoir, Composition)",
        "3️⃣ See your average update in real-time",
        "4️⃣ Get color-coded feedback: green = on track, red = needs work"
    ]
    
    for i, step in enumerate(steps):
        step_card = add_cartoon_card(slide, Inches(1.8), Inches(4.8) + i * Inches(0.6),
                                     Inches(9.5), Inches(0.5), WHITE, offset_pt=3)
        add_text_box(slide, Inches(2), Inches(4.9) + i * Inches(0.6),
                     Inches(9), Inches(0.3), step, font_size=14, bold=True, color=INK_BLACK)

# ============================================================================
# SLIDE 5: Tool #2 - Score Strategizer  
# ============================================================================
def slide_5_score_strategizer():
    slide = create_slide()
    
    # Title
    add_heading(slide, Inches(1), Inches(0.5), Inches(11), Inches(0.7),
                "🎯 Tool #2: Score Strategizer", font_size=40, color=PURPLE)
    
    # Main feature card
    feature_card = add_cartoon_card(slide, Inches(1.5), Inches(1.4), Inches(10), Inches(2.5),
                                    PURPLE_PALE, offset_pt=6)
    
    add_heading(slide, Inches(2), Inches(1.7), Inches(9), Inches(0.5),
                "Plan Your Path to Success", font_size=28, color=PURPLE)
    
    add_text_box(slide, Inches(2), Inches(2.3), Inches(9), Inches(1.3),
                 "Set your target average (e.g., 12/20). The Strategizer shows you exactly what scores "
                 "you need in upcoming tests to hit your goal. Drag sliders to simulate different scenarios "
                 "and find the easiest path to your target!",
                 font_size=16, color=INK_BLACK)
    
    # Problem it solves
    add_heading(slide, Inches(1.5), Inches(4.2), Inches(10), Inches(0.5),
                "✅ Problems It Solves:", font_size=22, color=INK_BLACK)
    
    benefits = [
        {"icon": "📈", "text": "Focus on high-coefficient subjects (they matter more!)"},
        {"icon": "🎲", "text": "Test different score scenarios before the real test"},
        {"icon": "💪", "text": "Know exactly how much you need to improve"},
        {"icon": "🧠", "text": "Stop wasting time on subjects that won't move your average"}
    ]
    
    for i, benefit in enumerate(benefits):
        left = Inches(1.8) if i < 2 else Inches(6.6)
        top = Inches(4.8) if i % 2 == 0 else Inches(5.6)
        
        benefit_card = add_cartoon_card(slide, left, top, Inches(4.5), Inches(0.7),
                                        WHITE, offset_pt=3)
        add_text_box(slide, left + Inches(0.2), top + Inches(0.15), Inches(4.2), Inches(0.4),
                     f"{benefit['icon']} {benefit['text']}", font_size=13, bold=True, color=INK_BLACK)

# ============================================================================
# SLIDE 6: Tool #3 - Exam Library
# ============================================================================
def slide_6_exam_library():
    slide = create_slide()
    
    # Title
    add_heading(slide, Inches(1), Inches(0.5), Inches(11), Inches(0.7),
                "📚 Tool #3: Offline Exam Library", font_size=40, color=CORAL)
    
    # Main feature card
    feature_card = add_cartoon_card(slide, Inches(1.5), Inches(1.4), Inches(10), Inches(2.5),
                                    CORAL_PALE, offset_pt=6)
    
    add_heading(slide, Inches(2), Inches(1.7), Inches(9), Inches(0.5),
                "Access Past Papers Anytime, Anywhere", font_size=28, color=CORAL)
    
    add_text_box(slide, Inches(2), Inches(2.3), Inches(9), Inches(1.3),
                 "Download exam papers by subject, year, and type (BAC, BEPC, Probatoire). "
                 "Papers are stored on your phone so you can study offline. Filter by class level "
                 "and series (A, C, D) to see only what's relevant to you.",
                 font_size=16, color=INK_BLACK)
    
    # Key features
    add_heading(slide, Inches(1.5), Inches(4.2), Inches(10), Inches(0.5),
                "Key Features:", font_size=22, color=INK_BLACK)
    
    features_col1 = [
        "📥 One-tap download to your device",
        "🔍 Smart filters by subject & year",
        "📱 Read PDFs offline (no internet needed)"
    ]
    
    features_col2 = [
        "🗂️ Auto-organized by exam type",
        "🌙 Browse your phone folders for PDFs",
        "⚡ Fast search across all papers"
    ]
    
    for i, feature in enumerate(features_col1):
        card = add_cartoon_card(slide, Inches(1.8), Inches(4.8) + i * Inches(0.6),
                                Inches(4.5), Inches(0.5), WHITE, offset_pt=3)
        add_text_box(slide, Inches(2), Inches(4.9) + i * Inches(0.6),
                     Inches(4.2), Inches(0.3), feature, font_size=13, bold=True, color=INK_BLACK)
    
    for i, feature in enumerate(features_col2):
        card = add_cartoon_card(slide, Inches(6.7), Inches(4.8) + i * Inches(0.6),
                                Inches(4.5), Inches(0.5), WHITE, offset_pt=3)
        add_text_box(slide, Inches(6.9), Inches(4.9) + i * Inches(0.6),
                     Inches(4.2), Inches(0.3), feature, font_size=13, bold=True, color=INK_BLACK)

# ============================================================================
# SLIDE 7: Premium Features
# ============================================================================
def slide_7_premium():
    slide = create_slide()
    
    # Title with crown
    add_heading(slide, Inches(1), Inches(0.5), Inches(11), Inches(0.7),
                "👑 Premium: Unlock More Power", font_size=40, color=GOLD_PREMIUM)
    
    # Premium card
    premium_card = add_cartoon_card(slide, Inches(2), Inches(1.5), Inches(9.3), Inches(2),
                                    YELLOW, offset_pt=7)
    
    add_heading(slide, Inches(2.5), Inches(1.8), Inches(8.5), Inches(0.5),
                "Get Premium Access", font_size=28, color=INK_BLACK)
    
    add_text_box(slide, Inches(2.5), Inches(2.4), Inches(8.5), Inches(0.9),
                 "🎟️ 1 Month = 1,500 FCFA  •  Request codes at your school registry or via WhatsApp",
                 font_size=16, bold=True, color=INK_BLACK, align=PP_ALIGN.CENTER)
    
    # Premium benefits
    add_heading(slide, Inches(2), Inches(3.8), Inches(9.3), Inches(0.4),
                "What You Get:", font_size=22, color=INK_BLACK)
    
    benefits = [
        {"icon": "♾️", "title": "Unlimited Downloads", "desc": "No 5-paper limit per month"},
        {"icon": "🔓", "title": "All Exam Papers", "desc": "Access every subject & year instantly"},
        {"icon": "📖", "title": "Book Library", "desc": "Download textbooks & study guides"},
        {"icon": "🎯", "title": "Advanced Strategy Tools", "desc": "Deep analytics & score predictions"},
        {"icon": "💾", "title": "Multiple Devices", "desc": "Use on 2 phones/tablets simultaneously"},
        {"icon": "⚡", "title": "Priority Support", "desc": "Fast help when you need it"}
    ]
    
    card_width = Inches(4.3)
    card_height = Inches(1.3)
    
    for i, benefit in enumerate(benefits):
        row = i // 2
        col = i % 2
        left = Inches(2.2) + col * Inches(4.8)
        top = Inches(4.4) + row * Inches(1.5)
        
        benefit_card = add_cartoon_card(slide, left, top, card_width, card_height,
                                        YELLOW_PALE, offset_pt=4)
        
        # Icon
        add_text_box(slide, left + Inches(0.2), top + Inches(0.15), Inches(0.5), Inches(0.5),
                     benefit["icon"], font_size=24, bold=True, align=PP_ALIGN.CENTER)
        
        # Title & description
        add_text_box(slide, left + Inches(0.8), top + Inches(0.2), card_width - Inches(1), Inches(0.35),
                     benefit["title"], font_size=14, bold=True, color=INK_BLACK)
        add_text_box(slide, left + Inches(0.8), top + Inches(0.6), card_width - Inches(1), Inches(0.5),
                     benefit["desc"], font_size=11, color=MUTED_TEXT)

# ============================================================================
# SLIDE 8: How to Get Started
# ============================================================================
def slide_8_get_started():
    slide = create_slide()
    
    # Title
    add_heading(slide, Inches(1), Inches(0.5), Inches(11), Inches(0.7),
                "🚀 Get Started in 3 Steps", font_size=42, color=GREEN)
    
    steps = [
        {
            "number": "1",
            "title": "Download Go Study!",
            "desc": "Get the app from your school or WhatsApp. Install on Android.",
            "color": SKY_BLUE_PALE,
            "icon": "📲"
        },
        {
            "number": "2",
            "title": "Set Up Your Profile",
            "desc": "Add your name, class level, subjects, and target average.",
            "color": PURPLE_PALE,
            "icon": "✏️"
        },
        {
            "number": "3",
            "title": "Start Studying Smarter!",
            "desc": "Calculate grades, plan strategy, download past papers. Pass with confidence!",
            "color": GREEN_PALE,
            "icon": "🎯"
        }
    ]
    
    card_height = Inches(1.6)
    
    for i, step in enumerate(steps):
        top = Inches(1.8) + i * (card_height + Inches(0.3))
        
        # Step card
        step_card = add_cartoon_card(slide, Inches(2), top, Inches(9.3), card_height,
                                     step["color"], offset_pt=6)
        
        # Number circle
        number_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(2.4), top + Inches(0.5),
                                               Inches(0.6), Inches(0.6))
        number_circle.fill.solid()
        number_circle.fill.fore_color.rgb = INK_BLACK
        number_circle.line.fill.background()
        
        # Number text
        add_text_box(slide, Inches(2.4), top + Inches(0.5), Inches(0.6), Inches(0.6),
                     step["number"], font_size=24, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        
        # Icon
        add_text_box(slide, Inches(3.3), top + Inches(0.3), Inches(0.8), Inches(0.8),
                     step["icon"], font_size=32, align=PP_ALIGN.CENTER)
        
        # Title
        add_text_box(slide, Inches(4.2), top + Inches(0.3), Inches(6.5), Inches(0.5),
                     step["title"], font_size=20, bold=True, color=INK_BLACK)
        
        # Description
        add_text_box(slide, Inches(4.2), top + Inches(0.8), Inches(6.5), Inches(0.6),
                     step["desc"], font_size=14, color=MUTED_TEXT)
    
    # CTA at bottom
    cta_card = add_cartoon_card(slide, Inches(3.5), Inches(6.2), Inches(6.3), Inches(0.9),
                                YELLOW, offset_pt=5)
    add_text_box(slide, Inches(3.7), Inches(6.4), Inches(6), Inches(0.5),
                 "🎓 Join Thousands of Students Passing Smarter!", 
                 font_size=18, bold=True, color=INK_BLACK, align=PP_ALIGN.CENTER)

# ============================================================================
# SLIDE 9: Closing / Thank You
# ============================================================================
def slide_9_thank_you():
    slide = create_slide()
    
    # Large thank you card
    thank_you_card = add_cartoon_card(slide, Inches(2), Inches(2), Inches(9.3), Inches(3.5),
                                      YELLOW, offset_pt=10)
    
    # Thank you text
    add_heading(slide, Inches(2.5), Inches(2.5), Inches(8.5), Inches(0.8),
                "Thank You! 🎉", font_size=56, color=INK_BLACK)
    
    add_text_box(slide, Inches(2.5), Inches(3.5), Inches(8.5), Inches(1.5),
                 "Go Study! is built by students, for students.\n\n"
                 "Stop guessing. Start strategizing.\n"
                 "Pass smarter with Go Study! 📚✨",
                 font_size=18, bold=True, color=INK_BLACK, align=PP_ALIGN.CENTER)
    
    # Contact info card
    contact_card = add_cartoon_card(slide, Inches(3.5), Inches(5.8), Inches(6.3), Inches(0.8),
                                    SKY_BLUE_PALE, offset_pt=4)
    add_text_box(slide, Inches(3.7), Inches(6), Inches(6), Inches(0.4),
                 "📧 Questions? WhatsApp your school registry or tech support",
                 font_size=14, bold=True, color=SKY_BLUE, align=PP_ALIGN.CENTER)

# ============================================================================
# BUILD PRESENTATION
# ============================================================================
print("🎨 Creating Go Study! Presentation...")

slide_1_title()
print("✅ Slide 1: Title")

slide_2_problem()
print("✅ Slide 2: The Problem")

slide_3_solution()
print("✅ Slide 3: The Solution")

slide_4_grade_calculator()
print("✅ Slide 4: Grade Calculator")

slide_5_score_strategizer()
print("✅ Slide 5: Score Strategizer")

slide_6_exam_library()
print("✅ Slide 6: Exam Library")

slide_7_premium()
print("✅ Slide 7: Premium Features")

slide_8_get_started()
print("✅ Slide 8: Get Started")

slide_9_thank_you()
print("✅ Slide 9: Thank You")

# Save presentation
prs.save(OUTPUT_PATH)
print(f"\n🎉 Presentation saved to: {OUTPUT_PATH}")
print(f"📊 Total slides: {len(prs.slides)}")
print("\n✨ Done! Open the file to view your cartoon-themed presentation.")
