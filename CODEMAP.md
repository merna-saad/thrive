<!-- built-at: 90d2d7e -->
<!-- updated: 2026-08-21 -->

# CODEMAP

Navigation map for the THRIVE rebuild. Read this before opening files.

**Built:** 2026-08-21, refreshed after Phase 7a.
**Size:** 141 files under `frontend/src` — ~21,733 lines, 15,652 source / 6,081 test.

> The `built-at` comment above is machine-read by the codemap staleness hook.
> Keep it as the first line, in that exact `<!-- built-at: <hash> -->` form.

---

## Read these first

| File | Why |
|---|---|
| `CONTEXT.md` | The snapshot. What this is, where the port has got to, every standing decision. |
| `MIGRATION.md` | The spec. The frozen Next prototype, inventoried in nine sections. |
| `CONVENTIONS.md` | Five rules the tooling does not enforce. Review is the enforcement. |
| `HANDOFF.md` | The diary. What happened last session and what is still open. |

---

## The one rule that explains most of the code

**Components never see a raw timestamp.** Dates are classified and formatted in
a `load` function and passed down as strings. In Next the `"use client"`
boundary enforced this at compile time; SvelteKit has no such wall, so it is now
convention. `CONVENTIONS.md` says what to grep a diff for.

This is why `describeDue()` keeps its `now` parameter, why `nowISO` is a prop,
and why the `*View` types exist.

---

## Entry points

| Path | What it is |
|---|---|
| `frontend/src/routes/+layout.server.ts` | Root load. The only place `getStudent()` is called. |
| `frontend/src/routes/+layout.svelte` | Imports `app.css`, mounts the shell, and is **the one place `hydrateStores()` runs**. |
| `frontend/src/app.css` | **Design tokens. Single source of truth.** Start here for any styling question. |
| `frontend/src/app.html` | Document shell. Carries the light-only meta tags. |
| `frontend/vite.config.ts` | Adapter, runes mode, and the Vitest projects. **There is no `svelte.config.js`.** |

---

## The pure layer — `frontend/src/lib/`

No framework surface, and all of it under test. Mostly ported in Phase 2;
`buildSchedule`'s body and `calendarDay` landed in 7a.

| File | Role |
|---|---|
| `data/` | **The provider boundary.** Its own section below. Import from `$lib/data`, never deeper. |
| `format.ts` | Server-side formatting. `describeDue()` is the important one — returns a 4-state discriminated union. |
| `schedule.ts` | **The calendar's vocabulary.** Category maps, the three category sets and their guards, grid arithmetic, `filterSchedule`/`isVisible` (the one filter), grouping, `nextUpItem`. Read this first for anything calendar-shaped. |
| `buildSchedule.ts` | **The server half of the calendar's data.** `buildScheduleData()` reads five providers and returns two shapes: dated rows, and classes as weekday RULES so the grid pages to any month without a round trip. Plus `todayKey()` and `nowMinutesAt(now)`. `load` functions only. |
| `calendarDay.ts` | **The selected day's arithmetic**, extracted out of the components in 7a so a gate can see it: `sortDayItems`, `arrangeDay`, `squareGroupsFor`, `dayCountParts`, and the `SquareCell`/`SquareGroup` shapes. |
| `calendarSources.ts` | `taskToItem`, `todoToItem`, `mergedSchedule()`, `nowMinutes()`. **`nowMinutes()` still has no consumer** — the calendar takes its "next up" clock from the server; see `routes/calendar/+page.server.ts`. |
| `calendarItems.ts` | Custom events, labels, urgent. Keyed by **calendar item id**. |
| `calendarPrefs.ts` | `normalisePrefs` + the persisted store. |
| `ignoredEvents.ts` | `eventIdOf()`, `canIgnore()`, and the store. Keyed on **raw `Event.id`**, and it now normalises **nothing** it is handed — the calendar sheds its own prefix at its boundary. That was the HIGH defect fixed in 7a. |
| `tickItem.ts` | `tickItem()` and `isTickable()`. Dispatches on the **attached source row**, never by parsing an id. |
| `quickList.ts` | The scratch list: `QuickItem` plus its store and panel store. |
| `reveal.ts` | **"Show me the row behind this number", as arithmetic.** `planReveal` is the one question a card asks. Read this before touching the popovers. |
| `arrive.ts` | **`arriveAtRow` — the ONE way any surface moves a student to a row.** Focus, scroll, and the arrival mark. Awaits one `tick()` and **warns in dev** when the row is not there. Never hand-roll a `scrollIntoView`; see CONVENTIONS. |
| `nav.ts` | **One list drives the rail, the bottom bar, and every stub page** — and now whether a card links out at all. `isBuiltRoute` asks `primaryNav`; `isKnownRoute` separates "parked on purpose" from "typo". |
| `features.ts` | `FEATURES` — both floating widgets off. **`floatingTodo` also gates the task row's copy-to-list control**, since the quick list is the only place a copy is visible. |
| `title.ts` | `pageTitle()` — Next's `"%s · THRIVE"` template. |
| `utils.ts` | `cn()`. Survives for the `class`-override case only. |

