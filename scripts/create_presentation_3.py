"""
Presentation 3: Technical Implementation
Target: Developers, tech teams, technical stakeholders
Focus: Architecture, features, tech stack, scalability
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
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "Go-Study-Presentation-3-Technical.pptx")

# Tech theme colors
BG_COLOR = RGBColor(0x0F, 0x17, 0x2A)  # Dark blue
INK_BLACK = RGBColor(0x1A, 0x1A, 0x1A)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CYAN = RGBColor(0x06, 0xB6, 0xD4)  # Bright cyan
CYAN_PALE = RGBColor(0xCF, 0xFA, 0xFE)
GREEN = RGBColor(0x22, 0xC5, 0x5E)  # Bright green
ORANGE = RGBColor(0xF9, 0x73, 0x16)  # Bright orange
PURPLE = RGBColor(0xA7, 0x8B, 0xFA)  # Light purple
YELLOW = RGBColor(0xFA, 0xCC, 0x15)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

def create_slide(dark=True):
    slide = prs.slides.add_slide(blank_layout)
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_COLOR if dark else RGBColor(0xF8, 0xFA, 0xFC)
    bg.line.fill.background()
    return slide

def add_card(slide, left, top, width, height, color, border_color=CYAN):
    card = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = color
    card.line.color.rgb = border_color
    card.line.width = Pt(1.5)
    return card

def add_text(slide, left, top, width, height, text, size=14, bold=False, color=WHITE, align=PP_ALIGN.LEFT):
    tx = slide.shapes.add_textbox(left, top, width, height)
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = align
    p.font.name = "Consolas"
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    return tx

# Slide 1: Title
slide = create_slide()
add_text(slide, Inches(1), Inches(2.5), Inches(11.3), Inches(1), "Go Study! Technical Overview", 64, True, CYAN, PP_ALIGN.CENTER)
add_text(slide, Inches(1), Inches(3.7), Inches(11.3), Inches(0.8), "Architecture • Tech Stack • Implementation Details", 24, False, PURPLE, PP_ALIGN.CENTER)
add_card(slide, Inches(4.5), Inches(5), Inches(4.3), Inches(0.7), RGBColor(0x1E, 0x29, 0x3B), CYAN)
add_text(slide, Inches(4.7), Inches(5.15), Inches(4), Inches(0.4), "💻 Built with React + Capacitor + Supabase", 14, True, CYAN, PP_ALIGN.CENTER)
print("✅ Slide 1: Title")

# Slide 2: Tech Stack
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "⚙️ Tech Stack", 40, True, CYAN)
stacks = [
    {"title": "Frontend", "color": RGBColor(0x1E, 0x40, 0xAF), "techs": ["React 18 + TypeScript", "Vite for build", "TailwindCSS + shadcn/ui", "Framer Motion animations", "React Query for data"]},
    {"title": "Mobile", "color": RGBColor(0x16, 0xA3, 0x4A), "techs": ["Capacitor 6 (Android)", "Native PDF viewer", "File system API", "Offline-first storage", "Push notifications"]},
    {"title": "Backend", "color": RGBColor(0xF9, 0x73, 0x16), "techs": ["Supabase (PostgreSQL)", "Row-level security", "Edge functions", "Real-time subscriptions", "Cloud storage"]},
    {"title": "DevOps", "color": RGBColor(0x93, 0x33, 0xEA), "techs": ["GitHub Actions CI/CD", "Gradle for Android builds", "Automated testing", "Version management", "Error tracking"]}
]
for i, stack in enumerate(stacks):
    left = Inches(1.5) + (i % 2) * Inches(5.5)
    top = Inches(1.8) + (i // 2) * Inches(2.8)
    add_card(slide, left, top, Inches(5), Inches(2.5), RGBColor(0x1E, 0x29, 0x3B), stack["color"])
    add_text(slide, left + Inches(0.3), top + Inches(0.3), Inches(4.4), Inches(0.4), stack["title"], 20, True, stack["color"])
    for j, tech in enumerate(stack["techs"]):
        add_text(slide, left + Inches(0.3), top + Inches(0.8) + j * Inches(0.35), Inches(4.4), Inches(0.3), f"• {tech}", 11, False, WHITE)
print("✅ Slide 2: Tech Stack")

# Slide 3: Architecture
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "🏗️ System Architecture", 40, True, GREEN)
layers = [
    ("Presentation Layer", "React components, routing, state management, UI/UX", CYAN),
    ("Business Logic", "Grade calculation, score strategy, PDF handling, sync", GREEN),
    ("Data Layer", "Local storage, Supabase sync, offline-first caching", ORANGE),
    ("Native Layer", "Capacitor plugins, file system, PDF viewer, notifications", PURPLE)
]
for i, (layer, desc, color) in enumerate(layers):
    top = Inches(1.8) + i * Inches(1.3)
    add_card(slide, Inches(2), top, Inches(9.3), Inches(1.1), RGBColor(0x1E, 0x29, 0x3B), color)
    add_text(slide, Inches(2.3), top + Inches(0.2), Inches(3), Inches(0.4), layer, 16, True, color)
    add_text(slide, Inches(2.3), top + Inches(0.6), Inches(8.7), Inches(0.4), desc, 12, False, WHITE)
add_card(slide, Inches(2.5), Inches(6.5), Inches(8.3), Inches(0.6), RGBColor(0x1E, 0x40, 0xAF))
add_text(slide, Inches(2.7), Inches(6.65), Inches(8), Inches(0.3), "✅ Offline-first • Progressive sync • Native performance", 13, True, CYAN)
print("✅ Slide 3: Architecture")

# Slide 4: Key Features Implementation
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "🔧 Feature Implementation", 40, True, CYAN)
features = [
    ("Grade Calculator", "Multi-system (APC, French, Nigerian)\nWeighted coefficients • Real-time calc\nColor-coded feedback", CYAN),
    ("Score Strategizer", "Target-based simulation\nDrag-and-drop sliders\nScenario comparison", GREEN),
    ("Exam Library", "Offline PDF storage • Smart filters\nDownload quotas • Browse phone folders\nPremium gating", ORANGE),
    ("Sync System", "Conflict resolution • Incremental sync\nOffline queue • Auto-retry", PURPLE),
    ("Premium System", "12-char activation codes\nDevice registration (max 2)\nServer validation • Local caching", YELLOW),
    ("Admin Dashboard", "React SPA • User analytics\nCode management • Revenue tracking", RGBColor(0xF4, 0x72, 0x17))
]
for i, (title, details, color) in enumerate(features):
    left = Inches(1.5) + (i % 3) * Inches(3.6)
    top = Inches(1.8) + (i // 3) * Inches(2.5)
    add_card(slide, left, top, Inches(3.3), Inches(2.2), RGBColor(0x1E, 0x29, 0x3B), color)
    add_text(slide, left + Inches(0.3), top + Inches(0.3), Inches(2.7), Inches(0.4), title, 14, True, color)
    add_text(slide, left + Inches(0.3), top + Inches(0.8), Inches(2.7), Inches(1.2), details, 10, False, WHITE)
print("✅ Slide 4: Features")

# Slide 5: Database Schema
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "🗄️ Database Schema Highlights", 40, True, PURPLE)
tables = [
    ("user_profile", "Student data, metadata, settings, grading system"),
    ("subscription_codes", "Premium codes, duration, redemptions, expiry"),
    ("subscription_devices", "Device tracking, user_id, activation status"),
    ("exam_papers", "Paper metadata, filters, URLs, download counts"),
    ("user_downloads", "Download history, quota tracking, timestamps"),
    ("books", "Textbook library, descriptions, file storage"),
    ("analytics_sessions", "Usage tracking, page views, feature engagement"),
    ("download_quota", "Monthly limits, resets, premium overrides")
]
for i, (table, desc) in enumerate(tables):
    left = Inches(1.5) + (i % 2) * Inches(5.5)
    top = Inches(1.8) + (i // 2) * Inches(0.75)
    add_card(slide, left, top, Inches(5), Inches(0.65), RGBColor(0x1E, 0x29, 0x3B), PURPLE)
    add_text(slide, left + Inches(0.2), top + Inches(0.12), Inches(1.8), Inches(0.3), table, 11, True, PURPLE)
    add_text(slide, left + Inches(2.1), top + Inches(0.12), Inches(2.7), Inches(0.4), desc, 9, False, WHITE)
print("✅ Slide 5: Database")

# Slide 6: Security & Performance
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "🔒 Security & Performance", 40, True, ORANGE)
security = [
    ("Authentication", "Supabase Auth • Guest mode • Anonymous users • Secure token refresh"),
    ("Authorization", "Row-level security policies • User-scoped queries • Premium validation"),
    ("Data Protection", "End-to-end encryption • Secure local storage • HTTPS only"),
    ("Code Security", "Server-side validation • Single-use codes • Device registration")
]
performance = [
    ("Offline-First", "IndexedDB caching • Background sync • Queue management"),
    ("Optimization", "Lazy loading • Code splitting • Image optimization • Tree shaking"),
    ("Caching", "Service workers • Asset caching • API response caching"),
    ("Monitoring", "Error tracking • Analytics • Performance metrics • User feedback")
]
add_text(slide, Inches(1.5), Inches(1.6), Inches(4.5), Inches(0.4), "Security", 20, True, ORANGE)
for i, (title, desc) in enumerate(security):
    top = Inches(2.1) + i * Inches(0.9)
    add_card(slide, Inches(1.5), top, Inches(4.5), Inches(0.8), RGBColor(0x1E, 0x29, 0x3B), ORANGE)
    add_text(slide, Inches(1.7), top + Inches(0.15), Inches(4.1), Inches(0.25), title, 12, True, ORANGE)
    add_text(slide, Inches(1.7), top + Inches(0.45), Inches(4.1), Inches(0.3), desc, 9, False, WHITE)
add_text(slide, Inches(6.8), Inches(1.6), Inches(4.5), Inches(0.4), "Performance", 20, True, GREEN)
for i, (title, desc) in enumerate(performance):
    top = Inches(2.1) + i * Inches(0.9)
    add_card(slide, Inches(6.8), top, Inches(4.5), Inches(0.8), RGBColor(0x1E, 0x29, 0x3B), GREEN)
    add_text(slide, Inches(7), top + Inches(0.15), Inches(4.1), Inches(0.25), title, 12, True, GREEN)
    add_text(slide, Inches(7), top + Inches(0.45), Inches(4.1), Inches(0.3), desc, 9, False, WHITE)
print("✅ Slide 6: Security")

# Slide 7: Deployment Pipeline
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "🚀 Deployment Pipeline", 40, True, CYAN)
stages = [
    ("1. Development", "Feature branches • Local testing • Code review", RGBColor(0x06, 0xB6, 0xD4)),
    ("2. Build", "Vite production build • TypeScript compilation • Asset optimization", RGBColor(0x22, 0xC5, 0x5E)),
    ("3. Android Package", "Capacitor sync • Gradle build • APK/AAB generation • Code signing", RGBColor(0xF9, 0x73, 0x16)),
    ("4. Testing", "Unit tests • Integration tests • E2E tests • Device testing", RGBColor(0xA7, 0x8B, 0xFA)),
    ("5. Release", "Version bump • Changelog • GitHub release • Distribution", RGBColor(0xFA, 0xCC, 0x15))
]
for i, (stage, desc, color) in enumerate(stages):
    top = Inches(2) + i * Inches(1)
    add_card(slide, Inches(2), top, Inches(9.3), Inches(0.85), RGBColor(0x1E, 0x29, 0x3B), color)
    add_text(slide, Inches(2.3), top + Inches(0.15), Inches(2.5), Inches(0.4), stage, 16, True, color)
    add_text(slide, Inches(4.9), top + Inches(0.2), Inches(6.2), Inches(0.5), desc, 12, False, WHITE)
add_card(slide, Inches(3.5), Inches(6.5), Inches(6.3), Inches(0.6), RGBColor(0x16, 0xA3, 0x4A))
add_text(slide, Inches(3.7), Inches(6.65), Inches(6), Inches(0.3), "⚡ Automated CI/CD • Zero-downtime deploys", 13, True, WHITE, PP_ALIGN.CENTER)
print("✅ Slide 7: Deployment")

# Slide 8: Scalability & Future
slide = create_slide()
add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.7), "📈 Scalability & Roadmap", 40, True, PURPLE)
add_card(slide, Inches(1.5), Inches(1.5), Inches(10), Inches(2), RGBColor(0x1E, 0x29, 0x3B), PURPLE)
add_text(slide, Inches(2), Inches(1.8), Inches(9), Inches(0.5), "Built to Scale", 24, True, PURPLE)
add_text(slide, Inches(2), Inches(2.4), Inches(9), Inches(0.9), "Serverless architecture • PostgreSQL replication • CDN for assets • Horizontal scaling ready", 14, False, WHITE)
roadmap = [
    ("Q1 2027", "iOS version • Web app • AI study recommendations"),
    ("Q2 2027", "Multi-country support • Payment integration • Gamification"),
    ("Q3 2027", "Teacher tools • Parent dashboard • Live classes integration"),
    ("Q4 2027", "ML-powered predictions • Smart study plans • Peer collaboration")
]
add_text(slide, Inches(1.5), Inches(4), Inches(10), Inches(0.4), "🗓️ Roadmap", 20, True, CYAN)
for i, (period, features) in enumerate(roadmap):
    top = Inches(4.6) + i * Inches(0.7)
    add_card(slide, Inches(1.8), top, Inches(9.5), Inches(0.6), RGBColor(0x1E, 0x29, 0x3B), CYAN)
    add_text(slide, Inches(2), top + Inches(0.12), Inches(1.2), Inches(0.35), period, 12, True, CYAN)
    add_text(slide, Inches(3.3), top + Inches(0.12), Inches(7.8), Inches(0.35), features, 11, False, WHITE)
print("✅ Slide 8: Scalability")

# Slide 9: Technical Contact
slide = create_slide()
add_card(slide, Inches(2), Inches(2), Inches(9.3), Inches(3.5), RGBColor(0x1E, 0x29, 0x3B), CYAN)
add_text(slide, Inches(2.5), Inches(2.5), Inches(8.5), Inches(0.8), "Go Study! Tech Stack", 48, True, CYAN, PP_ALIGN.CENTER)
add_text(slide, Inches(2.5), Inches(3.5), Inches(8.5), Inches(1.3), "React • TypeScript • Capacitor • Supabase\n\nOffline-first • Scalable • Secure\nBuilt for African students, by African developers", 16, False, WHITE, PP_ALIGN.CENTER)
add_card(slide, Inches(3.5), Inches(5.3), Inches(6.3), Inches(0.8), RGBColor(0x16, 0xA3, 0x4A))
add_text(slide, Inches(3.7), Inches(5.5), Inches(6), Inches(0.4), "💻 Developer: emmanuelnnolim99@gmail.com", 15, True, WHITE, PP_ALIGN.CENTER)
print("✅ Slide 9: Contact")

prs.save(OUTPUT_PATH)
print(f"\n🎉 Presentation 3 saved: {OUTPUT_PATH}\n✨ All 3 presentations complete!")
