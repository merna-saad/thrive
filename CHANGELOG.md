# CHANGELOG

Dated session summaries, most recent first.

---

## 2026-08-21 — copy-to-list follows the surface that shows it

**HEAD:** `5e6b3d1` · **451 tests** · check 0/0 over 389 files · build clean ·
contrast **58/58** · layout **36/36** · interaction **60/60**

The copy-to-quick-list control worked and persisted, but the quick list lives in
the floating To-do panel behind `FEATURES.floatingTodo`, so the task was copied
somewhere the student cannot see. Gated on that flag — visibility only, nothing
deleted, and flipping one word restores a byte-identical row.

**The control strip is right-anchored now (`ms-auto`).** Above `sm` it already
was; below `sm` it wrapped to its own line LEFT-aligned, so removing the leading
control slid the others 49px left — and expanding a card did the same in reverse.
A pre-existing shift that gating one control exposed. Edit now sits at x=244 on a
phone whether the flag is on or off.

**Measured, not claimed:** phone row heights and page height identical; on
desktop one of four rows is 20px shorter, because the content column gains 46px
and that row's chip line stops wrapping. Card bodies stay 300px.

### What broke

The gate assertion I wrote for this was **vacuous on the first attempt**. It
inferred the flag from the page by looking for a To-do launcher, and the selector
matched the copy button's own accessible name — so it read the thing it was
gating as proof the gate was open, and passed with the guard removed. The flag is
parsed from `features.ts` now.

### Known issues

- With the button hidden, `showToast` has no caller, so the mounted `Toast`
  cannot fire. Coherent (both return on the same flag) but unexercised outside
  its tests.

---

## 2026-08-21 — two follow-ons: honest disclosures, honest links

**HEAD:** `df72ad1` · 2 commits, both pushed · **451 tests, 20 files, all green**
· `svelte-check` 0/0 over 389 files · build clean · contrast **58/58** · layout
**36/36** · interaction **59/59**

### Each show-more control governs its own region

Both disclosures on the Tasks card declared `aria-controls="tasks-card-list"` —
the whole list, including the done group neither of them expands. Each announced
to a screen reader that it expands something it does not, and it had trapped the
interaction gate twice while 6b was being written, because "the control for the
open list" had to be disambiguated by document order.

`#tasks-open-list` and `#tasks-done-list` now exist, each named by exactly one
control. Two new assertions: no two controls claim the same region, and every
claimed region resolves.

### A card links out only when its destination is built

Three of Home's four cards pointed their "View all" at parked routes that render
a title and a note. `isBuiltRoute(href)` asks `primaryNav`, and `SectionCard`
withholds the link when the answer is no — so **building a route restores its
links with no further edit**, and no card carries its own opinion.

Lost their link: Tasks, My Classes, Upcoming Events. Today's classes keeps
`/calendar`.

`isKnownRoute` separates "parked on purpose" from "mistyped", because both fail
`isBuiltRoute` and only one of them should be silent. A dev warning covers the
other.

### Known issues

- Desktop is pixel-identical (bands 67/103px, page 1218px). On a phone the Tasks
  band is 22px shorter — its description regains the link's width and sets on one
  line instead of two. A horizontal reflow, not the button's height.
- `/calendar` keeps its card link while its own body is still a note. It is in
  `primaryNav`, and the rail already links there.

### Next priorities

The calendar. `/classes` is unlikely to be built at all; its route and card stay,
unlinked.

---

## 2026-08-21 — Phase 6b: task editing is live

**HEAD:** `5cdad70` · 4 commits, all pushed · **439 tests, 19 files, all green**
· `svelte-check` 0/0 over 388 files · build clean · contrast **58/58** · layout
**36/36** · interaction **55/55**

### What changed

Everything deferred from 6a. Ticking with undo, inline rename, `PriorityPicker`,
`TaskNotes`, `DueDateEditor`, copy to the quick list, drag and keyboard reorder,
and `AddTaskForm`. The persistence layer already existed from 3b, so this phase
wired the UI to stores that were already built and tested.