---

## The data layer — `frontend/src/lib/data/`

**This is the seam.** 3,551 lines. Ported in Phase 5 against the same mock
fixtures the Next app uses — there is no HTTP client and no Django here. Django
replaces the provider *bodies* later; the signatures are the contract and do not
move.

| File | Role |
|---|---|
| `index.ts` | **The only public entry.** Re-exports `types`, `providers`, `labels` and nothing else. |
| `types.ts` | Every domain type. One file, on purpose. Dates are ISO **strings**, never `Date`. |
| `providers.ts` | **The 25 functions + `SlotUnavailableError`.** Every one returns a Promise. Every one returns copies. |
| `labels.ts` | `requestTypeLabel`, `requestTypeHelp`. Public because they are labels for a closed union, not mock data. |
| `latency.ts` | `resolveAfterDelay` + `setMockLatencyMs`. **Private.** The 120ms exists to surface missing loading states. |
| `mock/relative-dates.ts` | **The clock every fixture reads.** `at`, `onDay`, `upcomingWeekday`, `startOfToday`, `SUN`–`SAT`. |
| `mock/appointments.ts` | Advisors, `buildSlotsFor`, and **store 1** (appointments + claimed slots). |
| `mock/requests.ts` | **Store 2.** Lazy `seedOnce` — one approved `req-000`. |
| `mock/resume.ts` | Skills, resume courses, experience, and **store 3**. Lazy seed, `nextId` starts at 4. |
| `mock/program.ts` | `buildProgramTimeline` — pure, fully parameterised including `now`. The finish line is derived. |
| `mock/{student,courses,assignments,tasks,events,syllabi,degree,resources}.ts` | Pure fixtures. Byte-identical to the Next source except `degree.ts`. |

### Three things to know before touching it

1. **`mock/` and `latency.ts` are not exported from `index.ts`.** A component
   that needs something from either has found a gap in the provider surface.
   Widen the surface; do not reach through it. The Next tree violated this
   exactly once (MIGRATION.md §9 defect 11) and it is fixed here, not carried.
2. **The three stores are module-scope objects**, shared by every visitor and
   wiped on restart. MIGRATION.md §9 defect 1, graded **BLOCKING**. Inherited
   deliberately; Django is the fix. Tests get isolation via `vi.resetModules()`,
   not via a production reset hook.
3. **Nothing here is random.** Slot availability and the events calendar are
   hashed, not sampled — `Math.random()` would desynchronise server from client.
   A test scans the whole directory to keep it that way.

---

## Home — `frontend/src/routes/+page.server.ts` + `lib/components/home/`

The dashboard, and the only editable surface. Read Phase 6b's entry in HANDOFF
before changing it. (`/calendar` is built too, as of 7a — its own section below.)

