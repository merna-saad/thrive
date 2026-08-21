# HANDOFF

Session log, newest first. What happened, what was decided, what is still open.

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