New pure module `taskBoard.ts` (the editing half of the Next `useTaskBoard`),
`homeGroups` gained the order overrides, `taskView` gained `rowPriorityLabel`,
and ~60 new strings went into `messages.ts`. `Toast.svelte` was built and mounted
in `AppShell` — its store had shipped in 3b with no consumer, and 6b's
copy-to-list is the first caller.

`+page.svelte` now resolves the task rows ONCE and hands the same array to the
stat pills and to the Tasks card, so an edited due date cannot leave a pill
counting the server's stale answer.

### The undo arrival, settled

One `tick()` is enough — but only because `undoTick` makes every state write,
including expanding the card, before calling `arriveAtRow`. The flush count is
not the mechanism; the ordering is. Measured both ways in a real browser: with
the expansion moved into an effect, the hidden-row case lands nowhere, marks
nothing, and logs **no warning in the production build**. Now a gate assertion,
which is the loud failure that was asked for.

### Bugs found and fixed

- **Every date converter threw a RangeError on a "Needs a date" row.** Latent in
  the Next source and made reachable by 6a surfacing those rows. Reproduced
  against the Next source before fixing.
- **`dragend` on a dropped row read a destroyed block's derived** —
  `derived_inert`, present in the production build with all six gates green.
  Found by dragging by hand; the card now owns drag cleanup.
- **Defect 3 nearly returned twice.** Measured at 375px mid-build: the title box
  was 90px, wrapping over three lines at six characters a line.

### Known issues

- The collapsed Tasks card now scrolls ~124px inside its fixed body: a desktop
  row is 61–81px rather than 54px, because five 44px controls cannot be shorter.
  The grid still cannot move. `COLLAPSED_TASK_ROWS` at 3 would fit — owner's call.
- Reordering is offered only when the card is expanded, since collapsed is a flat
  slice spanning groups and sort keys are read per group.

### Next priorities

`/assignments`, which renders the same `TaskRow` — the first consumer of the
`role="list"` contract the row now requires.

---

## 2026-08-21 — click only, an arrival cue, and check:interaction

**HEAD:** `aadfca9` · 6 commits, all pushed · **389 tests, 18 files, all green**
· `svelte-check` 0/0 over 374 files · build clean · contrast **58/58** · layout
**36/36** · interaction **37/37**.

### What changed

**Hover removed from the stat pill popovers. Click only.** Tried and rejected:
three pills in one row meant a cursor crossing it opened and closed panels nobody
asked for. `openedBy: 'pointer' | 'command' | null` existed only to reconcile the
two ways in, so it collapsed back to `open`. `hoverIntent.ts` deleted with its
only caller. `clickOutside` and `escapeKey` stay.

**The jump is visible.** `arriveAtRow` marks the revealed row with an indigo inset
ring, solid for most of 1200ms then faded. Indigo is the reserved "you are here"
colour; an outline is the one treatment that cannot move the layout, does not
contest the priority wash a task row already carries, and fits both row shapes
from one rule. The ring is declared and the animation only removes it, so
`prefers-reduced-motion` still gets a visible mark that still clears.

**`npm run check:interaction`** — 37 assertions in a real browser, and the first
gate in the repo that can press a button. Verified to fail three ways.

**`designSystem.spec.ts` now scans `.ts`** as well as markup for the treatment
vocabulary, because `.thrive-arrived` is applied from JavaScript.

**`arriveAtRow` promoted to the standard** way anything on Home reaches a row, and
moved to `$lib/arrive`. Splits "I know which row" from "something else has to find
it", and stops DOM code living in a `.svelte.ts` that declares no runes.
CONVENTIONS gains the rule and the two cases that are NOT arrivals. No behaviour
change.

**`arriveAtRow` warns in dev** when the row it was sent to is absent, naming the
id. Not a throw — a student never sees an exception over a wayfinding cue. No gate
covers the branch (the gate drives a production build), so it was verified by hand
against `vite dev`; the gate now fails on console warnings regardless, with a note
at the assertion saying what it cannot see.

**`CONTEXT.md` regenerated in full** at `d3621b9`, then patched in four spots for
the `arrive` split. Sections 5, 6, 7, 13, 14, 15 and 17 all moved.

### Known issues

- `/swatch` does not show the popover or the arrival ring. Left alone by decision:
  it is slated for deletion before Release 1.