| File | Role |
|---|---|
| `routes/+page.server.ts` | **Six providers in one `Promise.all`, and the only `new Date()` on this page.** Every date is classified and formatted here. |
| `routes/+page.svelte` | Owns the reveal channel **and** calls `resolveRows` ONCE, feeding the same array to the stat pills and to the Tasks card so they cannot disagree. |
| `home/HomeHeader.svelte` | One panel holding the strip and the greeting. Exists to save a panel's padding and a stack gap. |
| `home/ProgramTimelineCompact.svelte` | The program strip. Bare, not a panel. |
| `home/GreetingPanel.svelte` | Greeting, standing sentence, and ONE row of pills + chips. |
| `home/TaskStatPills.svelte` | The three counts, and the three lists behind them. **Reads the stores**, so the counts see the student's own ticks and ignores. Each pill's number IS `items.length` of the list it opens. |
| `home/TasksCard.svelte` | **Flat when collapsed, grouped when expanded.** The one real design decision in 6a. Owns ticking, undo, drag/keyboard reorder, and the add form. Reordering is offered **only when expanded** — see its doc comment. Also answers the reveal channel by writing its own collapse state, never anyone else's. |
| `home/TaskRow.svelte` | One task, fully editable. Tick, rename, priority, note, due chip, copy-to-list (behind `FEATURES.floatingTodo`), move. The control strip is **right-anchored**, so a conditional control appears at its leading edge and nothing already on screen moves. **Controls wrap to their own line below `sm`**, and the title takes a line of its own — both halves of the 375px fix. |
| `home/UndoBar.svelte` | The way back from a tick. Fixed at the top of the list, deliberately **not** a live region. |
| `home/AddTaskForm.svelte` | Quick add, collapsed to one button. Title is the only required field. |
| `home/DueDateEditor.svelte` | The due chip as a button opening a native date input plus three shortcuts. Uses `clickOutside` + `escapeKey`. |
| `home/PriorityPicker.svelte` | Three radios, not a select. Deliberately uncoloured by its own value. |
| `home/TaskNotes.svelte` | One task's note. Draft local, committed on blur, on close, and on destroy — never per keystroke. |
| `home/TodaysClasses.svelte` · `MyClasses.svelte` · `CourseCard.svelte` | Today's meetings; the course list; one course. |
| `home/UpcomingEvents.svelte` · `EventRow.svelte` | **Filters ignored FIRST, then slices to four.** The order is the behaviour. Collapsed is four, **expanded is this week** — see the doc comment for the contradiction that forced it. |

### The pure layer behind it

| File | Role |
|---|---|
| `messages.ts` | **Every user-facing string.** Values are functions, not templates. Extract into this as each surface is built. |
| `homeView.ts` | View models. Every date field is already a formatted string. |
| `homeGroups.ts` | Grouping, counting and ordering. `unknown` is a real group, FIRST. The read-only half of the Next `useTaskBoard`. |
| `taskBoard.ts` | **The editing half.** `resolveRows` (edits over provider truth, reclassified), the date arithmetic, `reorderedIds`. `DatedGroupKey` makes "you cannot drop into Needs a date" a type error. |
| `collapse.ts` | The fit-on-one-screen rule as arithmetic, shared by four cards. |
| `cardLayout.ts` | The collapsed row COUNTS. The height cap is CSS — see `app.css`. |
| `taskView.ts` | `rowPriorityOf`, `taskLabels`. Deadline outranks stated priority. |
| `tones.ts` | Every place a meaning becomes a colour. |
| `programStrip.ts` | `abbreviateTerm`, `phaseStatusWord`. |
| `ignoreUndo.svelte.ts` | Ignore + six-second undo. Keys on **raw `Event.id`**, never a stripped prefix. |
| `reveal.svelte.ts` | **The reveal channel**, created by `+page.svelte` and passed down through context. Carries an intent, one slot at a time, with a nonce. The channel only — arriving is `$lib/arrive`. |

---

## The calendar — `routes/calendar/` + `lib/components/calendar/`

**Phase 7a: the spine.** Month view, the selected day, that day's items. 7b adds
the other two views and the filter bar; 7c adds editing and events.

| File | Role |
|---|---|
| `routes/calendar/+page.server.ts` | `buildScheduleData` + `getTasks` in one `Promise.all`, and **the only `new Date()` on this page** — `todayKey`, `nowMinutes` and `nowISO` all come off it. Tasks are fetched here and deliberately **not merged** here. |
| `routes/calendar/+page.svelte` | A header and one mount point. No reveal channel: the calendar has no collapsed rows for anything to ask about. |
| `calendar/CalendarView.svelte` | **The only stateful node.** Owns `selectedKey`, `monthKey`, `detail`. Merges, then applies `filterSchedule` **once**, and hands the filtered data to every child. |
| `calendar/MiniCalendar.svelte` | The month grid. Up to 3 category dots per day plus `+n`, a roving tabindex, arrows / Home / End / PageUp / PageDown. **The two client-side date formats CONVENTIONS accepts by name live here.** |
| `calendar/CalendarHeader.svelte` | The day's summary: big figure, breakdown, `n of m done`, the "next up" line, and the square strip. |
| `calendar/SquareGrid.svelte` | A day's items as squares. Re-exports `SquareCell`/`SquareGroup` from `calendarDay`. **Uses `outline`, not `ring`** — MIGRATION §9 defect 10 built correctly. |
| `calendar/DaySection.svelte` | One titled group. **Its count is `done/TICKABLE`**, bare total when nothing is tickable. That was a fixed bug; the doc comment says so. |
| `calendar/DayGroupToggle.svelte` | Arrange the day by type (default) or time. Writes `dayGroupBy`. |
| `calendar/ItemRow.svelte` | One item in the shape every view renders it. Numeric tabular time, sans title, a real checkbox on tickable rows. No `compact`, no `onOpen` — those views do not exist yet. |

