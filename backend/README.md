# Backend

Django backend, still not started. There is now **some** Python here, but none
of it is Django: `tools/syllabi/` is an offline corpus-preparation script that
writes files and exits. No app, no models, no migrations, no request path.

> This README said "There is no Python in this repo" until 2026-09-01, which
> stopped being true the moment `tools/syllabi/` landed. CONTEXT.md §2 and §18
> carried the same claim and were corrected in the same pass.

## What is here

`data/corpus/` — 234 markdown documents, exported from the upstream project and
committed on purpose. See its README: the corpus is sound, and **nothing in this
repo reads it yet**. That README used to describe an `ingest_corpus` command and
a `Document` model in the present tense; it was corrected on 2026-09-01 to say
which parts are upstream-only.

`data/syllabi/` — 139 Rady syllabus PDFs plus two course-description DOCX
catalogs, committed as raw source. The source of truth, reconverted whenever a
new quarter arrives.

`data/syllabi_md/` — derived: one markdown file per source, `index.json`, and
`report.md`. Rebuilt by the tool, not edited by hand.

`data/catalog/`, `data/jobs/`, `data/evals/` — six JSON files imported from the
upstream production repo on 2026-09-01. Nothing reads them yet either.

`tools/syllabi/` — the converter and filename parser that produce
`data/syllabi_md/`. **Its README is the one to read**; the short version is that
a course code is not a course identity, and the index has two levels because of
it. 70 tests, run with the venv at `backend/.venv`.

## The one thing to know before using the syllabus index

`MGTA 495` is four different courses. A new course is registered under a
495-style special topics number until it is formally approved, then it gets its
own number — so the code carries registration status and the **title** carries
the identity. Join on `course_key`, not on `course_code`.

Six titles in the corpus appear under two codes, which is the same course
renumbered. Those are listed in `report.md` under `same_title_different_code`
and are **not** merged; confirming them is a human decision that has not been
made yet.

## What has to exist before a chat pipeline can

Asked for on 2026-09-01 and stopped on, because step 3a (`retrieve_corpus`) had
nothing to call. In order:

1. A Django project. A Python toolchain now exists — `backend/.venv`, driven by
   `uv`, with `tools/syllabi/requirements.txt` — but there is still no app to
   add models to, and that venv is a script's venv, not a service's.
2. `Document` / `Chunk` models and migrations.
3. A chunker honouring the corpus's own contract: split **per heading**, carry
   the `Source:` line into `source_url`, keep the temporal stamp with each chunk.
4. Embeddings — a model, a provider, and a vector store.
5. A lexical index, since the retrieval step is specified as **hybrid**; a dense
   index alone does not satisfy it.
6. `ingest_corpus` as a management command, idempotent per filename.

Only then does a retrieval step have an interface to call.

When it arrives, the seam it plugs into is already mapped: `MIGRATION.md` §2
documents all 25 provider functions from the Next prototype with their exact
signatures and return types, and marks which of them read from module-level
in-memory stores that reset on restart.
