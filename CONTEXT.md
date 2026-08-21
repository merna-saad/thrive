<!-- updated-at: d3621b9 -->

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
    ├── check-contrast.py       58 assertions over the palette and app.css
    ├── check-layout.mjs        12 routes x 3 viewports, in a real browser
    └── check-interaction.mjs   37 assertions on the stat pill popovers
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
§4 lists the Radix primitives that will need equivalents. The stat pill popover
is the first floating widget built by hand rather than deferred to one of them —
see §13.

**One dependency added since Phase 1: `playwright-core`** (2026-08-21), for the
layout gate. It now carries the interaction gate as well, which is the whole
argument for having added it rather than measuring by hand: the second gate cost
nothing. `@types/node` was rejected in Phase 5 because
`import.meta.glob(..., { query: "?raw" })` did that job with nothing added — the
rule is "do not add one where the platform already answers", not "never add one".
See DEPENDENCIES.md.

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
| 6a | Home — the page, four cards, fit-on-one-screen | done |
| — | **Stat pill popovers, the reveal channel, `check:interaction`** | **done** |
| **next** | **6b — task editing** | not started |
| then | The calendar (15 components, largest surface) | not started |
| then | Appointments | not started |
| then | The Ask THRIVE page | not started |
| later | Floating widgets, behind `FEATURES` | not started |

**389 tests, 18 spec files, all passing.** `svelte-check` clean over 374 files.
Build clean. Contrast **58/58**. Layout **36/36**. Interaction **37/37**.
38 commits, all pushed.

**120 files under `frontend/src`** — ~16,894 lines, 11,978 source / 4,916 test.

---

## 6. The design system

`frontend/src/app.css` is the single source of truth. **Never hardcode a colour,
size, radius, or duration in a component.** `designSystem.spec.ts` fails the
build on a hex or a font name in markup — and, since 2026-08-21, on a
`.thrive-*` class used from TypeScript that `app.css` does not define.

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

**`indigo` has two consumers now, and they are the same sentence.** "You are
here" in the navigation, and `.thrive-arrived` — the ring on a row a stat pill's
popover has just jumped to. An arrival cue *is* "this is where you are now", so
this widened indigo's use without weakening its meaning. Anything else wanting
indigo has to make that same argument.

**`on-track` is the only reserved colour whose value has changed.** It moved off
green on 08-15 because green had become "an action you can take" and a green chip
beside a green button read as one signal. A blue chip beside a **navy** button is
that same collision, so it moved again, to teal. 5.90:1 on card, 2.40:1 against
navy — far enough apart to be a different statement rather than a lighter navy.

### Surfaces, ink, lines

Surfaces `bg #faf9f5` cream / `surface #fff` / `sunken #f1efea` (also the row
hover fill). Ink `ink #17181c`, `body #3a3b42`, `muted #6b6c72`,
`faint #85868c` — **only the first three may carry text**, and `faint` is held
below 4.5:1 by a ceiling so words placed in it fail a check.

**A 1px decorative hairline and a 1.5px control boundary are different things,
carried by different tokens, and must never collapse.** Control boundaries owe
3:1 under WCAG 1.4.11 because the boundary is the only thing marking where the
control is. Only `.thrive-checkbox` and `--input` consume the 1.5px stroke.

**There is now a third ring width, and it is deliberately not either of those.**
`--thrive-arrival-ring: 2px` matches the focus ring in the base layer, because
both draw a ring around something you have just arrived at and two ring weights
would read as two kinds of thing. It is not the 1.5px control stroke: that one
exists because a control's boundary is the only thing saying where the control
is, and a row is not a control.

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

### The component classes

Eight, and each exists because Tailwind cannot express it at the call site:
`.thrive-numeric`, `.thrive-eyebrow`, `.thrive-panel`, `.thrive-row`,
`.thrive-checkbox`, `.thrive-strike`, `.thrive-card-body`, `.thrive-popover`,
`.thrive-arrived`.

