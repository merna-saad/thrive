# HANDOFF

Session log, newest first. What happened, what was decided, what is still open.

---

## 2026-08-21 — the stat pill popovers

**HEAD:** `ae48473` · 3 commits, all pushed · 389 tests green.

### What was done

The loose end the previous entry called "queued, specified, NOT built". Designed
before building, as that entry asked, and the design is the part worth reading.

**The shape: the page owns an intent, the cards own their state.** A pill's
popover calls `reveal.request({ kind, id })` and knows nothing else. Each card
reads the channel, asks `planReveal(itsOwnList, itsLimit, id)`, and if the answer
is "mine, and hidden" it sets its OWN `$state`. `ShowMore` is untouched, so a
student can collapse the card again immediately.

Rejected: lifting all four cards' collapse into a page-level store (inverts
ownership for four cards to serve one feature), prop-drilling the channel (three
components in between have no interest in it), and a `<details>`-based disclosure
(the show-more control lives in the footer band, outside the disclosure content).

**Context, not a module singleton.** The channel is created in `+page.svelte`, so
it dies with the page — which is what keeps "collapse resets on navigation" true
by construction rather than by a `reset()` somebody has to remember.

**Grid immobility needed nothing added.** `.thrive-card-body` was already a fixed
height rather than a maximum, so expanding can only scroll. Verified: card tops
at 162,162,672,672 before and after a reveal, body still 300px.

### The measured contradiction, and the decision it forced

**The events pill counts 21 events this week. The card showed the next four
upcoming. Seventeen of the popover's items had no row on the page to jump to.**
Not a collapse problem — the pill's set and the card's set were different sets.

Asked, and answered by the owner: **collapsed is the next four, expanded is the
week, `/events` is still the rest.** It rests on both sets being prefixes of the
same ascending list, so `max(collapsedLimit, weekCount)` contains everything the
pill can list. `expandedEventLimit` carries the argument and a test asserts the
prefix property rather than trusting it. On a quiet week the `max` holds its floor
at four, so nothing changes at all.

### Decisions made

- **A zero-count pill is not a control.** No button, no `aria-expanded`, nothing
  to press. `statTones.calm` already made the number calm; this is the same idea
  applied to the interaction. Verified in a browser: a `<div>`, and neither hover
  nor a forced click opens anything.
- **A list, not a menu.** `role="menu"` brings a single tab stop and Tab-to-exit,
  which is right for a command menu and wrong for jump targets. Every item is an
  ordinary tab stop; arrows are a convenience.
- **`openedBy`, not `open`.** Two ways in is more than one boolean of state — see
  FINDINGS. This is the bug of the session.
- **Hover never moves focus.** Three pills in a row would fling focus about as a
  cursor crossed them. Focus moves in on click or keyboard only.
- **One focus-return rule:** restore to the pill if and only if focus is currently
  inside the panel. Covers Escape, click-outside and pointer-leave. Choosing an
  item hands off instead, because focus is about to land on the row.
- **`weekEventIds` deleted in favour of `thisWeek` on each event row.** Two shapes
  of one fact were going down; the pill had ids with no titles and the card had
  titles with no window.
- **`hoverIntent` holds the `(hover: hover)` gate**, rather than each component
  writing `matchMedia`. Same reasoning as `.thrive-numeric`: one expression of a
  rule, or it spreads.
- **Pills are 44px touch targets on mobile**, all three, including an inert one. A
  row of pills at two heights reads as a rendering fault.

### What broke

- **The pill did nothing when pressed.** Every gate green. See FINDINGS.
- **Three browser-probe checks failed on correct code** — the probe's own
  selector matched `ShowMore`, which also carries `aria-expanded`.
- **Two `svelte-check` a11y warnings**, both fixed structurally rather than
  suppressed: the arrow-key handler moved from the panel onto the items (where
  focus actually is), and the hover listeners moved into an action.

### Loose ends carried forward

- **`CONTEXT.md` is stale at `f8593b7`.** It is regenerated in full by rule, never
  patched, so it was deliberately left rather than half-updated. Sections 5, 6,
  13 and 17 all move. **This is the first thing to do next session.**
- **The 27 browser assertions are a throwaway probe, not a gate.** They caught the
  only real bug in the phase, and nothing in the repo can catch it again. Worth
  deciding whether they become `check:interaction` beside `check:layout`.
