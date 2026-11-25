# -*- coding: utf-8 -*-
"""Convert Creators Guidebook PDF to French, keeping original images/layout."""
from pathlib import Path
import pymupdf

SRC = Path(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4.pdf")
OUT = Path(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4_FR.pdf")
FONTS = Path(r"C:\Windows\Fonts")

FONT_FILE = {
    "InkFree": FONTS / "Inkfree.ttf",
    "ArialBlack": FONTS / "ariblk.ttf",
    "SegoeUI": FONTS / "segoeui.ttf",
    "SegoeUI-Bold": FONTS / "segoeuib.ttf",
    "SegoeUI-Semibold": FONTS / "seguisb.ttf",
    "SegoeUI-Italic": FONTS / "segoeuii.ttf",
    "SegoeUIBlack": FONTS / "seguibl.ttf",
    "Consolas": FONTS / "consola.ttf",
    "Consolas-Bold": FONTS / "consolab.ttf",
    "DubaiMedium": FONTS / "DUBAI-MEDIUM.TTF",
    "Arial,Italic": FONTS / "ariali.ttf",
    "Helvetica": None,
}

SKIP_EXACT = {
    "ui.",
    '"score: 5".',
    "below (backend).",
    "artwork.",
    "#0",
}

SKIP_CONTAINS = (
    "PLACEHOLDER",
    "Suggested Image",
    "COVER ARTWORK",
    "Futuristic Tech & Creative Collage",
)


def norm(s: str) -> str:
    return " ".join(s.replace("\n", " ").replace("\u00a0", " ").split()).strip()


def rgb(c: int):
    return ((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255


def overlap_frac(a, images) -> float:
    ax0, ay0, ax1, ay1 = a
    area = max(1.0, (ax1 - ax0) * (ay1 - ay0))
    best = 0.0
    for b in images:
        ix0, iy0 = max(ax0, b.x0), max(ay0, b.y0)
        ix1, iy1 = min(ax1, b.x1), min(ay1, b.y1)
        if ix1 > ix0 and iy1 > ay0 and iy1 > iy0:
            best = max(best, ((ix1 - ix0) * (iy1 - iy0)) / area)
    return best


def should_skip(text, font, bbox, images) -> bool:
    t = text.strip()
    if not t:
        return True
    n = norm(t).lower()
    if n in SKIP_EXACT:
        return True
    if any(s.lower() in t.lower() for s in SKIP_CONTAINS):
        return True
    if str(font).startswith("Type3") and len(t) <= 4:
        return True
    if overlap_frac(bbox, images) >= 0.38:
        return True
    return False


T = {
    "Tech skills": "Compétences",
    "for\nBeginners": "pour\ndébutants",
    "for Beginners": "pour débutants",
    "2026 Edition • Easy, Beginner-Friendly Guide\nPage 1 of 20": "Édition 2026 • Guide simple, pour débutants\nPage 1 sur 20",
    "💻 Vibe Coding & Languages": "💻 Codage vibe & langages",
    "Frontend vs Backend, IDEs, safe AI prompting formula &\nsecurity rules.": "Frontend vs backend, IDE, formule d'invite IA sûre &\nrègles de sécurité.",
    "🎮 Scratch Game Projects": "🎮 Projets de jeux Scratch",
    "Build 4 full games: Apple Catch, Cat Hunt, Hungry Shark &\nChrome Dino.": "4 jeux complets : Pommes, Chasse au chat, Requin &\nDino Chrome.",
    "🎬 CapCut Video Editing": "🎬 Montage vidéo CapCut",
    "Cuts, joins, scene transitions, green screen memes & auto-\ncaptions.": "Coupes, jointures, transitions, mèmes fond vert &\nsous-titres auto.",
    "🤖 Casual Robotics": "🤖 Robotique simple",
    "Surface-level guide to robot brains (micro:bit/Arduino),\nsensors & motors.": "Guide simple des cerveaux de robots (micro:bit/Arduino),\ncapteurs et moteurs.",
    "WELCOME & OVERVIEW\nTHE CREATOR'S GUIDEBOOK": "BIENVENUE & APERÇU\nLE GUIDE DU CRÉATEUR",
    "Welcome to the Creator's World": "Bienvenue dans le monde du créateur",
    "Simple, practical tech skills without any complicated academic jargon": "Des compétences tech simples, sans jargon académique compliqué",
    "This guidebook was written specifically to teach you real, practical creative tools! You won't find scary math formulas\nor confusing academic speak here. Instead, you'll learn how to build games, edit videos like a pro, code with AI, and\nunderstand how simple robots work.": "Ce guide a été écrit pour t'apprendre de vrais outils créatifs, concrets ! Tu ne trouveras pas de formules maths\neffrayantes ni de jargon académique. Tu vas apprendre à créer des jeux, monter des vidéos comme un pro, coder avec l'IA,\net comprendre comment fonctionnent les robots simples.",
    "💡 The Creator Promise: Every topic in this guidebook is explained in plain English with visual cheat sheets and step-by-\nstep guides along the way!": "💡 Promesse du créateur : chaque sujet est expliqué en français simple, avec des fiches visuelles et des guides\nétape par étape !",
    "📖 Complete 20-Page Guidebook Map": "📖 Plan complet du guide (20 pages)",
    "MODULE 1: CODING BASICS & VIBE CODING\nPAGES 3–6": "MODULE 1 : BASES DU CODE & CODAGE VIBE\nPAGES 3–6",
    "Ch 1: Coding Languages 101 (Frontend vs Backend)\nPage 3": "Ch 1 : Langages de code 101 (frontend vs backend)\nPage 3",
    "Ch 2: Static Sites vs. Functional / Dynamic Sites\nPage 4": "Ch 2 : Sites statiques vs sites fonctionnels / dynamiques\nPage 4",
    "Ch 3 & 4: Intro to Vibe Coding & Master AI Prompting\nPage 5": "Ch 3 & 4 : Intro au codage vibe & maîtriser les invites IA\nPage 5",
    "Ch 5 & 6-7: hardware/software\nPage 6": "Ch 5 & 6-7 : matériel / logiciel\nPage 6",
    "MODULE 2: SCRATCH GAME PROJECTS\nPAGES 7–11": "MODULE 2 : PROJETS DE JEUX SCRATCH\nPAGES 7–11",
    "Ch 8: Scratch Controls & Block Basics Page 7": "Ch 8 : Contrôles Scratch & bases des blocs          Page 7",
    "Ch 9: input and output devices Page 8": "Ch 9 : Périphériques d'entrée et de sortie          Page 8",
    "Ch 10: Game 2 - Cat Hunt Rat Chase Game\nPage 9": "Ch 10 : Jeu 2 — Chasse au chat / poursuite du rat\nPage 9",
    "Ch 11: Scratch test Page 10": "Ch 11 : Exercice Scratch          Page 10",
    "Ch 12-14: Chrome Dino Runner & Game Polish\nPage 11": "Ch 12-14 : Dino Chrome Runner & finitions de jeu\nPage 11",
    "MODULE 3: CAPCUT VIDEO EDITING\nPAGES 12–15": "MODULE 3 : MONTAGE VIDÉO CAPCUT\nPAGES 12–15",
    "Ch 15: CapCut Basics & Workspace Overview\nPage 12": "Ch 15 : Bases CapCut & aperçu de l'espace de travail\nPage 12",
    "Ch 16 & 17: Cutting Clips & Smooth Transitions\nPage 13": "Ch 16 & 17 : Couper les clips & transitions fluides\nPage 13",
    "Ch 18: Memes, Overlays & Green Screen Popups\nPage 14": "Ch 18 : Mèmes, incrustations & popups fond vert\nPage 14",
    "Ch 19-21: Auto-Captions, Music Sync & Exporting\nPage 15": "Ch 19-21 : Sous-titres auto, sync musique & export\nPage 15",
    "MODULE 4: CASUAL SURFACE ROBOTICS\nPAGES 16–18": "MODULE 4 : ROBOTIQUE SIMPLE\nPAGES 16–18",
    "Ch 22: What is a Robot? (Casual Surface View)\nPage 16": "Ch 22 : C'est quoi un robot ? (vue simple)\nPage 16",
    "Ch 23 & 24: Robot Brains, Sensors & Motors\nPage 17": "Ch 23 & 24 : Cerveaux, capteurs & moteurs\nPage 17",
    "Ch 25: Fun Surface Robotics Starter Projects\nPage 18": "Ch 25 : Projets robotique fun pour commencer\nPage 18",
    "MASTER REFERENCE & BACK COVER\nPAGES 19–20": "FICHE RÉCAP & 4e DE COUVERTURE\nPAGES 19–20",
    "Ch 26: Master Cheat Sheet Across All 4 Topics\nPage 19": "Ch 26 : Fiche récap des 4 thèmes\nPage 19",
    "Resources, Software Links & Back Cover\nPage 20": "Ressources, liens logiciels & 4e de couverture\nPage 20",
    "Welcome & Overview\nPage 2 of 20": "Bienvenue & aperçu\nPage 2 sur 20",
    "MODULE 1 • CODING BASICS\nTHE CREATOR'S GUIDEBOOK": "MODULE 1 • BASES DU CODE\nLE GUIDE DU CRÉATEUR",
    "Ch 1: Coding Languages 101": "Ch 1 : Langages de code 101",
    "What main programming languages are for and what they do": "À quoi servent les principaux langages, et ce qu'ils font",
    "Coding is simply giving step-by-step instructions to a computer in a language it understands. Different coding\nlanguages are designed for different specialized jobs!": "Coder, c'est donner des instructions étape par étape à un ordinateur, dans un langage qu'il comprend. Les langages\nservent à des métiers différents !",
    "Frontend vs. Backend Made Simple": "Frontend vs backend, tout simple",
    "FRONTEND (What You See)": "FRONTEND (ce que tu vois)",
    "Everything visible on your screen: buttons, colors, text,\nanimations, and responsive layouts.": "Tout ce qui est visible à l'écran : boutons, couleurs, texte,\nanimations et mises en page responsive.",
    "HTML: The skeleton (text, headings, & layout structure).": "HTML : le squelette (texte, titres et structure).",
    "CSS: The clothes & paint (colors, fonts, & flex\nalignment).": "CSS : les vêtements et la peinture (couleurs, polices,\nalignement flex).",
    "JavaScript: The muscle (button clicks, popups, &\nanimations).": "JavaScript : le muscle (clics, popups et animations).",
    "BACKEND (Behind the Scenes)": "BACKEND (en coulisses)",
    "The hidden brain operating on remote servers to manage\naccounts, passwords, and databases.": "Le cerveau caché, sur des serveurs distants, qui gère\ncomptes, mots de passe et bases de données.",
    "Python: Easy, popular backend & AI language.": "Python : langage backend & IA, simple et populaire.",
    "Node.js / SQL: Handles server traffic & database user\nrecords.": "Node.js / SQL : trafic serveur et enregistrements\nutilisateurs.",
    "APIs: Bridges connecting Frontend requests to Backend\ndata.": "API : ponts entre les demandes frontend et les données\nbackend.",
    "💡 BASIC DEFINITION • IDE: An IDE (Integrated Development Environment) is simply the code editor program where\nprogrammers write and run code files! Examples: VS Code or Cursor.": "💡 DÉFINITION • IDE : un IDE (environnement de développement) est simplement l'éditeur où on écrit et lance le code !\nExemples : VS Code ou Cursor.",
    "Module 1 • Coding Basics\nPage 3 of 20": "Module 1 • Bases du code\nPage 3 sur 20",
    "Ch 2: Static vs. Functional Sites": "Ch 2 : Sites statiques vs fonctionnels",
    "Understanding the two main types of websites": "Comprendre les deux grands types de sites web",
    "Before building a web project or prompting AI, you need to know which type of website you are creating!": "Avant de lancer un projet web ou d'inviter l'IA, il faut savoir quel type de site tu crées !",
    "1. Static Websites (Digital Posters)": "1. Sites statiques (affiches numériques)",
    "Show the exact same content to every visitor. They do not\nsave user logins or process custom live data.": "Ils montrent le même contenu à chaque visiteur. Ils ne\nsauvent pas de comptes ni de données live.",
    "Examples: Portfolios, restaurant menus, school blogs.": "Exemples : portfolios, menus de resto, blogs d'école.",
    "Built With: Simple HTML & CSS.": "Fait avec : HTML & CSS simples.",
    "Benefit: Super fast & easy to build!": "Avantage : super rapide et facile à créer !",
    "2. Functional / Dynamic Sites": "2. Sites fonctionnels / dynamiques",
    "Interactive web applications that change based on user\nactions, save progress, or handle user accounts.": "Des applis web interactives qui changent selon tes actions,\nsauvent la progression, ou gèrent des comptes.",
    "Examples: Scratch, YouTube, games, online stores.": "Exemples : Scratch, YouTube, jeux, boutiques en ligne.",
    "Built With: JavaScript + Backend Database.": "Fait avec : JavaScript + base de données backend.",
    "Benefit: Interactive & personalized!": "Avantage : interactif et personnalisé !",
    "Static vs Dynamic Feature Comparison": "Comparaison statique vs dynamique",
    "Feature\nStatic Websites\nDynamic / Functional Apps": "Fonction\nSites statiques\nApplis dynamiques / fonctionnelles",
    "User Logins\nNo user accounts\nFull accounts & passwords": "Connexion\nPas de comptes\nComptes & mots de passe",
    "Data Storage\nFixed text in files\nSaves to server database": "Stockage\nTexte fixe dans des fichiers\nSauvé en base serveur",
    "Build Time\nMinutes to hours\nDays to weeks": "Temps de création\nMinutes à heures\nJours à semaines",
    "💡 BASIC DEFINITION • HTML: HTML (HyperText Markup Language) is the standard code structure used to place\nheaders, text, images, and buttons on web pages.": "💡 DÉFINITION • HTML : HTML (HyperText Markup Language) est le code standard pour placer titres, texte, images\net boutons sur une page web.",
    "Module 1 • Coding Basics\nPage 4 of 20": "Module 1 • Bases du code\nPage 4 sur 20",
    "MODULE 1 • VIBE CODING\nTHE CREATOR'S GUIDEBOOK": "MODULE 1 • CODAGE VIBE\nLE GUIDE DU CRÉATEUR",
    "Ch 3 & 4: Intro to Vibe Coding & AI Prompting": "Ch 3 & 4 : Intro au codage vibe & invites IA",
    "Creating software by talking to AI in plain English": "Créer des logiciels en parlant à l'IA, en langage simple",
    "Vibe Coding means using modern AI tools (like ChatGPT, Claude, or Cursor) to write code for you while you guide\nthe project using plain English prompts!": "Le codage vibe, c'est utiliser des outils IA (ChatGPT, Claude, Cursor) pour écrire le code pendant que tu guides\nle projet avec des phrases simples !",
    "What AI Needs from You (The 3 Key Requirements)": "Ce dont l'IA a besoin (3 exigences clés)",
    "1. Clear Goal": "1. Objectif clair",
    "Tell AI exactly what app to make (e.g.,\n\"Make a simple score counter web\npage\").": "Dis exactement quelle appli créer (ex. :\n« Fais une page web simple de\ncompteur de score »).",
    "2. Target Tech": "2. Techno cible",
    "Specify the language (e.g., \"Use\nsingle-file HTML and Vanilla CSS\").": "Précise le langage (ex. : « Utilise un\nseul fichier HTML et du CSS simple »).",
    "3. Style & Features": "3. Style & fonctions",
    "Describe colors, layout, and button\nbehavior preferences.": "Décris couleurs, mise en page et\ncomportement des boutons.",
    "The Simple 3-Step Prompt Formula": "La formule d'invite en 3 étapes",
    "3-STEP PROMPT FORMULA\nBEGINNER FRIENDLY": "FORMULE D'INVITE EN 3 ÉTAPES\nPOUR DÉBUTANTS",
    "1. WHO AI IS: \"You are an expert front-end web developer...\"\n2. WHAT TO BUILD: \"Build a clean single-file HTML page for my game...\"\n3. SPECIAL RULES: \"Use a dark blue background, big green action buttons, and keep the code simple.\"": "1. QUI EST L'IA : « Tu es un expert du développement web frontend... »\n2. QUOI CRÉER : « Construis une page HTML propre, un seul fichier, pour mon jeu... »\n3. RÈGLES : « Fond bleu foncé, gros boutons verts, et garde le code simple. »",
    "⚡ The Vibe Coding Secret: You don't need to memorize coding syntax anymore—just learn how to describe what you\nwant clearly!": "⚡ Le secret du codage vibe : plus besoin d'apprendre la syntaxe par cœur — apprends à décrire clairement ce que\ntu veux !",
    "Module 1 • Vibe Coding\nPage 5 of 20": "Module 1 • Codage vibe\nPage 5 sur 20",
    "MODULE 1 • Hardware/software\nTHE CREATOR'S GUIDEBOOK": "MODULE 1 • MATÉRIEL / LOGICIEL\nLE GUIDE DU CRÉATEUR",
    "Ch 5 & 6-7: Hardware /software": "Ch 5 & 6-7 : Matériel / logiciel",
    "Essential safety rules and pre-flight checklist": "Règles de sécurité essentielles et check-list avant de coder",
    "🚨 STRICT SECURITY RULES! What NEVER to share with AI:\n• Passwords & PINs: Never paste real user passwords or logins.\n• Private API Keys & Tokens: Secret keys to online services.\n• Personal Data: Phone numbers, home addresses, or credit cards.\n• Database Credentials: Secret database login credentials.": "🚨 RÈGLES DE SÉCURITÉ STRICTES ! Ne JAMAIS partager avec l'IA :\n• Mots de passe & PIN : jamais de vrais identifiants.\n• Clés API & jetons : secrets des services en ligne.\n• Données perso : téléphone, adresse, carte bancaire.\n• Accès base de données : identifiants secrets.",
    "SAFE CODE EXAMPLE • ALWAYS SANITIZE": "EXEMPLE DE CODE SÛR • TOUJOURS NETTOYER",
    "// WRONG (UNSAFE): const myApiKey = \"sk_live_998877665544332211\";\n// CORRECT (SAFE): const myApiKey = \"YOUR_API_KEY_HERE\";": "// FAUX (DANGEREUX) : const myApiKey = \"sk_live_998877665544332211\";\n// CORRECT (SÛR) : const myApiKey = \"YOUR_API_KEY_HERE\";",
    "The Vibe Coding Pre-Flight Checklist": "Check-list avant de coder avec l'IA",
    "✅ Know whether you need a Static site or a Functional site.": "✅ Savoir si tu as besoin d'un site statique ou fonctionnel.",
    "✅ Decide your target tech stack (HTML, CSS, JS, Python).": "✅ Choisir ta stack (HTML, CSS, JS, Python).",
    "✅ Open your IDE editor (VS Code or Cursor).": "✅ Ouvrir ton IDE (VS Code ou Cursor).",
    "✅ Write clear prompts specifying goals and layout preferences.": "✅ Écrire des invites claires (objectif + mise en page).",
    "✅ NEVER share passwords or private API keys with AI!": "✅ NE JAMAIS partager mots de passe ou clés API avec l'IA !",
    "✅ Test generated code in your web browser step-by-step.": "✅ Tester le code généré dans le navigateur, étape par étape.",
    "Module 1 • Security & Summary\nPage 6 of 20": "Module 1 • Sécurité & résumé\nPage 6 sur 20",
    "MODULE 2 • SCRATCH GAMES\nTHE CREATOR'S GUIDEBOOK": "MODULE 2 • JEUX SCRATCH\nLE GUIDE DU CRÉATEUR",
    "Ch 8: Scratch Controls & Block Basics": "Ch 8 : Contrôles Scratch & bases des blocs",
    "Understanding sprites, stage coordinates, and visual code blocks": "Sprites, coordonnées de la scène, et blocs de code visuels",
    "Scratch is MIT's visual block programming platform. Instead of typing complex syntax, you snap color-coded blocks\ntogether like LEGO bricks!": "Scratch, c'est la plateforme visuelle du MIT. Au lieu de taper de la syntaxe, tu clipse des blocs colorés\ncomme des LEGO !",
    "Key Scratch Concepts": "Concepts clés de Scratch",
    "1. Sprite": "1. Sprite",
    "Characters or objects on stage (Cat,\nDino, Shark, Basket).": "Personnages ou objets sur scène (chat,\ndino, requin, panier).",
    "2. Stage": "2. Scène",
    "The game screen background grid\n(480 wide x 360 high).": "L'écran de jeu, une grille\n(480 de large × 360 de haut).",
    "3. Script": "3. Script",
    "Connected stack of blocks telling a\nsprite what to do!": "Pile de blocs connectés qui dit au sprite\nquoi faire !",
    "Essential Scratch Block Types": "Types de blocs Scratch essentiels",
    "when green flag clicked\ngo to x: (0) y: (0)\nchange x by (10)\nchange y by (10)\nforever": "quand drapeau vert cliqué\naller à x: (0) y: (0)\najouter à x (10)\najouter à y (10)\nrépéter indéfiniment",
    "touching [mouse-pointer v]?\nchange [Score v] by (1)": "touché [pointeur de souris v] ?\najouter à [Score v] (1)",
    "💡 Stage Coordinates: The center of the Scratch stage is (X: 0, Y: 0). X goes from -240 (Left) to +240 (Right). Y goes\nfrom -180 (Bottom) to +180 (Top).": "💡 Coordonnées : le centre de la scène Scratch est (X : 0, Y : 0). X va de -240 (gauche) à +240 (droite). Y va\nde -180 (bas) à +180 (haut).",
    "Module 2 • Scratch Controls\nPage 7 of 20": "Module 2 • Contrôles Scratch\nPage 7 sur 20",
    "MODULE 2 • Input and output devices\nTHE CREATOR'S GUIDEBOOK": "MODULE 2 • ENTRÉE ET SORTIE\nLE GUIDE DU CRÉATEUR",
    "Ch 9: Input and output devices": "Ch 9 : Périphériques d'entrée et de sortie",
    "Falling objects, random positions, and catching mechanisms": "Objets qui tombent, positions au hasard, et mécanisme pour attraper",
    "In our first game, delicious Apples fall randomly from the sky! The player moves a Basket left and right to catch them\nand score points.": "Dans le premier jeu, des pommes tombent du ciel ! Le joueur déplace un panier gauche-droite pour les attraper\net marquer des points.",
    "Apple Spawning & Catching Script": "Script : apparition et attrape des pommes",
    "Module 2 • Apple Catch Game\nPage 8 of 20": "Module 2 • Jeu Attrape-pommes\nPage 8 sur 20",
    "Ch 10: Game 1 - Cat Hunt Rat Chase": "Ch 10 : Jeu 1 — Chasse au chat / poursuite du rat",
    "Player Arrow controls, enemy AI movement, and collision scoring": "Flèches du joueur, déplacement de l'ennemi, et score par collision",
    "In this chase game, the player controls the Cat sprite using keyboard arrow keys to hunt down a sneaky Rat sprite\nthat glides around the stage!": "Dans ce jeu de chasse, tu contrôles le chat avec les flèches du clavier pour attraper un rat malin\nqui glisse sur la scène !",
    "1. Cat Arrow Movement Script": "1. Script : déplacement du chat (flèches)",
    "2. Rat Glide & Catch Scoring": "2. Glisse du rat & score à l'attrape",
    "Module 2 • Cat Hunt Rat Game\nPage 9 of 20": "Module 2 • Jeu chasse au chat\nPage 9 sur 20",
    "MODULE 2 • SCRATCH test\nTHE CREATOR'S GUIDEBOOK": "MODULE 2 • EXERCICE SCRATCH\nLE GUIDE DU CRÉATEUR",
    "Ch 11: Exercise": "Ch 11 : Exercice",
    "Underwater mouse controls, target touching, and mouth costume animation": "Contrôle souris sous l'eau, contact de cible, et animation de la bouche",
    "In Hungry Shark, the player guides a giant Shark underwater using mouse pointer movement to catch Diver sprites!": "Dans Requin affamé, tu guides un requin sous l'eau avec la souris pour attraper des plongeurs !",
    "Shark Movement & Mouth Animation Logic": "Logique : mouvement du requin & animation de la bouche",
    "💡 Costume Animation Tip: Switching costumes briefly to an \"open mouth\" sprite creates a super cool visual eating\neffect!": "💡 Astuce costumes : passer un instant au costume « bouche ouverte » crée un super effet de croque !",
    "Module 2 • Hungry Shark Game\nPage 10 of 20": "Module 2 • Jeu requin affamé\nPage 10 sur 20",
    "MODULE 2 • SCRATCH GAMES & POLISH\nTHE CREATOR'S GUIDEBOOK": "MODULE 2 • JEUX SCRATCH & FINITIONS\nLE GUIDE DU CRÉATEUR",
    "Ch 12-14: Chrome Dino & Game Polish": "Ch 12-14 : Dino Chrome & finitions de jeu",
    "Jumping gravity physics, scrolling obstacles, and game menus": "Saut et gravité, obstacles qui défilent, et menus de jeu",
    "1. Dino Jump & Gravity Script": "1. Script : saut du dino & gravité",
    "2. Cactus Movement Script": "2. Script : mouvement des cactus",
    "3 Ways to Make Your Games Feel Pro": "3 façons de rendre tes jeux plus pro",
    "1. Add Sound Effects: Play chomp, meow, pop, or jump sounds during collisions!": "1. Ajoute des sons : croque, miaou, pop ou saut pendant les collisions !",
    "2. Create a Start Menu Screen: Use a broadcast message start game when player clicks \"PLAY\"!": "2. Écran menu : envoie le message démarrer le jeu quand on clique sur « JOUER » !",
    "3. Game Over Banner: Display a custom red \"GAME OVER\" sprite when player runs out of lives!": "3. Bannière Game Over : affiche un sprite rouge « GAME OVER » quand il n'y a plus de vies !",
    "Module 2 • Dino Runner & Polish\nPage 11 of 20": "Module 2 • Dino Runner & finitions\nPage 11 sur 20",
    "MODULE 3 • CAPCUT EDITING\nTHE CREATOR'S GUIDEBOOK": "MODULE 3 • MONTAGE CAPCUT\nLE GUIDE DU CRÉATEUR",
    "Ch 15: Intro to CapCut Video Editing": "Ch 15 : Intro au montage vidéo CapCut",
    "Getting started with CapCut on desktop and mobile": "Démarrer CapCut sur ordinateur et téléphone",
    "CapCut is one of the most popular, beginner-friendly video editing apps for desktop and phones. It makes editing\nvideo clips, adding text, and applying effects super fast!": "CapCut est une appli de montage très populaire, facile pour débuter, sur PC et téléphone. Couper des clips,\najouter du texte et des effets devient super rapide !",
    "The CapCut Workspace Areas": "Les zones de l'espace CapCut",
    "1. Media Library": "1. Médiathèque",
    "Where you import raw video clips,\naudio tracks, and images.": "Là où tu importes clips vidéo bruts,\npistes audio et images.",
    "2. Preview Window": "2. Fenêtre d'aperçu",
    "The screen where you watch your\nvideo play back live while editing.": "L'écran où tu regardes la vidéo en live\npendant le montage.",
    "3. The Timeline": "3. La timeline",
    "The bottom track layout where you\ncut, trim, arrange, and layer clips!": "Les pistes en bas où tu coupes, trims,\nranges et superposes les clips !",
    "Video Format Comparison": "Comparaison des formats vidéo",
    "Format\nAspect Ratio\nBest For Platform": "Format\nRatio\nIdéal pour",
    "Landscape (16:9)\n1920 x 1080\nYouTube Longform, TV, PC screens": "Paysage (16:9)\n1920 x 1080\nYouTube long, TV, écrans PC",
    "Vertical (9:16)\n1080 x 1920\nTikTok, YouTube Shorts, Instagram Reels": "Vertical (9:16)\n1080 x 1920\nTikTok, YouTube Shorts, Reels",
    "Module 3 • CapCut Editing\nPage 12 of 20": "Module 3 • Montage CapCut\nPage 12 sur 20",
    "Ch 16 & 17: Cutting Clips & Transitions": "Ch 16 & 17 : Couper les clips & transitions",
    "Trimming boring parts, splitting scenes, and adding smooth transitions": "Enlever les parties ennuyeuses, séparer les scènes, transitions fluides",
    "Step-by-Step Cutting Protocol in CapCut": "Protocole de coupe, étape par étape",
    "1. Import Footage: Drag your recorded video clips into CapCut's media panel.": "1. Importer : glisse tes clips dans le panneau médias CapCut.",
    "2. Drag to Timeline: Place your videos onto Main Video Track 1.": "2. Timeline : pose les vidéos sur la piste vidéo principale 1.",
    "3. Split / Cut: Move playhead line to cut spot, and click Split (Razor) tool (or press Ctrl + B).": "3. Couper / scinder : place la tête de lecture, outil Ciseaux (ou Ctrl + B).",
    "4. Delete Bad Parts: Select unwanted middle clip segment and press Delete!": "4. Supprimer : sélectionne le morceau inutile et appuie sur Suppr !",
    "5. Automatic Join: CapCut automatically snaps remaining clips together seamlessly!": "5. Jointure auto : CapCut accroche tout seul les clips qui restent !",
    "Popular CapCut Transitions": "Transitions CapCut populaires",
    "Dissolve / Fade": "Fondu / dissolve",
    "Smoothly blends Clip A into Clip B for\ntime passes or calm cuts.": "Mélange doux du clip A vers B :\ntemps qui passe, coupes calmes.",
    "Camera Push / Zoom": "Push caméra / zoom",
    "Energetic zoom in/out effect great\nfor tech reveals or action moments!": "Zoom énergique, idéal pour une\nrévélation tech ou de l'action !",
    "Blur Wipe": "Balayage flou",
    "Wipes left or right with a quick\nmotion blur effect.": "Balaye gauche ou droite avec un\nflou de mouvement rapide.",
    "Module 3 • Cutting & Transitions\nPage 13 of 20": "Module 3 • Coupes & transitions\nPage 13 sur 20",
    "Ch 18: Adding Memes & Overlays": "Ch 18 : Ajouter des mèmes & incrustations",
    "Using Green Screen memes, funny reactions, and picture-in-picture": "Mèmes fond vert, réactions drôles, et image dans l'image",
    "Adding funny Meme Clips (laughing reactions, vine booms, green screen popups) makes tech and gaming videos\nsuper entertaining!": "Des clips mèmes (rires, vine booms, popups fond vert) rendent les vidéos tech et gaming beaucoup plus fun !",
    "Using Green Screen Cutout in CapCut": "Incrustation fond vert dans CapCut",
    "1. Drag your Green Screen Meme Clip onto Video Track 2 (above your main video).": "1. Glisse le clip mème fond vert sur la piste vidéo 2 (au-dessus de la vidéo principale).",
    "2. Select the meme clip on timeline -> Go to Cutout Tab in right inspector panel.": "2. Sélectionne le clip → onglet Découpe dans le panneau de droite.",
    "3. Check Chroma Key -> Use Color Picker dropper to pick green background color.": "3. Coche Incrustation (Chroma Key) → pipette pour prendre le vert du fond.",
    "4. Increase Strength slider until green background disappears completely!": "4. Monte le curseur Intensité jusqu'à ce que le vert disparaisse complètement !",
    "💡 Pro Meme Tip: Pair funny meme visual popups with matching sound effects (e.g. pop sound or funny laugh) for\nmaximum humor!": "💡 Astuce mème : couple les popups visuels avec un son qui va bien (pop ou rire) pour un max d'humour !",
    "Module 3 • Memes & Overlays\nPage 14 of 20": "Module 3 • Mèmes & incrustations\nPage 14 sur 20",
    "Ch 19-21: Captions, Audio & Export": "Ch 19-21 : Sous-titres, audio & export",
    "Auto-subtitles, background music balance, and export settings": "Sous-titres auto, équilibre musique de fond, et réglages d'export",
    "1-Click Auto-Captions": "Sous-titres auto en 1 clic",
    "Go to Text Tab -> Auto Captions -> Create. CapCut's AI\ninstantly transcribes your voice track into synced subtitles!": "Onglet Texte → Sous-titres auto → Créer. L'IA CapCut\ntranscrit ta voix en sous-titres synchronisés !",
    "Styling Viral Captions": "Styliser des sous-titres viraux",
    "Use bold modern fonts (Montserrat/Impact), add yellow\nhighlight text color, and subtle black text outline shadow.": "Polices modernes en gras (Montserrat/Impact), surbrillance\njaune, et un léger contour noir.",
    "Proper Audio Volume Balance": "Bon équilibre du volume audio",
    "Voiceover / Speech Track": "Piste voix / commentaire",
    "Keep loud & clear (Volume set around 0 dB to +2 dB).": "Reste fort et clair (volume vers 0 dB à +2 dB).",
    "Background Music Track": "Piste musique de fond",
    "Lower volume significantly (set around -15 dB to -20 dB)\nso voice stays easy to hear.": "Baisse fort le volume (vers -15 dB à -20 dB)\npour que la voix reste claire.",
    "Best CapCut Export Settings": "Meilleurs réglages d'export CapCut",
    "Setting\nRecommended Value\nWhy": "Réglage\nValeur conseillée\nPourquoi",
    "Resolution\n1080p (Full HD)\nSharp clear video quality": "Résolution\n1080p (Full HD)\nImage nette et claire",
    "Frame Rate\n30 FPS or 60 FPS\nSmooth gameplay playback": "Images / s\n30 FPS ou 60 FPS\nLecture fluide (gameplay)",
    "Format\nMP4 (H.264)\nCompatible with all platforms": "Format\nMP4 (H.264)\nCompatible partout",
    "Module 3 • Captions & Export\nPage 15 of 20": "Module 3 • Sous-titres & export\nPage 15 sur 20",
    "MODULE 4 • CASUAL ROBOTICS\nTHE CREATOR'S GUIDEBOOK": "MODULE 4 • ROBOTIQUE SIMPLE\nLE GUIDE DU CRÉATEUR",
    "Ch 22: What is a Robot? (Casual View)": "Ch 22 : C'est quoi un robot ? (vue simple)",
    "Surface-level knowledge about smart machines without scary math": "Les bases des machines intelligentes, sans maths qui font peur",
    "A Robot is simply a machine that can automatically sense its environment, think using code, and perform a physical\naction!": "Un robot, c'est une machine qui sent son environnement, réfléchit avec du code, et fait une action physique !",
    "The 3 Parts Every Robot Has": "Les 3 parties de tout robot",
    "1. SENSORS (Eyes & Ears)": "1. CAPTEURS (yeux & oreilles)",
    "Detect things like distance, light,\ntouch, or sound around the robot.": "Détectent distance, lumière, toucher\nou son autour du robot.",
    "2. THE BRAIN (Microcontroller)": "2. LE CERVEAU (microcontrôleur)",
    "Small chip running code that decides\nwhat action to take.": "Petite puce qui exécute le code et\ndécide de l'action.",
    "3. MOTORS & LIGHTS (Hands\n& Legs)": "3. MOTEURS & LUMIÈRES (mains\n& jambes)",
    "Spin wheels, move arm joints, blink\nLEDs, or play sounds.": "Tournent les roues, bougent les bras,\nclignent les LED, ou jouent des sons.",
    "💡 Casual Robotics Tip: Robotics is just hardware + code working together!": "💡 Astuce : la robotique, c'est juste le matériel + le code qui travaillent ensemble !",
    "Module 4 • Casual Robotics\nPage 16 of 20": "Module 4 • Robotique simple\nPage 16 sur 20",
    "Ch 23 & 24: Robot Brains, Sensors & Motors": "Ch 23 & 24 : Cerveaux, capteurs & moteurs",
    "Arduino, Raspberry Pi, micro:bit, and hardware parts made simple": "Arduino, Raspberry Pi, micro:bit, et pièces, expliqués simplement",
    "Popular Beginner Robot Boards": "Cartes robot populaires pour débuter",
    "micro:bit": "micro:bit",
    "Super easy board with built-in LED\nscreen and buttons. Connects directly\nto Scratch!": "Carte très simple, écran LED et\nboutons intégrés. Se branche\ndirectement à Scratch !",
    "Arduino": "Arduino",
    "Classic sturdy board for controlling\nmotors, lights, and simple sensors.": "Carte classique et costaud pour\nmoteurs, lumières et capteurs simples.",
    "Raspberry Pi Pico": "Raspberry Pi Pico",
    "Tiny $4 mini-computer board\nprogrammed in easy MicroPython\ncode!": "Mini-ordinateur à ~4 $,\nprogrammé en MicroPython,\nfacile !",
    "Everyday Robot Hardware Parts": "Pièces robot du quotidien",
    "Ultrasonic Distance Sensor": "Capteur de distance ultrason",
    "Looks like two tiny eyes! Emits sound pulses to measure\nhow far away walls or obstacles are.": "On dirait deux petits yeux ! Il envoie des sons pour mesurer\nla distance des murs ou obstacles.",
    "Servo Motor": "Servomoteur",
    "A tiny motor that rotates precisely to specific angles (0 to\n180 degrees) for robot arm waving.": "Petit moteur qui tourne à un angle précis (0 à 180°) pour\nfaire saluer un bras de robot.",
    "DC Wheel Motor": "Moteur à courant continu (roue)",
    "Spins wheels forward or backward continuously so a rover\ncan drive!": "Fait tourner les roues en avant ou en arrière pour qu'un\nrover puisse rouler !",
    "LED Lights & Buzzers": "LED & buzzers",
    "Simple lights for robot eyes and buzzers for funny beep\nsounds.": "Lumières simples pour les yeux, buzzers pour des bips\ndrôles.",
    "Module 4 • Brains & Sensors\nPage 17 of 20": "Module 4 • Cerveaux & capteurs\nPage 17 sur 20",
    "Ch 25: Fun Surface Robotics Ideas": "Ch 25 : Idées robotique fun",
    "Cool starter projects you can build or dream up": "Des projets pour commencer, à construire ou à inventer",
    "1. Smart Trash Can": "1. Poubelle intelligente",
    "Uses a distance sensor to detect your hand and\nautomatically opens the lid with a servo motor!": "Un capteur de distance détecte ta main et\nouvre le couvercle avec un servomoteur !",
    "2. Obstacle-Avoiding Rover": "2. Rover anti-obstacles",
    "A 2-wheeled car rover that drives around and turns away\nwhenever it gets close to a wall!": "Une petite voiture à 2 roues qui avance et tourne\ndès qu'elle s'approche d'un mur !",
    "3. Automatic Plant Waterer": "3. Arrosoir automatique",
    "Detects dry soil moisture and pumps water to keep plants\nhealthy!": "Détecte la terre sèche et pompe de l'eau pour garder\nles plantes en forme !",
    "4. Pet Companion Bot": "4. Robot compagnon pour animaux",
    "Blinks LED eyes and wiggles a feather arm whenever a pet\nwalks past!": "Cligne des yeux LED et agite un bras-plume quand un\nanimal passe !",
    "🎉 Module 4 Complete! You now understand basic robotics concepts without any confusing math!": "🎉 Module 4 terminé ! Tu as les bases de la robotique, sans maths qui embrouillent !",
    "Module 4 • Starter Projects\nPage 18 of 20": "Module 4 • Projets pour commencer\nPage 18 sur 20",
    "MASTER REFERENCE\nTHE CREATOR'S GUIDEBOOK": "FICHE RÉCAP\nLE GUIDE DU CRÉATEUR",
    "Ch 26: Master Cheat Sheet": "Ch 26 : Fiche récap",
    "Quick reference cards across all 4 guidebook topics": "Cartes de référence rapide pour les 4 thèmes du guide",
    "💻 Vibe Coding & Languages": "💻 Codage vibe & langages",
    "Frontend: HTML, CSS, JavaScript (Visuals).": "Frontend : HTML, CSS, JavaScript (visuel).",
    "Backend: Python, Node.js, SQL (Servers).": "Backend : Python, Node.js, SQL (serveurs).",
    "NEVER SHARE: Passwords, API Keys, Credentials.": "NE JAMAIS PARTAGER : mots de passe, clés API, identifiants.",
    "🎮 Scratch Games Summary": "🎮 Résumé des jeux Scratch",
    "Apple Catch: Random X fall + Basket score.": "Pommes : chute X au hasard + score panier.",
    "Cat Hunt: Arrow keys + touching Rat score.": "Chasse au chat : flèches + toucher le rat = score.",
    "Hungry Shark: Mouse point + touching Diver.": "Requin affamé : souris + toucher le plongeur.",
    "Chrome Dino: Space jump + Cactus avoid.": "Dino Chrome : espace pour sauter + éviter les cactus.",
    "🎬 CapCut Video Shortcuts": "🎬 Raccourcis vidéo CapCut",
    "Split / Cut: Ctrl+B / Razor tool.": "Couper / scinder : Ctrl+B / outil Ciseaux.",
    "Transitions: Drag onto clip seam.": "Transitions : glisse sur la jointure des clips.",
    "Green Screen Meme: Cutout -> Chroma Key.": "Mème fond vert : Découpe → Chroma Key.",
    "Captions: Text -> Auto Captions.": "Sous-titres : Texte → Sous-titres auto.",
    "🤖 Casual Robotics": "🤖 Robotique simple",
    "Sensors: Eyes & ears (Distance/Light).": "Capteurs : yeux & oreilles (distance / lumière).",
    "Brains: Microcontrollers (micro:bit/Pico).": "Cerveaux : microcontrôleurs (micro:bit / Pico).",
    "Motors: Wheel & Servo movement.": "Moteurs : roue & mouvement servo.",
    "Master Reference\nPage 19 of 20": "Fiche récap\nPage 19 sur 20",
    "KEEP CREATING & BUILDING!\nTHE CREATOR'S GUIDEBOOK\nCongratulations on completing The\nCreator's Guidebook!": "CONTINUE DE CRÉER & DE CONSTRUIRE !\nLE GUIDE DU CRÉATEUR\nBravo, tu as terminé Le\nGuide du Créateur !",
    "You now have the fundamental knowledge to code with AI, build games in Scratch, edit videos in CapCut, and\nexplore robotics.": "Tu as maintenant les bases pour coder avec l'IA, créer des jeux dans Scratch, monter des vidéos dans CapCut, et\nexplorer la robotique.",
    "Recommended Software Links\n  Scratch Editor: scratch.mit.edu or turbo warp.": "Liens logiciels conseillés\n  Éditeur Scratch : scratch.mit.edu ou turbo warp.",
    "CapCut Desktop: capcut.com (Free video editor for PC/Mac/Phone).": "CapCut Desktop : capcut.com (éditeur gratuit PC/Mac/téléphone).",
    "IDE Code Editor: code.visualstudio.com or cursor.com or kiro or antigravity": "Éditeur IDE : code.visualstudio.com ou cursor.com ou kiro ou antigravity",
    "Download the Gostudy! app for more\nopportunities like this at\ngoostudy.vercel.app": "Télécharge l'appli Go Study ! pour plus\nd'opportunités comme celle-ci :\ngoostudy.vercel.app",
    "About the Author": "À propos de l'auteur",
    "SkyDrake (Chukwudumueme Miracle Chidera)": "SkyDrake (Chukwudumueme Miracle Chidera)",
    "is an automotive engineering student, soft-": "est étudiant en génie automobile, déve-",
    "ware developer, and entrepreneur based in": "loppeur logiciel et entrepreneur, basé à",
    "Lomé, Togo. He runs Skydrake, a company": "Lomé, Togo. Il dirige Skydrake, une entreprise",
    "building apps and SaaS tools for the West": "qui crée des applis et outils SaaS pour l'Afrique",
    "African market, and created this guidebook": "de l'Ouest, et a conçu ce guide pour rendre",
    "to make coding, design, and robotics simple": "le code, le design et la robotique simples",
    "and accessible for young creators.": "et accessibles aux jeunes créateurs.",
    "Signature:": "Signature :",
}

# Extra keys with collapsed whitespace for TOC rows that have huge spaces
for k, v in list(T.items()):
    T[norm(k)] = v.replace("\n", " ") if "\n" not in v else v


def lookup(raw: str):
    if raw in T:
        return T[raw]
    n = norm(raw)
    if n in T:
        # restore newlines roughly matching original line count
        fr = T[n]
        if raw.count("\n") == fr.count("\n"):
            return fr
        if "\n" in raw and "\n" not in fr:
            # keep as single-line french in original box
            return fr
        return fr
    # trailing-space TOC variants
    compact = " ".join(raw.split())
    if compact in T:
        return T[compact]
    if norm(compact) in T:
        return T[norm(compact)]
    return None


def fontfile_for(name: str):
    p = FONT_FILE.get(name)
    if p and Path(p).exists():
        return str(p)
    if name.startswith("Type3"):
        return str(FONT_FILE["SegoeUI"])
    return str(FONT_FILE["SegoeUI"])


def is_leftright(text: str, bbox) -> bool:
    w = bbox[2] - bbox[0]
    if w < 380:
        return False
    if "THE CREATOR'S GUIDEBOOK" in text or "LE GUIDE DU CRÉATEUR" in text:
        return True
    if "Page " in text and (" of 20" in text or " sur 20" in text):
        return True
    if text.strip().startswith("Ch ") and "\nPage " in text:
        return True
    if text.startswith("MODULE ") and "\nPAGES " in text:
        return True
    if text.startswith("MASTER ") and "\nPAGES " in text:
        return True
    return False


def split_lr(raw, fr):
    src_l, _, src_r = (raw if "\n" in raw else raw + "\n").partition("\n")
    if "\n" in fr:
        a, b = fr.split("\n", 1)
        return a, b
    return fr, src_r


def lightest(cols):
    return max(cols, key=lambda c: c[0] + c[1] + c[2])


def sample_bg(pix, page_rect, rect):
    sx = pix.width / page_rect.width
    sy = pix.height / page_rect.height
    x0, y0, x1, y1 = rect
    pts = [
        (x0 - 5, (y0 + y1) / 2),
        (x1 + 5, (y0 + y1) / 2),
        ((x0 + x1) / 2, y0 - 5),
        ((x0 + x1) / 2, y1 + 5),
        (x0 + 2, y0 + 1),
        (x1 - 2, y0 + 1),
    ]
    cols = []
    for x, y in pts:
        px = int(min(pix.width - 1, max(0, x * sx)))
        py = int(min(pix.height - 1, max(0, y * sy)))
        cols.append(pix.pixel(px, py)[:3])
    mid = lightest(cols)
    return mid[0] / 255, mid[1] / 255, mid[2] / 255


FONT_TAG = {
    "InkFree": "ink",
    "ArialBlack": "ablk",
    "SegoeUI": "segoe",
    "SegoeUI-Bold": "segoeb",
    "SegoeUI-Semibold": "segoesb",
    "SegoeUI-Italic": "segoei",
    "SegoeUIBlack": "segoek",
    "Consolas": "cons",
    "Consolas-Bold": "consb",
    "DubaiMedium": "dubai",
    "Arial,Italic": "ariali",
    "Helvetica": "helv",
}


def first_span(block):
    for line in block["lines"]:
        for s in line["spans"]:
            if s["text"].strip():
                return s
    return None


def line_text(line):
    return "".join(s["text"] for s in line["spans"]).rstrip()


def shrink_to_width(text, fontfile, size, max_w):
    font = pymupdf.Font(fontfile=fontfile)
    fs = float(size)
    floor = max(6.0, size * 0.55)
    while fs > floor and font.text_length(text, fs) > max_w:
        fs -= 0.25
    return fs


def text_fits(rect, text, fontfile, size):
    font = pymupdf.Font(fontfile=fontfile)
    max_w = max(8, rect[2] - rect[0])
    max_h = max(4, rect[3] - rect[1])
    leading = size * 1.18
    y = 0.0
    for para in str(text).split("\n"):
        words = para.split(" ") if para else [""]
        line = ""
        for w in words:
            trial = (line + " " + w).strip() if line else w
            if font.text_length(trial, size) <= max_w:
                line = trial
            else:
                y += leading
                line = w
                if y > max_h + 2:
                    return False
        y += leading
        if y > max_h + 2:
            return False
    return True


def process():
    doc = pymupdf.open(SRC)
    unmatched = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=72, alpha=False)
        images = [pymupdf.Rect(b["bbox"]) for b in page.get_text("dict")["blocks"] if b.get("type") == 1]
        jobs = []
        d = page.get_text("dict")
        for b in d["blocks"]:
            if b.get("type") != 0:
                continue
            raw_keep = "\n".join(line_text(line) for line in b["lines"])
            sp = first_span(b)
            if not sp:
                continue
            font, size, color = sp["font"], sp["size"], sp["color"]
            bbox = b["bbox"]
            if should_skip(raw_keep, font, bbox, images):
                continue
            fr = lookup(raw_keep) or lookup(norm(raw_keep))
            if fr is None:
                unmatched.append((i + 1, raw_keep[:120], font))
                continue
            lines = b["lines"]
            h = bbox[3] - bbox[1]
            lr = is_leftright(raw_keep, bbox) and h < 18

            def add_line(line, text, align, redact_rects=None):
                s = line["spans"][0]
                jobs.append({
                    "kind": "line",
                    "origin": list(s["origin"]),
                    "rect": line["bbox"],
                    "fr": text,
                    "font": s["font"],
                    "size": s["size"],
                    "color": rgb(s["color"]),
                    "align": align,
                    "redact": redact_rects or [line["bbox"]],
                    "max_w": (page.rect.x1 - 22 - s["origin"][0]) if align == 0 else (s["bbox"][2] - s["bbox"][0] + 90),
                })

            if "Congratulations on completing" in raw_keep:
                add_line(lines[0], "CONTINUE DE CRÉER & DE CONSTRUIRE !", 0)
                add_line(lines[1], "LE GUIDE DU CRÉATEUR", 2)
                jobs.append({
                    "kind": "box",
                    "rect": [
                        lines[2]["bbox"][0], lines[2]["bbox"][1],
                        page.rect.x1 - 24, lines[3]["bbox"][3] + 4,
                    ],
                    "fr": "Bravo, tu as terminé Le\nGuide du Créateur !",
                    "font": "ArialBlack",
                    "size": lines[2]["spans"][0]["size"],
                    "color": rgb(lines[2]["spans"][0]["color"]),
                    "align": 0,
                    "redact": [lines[2]["bbox"], lines[3]["bbox"]],
                })
                continue
            if lr and len(lines) >= 2:
                left, right = split_lr(raw_keep, fr)
                add_line(lines[0], left, 0, [lines[0]["spans"][0]["bbox"]])
                add_line(lines[-1], right, 2, [lines[-1]["spans"][-1]["bbox"]])
            elif size >= 40:
                add_line(lines[0], fr.replace("\n", " "), 0, [bbox])
            elif size >= 14 and "\n" not in raw_keep:
                add_line(lines[0], fr.replace("\n", " "), 0, [bbox])
            else:
                parts = [p for p in fr.split("\n")]
                if len(parts) < len(lines):
                    parts += [""] * (len(lines) - len(parts))
                if len(parts) > len(lines):
                    parts = parts[: len(lines) - 1] + [" ".join(parts[len(lines) - 1 :])]
                for line, txt in zip(lines, parts):
                    if txt.strip():
                        add_line(line, txt, 0, [line["bbox"]])

        for job in jobs:
            fill = sample_bg(pix, page.rect, job["rect"])
            for rr in job["redact"]:
                page.add_redact_annot(pymupdf.Rect(rr) + (-0.2, -0.2, 0.3, 0.25), fill=fill)
        page.apply_redactions(
            images=pymupdf.PDF_REDACT_IMAGE_NONE,
            graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
            text=pymupdf.PDF_REDACT_TEXT_REMOVE,
        )

        loaded = {}
        for job in jobs:
            ff = fontfile_for(job["font"])
            tag = FONT_TAG.get(job["font"], "segoe")
            if str(job["font"]).startswith("Type3"):
                tag = "segoe"
                ff = fontfile_for("SegoeUI")
            if tag not in loaded:
                if ff:
                    page.insert_font(fontname=tag, fontfile=ff)
                loaded[tag] = True
            if job["kind"] == "line":
                x, y = job["origin"]
                fs = shrink_to_width(job["fr"], ff, job["size"], job.get("max_w", 400))
                if job["size"] >= 50:
                    fs = min(fs, 46)
                if job["align"] == 2:
                    tl = pymupdf.Font(fontfile=ff).text_length(job["fr"], fs)
                    x = job["rect"][2] - tl
                page.insert_text((x, y), job["fr"], fontname=tag, fontsize=fs, color=job["color"])
            else:
                r = pymupdf.Rect(job["rect"]) + (0, -0.4, 6, 3)
                fs = float(job["size"])
                floor = max(6.0, job["size"] * 0.5)
                while fs > floor and not text_fits(r, job["fr"], ff, fs):
                    fs -= 0.4
                leftover = page.insert_textbox(
                    r, job["fr"], fontname=tag, fontsize=fs, color=job["color"], align=0
                )
                if isinstance(leftover, str) and leftover.strip():
                    print("overflow p", i + 1, leftover[:60])

    meta = dict(doc.metadata or {})
    meta["title"] = "Le Guide du Createur - 20 pages A4"
    doc.set_metadata(meta)
    doc.save(OUT, garbage=4, deflate=True)
    print("wrote", OUT)
    print("unmatched", len(unmatched))
    for u in unmatched:
        print(" ", u)


if __name__ == "__main__":
    process()
