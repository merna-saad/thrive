"""Parse Rady syllabus filenames into offering records.

A file is an OFFERING, not a course. `MGTA 464 SQL and ETL` appears twice --
August in SU26, Perols in SU25 -- and both are rows. Nothing here deduplicates.

**The course code is not the identity.** A new course is registered under a
495-style special topics number until it is formally approved, at which point
it gets its own number. So the code carries registration status and the TITLE
carries the identity. `MGTA 495` holds four genuinely different courses;
`MGT 453` holds two, in the same term. Grouping lives in `course_index.py`;
this module supplies the normalised parts it keys on.

The filenames are human-typed and inconsistent. Two things in them are
reliable, and the parser anchors on exactly those two:

  1. The trailing term code (FA25, WI26, SP26, SU26).
  2. The last parenthesised group before it, when present, is the instructor.

Everything else is positional guesswork. Titles carry dashes, ampersands,
commas, underscores, stray close-parens, double spaces, and typos that are in
the source and stay in the output ("Fruad Analytics", "Techology",
"Audiitng").

No I/O in this module, so the awkward cases are testable as strings.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

# Seasons Rady actually uses. Anything outside this set is rejected rather
# than passed through -- an unrecognised term is a parse failure, not a value.
# Ordered for chronology within an academic year: WI26 < SP26 < SU26 < FA26.
SEASONS = {"WI": 1, "SP": 2, "SU": 3, "FA": 4}

# Source typos in the term itself. One file says "W26" where it means WI26.
# Normalised, unlike title typos: a term is a controlled value that has to
# sort and group, whereas a title is free text the registrar owns.
SEASON_TYPOS = {"W": "WI"}

# Longest first so "WI" wins over "W"; alphabetical after, so the pattern is
# byte-identical between runs.
_SEASON_ALTERNATION = "|".join(sorted(set(SEASONS) | set(SEASON_TYPOS), key=lambda s: (-len(s), s)))
TERM_RE = re.compile(rf"\b(?P<season>{_SEASON_ALTERNATION})\s?(?P<year>\d{{2}})\b")

# "MGTA 464", "MGT 403R", "MGTA 495-", "MGtA 495". Case is normalised on the
# code only, because the code is part of the grouping key.
CODE_RE = re.compile(r"^\s*(?P<dept>[A-Za-z]{3,4})\s*(?P<number>\d{3})(?P<variant>[A-Za-z]?)")

# The last "(...)" group at the end of the head, tolerating a trailing dash:
# "... (Yorkston) - " in "MGT 482 Brand Management (Yorkston) - SU26".
INSTRUCTOR_RE = re.compile(r"\(([^()]*)\)\s*[-–—:]?\s*$")

# Leading/trailing separator junk left behind once the anchors are removed.
LEAD_SEP_RE = re.compile(r"^[\s\-–—:_]+")
TRAIL_SEP_RE = re.compile(r"[\s\-–—:]+$")
WHITESPACE_RE = re.compile(r"\s+")
NON_ALNUM_RE = re.compile(r"[^a-z0-9 ]+")


@dataclass(frozen=True)
class Offering:
    """One syllabus file, parsed.

    Display fields are verbatim from the filename. The normalised fields
    (`base_course_code`, `course_key`, `term`, `term_sort`) exist so offerings
    can be grouped and ordered; they are never shown in place of the source.
    """

    filename: str
    department: str
    course_number: str
    course_code: str
    base_course_number: str
    base_course_code: str
    section_variant: str | None
    course_key: str
    title: str
    instructor: str | None
    term: str
    term_raw: str
    term_sort: str
    qualifier: str | None

    def to_dict(self) -> dict[str, str | None]:
        return asdict(self)


class ParseError(ValueError):
    """Raised when a filename does not carry the anchors an offering needs."""


def _tidy(text: str) -> str:
    """Collapse whitespace runs and drop separator junk at either end.

    Whitespace collapsing is normalisation, not correction: "MGT 412  New
    Venture Design" has a double space, and no information lives in it.
    Spelling is left alone.
    """
    text = WHITESPACE_RE.sub(" ", text)
    text = LEAD_SEP_RE.sub("", text)
    return TRAIL_SEP_RE.sub("", text)


def normalise_title(title: str) -> str:
    """Reduce a title to its comparable form. **For keys only, never display.**

    Case folded, "&" spelled out so "Ops & Tech" and "Ops and Tech" agree, all
    other punctuation flattened to spaces, whitespace collapsed. That absorbs
    the dashes, underscores, and the stray ")" in "...(SD Immersion))".

    It deliberately does NOT absorb spelling. "Mangerial" and "Managerial"
    stay different, so the typo'd MGTA 459 pair produces two course keys. That
    is the point: they surface on the review list for a human, rather than
    being merged by a similarity threshold that would also merge "Data Science
    for Finance I" with "Data Science for Finance M".
    """
    text = title.casefold().replace("&", " and ")
    text = NON_ALNUM_RE.sub(" ", text)
    return WHITESPACE_RE.sub(" ", text).strip()


def normalise_code(code: str) -> str:
    """Reduce a course code to its comparable form. For keys only."""
    return WHITESPACE_RE.sub(" ", code.casefold()).strip()


def build_course_key(base_course_code: str, title: str) -> str:
    """The course identity: normalised base code AND normalised title.

    Never the code alone. `MGTA 495` is four different courses, and `MGT 453`
    is two in a single term.
    """
    return f"{normalise_code(base_course_code)}|{normalise_title(title)}"


def _parse_term(match: re.Match[str]) -> tuple[str, str, str]:
    """(display, raw, sortable) from a term match, rejecting unknown seasons."""
    raw = match.group(0).replace(" ", "")
    season = match.group("season").upper()
    year = match.group("year")

    season = SEASON_TYPOS.get(season, season)
    if season not in SEASONS:
        raise ParseError(f"unknown term season: {match.group('season')!r}")

    # Zero-padded so the string sorts chronologically: FA25 -> "2025-4",
    # WI26 -> "2026-1". Sorting the display form would put FA26 before WI26.
    return f"{season}{year}", raw, f"20{year}-{SEASONS[season]}"


def _clean_qualifier(tail: str) -> str | None:
    """Whatever trails the term code: "- FT", "- 8am", "(fully remote)"."""
    tail = _tidy(tail)
    if tail.startswith("(") and tail.endswith(")"):
        tail = _tidy(tail[1:-1])
    return tail or None


def parse_filename(name: str) -> Offering:
    """Parse one syllabus filename (with or without extension).

    Raises ParseError when the department/number prefix or the term code is
    missing, or when the term names a season outside `SEASONS`. Callers are
    expected to collect those and show them, not swallow them -- a parser that
    silently drops what it cannot read is worse than one that fails loudly.
    """
    filename = name.strip()
    stem = re.sub(r"\.(pdf|docx?)$", "", filename, flags=re.IGNORECASE)

    terms = list(TERM_RE.finditer(stem))
    if not terms:
        raise ParseError("no term code found")
    term_match = terms[-1]
    term, term_raw, term_sort = _parse_term(term_match)

    head = stem[: term_match.start()]
    qualifier = _clean_qualifier(stem[term_match.end() :])

    code_match = CODE_RE.match(head)
    if not code_match:
        raise ParseError("no department/course-number prefix found")

    department = code_match.group("dept").upper()
    base_number = code_match.group("number")
    # "R" denotes a section variant -- a repeat of the same course for another
    # cohort -- not a different course. It stays on the offering for display
    # and drops out of the grouping key.
    variant = (code_match.group("variant") or "").upper() or None
    course_number = f"{base_number}{variant or ''}"

    rest = head[code_match.end() :]
    instructor_match = INSTRUCTOR_RE.search(rest)
    if instructor_match:
        instructor = _tidy(instructor_match.group(1)) or None
        title = _tidy(rest[: instructor_match.start()])
    else:
        instructor = None
        title = _tidy(rest)

    if not title:
        raise ParseError("no title between the course number and the term")

    base_course_code = f"{department} {base_number}"
    return Offering(
        filename=filename,
        department=department,
        course_number=course_number,
        course_code=f"{department} {course_number}",
        base_course_number=base_number,
        base_course_code=base_course_code,
        section_variant=variant,
        course_key=build_course_key(base_course_code, title),
        title=title,
        instructor=instructor,
        term=term,
        term_raw=term_raw,
        term_sort=term_sort,
        qualifier=qualifier,
    )