- **Home's phone height grew 2878 → 2949px.** Desktop unchanged at 1238px.
- **The done-group reveal branch in `TasksCard` is unreachable from Home today** —
  no pill counts a done task. Built anyway; 6b's undo wants exactly that path.
- **`aria-controls` names an id that is absent while the popover is closed.** The
  accepted cost of mounting the panel only while open, which is what makes
  `escapeKey` and `clickOutside` need no open state of their own.

### Still open from earlier phases

Unchanged: §9 defect 1 (process-global mock stores, **BLOCKING** a multi-person
demo), shallow provider copies, `buildScheduleData()` unported, three dead
providers, `requestTypeHelp` with no consumer, the calendar half of the ignore
key-space defect, Home fitting 1238px rather than 1052px.

`escapeKey` is no longer a loose end — it has a caller.

---

## 2026-08-21 — Phase 6a: Home, plus the repalette and the nav trim

**HEAD:** `f8593b7` · 10 commits, all pushed · 373 tests green.

> Date note: the previous entry and several `app.css` comments are stamped
> 2026-08-22, a day ahead of the real date. Commit hashes are the ordering that
> can be trusted.

### What was done

Three pieces of work in one session, in this order: the navy repalette and the
type rule (`8c283d6`, `922b8bb`, `41e891a`), the nav trim (`2fdefbb`), and
Phase 6a Home (`022b269`, `6bac960`, `ebeb895`), followed by two density passes
(`36395f0`, `074486d`) and a decisions-and-gates commit (`f8593b7`).

**Measured everything that was a pixel.** Drove the built page in the machine's
Playwright chromium at every step rather than reasoning about heights. That is
now the standing method for layout work, and it earned itself three times over
this session — see FINDINGS.

### Decisions made (this session's questions, answered)

- **Yellow is decoration on light surfaces**, a real graphic only on navy. Not an
  active indicator: "you are here" stays indigo, because two colours meaning
  "here" is how a reservation dies.
- **Gold `#c69214` rejected** at 2.79:1. `watch` already covers a legible warm
  accent.
- **`on-track` → teal.** The only reserved colour whose value changed.
- **Parked routes live in a separate list, not behind a flag.** A flag needs
  every surface to remember to filter; a separate list makes rendering a parked
  item structurally impossible.
- **Settings is parked.** Confirmed by the owner this session: nothing to
  configure yet.
- **`escapeKey` is kept** despite having no caller — the floating panels and the
  Ask THRIVE page will want it. Confirmed this session.
- **Tasks' collapsed view is flat; grouped on expand.** Asked and approved. The
  card carried ~190px of furniture before its first row, and at any cap that let
  the grid fit a laptop it showed one task.
- **Do NOT cut card rows to reach a 1052px viewport.** Confirmed by the owner:
  two task rows would make the card useless, and "show more" exists for exactly
  that. 1238px is the accepted result.
- **An `urgency: "unknown"` row gets its own group at the TOP.** Confirmed this
  session, and built. Loud is correct, invisible is not.
- **`contain: paint` stays** whether or not the phantom scroll is headless-only.
- **`playwright-core` added as a devDependency** — the first dependency since
  Phase 1. There is no zero-dependency way to measure real layout, and the
  alternative was leaving the bug ungated.

### Loose ends carried forward

**Queued, specified, NOT built — the stat pill popovers.** Clicking a stat pill
opens a popover listing the actual items behind the number: the overdue tasks,
the tasks due today, the events this week. Click always opens it; hover also
opens it on desktop. The items in the popover are clickable and jump to the task
or the event — **which means if the target row is hidden behind "show more", the
card has to expand and scroll to it**. That last part is the interesting
requirement: it couples the popover to the collapse state, so `collapseList` and
the cards' local `$state` need a way to be driven from outside. Worth designing
before building.

**Phase 6b is task editing:** ticking, undo, rename, priority, notes, due date
editing, drag to reorder, add task. `TaskRow` renders read-only with disabled
checkboxes today and a footer line saying so; that line goes when 6b lands.
`homeGroups.ts` is the read-only half of the Next app's `useTaskBoard` — the rest
of that hook is what 6b needs.

**Then, in order:** the calendar (15 components, the largest surface), then
appointments, then the **Ask THRIVE page** — three tabs (chat, class recommender,
job recommender), a chat window, and a saved chat history rail on the LEFT beside
the nav rail, so two rails sit side by side. Wired to Shankar's RAG later. `/ask`
exists as a placeholder route with the nav entry already in place.