### Three things to know before touching it

1. **`filterSchedule` is applied in exactly one place.** A dot on a day with no
   row beneath it is structurally impossible, not something to remember. A new
   consumer gets the filtered `ScheduleData`; it does not filter again.
2. **Ticking dispatches on the attached source row**, never on a parsed id.
   `mergedSchedule` puts the resolved `Task` / `QuickItem` on the item and
   `tickItem` reads it. `isTickable` asks the same question the checkbox does.
3. **The header counts events; nothing renders them until 7c.** A day can read
   "5" above three rows. Deliberate — the alternatives break rule 1 or ship events
   without their register controls. See BUGS.md.

---

## The shared primitives — `lib/components/ui/`

`Tag` · `Button` · `ProgressBar` · `EmptyState` · `SectionCard` · `ShowMore` ·
`StatPill` · `StatPopover` · `StatusBadge` · `DueChip` · `IgnoreButton` ·
`IgnoreUndoBar` · `Toast`

`Toast` is the app-wide confirmation line, mounted once in `AppShell`. It had no
consumer until 6b's copy-to-list, which is why it is new here and the store is not.

`StatPill` has two shapes and one look: given `items` it is a **button owning a
popover**, given none it is a plain chip. A zero count gets the chip, on purpose.

`StatPopover` opens on **click only**. It tracked *why* it was open
(`'pointer' | 'command' | null`) while it also opened on hover, and it had to —
with one boolean, pressing the pill did nothing at all. Hover was then rejected
outright and that state went with it. See FINDINGS.

`SectionCard` is the one to understand: three bands — header, capped body,
pinned footer. It also **withholds its "View all" when the destination is a parked
route**, so no card can send a student to a placeholder; the header row carries a
`min-h-11` floor so the band cannot shrink when the link is absent. The footer sits OUTSIDE the scroll area because the show-more
control must not scroll away with the content it controls.

---

## The gates

| Command | What it proves |
|---|---|
| `npm test` | 487 tests. Pure logic and source scans. Nothing renders. |
| `npm run check:interaction` | 60 assertions in a real browser: the popovers **and** 6b's editing — tick, undo, the undo arrival (including the hidden-row case), a drag between groups, rename-on-blur. **The only gate that can press a button.** Fails on a console warning too — but it drives the PRODUCTION build, so it cannot see `arriveAtRow`'s dev-only warn. |
| `npm run check` | Types agree. **Does NOT prove the page renders** — see BUGS.md. |
| `npm run build` | It compiles. |
| `python3 scripts/check-contrast.py` | 58 assertions. **Parses `app.css`**, so tokens cannot drift from their checks. |
| `npm run check:layout` | 12 routes x 3 viewports in a real browser: the page cannot scroll further than it paints. Skips if no browser. |

---

## The persistence layer

**`.svelte.ts` means the file declares runes.** Svelte only processes them
there; a plain `.ts` with `$state` is silently inert.

| File | Role |
|---|---|
| `overrideStore.svelte.ts` | **The one mechanism.** `createOverrideStore<T>(key)` + `hydrateStores()`. |
| `userEdits.svelte.ts` | 7 keys — done, joins, titles, priorities, dues, order, added — plus `taskToggle` and its one app-wide undo slot. |
| `taskNotes.svelte.ts` | Its own store. Notes are not an override of anything. |
| `toast.svelte.ts` | One transient slot, 3000ms, not persisted. |
| `floatingPanel.ts` | `createPanelStore(key)` — geometry for a floating panel. |
| `assistantPanel.ts` | That store's Ask THRIVE instance. |
| `testing/fakeStorage.ts` | **Test-only.** A `localStorage` stand-in, so the suite stays in Node with no jsdom. |

Four properties and three key spaces: see `CONTEXT.md` §8.

---

## The shell — `frontend/src/lib/components/`

