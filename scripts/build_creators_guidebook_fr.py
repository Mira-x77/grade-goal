# -*- coding: utf-8 -*-
"""French 20-page A4 rebuild of Creators_Guidebook — same structure."""
import os
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT = r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4_FR.pdf"
W, H = A4
NAVY = HexColor("#0B1F33")
TEAL = HexColor("#1A6B6B")
GOLD = HexColor("#C4A35A")
PALE = HexColor("#F4F1EA")
CARD = HexColor("#EEF3F6")
INK = HexColor("#1A1A1A")
MUTED = HexColor("#4A5560")
RED = HexColor("#8B2E2E")
GREEN = HexColor("#1F6B4A")

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


def draw_wrap(c, text, x, y, font, size, max_w, leading, color=INK, max_lines=20):
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


def header(c, kicker, brand="LE GUIDE DU CRÉATEUR"):
    c.setFillColor(NAVY)
    c.rect(0, H - 28, W, 28, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 30, W, 2, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FONT, 7)
    c.drawString(18, H - 12, kicker.upper())
    c.setFont(FONTB, 8)
    c.drawRightString(W - 18, H - 12, brand)
    c.setFillColor(PALE)
    c.rect(0, 0, W, H - 30, fill=1, stroke=0)
    return H - 42


def footer(c, section, page):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, 16, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FONT, 7)
    c.drawString(18, 5, section)
    c.drawRightString(W - 18, 5, f"Page {page} sur 20")


def placeholder(c, x, y, w, h, title, hint):
    c.setFillColor(HexColor("#DCE4EA"))
    c.setStrokeColor(HexColor("#9AADB8"))
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=1)
    c.setFillColor(NAVY)
    c.setFont(FONTB, 8)
    c.drawCentredString(x + w / 2, y + h / 2 + 8, title)
    draw_wrap(c, hint, x + 8, y + h / 2 - 6, FONT, 6.5, w - 16, 8.5, MUTED, 4)


def card(c, x, y, w, h, fill=CARD):
    c.setFillColor(fill)
    c.setStrokeColor(HexColor("#C5D0D6"))
    c.setLineWidth(0.4)
    c.roundRect(x, y, w, h, 3, fill=1, stroke=1)


def p1(c):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FONT, 11)
    c.drawString(36, H - 70, "Compétences tech")
    c.setFont(FONTB, 28)
    c.drawString(36, H - 104, "pour")
    c.drawString(36, H - 136, "débutants")
    c.setFont(FONT, 9)
    c.setFillColor(GOLD)
    c.drawString(36, H - 160, "Édition 2026  •  Guide simple, pensé pour les débutants")
    placeholder(
        c, 36, 430, W - 72, 200,
        "EMPLACEMENT ILLUSTRATION DE COUVERTURE",
        "Collage : laptop VS Code + invite IA, sprites Scratch, timeline CapCut, mini robot.",
    )
    items = [
        ("Codage vibe & langages", "Frontend vs backend, IDE, formule d'invite IA sûre et règles de sécurité."),
        ("Projets de jeux Scratch", "4 jeux complets : Pommes, Chasse au chat, Requin affamé & Dino Chrome."),
        ("Montage vidéo CapCut", "Coupes, jonctions, transitions, incrustation verte & sous-titres auto."),
        ("Robotique casual", "Cerveau du robot (micro:bit/Arduino), capteurs et moteurs — niveau découverte."),
    ]
    y = 400
    for t, b in items:
        c.setFillColor(GOLD)
        c.setFont(FONTB, 9)
        c.drawString(36, y, t)
        c.setFillColor(HexColor("#D5DEE6"))
        c.setFont(FONT, 8)
        draw_wrap(c, b, 36, y - 14, FONT, 8, W - 72, 11, HexColor("#D5DEE6"), 2)
        y -= 48
    footer(c, "Couverture", 1)