**Strings keep being extracted** into `$lib/messages` as each surface is built.
That is the standing rule now, not a one-off for Home: Mandarin stays possible
only if no surface ships with inline copy.

### Still open from earlier phases

- §9 defect 1, the process-global mock stores. **BLOCKING** before any
  multi-person demo. Django is the fix.
- Provider copies are shallow; nested arrays are shared with the store.
- `buildScheduleData()` still unported — the calendar needs it.
- Three dead providers (`getSyllabi`, `getResources`, `getCurrentResume`).
- `requestTypeHelp` has no consumer.
- Home fits 1238px, not 1052px. Accepted.

---

## 2026-08-22 — Phase 5, the data layer

**HEAD:** `0dcca16` · 4 commits, all pushed · 324 tests green.

### The handoff correction that mattered

The previous entry said Phase 5 was "the 25 providers **against Django**". That
was wrong and was corrected before any code was written. Django does not exist
and is not being written here. This phase ports the providers against **the same
mock fixtures the Next app uses**. Django replaces the provider bodies much
later. No HTTP client, no API layer, no backend integration was written.

Anyone reading the old line and building an API client would have invented a
contract against a backend nobody has designed, and every guess would have been
load-bearing by the time it was discovered.

### What was done

Four commits, one per layer: fixtures + clock, the three stores, providers +
boundary, tests.

**Verified by mechanical diff, not by eye.** All 25 signatures diffed identical
against the Next source. The provider bodies were diffed comments-stripped, and
the only differences are the five intended ones. Eight of thirteen fixture
modules are byte-identical; the rest differ only in comments except `degree.ts`.
The old repo was confirmed untouched afterwards.

**Green in seven timezones**, UTC+14 to UTC−11, per the sweep TESTING.md
documents. This phase is entirely date-shaped, so the sweep was not optional.

### Decisions made

- **`Appointment` gains `slotId`.** Needed to release the right slot by id.
  Chosen over a side map in the store because it is the shape the Django model
  has anyway. Verified nothing in the tree constructs an `Appointment`, so no
  existing test broke.
- **`expectedCompletion` dropped** from the type and the fixture. It was a
  second, stale answer to a question the timeline already derives.
- **Copies stay shallow.** Faithful to the source. The nested-array hole is
  pinned by a test rather than quietly deep-copied, because deepening it is a
  behaviour change beyond a port.
- **No `resetStores()` export.** Test isolation via `vi.resetModules()` instead,
  to keep a test-only function out of the production surface.
- **`mock/` and `latency.ts` stay private.** Only `types`, `providers` and
  `labels` are public.

### Still open

- **§9 defect 1 — the process-global stores. BLOCKING.** Unchanged and
  unfixable at this layer. Django is the fix. Anything resembling a multi-user
  demo before then will have students booking over each other.
- **`buildScheduleData()` is still unported.** It was blocked on the five
  providers; they exist now. This is the obvious next task.
- **Shallow copies.** Documented, tested, not fixed.
- **`requestTypeHelp` has no consumer** in the Next tree — ported anyway, since
  the type picker it belongs under is a later phase. Delete it if that picker
  never lands.
- **Nothing renders any of this yet.** 25 providers and no route reads more than
  `getStudent()`. The data layer is ahead of the UI by design, but it means the
  only evidence it works is the test suite.

---

## 2026-08-21 — repo created, port through Phase 4

**HEAD:** `b0f7c3b` · **13 commits, all pushed** · first session in this repo.

Establishes the doc system here. It could not live in the old repo, which has
been read-only reference since Phase 1.

### What was done

**Inventory.** Read the frozen Next prototype at `4e0a65b` and wrote
`MIGRATION.md` — 1,449 lines, nine sections. Corrected three counts that were
wrong in the brief and are still wrong in the old repo's own `CODEMAP.md`: **25
provider functions** (not 21), **83 tests** (not 61), and `todayKey()` living in
`buildSchedule.ts` (not `format.ts`). Ran the suite and the contrast script to
verify rather than transcribe.

**Repo.** Created `rsm-msaad/thrive`, private, empty. Cloned to `~/code/thrive`.

