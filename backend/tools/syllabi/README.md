# Syllabus conversion

Turns `backend/data/syllabi/` (139 Rady syllabus PDFs + 2 course-description
DOCX catalogs) into machine-readable markdown, and turns the *filenames* into
structured offering records.

The PDFs are the source of truth and stay committed. Everything under
`backend/data/syllabi_md/` is derived and gets rebuilt whenever a new quarter's
syllabi arrive.

## Run it

```sh
uv venv backend/.venv
VIRTUAL_ENV=backend/.venv uv pip install -r backend/tools/syllabi/requirements.txt
backend/.venv/bin/python backend/tools/syllabi/convert.py
backend/.venv/bin/python -m pytest backend/tools/syllabi/tests -q
```

| Flag | Effect |
| --- | --- |
| `--source`, `--out` | override locations; resolved against `--repo-root` |
| `--ocr` | OCR every page with Tesseract (off by default — see below) |
| `--report-only` | rebuild `report.md` from an existing `index.json`, no reconversion |

No path is hard-coded absolute, and every path written into `index.json` is
repo-relative, because that file gets read on other machines.

`--ocr` needs the `tesseract` binary on PATH (`brew install tesseract`).
Nothing else does.

## Output

| Path | What |
| --- | --- |
| `backend/data/syllabi_md/**/*.md` | one markdown file per source, folder structure mirrored |
| `backend/data/syllabi_md/index.json` | one record per source file |
| `backend/data/syllabi_md/report.md` | the same report the script prints |

## An offering is not a course, and a code is not an identity

`index.json` has two levels.

An **offering** is one file: `MGTA 464 SQL and ETL` appears twice — August in
SU26, Perols in SU25 — and both are rows.

A **course** groups offerings on `course_key`, which is the normalised base
code **and** the normalised title, never the code alone. The reason is
institutional: a new course is registered under a 495-style special topics
number until it is formally approved, then it gets its own number. So the code
carries registration status and the title carries the identity.

In this corpus that means `MGTA 495` is four different courses (GenAI for
Business, Healthcare Analytics, Marketing Analytics, AI & Prescriptive
Analytics) and `MGT 453` is two in a single term. 139 offerings → 120 courses,
against 114 distinct codes.

Each course record carries the key, a canonical display title (from the most
recent offering), every code it has appeared under, every term, every
instructor, and the most recent offering by term.

### Normalisation is for keys only, never display

Case folded, `&` spelled out, all other punctuation flattened to spaces,
whitespace collapsed. That makes `Topics in Ops & Tech` and `Topics in Ops and
Tech` agree, and absorbs the stray `)` in `...(SD Immersion))`.

It does **not** absorb spelling. `Mangerial` and `Managerial` stay different
keys. Display titles are always verbatim from the filename.

### The title review list

Two spellings can be one course (`Mangerial Judg Decis Making` vs `Managerial
Judg-Decis Making`, MGTA 459) or two courses (`Data Science for Finance I` vs
`... for Finance M`, MGTF 423/424, similarity 0.96). No threshold separates
those, so nothing is merged automatically. Grouping is on exact normalised
titles, and pairs that look related are listed in `report.md` and
`index.json → title_review` for a human to confirm. Three reasons:

| Reason | Meaning |
| --- | --- |
| `same_code_different_title` | one code, two titles — a rename, a typo, or genuinely different 495 topics. Listed at any similarity, since a rename scores near zero |
| `same_title_different_code` | identical title, two codes — the renumbering case |
| `near_identical_title` | different codes, titles close but not equal |

**Nothing on that list has been merged.**

## What the filename parser trusts

Two anchors, in this order:

1. The trailing term code — `FA`, `WI`, `SP`, `SU` plus a two-digit year. The
   season must be in that set; anything else is a parse failure rather than a
   value that gets passed through. One file says `W26`, which normalises to
   `WI26` with `term_raw` keeping the source form. Terms carry a sortable
   `term_sort` (`FA25` → `2025-4`) because the display form sorts wrong.
2. The last `(...)` group before it, which is the instructor when present.

Everything else is derived by subtraction. Position is never trusted, because
titles carry dashes, ampersands, commas, underscores, double spaces, a stray
`)`, and a parenthesised aside of their own (`MGT 459 ... (SD Immersion))
(Gneezy) SP26` — the instructor is the *last* group, not the first).

Deliberate non-behaviours:

- **Source typos are preserved.** "Fruad Analytics", "Unsructured", "Finnacial",
  "Resaerch", "Audiitng", "Techology". The course code is the reliable key; the
  title is not, and a silent "fix" would break the match against whatever the
  registrar publishes.
- **Department comes from the code, never the folder.** `MGT 491 Investments`
  sits in the `MGTF/` folder. The code wins.
- **An `R` suffix is a section variant, not a different course.** `MGT 403` and
  `MGT 403R` group as one course; the variant is recorded on the offering.
- **Trailing qualifiers get their own field.** `FT`, `PT`, `Exec`, `FW`, `AM`,
  `8am`, `fully remote`. They are not part of the term and not dropped.
- **Failures are listed, not swallowed.** A filename missing an anchor lands in
  the report's unparsed list. Course-description catalogs are exempt: they are
  not offerings, so they are converted but never parsed.

## Extraction: pymupdf4llm

Chosen over the alternatives because syllabi are full of two-column schedules
and grading tables:

- **pymupdf4llm** (picked) — emits markdown directly, reconstructs headings and
  pipe tables, and orders multi-column pages by column rather than by raw block
  order. Fastest of the three.
- **pdfplumber** — better raw table geometry, but no markdown layer, and it
  inherits pdfminer's reading order, which interleaves columns.
- **pypdf** — fine for plain prose, no table or column handling at all.

Two caveats worth knowing:

- **Licence.** PyMuPDF is AGPL-3.0. Fine for an offline conversion step whose
  output is what ships. Read it before this runs inside a served product.
- **OCR is off by default.** `pymupdf-layout` (a hard dependency of
  pymupdf4llm) shells out to Tesseract on *every* page when enabled, text layer
  or not. All 139 PDFs in this corpus have full text layers, so on the first
  run OCR contributed exactly one thing: a mangled transcription of the Rady
  logo (`Ray| schoolof m`) wrapped in picture-text comments, in 119 of 141
  files. Tables came out byte-identical without it, and the run took half as
  long. The report counts pages with no text layer using plain PyMuPDF — that
  is the honest signal, and the trigger for rerunning with `--ocr`.

  It also prints progress to file descriptor 1 from the C layer.
  `contextlib.redirect_stdout` does not catch that, so `convert.py` redirects
  the fd itself; without it the chatter lands in the middle of the report, and
  a `| head` on the command line turns into 129 spurious BrokenPipeError
  "conversion failures".