def p2(c):
    y = header(c, "Bienvenue & vue d'ensemble")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 16)
    c.drawString(18, y, "Bienvenue dans le monde du créateur")
    y -= 16
    c.setFont(FONT, 8)
    c.setFillColor(MUTED)
    c.drawString(18, y, "Des compétences tech concrètes, sans jargon académique compliqué")
    y -= 18
    y = draw_wrap(
        c,
        "Ce guide a été écrit pour t'apprendre de vrais outils créatifs. Pas de formules mathématiques intimidantes ni de parler universitaire. Tu vas construire des jeux, monter des vidéos, coder avec l'IA, et comprendre comment marchent des robots simples.",
        18, y, FONT, 8.5, W - 36, 11.5, INK, 4,
    )
    y -= 8
    card(c, 18, y - 36, W - 36, 34, HexColor("#E8F0EC"))
    c.setFillColor(GREEN)
    c.setFont(FONTB, 8)
    c.drawString(26, y - 14, "La promesse du créateur")
    draw_wrap(c, "Chaque thème est expliqué en français simple, avec des fiches visuelles et des étapes.", 26, y - 28, FONT, 7.5, W - 52, 10, INK, 1)
    y -= 52
    c.setFillColor(NAVY)
    c.setFont(FONTB, 10)
    c.drawString(18, y, "Carte complète du guide — 20 pages")
    y -= 16
    mods = [
        ("MODULE 1 : BASES DU CODE & VIBE CODING", "PAGES 3–6",
         [("Ch 1 : Langages de code 101 (frontend vs backend)", "Page 3"),
          ("Ch 2 : Sites statiques vs sites fonctionnels / dynamiques", "Page 4"),
          ("Ch 3 & 4 : Intro au vibe coding & maîtriser l'invite IA", "Page 5"),
          ("Ch 5 & 6-7 : Matériel / logiciel", "Page 6")]),
        ("MODULE 2 : PROJETS DE JEUX SCRATCH", "PAGES 7–11",
         [("Ch 8 : Commandes Scratch & bases des blocs", "Page 7"),
          ("Ch 9 : Périphériques d'entrée et de sortie", "Page 8"),
          ("Ch 10 : Jeu 2 — Chasse au chat / poursuite du rat", "Page 9"),
          ("Ch 11 : Exercice Scratch", "Page 10"),
          ("Ch 12-14 : Dino Chrome & finitions de jeu", "Page 11")]),
        ("MODULE 3 : MONTAGE VIDÉO CAPCUT", "PAGES 12–15",
         [("Ch 15 : Bases CapCut & aperçu de l'espace de travail", "Page 12"),
          ("Ch 16 & 17 : Couper les clips & transitions fluides", "Page 13"),
          ("Ch 18 : Mèmes, incrustations & fond vert", "Page 14"),
          ("Ch 19-21 : Sous-titres auto, sync musique & export", "Page 15")]),
        ("MODULE 4 : ROBOTIQUE CASUAL", "PAGES 16–18",
         [("Ch 22 : Qu'est-ce qu'un robot ? (vue surface)", "Page 16"),
          ("Ch 23 & 24 : Cerveaux, capteurs & moteurs", "Page 17"),
          ("Ch 25 : Idées de projets robotique pour commencer", "Page 18")]),
        ("RÉFÉRENCE MAÎTRE & 4e DE COUVERTURE", "PAGES 19–20",
         [("Ch 26 : Fiche mémo des 4 thèmes", "Page 19"),
          ("Ressources, liens logiciels & 4e de couverture", "Page 20")]),
    ]
    for title, pages, rows in mods:
        c.setFillColor(TEAL)
        c.setFont(FONTB, 7.5)
        c.drawString(18, y, title)
        c.setFillColor(MUTED)
        c.setFont(FONTB, 7)
        c.drawRightString(W - 18, y, pages)
        y -= 12
        for a, b in rows:
            c.setFillColor(INK)
            c.setFont(FONT, 7.5)
            c.drawString(22, y, a)
            c.drawRightString(W - 18, y, b)
            y -= 11
        y -= 4
    footer(c, "Bienvenue & vue d'ensemble", 2)