**Phase 1 — scaffold + design system.** SvelteKit 2.63 / Svelte 5.56 runes / TS
strict / Vite 8 / `adapter-node` / Tailwind v4 / Vitest, npm. Ported
`globals.css` → `app.css` faithfully: all three layers, every token at identical
values, the 1px/1.5px distinction kept as two concepts, weight left at the call
site, light-only, no shadows. Fonts self-hosted via `@fontsource`. Dropped three
dead things (both shadow tokens, `.thrive-priority-label`) with the reason
commented in place. **Contrast gate 43/43.** Built `/swatch` as a visual diff
target.

**Phase 2 — pure logic + tests.** Ported `format.ts`, `schedule.ts`,
`buildSchedule.ts`, `calendarItems`, `calendarSources`, `ignoredEvents`,
`calendarPrefs`, `tickItem`, `quickList`, `data/types.ts`. **All 83 tests moved
with only an import-alias change and passed on the first run** — the strongest
evidence the logic really was pure. Made the one requested collapse:
`localDayKey(iso)` + `dayKeyOf(date)` → **`dayKeyOf(value: Date | string)`**.
Added three tests for it, since every ported test passed a `Date` and the string
branch had no coverage. Wrote `CONVENTIONS.md`.

**Phase 3a — `format.ts` test suite.** 73 tests. `describeDue` had none despite
being the most-used pure function in the app. Every branch, every field, the
boundaries rather than the middles, both private helpers via their public
surfaces, both DST transitions, both countdown thresholds from both directions.
**Verified green in seven timezones** from UTC+14 to UTC−11, including one with
a 30-minute DST offset.

**Phase 3a-fix — input guards.** `describeDue` was rendering `"Invalid Date"`
and `"in NaN months"` into the UI for an unparseable date and — worse —
classifying it `upcoming`, so a broken deadline was invisible. Added a fourth
state via a discriminated union. `formatClockTime` returned
`"NaN:undefined PM"`; now validates and returns `"--:--"`. **All 159 existing
tests passed unmodified**, proving neither guard changed valid-input behaviour.

**Phase 3b — persistence layer.** 14 `localStorage` keys plus `toast`, ported to
Svelte 5 runes as module singletons. Hydration is an explicit `hydrateStores()`.
102 new tests pinning the four properties. Dropped six React-only workarounds.

**Phase 4 — the shell.** Root `+layout.server.ts` and `+layout.svelte`,
`AppShell`, `SideRail`, `TopBar`, `BottomNav`, `nav.ts`, `PagePlaceholder`,
`SectionHeading`, `Avatar`, an `escapeKey` action, and 13 routes. Wired
`hydrateStores()`. Gated both floating widgets behind `FEATURES`. **First phase
with something to look at in a browser.**

### Decisions made

- **The doc system lives in this repo, not the old one.** The old repo is
  read-only reference; verified untouched after every phase.
- **Hydration strategy A**, by instruction: server renders un-personalised,
  overrides land after mount. Implemented as one explicit `hydrateStores()` call
  from the root `$effect` — the seam a single surface can later wait on.
- **Storage presence, not `$app/environment`,** decides browser-vs-server. No
  `localStorage` *is* the server, and it keeps the layer testable in Node with
  no jsdom.
- **`days: null`, not `NaN`,** on the unknown due descriptor. `NaN` is a
  `number` to the type system and flows silently into arithmetic; `null` forces
  the caller to narrow.
- **`@lucide/svelte`, not `lucide-svelte`** — the latter is legacy, pinned to
  Svelte 3/4 at v1.0.1.
- **`.svelte.ts` for the four rune-declaring files.** Forced: Svelte only
  processes runes there, and a plain `.ts` with `$state` is silently inert.
- **The `use*` prefix dropped** from every reactive reader. Nothing about them
  is a hook any more.
- **Stubbed `/assignments` and `/appointments`** although neither was on the
  Phase 4 list — both are nav destinations and `/assignments` is one of four
  fixed mobile slots, so omitting them put a 404 behind a permanent tab.
- **Probe before asserting.** Every suite was written against observed output
  from a throwaway probe. It caught two real things (see below).
- **Document out-of-scope defects as tests**, named as defect records, rather
  than fixing them or losing them.

### What broke, and what that found

