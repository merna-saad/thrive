"""Group offerings into courses, and flag the groupings a human should check.

An OFFERING is one file. A COURSE is the thing offerings are offerings *of*,
keyed on normalised base code **and** normalised title together -- never code
alone, because `MGTA 495` holds four different courses and `MGT 453` holds two
in a single term.

The hard part is not grouping, it is knowing when two spellings are the same
course. This module does not guess. It groups on exact normalised titles and
emits a review list of pairs that look related, for a human to confirm. A
wrong automatic merge is worse than a manual review: the corpus contains both
"Mangerial Judg Decis Making" / "Managerial Judg-Decis Making" (one course,
one typo) and "Data Science for Finance I" / "Data Science for Finance M" (two
courses), and no similarity threshold separates those two cases.

Nothing on the review list is merged.
"""

from __future__ import annotations

import difflib
from collections import defaultdict
from dataclasses import asdict, dataclass, field

# Cross-code title pairs at or above this similarity are worth a look. Used to
# NOMINATE review candidates only -- never to merge. Pairs sharing a base code
# are always listed regardless of score, because "Management Comms" vs "Data
# Driven Communications" is a rename that scores near zero.
NEAR_TITLE_RATIO = 0.85


@dataclass
class Course:
    """One course: the grouping an offering belongs to."""

    key: str
    title: str
    codes: list[str] = field(default_factory=list)
    terms: list[str] = field(default_factory=list)
    instructors: list[str] = field(default_factory=list)
    offering_count: int = 0
    latest_offering: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class TitleReviewPair:
    """Two course keys that may be the same course. Never merged automatically."""

    reason: str
    similarity: float
    left_key: str
    left_title: str
    left_codes: list[str]
    left_terms: list[str]
    right_key: str
    right_title: str
    right_codes: list[str]
    right_terms: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


def _offering_sort_key(record: dict) -> tuple[str, str]:
    """Newest term wins; filename breaks ties so the result is deterministic.

    Ties are real: MGT 403 was taught by both Erat and Montgomery in FA25.
    """
    return (record.get("term_sort") or "", record.get("filename") or "")


def _ordered_unique(values) -> list[str]:
    """Distinct values, first-seen order preserved, empties dropped."""
    seen = {}
    for value in values:
        if value:
            seen.setdefault(value, None)
    return list(seen)


def build_courses(offerings: list[dict]) -> list[Course]:
    """Group offering records into courses on their `course_key`.

    The canonical display title comes from the most recent offering, on the
    grounds that the newest spelling is the current one. Offerings whose
    normalised titles agree can still differ in display ("Topics in Org" vs
    "Topics in org"), and something has to pick.
    """
    grouped: dict[str, list[dict]] = defaultdict(list)
    for offering in offerings:
        grouped[offering["course_key"]].append(offering)

    courses = []
    for key, records in grouped.items():
        ordered = sorted(records, key=_offering_sort_key)
        latest = ordered[-1]
        courses.append(
            Course(
                key=key,
                title=latest["title"],
                codes=sorted(_ordered_unique(r["course_code"] for r in ordered)),
                # Distinct terms, chronological. MGT 403 ran twice in FA25
                # under two instructors; that is one term, two offerings.
                terms=_ordered_unique(r["term"] for r in ordered),
                instructors=sorted(_ordered_unique(r["instructor"] for r in ordered)),
                offering_count=len(ordered),
                latest_offering=latest["filename"],
            )
        )
    return sorted(courses, key=lambda c: c.key)


def _normalised_title_of(key: str) -> str:
    """The key is "<normalised code>|<normalised title>"."""
    return key.split("|", 1)[1]


def _base_code_of(key: str) -> str:
    return key.split("|", 1)[0]


def build_title_review(courses: list[Course]) -> list[TitleReviewPair]:
    """Course pairs a human should confirm or reject by hand.

    Three reasons, all of them observed in this corpus:

    - `same_code_different_title` -- one code, two titles. Either a rename
      (MGT 402 "Management Comms" -> "Data Driven Communications") or a typo
      (MGTA 459), or genuinely different special-topics courses under a 495
      number. Listed regardless of similarity, since a rename can score near
      zero.
    - `same_title_different_code` -- identical title, two codes. The
      renumbering case: a 495 course that graduated to its own number, or a
      course that moved department.
    - `near_identical_title` -- different codes, titles close but not equal.
      Catches typos that also crossed a code boundary.
    """
    pairs: dict[tuple[str, str], TitleReviewPair] = {}

    def add(reason: str, ratio: float, left: Course, right: Course) -> None:
        left, right = sorted((left, right), key=lambda c: c.key)
        slot = (left.key, right.key)
        if slot in pairs:
            return
        pairs[slot] = TitleReviewPair(
            reason=reason,
            similarity=round(ratio, 3),
            left_key=left.key,
            left_title=left.title,
            left_codes=left.codes,
            left_terms=left.terms,
            right_key=right.key,
            right_title=right.title,
            right_codes=right.codes,
            right_terms=right.terms,
        )

    ordered = sorted(courses, key=lambda c: c.key)

    for i, left in enumerate(ordered):
        left_title = _normalised_title_of(left.key)
        left_code = _base_code_of(left.key)
        for right in ordered[i + 1 :]:
            right_title = _normalised_title_of(right.key)
            right_code = _base_code_of(right.key)
            ratio = difflib.SequenceMatcher(None, left_title, right_title).ratio()

            if left_code == right_code:
                add("same_code_different_title", ratio, left, right)
            elif left_title == right_title:
                add("same_title_different_code", 1.0, left, right)
            elif ratio >= NEAR_TITLE_RATIO:
                add("near_identical_title", ratio, left, right)

    return sorted(pairs.values(), key=lambda p: (p.reason, -p.similarity, p.left_key))