- **`.thrive-popover`** carries only a WIDTH:
  `min(--thrive-popover-width, 100vw - 2 * --thrive-popover-viewport-inset)`. The
  clamp is what stops a pill near the right edge opening a panel off the screen.
  Not a `max-width`, or three pills would open three different-width lists. Its
  surface, hairline and radius are ordinary utilities.
- **`.thrive-arrived`** is the arrival ring. See §13.

### Durations: motion versus dwell

Three motion tokens (120/160/260ms) are **transition lengths** — how fast a thing
changes. `--thrive-arrival-duration: 1200ms` and the toast's 3000ms are
**dwells** — how long a state persists. They are different kinds of number and
must not share a token: reusing `--thrive-motion-slow` for the arrival mark would
have tied the fade's speed to how long the mark lasts, and the next person to tune
one would silently retune the other.

`reveal.svelte.ts` READS `--thrive-arrival-duration` from the computed root style
rather than repeating it, so the timer that removes the mark and the animation
that fades it cannot drift apart — and 1200ms stays a design-system value rather
than becoming a number in a TypeScript file. `check-interaction.mjs` reads the
same token for the same reason.

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
Release 1. It does **not** yet show the popover or the arrival ring.

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
- **The week window is a date question and is answered on the server.** Each
  `EventRowData` carries a `thisWeek` boolean, not an ISO string the client
  compares — see §13.

**Nothing enforces this, and that is the point of writing it down.** In Next the
`"use client"` boundary enforced it at compile time. SvelteKit has no such wall:
a component can `import { describeDue }` and call it with no `now`, and the
default parameter is `new Date()`, so it compiles, renders something plausible,
and is wrong in another timezone. **Review is the enforcement.**

### The sanctioned client reads

One clock read: **`nowMinutes()`** in `calendarSources.ts` — minutes past
midnight, for the calendar's "next up" line. Called from a handler or a memo,
never during a server render, and only when the selected day *is* today.

**`matchesWide()`** in the floating-panel geometry is listed as the second, and is
**not ported yet** — the floating panels are a later phase.

**A `matchMedia` read briefly existed and is gone.** `hoverIntent` read
`(hover: hover)` for the popovers' hover opener; hover was removed from that
interaction and the action was deleted with it. Hover-to-reveal in this app is
CSS — Tailwind's `hover:` utilities, which compile to `@media (hover: hover)` with
no JavaScript needing an opinion.

Anything else reading the clock on the client is a bug until argued otherwise in
review.

### `describeDue` has four states, not three

`DueDescriptor` is a **discriminated union**: `overdue | today | upcoming` plus
`unknown` for a date that will not parse, which carries `days: null` rather than
`NaN`. **`NaN` is a `number` to the type system** and flows silently into
`a.days - b.days`; `null` does not typecheck there, so a caller must narrow.

**`unknown` is deliberately NOT in `DueUrgency`** — "how urgent is it" has no
answer for a date that does not exist.

**Where an unknown row goes is decided** (2026-08-21): its own group, **first in
the list**, headed "Needs a date". Loud is correct, invisible is not — a deadline
that silently does not exist is worse than one shouting for attention, and it is
the only group a student can actually fix. It is not tinted `urgent`: that tone is
reserved for real deadlines, and a missing date is a data problem. Being first
also means it survives the collapse to four rows on a capped card.

That ordering has a second consequence, discovered while building the popovers:
four undated rows fill the collapsed slice on their own and push the overdue task
— the one the coral pill is counting — off screen. That is the realistic path
through the reveal machinery in §13, and `reveal.spec.ts` pins it.

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
`eventIdOf()` is for calendar ITEM ids (`evt-evt-3-1`), a different key space Home
never touches. Calling it there would be normalising something already normal —
which is how a second normaliser gets added, and §9 defect 12 is what happens
next. The reveal targets in §13 hold raw ids for the same reason, and
`reveal.spec.ts` asserts they pass through untouched.

### What is deliberately NOT persisted

Card collapse state, and the reveal channel that can drive it. See §13 — the
non-persistence is structural, not a `reset()` somebody remembers to call.