- `check:interaction` covers one widget on one page, by decision. Component tests
  in general are still an open question.
- `CONTEXT.md` was patched rather than regenerated for the `arrive` split. Four
  spots, grep-verified, flagged in HANDOFF.

### Next priorities

1. Phase 6b — task editing.
2. Then the calendar, which needs `buildScheduleData()` ported.

---

## 2026-08-21 — the stat pill popovers, and a reveal channel

**HEAD:** `ae48473` · 3 commits, all pushed · **389 tests, 18 files, all green**
· `svelte-check` 0 errors / 0 warnings over 375 files · build clean · contrast
**58/58** · layout **36/36** · 27 browser assertions over the interaction.

### What changed

**The three stat pills on Home now open the list behind the number.** Click
always; hover also, on a device that has a cursor. Items jump to the task or the
event, expanding the card first if the row is collapsed behind "show more".

**A reveal channel, owned by the page.** `$lib/reveal.ts` (pure, tested) plus
`$lib/reveal.svelte.ts` (the channel, in page context). A pill REQUESTS a reveal;
each card decides whether the request is about one of its rows and sets its own
collapse state. No card's state is written from outside, and `ShowMore` is
untouched. Context rather than a module singleton, so collapse still resets on
navigation because of where the channel lives.

**`escapeKey` finally has a caller**, alongside two new siblings:
`clickOutside` (with an `alsoInside` list, because a disclosure's trigger is not
inside its panel but is inside its widget) and `hoverIntent` (which holds the one
`(hover: hover)` gate).

**Upcoming Events gained a show-more, reversing a deliberate decision.** The
events pill counts 21 events this week; the card showed the next four upcoming,
so 17 of the popover's items had no row on the page. Collapsed is still four,
expanded is the week, `/events` is still the rest.

**`weekEventIds` replaced by a `thisWeek` flag on each event row.** Two shapes of
one fact were travelling down; one flag answers both and cannot drift.

**A zero-count pill is not a control** — no button, no `aria-expanded`, nothing
to press.

### Known issues

- **`CONTEXT.md` is stale at `f8593b7`.** It is regenerated in full by rule, not
  patched, so it was left for a deliberate pass rather than half-updated.
- Home's phone height grew 2878 → 2949px: 44px touch targets on the pills plus
  the new footer band. Desktop is unchanged at 1238px.
- Nothing in the popover's interaction is covered by `npm test`, which does not
  render. The 27 browser assertions were a throwaway probe, not a gate.

### Next priorities

1. Regenerate `CONTEXT.md`.
2. Decide whether the browser probe becomes a real gate.
3. Phase 6b — task editing.

---

## 2026-08-21 — Phase 6a, Home; the navy repalette; the nav trim

**HEAD:** `f8593b7` · 10 commits, all pushed · **373 tests, 17 files, all green**
· `svelte-check` 0 errors over 368 files · build clean · contrast **58/58** ·
layout **36/36**.

> Date note: the previous entry and several `app.css` comments are stamped
> 2026-08-22, a day ahead of the real date. Commit hashes are the reliable
> ordering; the dates in this repo are ±1 day.

### What changed

**Design system — repaletted to the campus brand.** Primary moved from forest
green to **UC San Diego navy `#182b49`** (PMS 2767) with **UC San Diego Yellow
`#ffcd00`** (PMS 116) as an accent, both official values from
`brand.ucsd.edu/visual-brand/color`. Gold `#c69214` was measured at 2.79:1 and
rejected. Yellow is 1.50:1 on card, so it is decoration on light surfaces and a
real graphic only against navy (9.45:1) — enforced by three new ceilings rather
than a comment. One reserved colour changed value: `on-track` blue → teal
`#14706b`, because a blue status chip beside a navy button repeats the collision
that moved it off green in the first place.

**The two-face type rule, tightened** to "DM Sans for words, JetBrains Mono for
numbers only", expressed as `.thrive-numeric` and `.thrive-eyebrow`. Mono had
spread to eyebrows, switchers, chips and tags — a face used for a third of the
interface is not an accent.