def p3(c):
    y = header(c, "Module 1 • Bases du code")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 14)
    c.drawString(18, y, "Ch 1 : Langages de code 101")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "À quoi servent les principaux langages, et ce qu'ils font")
    y -= 16
    y = draw_wrap(c, "Coder, c'est donner des instructions étape par étape à un ordinateur, dans un langage qu'il comprend. Chaque langage est fait pour un métier différent !", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 6
    c.setFont(FONTB, 10)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Frontend vs backend, tout simple")
    y -= 14
    card(c, 18, y - 150, 270, 148)
    card(c, 300, y - 150, 277, 148)
    c.setFillColor(TEAL)
    c.setFont(FONTB, 8)
    c.drawString(28, y - 14, "FRONTEND (ce que tu vois)")
    c.drawString(310, y - 14, "BACKEND (en coulisses)")
    draw_wrap(c, "Tout ce qui est visible : boutons, couleurs, texte, animations, mises en page réactives.", 28, y - 30, FONT, 7.5, 250, 10, INK, 3)
    draw_wrap(c, "HTML : le squelette (texte, titres, structure).", 28, y - 64, FONT, 7.5, 250, 10, INK, 2)
    draw_wrap(c, "CSS : les vêtements & la peinture (couleurs, polices, alignement).", 28, y - 88, FONT, 7.5, 250, 10, INK, 2)
    draw_wrap(c, "JavaScript : le muscle (clics, popups, animations).", 28, y - 112, FONT, 7.5, 250, 10, INK, 2)
    draw_wrap(c, "Le cerveau caché sur des serveurs : comptes, mots de passe, bases de données.", 310, y - 30, FONT, 7.5, 255, 10, INK, 3)
    draw_wrap(c, "Python : backend facile, populaire, aussi pour l'IA.", 310, y - 64, FONT, 7.5, 255, 10, INK, 2)
    draw_wrap(c, "Node.js / SQL : trafic serveur et fiches utilisateurs.", 310, y - 88, FONT, 7.5, 255, 10, INK, 2)
    draw_wrap(c, "API : ponts entre les demandes frontend et les données backend.", 310, y - 112, FONT, 7.5, 255, 10, INK, 2)
    y -= 168
    card(c, 18, y - 40, W - 36, 38, HexColor("#E8F0EC"))
    c.setFillColor(GREEN)
    c.setFont(FONTB, 7.5)
    c.drawString(26, y - 14, "DÉFINITION • IDE")
    draw_wrap(c, "Un IDE (environnement de développement intégré) est le logiciel où on écrit et lance le code. Exemples : VS Code ou Cursor.", 26, y - 28, FONT, 7.5, W - 52, 10, INK, 1)
    y -= 52
    placeholder(c, 18, 28, W - 36, 168, "EMPLACEMENT IMAGE PAGE 3", "Visuel frontend (page web) relié à une icône serveur / base (backend).")
    footer(c, "Module 1 • Bases du code", 3)


def p4(c):
    y = header(c, "Module 1 • Bases du code")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 14)
    c.drawString(18, y, "Ch 2 : Sites statiques vs fonctionnels")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Les deux grands types de sites web")
    y -= 16
    y = draw_wrap(c, "Avant de construire un projet web ou d'inviter l'IA, il faut savoir quel type de site tu crées !", 18, y, FONT, 8.5, W - 36, 11, INK, 2)
    y -= 8
    card(c, 18, y - 118, 270, 116)
    card(c, 300, y - 118, 277, 116)
    c.setFillColor(NAVY)
    c.setFont(FONTB, 8)
    c.drawString(28, y - 14, "1. Sites statiques (affiches numériques)")
    c.drawString(310, y - 14, "2. Sites fonctionnels / dynamiques")
    draw_wrap(c, "Le même contenu pour tous. Pas de connexion, pas de données live personnalisées. Ex. : portfolios, menus resto, blogs d'école. Construit avec HTML & CSS. Avantage : ultra rapide et facile.", 28, y - 30, FONT, 7.5, 250, 10, INK, 7)
    draw_wrap(c, "Applications interactives : comptes, sauvegarde, actions utilisateur. Ex. : Scratch, YouTube, jeux, boutiques. Construit avec JavaScript + base backend. Avantage : interactif et perso.", 310, y - 30, FONT, 7.5, 255, 10, INK, 7)
    y -= 132
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Comparaison des fonctions")
    y -= 14
    rows = [
        ("Fonction", "Sites statiques", "Apps dynamiques / fonctionnelles"),
        ("Connexions", "Pas de comptes", "Comptes & mots de passe"),
        ("Stockage", "Texte fixe dans des fichiers", "Sauvegarde sur serveur"),
        ("Temps de build", "Minutes à heures", "Jours à semaines"),
    ]
    c.setFillColor(NAVY)
    c.rect(18, y - 4, W - 36, 14, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FONTB, 7)
    c.drawString(22, y, rows[0][0])
    c.drawString(160, y, rows[0][1])
    c.drawString(340, y, rows[0][2])
    y -= 16
    for i, r in enumerate(rows[1:]):
        if i % 2 == 0:
            c.setFillColor(CARD)
            c.rect(18, y - 4, W - 36, 14, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont(FONT, 7.5)
        c.drawString(22, y, r[0])
        c.drawString(160, y, r[1])
        c.drawString(340, y, r[2])
        y -= 16
    y -= 4
    card(c, 18, y - 36, W - 36, 34, HexColor("#E8F0EC"))
    c.setFillColor(GREEN)
    c.setFont(FONTB, 7.5)
    c.drawString(26, y - 12, "DÉFINITION • HTML")
    draw_wrap(c, "HTML (HyperText Markup Language) structure titres, textes, images et boutons sur une page.", 26, y - 26, FONT, 7.5, W - 52, 10, INK, 1)
    y -= 48
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 4", "Menu resto statique vs appli de jeu interactive, côte à côte.")
    footer(c, "Module 1 • Bases du code", 4)


def p5(c):
    y = header(c, "Module 1 • Vibe coding")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 3 & 4 : Intro au vibe coding & invites IA")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Créer des logiciels en parlant à l'IA en français courant")
    y -= 16
    y = draw_wrap(c, "Le vibe coding, c'est utiliser des outils IA (ChatGPT, Claude, Cursor) pour écrire le code pendant que tu guides le projet avec des invites en langage naturel.", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 6
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Ce dont l'IA a besoin (3 exigences)")
    y -= 14
    w = (W - 42) / 3
    cols = [
        ("1. Objectif clair", "Dis exactement quelle appli (ex. : « une page compteur de score »)."),
        ("2. Techno cible", "Précise le langage (ex. : « un seul fichier HTML + CSS vanilla »)."),
        ("3. Style & fonctions", "Couleurs, mise en page, comportement des boutons."),
    ]
    for i, (t, b) in enumerate(cols):
        x = 18 + i * (w + 6)
        card(c, x, y - 70, w, 68)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 8)
        c.drawString(x + 8, y - 14, t)
        draw_wrap(c, b, x + 8, y - 30, FONT, 7.5, w - 16, 10, INK, 4)
    y -= 88
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Formule d'invite en 3 étapes")
    y -= 12
    card(c, 18, y - 78, W - 36, 76, NAVY)
    c.setFillColor(GOLD)
    c.setFont(FONTB, 7)
    c.drawString(26, y - 12, "FORMULE D'INVITE  •  NIVEAU DÉBUTANT")
    c.setFillColor(white)
    c.setFont(FONT, 8)
    c.drawString(26, y - 28, "1. QUI EST L'IA : « Tu es un expert du développement web frontend... »")
    c.drawString(26, y - 42, "2. QUOI CONSTRUIRE : « Crée une page HTML propre, un seul fichier, pour mon jeu... »")
    c.drawString(26, y - 56, "3. RÈGLES SPÉCIALES : « Fond bleu foncé, gros boutons verts, code simple. »")
    y -= 90
    card(c, 18, y - 32, W - 36, 30, HexColor("#FFF6E0"))
    c.setFillColor(NAVY)
    c.setFont(FONTB, 7.5)
    draw_wrap(c, "Le secret : tu n'as plus à mémoriser la syntaxe — apprends à décrire clairement ce que tu veux.", 26, y - 18, FONT, 7.5, W - 52, 10, INK, 1)
    y -= 44
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 5", "Utilisateur qui tape une invite, blocs HTML/CSS en retour.")
    footer(c, "Module 1 • Vibe coding", 5)


