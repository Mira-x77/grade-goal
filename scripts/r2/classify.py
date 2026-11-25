#!/usr/bin/env python3
"""Classification helpers shared by the R2 publisher and the catalogue tools.

The rules mirror the app's own helpers in ``src/lib/library-filters.ts``:

* a paper can belong to **several classes** ("Tle C, Tle D"), so every
  detect_* function has a plural form that returns a list;
* a paper can belong to **several subjects** ("HG" is Histoire *and*
  Géographie, "SVT PCT" is both);
* séries are read from the title ("séries A, C, D", "1ère CD", "BAC1 MATHS ACD")
  and are always upper-case;
* **BAC 1 / Probatoire belongs to Première, BAC / BAC II to Terminale**;
* administrative circulars (school-authorisation lists, marker/supervisor
  lists, result lists, calendars, "affichage obligatoire") are *not* exam
  material and are dropped instead of being counted as papers.
"""

from __future__ import annotations

import html
import re
import time
import unicodedata

# --------------------------------------------------------------------------- #
# Official vocabularies (kept in sync with src/lib/library-filters.ts)
# --------------------------------------------------------------------------- #

OFFICIAL_CLASS_LEVELS = [
    "6ème", "5ème", "4ème", "3ème",
    "2nde", "2nde A4", "2nde CD", "2nde E", "2nde F", "2nde G",
    "1ère", "1ère A4", "1ère C", "1ère D", "1ère E", "1ère F", "1ère G",
    "Tle", "Tle A4", "Tle C", "Tle D", "Tle E", "Tle F", "Tle G",
    "CEPD", "CAP", "Primaire", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2",
]

OFFICIAL_SUBJECTS = [
    "Mathématiques", "SVT", "PCT", "Français", "Anglais", "Allemand",
    "Philosophie", "Histoire", "Géographie", "ECM", "Économie",
    "Informatique", "Langues", "EPS", "Musique", "Conduite",
]

# Séries offered by the APC system. "A" is the old name of "A4"; "CD" is the
# combined 2nde stream and maps to both C and D in 1ère/Tle.
LYCEE_SERIES = ("A4", "C", "D", "E", "F", "G")
COLLEGE_LEVELS = ("6ème", "5ème", "4ème", "3ème")
PRIMARY_LEVELS = ("CP1", "CP2", "CE1", "CE2", "CM1", "CM2")


# --------------------------------------------------------------------------- #
# Normalisation
# --------------------------------------------------------------------------- #

