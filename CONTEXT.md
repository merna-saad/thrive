<!-- updated-at: f8593b7 -->

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

### A note on dates in this repo

Several entries and `app.css` comments are stamped **2026-08-22**, a day ahead of
the real date, from a mis-stamp during the repalette. **Commit hashes are the
reliable ordering.** Dates here are ±1 day; do not use them to reason about
sequence.

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
    ├── check-contrast.py    58 assertions over the palette and app.css
    └── check-layout.mjs     12 routes x 3 viewports, in a real browser
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
`buildSchedule.ts` (not `format.ts`).

**Standing rule: where MIGRATION.md and the prototype source disagree, the
source wins, and it gets reported.** Exercised twice so far — §2 overstated
`buildSlotsFor`'s determinism, and §2 omitted that provider copies are shallow.
§2 now carries a correction note.

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
§4 lists the Radix primitives that will need equivalents.

**One dependency added since Phase 1: `playwright-core`** (2026-08-21), for the
layout gate. There is no zero-dependency way to measure a rendered page, and the
alternative was leaving a real invisible bug ungated. `@types/node` was rejected
in Phase 5 because `import.meta.glob(..., { query: "?raw" })` did that job with
nothing added — the rule is "do not add one where the platform already answers",
not "never add one". See DEPENDENCIES.md.

---

## 5. Where the port has got to

| Phase | What | State |
|---|---|---|
| — | Inventory the prototype → `MIGRATION.md` | done |
| 1 | Scaffold + design system | done |
| 2 | Pure logic + its 83 tests | done |
| 3a / 3a-fix | `format.ts` suite; input guards on `describeDue` | done |
| 3b | Browser persistence layer → Svelte 5 runes | done |
| 4 | App shell, navigation, root layout | done |
| 5 | Data layer — 25 providers, fixtures, three stores | done |
| — | Repalette to campus brand; tighten the two-face type rule | done |
| — | Trim navigation to four destinations | done |
| 6a | **Home — the page, four cards, fit-on-one-screen** | **done** |
| **next** | **Stat pill popovers** (specified, §17) | not started |
| then | **6b — task editing** | not started |
| then | The calendar (15 components, largest surface) | not started |
| then | Appointments | not started |
| then | The Ask THRIVE page | not started |
| later | Floating widgets, behind `FEATURES` | not started |

**373 tests, 17 spec files, all passing**, green in all seven timezones of the
sweep. `svelte-check` clean over 368 files. Build clean. Contrast **58/58**.
Layout **36/36**. 30 commits, all pushed.

**115 files under `frontend/src`** — ~15,453 lines, 10,802 source / 4,651 test.

---

## 6. The design system

`frontend/src/app.css` is the single source of truth. **Never hardcode a colour,
size, radius, or duration in a component.** `designSystem.spec.ts` fails the
build on a hex or a font name in markup.

Three layers: raw `--thrive-*` tokens → shadcn semantic vars remapped onto them →
`@theme inline` exposing both as Tailwind utilities.

**Direction: soft cream, hairline, Rady navy with a yellow accent.**

### The palette is the campus brand

Official values from `brand.ucsd.edu/visual-brand/color`, not approximations:

| Token | Value | Notes |
|---|---|---|
| `primary` | `#182b49` | **UC San Diego Navy, PMS 2767.** 14.18:1 on card |
| `primary-hover` / `-active` | `#22395e` / `#101d33` | Hover **lifts**, active **presses** — inverted from the green's ramp, because darkening navy twice heads to black |
| `yellow` | `#ffcd00` | **UC San Diego Yellow, PMS 116.** Accent only |
| `primary-soft` | `#e9edf3` | Partial-progress fill |
| `primary-fill` | `#9dbcdb` | Light fill, 1.97:1 — **cannot hold its own edge, stays ringed** |

**Yellow is constrained by measurement, not taste.** 1.50:1 on card, 1.43:1 on
cream, 1.31:1 on sunken. WCAG 1.4.11 asks 3:1 of a graphic that carries meaning,
so on every light surface here yellow is **decoration** and cannot be the only
thing saying something — the same standing as a hairline. Its one legible home is
against navy at 9.45:1, which is the campus pairing anyway. Enforced by three
**ceilings** in the contrast gate: if it ever clears 3:1 someone will promote it
to an indicator and get away with it.

