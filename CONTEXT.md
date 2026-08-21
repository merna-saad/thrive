<!-- updated-at: 0893dd2 -->

# CONTEXT

The living context file. Read this and you should be able to pick up the work
without asking anyone.

**Regenerated in full every handoff.** Never patch it — a partial edit leaves
stale claims sitting beside fresh ones with no way to tell them apart.

---

## 1. What this is

**THRIVE** — an AI coworker and knowledge platform for the UC San Diego Rady
School **MSBA** program. One calm surface replacing the hunt across fragmented
systems (Canvas, TSS/EASy, the CMC, email, a dozen PDFs).

This repo is the **rebuild**. A working Next.js prototype already exists and is
now frozen; this is the SvelteKit + Django version of it.

- **Repo:** `rsm-msaad/thrive`, private, GitHub. Default branch `main`.
- **Owner:** Merna (`rsm-msaad`, `mesaad@ucsd.edu`). Solo developer.
- **Local path:** `~/code/thrive`

### The frozen prototype

`~/Desktop/Test 1/Thrive-msba-brain` — Next.js 16 / React 19, at commit
`4e0a65b`. **READ-ONLY REFERENCE. Never write to it.** Its uncommitted working
tree has been left exactly as found and verified untouched after every phase.

Everything worth knowing about it is inventoried in `MIGRATION.md` (see §3), so
in practice you read that rather than the old tree.

---

## 2. Repo layout

```
thrive/
├── CONTEXT.md       this file — the snapshot
├── HANDOFF.md       the diary — what happened, per session
├── MIGRATION.md     the map of the frozen prototype, and the port spec
├── CONVENTIONS.md   rules the tooling does not enforce
├── CODEMAP.md       navigation map for this repo
├── CHANGELOG.md     dated session summaries, newest first
├── FINDINGS.md      reusable patterns and lessons
├── BUGS.md          defects found and fixed
├── DEPENDENCIES.md  packages and why each is here
├── TESTING.md       coverage and gaps
├── setup_info.md    environment and versions
├── README.md        the public-facing explanation of the layout
├── frontend/        the SvelteKit app
├── backend/         Django — not started, README only
└── scripts/
    └── check-contrast.py    43 WCAG assertions over the palette
```

`MIGRATION.md` is also the **only surviving copy** of the prototype inventory —
it was never committed to the old repo.

---

## 3. MIGRATION.md is the spec

1,457 lines, nine sections, written by reading the prototype at `4e0a65b`.
Every phase of the port works from it.

| § | Contents |
|---|---|
| 1 | Route inventory — 13 routes, which are real, which return `PagePlaceholder` |
| 2 | The data layer — all **25** provider functions with exact signatures, and the three module-level stores |
| 3 | Date and time handling — the timestamp rule as actually implemented |
| 4 | Component inventory — 75 components, shadcn/Radix wrappers marked |
| 5 | Design system — every token, and the conventions a port must preserve |
| 6 | State and stores — 14 `localStorage` keys, four properties |
| 7 | Tests — all 83, file by file |
| 8 | React-specific code needing a real decision, not a translation |
| 9 | Known defects, on a "build correctly, do not reproduce" list |

**Three counts in the original brief were wrong and MIGRATION.md corrects
them:** 25 providers (not 21), 83 tests (not 61), and `todayKey()` lives in
`buildSchedule.ts` (not `format.ts`). `CODEMAP.md` in the old repo undercounts
providers the same way, which is probably where "21" came from.

**Standing rule: where MIGRATION.md and the prototype source disagree, the
source wins, and it gets reported.** Exercised in Phase 5: §2 described
`buildSlotsFor`'s availability as deterministic, and it is not — see §12. A
correction note now sits inline in §2. The doc was written from the same source
three commits earlier by someone with the same intentions, and it still drifted;
that is the argument for the rule, not an argument against the doc.

---

## 4. Stack

**Frontend** — SvelteKit 2.63 · Svelte 5.56 (runes, forced outside
`node_modules`) · TypeScript 6 strict · Vite 8 · `adapter-node` · Tailwind v4 ·
Vitest 4 · npm.

Note this SvelteKit version has **no `svelte.config.js`** — the adapter and
compiler options live in `vite.config.ts` under the `sveltekit()` plugin.

**Backend** — Django, not started. **It is not being written in this repo yet,
and nothing here talks to it.** See §12: the data layer was built against mock
fixtures on purpose, and the provider signatures are the only contract Django
will have to honour.