def p6(c):
    y = header(c, "Module 1 • Matériel / logiciel")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 5 & 6-7 : Matériel / logiciel")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Règles de sécurité essentielles et checklist avant décollage")
    y -= 18
    card(c, 18, y - 88, W - 36, 86, HexColor("#F8EEEE"))
    c.setFillColor(RED)
    c.setFont(FONTB, 8)
    c.drawString(26, y - 14, "RÈGLES STRICTES ! Ne JAMAIS partager avec l'IA :")
    c.setFillColor(INK)
    c.setFont(FONT, 8)
    c.drawString(26, y - 30, "• Mots de passe & codes PIN : jamais de vrais identifiants.")
    c.drawString(26, y - 44, "• Clés API & jetons privés : secrets des services en ligne.")
    c.drawString(26, y - 58, "• Données perso : téléphone, adresse, carte bancaire.")
    c.drawString(26, y - 72, "• Accès base de données : identifiants secrets du serveur.")
    y -= 102
    c.setFillColor(NAVY)
    c.setFont(FONTB, 8)
    c.drawString(18, y, "EXEMPLE DE CODE SÛR • TOUJOURS NETTOYER")
    y -= 14
    card(c, 18, y - 36, W - 36, 34, HexColor("#1A1A1A"))
    c.setFillColor(HexColor("#F0C9C9"))
    c.setFont("Courier", 7)
    c.drawString(26, y - 14, '// FAUX (DANGEREUX) : const myApiKey = "sk_live_998877665544332211";')
    c.setFillColor(HexColor("#C8E6C9"))
    c.drawString(26, y - 28, '// CORRECT (SÛR) :     const myApiKey = "YOUR_API_KEY_HERE";')
    y -= 50
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Checklist vibe coding avant décollage")
    y -= 16
    checks = [
        "Savoir si tu as besoin d'un site statique ou fonctionnel.",
        "Choisir la pile (HTML, CSS, JS, Python).",
        "Ouvrir l'IDE (VS Code ou Cursor).",
        "Écrire des invites claires : objectif + mise en page.",
        "NE JAMAIS partager mots de passe ni clés API avec l'IA !",
        "Tester le code généré dans le navigateur, étape par étape.",
    ]
    for t in checks:
        c.setFillColor(GREEN)
        c.setFont(FONTB, 9)
        c.drawString(18, y, "OK")
        c.setFillColor(INK)
        c.setFont(FONT, 8)
        c.drawString(40, y, t)
        y -= 14
    y -= 8
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 6", "Cadenas sur identifiants + badge « Module 1 terminé ».")
    footer(c, "Module 1 • Sécurité & synthèse", 6)


def p7(c):
    y = header(c, "Module 2 • Jeux Scratch")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 8 : Commandes Scratch & bases des blocs")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Lutins, coordonnées de la scène, blocs visuels")
    y -= 16
    y = draw_wrap(c, "Scratch est la plateforme MIT de programmation par blocs. Au lieu de taper une syntaxe complexe, tu clips des blocs colorés comme des briques LEGO.", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 6
    c.setFont(FONTB, 9)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Concepts clés")
    y -= 14
    w = (W - 42) / 3
    for i, (t, b) in enumerate([
        ("1. Lutin (sprite)", "Personnages ou objets sur la scène (Chat, Dino, Requin, Panier)."),
        ("2. Scène", "L'écran du jeu (480 de large × 360 de haut)."),
        ("3. Script", "Pile de blocs connectés qui dit au lutin quoi faire."),
    ]):
        x = 18 + i * (w + 6)
        card(c, x, y - 62, w, 60)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 8)
        c.drawString(x + 8, y - 14, t)
        draw_wrap(c, b, x + 8, y - 30, FONT, 7.5, w - 16, 10, INK, 3)
    y -= 78
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Types de blocs essentiels")
    y -= 12
    card(c, 18, y - 44, W - 36, 42, HexColor("#1A1A1A"))
    c.setFillColor(HexColor("#C8E6C9"))
    c.setFont(FONT, 7.5)
    c.drawString(26, y - 16, "quand drapeau vert cliqué    aller à x: (0) y: (0)    ajouter à x (10)    ajouter à y (10)    répéter indéfiniment")
    c.drawString(26, y - 32, "touché [pointeur de souris v] ?    ajouter à [Score v] (1)")
    y -= 56
    card(c, 18, y - 36, W - 36, 34, HexColor("#E8F0EC"))
    draw_wrap(c, "Coordonnées : le centre est (X : 0, Y : 0). X de -240 (gauche) à +240 (droite). Y de -180 (bas) à +180 (haut).", 26, y - 18, FONT, 7.5, W - 52, 10, INK, 2)
    y -= 48
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 7", "Éditeur Scratch 3.0 : palette de blocs, zone de scripts, scène.")
    footer(c, "Module 2 • Commandes Scratch", 7)