**Yellow is not a locator.** "You are here" stays `indigo`. Two colours meaning
"here" is how a reservation dies.

**Gold `#c69214` (PMS 1245) was measured and rejected** at 2.79:1. `watch`
(`#8f6220`, 5.34:1) already covers a legible warm accent.

### Reserved colours

| Token | Value | Reserved for |
|---|---|---|
| `indigo` | `#4c5bd4` | **"You are here" and nothing else** |
| `urgent` | `#b8462f` | Overdue and genuinely urgent only |
| `on-track` | `#14706b` | Status only. **Teal** — see below |
| `watch` / `needs-help` | `#8f6220` / `#6a5fb0` | Status only |
| `civic` / `later` | `#8a5f8f` / `#64748b` | Categorical only, never status |

**`on-track` is the only reserved colour whose value has changed.** It moved off
green on 08-15 because green had become "an action you can take" and a green chip
beside a green button read as one signal. A blue chip beside a **navy** button is
that same collision, so it moved again, to teal. 5.90:1 on card, 2.40:1 against
navy — far enough apart to be a different statement rather than a lighter navy.

**`indigo` was considered and kept.** It separates from navy on lightness (5.59
vs 14.18) and saturation at once, and it never takes the same form — navy is a
solid fill with white on it, indigo is a marker or a word.

### Surfaces, ink, lines

Surfaces `bg #faf9f5` cream / `surface #fff` / `sunken #f1efea` (also the row
hover fill). Ink `ink #17181c`, `body #3a3b42`, `muted #6b6c72`,
`faint #85868c` — **only the first three may carry text**, and `faint` is held
below 4.5:1 by a ceiling so words placed in it fail a check.

**A 1px decorative hairline and a 1.5px control boundary are different things,
carried by different tokens, and must never collapse.** Control boundaries owe
3:1 under WCAG 1.4.11 because the boundary is the only thing marking where the
control is. Only `.thrive-checkbox` and `--input` consume the 1.5px stroke.

### Type: two faces, and the rule is tight now

**DM Sans for everything. JetBrains Mono for NUMBERS ONLY.**

The old rule ended "…and any label that is a system value", and almost any label
can be argued into that, so mono spread to eyebrows, view switchers, chips,
stream names and tags. A face used for a third of the interface is not an accent,
it is a second body font.

- **Mono keeps:** clock times, counts, unit totals, percentages, fractions, IDs —
  values a person *scans or compares*, where digits lining up is the point.
- **Mono loses:** anything made of words. A date in prose is words and takes DM
  Sans; the time inside it is a value and stays mono.
- **The test:** would you ever want this to line up in a column with the thing
  above it? Column → mono. Sentence → sans.

Expressed as two classes so a component asks for a **treatment**, not a font:
`.thrive-numeric` (mono + tabular figures together) and `.thrive-eyebrow` (size,
case, tracking, weight for a small label). A component that writes `font-mono`
fails `designSystem.spec.ts`.

**Weight is not in the type scale.** Set it at the call site or you get 400. Only
400/500/700 load, so `font-semibold` (600) synthesises — never use it.

