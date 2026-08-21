# THRIVE

THRIVE is a single calm surface for students in the UC San Diego Rady School's
MSBA program. Right now the things a student needs are spread across half a dozen
systems — the course site, the advising tool, the career centre, email, and a pile
of PDFs — so a simple question like "what do I owe this week" means visiting all of
them. THRIVE pulls that into one place: what is due, what is happening, what the
student has set themselves, and what they could sign up for.

This repo is a **rebuild**. A working Next.js prototype exists and is now frozen;
this is the SvelteKit and Django version of it. Two surfaces are finished — the
dashboard and the calendar — and the rest of the routes render a placeholder page
on purpose, so the navigation tells the truth about what is built.

**The Django side has not been started.** See "For the backend" below; the seam it
plugs into is already built and documented.

---

## Where to start

**Read `CONTEXT.md` first.** It is the snapshot: what this is, how it works, and
every decision that has been made and why. It is written so that someone arriving
cold can pick up the work without asking anyone, and it is regenerated in full each
time rather than patched, so nothing in it is half-updated.

**Then `CODEMAP.md`** when you need to find something. It is a navigation map —
entry points, what each file is for, and which files answer which questions.
Reading it costs less than opening ten files to orient yourself.

**Then `CONVENTIONS.md`, before you write any code.** It holds seven rules that
**nothing in the tooling enforces**. Each exists because breaking it produced a real
bug that was hard to see — a checkbox that ticked and silently reverted, a store
that two pages each read correctly and differently, a date that was right in one
timezone. The type checker will not catch any of them. Review is the enforcement,
which only works if you have read them.

---

## Layout

```
thrive/
├── frontend/    the SvelteKit app — everything that currently runs
├── backend/     the Django API — a README and nothing else yet
└── scripts/     repo-wide checks that belong to neither side
```

`frontend/` is the whole application today: UI, routing, and a data layer that
reads mock fixtures. `scripts/` holds three checks that need a real browser or a
real CSS parser and so cannot live in the test suite.

---

## Running it

**Node 20 or newer.** Developed on Node 24 with npm 11, but 20 is the floor the
toolchain actually needs and nothing below 24 has been tested — so if you are on
22, expect it to work and say so if it does not.

```bash
git clone git@github.com:rsm-msaad/thrive.git
cd thrive/frontend
npm install

npm run dev -- --open      # dev server on :5173
npm run build              # production build
node build/index.js        # run that build on :3000
```

The build is a plain Node process — `adapter-node`, no serverless assumptions.

If a page looks stale locally, something is usually holding the port:
`lsof -ti:3000 | xargs kill -9`.

---

## Stack

SvelteKit 2 · Svelte 5 (runes) · TypeScript 6, strict · Vite 8 · Tailwind v4 ·
Vitest 4 · `adapter-node` · npm. No component library yet — the handful of
primitives are hand-built and live in `frontend/src/lib/components/ui/`.

---

## The docs

Eleven files at the repo root. They are ordered here by what a newcomer needs
first, not alphabetically.

| File | What it answers | Who needs it |
|---|---|---|
| `CONTEXT.md` | What this is, how it works now, and every standing decision with its reasoning. **Start here.** | Everyone |
| `CODEMAP.md` | Where things are. Entry points, file map, what each module is for. | Anyone opening the code |
| `CONVENTIONS.md` | The rules nothing enforces automatically. **Read before writing code.** | Anyone writing code |
| `MIGRATION.md` | The frozen prototype, inventoried: routes, all 25 providers with signatures, date rules, components, design system, stores, tests, known defects. The spec each phase works from. | Both sides — it is the only copy |
| `HANDOFF.md` | The diary. What happened each session, what was decided, what is still open. Newest first. | Picking up mid-stream |
| `TESTING.md` | What is covered, what is not, and why some things can only be checked in a browser. | Before adding tests |
| `BUGS.md` | Defects found and fixed, plus ones deliberately recorded and not fixed, with the reason. | Before "fixing" something odd |
| `FINDINGS.md` | Reusable lessons. Patterns worth knowing again, usually learned the hard way. | Worth a skim |
| `DEPENDENCIES.md` | Every package and why it is here, including ones that were rejected. | Before adding one |
| `setup_info.md` | Environment, versions, how to run each gate, and the gotchas that cost time. | Setting up |
| `CHANGELOG.md` | Dated session summaries, newest first. | Catching up |