| File | Role |
|---|---|
| `shell/AppShell.svelte` | The persistent frame. Skip link, rail, header, `main`, bottom bar, gated widget mount points. |
| `shell/SideRail.svelte` | Desktop rail, hidden below `lg`. `railLink` snippet drives both lists. |
| `shell/BottomNav.svelte` | Mobile bar. Four fixed slots + a More sheet. |
| `shell/TopBar.svelte` | Sticky header. Identity left, bell and avatar right. |
| `PagePlaceholder.svelte` | Body for unbuilt routes. **Throws** on an href absent from `nav.ts`. |
| `SectionHeading.svelte` | Mono eyebrow + bold title + mono count. `as` → `<svelte:element>`. Ported, no call sites yet. |
| `Avatar.svelte` | Image with an initials fallback. Hand-rolled; shadcn-svelte is later. |
| `actions/escapeKey.ts` | Svelte action. Escape-to-dismiss, scoped to the element's lifetime. **Caller: `StatPopover`.** |
| `actions/clickOutside.ts` | Its sibling. Capture-phase `pointerdown`, with an `alsoInside` list for the trigger that opened the thing. |

---

## Routes — `frontend/src/routes/`

13 routes. **Two are built**, ten are `PagePlaceholder`, one is the swatch.

**One route is settled as never-to-be-built:** `/classes` keeps its route and its
Home card but will not be built (owner) — the card IS the feature.

| Route | State |
|---|---|
| `/` | **Built.** The dashboard, and editable. |
| `/calendar` | **Built (7a).** Month view, the selected day, that day's items. The other two views, the filter bar, editing and events are 7b/7c. |
| `/classes` `/syllabi` `/events` `/resources` `/settings` `/assignments` `/appointments` | `PagePlaceholder` |
| `/degree` `/career` | Placeholder body. Both are *partial* in the prototype and need providers. |
| `/swatch` | **Throwaway.** Every token, type step, border weight, both faces. Delete before Release 1. |

---

## Tests — 487, 22 files

`npm test`. Vitest, **Node environment, no jsdom**, so nothing renders.

**Which is why the popovers' interaction has no test.** Nothing in the suite can
press a button, and the one real bug in that feature was invisible to all five
gates. It was found by driving the built page in Playwright by hand. See the note
in TESTING.md.

It is also why Phase 7a **extracted `calendarDay.ts` out of two components**:
logic left in a `.svelte` file is logic no gate can see.

| Spec | Holds down |
|---|---|
| `format.spec.ts` (89) | `describeDue` across every branch, field and boundary; both private helpers via their public surfaces; both DST transitions |
| `providers.spec.ts` (47) | The provider boundary: copies out, no randomness, the three stores |
| `taskBoard.spec.ts` (43) | `resolveRows` identity and reclassification, the date converters including every unparseable-date path, `reorderedIds` |
| `calendarStores.spec.ts` (37) | Prefs, quick list, annotations, `tickItem`, the three key spaces, and **the cross-surface ignore test** |
| `schedule.spec.ts` (27) | Grid arithmetic, filtering, grouping, the collapsed `dayKeyOf` |
| `userEdits.spec.ts` (27) | Property 4 one setter at a time, added tasks, the undo slot |
| `ignoredEvents.spec.ts` (22) | Id normalisation **and what it mangles**, eligibility, month-dot arithmetic |
| `overrideStore.spec.ts` (21) | All four store properties |
| `calendarDay.spec.ts` (20) | The day's arithmetic: the re-sort across two slices, `DAY_GROUPS` order, squares that never mark a class done, "1 class" not "1 classes" |
| `homeGroups.spec.ts` (19) | Grouping, counting, ordering; `unknown` first |
| `calendarSources.spec.ts` (18) | The mappers, and that each item carries its source row |
| `reveal.spec.ts` (16) | `planReveal` at the boundaries; the reveal path against the list `TasksCard` really builds; the event prefix argument |
| `taskView.spec.ts` (15) | `rowPriorityOf`, `taskLabels`; deadline outranking stated priority |
| `buildSchedule.spec.ts` (13) | Classes stay weekday rules; every dated row's `dayKey` agrees with its own `startISO`; the `evt-evt-` double prefix; nothing the server built is tickable |
| `collapse.spec.ts` (13) | The fit-on-one-screen arithmetic |
| `taskNotes.spec.ts` (13) | Hydration, corrupt input, forget-on-empty |
| `nav.spec.ts` (12) | The two lists disjoint and duplicate-free; `isBuiltRoute` exact rather than prefix; `isKnownRoute` separating parked from mistyped |
| `calendarPrefs.spec.ts` (11) | Defaults and migration |
| `calendarItems.spec.ts` (9) | Custom-event mapping, label and urgent filtering |
| `toast.spec.ts` (6) | The single slot and its clock |
| `programStrip.spec.ts` (5) | `abbreviateTerm`, `phaseStatusWord` |
| `designSystem.spec.ts` (4) | No hex, no font names, no undefined `.thrive-*`, over a corpus proved non-empty |