def p8(c):
    y = header(c, "Module 2 • Entrée et sortie")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 9 : Périphériques d'entrée et de sortie")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Objets qui tombent, positions aléatoires, mécanismes d'attrape")
    y -= 16
    y = draw_wrap(c, "Dans notre premier jeu, des pommes tombent du ciel au hasard ! Le joueur déplace un panier gauche-droite pour les attraper et marquer des points.", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 6
    c.setFont(FONTB, 9)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Script d'apparition et d'attrape des pommes")
    y -= 12
    card(c, 18, y - 168, W - 36, 166, HexColor("#1A1A1A"))
    lines = [
        "quand drapeau vert cliqué",
        "mettre [Score v] à (0)",
        "répéter indéfiniment",
        "    aller à x: (nombre aléatoire entre (-200) et (200)) y: (180)",
        "    répéter jusqu'à <touché [Panier v] ? ou (ordonnée y < -160)>",
        "        ajouter à y (-5)",
        "    si <touché [Panier v] ?> alors",
        "        ajouter à [Score v] (1)",
        "        jouer le son [Miam v]",
    ]
    c.setFillColor(HexColor("#C8E6C9"))
    c.setFont("Courier", 8)
    yy = y - 16
    for line in lines:
        c.drawString(28, yy, line)
        yy -= 16
    y -= 180
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 8", "Panier en bas, pommes rouges qui tombent, compteur Score : 5.")
    footer(c, "Module 2 • Jeu Attrape-pommes", 8)


def p9(c):
    y = header(c, "Module 2 • Jeux Scratch")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 10 : Jeu 1 — Chasse au chat / poursuite du rat")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Flèches joueur, déplacement IA ennemi, score à la collision")
    y -= 16
    y = draw_wrap(c, "Dans ce jeu de poursuite, le joueur dirige le lutin Chat avec les flèches du clavier pour attraper un Rat malin qui glisse sur la scène.", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 8
    card(c, 18, y - 150, 270, 148, HexColor("#1A1A1A"))
    card(c, 300, y - 150, 277, 148, HexColor("#1A1A1A"))
    c.setFillColor(GOLD)
    c.setFont(FONTB, 8)
    c.drawString(28, y - 14, "1. Script flèches du Chat")
    c.drawString(310, y - 14, "2. Glisse du Rat & score")
    c.setFillColor(HexColor("#C8E6C9"))
    c.setFont("Courier", 7.5)
    c.drawString(28, y - 32, "quand touche [flèche droite v]")
    c.drawString(28, y - 46, "s'orienter en direction (90)")
    c.drawString(28, y - 60, "avancer de (15) pas")
    c.drawString(310, y - 32, "quand drapeau vert cliqué")
    c.drawString(310, y - 46, "répéter indéfiniment")
    c.drawString(310, y - 60, "glisser en (1) s à x: (aléatoire) y: (aléatoire)")
    c.drawString(310, y - 74, "si <touché [Chat v] ?> alors")
    c.drawString(310, y - 88, "    ajouter à [Score v] (1)")
    c.drawString(310, y - 102, "    jouer le son [Miaou v]")
    y -= 168
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 9", "Chat qui poursuit le Rat sur un décor de cuisine.")
    footer(c, "Module 2 • Jeu Chasse au chat", 9)


def p10(c):
    y = header(c, "Module 2 • Exercice Scratch")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 11 : Exercice")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Souris sous l'eau, contact avec la cible, animation de costume (bouche)")
    y -= 16
    y = draw_wrap(c, "Dans Requin affamé, le joueur guide un grand requin sous l'eau avec le pointeur de la souris pour attraper des lutins Plongeur !", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 6
    c.setFont(FONTB, 9)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Logique de déplacement du requin & animation de la bouche")
    y -= 12
    card(c, 18, y - 148, W - 36, 146, HexColor("#1A1A1A"))
    c.setFillColor(HexColor("#C8E6C9"))
    c.setFont("Courier", 8)
    lines = [
        "quand drapeau vert cliqué",
        "répéter indéfiniment",
        "    s'orienter vers [pointeur de souris v]",
        "    avancer de (5) pas",
        "    si <touché [Plongeur v] ?> alors",
        "        basculer sur le costume [Requin-B-BoucheOuverte v]",
        "        ajouter à [Score v] (1)",
        "        jouer le son [Morsure v] jusqu'au bout",
        "        basculer sur le costume [Requin-A v]",
    ]
    yy = y - 16
    for line in lines:
        c.drawString(28, yy, line)
        yy -= 14
    y -= 160
    card(c, 18, y - 36, W - 36, 34, HexColor("#E8F0EC"))
    draw_wrap(c, "Astuce costume : passer un instant sur un lutin « bouche ouverte » donne un super effet de croquer.", 26, y - 18, FONT, 7.5, W - 52, 10, INK, 2)
    y -= 48
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 10", "Requin qui ouvre la bouche pour manger un plongeur, panneau score.")
    footer(c, "Module 2 • Jeu Requin affamé", 10)


def p11(c):
    y = header(c, "Module 2 • Scratch & finitions")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 12-14 : Dino Chrome & finitions de jeu")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Saut, gravité, obstacles qui défilent, menus")
    y -= 16
    card(c, 18, y - 150, 270, 148, HexColor("#1A1A1A"))
    card(c, 300, y - 150, 277, 148, HexColor("#1A1A1A"))
    c.setFillColor(GOLD)
    c.setFont(FONTB, 8)
    c.drawString(28, y - 14, "1. Saut du Dino & gravité")
    c.drawString(310, y - 14, "2. Script du cactus")
    c.setFillColor(HexColor("#C8E6C9"))
    c.setFont("Courier", 7)
    c.drawString(28, y - 32, "quand touche [espace v]")
    c.drawString(28, y - 44, "si <ordonnée y = -100> alors")
    c.drawString(28, y - 56, "mettre [vitesseY v] à (14)")
    c.drawString(28, y - 68, "répéter jusqu'à <y < -100>")
    c.drawString(28, y - 80, "    ajouter à y (vitesseY)")
    c.drawString(28, y - 92, "    ajouter à [vitesseY v] (-1)")
    c.drawString(310, y - 32, "quand drapeau vert cliqué")
    c.drawString(310, y - 44, "répéter indéfiniment")
    c.drawString(310, y - 56, "aller à x: (240) y: (-100)")
    c.drawString(310, y - 68, "répéter jusqu'à <x < -240>")
    c.drawString(310, y - 80, "    ajouter à x (-8)")
    y -= 166
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "3 façons de donner un rendu pro")
    y -= 14
    for t in [
        "1. Sons : miam, miaou, pop ou saut au moment des collisions.",
        "2. Écran menu : message « lancer le jeu » quand on clique sur JOUER.",
        "3. Bannière Game Over : lutin rouge « PARTIE TERMINÉE » quand il n'y a plus de vies.",
    ]:
        c.setFillColor(INK)
        c.setFont(FONT, 8)
        c.drawString(18, y, t)
        y -= 14
    y -= 6
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 11", "4 aperçus : Pommes, Chasse au chat, Requin affamé, Dino Chrome.")
    footer(c, "Module 2 • Dino & finitions", 11)