### `.svelte.ts` is not decoration

Svelte only processes runes in `.svelte.js` / `.svelte.ts`. A plain `.ts` with
`$state` is **silently inert**. Six files carry the suffix: `overrideStore`,
`userEdits`, `taskNotes`, `toast`, `ignoreUndo`, `reveal`.

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

**The reveal channel is deliberately NOT a module singleton**, and it is the one
place that pattern was rejected — see §13.

---

## 10. The shell

`frontend/src/lib/components/shell/` — `AppShell`, `SideRail`, `TopBar`,
`BottomNav`.

- **`nav.ts` is the single source** for the rail and the bottom bar.
  `PagePlaceholder` looks its own `href` up and **throws** when there is no
  match, which is what makes that a guarantee rather than an intention.
- **The top bar is 48px above `lg`, 56px below.** The CONTROLS change size — 44px
  touch, 36px pointer — and the bar's height follows from them. WCAG 2.5.5 asks
  44px of a touch target and 2.5.8 asks 24px of a pointer one. The stat pills
  follow the same pair (`min-h-11 lg:min-h-9`), including the inert zero one.
- **`--thrive-page-gutter-bottom`** is the page's bottom breathing room, used
  twice: on mobile added to the bottom nav's height (that bar is fixed *over* the
  page), and above `lg` it is the whole padding.
- **Icons are component references held as values**, rendered via
  `{@const Icon = item.icon}`. Not `<svelte:component>`, deprecated in Svelte 5.
- **Accessibility:** skip link, `main` landmark with `tabindex="-1"`, exactly one
  `nav` landmark in the a11y tree at a time, `aria-current="page"` on the active
  item.

### The three actions

`frontend/src/lib/actions/` — Svelte actions rather than translated `useEffect`s.
The shared shape is that **the listener's lifetime is the element's**: put one on
something inside an `{#if open}` and it exists exactly when the thing it dismisses
does, so there is no open state to keep a listener in step with.

| Action | Role |
|---|---|
| `escapeKey` | Escape-to-dismiss. **Has a caller since 2026-08-21** — `StatPopover` |
| `clickOutside` | Capture-phase `pointerdown`, with an `alsoInside` list |

`clickOutside` takes `alsoInside` because a disclosure's own trigger is not inside
its panel but *is* inside its widget. Without it, pressing the trigger to close
fires the dismissal, the panel unmounts, and the trigger's own click reopens what
was just dismissed — a button that visibly refuses to close.

**`hoverIntent` existed and was deleted**, same day. It held the one
`(hover: hover)` gate for the popovers' hover opener. When hover came out of that
interaction it had no caller, and it was deleted rather than parked: nothing queued
has a hover-reveal requirement that Tailwind's `hover:` utilities do not already
cover. See §15.

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
is worse than no button.

**`/events` is still parked and is still load-bearing in the copy.** Home's
Upcoming Events card says the rest of the list is there, and its "View all" points
at it. Unparking it is a separate decision from the one in §13.

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

### The fixture's shape, measured

Numbers worth knowing, because two design decisions rest on them: **10 tasks**
(8 open, 2 done — 1 overdue, 2 due today, 5 upcoming), and **159 upcoming events,
21 of them inside seven days**, generated 2–4 per day across a rolling horizon.
That 21-against-4 is what forced the events card decision in §13.

---

## 13. Home

The one fully-built page, and the only route that reads more than `getStudent()`.

`+page.server.ts` awaits **six providers in one `Promise.all`** and calls
`new Date()` once. Four cards in a **2×2 grid** at `lg`, one column below it.

**What is deliberately not computed on the server:** the three stat counts. They
have to see the student's persisted ticks and ignores, which only exist in the
browser — counting them server-side freezes them at the fixture's answer and lets
the pills contradict the cards beneath them. What goes down is the classified rows
and, on each event row, a `thisWeek` flag: the data to count, not the count.

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