**Two tests are defect records**, named as such, pinning current behaviour rather
than desired behaviour. There were three; the ignore store's was **replaced by a
real cross-surface test in 7a** when the defect was fixed. See `BUGS.md`.

---

## Gotchas

**This SvelteKit version has no `svelte.config.js`.** Adapter and compiler
options are in `vite.config.ts`.

**`$state` in a plain `.ts` file does nothing.** It must be `.svelte.ts`.

**`hydrateStores()` runs in exactly one place** — the root layout's `$effect`.
Do not add a second path.

**Nothing in the store layer may be read during server rendering.** There is no
`localStorage` in a node process, so it will be empty rather than wrong — but a
component that assumes personalised data on first paint will be wrong.

**`border-line-strong` is a colour, not a width.** The 1.5px control stroke is
`--thrive-control-stroke` and the alias does not bring it along.

**`font-semibold` synthesises.** Only 400/500/700 load.

**Never resolve a row by parsing its id.** `calendarSources` attaches the
resolved `Task` / `QuickItem`; `tickItem` dispatches on that. The id-parsing
version failed silently for self-added tasks and undated to-dos.

**`eventIdOf` is ambiguous by construction** — the raw `Event.id` is itself
`evt-`-prefixed, so the function cannot tell a raw id from a calendar item id.
**Its input is a calendar item id and nothing else.** The store normalises nothing
it is handed; the calendar sheds its own prefix at its boundary. Calling it on a
raw id does not normalise, it mangles — that was the HIGH defect fixed in 7a, and
BUGS.md records both halves.

**A control with two ways in has more states than it has booleans.** `StatPopover`
had to record which input opened it while hover and click both existed, or they
undid each other. Hover is gone and so is that state — but the lesson is why
`check:interaction` asserts hover has NOT come back.

**`.thrive-arrived` is applied from TypeScript, not markup.** It is the reason
`designSystem.spec.ts` now scans `.ts` as well as `.svelte` for the treatment
vocabulary.

**Asking is not doing.** `$lib/arrive` is "I know which row"; `$lib/reveal.svelte`
is "something else has to find it". Two modules on purpose, and only the second
declares runes.

**`arriveAtRow`'s one `tick()` is enough only if you make it enough.** Settled in
6b: write EVERY state change — including expanding the card — before calling it.
The flush count is not the mechanism; the ordering is. A caller that unticks and
then lets an effect expand the card arrives at a row that does not exist yet, and
fails with no warning in production. `TasksCard.undoTick` is the worked example.

**A date that will not parse throws on the way out.** `new Date('nope').getHours()`
is NaN and the resulting Invalid Date raises on `toISOString()`. Every converter in
`taskBoard.ts` guards it, because "Needs a date" exists precisely so a student can
fix such a row.

**A handler on a row that a drop destroys reads a dead derived.** `dragend` after
a cross-group drop fires on a torn-down `{#each}` block; reading a prop there is
Svelte's `derived_inert`. The CARD owns drag cleanup, via a document listener that
lives exactly as long as the drag.

**`ShowMore` carries `aria-expanded` too.** Anything querying
`button[aria-expanded="true"]` to find an open popover will match an expanded
card's own control. Query `.thrive-popover` instead.

**The old Next repo is read-only.** `~/Desktop/Test 1/Thrive-msba-brain`.

---

## Commands

```bash
cd frontend
npm run dev -- --open      # dev server, :5173
npm run build              # production build
node build/index.js        # run the build, :3000
npm run check              # svelte-check
npm test                   # vitest run — 487 tests

python3 scripts/check-contrast.py    # 58 assertions: 42 pairs, 6 ceilings, 10 structural
npm run check:layout                 # 12 routes x 3 viewports, in a real browser
npm run check:interaction            # 60 assertions: the popovers and task editing
```

If a page looks stale locally, something is holding the port:
`lsof -ti:3000 | xargs kill -9`.