**No shadcn-svelte and no bits-ui yet.** Deferred deliberately; `MIGRATION.md`
§4 lists the Radix primitives that will need equivalents and notes that only two
of the nine vendored shadcn files in the prototype were ever reachable.

**No dependency has been added since Phase 1.** Phase 5 wanted `@types/node` for
one test that reads source text; that was rejected in favour of Vite's
`import.meta.glob(..., { query: "?raw" })`, which is typed already. Adding a
dependency to satisfy a convenience is the wrong trade in a repo whose point is
to stay portable.

---

## 5. Where the port has got to

| Phase | What | State |
|---|---|---|
| — | Inventory the prototype → `MIGRATION.md` | done |
| — | Create the repo | done |
| 1 | Scaffold + design system | done |
| 2 | Pure logic + its 83 tests | done |
| 3a | Test suite for `format.ts` | done |
| 3a-fix | Input guards on `describeDue` / `formatClockTime` | done |
| 3b | Browser persistence layer → Svelte 5 runes | done |
| 4 | App shell, navigation, root layout | done |
| 5 | **Data layer — 25 providers, fixtures, three stores** | **done** |
| **next** | **`buildScheduleData()`, then route `load` functions and view models** | **unblocked** |
| later | Shared primitives (`Button`, `Card`, `Tag`, …) | not started |
| later | Home dashboard, calendar, task surfaces | not started |
| later | Floating widgets, behind `FEATURES` | not started |

**324 tests, 12 spec files, all passing.** `svelte-check` clean over 318 files.
Build clean. Contrast gate 43/43. 19 commits, all pushed.

Roughly 11,611 lines under `frontend/src` — 7,551 source, 4,060 test.

**The data layer is ahead of the UI by design, and that has a cost:** 25
providers exist and no route reads more than `getStudent()`. The only evidence
any of it works is the test suite. Nothing has been seen on a screen.

---

## 6. The design system

`frontend/src/app.css` is the single source of truth. **Never hardcode a colour,
size, radius, or duration in a component.** This is the repo's standing rule and
it has held through five phases.

Three layers, all ported: raw `--thrive-*` tokens → shadcn semantic vars
remapped onto them → `@theme inline` exposing both as Tailwind utilities.
Layer 2 stays even though shadcn is deferred, because the `@layer base` `body`
rule resolves through `--background` / `--foreground`.

**Direction: soft cream, hairline, mono-accent** (adopted 2026-08-15, a
deliberate reversal of the 08-12 bordered direction). Structure comes from
whitespace, type hierarchy, and a row that fills on hover — not borders.

### The three rules that matter most

1. **A 1px decorative hairline and a 1.5px control boundary are different
   things, carried by different tokens, and must never collapse.** Hairlines
   mean nothing — if removing one makes a layout ambiguous, the layout is wrong.
   Control boundaries (checkbox, radio, input, select) owe 3:1 under WCAG 1.4.11
   because the boundary is the only thing marking where the control is. Getting
   this wrong is silent: the page looks fine and the guarantee is gone.
   - `border-line` → the hairline, `#e6e3dc`, 1.22:1
   - `border-line-strong` → the control-boundary **colour only**; the 1.5px
     width comes from `--thrive-control-stroke` and the alias does not bring it
   - only `.thrive-checkbox` and `--input` consume the 1.5px stroke
2. **Weight is not in the type scale.** Set it at the call site or you get 400.
   Only 400/500/700 load, so `font-semibold` (600) synthesises — **never use
   it**. Verified 0 occurrences.
3. **Light-only, no shadows.** A white card on cream with a hairline is the
   entire elevation system. `dark:` is pinned to `.dark` which nothing applies.

### Reserved colours — meaning enforced by convention

| Token | Value | Reserved for |
|---|---|---|
| `indigo` | `#4c5bd4` | **"You are here" and nothing else** |
| `urgent` | `#b8462f` | Overdue and genuinely urgent only |
| `on-track` / `watch` / `needs-help` | `#3d6fb0` / `#8f6220` / `#6a5fb0` | Status only |
| `civic` / `later` | `#8a5f8f` / `#64748b` | Categorical only, never status |