**That fixed height is what makes the reveal machinery below safe.** Expanding a
card to show a hidden row cannot move the grid, and nothing had to be added to
guarantee it. `check-interaction` asserts all four bodies are still one height
after a reveal.

### Tasks is flat when collapsed, grouped when expanded

The one real design decision in 6a, and it came from measuring. The card carried
~190px of fixed furniture — progress bar, three group headings, Done heading,
section gaps — before its first row, three and a half rows' worth. At any cap that
let the grid fit a laptop it showed one task.

So the progress bar moved into the header band (outside the scroll area) and the
collapsed view shows a flat list of the next four things with no headings. Nothing
is lost: every row already states its own urgency in its labels. Headings come
back on expand, where they earn their height.

### The stat pill popovers

Each of the three pills opens a popover listing the actual items behind its
number. Items are clickable and jump to the task or event on the page.

**Click, and only click.** Hover-to-open was built, gated on `(hover: hover)`,
tried, and **rejected**: three pills sit in one row, so a cursor crossing that row
opened and closed panels nobody asked for. The panel that appears where you are
not looking is noise; the panel that vanishes as you reach for it is worse.
Pressing the pill again closes it.

**A count of zero is not a control.** No button, no `aria-expanded`, nothing to
press — the pill renders as the plain chip it always was. `statTones.calm` already
existed so "0 overdue" does not read as an alarm; this is the same idea applied to
the interaction, and `aria-expanded="false"` on something that can never expand is
simply untrue. It keeps `min-h-11` so a row of pills is never two heights.

**The count and the list are one expression.** Each pill's number is
`items.length` of the list it opens, so a pill saying 3 and opening a list of 2 is
not expressible — the same contradiction the client-side counting exists to
prevent, one level down.

**A list, not a menu.** `role="menu"` brings a single tab stop and Tab-to-exit,
which is right for a command menu and wrong for jump targets. Every item is an
ordinary tab stop; Arrow, Home and End are a convenience on top.

**Dismissal has one focus rule:** restore focus to the pill **if and only if**
focus is currently inside the panel. That covers Escape, a pointer down outside,
and focus leaving the widget. Choosing an item is the named exception — focus is
about to land on the revealed row, so it must not be pulled back on the way. Focus
follows the jump, not the dismissal.

`aria-controls` names an id that is absent while the popover is closed. **That
deviation is accepted** (2026-08-21): the alternative is a permanently mounted
panel and two permanently mounted document listeners per pill, which is exactly
what the action lifetimes in §10 exist to avoid.

### The reveal channel: the page owns the intent, the cards own their state

Jumping to an item couples the popover to a card's collapse state, and the shape
chosen for that coupling is the piece of design worth reading.

- **`$lib/reveal.ts`** is pure and tested. `planReveal(ids, limit, targetId)` is
  the one question a card asks: do I hold this row, and is it past my collapsed
  slice. `found: false` is kept distinct from "found, and already visible".
- **`$lib/reveal.svelte.ts`** carries the request. A popover calls
  `reveal.request({ kind, id })` and knows nothing else. Each card reads the
  channel, asks `planReveal` about its **own** list, and if the answer is "mine,
  and hidden" sets its **own** `$state`. Nothing outside a card ever writes a
  card's state, and `ShowMore` is untouched — this is a second way to open a card,
  not a replacement for the first.

**Rejected alternatives:** lifting all four cards' collapse into a page-level
store (inverts ownership for four cards to serve one feature), prop-drilling the
channel (three components in between have no interest in it), and a `<details>`
disclosure (the show-more control lives in the footer band, outside the disclosure
content).

**The channel lives in page CONTEXT, not at module scope.** That is what keeps
"collapse resets on navigation" true because of where the channel lives rather
than because something remembers to reset it. A module-level `$state` would
survive a client-side navigation and quietly reopen a card on the way back. This
is the one place the module-singleton pattern of §9 was rejected.