def p12(c):
    y = header(c, "Module 3 • Montage CapCut")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 15 : Intro au montage CapCut")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Démarrer CapCut sur ordinateur et téléphone")
    y -= 16
    y = draw_wrap(c, "CapCut est l'une des applis de montage les plus populaires pour débutants, PC et mobile. Couper, ajouter du texte et des effets va très vite.", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 6
    c.setFont(FONTB, 9)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Zones de l'espace de travail CapCut")
    y -= 14
    w = (W - 42) / 3
    for i, (t, b) in enumerate([
        ("1. Médiathèque", "Là où tu importes clips, pistes audio et images."),
        ("2. Fenêtre d'aperçu", "L'écran où tu regardes la vidéo en direct pendant le montage."),
        ("3. La timeline", "La piste du bas : couper, recadrer, empiler les clips."),
    ]):
        x = 18 + i * (w + 6)
        card(c, x, y - 70, w, 68)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 8)
        c.drawString(x + 8, y - 14, t)
        draw_wrap(c, b, x + 8, y - 30, FONT, 7.5, w - 16, 10, INK, 4)
    y -= 88
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Comparaison des formats vidéo")
    y -= 14
    rows = [
        ("Format", "Ratio", "Idéal pour"),
        ("Paysage (16:9)", "1920 × 1080", "YouTube long, TV, PC"),
        ("Vertical (9:16)", "1080 × 1920", "TikTok, Shorts, Reels"),
    ]
    c.setFillColor(NAVY)
    c.rect(18, y - 4, W - 36, 14, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FONTB, 7)
    c.drawString(22, y, rows[0][0])
    c.drawString(180, y, rows[0][1])
    c.drawString(340, y, rows[0][2])
    y -= 16
    for r in rows[1:]:
        c.setFillColor(INK)
        c.setFont(FONT, 8)
        c.drawString(22, y, r[0])
        c.drawString(180, y, r[1])
        c.drawString(340, y, r[2])
        y -= 16
    y -= 8
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 12", "CapCut Desktop : panneau médias, lecteur, pistes timeline.")
    footer(c, "Module 3 • Montage CapCut", 12)


def p13(c):
    y = header(c, "Module 3 • Montage CapCut")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 16 & 17 : Couper les clips & transitions")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Enlever les parties ennuyeuses, séparer les scènes, transitions fluides")
    y -= 16
    c.setFont(FONTB, 9)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Protocole de coupe, étape par étape")
    y -= 14
    steps = [
        "1. Importer : glisse tes clips dans le panneau médias CapCut.",
        "2. Timeline : pose les vidéos sur la piste vidéo principale 1.",
        "3. Couper / scinder : place la tête de lecture, outil Ciseaux (ou Ctrl + B).",
        "4. Supprimer : sélectionne le morceau du milieu inutile, touche Suppr.",
        "5. Jointure auto : CapCut accroche tout seul les clips qui restent.",
    ]
    for t in steps:
        c.setFillColor(INK)
        c.setFont(FONT, 8)
        c.drawString(18, y, t)
        y -= 14
    y -= 6
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Transitions CapCut populaires")
    y -= 14
    w = (W - 42) / 3
    for i, (t, b) in enumerate([
        ("Fondu / dissolve", "Mélange doux du clip A vers B : temps qui passe, coupes calmes."),
        ("Push caméra / zoom", "Zoom énergique, idéal pour une révélation tech ou de l'action."),
        ("Balayage flou", "Balaye gauche ou droite avec un flou de mouvement rapide."),
    ]):
        x = 18 + i * (w + 6)
        card(c, x, y - 70, w, 68)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 8)
        c.drawString(x + 8, y - 14, t)
        draw_wrap(c, b, x + 8, y - 30, FONT, 7.5, w - 16, 10, INK, 4)
    y -= 86
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 13", "Ciseaux qui coupent un clip sur la timeline, segments joints.")
    footer(c, "Module 3 • Coupes & transitions", 13)


def p14(c):
    y = header(c, "Module 3 • Montage CapCut")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 18 : Ajouter des mèmes & incrustations")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Mèmes fond vert, réactions drôles, image dans l'image")
    y -= 16
    y = draw_wrap(c, "Des clips mèmes (rires, vine booms, popups fond vert) rendent les vidéos tech et gaming beaucoup plus fun.", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 6
    c.setFont(FONTB, 9)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Incrustation fond vert dans CapCut")
    y -= 14
    steps = [
        "1. Glisse le clip mème fond vert sur la piste vidéo 2 (au-dessus de la vidéo principale).",
        "2. Sélectionne le clip → onglet Découpe dans le panneau de droite.",
        "3. Coche Incrustation (Chroma Key) → pipette pour prendre le vert du fond.",
        "4. Monte le curseur Intensité jusqu'à ce que le vert disparaisse complètement.",
    ]
    for t in steps:
        card(c, 18, y - 22, W - 36, 20)
        c.setFillColor(INK)
        c.setFont(FONT, 8)
        c.drawString(26, y - 14, t)
        y -= 26
    y -= 4
    card(c, 18, y - 36, W - 36, 34, HexColor("#E8F0EC"))
    draw_wrap(c, "Astuce pro : couple le popup visuel avec un son (pop, rire) pour le max d'effet.", 26, y - 18, FONT, 7.5, W - 52, 10, INK, 2)
    y -= 48
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 14", "Mème fond vert sur la timeline, fond vert enlevé par chroma key.")
    footer(c, "Module 3 • Mèmes & incrustations", 14)


def p15(c):
    y = header(c, "Module 3 • Montage CapCut")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 19-21 : Sous-titres, audio & export")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Sous-titres auto, balance musique, réglages d'export")
    y -= 16
    card(c, 18, y - 70, 270, 68)
    card(c, 300, y - 70, 277, 68)
    c.setFillColor(TEAL)
    c.setFont(FONTB, 8)
    c.drawString(28, y - 14, "Sous-titres auto en 1 clic")
    c.drawString(310, y - 14, "Style des sous-titres viraux")
    draw_wrap(c, "Onglet Texte → Sous-titres auto → Créer. L'IA transcrit ta voix, synchronisée.", 28, y - 30, FONT, 7.5, 250, 10, INK, 3)
    draw_wrap(c, "Polices grasses (Montserrat/Impact), surlignage jaune, léger contour noir.", 310, y - 30, FONT, 7.5, 255, 10, INK, 3)
    y -= 86
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Bon équilibre des volumes")
    y -= 14
    card(c, 18, y - 50, 270, 48)
    card(c, 300, y - 50, 277, 48)
    c.setFillColor(NAVY)
    c.setFont(FONTB, 8)
    c.drawString(28, y - 14, "Voix / commentaire")
    c.drawString(310, y - 14, "Musique de fond")
    draw_wrap(c, "Fort et clair (environ 0 dB à +2 dB).", 28, y - 30, FONT, 7.5, 250, 10, INK, 2)
    draw_wrap(c, "Beaucoup plus bas (environ -15 dB à -20 dB) pour laisser la voix audible.", 310, y - 30, FONT, 7.5, 255, 10, INK, 2)
    y -= 66
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Meilleurs réglages d'export CapCut")
    y -= 14
    rows = [
        ("Réglage", "Valeur conseillée", "Pourquoi"),
        ("Résolution", "1080p (Full HD)", "Image nette"),
        ("Images / s", "30 FPS ou 60 FPS", "Jeu fluide"),
        ("Format", "MP4 (H.264)", "Compatible partout"),
    ]
    c.setFillColor(NAVY)
    c.rect(18, y - 4, W - 36, 14, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FONTB, 7)
    c.drawString(22, y, rows[0][0])
    c.drawString(160, y, rows[0][1])
    c.drawString(360, y, rows[0][2])
    y -= 16
    for r in rows[1:]:
        c.setFillColor(INK)
        c.setFont(FONT, 8)
        c.drawString(22, y, r[0])
        c.drawString(160, y, r[1])
        c.drawString(360, y, r[2])
        y -= 15
    y -= 8
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 15", "Panneau sous-titres auto CapCut et fenêtre d'export MP4 1080p.")
    footer(c, "Module 3 • Sous-titres & export", 15)


