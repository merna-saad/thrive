"""Parser tests. Every filename here is a real one from backend/data/syllabi.

Nothing asserts "it returned without error". Each case pins the fields.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from filename_parser import ParseError, normalise_title, parse_filename

# (filename, department, number, title, instructor, term, qualifier)
CASES = [
    # The plain shape everything else deviates from.
    (
        "MGTA 464 SQL and ETL (August) SU26.pdf",
        "MGTA",
        "464",
        "SQL and ETL",
        "August",
        "SU26",
        None,
    ),
    # Same course, different term and instructor, plus a trailing qualifier.
    # This pair is why a file is an offering and not a course.
    (
        "MGTA 464 SQL and ETL (Perols) SU25 - FW.pdf",
        "MGTA",
        "464",
        "SQL and ETL",
        "Perols",
        "SU25",
        "FW",
    ),
    # Dash and ampersand inside the title; two instructors.
    (
        "MGT 449 Topics in Operations & Techology - GenAI for Business (Nijs & Teixeira) SP26.pdf",
        "MGT",
        "449",
        "Topics in Operations & Techology - GenAI for Business",
        "Nijs & Teixeira",
        "SP26",
        None,
    ),
    # No instructor at all: a bare dash stands where the parentheses would be.
    (
        "MGTA 454 Business Analytics Capstone - SP26.pdf",
        "MGTA",
        "454",
        "Business Analytics Capstone",
        None,
        "SP26",
        None,
    ),
    # Dash inside the title AND a trailing qualifier after the term.
    (
        "MGT 406 Leadership Skills -Tech Firms (Oveis) FA25 - FT.pdf",
        "MGT",
        "406",
        "Leadership Skills -Tech Firms",
        "Oveis",
        "FA25",
        "FT",
    ),
    # Same course code, same instructor, three terms and three qualifiers.
    (
        "MGT 406 Leading People (Oveis) FA25 - Exec.pdf",
        "MGT",
        "406",
        "Leading People",
        "Oveis",
        "FA25",
        "Exec",
    ),
    (
        "MGT 406 Leading People (Oveis) SU25 - PT.pdf",
        "MGT",
        "406",
        "Leading People",
        "Oveis",
        "SU25",
        "PT",
    ),
    # Qualifier in parentheses, after the term rather than before it.
    (
        "MGT 451R AI and Tech Strategy (Zhu) FA26 (fully remote).pdf",
        "MGT",
        "451R",
        "AI and Tech Strategy",
        "Zhu",
        "FA26",
        "fully remote",
    ),
    # Trailing letter on the course number.
    (
        "MGT 403R Business Analytics for Managers (Zhang) FA26.pdf",
        "MGT",
        "403R",
        "Business Analytics for Managers",
        "Zhang",
        "FA26",
        None,
    ),
    # A dash sits between the instructor and the term, not before the title.
    (
        "MGT 482 Brand Management (Yorkston) - SU26.pdf",
        "MGT",
        "482",
        "Brand Management",
        "Yorkston",
        "SU26",
        None,
    ),
    # Dash glued to the course number.
    (
        "MGTA 495- Spc Topics in Business Analytics - AI & Prescriptive Analytics (Kazemian) WI26.pdf",
        "MGTA",
        "495",
        "Spc Topics in Business Analytics - AI & Prescriptive Analytics",
        "Kazemian",
        "WI26",
        None,
    ),
    # Mixed-case department in the source. The code is the key, so it is
    # normalised; nothing else about the name is.
    (
        "MGtA 495 Special Topics in Business Analytics - Marketing Analytics (Yavorsky) SP26.pdf",
        "MGTA",
        "495",
        "Special Topics in Business Analytics - Marketing Analytics",
        "Yavorsky",
        "SP26",
        None,
    ),
    # A parenthesised group inside the title, an unbalanced ")" the source
    # actually contains, and the instructor in the LAST group. Position would
    # get this wrong; the anchor does not. The stray ")" is left in place --
    # it is what the filename says.
    (
        (
            "MGT 459 Topics in International Business - Bringing Product to US Market "
            "(SD Immersion)) (Gneezy) SP26.pdf"
        ),
        "MGT",
        "459",
        "Topics in International Business - Bringing Product to US Market (SD Immersion))",
        "Gneezy",
        "SP26",
        None,
    ),
    # Comma inside the instructor group, used to disambiguate two Meyers.
    (
        "MGT 439 Topics-Org Behavior - Leadership in Practice - Coaching & Inclusion (Meyer, A) SU26.pdf",
        "MGT",
        "439",
        "Topics-Org Behavior - Leadership in Practice - Coaching & Inclusion",
        "Meyer, A",
        "SU26",
        None,
    ),
    # Three instructors, comma-separated.
    (
        "MGTF 490 Capstone Applied Finance Project (Melvin, Girand, Padernacht) FA26.pdf",
        "MGTF",
        "490",
        "Capstone Applied Finance Project",
        "Melvin, Girand, Padernacht",
        "FA26",
        None,
    ),
    # Hyphenated instructor names, one with a non-ASCII character.
    (
        "MGT 486R Real Estate Finance (Avenancio-León) SP26.pdf",
        "MGT",
        "486R",
        "Real Estate Finance",
        "Avenancio-León",
        "SP26",
        None,
    ),
    (
        "MGTA 451 Business Analytics in Marketing, Finance, and Ops (Buti-Shahsavand-Wilbur) SU26.pdf",
        "MGTA",
        "451",
        "Business Analytics in Marketing, Finance, and Ops",
        "Buti-Shahsavand-Wilbur",
        "SU26",
        None,
    ),
    # "W26" instead of "WI26". Unlike a title typo, a term is a controlled
    # value that has to sort and group, so this one IS normalised. The raw
    # form is kept alongside -- see test_w26_normalises_but_keeps_the_source.
    (
        "MGTF 495 Special Topics - Digital Finance (Vallod) W26.pdf",
        "MGTF",
        "495",
        "Special Topics - Digital Finance",
        "Vallod",
        "WI26",
        None,
    ),
    # Qualifiers that are neither programme codes nor modes.
    (
        "MGTF 403 Advanced Risk Management (Valkanov) WI26 - 8am.pdf",
        "MGTF",
        "403",
        "Advanced Risk Management",
        "Valkanov",
        "WI26",
        "8am",
    ),
    (
        "MGTF 404 Fin Econometric-Empirical Mthd (Valkanov) FA25 - AM.pdf",
        "MGTF",
        "404",
        "Fin Econometric-Empirical Mthd",
        "Valkanov",
        "FA25",
        "AM",
    ),
    # Underscore where a colon was meant.
    (
        "MGT 489 Topics in Marketing_ Brand Management (Yorkston) SU25.pdf",
        "MGT",
        "489",
        "Topics in Marketing_ Brand Management",
        "Yorkston",
        "SU25",
        None,
    ),
    # Double space after the course number, and again inside the title.
    (
        "MGT 412  New Venture Design (Meyer) FA26.pdf",
        "MGT",
        "412",
        "New Venture Design",
        "Meyer",
        "FA26",
        None,
    ),
    (
        "MGTP 443 Global Tax  Business Strategy (Jewett) WI26.pdf",
        "MGTP",
        "443",
        "Global Tax Business Strategy",
        "Jewett",
        "WI26",
        None,
    ),
]

# Source typos that must survive the parser untouched. The course code is the
# reliable key; the title is not, and silently "fixing" it would break the
# match against whatever the registrar actually publishes.
TYPO_CASES = [
    ("MGTA 463R Fruad Analytics (Coggeshall) SP26.pdf", "Fruad Analytics"),
    ("MGTA 415 Analyzing Unsructured Data (Wu) SU25.pdf", "Analyzing Unsructured Data"),
    ("MGTP 434 Finnacial Statement Analysis (Perez Cavazos) WI26.pdf", "Finnacial Statement Analysis"),
    (
        "MGTP 425 Professional Resaerch for Accountants (Jeter) FA26.pdf",
        "Professional Resaerch for Accountants",
    ),
    ("MGTP 432 Adv. Audiitng & Forensic Acct (Brooks) FA26.pdf", "Adv. Audiitng & Forensic Acct"),
    (
        "MGTA 459 Mangerial Judg Decis Making (Schurr) FA25.pdf",
        "Mangerial Judg Decis Making",
    ),
]


@pytest.mark.parametrize(
    ("name", "department", "number", "title", "instructor", "term", "qualifier"),
    CASES,
    ids=[c[0] for c in CASES],
)
def test_parses_real_filenames(name, department, number, title, instructor, term, qualifier):
    offering = parse_filename(name)
    assert offering.department == department
    assert offering.course_number == number
    assert offering.course_code == f"{department} {number}"
    assert offering.title == title
    assert offering.instructor == instructor
    assert offering.term == term
    assert offering.qualifier == qualifier


@pytest.mark.parametrize(("name", "title"), TYPO_CASES, ids=[c[0] for c in TYPO_CASES])
def test_source_typos_are_preserved(name, title):
    assert parse_filename(name).title == title


def test_department_comes_from_the_code_not_the_folder():
    """MGT 491 Investments sits in the MGTF folder. The code wins."""
    offering = parse_filename(Path("MGTF/MGT 491 Investments (Girand) SP26.pdf").name)
    assert offering.department == "MGT"
    assert offering.course_code == "MGT 491"


def test_same_code_different_terms_are_distinct_offerings():
    august = parse_filename("MGTA 464 SQL and ETL (August) SU26.pdf")
    perols = parse_filename("MGTA 464 SQL and ETL (Perols) SU25 - FW.pdf")
    assert august.course_code == perols.course_code == "MGTA 464"
    assert august != perols
    assert (august.term, august.instructor) == ("SU26", "August")
    assert (perols.term, perols.instructor) == ("SU25", "Perols")


def test_extension_is_optional():
    """Everything but the recorded filename itself parses identically."""
    bare = parse_filename("MGTA 464 SQL and ETL (August) SU26").to_dict()
    with_ext = parse_filename("MGTA 464 SQL and ETL (August) SU26.pdf").to_dict()
    assert bare.pop("filename") == "MGTA 464 SQL and ETL (August) SU26"
    assert with_ext.pop("filename") == "MGTA 464 SQL and ETL (August) SU26.pdf"
    assert bare == with_ext


@pytest.mark.parametrize(
    "name",
    [
        "Fall 2026 Rady Graduate Course Descriptions.docx",
        "Summer 2026 Rady Graduate Course Descriptions.docx",
    ],
)
def test_course_description_catalogs_are_not_offerings(name):
    with pytest.raises(ParseError):
        parse_filename(name)


def test_w26_normalises_but_keeps_the_source():
    """One file says W26. It means WI26, and both forms are recorded."""
    offering = parse_filename("MGTF 495 Special Topics - Digital Finance (Vallod) W26.pdf")
    assert offering.term == "WI26"
    assert offering.term_raw == "W26"
    assert offering.term_sort == "2026-1"


def test_terms_sort_chronologically_not_alphabetically():
    """FA25 precedes WI26; sorting the display form would reverse them."""
    names = [
        "MGT 400 X (A) SU25.pdf",
        "MGT 400 X (A) FA25.pdf",
        "MGT 400 X (A) WI26.pdf",
        "MGT 400 X (A) SP26.pdf",
        "MGT 400 X (A) SP25.pdf",
        "MGT 400 X (A) FA26.pdf",
    ]
    offerings = sorted((parse_filename(n) for n in names), key=lambda o: o.term_sort)
    assert [o.term for o in offerings] == ["SP25", "SU25", "FA25", "WI26", "SP26", "FA26"]


@pytest.mark.parametrize("season", ["AU", "XX", "FL", "WN"])
def test_unknown_seasons_are_rejected_not_passed_through(season):
    with pytest.raises(ParseError):
        parse_filename(f"MGTA 464 SQL and ETL (August) {season}26.pdf")


@pytest.mark.parametrize(
    ("name", "base_code", "display_code", "variant"),
    [
        ("MGT 403 Business Analytics for Managers (Erat) FA25.pdf", "MGT 403", "MGT 403", None),
        ("MGT 403R Business Analytics for Managers (Zhang) FA26.pdf", "MGT 403", "MGT 403R", "R"),
        ("MGT 455R Customer Analytics and (Generative) AI (Nijs) SP26.pdf", "MGT 455", "MGT 455R", "R"),
    ],
)
def test_r_suffix_is_a_section_variant_not_a_different_course(name, base_code, display_code, variant):
    offering = parse_filename(name)
    assert offering.base_course_code == base_code
    assert offering.course_code == display_code
    assert offering.section_variant == variant


@pytest.mark.parametrize(
    ("left", "right"),
    [
        # Ampersand vs the spelled-out word.
        ("Topics in Ops & Tech", "Topics in Ops and Tech"),
        # Case, and the underscore the source uses for a colon.
        ("Topics in Marketing_ Brand Management", "topics in marketing brand management"),
        # The stray close-paren the source actually contains.
        ("Bringing Product to US Market (SD Immersion))", "Bringing Product to US Market SD Immersion"),
        # Double spaces and a trailing dash.
        ("New  Venture   Design", "new venture design"),
    ],
)
def test_title_normalisation_absorbs_punctuation_but_not_spelling(left, right):
    assert normalise_title(left) == normalise_title(right)


def test_title_normalisation_preserves_spelling_differences():
    """The MGTA 459 typo pair must NOT collapse. It goes to manual review."""
    assert normalise_title("Mangerial Judg Decis Making") != normalise_title(
        "Managerial Judg-Decis Making"
    )


def test_course_key_is_code_and_title_never_code_alone():
    genai = parse_filename("MGTA 495 Special Topics - GenAI for Business (Nijs) SP26.pdf")
    health = parse_filename(
        "MGTA 495 Special Topics in Business Analytics - Healthcare Analytics (Kazemian) SP26.pdf"
    )
    assert genai.base_course_code == health.base_course_code == "MGTA 495"
    assert genai.course_key != health.course_key


@pytest.mark.parametrize(
    ("name", "reason"),
    [
        ("MGTA 464 SQL and ETL (August).pdf", "no term code found"),
        ("SQL and ETL (August) SU26.pdf", "no department/course-number prefix found"),
        ("MGTA 464 SU26.pdf", "no title between the course number and the term"),
    ],
)
def test_missing_anchors_fail_loudly(name, reason):
    with pytest.raises(ParseError, match=reason):
        parse_filename(name)