**The nonce is load-bearing.** Two clicks on the same item are two requests, and
with only a target in the slot the second write is `target === target` and Svelte
makes it a no-op — precisely the click a student makes when the first one did not
seem to work. It also lets each card be idempotent by remembering the last nonce
it handled, so no card has to clear the slot on the others' behalf and effect
ordering never decides who saw the request.

**Each card's effect reads its full list, never its collapse state.** The collapse
states derive from the variable the effect writes, so reading one would make the
write re-run the effect.

### Arriving has to be visible

Focus moved and the row scrolled into view, which is correct and **completely
invisible** — everything on Home is already on one page, so a student choosing
"Submit peer review" saw nothing change and concluded the click had failed. The
focus ring is not the answer: a pointer user does not get one.

So **`arriveAtRow`** (`$lib/arrive`) focuses the row, scrolls it with
`block: 'nearest'`, and marks it with **`.thrive-arrived`** — an indigo ring, solid
for most of a 1200ms beat and then faded out.

**It is the standard way anything on Home moves a student to a row**, decided
2026-08-21 rather than left as the popovers' private helper. 6b's undo returning
to a task just ticked, and the calendar's "next up" pointing at the item it names,
both want exactly this — and two arrival treatments on one page would be worse
than either alone, because a student learns the cue once. CONVENTIONS states the
rule and what a caller owes it. **Not every focus move is an arrival:** navigation
inside a widget is not, and neither is focus recovery onto a container after the
row it was on stopped existing.

`$lib/arrive` is a plain `.ts` and declares no runes. Asking is the separate half:
`$lib/reveal.svelte` is the channel a surface writes into when it cannot know
which card owns the row, and the card that answers calls `arriveAtRow` itself.

- **Indigo** because indigo is the reserved "this is where you are now" colour and
  an arrival cue is that sentence exactly. Not coral: nothing has gone wrong. Not
  yellow: it cannot carry a signal alone on cream.
- **An outline**, for three reasons that are all about not fighting anything. It
  cannot move the layout. It does not collide with what the rows already use — a
  task row carries priority in a background wash and a left border, and an
  animated background would either lose the cascade to `bg-urgent-soft` or paint
  over the priority that wash exists to state. And it follows the element's own
  `border-radius`, so one rule fits a task row at `radius-lg` and an event row at
  `radius-xl` with nothing per-shape.
- **The ring is a normal declaration and the animation only takes it away.** That
  reads backwards until you see the global reduced-motion block, which forces
  `animation-duration: 0.01ms !important` on everything — a mark *painted* by a
  keyframe would appear and vanish within a hundredth of a millisecond. Declared,
  plus `animation: none` under reduced motion, leaves the ring on and still
  cleared on the beat by the timer.
- **Exactly one row is ever marked.** Any previous mark is cleared first; two
  rings would read as two selections, and this is not a selection.
- **Jumping twice to the same row forces a reflow** between the class removal and
  the re-add, or the browser never sees a change and the animation does not
  restart.
- **The mark is unconditional**, including for a row that needed no scrolling —
  that is exactly the case where nothing moves and the cue is the only feedback
  there is.

Focus behaviour is unchanged and the mark is additive. The accessible answer and
the visual one are different channels for different people.

### Upcoming Events: collapsed is four, expanded is this week

This card had no show-more at all, on the standing grounds that Home shows the
next four and `/events` is the rest. **The popover overturned that, and the reason
was measured rather than preferred:** the events pill counts events *this week* —
21 against the fixture — while the card showed four *upcoming*, so seventeen of the
items in that popover had no row on this page to jump to. A list of jumps that
mostly cannot jump is worse than no list.

The fix rests on both sets being **prefixes of the same list**. `getEvents()`
returns upcoming events ascending by start and the ignore filter preserves order,
so "the first four" and "everything within seven days" are both prefixes, and the
union of two prefixes is the longer one. `expandedEventLimit(collapsedLimit,
weekCount)` returns `max` of the two, and a test asserts the prefix property
rather than trusting it.

The `max` is not decoration: on a quiet week the week count is *shorter* than the
collapsed slice, and expanding to it would remove rows the card already shows.
Holding the floor at four means a quiet week has nothing to expand and the card
behaves exactly as it did before any of this.