Action accent is forest green `#3f6b4f` (6.13:1 on white — safe for text *and*
fills). Surfaces: `bg` `#faf9f5` cream, `surface` `#fff`, `sunken` `#f1efea`
(which is also the row hover fill and the de-emphasis fill). Ink: `ink`
`#17181c`, `body` `#3a3b42`, `muted` `#6b6c72`, `faint` `#85868c` — **only the
first three may carry text.**

Soft tints are all `color-mix(in oklab, base N%, white)` so they cannot drift
from their base hue.

Type scale 12/13/14/**16 body**/18/22/27/34/**40** as `text-3xs`…`text-3xl`,
tracking on the top three steps only. Radii 4/6/8/10/**16**. Motion
120/160/260ms, `ease-standard` decelerates and never overshoots, `ease-pop` is
the single sanctioned overshoot and only for the checkbox tick. Below `40rem`
the **root** goes to 106.25%, scaling type, spacing and the shell's rem heights
together — one rule, delete it to revert.

### Dropped as dead

`--thrive-shadow-card`, `--thrive-shadow-lifted`, and
`.thrive-priority-label` — all three had **zero** call sites in the prototype
despite a CSS comment claiming six. Commented in place in `app.css` with the
reason.

### The palette's regression test

`scripts/check-contrast.py` — 43 assertions, no dependencies, must be updated in
the same commit as any token change. **Three are ceilings**, asserting `faint`
stays *below* 4.5:1, so putting words in a decorative colour fails a check
rather than quietly shipping. Currently **43/43**.

### Fonts

Self-hosted through `@fontsource`, latin subset, `font-display: swap`, weights
pinned: DM Sans 400/500/700, JetBrains Mono 400/500. **No Google Fonts link.**
Mono marks machine truth — numerals, counts, IDs, compact dates, eyebrows.
**Prose never goes in mono.**

`/swatch` renders every token, type step, border weight and both faces on one
page. Throwaway; delete before Release 1.

---

## 7. Dates: the rule the framework no longer enforces

**Components never see a raw timestamp.** Dates are classified and formatted on
the server inside `load` functions; components receive pre-formatted strings.

Full statement in `CONVENTIONS.md`. The short version:

- Read the clock in a `load` function, pass down a `DueDescriptor` or a
  `*View` model, never an ISO string a component has to interpret.
- **`describeDue(iso, now)` stays pure and keeps its `now` parameter.** That
  parameter is not a convenience or a test seam — it is what makes the narrowed
  exception possible.
- **The narrowed exception:** anything the student can edit gets `nowISO` as a
  prop and re-runs the pure `describeDue` against it. The server still decides
  what "now" is; only the recomputation moved. The client never calls
  `new Date()` to ask what day it is.
- **Two sanctioned client clock reads, both documented at their definition:**
  `nowMinutes()` in `calendarSources.ts`, and `matchesWide()` in the
  floating-panel geometry (a `matchMedia` read, same hydration shape).
- **`dayKeyOf(value: Date | string)`** is the only place a local day key is
  built. Never `toISOString().slice(0,10)`, which shifts an evening item onto
  the next day anywhere behind UTC.

**Nothing enforces this any more, and that is the point of writing it down.** In
Next, the `"use client"` boundary enforced it at compile time — a server-only
module could not be imported into a client component and the build failed.
SvelteKit has no such wall. A component can `import { describeDue }` and call it
with no `now`; the default parameter is `new Date()`, so it compiles, runs,
renders something plausible, and is wrong in a way no test and no type catches.
**Review is the enforcement.** `CONVENTIONS.md` lists what to grep a diff for.

### The clock reads inside the data layer

Three, all deliberate, all behind the provider boundary — which today means they
happen in a server `load`, exactly where the rule wants them:

- **`getEvents()`** filters on `Date.now()` to drop finished events. Kept behind
  the boundary on purpose. When Django lands this becomes a query and the filter
  moves into the database — still server-side, still one answer to "what time is
  it".
- **`mock/relative-dates.ts`** is the clock every fixture reads, and it runs
  **when a provider is called**, not at module load. That is what stops a long
  dev session showing a demo where everything is overdue.
- **`buildSlotsFor()`** reads the clock to mark a slot that has already passed
  as unbookable. This is the one that makes it only *conditionally*
  deterministic — see §12.

### `describeDue` has four states, not three

Changed in Phase 3a-fix. `DueDescriptor` is a **discriminated union**:

```ts
export type DueUrgency = "overdue" | "today" | "upcoming";   // real deadlines
export interface KnownDueDescriptor   { urgency: DueUrgency; days: number; … }
export interface UnknownDueDescriptor { urgency: "unknown";  days: null;   … }
```

An unparseable date returns `{ urgency: "unknown", label: "No date",
countdown: "", days: null, fullLabel: "Due date unavailable" }`.

`days: null` rather than `NaN` is the load-bearing part: **`NaN` is a `number`
to the type system**, so it flows silently into `a.days - b.days` and
`days <= WEEK`; `null` does not typecheck there, so a caller must narrow first.

`"unknown"` is deliberately **not** in `DueUrgency` — "how urgent is it" has no
answer for a date that does not exist, and folding it in would make every
`Record<DueUrgency, TagTone>` map owe a colour to a non-status.

**Known consequence:** a row with `urgency: "unknown"` matches no group in a
surface that groups by `overdue | today | upcoming`. That is accepted because
the union makes it a *compile error* rather than a silent drop — whoever ports
`taskBoard.ts` cannot build without deciding where it goes. **Open decision.**

---

## 8. The persistence layer

`frontend/src/lib/overrideStore.svelte.ts` is the one mechanism. 14
`localStorage` keys sit on it, plus `taskNotes` (its own store) and `toast`
(not persisted).

**This is browser state, and it is a different thing from the three server-side
mock stores in §12.** Same word, opposite properties: this one is per-student
and survives a restart; those are shared by everyone and do not.

### Four properties that must survive

1. **Overrides keyed by id, never the whole truth.** `undefined` means "never
   touched, use the source value". A bare set of done-ids cannot express *"I
   unticked something that ships as done"* — it would silently re-tick on
   reload.
2. **Empty on the server, real after mount.** Nothing here may be read during
   server rendering.
3. **Corrupt input cannot take the page down.** Reject anything that is not a
   non-array object; `JSON.parse` and writes both in `try/catch`.
4. **A write matching the source value forgets the override** rather than
   storing it. The store only ever holds genuine divergence.

All four are pinned by tests in `overrideStore.spec.ts` and `userEdits.spec.ts`.

### Hydration: strategy A, an explicit call

`hydrateStores()` is called from the root `+layout.svelte` inside `$effect`, and
**nowhere else**. `$effect` runs after mount and only in the browser, so server
and first client render both see no overrides and the student's edits land on the
render after. Same brief un-personalised flash the prototype has.

Rejected: a `browser` guard (already true during first client render, so it
would populate mid-render and diverge from SSR markup) and a lazy read (same
defect, implicitly).

**Storage presence, not `$app/environment`, decides browser-vs-server.** No
`localStorage` *is* the server — and it keeps the whole layer testable in the
Node environment the suite already uses, with no jsdom.

`hydrateTaskNotes()` is a second call because notes are not an override store
and so are not in the registry.

**This is the seam for "hide until loaded" later.** A surface that wants to wait
reads a flag derived from that one call. Do not add a second hydration path.

### Three key spaces, never merge them

| Space | Module | Keyed on |
|---|---|---|
| Task id | `userEdits.svelte.ts` | the task's own id |
| Calendar item id | `calendarItems.ts` | `asg-12`, `apt-3`, `task-7`, `todo-x` |
| Raw `Event.id` | `ignoredEvents.ts` | normalised through `eventIdOf()` |

Calendar item id is what lets a student flag an *assignment* urgent or label a
*booked appointment* — rows they do not own and which have nowhere on the server
to record it. Merging any two is the exact shape of a bug the ignore store was
already refactored to avoid. Pinned by a test.

### `.svelte.ts` is not decoration

Svelte only processes runes in `.svelte.js` / `.svelte.ts`. A plain `.ts` file
containing `$state` is **silently inert** — the worst failure mode available.
Four files carry the suffix: `overrideStore`, `userEdits`, `taskNotes`, `toast`.
Everything else declares no runes and stays `.ts`, reading reactive state from
those modules, which works from anywhere.

---

## 9. React-isms deliberately dropped

Each because the constraint behind it does not exist in Svelte. Recorded so
nobody reintroduces them thinking they were an oversight.

| Dropped | Why it existed in React |
|---|---|
| `useCalendarPrefs`'s `useMemo` | `normalisePrefs` built a fresh object from a stable snapshot, so every render busted every downstream memo — including the schedule filter over 42 grid cells |
| The frozen shared `EMPTY` | `getServerSnapshot()` had to return the *same object* across renders |
| `useMergedSchedule`'s 9-dependency `useMemo` | Hooks cannot know their own dependencies; the array drifts from the body. Now a plain function the caller wraps in `$derived` |
| `useCallback` on `isDone` / `resolve` | Referential stability so callers could memoize on them |
| `useEffect` timer cleanup | Clearing a timer on unmount. A module singleton has no unmount |
| The `use*` prefix on every reader | Signalled "hook: call-order rules, render-phase only". None applies |
| `useFloatingGeometry`'s ref-passed-into-a-hook | A React Compiler render-phase rule. `bind:this` removes it |
| `useState` + `useRef` for the More sheet | Now `$state` + `bind:this` + an `escapeKey` action |

**One collapse was requested and made:** `localDayKey(iso)` folded into
`dayKeyOf(value: Date | string)`. Both built the same `YYYY-MM-DD` from the same
local parts and differed only in what they accepted; two functions computing one
string is how they eventually disagree about a timezone edge.

---

## 10. The shell

`frontend/src/lib/components/shell/` — `AppShell`, `SideRail`, `TopBar`,
`BottomNav`.

- **`nav.ts` is the single list** driving the desktop rail, the mobile bar, and
  every stub page. Add a route there, not in three places. `PagePlaceholder`
  looks its own `href` up in those lists and **throws** when there is no match,
  which is what makes it a guarantee rather than an intention. Verified: an
  unknown href returns 500 with that message.
- **Icons are component references held as values.** Rendered as
  `{@const Icon = item.icon}` then `<Icon />` — chosen once, used in all three
  nav surfaces. Not `<svelte:component>`, deprecated in Svelte 5.
- `SectionHeading`'s polymorphic `as` prop is `<svelte:element this={as}>`,
  kept to `h2 | h3` so it cannot quietly leave the document outline.
- **`RailLink` / `BarLink` became snippets**, not components — they existed in
  the prototype only because two lists must not drift.
- **Accessibility:** skip link, `main` landmark with `tabindex="-1"`, exactly
  one `nav` landmark in the a11y tree at a time (the other is `display:none`),
  `aria-current="page"` on the active item, `aria-expanded`/`aria-controls` on
  More, and focus returning to the More trigger on **both** Escape and a scrim
  tap. The prototype only returned focus on Escape.
- **`escapeKey` is a Svelte action**, not a translated `useEffect`. Attaching
  the listener to the element makes its lifetime the element's, so it exists
  exactly while the thing it dismisses does — no open-state re-check, no
  dependency array.

### Feature flags

`frontend/src/lib/features.ts` — `FEATURES.floatingTodo` and
`FEATURES.floatingAssistant`, both `false`. Mount points exist in `AppShell`,
gated. Comment reads: *hidden for now to simplify the UI, flip to true to bring
back.* Their internals are a later phase.

---

## 11. Routes

13 routes. `/` and `/calendar` render a heading; the other 11 are
`PagePlaceholder`, plus `/swatch`.

`/`, `/calendar`, `/classes`, `/syllabi`, `/assignments`, `/degree`, `/events`,
`/career`, `/appointments`, `/resources`, `/settings`, `/swatch`.

`/assignments` and `/appointments` were stubbed although not on the Phase 4
list: both are nav destinations and `/assignments` is one of the four **fixed**
slots in the mobile bar, so leaving them out would have put a 404 behind a
permanent tab.

`/degree` and `/career` get the placeholder body only. Both are *partial* in the
prototype — degree renders a real `ProgramTimeline`, career a link card with
live counts. **Both were blocked on providers; as of Phase 5 they are not.**

`+layout.server.ts` is the only route file that reads a provider. It calls
`getStudent()` and nothing else. When Phase 5 replaced the stub with the real
provider, **this file changed one import path and nothing else** — which is the
provider boundary doing the job it exists for, and the same non-event the switch
to Django should be.

**Titles** go through `pageTitle()` in `lib/title.ts`, reproducing Next's
`"%s · THRIVE"` template, which has no declarative SvelteKit equivalent.
`themeColor` `#faf9f5` and `colorScheme: light` are meta tags in `app.html`.

---

## 12. The data layer

`frontend/src/lib/data/` — 19 files, ~3,551 lines, landed in Phase 5. **This is
the seam.** Read `CODEMAP.md`'s data-layer section for the file map; this section
is the why.

### What it is, and what it deliberately is not

**It was built against the same mock fixtures the Next app uses.** There is no
HTTP client, no API layer, and no Django integration anywhere in it. Django
replaces the provider *bodies* much later; the signatures are the contract and
they do not move.

This needed saying because the Phase 4 handoff said Phase 5 was "the 25
providers **against Django**", which was wrong — Django does not exist and is
not being written here. Building to that line would have meant inventing a
contract against a backend nobody has designed, with every guess load-bearing by
the time it was discovered.

### The public surface

`data/index.ts` re-exports exactly three modules and nothing else:

| Module | Contents |
|---|---|
| `types` | Every domain type. One file, on purpose. Dates are ISO **strings**, never `Date` |
| `providers` | **25 functions + `SlotUnavailableError`** |
| `labels` | `requestTypeLabel`, `requestTypeHelp` — labels for a closed union, not mock data |

**`mock/` and `latency.ts` are private.** Everything under `mock/` is what Django
deletes. A component that needs something from either has found a gap in the
provider surface — **widen the surface, do not reach through it.**

**Import from `$lib/data`, never deeper.** The prototype violated this exactly
once and it is fixed here, not carried (see below).

### The 25 providers

Grouped as `MIGRATION.md` §2 groups them: 5 pure fixture reads, 4 reads with
shaping, 7 store-backed reads, 2 composite reads, 7 mutations. Signatures were
verified **identical to the prototype by mechanical diff**, not by eye.

Four properties hold across all of them, and each is pinned by a test:

1. **Every provider returns a `Promise`.** This is the entire point of the layer.
   Callers already `await`, so replacing a body with a Django call touches no
   caller.
2. **Every provider returns copies, never a stored object.** A caller holding a
   result must not see it change underneath them. *The copies are shallow*, as
   they were in the prototype — see the open item below.
3. **Generation is deterministic. Never `Math.random()`,** which would hand back
   a different calendar on every render and desynchronise server from client.
   Slot availability and the events calendar are hashed. A test scans the whole
   directory to keep it that way.
4. **Fixtures are dated relative to now,** so a demo never looks stale.

Three providers are **dead code, ported anyway**: `getSyllabi()`,
`getResources()` and `getCurrentResume()` are called from no route. The first two
back stub routes; the third is superseded by
`getResumeVersions().find(isCurrent)`.

### The three module-level stores

`mock/appointments.ts`, `mock/requests.ts`, `mock/resume.ts`. Plain `const`
objects at module scope.

| Store | Seeding | Id generator |
|---|---|---|
| appointments + claimed slots | starts **empty** | `apt-001` |
| requests + `tssConnected` | lazy `seedOnce` — one approved `req-000` | `req-001` |
| resume versions | lazy — three versions, `res-003` current | `res-004` (`nextId` starts at **4**) |

**Seeding is lazy on purpose.** The dates are relative to "now" and module load
may be hours earlier.

**The id generators count independently of the seeds.** They work only because
somebody numbered the request seed `req-000` and set the resume counter to 4 by
hand, and nothing enforces it. Seed a `req-001` without moving the counter and
the student's first request silently shares its id, after which `submitRequest`
flips whichever record `find()` reaches first — no error, no log. That hazard is
now commented **at the generator** rather than only in a migration doc (a hazard
documented somewhere else is documented nowhere), and a test pins `req-001` so it
fails the moment someone adds a seed.

### `buildSlotsFor` is only conditionally deterministic

`MIGRATION.md` §2 called both its ids and its availability deterministic. **The
ids are, and so is the `isTaken` hash. Availability is not:** the field is
`available: !inThePast && !isTaken(...)`, and `inThePast` reads the clock. So the
output is fully determined by `advisorId` **only at a fixed instant** — today's
slots drop out one by one as the day passes, and the whole five-day window shifts
at midnight. Freeze the clock to assert on it. §2 now carries a correction note.

### The 120ms latency is not decoration

`data/latency.ts`. Every provider resolves through `resolveAfterDelay`, and the
delay exists so that **a route which forgot its loading state looks wrong in
development instead of only in production**. With an instantly-resolving promise
that mistake is invisible until it ships.

`setMockLatencyMs(0)` removes it — one number, one place. Tests set 0. The
compounding matters: `getProgramTimeline`, `getRequestPrefill`,
`bookAppointment`, `createRequest`, `submitRequest` and `generateNewVersion`
await other providers internally, so their real latency is a multiple.

It goes away when the real network supplies the delay.

### Four §9 defects built correctly rather than reproduced

| # | Prototype defect | What this repo does |
|---|---|---|
| **8** | `cancelAppointment` released a slot by scanning for the first claimed slot whose `start` matched | **`Appointment.slotId`**, set at booking, deleted at cancellation. One exact delete |
| **11** | `degree/requests/page.tsx:8` imported a label map from `lib/data/mock/requests` — the only import in the tree reaching past the boundary | Both maps moved to `data/labels.ts`, on the public side |
| **15** | `getStudent`, `getDegreeProgress`, `getAdvisors`, `getResources` returned fixtures **by reference** while the file's own comment promised otherwise | All 25 return copies. The contract is uniform rather than lucky |
| **9** | `DegreeProgress.expectedCompletion` hardcoded `"Spring 2027"` while `buildProgramTimeline` derived **Fall 2027** for the same student | Field dropped from the type and the fixture. Read `ProgramTimeline.expectedFinishTerm` |

**On defect 8 specifically:** the old scan was correct with one advisor per
service and distinct times — which is exactly what the fixtures give it, so
nothing ever revealed it. It frees the wrong slot the moment an advisor publishes
two simultaneous slots. `slotId` was chosen over a side map in the store because
it is the shape the Django model has anyway; verified nothing in the tree
constructs an `Appointment`, so no existing test broke.

**On defect 9:** a stored field duplicating a derived one is a bug with a delay
on it. It cannot be kept in step and it stays quiet until someone renders it.

### The fixture student

`mock/student.ts`. Merna · MSBA · **17 month** track · goal "Data Scientist" ·
Fall 2026 · `programStart: 2026-08-03` · standing `onTrack`.

`programStart` is a **start** date. The finish term and the progress percentage
are both *derived* from it plus `track` by `buildProgramTimeline`; neither is
stored anywhere, and switching track moves both with no other edit.

The advisors: **Amber Hanna** (Graduate Student Advisor, Rady 2S111) and
**Nelitza Morales** (Career Coach, CMC / Zoom).

### Testing it

`providers.spec.ts`, 47 tests. It asserts **properties, not fixture contents** —
the fixtures are demo data with a known expiry date, so asserting on them would
be writing tests that expire with them.

- **Isolation comes from the test side.** `vi.resetModules()` + `await import()`
  per test. A `resetStores()` export would have been more convenient and would
  have put a test-only function in the production surface, where it would still
  be sitting long after Django made the stores irrelevant.
- **Freeze `Date` only** — `vi.useFakeTimers({ toFake: ["Date"] })`. Faking all
  timers deadlocks every provider, because they resolve through `setTimeout`.
- **Green in all seven timezones** of the `TESTING.md` sweep, UTC+14 to UTC−11.
  This phase is entirely date-shaped, so the sweep was not optional.

---

## 13. Standing decisions

- **The old repo is read-only.** Verified untouched after every phase.
- **Django is not being written here, and the port does not anticipate it beyond
  the provider signatures.** No speculative HTTP client, no invented endpoints.
- **`@lucide/svelte`, not `lucide-svelte`.** The latter is the legacy package
  pinned to Svelte 3/4 at v1.0.1; the former peers `svelte: ^5` and tracks the
  same version line as the prototype's `lucide-react@^1.31.0`.
- **`cn()` survives** for the `class`-override case only. Svelte 5 handles
  conditional classes natively but not `tailwind-merge`'s conflict resolution.
- **Vitest `usages:unit`** — Node environment, no jsdom. Matches the
  prototype, where all 83 tests were pure logic and rendering was deliberately
  never tested.
- **`AppShell` stays its own component** rather than inlined into
  `+layout.svelte`, so the layout is about data and lifecycle and the shell is
  about structure.
- **Probe before asserting.** Test suites are written against observed output
  from a throwaway probe, not assumed behaviour. It caught real things twice —
  V8 rejecting a bad month but *rolling* a bad day, and the ignore store's
  key-space split.
- **Document defects as tests rather than fixing them out of scope.** Each is
  named as a defect record with the reason it was not fixed.
- **Diff a port, do not review it.** A 2,000-line port is the size where reading
  the diff stops working. Signatures get grepped and compared; bodies get diffed
  **comments-stripped**, so "did I change something I did not mean to" is a
  five-line answer instead of a judgement call. Eight of thirteen Phase 5
  fixture files came out **byte-identical**, which is a stronger claim than any
  amount of "looks right".
- **Any test asserting an absence needs a companion assertion that it can still
  see a presence.** The `Math.random()` scan asserts the stripped corpus still
  contains both hash functions, so it cannot pass vacuously.
- **Keep a test's seam on the test's side of the wall** where possible. A
  test-only export is permanent and outlives its reason.
- **No Claude/Anthropic attribution anywhere** — commits, PRs, file headers.
  Verified clean across all 19 commits.

---

## 14. Voice and copy

Calm, plain, honest about what is simulated. The prototype's own rules, carried
over:

- Say plainly when something is a prototype or is not wired up. A placeholder
  that mimics a real answer teaches the student to trust a thing that is not
  there — which is why `AssistantConversation` has no brain and says so. The
  same honesty is why `providers.ts` marks the request and resume flows
  **SIMULATED** in place: `submitRequest` flips a status in memory and stops,
  nothing reaches TSS, and no human is notified.
- Empty states are an invitation to act, never "No data". Never a dashed
  outline.
- "Overdue" alone, not "Overdue by 3 days" beside "3 days ago".
- Counts and timers in mono and tabular, so a row does not reflow as "in 3
  days" becomes "in 10 days".
- Comments explain **why**, not what. The prototype's density is the house
  style and this port matches it.

---

## 15. Open loose ends

Carried into the next session. The live list is at the bottom of `HANDOFF.md`.

**Blocking**

1. **The three mock stores are process-global.** `MIGRATION.md` §9 defect 1,
   graded **BLOCKING**, inherited intact and unfixable at this layer — an
   `adapter-node` process has the same module-scope hazard the Next server had.
   Concurrent students book over each other and see each other's requests and
   resume versions; everything resets on restart or hot reload. **Django is the
   fix. Do not put this in front of more than one person before then.**

**From the data layer**

2. **Provider copies are shallow.** `{ ...version }` shares `skills`, `courses`
   and `experience` with the store, so `returned.skills.push(...)` mutates it.
   Faithful to the prototype, pinned by a test that says why. Deepening it is a
   behaviour change beyond a port — an open call, not an oversight.
3. **Nothing renders the data layer.** 25 providers, and the only consumer is
   `getStudent()` in the root layout.
4. **`requestTypeHelp` has no consumer** anywhere in the prototype — verified by
   grep. Ported because the type picker it belongs under is a later phase.
   Delete it if that picker never lands.
5. **`buildScheduleData()` is unported and now unblocked.** It reads five
   providers — `getCourses`, `getAssignments`, `getEvents`, `getMyAppointments`,
   `getAdvisors` — and all five exist. This is the obvious next task. It belongs
   in a server `load`, not a component.

**Carried from earlier phases**

6. **The ignore store key-space defect** — Home and the calendar key it
   differently, so ignoring on one surface does not affect the other. Needs a
   decision on the canonical key; affects already-stored data.
7. **Where an `urgency: "unknown"` row goes** in a grouped list.
8. **Two product decisions parked pending real screens:** the missing year in
   `formatShortDate` / `fullLabel`, and `countdownPhrase` counting to "13
   months" with no year branch.
9. **`taskNotes` on `createOverrideStore`?** It duplicates the persistence
   logic, and the hardening it needed is exactly the drift that argues for
   collapsing it.
10. **Home's placeholder copy** — deliberately not `PagePlaceholder`.
11. **Mount `Toast`?** Store is ported and tested; one import.
12. **`useIgnoreUndo.ts`** not ported.
13. **`format.ts` still emits `"Invalid Date"` from `formatShortDate`** — the
    last unguarded function in the module.
14. **A parseable-but-wrong date still gets through** `describeDue`: V8 rolls
    `"2026-02-30"` into March. Catching it needs a round-trip check.

---

## 16. Timeline

Release 1 target was **end of August 2026**; a control group was planned for the
**last week of August**. Both dates come from the prototype's `REPORT.md` and
predate the decision to rebuild — **they need re-setting against the rebuild,
which is the largest open planning question.**

Note the interaction with loose end 1: a control group implies concurrent users,
and the process-global stores mean concurrent users see each other's data. Either
Django lands first or the control group is one person at a time.

The prototype's Release 1 scope was: (a) the student dashboard, (b) appointment
scheduling with history/notes/summaries/topic tagging, (c) `/resources` as the
Resource Navigator surface, (d) per-task time estimates. Of those, only (a) was
partial; three were never begun.
