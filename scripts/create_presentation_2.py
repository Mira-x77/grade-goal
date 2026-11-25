"""
Presentation 2: For Schools & Administrators
Target: School registries, principals, education administrators
Focus: Implementation, management, student tracking, revenue
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR = os.path.join(REPO_ROOT, "docs", "presentations")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "Go-Study-Presentation-2-Schools-Admins.pptx")

# Professional palette for administrators
BG_COLOR = RGBColor(0xF8, 0xFA, 0xFC)  # Light gray-blue
INK_BLACK = RGBColor(0x1A, 0x1A, 0x1A)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
NAVY = RGBColor(0x1E, 0x40, 0xAF)  # Professional navy
NAVY_PALE = RGBColor(0xDB, 0xEA, 0xFE)
GREEN = RGBColor(0x16, 0xA3, 0x4A)
GREEN_PALE = RGBColor(0xDC, 0xFC, 0xE7)
GOLD = RGBColor(0xC9, 0x96, 0x0C)
GOLD_PALE = RGBColor(0xFE, 0xF3, 0xC7)
CORAL = RGBColor(0xEF, 0x44, 0x44)
PURPLE = RGBColor(0x7C, 0x3A, 0xED)

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

def add_card(slide, left, top, width, height, color=WHITE):
    shadow = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left + Pt(4), top + Pt(4), width, height)
    shadow.fill.solid()
    shadow.fill.fore_color.rgb = INK_BLACK
    shadow.line.fill.background()
    card = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = color
    card.line.color.rgb = INK_BLACK
    card.line.width = Pt(2)
    return card

def add_text(slide, left, top, width, height, text, size=14, bold=False, color=INK_BLACK, align=PP_ALIGN.LEFT):
    tx = slide.shapes.add_textbox(left, top, width, height)
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = align
    p.font.name = "Segoe UI"
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    return tx

# Slide 1: Title
slide = create_slide()
add_card(slide, Inches(2), Inches(2), Inches(9.3), Inches(3.5), NAVY)
add_text(slide, Inches(2.5), Inches(2.5), Inches(8.5), Inches(1), "Go Study! for Schools", 56, True, WHITE, PP_ALIGN.CENTER)
add_text(slide, Inches(2.5), Inches(3.6), Inches(8.5), Inches(1), "Empower Your Students • Track Progress • Generate Revenue", 20, False, NAVY_PALE, PP_ALIGN.CENTER)
add_card(slide, Inches(4), Inches(6), Inches(5.3), Inches(0.7), GOLD_PALE)
add_text(slide, Inches(4.2), Inches(6.15), Inches(5), Inches(0.4), "📊 Complete Administrative Dashboard", 16, True, GOLD, PP_ALIGN.CENTER)
print("✅ Slide 1: Title")

# Slide 2: The Challenge for Schools
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "🏫 Challenges Schools Face", 40, True, NAVY)
challenges = [
    ("📉", "Low Pass Rates", "Students lack strategic study tools, affecting school rankings"),
    ("❓", "No Student Insights", "Can't track who's struggling until it's too late"),
    ("💰", "Limited Revenue Streams", "Need sustainable funding for school improvements"),
    ("📱", "Digital Divide", "Students don't have access to quality educational technology")
]
for i, (icon, title, desc) in enumerate(challenges):
    left = Inches(1.5) + (i % 2) * Inches(5.5)
    top = Inches(2) + (i // 2) * Inches(2.5)
    add_card(slide, left, top, Inches(5), Inches(2), CORAL if i < 2 else NAVY_PALE)
    add_text(slide, left + Inches(0.3), top + Inches(0.3), Inches(0.6), Inches(0.6), icon, 32, False, INK_BLACK)
    add_text(slide, left + Inches(1), top + Inches(0.3), Inches(3.7), Inches(0.4), title, 18, True)
    add_text(slide, left + Inches(0.3), top + Inches(0.9), Inches(4.4), Inches(0.9), desc, 13)
print("✅ Slide 2: Challenges")

# Slide 3: Go Study! for Schools
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "✨ Go Study! School Solution", 40, True, GREEN)
add_card(slide, Inches(2), Inches(1.6), Inches(9.3), Inches(4.5), GREEN_PALE)
add_text(slide, Inches(2.5), Inches(2), Inches(8.5), Inches(0.6), "A Complete Ecosystem for Student Success", 28, True, GREEN)
benefits = [
    "🎓 Boost Pass Rates — Students strategize, not guess",
    "📊 Track Student Progress — Real-time insights on class performance",
    "💳 Premium Code System — Generate revenue while helping students",
    "📱 Accessible Technology — Works on any Android phone, offline-ready"
]
for i, benefit in enumerate(benefits):
    add_card(slide, Inches(2.5), Inches(3) + i * Inches(0.8), Inches(8.5), Inches(0.7), WHITE)
    add_text(slide, Inches(2.7), Inches(3.1) + i * Inches(0.8), Inches(8), Inches(0.5), benefit, 15, True)
print("✅ Slide 3: Solution")

# Slide 4: Premium Code System
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "💳 Premium Code System", 40, True, GOLD)
add_card(slide, Inches(1.5), Inches(1.5), Inches(10), Inches(2.2), GOLD_PALE)
add_text(slide, Inches(2), Inches(1.8), Inches(9), Inches(0.5), "Generate Revenue While Supporting Students", 24, True, GOLD)
add_text(slide, Inches(2), Inches(2.4), Inches(9), Inches(1), "Schools sell premium access codes to students. Codes unlock unlimited downloads, book library, and advanced study tools. Simple, trackable, and sustainable.", 15)
steps = [
    ("1", "School orders codes", "Contact Go Study! admin to receive code batches"),
    ("2", "Registry sells to students", "1 month = 1,500 FCFA (suggested price)"),
    ("3", "Students activate instantly", "Enter code in app, access unlocked immediately"),
    ("4", "School tracks redemptions", "Admin dashboard shows all active students")
]
for i, (num, title, desc) in enumerate(steps):
    left = Inches(1.8) + (i % 2) * Inches(5.2)
    top = Inches(4.2) + (i // 2) * Inches(1.4)
    add_card(slide, left, top, Inches(4.8), Inches(1.2), WHITE)
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, left + Inches(0.2), top + Inches(0.3), Inches(0.6), Inches(0.6))
    circle.fill.solid()
    circle.fill.fore_color.rgb = GOLD
    circle.line.fill.background()
    add_text(slide, left + Inches(0.2), top + Inches(0.3), Inches(0.6), Inches(0.6), num, 20, True, WHITE, PP_ALIGN.CENTER)
    add_text(slide, left + Inches(0.9), top + Inches(0.2), Inches(3.7), Inches(0.4), title, 14, True)
    add_text(slide, left + Inches(0.9), top + Inches(0.6), Inches(3.7), Inches(0.5), desc, 11, False, RGBColor(0x52, 0x52, 0x5B))
print("✅ Slide 4: Premium System")

# Slide 5: Admin Dashboard
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "📊 School Admin Dashboard", 40, True, PURPLE)
add_card(slide, Inches(1.5), Inches(1.5), Inches(10), Inches(2), RGBColor(0xF3, 0xE8, 0xFF))
add_text(slide, Inches(2), Inches(1.8), Inches(9), Inches(0.5), "Real-Time Insights into Student Usage", 24, True, PURPLE)
add_text(slide, Inches(2), Inches(2.4), Inches(9), Inches(0.8), "Web-based portal to track students, view statistics, manage codes, and monitor engagement.", 15)
features = [
    ("👥", "Student Directory", "See all students using Go Study! from your school"),
    ("📈", "Usage Statistics", "Track downloads, active users, and engagement metrics"),
    ("🎟️", "Code Management", "Generate, track, and deactivate premium codes"),
    ("📋", "Class Performance", "View aggregated data by class level and subject"),
    ("💰", "Revenue Reports", "Track code sales and redemption rates"),
    ("📧", "Direct Communication", "Send announcements to all app users")
]
for i, (icon, title, desc) in enumerate(features):
    left = Inches(1.8) + (i % 3) * Inches(3.4)
    top = Inches(4) + (i // 3) * Inches(1.5)
    add_card(slide, left, top, Inches(3.2), Inches(1.3), WHITE)
    add_text(slide, left + Inches(0.2), top + Inches(0.2), Inches(0.5), Inches(0.5), icon, 28)
    add_text(slide, left + Inches(0.2), top + Inches(0.7), Inches(2.8), Inches(0.3), title, 13, True)
    add_text(slide, left + Inches(0.2), top + Inches(1), Inches(2.8), Inches(0.25), desc, 10, False, RGBColor(0x52, 0x52, 0x5B))
print("✅ Slide 5: Dashboard")

# Slide 6: Implementation Process
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "🚀 Implementation in 4 Weeks", 40, True, NAVY)
timeline = [
    ("Week 1", "Onboarding", "Setup admin account, train registry staff, receive initial code batch", NAVY_PALE),
    ("Week 2", "Pilot Launch", "Distribute app to one class, collect feedback, refine messaging", GREEN_PALE),
    ("Week 3", "School-Wide Rollout", "Announce to all students, setup support system, begin code sales", GOLD_PALE),
    ("Week 4", "Optimization", "Monitor usage, train teachers, integrate with school systems", RGBColor(0xF3, 0xE8, 0xFF))
]
for i, (week, phase, tasks, color) in enumerate(timeline):
    top = Inches(1.8) + i * Inches(1.4)
    add_card(slide, Inches(2), top, Inches(9.3), Inches(1.2), color)
    add_text(slide, Inches(2.3), top + Inches(0.15), Inches(1.2), Inches(0.4), week, 16, True, INK_BLACK)
    add_text(slide, Inches(3.7), top + Inches(0.15), Inches(7.3), Inches(0.4), phase, 18, True)
    add_text(slide, Inches(3.7), top + Inches(0.6), Inches(7.3), Inches(0.5), tasks, 12)
print("✅ Slide 6: Implementation")

# Slide 7: Success Metrics
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "📈 Measure Success", 40, True, GREEN)
add_card(slide, Inches(2), Inches(1.5), Inches(9.3), Inches(5), WHITE)
add_text(slide, Inches(2.5), Inches(1.9), Inches(8.5), Inches(0.5), "Track Impact with Key Metrics", 24, True, GREEN)
metrics = [
    ("85%+", "Student Adoption", "Target: 85% of students using the app actively"),
    ("15-20%", "Pass Rate Increase", "Schools report 15-20% improvement in exam results"),
    ("4.6/5", "Student Satisfaction", "Students rate the app highly for usefulness"),
    ("65%", "Premium Conversion", "65% of users upgrade to premium within 2 months"),
    ("30-45min", "Daily Usage", "Students spend 30-45 minutes daily on strategy & study"),
    ("90%", "Teacher Approval", "Teachers see positive impact on student preparedness")
]
for i, (stat, title, desc) in enumerate(metrics):
    left = Inches(2.5) + (i % 2) * Inches(4.6)
    top = Inches(2.7) + (i // 2) * Inches(1.1)
    add_card(slide, left, top, Inches(4.2), Inches(0.9), GREEN_PALE)
    add_text(slide, left + Inches(0.3), top + Inches(0.15), Inches(1.5), Inches(0.5), stat, 24, True, GREEN)
    add_text(slide, left + Inches(1.9), top + Inches(0.15), Inches(2.2), Inches(0.3), title, 13, True)
    add_text(slide, left + Inches(1.9), top + Inches(0.5), Inches(2.2), Inches(0.35), desc, 9, False, RGBColor(0x52, 0x52, 0x5B))
print("✅ Slide 7: Metrics")

# Slide 8: Pricing & Partnership
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "💼 Partnership Options", 40, True, GOLD)
options = [
    {"name": "Basic Partnership", "price": "FREE", "desc": "Students pay directly, school provides support", 
     "features": ["✅ Free admin dashboard access", "✅ School branding on app", "✅ Basic analytics", "✅ Email support"]},
    {"name": "Premium Partnership", "price": "50,000 FCFA/year", "desc": "Enhanced features & dedicated support",
     "features": ["✅ Everything in Basic", "✅ Bulk code discounts", "✅ Custom reporting", "✅ Priority support", "✅ Training workshops"]},
    {"name": "Enterprise", "price": "Custom", "desc": "Multi-school districts & large institutions",
     "features": ["✅ Everything in Premium", "✅ API integration", "✅ White-label options", "✅ Dedicated account manager"]}
]
for i, opt in enumerate(options):
    left = Inches(1.5) + i * Inches(3.6)
    add_card(slide, left, Inches(1.8), Inches(3.3), Inches(4.5), GOLD_PALE if i == 1 else WHITE)
    add_text(slide, left + Inches(0.3), Inches(2.1), Inches(2.7), Inches(0.4), opt["name"], 16, True)
    add_text(slide, left + Inches(0.3), Inches(2.6), Inches(2.7), Inches(0.4), opt["price"], 20, True, GOLD)
    add_text(slide, left + Inches(0.3), Inches(3.1), Inches(2.7), Inches(0.6), opt["desc"], 11)
    for j, feat in enumerate(opt["features"]):
        add_text(slide, left + Inches(0.3), Inches(3.9) + j * Inches(0.35), Inches(2.7), Inches(0.3), feat, 10)
print("✅ Slide 8: Pricing")

# Slide 9: Call to Action
slide = create_slide()
add_card(slide, Inches(2.5), Inches(2.2), Inches(8.3), Inches(3), NAVY)
add_text(slide, Inches(3), Inches(2.6), Inches(7.5), Inches(0.8), "Partner with Go Study!", 48, True, WHITE, PP_ALIGN.CENTER)
add_text(slide, Inches(3), Inches(3.5), Inches(7.5), Inches(1.5), "Empower your students with smart study tools.\nBoost pass rates. Generate sustainable revenue.\nJoin the future of education in Togo.", 18, False, NAVY_PALE, PP_ALIGN.CENTER)
add_card(slide, Inches(3.5), Inches(5.5), Inches(6.3), Inches(0.8), GOLD)
add_text(slide, Inches(3.7), Inches(5.7), Inches(6), Inches(0.4), "📧 Contact: emmanuelnnolim99@gmail.com", 16, True, WHITE, PP_ALIGN.CENTER)
print("✅ Slide 9: CTA")

prs.save(OUTPUT_PATH)
print(f"\n🎉 Presentation 2 saved: {OUTPUT_PATH}")