def strip_accents(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")


def norm(s: str) -> str:
    s = html.unescape(s or "")
    return re.sub(r"\s+", " ", strip_accents(s).lower()).strip()


def format_bytes(n: int) -> str:
    if n <= 0:
        return "0 Bytes"
    k = 1024.0
    units = ["Bytes", "KB", "MB", "GB"]
    i = 0
    size = float(n)
    while size >= k and i < len(units) - 1:
        size /= k
        i += 1
    return f"{round(size, 2)} {units[i]}"


def storage_slug(s: str) -> str:
    s = strip_accents(s)
    s = re.sub(r"[^a-zA-Z0-9._-]+", "-", s)
    return s.strip("-") or "file"


def detect_year(text: str) -> int:
    years = [int(y) for y in re.findall(r"(20[0-2]\d)", text)]
    return max(years) if years else time.localtime().tm_year


# --------------------------------------------------------------------------- #
# Subjects (plural)
# --------------------------------------------------------------------------- #

_SUBJECT_RULES: list[tuple[str, tuple[str, ...]]] = [
    (r"\bmaths?\b|\bmathematiques?\b|\bmath\b", ("Mathématiques",)),
    (r"\bsvt\b|sciences? de la vie|sciences? naturelles?|biologie", ("SVT",)),
    (r"\bpct\b|sciences? physiques?|\bphysique\b|\bchimie\b|\bpc\b", ("PCT",)),
    (r"\bfrancais\b|\blitterature\b|\bpoesie\b|\bpoetique\b|\bgrammaire\b|"
     r"\borthographe\b|\blecture\b", ("Français",)),
    (r"\banglais\b|\benglish\b|\bang\b|\bangl\b", ("Anglais",)),
    (r"\ballemand\b|\ball\b", ("Allemand",)),
    (r"\bphil(?:o(?:sophie)?)?\b", ("Philosophie",)),
    (r"\bhistoire\b|\bhisto\b", ("Histoire",)),
    (r"\bgeo(?:graphie)?\b", ("Géographie",)),
    (r"\becm\b|\bedhc\b|civique|morale", ("ECM",)),
    (r"\beconomie\b|\beco\b|\bcompta\b|\bcomptabilite\b|\bdroit\b|\bgestion\b",
     ("Économie",)),
    (r"\binformatique\b|\binfo\b|\btic\b", ("Informatique",)),
    (r"\bewe\b|\bkabye\b|\barabe\b|\blangues?\b", ("Langues",)),
    (r"\beps\b|\bsport\b", ("EPS",)),
    (r"\bmusique\b", ("Musique",)),
    (r"conduite", ("Conduite",)),
]

# "HG" / "H-G" / "Histoire-Géo" is one document covering two subjects.
_HIST_GEO = re.compile(r"\bhg\b|\bh[\s./-]*g\b|\bhist(?:oire|o)?[\s./-]*geo\b")


def detect_subjects(text: str) -> list[str]:
    """Every subject named in the text, in a stable order."""
    n = norm(text)
    found = set()
    for pattern, subjects in _SUBJECT_RULES:
        if re.search(pattern, n):
            found.update(subjects)
    if _HIST_GEO.search(n):
        found.update(("Histoire", "Géographie"))
    if not found:
        return ["Général"]
    ordered = [s for s in OFFICIAL_SUBJECTS if s in found]
    return ordered or sorted(found)


def detect_subject(text: str) -> str:
    """Backwards-compatible single value (primary subject)."""
    return detect_subjects(text)[0]


# --------------------------------------------------------------------------- #
# Classes / séries (plural)
# --------------------------------------------------------------------------- #

_CYCLE_RE = re.compile(
    r"\b(1eres?|1res?|1ieres?|1yeres?|premieres?|tles?|terminales?|2ndes?|secondes?)\b")
_CYCLE_NAME = {
    "1ere": "1ère", "1eres": "1ère", "1re": "1ère", "1res": "1ère",
    "1iere": "1ère", "1ieres": "1ère", "1yere": "1ère", "1yeres": "1ère",
    "premiere": "1ère", "premieres": "1ère",
    "tle": "Tle", "tles": "Tle", "terminale": "Tle", "terminales": "Tle",
    "2nde": "2nde", "2ndes": "2nde", "seconde": "2nde", "secondes": "2nde",
}

# "... 6e en 3e", "6eme a 3eme", "6e-3e": a collège-wide compilation.
_COLLEGE_RANGE = re.compile(
    r"\b6\s*(?:e|eme|eme)?\s*(?:en|a|-|/|jusqu.?a)\s*3\s*(?:e|eme)?\b")
_PRIMARY_TOKEN = re.compile(r"\b(cp1|cp2|ce1|ce2|cm1|cm2)\b")
_COLLEGE_TOKEN = re.compile(r"\b(6|5|4|3)\s*(?:e|eme|ieme)\b")
# "PCT 3", "MATHS 4", "SVT 6": collège class written after the subject.
_SUBJECT_CLASS_TOKEN = re.compile(
    r"\b(?:pct|svt|maths?|pc|fr|ang|hg|ecm|philo)\s*([3-6])\b")

_ORDINALS = re.compile(r"\b\d{1,2}\s*(?:e|er|ere|eme|ieme)\b", re.IGNORECASE)
_GRAND_LOME = re.compile(r"\bg[\s./-]*l(?:ome)?\b", re.IGNORECASE)
# "3E TRIMESTRE", "3e T", "3ET": the "e" is an ordinal, not the 3ème class.
_TRIMESTRE_TOKEN = re.compile(
    r"\b\d{1,2}\s*(?:e|er|ere|eme|ieme)?\s*(?:t\b|trim\b|trimestre\b|semestre\b)",
    re.IGNORECASE)
# Subject acronyms that contain A-G letters and must not become séries.
_SUBJECT_ACRONYMS = re.compile(
    r"\b(?:H[\s./-]*G|HG|PC|PCT|SVT|ECM|EPS|ANG|ANGL|ALL|PHIL|FR|GEO|HIST)\b",
    re.IGNORECASE)


def _clean_for_series(text: str) -> str:
    """Upper-case copy with ordinals, 'G-Lomé' and subject acronyms removed,
    so lone A-G letters really are séries."""
    s = strip_accents(html.unescape(text or "")).upper()
    s = _SUBJECT_ACRONYMS.sub(" ", s)   # "H-G", "PC", "SVT", ...
    s = _TRIMESTRE_TOKEN.sub(" ", s)    # "3E TRIMESTRE", "2 E SEMESTRE"
    s = _ORDINALS.sub(" ", s)
    s = _GRAND_LOME.sub(" ", s)         # "G-LOME", "G LOME", "G.LOME"
    s = re.sub(r"\b\d+\s*(?:ER|ERE|EME|IEME)\b", " ", s)
    return s


def _isolated_series_letters(text: str) -> set[str]:
    """Single upper-case A-G letters that are not part of an acronym."""
    s = _clean_for_series(text)
    out: set[str] = set()
    for m in re.finditer(r"\b([A-G])\b", s):
        i = m.start(1)
        before = s[i - 1] if i > 0 else ""
        after = s[i + 1] if i + 1 < len(s) else ""
        # "BAC", "PCT", "ECM" etc. must never yield letters.
        if before.isalpha() or after.isalpha():
            continue
        # "d'..." elision is not a série either.
        if after in ("'", "’"):
            continue
        # "F. Laroche" (author initial) is not série F. A real série listing
        # looks like "A, D" or "A." followed by another single letter.
        if after == ".":
            tail = s[i + 1:].lstrip(". ")
            if re.match(r"[A-Z]{3,}", tail):
                continue
        out.add(m.group(1))
    return out


def _series_from_follow(follow: str) -> set[str]:
    """Séries named right after a cycle word ("Tle A, D", "1ère CD")."""
    s = _clean_for_series(follow)
    out = set(_isolated_series_letters(s))
    if re.search(r"\bCD\b", s):
        out.discard("CD")
        out.update(("C", "D"))
    if re.search(r"\bC4\b", s):
        out.discard("4")
        out.add("C")
    if re.search(r"\bA4\b", s):
        out.discard("A")
        out.add("A4")
    if re.search(r"\bG2\b|\bG3\b", s):
        out.discard("2")
        out.discard("3")
        out.add("G")
    # "série A B C" -> three separate letters, already covered above.
    return out


def _expand_series(cycle: str, letters: set[str]) -> set[str]:
    if not letters:
        return set()
    if cycle == "2nde":
        out: set[str] = set()
        if "CD" in letters or {"C", "D"} <= letters:
            out.add("2nde CD")
        for letter in letters:
            if letter == "A4" or letter == "A":
                out.add("2nde A4")
            elif letter in {"E", "F", "G"}:
                out.add(f"2nde {letter}")
        return out
    out = set()
    for letter in letters:
        if letter in {"A", "A4"}:
            out.add(f"{cycle} A4")
        elif letter in LYCEE_SERIES:
            out.add(f"{cycle} {letter}")
    return out


def _series_hint_without_cycle(text: str) -> set[str]:
    """Séries in a title that never names a cycle ("MATHÉMATIQUES A, B, C").

    Only explicit séries wording or lone comma-separated letters count; this
    avoids turning every acronym into a stream.
    """
    s = _clean_for_series(text)
    looks_explicit = bool(re.search(
        r"\bSERIES?\b|\bEPREUVE(?:S)?\b|\bSUJET(?:S)?\b|\bMATHS?\b|\bBAC\s*1\b|"
        r"\bBAC1\b|\bPROBATOIRE\b|\bBAC\b",
        s))
    if not looks_explicit:
        return set()
    letters = _isolated_series_letters(s)
    if re.search(r"\bA4\b", s):
        letters.discard("A")
        letters.add("A4")
    if re.search(r"\bCD\b", s):
        letters.update(("C", "D"))
    if re.search(r"\bC4\b", s):
        letters.add("C")
    if re.search(r"\bG[23]\b", s):
        letters.add("G")
    # Compact series runs such as "ACD" (never "BAC", "DE", "CE"...).
    for token in re.findall(r"\b[A-G]{2,4}\b", s):
        if token in {"CD", "ACD", "BCD", "ABCD", "ACDE"}:
            letters.update(token)
    return letters


def detect_classes(text: str, hint: str | None = None) -> list[str]:
    """Every class/série a document belongs to.

    ``hint`` is an optional explicit folder/class hint (e.g. "Tle_A" from the
    organised exam folders). The text wins when it names a class — a file
    called ``Maths_1ere_C_cours.pdf`` inside a generic ``1ere_CD`` folder is
    1ère C, not C + D — and the hint is only a fallback for names such as
    ``IMG_0042.pdf`` that carry no class at all.
    """

    n = norm(text)
    # "1ereD", "TLED", "1ereA4", "tleCD" -> "1ere d", "tle d", ...
    n_cycles = re.sub(
        r"\b(1eres?|1res?|1ieres?|1yeres?|premieres?|2ndes?|secondes?|tles?|terminales?)(a4|cd|c4|[a-g])\b",
        r"\1 \2",
        n,
    )
    out: set[str] = set()

    # Primary school and CEPD/CAP are their own class levels.
    if re.search(r"\bcepd\b", n):
        out.add("CEPD")
    for token in _PRIMARY_TOKEN.findall(n):
        out.add(token.upper())
    if re.search(r"\bcap\b", n) and not re.search(r"\bbac\b|primaire", n):
        out.add("CAP")

    # Collège
    n_college = _TRIMESTRE_TOKEN.sub(" ", n)
    if _COLLEGE_RANGE.search(n_college):
        out.update(COLLEGE_LEVELS)
    for value in _COLLEGE_TOKEN.findall(n_college):
        out.add({"6": "6ème", "5": "5ème", "4": "4ème", "3": "3ème"}[value])
    # Togolese teacher shorthand: "DST 2T PCT 3", "EXO MATHS 3e", "SVT 4".
    for value in _SUBJECT_CLASS_TOKEN.findall(n_college):
        out.add({"6": "6ème", "5": "5ème", "4": "4ème", "3": "3ème"}[value])
    if re.search(r"\bbepc\b", n):
        out.add("3ème")

    # Lycée cycles, in order of precedence (BAC 1 before BAC).
    cycle_hits: list[tuple[int, str, str]] = []
    for m in _CYCLE_RE.finditer(n_cycles):
        cycle_hits.append((m.start(), m.end(), _CYCLE_NAME[m.group(1)]))
    if cycle_hits:
        for index, (_, end, cycle) in enumerate(cycle_hits):
            next_start = cycle_hits[index + 1][0] if index + 1 < len(cycle_hits) else len(n_cycles)
            if next_start > end + 48:
                # Never let the 48-char window cut a word in half: the leftover
                # letter would look like a série ("... - c").
                follow = n_cycles[end:end + 48].rsplit(" ", 1)[0]
            else:
                follow = n_cycles[end:next_start]
            expanded = _expand_series(cycle, _series_from_follow(follow))
            if expanded:
                out.update(expanded)
            else:
                out.add(cycle)
        return sorted(out, key=_class_sort_key)

    # No explicit cycle: infer one from the exam wording.
    inferred: str | None = None
    if re.search(r"\bbac\s*1\b|\bbac1\b|\bprobatoire\b|\bproba\b|premiere partie", n):
        inferred = "1ère"
    elif re.search(r"\bbac\s*(?:2|ii)\b|\bbacii\b|\bterminale\b|\btle\b|\bbac\b|baccalaureat", n):
        inferred = "Tle"

    series = _series_hint_without_cycle(text)
    if inferred:
        expanded = _expand_series(inferred, series)
        out.update(expanded or {inferred})
        return sorted(out, key=_class_sort_key)

    # Séries but no cycle ("épreuve de maths A, B, C"): the document applies to
    # both lycée cycles, so it must not disappear from either filter.
    if series:
        for cycle in ("1ère", "Tle"):
            out.update(_expand_series(cycle, series))
        if out:
            return sorted(out, key=_class_sort_key)

    if out:
        return sorted(out, key=_class_sort_key)
    # "1S" / "1°S" (French system) is Première; série S does not exist in APC.
    if re.search(r"\b1\s*[°º]?\s*s\b", n):
        out.add("1ère")
        return sorted(out, key=_class_sort_key)
    # "Primaire" is a last resort: "Maths 1ere D Cours du Primaire" describes
    # the level of the course, not the class that sits the exam.
    if re.search(r"\bprimaire\b", n):
        out.add("Primaire")
        return sorted(out, key=_class_sort_key)
    if hint:
        hinted = detect_classes(hint)
        if hinted and hinted != ["All"]:
            return hinted
    return ["All"]


def _class_sort_key(level: str) -> int:
    try:
        return OFFICIAL_CLASS_LEVELS.index(level)
    except ValueError:
        return len(OFFICIAL_CLASS_LEVELS)


def detect_class(text: str) -> str:
    """Backwards-compatible single value (primary class)."""
    classes = detect_classes(text)
    return classes[0] if classes else "All"


# --------------------------------------------------------------------------- #
# Exam types
# --------------------------------------------------------------------------- #

def detect_exam_type(text: str) -> str:
    n = norm(text)
    # Word boundaries matter: "biblio-sciencepdf" contains "cepd".
    if re.search(r"\bcepd\b", n):
        return "CEPD"
    if re.search(r"\bbepc\b", n):
        return "BEPC"
    if re.search(r"\bcap\b", n) and not re.search(r"\bbac\b", n):
        return "CAP"
    if "concours" in n or "admissib" in n or "admission" in n:
        return "Concours"
    if "annale" in n:
        return "Annales"
    # BAC 1 is the Probatoire exam, sat in Première (not Terminale).
    if re.search(r"\bbac\s*1\b|\bbac1\b|\bprobatoire\b|\bproba\b", n):
        return "Probatoire"
    if re.search(r"\bbac\b|baccalaureat|bacii|bac ii", n):
        return "Baccalauréat"
    if "blanc" in n:
        return "Composition"
    if "compo" in n or "composition" in n:
        return "Composition"
    if "interro" in n:
        return "Interro"
    if "devoir" in n:
        return "Devoir"
    # Abbreviations used on Togolese school papers.
    if re.search(r"\bdst\b|\bds\s*\d|\bdev\b|dev\w*surveil", n):
        return "Devoir"
    if re.search(r"\btd\b|\bexos?\b|\bexercices?\b", n):
        return "Practice"
    if "epreuve" in n or "sujet" in n or "exercice" in n:
        return "Practice"
    return "Revision"


def detect_session(text: str) -> str:
    n = norm(text)
    if "1er trim" in n or "1ere trim" in n or "trimestre 1" in n or "1er semestre" in n:
        return "1er Trimestre"
    if "2eme trim" in n or "2e trim" in n or "trimestre 2" in n or "2eme semestre" in n:
        return "2ème Trimestre"
    if "3eme trim" in n or "3e trim" in n or "trimestre 3" in n or "3eme semestre" in n:
        return "3ème Trimestre"
    return "Annuel"


# --------------------------------------------------------------------------- #
# Non-exam documents (administrative circulars)
# --------------------------------------------------------------------------- #

# These used to be counted as papers: school-authorisation lists for
# 2026-2027, marker/supervisor commissions, result lists, calendars of
# non-academic events. They are not study material.
_NON_EXAM_PATTERNS = [
    r"liste des ecoles",
    r"ecoles autorisees",
    r"etablissements superieurs accredites",
    r"liste nominative",
    r"affichage obligatoire",
    r"anpe\b",
    r"formation en camion",
    r"liste des (?:candidats|admis|rejet|surveillants|correcteurs|eleves)",
    r"\bliste\b[^.]{0,60}\b(?:candidats?|admis|aptes?|rejets?|centres?)\b",
    r"\brejet\b",
    r"\baptes?\b",
    r"\bcentre d.ecrit\b",
    r"listes? (?:definitives?|des admis)",
    r"resultats? (?:du |de la )?(?:bac|bepc|cepd|examen)",
    r"commission (?:de )?(?:correction|surveillance|secretariat|ecrit)",
    r"centre de correction",
    r"\bdecoupage\b",
    r"annee scolaire\s*\d{4}",
    r"decision,? organisation",
    r"admmission definitive",
    r"admission definitive",
    r"repartition",
    r"communique",
    r"\bcalendrier\b(?!.*(?:epreuve|sujet|annale))",
    r"^liste\b.*\b(?:ecoles?|etablissements?)\b",
]


def is_non_exam_document(*texts: str) -> bool:
    blob = norm(" ".join(t for t in texts if t))
    return any(re.search(pattern, blob) for pattern in _NON_EXAM_PATTERNS)


# --------------------------------------------------------------------------- #
# Kind (paper or book)
# --------------------------------------------------------------------------- #

def detect_kind(title: str, slug: str = "") -> tuple[str, str]:
    blob = f"{title} {slug}"
    n = norm(blob)

    if is_non_exam_document(blob):
        return "skip", "Non-exam"

    paper_hit = bool(re.search(
        r"bepc|\bbac\b|bac1|bacii|baccalaureat|cepd|\bcap\b|annale|sujet|epreuve|preuve|corrig|blanc|"
        r"concours|admissib|admission|examen|"
        r"\bcompo\b|composition|trimestre|semestre|qcm|compilation|"
        r"\bdst\b|\btd\b|\bdevoir\b|interro|revision",
        n,
    ))
    book_hit = bool(re.search(
        r"programme|manuel|livre|support de cours|fiche de cours|progression|"
        r"recueil|fascicule|livre du maitre|collection",
        n,
    ))
    if paper_hit and not book_hit:
        return "paper", detect_exam_type(n)
    if book_hit and not paper_hit:
        category = "Textbook"
        if "programme" in n or "progression" in n:
            category = "Programme"
        elif "fiche" in n or "support" in n:
            category = "Study Guide"
        elif "annale" in n:
            category = "Practice Book"
        elif "livre" in n or "manuel" in n or "recueil" in n:
            category = "Textbook"
        else:
            category = "Reference"
        return "book", category
    if paper_hit:
        return "paper", detect_exam_type(n)
    if "affichage" in n or "liste" in n:
        return "skip", "Non-exam"
    return "book", "Reference"


# --------------------------------------------------------------------------- #
# One-call classification used by the catalogue tools
# --------------------------------------------------------------------------- #

_GENERIC_STEM = re.compile(
    r"(?i)^(?:new document(?: from)?(?: hp)?(?: deskjet)?[\w .,\-]*|"
    r"document|scan|camscanner[\w .\-]*|img[\w .\-]*|page[\w .\-]*|"
    r"[\d .\-_]+)$"
)


def classify_document(title: str, file_name: str = "", hint: str | None = None) -> dict:
    """Full metadata for one document.

    ``hint`` may carry an explicit class ("Tle_A", "1ere_C", "3ème") taken from
    the folder the file was found in.
    """
    # Titles are often just the file name without ".pdf", sometimes prefixed
    # with a catalogue number ("0183 - EXERCICES ... 1ereD"). Appending the
    # file name again makes a cycle ("1ereD") appear twice, and the first
    # occurrence then looks like a plain "1ère" next to the real "1ère D".
    # Dedupe on word sets so the extra number does not defeat the check.
    title_tokens = set(norm(title).split())
    stem_tokens = set(norm(re.sub(r"\.pdf$", "", file_name or "")).split())
    stem_text = re.sub(r"\.pdf$", "", file_name or "", flags=re.IGNORECASE)
    # "New Document f.pdf" is a nameless scanner output; the trailing "f" is a
    # scan counter, not série F.
    if _GENERIC_STEM.match(stem_text.strip()):
        stem_tokens = set()
        stem_text = ""
    if stem_tokens and title_tokens and stem_tokens <= title_tokens:
        blob = title
    elif title_tokens and stem_tokens and title_tokens <= stem_tokens:
        # Keep the extension out: ".pdf" makes a final "D" look like an
        # author initial ("... TERMINALE D.PDF").
        blob = stem_text
    else:
        blob = f"{title} {stem_text}"
    classes = detect_classes(blob, hint=hint)
    subjects = detect_subjects(blob)
    exam_type = detect_exam_type(blob)
    year = detect_year(blob)
    session = detect_session(blob)
    kind, extra = detect_kind(title, file_name)
    return {
        "classes": classes,
        "subjects": subjects,
        "exam_type": exam_type if kind == "paper" else extra,
        "year": year,
        "session": session,
        "kind": kind,
        "category": extra,
        "non_exam": is_non_exam_document(blob),
    }