- **A cross-surface store test failed and found a real pre-existing defect.**
  `eventIdOf` strips one `evt-` prefix, but the raw `Event.id` is itself
  `evt-3-1`, so the calendar keys the ignore store on `evt-3-1` and Home on
  `3-1`. Each surface is self-consistent; **neither sees the other.** Ignoring
  an event on Home leaves it showing on the calendar. No existing test caught it
  because each exercises one side, and the two Phase 2 cases encode
  contradictory conventions. **Recorded, not fixed** — picking the canonical key
  affects already-stored data.
- **One of my own Phase 3a tests was timezone-dependent** and the TZ spot check
  caught it. `"2026-02-30"` is a date-*only* ISO string, so it parses as UTC and
  rolls to Mar 1 in PDT but Mar 2 in UTC. A live demonstration of exactly the
  hazard the module exists to prevent. Fixed the assertion; no production code
  affected.
- **The `format.ts` probe revealed V8 is inconsistent** about invalid ISO dates:
  `"2026-13-01"` is `Invalid Date`, but `"2026-02-30"` rolls forward and parses
  fine. I would have written a wrong test from first principles.
- **A stale `node build/index.js` on port 3000** made a verification return 404
  and nearly had me conclude a route was not matched. Two orphaned listeners.

### Two known defects built correctly rather than reproduced

- **Page titles at weight 400** (MIGRATION §9 defect 4). Every `h1` sets
  `font-bold` at the call site. `PagePlaceholder` alone was seven of the twelve.
- **The leftover 2px strokes.** The rail, header and bottom bar all draw
  `border-*-2` in the prototype, with comments calling it "the standard 2px
  edge" — both leftovers from the reversed 08-12 direction. Ported at **1px**.

### Blockers

None hard. One decision is genuinely blocking a later phase: the ignore store's
canonical key space, because `taskBoard` and the calendar both depend on it.

### Next priorities

1. **Phase 5 — data providers.** All 25 signatures are inventoried in
   MIGRATION §2. This is the seam Django plugs into, and it unblocks Home,
   `/degree`, `/career`, and the calendar.
2. **Shared primitives** — `Button`, `Card`, `Tag`, `EmptyState`, `Countdown`,
   `DueChip`. The 20 `border-2` call sites arrive with `Button`; build them at
   the correct weight.
3. **Decide the ignore store key**, then fix it and convert the defect-record
   tests into real assertions.
4. **Re-set the timeline.** Release 1 "end of August 2026" and the control group
   both predate the rebuild decision.

---

## Open loose ends

Carried forward. Mirrored in `CONTEXT.md` §15.

| # | Item | Blocking? |
|---|---|---|
| 1 | **Ignore store key-space defect.** Home and the calendar key it differently. Needs a decision on the canonical key; affects stored data. | Phase where either surface lands |
| 2 | **Where an `urgency: "unknown"` row goes** in a list grouped by overdue/today/upcoming. The union makes it a compile error, so `taskBoard` cannot be ported without deciding. | `taskBoard` port |
| 3 | **Missing year** in `formatShortDate` and `fullLabel` — two dates a year apart format identically. Parked pending real screens. | no |
| 4 | **`countdownPhrase` counts to "13 months"** with no year branch. Parked with #3. | no |
| 5 | **`taskNotes` on `createOverrideStore`?** It duplicates the persistence logic, and the hardening it needed is the drift that argues for collapsing it. | no |
| 6 | **Home's placeholder copy.** Deliberately not `PagePlaceholder`. | no |
| 7 | **Mount `Toast`?** Store ported and tested; one import. Nothing raises one until the quick list exists. | no |
| 8 | **`useIgnoreUndo.ts` not ported.** Same shape as `taskToggle`. | floating widgets |
| 9 | **`formatShortDate` still emits `"Invalid Date"`** — the last unguarded function in `format.ts`. | no |
| 10 | **A parseable-but-wrong date still gets through `describeDue`.** V8 rolls `"2026-02-30"` into March. Needs a round-trip check, which is input validation rather than a parse guard. | no |
| 11 | **`SectionHeading` ported but unused.** No call sites until Home or the calendar. | no |
| 12 | **Nav has 11 destinations, 9 are placeholders.** Worth deciding whether the rail should distinguish built from unbuilt during build-out. | no |
| 13 | **`hydrateStores()` timing not observed in a browser** under a throttled connection. The un-personalised flash is by design but has not been looked at. | no |
| 14 | **Release 1 scope and dates need re-setting** against the rebuild. | planning |