**The pill and the card are now two views of one set**, which is the same property
the client-side counting protects: they cannot disagree.

The show-more sits in the card's footer band rather than its body, because this
card scrolls at rest and a control inside the scroll area is unreachable exactly
when it is wanted. It is passed to `SectionCard` **only when there is something to
reveal** — the footer draws its own rule and padding, so an always-supplied
snippet that renders nothing leaves an empty ruled strip.

**Filter FIRST, then slice**, unchanged and still the behaviour: ignored events
are removed before the slice, which is what makes the next event move up instead
of leaving a gap.

### Measured heights

Header block **375px → 266px** during the 6a density pass. Document
**1392px → 1238px**.

**Home fits a 1238px viewport whole** and has not moved since — the fixed card cap
absorbed everything the popovers added. It does not fit 1052px, and the decision
(2026-08-21) is **do not cut card rows**: two task rows would make the card
useless, and "show more" exists for exactly that.

**The phone grew 2878px → 2949px** when the popovers landed: 44px touch targets on
all three pills, plus the new footer band on Upcoming Events. Accepted.

### Strings

**`$lib/messages` holds every user-facing string.** English only, no library, no
locale switching — this is not i18n, it is what makes i18n possible later without
a rewrite. Nested by surface, and **anything carrying a value is a function**, not
a template assembled at the call site: `showMore(count)` lets a translation move
the number, `{count} more` in markup bakes English word order in.

`stats.listLabel(count, label)` is the clearest case for the rule: the pill's own
label is already a separate string, so a language that puts the count after the
noun, or inflects the noun on the count, has one place to say so. Assembling it in
markup would have baked English order into three components.

Three entries are split in half — the timeline percentage, the course card's
"Next:", and the units chip — because the value is styled differently from the
words around it. All of them say so, and all name the limitation: the value comes
first.

**This is a standing rule, not a Home thing.** Every surface extracts its strings
as it is built, or Mandarin stops being possible.

---

## 14. The gates

| Command | What it proves |
|---|---|
| `npm test` | 389 tests. Pure logic and source scans. **Nothing renders.** |
| `npm run check` | Types agree. **Does NOT prove the page renders** |
| `npm run build` | It compiles |
| `python3 scripts/check-contrast.py` | 58 assertions: 42 pairs, 6 ceilings, 10 structural |
| `npm run check:layout` | 12 routes × 3 viewports in a real browser |
| `npm run check:interaction` | 37 assertions on the stat pill popovers, in a real browser |

**Three properties every gate here has:** it measures the thing rather than a
model of it; it reads its inputs from the source of truth; and it has been
**verified to fail** on the bug it was written for.

**`check-contrast.py` parses `app.css`** rather than mirroring it. That weakness
was load-bearing during the repalette: 43 assertions were checking green values
while the app rendered navy, and it would have reported 43/43 throughout.
`color-mix()` is deliberately not evaluated and the unresolved tokens are listed.

**`check:layout` asserts the page cannot scroll further than it paints.** It does
**not** use `documentElement.scrollHeight` — that is the property that reported
1275px while nothing rendered below 1238px. It scrolls the page and reads where it
landed.

**`check:interaction` exists because the other five were all green on a version
where pressing a pill did nothing at all.** Hover had already opened the panel, so
the click found it open and closed it again. None of the other gates can press a
button. It reads `--thrive-arrival-duration` from the running page rather than
repeating it, and it knows no fixture ids — the task ids it ticks to force a zero
count are discovered by choosing the popover's own items and reading where focus
landed. Verified to fail three ways: hover reintroduced (6 red, including the
original bug), the arrival mark not applied (4 red), the mark never cleared
(2 red). One check reports **SKIP** rather than passing when the fixture cannot
produce a reveal target past a collapsed slice, because silent degradation to a
weaker assertion is how a gate stops meaning anything.

Both browser gates **skip loudly and exit 0** when there is no chromium. A gate
that cries wolf gets ignored.