Type scale 12/13/14/**16 body**/18/22/27/34/**40**, tracking on the top three
steps only plus `.thrive-eyebrow`. Radii 4/6/8/10/**16**. Motion 120/160/260ms.
Light-only, no shadows. Below `40rem` the **root** goes to 106.25%.

### The one responsive token

`--thrive-topbar-height` is **56px on mobile, 48px above `lg`**, overridden in a
media query on the raw token rather than by a class. `SideRail` draws its brand
band at `h-topbar`, so the rail's edge and the bar's edge continue one line — one
token means they cannot fall out of step at the breakpoint. `@theme inline` is
what makes it work: the utility inlines the `var()` expression instead of
resolving it once.

### `/swatch`

Renders every token, both border weights, the brand values with their PMS
numbers, the yellow constraint shown legible-on-navy beside decorative-on-cream,
and the two-face rule as a table of worked pairs. Throwaway; delete before
Release 1.

---

## 7. Dates: the rule the framework no longer enforces

**Components never see a raw timestamp.** Dates are classified and formatted on
the server inside `load` functions; components receive pre-formatted strings.

Full statement in `CONVENTIONS.md`. The short version:

- Read the clock in a `load` function. **Once.** `+page.server.ts` for Home calls
  `new Date()` a single time and every classification measures against it — two
  calls are two answers, and a task classified against 11:59:59 while the next
  line reads 12:00:00 is somehow both today and overdue.
- **`describeDue(iso, now)` stays pure and keeps its `now` parameter.** That
  parameter is what makes the narrowed exception possible.
- **The narrowed exception:** anything the student can edit gets `nowISO` as a
  prop and re-runs the pure `describeDue` against it. The server still decides
  what "now" is; only the recomputation moved.
- **`dayKeyOf(value: Date | string)`** is the only place a local day key is built.
- **Two sanctioned client clock reads**, both documented at their definition:
  `nowMinutes()` in `calendarSources.ts`, and `matchesWide()` in the
  floating-panel geometry.

**Nothing enforces this, and that is the point of writing it down.** In Next the
`"use client"` boundary enforced it at compile time. SvelteKit has no such wall:
a component can `import { describeDue }` and call it with no `now`, and the
default parameter is `new Date()`, so it compiles, renders something plausible,
and is wrong in another timezone. **Review is the enforcement.**

### The clock reads inside the data layer

Three, all behind the provider boundary, which today means a server `load`:
`getEvents()` filters on `Date.now()`; `mock/relative-dates.ts` runs when a
provider is called, not at module load; `buildSlotsFor()` reads the clock for its
past-slot check, which is what makes it only *conditionally* deterministic.

### `describeDue` has four states, not three

`DueDescriptor` is a **discriminated union**: `overdue | today | upcoming` plus
`unknown` for a date that will not parse, which carries `days: null` rather than
`NaN`. **`NaN` is a `number` to the type system** and flows silently into
`a.days - b.days`; `null` does not typecheck there, so a caller must narrow.

**`unknown` is deliberately NOT in `DueUrgency`** — "how urgent is it" has no
answer for a date that does not exist.

**Where an unknown row goes is now decided** (2026-08-21): its own group, **first
in the list**, headed "Needs a date". Loud is correct, invisible is not — a
deadline that silently does not exist is worse than one shouting for attention,
and it is the only group a student can actually fix. It is not tinted `urgent`:
that tone is reserved for real deadlines, and a missing date is a data problem.
Being first also means it survives the collapse to four rows on a capped card,
which is what makes it real rather than technically present.

---

## 8. The persistence layer

`frontend/src/lib/overrideStore.svelte.ts` is the one mechanism. 14
`localStorage` keys sit on it, plus `taskNotes` and `toast`.

**This is browser state, and a different thing from the three server-side mock
stores in §12.** Same word, opposite properties: this one is per-student and
survives a restart; those are shared by everyone and do not.

### Four properties that must survive

1. **Overrides keyed by id, never the whole truth.** `undefined` means "never
   touched, use the source value". A bare set of done-ids cannot express *"I
   unticked something that ships as done"*.
2. **Empty on the server, real after mount.**
3. **Corrupt input cannot take the page down.**
4. **A write matching the source value forgets the override.**

All four pinned by tests. **Hydration is one explicit `hydrateStores()`** in the
root `+layout.svelte` inside `$effect`, and nowhere else. Storage presence, not
`$app/environment`, decides browser-vs-server — which keeps the whole layer
testable in Node with no jsdom.

### Three key spaces, never merge them

| Space | Module | Keyed on |
|---|---|---|
| Task id | `userEdits.svelte.ts` | the task's own id |
| Calendar item id | `calendarItems.ts` | `asg-12`, `apt-3`, `task-7`, `todo-x` |
| Raw `Event.id` | `ignoredEvents.ts` | normalised through `eventIdOf()` |

**Home only ever holds raw `Event.id`s** and passes them through unchanged.
`eventIdOf()` is for calendar ITEM ids (`evt-evt-3-1`), a different key space
Home never touches. Calling it there would be normalising something already
normal — which is how a second normaliser gets added, and §9 defect 12 is what
happens next.

### `.svelte.ts` is not decoration

Svelte only processes runes in `.svelte.js` / `.svelte.ts`. A plain `.ts` with
`$state` is **silently inert**. Five files carry the suffix: `overrideStore`,
`userEdits`, `taskNotes`, `toast`, `ignoreUndo`.

---

## 9. React-isms deliberately dropped

Each because the constraint behind it does not exist in Svelte. Recorded so
nobody reintroduces them thinking they were an oversight.

| Dropped | Why it existed in React |
|---|---|
| `useCalendarPrefs`'s `useMemo` | A fresh object per render busted every downstream memo |
| The frozen shared `EMPTY` | `getServerSnapshot()` had to return the *same object* |
| `useMergedSchedule`'s 9-dependency `useMemo` | Hooks cannot know their own dependencies |
| `useCallback` on `isDone` / `resolve` | Referential stability for memoizing callers |
| `useEffect` timer cleanup | A module singleton has no unmount |
| The `use*` prefix on every reader | Signalled call-order rules that do not apply |
| `useFloatingGeometry`'s ref-into-a-hook | A React Compiler render-phase rule; `bind:this` removes it |
| `useState` + `useRef` for the More sheet | Moot — the sheet is gone (§11) |

**One collapse was requested and made:** `localDayKey(iso)` folded into
`dayKeyOf(value: Date | string)`.

**Hooks that became module singletons:** `useTaskToggle` → `taskToggle`,
`useIgnoreEvents` → `ignoreEvents`. One undo slot app-wide rather than one per
calling component, which matches what `toast` already did deliberately.

---

## 10. The shell

`frontend/src/lib/components/shell/` — `AppShell`, `SideRail`, `TopBar`,
`BottomNav`.

- **`nav.ts` is the single source** for the rail and the bottom bar.
  `PagePlaceholder` looks its own `href` up and **throws** when there is no
  match, which is what makes that a guarantee rather than an intention.
- **The top bar is 48px above `lg`, 56px below.** The CONTROLS change size — 44px
  touch, 36px pointer — and the bar's height follows from them. WCAG 2.5.5 asks
  44px of a touch target and 2.5.8 asks 24px of a pointer one.
- **`--thrive-page-gutter-bottom`** is the page's bottom breathing room, used
  twice: on mobile added to the bottom nav's height (that bar is fixed *over* the
  page), and above `lg` it is the whole padding.
- **Icons are component references held as values**, rendered via
  `{@const Icon = item.icon}`. Not `<svelte:component>`, deprecated in Svelte 5.
- **Accessibility:** skip link, `main` landmark with `tabindex="-1"`, exactly one
  `nav` landmark in the a11y tree at a time, `aria-current="page"` on the active
  item.
- **`escapeKey` is a Svelte action**, not a translated `useEffect`. **It currently
  has no caller** — its only one was the More sheet. Kept deliberately: the
  floating panels and the Ask THRIVE page will want it.

### Feature flags

`FEATURES.floatingTodo` and `FEATURES.floatingAssistant`, both `false`. Mount
points exist in `AppShell`, gated. **Left untouched when `/ask` became a route** —
two Ask THRIVE surfaces is a later decision, not an accident to create now.

---

## 11. Routes and navigation

13 routes. **Four are in the navigation:** Home, Calendar, Appointments, Ask
THRIVE — in that order.

Nine of the previous eleven destinations were placeholders, and a nav that is
four-fifths stubs reads as broken rather than unfinished.

### Parked, not deleted

`/classes`, `/syllabi`, `/assignments`, `/degree`, `/events`, `/career`,
`/resources` and **`/settings`** live in `parkedNav` — a list **no surface
renders**. The routes, files, icons and descriptions are all intact and reachable
by URL; the only thing removed is the way in. Bringing one back is moving it
between two arrays.

**Why a separate list rather than a `hidden` flag:** a flag needs every surface to
remember to filter on it, and the failure mode of forgetting is a parked item
silently reappearing in one place. With a separate list the surfaces render
`primaryNav` and *cannot* render these without importing something new.

**`allNav`** is the lookup list — visible plus parked. `PagePlaceholder` resolves
against it, so parking a route does not start it throwing. Verified: all 13 routes
return 200; a route whose href is in no list returns 500 with the right message.

**Settings is parked and stays parked** (confirmed 2026-08-21): nothing to
configure yet. It was also the reason the mobile **More sheet** could go — with
four destinations there is no overflow, and an overflow button that opens nothing
is worse than no button. Its scrim, open state, `aria-expanded`/`aria-controls`
wiring and focus-return went with it.

**`/ask`** exists as a `PagePlaceholder` route with its nav entry in place. The
real page is §17.

`pageTitle()` in `lib/title.ts` reproduces Next's `"%s · THRIVE"` template.

---

## 12. The data layer

`frontend/src/lib/data/` — 19 files, ~3,551 lines. **This is the seam.**

**Built against the same mock fixtures the Next app uses.** No HTTP client, no
API layer, no Django integration. Django replaces the provider *bodies* later;
the signatures are the contract and do not move.

### The public surface

`data/index.ts` re-exports exactly three modules: `types`, `providers` (25
functions + `SlotUnavailableError`), and `labels`. **`mock/` and `latency` are
private** — a component that needs something from either has found a gap in the
provider surface. Widen the surface, do not reach through it.

### Four properties, each pinned by a test

1. **Every provider returns a `Promise`.** The entire point of the layer.
2. **Every provider returns copies.** *The copies are shallow*, as in the
   prototype — see §17.
3. **Deterministic generation. Never `Math.random()`**, which desynchronises
   server from client. A test scans the whole directory.
4. **Fixtures dated relative to now**, so a demo never looks stale.

### The three module-level stores

`mock/appointments.ts`, `mock/requests.ts`, `mock/resume.ts`. Lazy seeding,
because their dates are relative to "now" and module load may be hours earlier.

**The id generators count independently of the seeds.** They work only because
somebody numbered the request seed `req-000` by hand and set the resume counter to
4. Seed a `req-001` without moving the counter and the student's first request
silently shares its id. Commented at the generator, and pinned by a test.

### Four §9 defects built correctly rather than reproduced

| # | Defect | What this repo does |
|---|---|---|
| 8 | `cancelAppointment` released by matching start time | `Appointment.slotId`; one exact delete |
| 11 | A page imported a label map from `lib/data/mock/requests` | Both maps in `data/labels.ts`, public side |
| 15 | Four providers returned fixtures by reference | All 25 return copies |
| 9 | `expectedCompletion` hardcoded vs a derived finish term | Field dropped; read `expectedFinishTerm` |

### The fixture student

`mock/student.ts`. Merna · MSBA · **17 month** track · goal "Data Scientist" ·
Fall 2026 · `programStart: 2026-08-03` · standing `onTrack`. `programStart` is a
**start** date; the finish term and the percentage are both derived.

Advisors: **Amber Hanna** (Graduate Student Advisor, Rady 2S111) and **Nelitza
Morales** (Career Coach, CMC / Zoom).

---

## 13. Home

The one fully-built page, and the only route that reads more than `getStudent()`.

`+page.server.ts` awaits **six providers in one `Promise.all`** and calls
`new Date()` once. Four cards in a **2×2 grid** at `lg`, one column below it.

**What is deliberately not computed on the server:** the three stat counts. They
have to see the student's persisted ticks and ignores, which only exist in the
browser — counting them server-side freezes them at the fixture's answer and lets
the pills contradict the cards beneath them. What goes down is the classified rows
and the raw event ids: the data to count, not the count.

### The fit-on-one-screen behaviour

The problem: Home rendered fourteen task rows beside a card showing one class, so
the tallest card decided the page height and two of the four cards were below the
fold.

- **Desktop: a FIXED height per card body, scrolling inside.** Fixed, not
  `max-height` — with a maximum, a short card still *grows* when expanded, moving
  its grid row and shoving the cards below it down. Fixed means expanding can
  only ever scroll, so the grid is immovable by construction.
- **Mobile: no cap at all.** Cards stack and expand normally. A nested scroll
  region inside a page that already scrolls eats the swipe meant for the page.
- **The state does not persist.** An expanded card is a momentary intent, not a
  preference.
- **`contain: paint`** on the card body — load-bearing, see BUGS.md.

**Cap: `--thrive-card-body-cap: 18.75rem` (300px)**, the tightest value at which
nothing overflows at rest. Collapsed row COUNTS live in `$lib/cardLayout` because
JavaScript slices with them: **4** task rows, **2** course cards, **4** class
rows, and `VISIBLE_EVENTS = 4`.

**Upcoming Events scrolls at rest, on purpose.** Its four rows are load-bearing
behaviour rather than layout: ignored events are filtered **first** and the slice
happens **second**, so the next event moves up instead of leaving a gap.

### Tasks is flat when collapsed, grouped when expanded

The one real design decision in 6a, and it came from measuring. The card carried
~190px of fixed furniture — progress bar, three group headings, Done heading,
section gaps — before its first row, three and a half rows' worth. At any cap that
let the grid fit a laptop it showed one task.

So the progress bar moved into the header band (outside the scroll area) and the
collapsed view shows a flat list of the next four things with no headings. Nothing
is lost: every row already states its own urgency in its labels. Headings come
back on expand, where they earn their height.

### Measured heights

Header block **375px → 266px** with nothing removed: strip and greeting merged
into one panel, the date onto the greeting's line, the pills and chips into one
wrapping row. Document **1392px → 1238px**.

**Home fits a 1238px viewport whole.** It does not fit 1052px, and it misses by
186px. That gap is **not** density any more — the header is 194px with every piece
of content in it. It is card rows, and the decision (2026-08-21) is **do not cut
them**: two task rows would make the card useless, and "show more" exists for
exactly that.

### Strings

**`$lib/messages` holds every user-facing string.** English only, no library, no
locale switching — this is not i18n, it is what makes i18n possible later without
a rewrite. Nested by surface, and **anything carrying a value is a function**, not
a template assembled at the call site: `showMore(count)` lets a translation move
the number, `{count} more` in markup bakes English word order in.

Two entries are split in half — the timeline percentage and the course card's
"Next:" — because the value is styled differently from the words around it. Both
say so, and both name the limitation: the value comes first.

**This is a standing rule, not a Home thing.** Every surface extracts its strings
as it is built, or Mandarin stops being possible.

---

## 14. The gates

| Command | What it proves |
|---|---|
| `npm test` | 373 tests. Pure logic and source scans. **Nothing renders.** |
| `npm run check` | Types agree. **Does NOT prove the page renders** |
| `npm run build` | It compiles |
| `python3 scripts/check-contrast.py` | 58 assertions: 42 pairs, 6 ceilings, 10 structural |
| `npm run check:layout` | 12 routes × 3 viewports in a real browser |

**`check-contrast.py` parses `app.css`** rather than mirroring it. That weakness
was load-bearing during the repalette: 43 assertions were checking green values
while the app rendered navy, and it would have reported 43/43 throughout.
`color-mix()` is deliberately not evaluated and the unresolved tokens are listed.

**`check:layout` asserts the page cannot scroll further than it paints.** It does
**not** use `documentElement.scrollHeight` — that is the property that reported
1275px while nothing rendered below 1238px, so building on it would rebuild the
blind spot. It scrolls the page and reads where it landed. It skips loudly and
exits 0 when there is no browser, because a gate that cries wolf gets ignored.

**Three properties every gate here has:** it measures the thing rather than a
model of it; it reads its inputs from the source of truth; and it has been
**verified to fail** on the bug it was written for.

**`npm run check` is not a render.** `svelte-check` passed 0 errors on a component
that threw `ReferenceError` on every request — a prop was in the type but not the
destructuring, and an unknown identifier in a Svelte template is not a type error.

---

## 15. Standing decisions

- **The old repo is read-only.** Verified untouched after every phase.
- **Django is not being written here**, and the port does not anticipate it beyond
  the provider signatures.
- **Measure layout in a real browser.** Never reason about pixels. This earned
  itself three times in one session — see FINDINGS.
- **`@lucide/svelte`, not `lucide-svelte`** (the latter is pinned to Svelte 3/4).
- **`cn()` survives** for the `class`-override case only.
- **Vitest in Node, no jsdom.** Matches the prototype, where rendering was
  deliberately never tested.
- **Probe before asserting.** Test suites are written against observed output from
  a throwaway probe, not assumed behaviour.
- **Diff a port, do not review it.** Signatures grepped and compared; bodies
  diffed comments-stripped.
- **Any test asserting an absence needs a companion assertion that it can still
  see a presence.**
- **Keep a test's seam on the test's side of the wall** where possible. A
  test-only export is permanent.
- **Extract strings as you build**, not afterwards.
- **No Claude/Anthropic attribution anywhere** — commits, PRs, file headers.
  Verified clean across all 30 commits.

---

## 16. Voice and copy

Calm, plain, honest about what is simulated.

- Say plainly when something is a prototype or is not wired up. A placeholder
  that mimics a real answer teaches the student to trust something that is not
  there — which is why `AssistantConversation` has no brain and says so, and why
  `providers.ts` marks the request and resume flows **SIMULATED** in place.
- Home's Tasks card carries a line saying ticking arrives next, so a disabled
  checkbox reads as unfinished rather than broken. It goes when 6b lands.
- Empty states are an invitation to act, never "No data". Never a dashed outline.
- "Overdue" alone, not "Overdue by 3 days" beside "3 days ago".
- Counts and timers in mono and tabular, so a row does not reflow.
- Comments explain **why**, not what.

---

## 17. Open loose ends

**Queued and specified, not built — the stat pill popovers.**
Clicking a stat pill opens a popover listing the actual items behind the number:
the overdue tasks, the tasks due today, the events this week. **Click always
works; hover also opens it on desktop.** The items are clickable and jump to the
task or event — **so if the target row is hidden behind "show more", the card
expands and scrolls to it.** That last requirement is the interesting one: it
couples the popover to the collapse state, so `collapseList` and the cards' local
`$state` need a way to be driven from outside. Worth designing before building.

**Phase 6b — task editing:** ticking, undo, rename, priority, notes, due date
editing, drag to reorder, add task. `TaskRow` is read-only with disabled
checkboxes today. `homeGroups.ts` is the read-only half of the Next
`useTaskBoard`; the rest of that hook is what 6b needs.

**Then, in order:** the calendar (15 components, largest surface; needs
`buildScheduleData()`, still unported), appointments, then the **Ask THRIVE
page** — three tabs (chat, class recommender, job recommender), a chat window,
and a **saved chat history rail on the LEFT beside the nav rail**, so two rails sit
side by side. Wired to **Shankar's RAG** later.

**Blocking before any multi-person demo**

1. **The three mock stores are process-global.** §9 defect 1. Concurrent students
   book over each other and see each other's data; everything resets on restart.
   An `adapter-node` process has the same module-scope hazard the Next server had.
   **Django is the fix.**

**Carried**

2. **Provider copies are shallow.** `{ ...version }` shares nested arrays with the
   store. Pinned by a test that says why.
3. **Nothing renders in the test suite.** A component can render the wrong content
   with correct types, correct classes and no page overflow. 6b's editing is the
   first thing that genuinely wants a rendered assertion.
4. **Home fits 1238px, not 1052px.** Accepted.
5. **`escapeKey` has no caller.** Kept for the floating panels and `/ask`.
6. **Three dead providers:** `getSyllabi`, `getResources`, `getCurrentResume`.
7. **`requestTypeHelp` has no consumer** anywhere in the prototype.
8. **The ignore store key-space defect** — Home and the calendar keyed it
   differently. Home is fixed (raw `Event.id`, no prefix stripping); the calendar
   half lands with the calendar.
9. **`thrive:event-joins` is keyed on the calendar item id**, not the raw
   `Event.id` (§9 defect 13). Home's "Count me in" is deliberately visual-only
   rather than writing to a different key.
10. **Two product decisions parked pending real screens:** the missing year in
    `formatShortDate`, and `countdownPhrase` counting to "13 months".
11. **`taskNotes` on `createOverrideStore`?** It duplicates the persistence logic.
12. **Mount `Toast`?** Store is ported and tested; one import.
13. **`format.ts` still emits `"Invalid Date"` from `formatShortDate`.**
14. **A parseable-but-wrong date still gets through** `describeDue`: V8 rolls
    `"2026-02-30"` into March.

---

## 18. Timeline

Release 1 target was **end of August 2026**; a control group was planned for the
**last week of August**. Both dates come from the prototype's `REPORT.md` and
predate the decision to rebuild — **they need re-setting against the rebuild,
which is the largest open planning question.**

Note the interaction with loose end 1: a control group implies concurrent users,
and the process-global stores mean concurrent users see each other's data. Either
Django lands first or the control group is one person at a time.

The prototype's Release 1 scope was: (a) the student dashboard, (b) appointment
scheduling with history/notes/summaries/topic tagging, (c) `/resources` as the
Resource Navigator surface, (d) per-task time estimates. **(a) is now built** —
Home is real, read-only pending 6b. Three were never begun.