**The contrast gate now parses `app.css`** instead of mirroring it by hand. That
weakness was load-bearing: 43 assertions were checking the green palette while
the app rendered navy.

**Navigation trimmed to four**: Home, Calendar, Appointments, Ask THRIVE. The
other seven plus Settings moved to a `parkedNav` list no surface renders. `/ask`
added as a placeholder route. The mobile More sheet was removed entirely.

**Phase 6a — Home is built.** `+page.server.ts` awaits six providers in one
`Promise.all` and calls `new Date()` once; every date is classified server-side.
Four cards in a 2×2 grid, ten new UI primitives, nine Home components, a
`messages.ts` module holding every user-facing string.

**The fit-on-one-screen behaviour.** Card bodies take a fixed height on desktop
and scroll inside, so expanding moves nothing; on mobile the cap comes off and
cards push down. Cap derived by driving a real browser, not by arithmetic.

**Two density passes.** Home's header block went 375px → 266px with nothing
removed (strip and greeting merged into one panel, the date onto the greeting's
line, pills and chips into one row). The top bar went 56px → 48px above `lg` via
a media override on `--thrive-topbar-height`, with controls stepping 44px touch →
36px pointer.

**Undated tasks are visible.** An unparseable due date now gets its own group,
first, headed "Needs a date".

### PRs merged

None. All 10 commits went direct to `main`, solo, no review gate.

### Known issues

- **Home fits a 1238px viewport, not 1052px.** The remaining 186px is card rows,
  not density. Decided: do NOT cut rows; "show more" exists for that.
- The three mock stores are still process-global (§9 defect 1, BLOCKING).
- Provider copies are still shallow.
- Upcoming Events scrolls at rest by design (`VISIBLE_EVENTS = 4`).

### Next priorities

Stat pill popovers, then **Phase 6b: task editing** (ticking, undo, rename,
priority, notes, due date, drag to reorder, add task), then the calendar,
appointments, and the Ask THRIVE page.

---

## 2026-08-22 — Phase 5, the data layer

**HEAD:** `0dcca16` · 4 commits, all pushed · **324 tests (277 pre-existing,
unmodified), 12 files, all green** · `svelte-check` 0 errors · build clean ·
contrast 43/43.

### What changed

- **All 25 providers** ported to `frontend/src/lib/data/providers.ts` with
  signatures verified identical to the Next source by mechanical diff, plus
  `SlotUnavailableError`. **Against the same mock fixtures**, not against
  Django — no HTTP client, no API layer, nothing invented against a backend
  that does not exist yet.
- **13 fixture modules** under `data/mock/`. Eight are byte-identical to the
  source; the other five differ only in comments, except `degree.ts`.
- **The three module-level stores** with their lazy seeding, their id
  generators, and the id-collision hazard now documented at the generator
  rather than in a migration doc.
- **`data/latency.ts`** — the 120ms delay behind `setMockLatencyMs`, which can
  be set to 0. Kept, not deleted: it exists so a route that forgot its loading
  state looks wrong in development instead of only in production.
- **`data/labels.ts`** — `requestTypeLabel` / `requestTypeHelp` moved onto the
  public side of the boundary.
- **`stubProviders.ts` deleted.** The root `+layout.server.ts` changed one
  import path and nothing else.
- **`providers.spec.ts`** — 47 tests.

### Four §9 defects fixed rather than reproduced

| # | Defect | Fix |
|---|---|---|
| 8 | `cancelAppointment` released a slot by matching start time | `Appointment.slotId`; the release is one exact delete |
| 11 | `degree/requests/page.tsx` imported a label map from `lib/data/mock/requests` | Both maps moved to `data/labels.ts` |
| 15 | Four providers returned fixtures by reference | All 25 return copies |
| 9 | `DegreeProgress.expectedCompletion` hardcoded "Spring 2027" vs a derived Fall 2027 | Field dropped from the type and the fixture |

### Known issues

- **§9 defect 1 (BLOCKING) is inherited intact.** The stores are process-global.
  Django is the fix; an `adapter-node` process has the same hazard.
- **Copies are shallow.** Pushing onto a returned version's nested `skills`
  array still reaches the store. Pinned by a test that says so.