Only `CONTEXT.md` is regenerated in full. The rest are appended to, so their
history is intact.

---

## For the backend

Django is not started, and this is the least obvious part of the repo, so it is
worth being explicit about what is already decided.

**The frontend reaches all of its data through one provider layer**, at
`frontend/src/lib/data/`. Its public surface is `data/index.ts`, which exports
exactly three things: the domain types, **25 provider functions**, and two label
maps. Nothing in the app reaches past that — the mock fixtures underneath it are
private, and a component that needs something not on the provider surface has found
a gap to widen rather than a file to import.

Three properties make that layer a seam rather than a placeholder:

- **Every provider returns a `Promise`**, including the ones that could answer
  synchronously today. That is deliberate: when a body becomes a real HTTP call,
  **the signature does not change and no caller has to be touched.**
- **The signatures are the contract.** `MIGRATION.md` §2 lists all 25 with their
  exact arguments and return types. Django replaces the bodies; the shapes stay.
- **Dates are classified and formatted on the SERVER**, inside SvelteKit's `load`
  functions, and components receive pre-formatted strings. So **Django never has to
  format a date** — it can return plain ISO instants and the rest is handled here.
  `CONVENTIONS.md` states the rule and what to look for in a diff.

What Django is actually for, in priority order: the three mock stores currently
live at module scope in the Node process, which means concurrent users would see
each other's data and everything resets on restart. That is fine for one developer
and is the blocking item before any multi-person demo. `MIGRATION.md` §9 grades it
and explains why.

Start at `frontend/src/lib/data/providers.ts` and `MIGRATION.md` §2.

---

## The gates

Six checks. **All six must pass before anything is pushed**, plus the timezone
sweep below. They are run by hand — there is no CI yet.

```bash
cd frontend
npm test                              # the unit suite
npm run check                         # svelte-check, held at 0 errors AND 0 warnings
npm run build                         # it compiles
python3 ../scripts/check-contrast.py  # the palette
npm run check:layout                  # page height, in a real browser
npm run check:interaction             # behaviour, in a real browser
```

| Gate | What it catches |
|---|---|
| `npm test` | Logic errors in the pure layer. Runs in Node with **no jsdom, so nothing renders** — which is why logic is deliberately kept out of `.svelte` files, where no gate could see it. |
| `npm run check` | Type disagreements. It does **not** prove a page renders: it once passed cleanly on a component that threw on every request. |
| `npm run build` | It compiles, and the production build is what the two browser gates drive. |
| `check-contrast.py` | A colour that stops being legible. It **parses `app.css`** rather than keeping its own copy of the values, so a token edited there is checked there. Some assertions are ceilings — they assert a decorative colour stays *below* the text threshold, so putting words in it fails rather than quietly shipping. |
| `check:layout` | A page that scrolls further than it paints. Dead space at the bottom of a page is invisible in a screenshot and makes "does this fit" unanswerable. |
| `check:interaction` | Anything only a real browser can see: pointer events, focus, live regions. It exists because every other gate was green on a version where pressing a button did nothing at all. |

Plus **the timezone sweep**, which is part of the definition of green rather than
an extra — run it after touching anything date-shaped. The command is in
`setup_info.md`. It has caught two real failures.

The two browser gates need Chromium. They **skip loudly and exit 0** when there is
none, rather than failing for a reason that has nothing to do with the code. Install
one with `npx playwright install chromium`.

---

## Two things that will surprise you

**The design system is a single file and it is enforced.**
`frontend/src/app.css` holds every colour, size, radius and duration. Never
hardcode one in a component — a test scans the source and fails on a hex value or a
font name in markup. `CONTEXT.md` §6 explains the palette, including why the brand
yellow is decoration rather than an indicator.

**`/swatch` is a throwaway route** that renders every token on one page. It is a
comparison target for the port and should be deleted before release. It is not part
of the product.