def p16(c):
    y = header(c, "Module 4 • Robotique casual")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 22 : Qu'est-ce qu'un robot ? (vue casual)")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Machines intelligentes, sans maths qui font peur")
    y -= 16
    y = draw_wrap(c, "Un robot est simplement une machine qui peut sentir son environnement, réfléchir avec du code, et faire une action physique.", 18, y, FONT, 8.5, W - 36, 11.5, INK, 3)
    y -= 6
    c.setFont(FONTB, 9)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Les 3 parties de chaque robot")
    y -= 14
    w = (W - 42) / 3
    for i, (t, b) in enumerate([
        ("1. CAPTEURS (yeux & oreilles)", "Distance, lumière, toucher ou son autour du robot."),
        ("2. LE CERVEAU (microcontrôleur)", "Petite puce qui exécute le code et décide de l'action."),
        ("3. MOTEURS & LUMIÈRES (mains & jambes)", "Roues, articulations, LED, sons."),
    ]):
        x = 18 + i * (w + 6)
        card(c, x, y - 80, w, 78)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 7.5)
        draw_wrap(c, t, x + 8, y - 14, FONTB, 7.5, w - 16, 10, TEAL, 2)
        draw_wrap(c, b, x + 8, y - 40, FONT, 7.5, w - 16, 10, INK, 3)
    y -= 96
    card(c, 18, y - 32, W - 36, 30, HexColor("#E8F0EC"))
    draw_wrap(c, "Astuce : la robotique, c'est du matériel + du code qui travaillent ensemble.", 26, y - 18, FONT, 8, W - 52, 10, INK, 1)
    y -= 44
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 16", "Capteur (yeux) → carte microcontrôleur (cerveau) → roues/moteur (jambes).")
    footer(c, "Module 4 • Robotique casual", 16)


def p17(c):
    y = header(c, "Module 4 • Robotique casual")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 23 & 24 : Cerveaux, capteurs & moteurs")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Arduino, Raspberry Pi, micro:bit, et pièces, tout simple")
    y -= 16
    c.setFont(FONTB, 9)
    c.setFillColor(NAVY)
    c.drawString(18, y, "Cartes robot débutant populaires")
    y -= 14
    w = (W - 42) / 3
    for i, (t, b) in enumerate([
        ("micro:bit", "Carte facile, écran LED et boutons intégrés. Se branche à Scratch."),
        ("Arduino", "Carte solide classique pour moteurs, lumières et capteurs simples."),
        ("Raspberry Pi Pico", "Mini-ordinateur à ~4 $ , programmé en MicroPython."),
    ]):
        x = 18 + i * (w + 6)
        card(c, x, y - 72, w, 70)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 8)
        c.drawString(x + 8, y - 14, t)
        draw_wrap(c, b, x + 8, y - 30, FONT, 7.5, w - 16, 10, INK, 4)
    y -= 90
    c.setFillColor(NAVY)
    c.setFont(FONTB, 9)
    c.drawString(18, y, "Pièces robot du quotidien")
    y -= 14
    bits = [
        ("Capteur de distance ultrason", "Comme deux petits yeux. Impulse sonores pour mesurer murs et obstacles."),
        ("Servo-moteur", "Petit moteur qui tourne à un angle précis (0 à 180°) — bras qui salue."),
        ("Moteur CC de roue", "Fait tourner les roues en continu, en avant ou en arrière."),
        ("LED & buzzers", "Lumières pour les yeux du robot, bips amusants."),
    ]
    for t, b in bits:
        c.setFillColor(NAVY)
        c.setFont(FONTB, 8)
        c.drawString(18, y, t)
        c.setFillColor(INK)
        c.setFont(FONT, 8)
        c.drawString(200, y, b[:78])
        y -= 16
    y -= 6
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 17", "micro:bit, Arduino, capteur de distance et servo côte à côte.")
    footer(c, "Module 4 • Cerveaux & capteurs", 17)