- **§2 overstates `buildSlotsFor` determinism.** Availability folds in a clock
  read. Documented at the function.
- **`requestTypeHelp` has no consumer** anywhere in the Next tree.

### Next priorities

`buildScheduleData()` — the five providers it needs now exist. Then the route
`load` functions and the view models.

---

## 2026-08-21 — repo created, SvelteKit port through Phase 4

### What changed

- **`MIGRATION.md`** — inventoried the frozen Next prototype at `4e0a65b`. 1,449
  lines, nine sections: routes, all 25 providers, date handling, 75 components,
  the design system, 14 stores, all 83 tests, React-specific decisions, and ten
  known defects.
- **Repo created** — `rsm-msaad/thrive`, private. Monorepo layout: `frontend/`,
  `backend/` (empty), `scripts/`.
- **Phase 1** — SvelteKit scaffold (Svelte 5 runes, TS strict, `adapter-node`,
  Tailwind v4, Vitest) and the design system ported to `app.css`. Fonts
  self-hosted via `@fontsource`. `/swatch` built as a visual diff target.
- **Phase 2** — the pure logic and all 83 tests. `localDayKey` collapsed into
  `dayKeyOf(value: Date | string)`. `CONVENTIONS.md` written.
- **Phase 3a** — 73 tests for `format.ts`, which had none.
- **Phase 3a-fix** — input guards on `describeDue` and `formatClockTime`.
  `DueDescriptor` became a 4-state discriminated union.
- **Phase 3b** — the browser persistence layer ported to Svelte 5 runes. 102
  tests pinning four properties.
- **Phase 4** — app shell, navigation, root layout, 13 routes.
  `hydrateStores()` wired. Floating widgets gated behind `FEATURES`.

### Commits merged

13, all direct to `main`, no PRs (solo, no review gate yet):

```
93d921d chore: repo skeleton, the migration map, and the palette gate
dec84d4 feat: scaffold the SvelteKit frontend
1d7932b feat: port the design system from the Next app
8e5b395 feat: port the domain types and the pure calendar logic
336b555 test: port all 83 pure-logic tests
be4d545 docs: state the timestamp rule that the framework no longer enforces
4215885 test: cover format.ts, describeDue above all
adf11d0 fix: guard describeDue and formatClockTime against malformed input
4812f4b feat: port the browser persistence layer to Svelte 5 runes
89d4311 test: pin the four store properties, and record an ignore-store defect
83e18ce feat: nav config, feature flags, and the shell's supporting modules
33d7a72 feat: app shell, root layout, and the one store hydration point
b0f7c3b feat: a route for every nav destination
```

### Gates

| Gate | Result |
|---|---|
| `npm test` | **277 passed** (11 files) |
| `npm run check` | **302 files, 0 errors, 0 warnings** |
| `npm run build` | clean, `adapter-node` |
| `scripts/check-contrast.py` | **43/43** |
| Timezone sweep | 277 passed in 7 zones, UTC+14 → UTC−11 |

### Known issues

- **Ignore store key-space split.** Home and the calendar key it differently, so
  ignoring an event on one surface does not affect the other. Pre-existing in the
  prototype; found by a new cross-surface test. Recorded as a defect test, not
  fixed — the canonical key affects already-stored data.
- **An `urgency: "unknown"` row matches no group** in a list grouped by
  overdue/today/upcoming. Accepted: the discriminated union turns it into a
  compile error rather than a silent drop.
- **A parseable-but-wrong date still passes `describeDue`** — V8 rolls
  `"2026-02-30"` into March rather than rejecting it.
- **`formatShortDate` can still emit `"Invalid Date"`** — the last unguarded
  function in `format.ts`.
- **No year in `formatShortDate` / `fullLabel`**, and `countdownPhrase` counts to
  "13 months". Both parked as product decisions pending real screens.

### Next priorities

1. Phase 5 — the 25 data providers, against Django.
2. Shared primitives (`Button`, `Card`, `Tag`, …), built at the correct border
   weight rather than inheriting the prototype's 20 `border-2` call sites.
3. Decide the ignore store's canonical key, fix it, promote the defect tests.
4. Re-set Release 1 scope and dates against the rebuild.
