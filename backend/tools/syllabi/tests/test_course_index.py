"""Course grouping tests.

The point of the course layer is that a course code is NOT an identity. Every
filename below is a real one from backend/data/syllabi.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from course_index import build_courses, build_title_review
from filename_parser import parse_filename


def courses_for(*names: str):
    return build_courses([parse_filename(n).to_dict() for n in names])


# --- the five assertions the brief names ------------------------------------

MGTA_495 = [
    "MGTA 495 Special Topics - GenAI for Business (Nijs) SP26.pdf",
    "MGTA 495 Special Topics in Business Analytics - Healthcare Analytics (Kazemian) SP26.pdf",
    "MGtA 495 Special Topics in Business Analytics - Marketing Analytics (Yavorsky) SP26.pdf",
    "MGTA 495- Spc Topics in Business Analytics - AI & Prescriptive Analytics (Kazemian) WI26.pdf",
]


def test_mgta_495_four_offerings_are_four_distinct_courses():
    """The special-topics number is a registration slot, not a course."""
    courses = courses_for(*MGTA_495)
    assert len(courses) == 4
    assert len({c.key for c in courses}) == 4
    assert {c.offering_count for c in courses} == {1}
    assert sorted(c.title for c in courses) == [
        "Spc Topics in Business Analytics - AI & Prescriptive Analytics",
        "Special Topics - GenAI for Business",
        "Special Topics in Business Analytics - Healthcare Analytics",
        "Special Topics in Business Analytics - Marketing Analytics",
    ]


def test_mgt_453_two_same_term_offerings_are_two_distinct_courses():
    """Same code, same term, two unrelated courses."""
    courses = courses_for(
        "MGT 453 Brand Management (Yorkston) SU26.pdf",
        "MGT 453 Supply Chain Management (Kim) SU26.pdf",
    )
    assert len(courses) == 2
    assert sorted(c.title for c in courses) == ["Brand Management", "Supply Chain Management"]
    assert all(c.codes == ["MGT 453"] for c in courses)


def test_mgta_464_two_offerings_are_one_course():
    """Same course, two terms, two instructors."""
    courses = courses_for(
        "MGTA 464 SQL and ETL (August) SU26.pdf",
        "MGTA 464 SQL and ETL (Perols) SU25 - FW.pdf",
    )
    assert len(courses) == 1
    course = courses[0]
    assert course.offering_count == 2
    assert course.title == "SQL and ETL"
    assert course.codes == ["MGTA 464"]
    assert course.instructors == ["August", "Perols"]
    assert course.terms == ["SU25", "SU26"]
    assert course.latest_offering == "MGTA 464 SQL and ETL (August) SU26.pdf"


def test_403_and_403r_group_as_one_course():
    """R is a section variant. It is recorded, and it does not split the course."""
    courses = courses_for(
        "MGT 403 Business Analytics for Managers (Erat) FA25.pdf",
        "MGT 403 Business Analytics for Managers (Montgomery) FA25.pdf",
        "MGT 403R Business Analytics for Managers (Zhang) FA26.pdf",
    )
    assert len(courses) == 1
    course = courses[0]
    assert course.offering_count == 3
    assert course.codes == ["MGT 403", "MGT 403R"]
    assert course.instructors == ["Erat", "Montgomery", "Zhang"]


def test_w26_normalises_to_wi26():
    course = courses_for("MGTF 495 Special Topics - Digital Finance (Vallod) W26.pdf")[0]
    assert course.terms == ["WI26"]


# --- grouping behaviour the five do not cover -------------------------------


def test_latest_offering_is_by_term_not_by_filename():
    """FA25 is later than SP25 and SU25, though it sorts first alphabetically."""
    course = courses_for(
        "MGT 400 Widgets (Zhang) SP25.pdf",
        "MGT 400 Widgets (Adams) FA25.pdf",
        "MGT 400 Widgets (Brown) SU25.pdf",
    )[0]
    assert course.terms == ["SP25", "SU25", "FA25"]
    assert course.latest_offering == "MGT 400 Widgets (Adams) FA25.pdf"
    assert course.title == "Widgets"


def test_multi_code_course_records_every_code_it_appeared_under():
    course = courses_for(
        "MGTF 408 Real Estate Finance (Avenancio-Leon) SP25.pdf",
        "MGT 486R Real Estate Finance (Avenancio-León) SP26.pdf",
    )
    # Different base codes, so these are two courses under the stated key --
    # the renumbering shows up on the review list, not as a silent merge.
    assert len(course) == 2


def test_display_titles_survive_grouping_verbatim():
    """Normalisation is for the key. The typo still shows in the output."""
    course = courses_for("MGTA 463R Fruad Analytics (Coggeshall) SP26.pdf")[0]
    assert course.title == "Fruad Analytics"


# --- the review list --------------------------------------------------------


def test_typo_pair_is_flagged_for_review_and_not_merged():
    """MGTA 459's two spellings stay two courses AND appear on the review list."""
    courses = courses_for(
        "MGTA 459 Managerial Judg-Decis Making (Rottenstreich) FA26.pdf",
        "MGTA 459 Mangerial Judg Decis Making (Schurr) FA25.pdf",
    )
    assert len(courses) == 2

    review = build_title_review(courses)
    assert len(review) == 1
    assert review[0].reason == "same_code_different_title"
    assert review[0].similarity > 0.9


def test_renumbered_course_is_flagged_as_same_title_different_code():
    courses = courses_for(
        "MGTF 410 New Venture Finance (Townsend) WI26.pdf",
        "MGT 493R New Venture Finance (Townsend) FA26.pdf",
    )
    review = build_title_review(courses)
    assert [p.reason for p in review] == ["same_title_different_code"]
    assert review[0].similarity == 1.0


def test_genuinely_different_courses_sharing_a_code_are_still_listed():
    """Listing is not merging. MGT 449's topics are different courses."""
    courses = courses_for(
        "MGT 449 Topics in Ops & Tech - Supply Chain Finance (Gopal) SU25.pdf",
        "MGT 449 Topics in Ops & Tech - Global Chains - New Approaches (Gopal) SU25.pdf",
    )
    assert len(courses) == 2
    assert [p.reason for p in build_title_review(courses)] == ["same_code_different_title"]


def test_unrelated_courses_are_not_on_the_review_list():
    courses = courses_for(
        "MGTA 464 SQL and ETL (August) SU26.pdf",
        "MGT 420 Negotiation (Gneezy) FA26.pdf",
    )
    assert build_title_review(courses) == []


@pytest.mark.parametrize(
    ("left", "right"),
    [
        (
            "MGTF 423 Data Science for Finance I (Gupta) WI26.pdf",
            "MGTF 424 Data Science for Finance - M (Vural) SP26.pdf",
        ),
    ],
)
def test_near_miss_titles_are_reviewed_never_merged(left, right):
    """These score 0.96 and are two real courses. Nothing merges them."""
    courses = courses_for(left, right)
    assert len(courses) == 2
    assert [p.reason for p in build_title_review(courses)] == ["near_identical_title"]