**`npm run check` is not a render.** `svelte-check` passed 0 errors on a component
that threw `ReferenceError` on every request — a prop was in the type but not the
destructuring, and an unknown identifier in a Svelte template is not a type error.

---

## 15. Standing decisions

- **The old repo is read-only.** Verified untouched after every phase.
- **Django is not being written here**, and the port does not anticipate it beyond
  the provider signatures.
- **Measure layout in a real browser.** Never reason about pixels.
- **Drive interaction in a real browser too.** Types, tests, contrast and layout
  were all green on a dead button. Anything a person presses gets pressed by a
  gate.
- **A gate must be verified to fail** on the thing it guards, by breaking that
  thing on purpose and watching it go red.
- **A control with two ways in has more states than it has booleans.** If two
  input methods can produce the same visible state, the state has to record which
  one produced it — or the second method will undo the first. This is why
  `openedBy` existed; when hover went, the extra state went with it rather than
  being left as branches that can only take one value.
- **Delete an abstraction that loses its last caller**, unless a specific named
  surface wants it. `hoverIntent` went the day hover did. `escapeKey` was kept
  through Phase 4 with no caller and that was the right call — but it was kept
  against two named surfaces, not against the general chance that something might.
- **Durations are either motion or dwell**, and they do not share tokens.
- **Moving a student to a row goes through `arriveAtRow`.** One function, never a
  hand-rolled `scrollIntoView`. Two arrival treatments on one page is worse than
  either of them, because the cue is learned once.
- **A silent no-op is the worst failure mode this app has.** It is what made the
  reveal read as a dead click, it is what an id-parsing row lookup did before
  `tickItem` dispatched on the attached source row, and it is what a hover-swallowed
  press looked like. Where a courtesy can silently not happen, prefer it failing
  loudly — and where it currently cannot, say so at the definition. `arriveAtRow`
  is the worked example: it still returns rather than throwing at a student, but it
  warns in development.
- **Say when a check cannot see what it looks like it checks.** The gate fails on
  console warnings, which reads as covering the one above — it does not, because
  the gate drives a production build. Written into the gate at the assertion, not
  only in a doc, because a check that appears to cover something it cannot is worse
  than no check.
- **Full CONTEXT regeneration is for accumulated drift across a session**, not for
  a four-spot delta inside one. Confirmed by the owner 2026-08-21 after this file
  was patched thirty minutes after being written. The rule stands for the normal
  case.
- **`@lucide/svelte`, not `lucide-svelte`** (the latter is pinned to Svelte 3/4).
- **`cn()` survives** for the `class`-override case only.
- **Vitest in Node, no jsdom.** Matches the prototype, where rendering was
  deliberately never tested.
- **Probe before asserting.** Test suites are written against observed output from
  a throwaway probe, not assumed behaviour. That includes a probe's own selectors:
  three checks failed on correct code because `ShowMore` also carries
  `aria-expanded`, and the instinct was to change the product.
- **Diff a port, do not review it.** Signatures grepped and compared; bodies
  diffed comments-stripped.
- **Any test asserting an absence needs a companion assertion that it can still
  see a presence.**
- **Keep a test's seam on the test's side of the wall** where possible. A
  test-only export is permanent.
- **Extract strings as you build**, not afterwards.
- **No Claude/Anthropic attribution anywhere** — commits, PRs, file headers.
  Verified clean across all 38 commits.

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
- **Feedback beats correctness.** A jump that works and shows nothing reads as a
  failure. If an action changes state the student cannot see, it needs a cue.
- Comments explain **why**, not what.

---

## 17. Open loose ends

**Blocking before any multi-person demo**

1. **The three mock stores are process-global.** §9 defect 1. Concurrent students
   book over each other and see each other's data; everything resets on restart.
   An `adapter-node` process has the same module-scope hazard the Next server had.
   **Django is the fix.**

**Next up**