def p18(c):
    y = header(c, "Module 4 • Robotique casual")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 25 : Idées robotique fun (niveau surface)")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Projets pour commencer, à construire ou à inventer")
    y -= 16
    items = [
        ("1. Poubelle intelligente", "Un capteur de distance voit ta main ; un servo ouvre le couvercle tout seul."),
        ("2. Rover anti-obstacles", "Voiture à 2 roues qui avance et tourne dès qu'un mur est trop près."),
        ("3. Arrosoir automatique", "Détecte la terre sèche et pompe de l'eau pour les plantes."),
        ("4. Robot compagnon d'animal", "Cligne des LED-yeux et agite une plume quand un animal passe."),
    ]
    for t, b in items:
        card(c, 18, y - 48, W - 36, 46)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 9)
        c.drawString(26, y - 16, t)
        draw_wrap(c, b, 26, y - 32, FONT, 8, W - 52, 10, INK, 1)
        y -= 54
    card(c, 18, y - 36, W - 36, 34, HexColor("#E8F0EC"))
    draw_wrap(c, "Module 4 terminé ! Tu as les bases de la robotique, sans maths tordues.", 26, y - 18, FONT, 8, W - 52, 10, GREEN, 1)
    y -= 48
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 18", "Mini rover à 2 roues, yeux et pack batterie.")
    footer(c, "Module 4 • Projets pour commencer", 18)


def p19(c):
    y = header(c, "Référence maître")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 13)
    c.drawString(18, y, "Ch 26 : Fiche mémo")
    y -= 14
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Cartes rapides pour les 4 thèmes du guide")
    y -= 16
    cards = [
        ("Codage vibe & langages", "Frontend : HTML, CSS, JavaScript (le visible). Backend : Python, Node.js, SQL (serveurs). NE JAMAIS PARTAGER : mots de passe, clés API, identifiants."),
        ("Synthèse jeux Scratch", "Pommes : chute X aléatoire + score panier. Chat : flèches + toucher le Rat. Requin : souris + toucher Plongeur. Dino : espace pour sauter + éviter cactus."),
        ("Raccourcis CapCut", "Couper : Ctrl+B / ciseaux. Transitions : glisser sur la jointure. Mème fond vert : Découpe → Incrustation. Sous-titres : Texte → Sous-titres auto."),
        ("Robotique casual", "Capteurs : yeux & oreilles (distance / lumière). Cerveaux : microcontrôleurs (micro:bit / Pico). Moteurs : roue et servo."),
    ]
    for t, b in cards:
        card(c, 18, y - 72, W - 36, 70)
        c.setFillColor(TEAL)
        c.setFont(FONTB, 9)
        c.drawString(26, y - 16, t)
        draw_wrap(c, b, 26, y - 32, FONT, 8, W - 52, 11, INK, 3)
        y -= 78
    placeholder(c, 18, 28, W - 36, y - 36, "EMPLACEMENT IMAGE PAGE 19", "Icônes HTML, Scratch, CapCut et robotique, résumé visuel.")
    footer(c, "Référence maître", 19)


def p20(c):
    y = header(c, "Continue de créer & de construire")
    c.setFillColor(NAVY)
    c.setFont(FONTB, 16)
    c.drawString(18, y, "Bravo, tu as terminé")
    y -= 20
    c.setFont(FONTB, 16)
    c.drawString(18, y, "le Guide du Créateur !")
    y -= 20
    y = draw_wrap(c, "Tu as maintenant les bases pour coder avec l'IA, créer des jeux dans Scratch, monter des vidéos dans CapCut, et explorer la robotique.", 18, y, FONT, 9, W - 36, 12, INK, 3)
    y -= 8
    c.setFillColor(NAVY)
    c.setFont(FONTB, 10)
    c.drawString(18, y, "Liens logiciels conseillés")
    y -= 16
    c.setFont(FONT, 8.5)
    c.setFillColor(INK)
    c.drawString(18, y, "Éditeur Scratch : scratch.mit.edu ou turbowarp.")
    y -= 14
    c.drawString(18, y, "CapCut Desktop : capcut.com (gratuit PC / Mac / téléphone).")
    y -= 14
    c.drawString(18, y, "IDE : code.visualstudio.com ou cursor.com, ou Kiro, ou Antigravity.")
    y -= 22
    card(c, 18, y - 48, W - 36, 46, HexColor("#E8F0EC"))
    c.setFillColor(GREEN)
    c.setFont(FONTB, 8)
    c.drawString(26, y - 16, "Télécharge l'appli Go Study !")
    draw_wrap(c, "Plus d'opportunités comme celle-ci : goostudy.vercel.app", 26, y - 32, FONT, 8, W - 52, 10, INK, 1)
    y -= 64
    c.setFillColor(NAVY)
    c.setFont(FONTB, 10)
    c.drawString(18, y, "À propos de l'auteur")
    y -= 16
    y = draw_wrap(
        c,
        "SkyDrake (Chukwudumueme Miracle Chidera) est étudiante en génie automobile, développeuse logiciel et entrepreneure basée à Lomé, Togo. Elle dirige Skydrake, une entreprise qui crée des applis et des outils SaaS pour le marché ouest-africain, et a conçu ce guide pour rendre le code, le design et la robotique simples et accessibles aux jeunes créateurs.",
        18, y, FONT, 8.5, W - 36, 11.5, INK, 6,
    )
    y -= 16
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(18, y, "Signature :")
    c.setStrokeColor(MUTED)
    c.line(80, y + 2, 280, y + 2)
    footer(c, "4e de couverture", 20)


def main():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Le Guide du Créateur — 20 pages A4")
    c.setAuthor("SkyDrake")
    for fn in (p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20):
        fn(c)
        c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
