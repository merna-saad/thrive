# Backend

Django backend, not started. **There is no Python in this repo** — `backend/`
holds the retrieval corpus and nothing else.

## What is here

`data/corpus/` — 234 markdown documents, exported from the upstream project and
committed on purpose. See its README: the corpus is sound, and **nothing in this
repo reads it yet**. That README used to describe an `ingest_corpus` command and
a `Document` model in the present tense; it was corrected on 2026-09-01 to say
which parts are upstream-only.

## What has to exist before a chat pipeline can

Asked for on 2026-09-01 and stopped on, because step 3a (`retrieve_corpus`) had
nothing to call. In order:

1. A Python toolchain and a Django project. There is no app to add one to.
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