2. **Phase 6b — task editing:** ticking, undo, rename, priority, notes, due date
   editing, drag to reorder, add task. `TaskRow` is read-only with disabled
   checkboxes today and a footer line saying so; that line goes when 6b lands.
   `homeGroups.ts` is the read-only half of the Next `useTaskBoard`; the rest of
   that hook is what 6b needs. The done-group branch in `TasksCard`'s reveal
   effect is unreachable from Home today — no pill counts a done task — and was
   built because 6b's undo wants exactly that path.

   **And `arriveAtRow`'s single `tick()` needs checking there.** Unticking moves a
   task between groups; if that regrouping takes two flushes, the arrival lands on
   a row that does not exist yet and does nothing — no mark, no focus move. That is
   the failure the cue exists to prevent, arriving by another route. Decided
   2026-08-21: check it explicitly in 6b, and if one tick is not enough, **make it
   fail loudly rather than quietly.**

   A dev-only `console.warn` now names the missing id, so the case is audible
   before it is understood. **No gate covers that branch** — `check:interaction`
   drives the production build, where it is compiled out — so it was verified by
   hand against `vite dev`.
3. **Then, in order:** the calendar (15 components, largest surface; needs
   `buildScheduleData()`, still unported), appointments, then the **Ask THRIVE
   page** — three tabs (chat, class recommender, job recommender), a chat window,
   and a **saved chat history rail on the LEFT beside the nav rail**, so two rails
   sit side by side. Wired to **Shankar's RAG** later.

**Carried**

4. **Provider copies are shallow.** `{ ...version }` shares nested arrays with the
   store. Pinned by a test that says why.
5. **`npm test` renders nothing.** A component can render the wrong content with
   correct types, correct classes and no page overflow. `check:interaction` closes
   this for one widget on one page; it is not a general answer, and 6b's editing
   is the next thing that genuinely wants a rendered assertion.
6. **Home fits 1238px, not 1052px.** Accepted. Phone is 2949px.
7. **Three dead providers:** `getSyllabi`, `getResources`, `getCurrentResume`.
8. **`requestTypeHelp` has no consumer** anywhere in the prototype.
9. **The ignore store key-space defect** — Home and the calendar keyed it
   differently. Home is fixed (raw `Event.id`, no prefix stripping); the calendar
   half lands with the calendar.
10. **`thrive:event-joins` is keyed on the calendar item id**, not the raw
    `Event.id` (§9 defect 13). Home's "Count me in" is deliberately visual-only
    rather than writing to a different key.
11. **Two product decisions parked pending real screens:** the missing year in
    `formatShortDate`, and `countdownPhrase` counting to "13 months".
12. **`taskNotes` on `createOverrideStore`?** It duplicates the persistence logic.
13. **Mount `Toast`?** Store is ported and tested; one import.
14. **`format.ts` still emits `"Invalid Date"` from `formatShortDate`.**
15. **A parseable-but-wrong date still gets through** `describeDue`: V8 rolls
    `"2026-02-30"` into March.
16. **`/swatch` does not show the popover or the arrival ring.** It is the design
    system's display page and two treatments are now missing from it. Small, and
    it is throwaway anyway.
17. **The calendar's "next up" uses `arriveAtRow` directly**, not the reveal
    channel — it knows its own item, so there is nothing to ask. **Unless** it has
    to reach a row inside a collapsed day group, which is the channel's shape
    again. Decided 2026-08-21: settle it when the calendar lands, not before.
18. **`matchesWide()` is still unported** — listed in CONVENTIONS as a sanctioned
    client read for a surface that does not exist yet.
19. **21 items is a long popover.** It scrolls at `max-h-60`. Decision
    (2026-08-21): **keep the honest number**, revisit a cap with a "see all in
    /events" tail only if the list gets very long.

**Closed since the last regeneration**

- `escapeKey` has a caller. It is `StatPopover`.
- `CONTEXT.md` was stale at `f8593b7`. This regeneration is the fix.
- The stat pill popovers were "queued, specified, not built". They are built.
- "Should the browser probe become a gate?" — yes, it did.

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
