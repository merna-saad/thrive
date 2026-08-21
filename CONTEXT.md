<!-- updated-at: 5e6b3d1 -->

# CONTEXT

The living context file. Read this and you should be able to pick up the work
without asking anyone.

**Regenerated in full every handoff.** Never patch it — a partial edit leaves
stale claims sitting beside fresh ones with no way to tell them apart. (One
exception was taken and approved on 2026-08-21: a four-spot delta inside the same
session, on a file written thirty minutes earlier. Full regeneration is for
accumulated drift across a session; the rule stands for the normal case.)

This file was regenerated in full at `5cdad70` and then PATCHED for two small
changes later the same session — the show-more `aria-controls` fix and the
built-vs-parked link rule. Same sanctioned exception, flagged here rather than
quietly: §11, §13, §14 and §17 carry the delta, and the counts in §5 were
re-measured. Say the word and it gets a clean regeneration.

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
- **No PRs.** Everything goes direct to `main` — solo, no review gate yet. Commit
  hashes stand in for PR links throughout the docs.

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
├── CONVENTIONS.md   the rules the tooling does not enforce
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
    └── check-interaction.mjs   60 assertions: the popovers and task editing
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
source wins, and it gets reported.** Exercised three times so far — §2 overstated
`buildSlotsFor`'s determinism, §2 omitted that provider copies are shallow, and
§4's one-line entry for the task-editing components omits `lib/taskBoard.ts`
entirely, which is where most of the behaviour actually lives. §2 carries a
correction note.

**And a fourth case, which is a different shape:** sometimes the source is
*wrong* and porting it verbatim is the bug. Every date converter in the Next
`taskBoard.ts` throws a `RangeError` on a due date that will not parse. See §7.

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
and the due-date editor are both hand-built floating widgets rather than deferred
to one of them — see §13.

**One dependency added since Phase 1: `playwright-core`** (2026-08-21), for the
layout gate. It has since paid for itself three times over: the same dependency
carries the interaction gate, which caught a dead button five other gates called
green, a `derived_inert` warning live in the production build, and the undo
arrival's silent no-op. `@types/node` was rejected in Phase 5 because
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
| — | Stat pill popovers, the reveal channel, the arrival cue, `check:interaction` | done |
| 6b | **Task editing — tick, undo, rename, priority, notes, due date, reorder, add** | **done** |
| **next** | **The calendar (15 components, largest surface)** | not started |
| then | `/assignments` — the same `TaskRow`, no groups | not started |
| then | Appointments | not started |
| then | The Ask THRIVE page | not started |
| later | Floating widgets, behind `FEATURES` | not started |

**451 tests, 20 spec files, all passing.** `svelte-check` clean over 389 files.
Build clean. Contrast **58/58**. Layout **36/36**. Interaction **60/60**.
53 commits, all pushed.

**127 files under `frontend/src`** — ~18,286 lines, 12,769 source / 5,517 test.

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

**`indigo` has two consumers, and they are the same sentence.** "You are here" in
the navigation, and `.thrive-arrived` — the ring on a row something has just moved
the student to. An arrival cue *is* "this is where you are now", so this widened
indigo's use without weakening its meaning. Anything else wanting indigo has to
make that same argument.

**6b did not add a third.** The tick's feedback is the row striking through and
moving, the undo strip, and the live sentence; the arrival ring is spent on the
undo. See §13 on why `justChanged` was dropped.

**`on-track` is the only reserved colour whose value has changed.** It moved off
green on 08-15 because green had become "an action you can take" and a green chip
beside a green button read as one signal. A blue chip beside a **navy** button is
that same collision, so it moved again, to teal. 5.90:1 on card, 2.40:1 against
navy — far enough apart to be a different statement rather than a lighter navy.

### Surfaces, ink, lines

Surfaces `bg #faf9f5` cream / `surface #fff` / `sunken #f1efea` (also the row
hover fill, and the fill of every editor panel a row opens). Ink `ink #17181c`,
`body #3a3b42`, `muted #6b6c72`, `faint #85868c` — **only the first three may
carry text**, and `faint` is held below 4.5:1 by a ceiling so words placed in it
fail a check.

**A 1px decorative hairline and a 1.5px control boundary are different things,
carried by different tokens, and must never collapse.** Control boundaries owe
3:1 under WCAG 1.4.11 because the boundary is the only thing marking where the
control is. Only `.thrive-checkbox` and `--input` consume the 1.5px stroke.

**There is a third ring width, and it is deliberately not either of those.**
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

Nine, and each exists because Tailwind cannot express it at the call site:
`.thrive-numeric`, `.thrive-eyebrow`, `.thrive-panel`, `.thrive-row`,
`.thrive-checkbox`, `.thrive-strike`, `.thrive-card-body`, `.thrive-popover`,
`.thrive-arrived`.

**Still nine after 6b**, which is worth noting because a phase that added six
components added no new treatments. Every editor panel is `bg-sunken` plus a
hairline and a radius, which are ordinary utilities; the drop indicator during a
drag is a `before:` pseudo-element built from `rounded-pill` and `bg-primary`.

- **`.thrive-popover`** carries only a WIDTH:
  `min(--thrive-popover-width, 100vw - 2 * --thrive-popover-viewport-inset)`. The
  clamp is what stops a pill near the right edge opening a panel off the screen.
  Not a `max-width`, or three pills would open three different-width lists. Its
  surface, hairline and radius are ordinary utilities.
- **`.thrive-arrived`** is the arrival ring. See §13, and note it is the only one
  of the nine applied from TypeScript rather than markup — which is why
  `designSystem.spec.ts` scans `.ts` files too.
- **`.thrive-checkbox` did not grow for 6b.** A 17px box is below the 24px WCAG
  2.5.8 pointer target the Next row cited when it built a 24px skin. Rather than
  change a design-system size, the row makes its **title** the checkbox's
  `<label>`, so the tick target is the width of the row. Same outcome, no token
  touched.

### Durations: motion versus dwell

Three motion tokens (120/160/260ms) are **transition lengths** — how fast a thing
changes. `--thrive-arrival-duration: 1200ms`, the toast's 3000ms, the undo's
6000ms and the live region's 4000ms are **dwells** — how long a state persists.
They are different kinds of number and must not share a token: reusing
`--thrive-motion-slow` for the arrival mark would have tied the fade's speed to
how long the mark lasts, and the next person to tune one would silently retune the
other.

The three dwells that are not in `app.css` live at their definitions
(`UNDO_MS` in `userEdits`, `VISIBLE_MS` in `toast`, `ANNOUNCE_MS` in `TasksCard`)
because nothing in CSS reads them. The arrival duration is in `app.css` precisely
because two things do.

`arrive.ts` READS `--thrive-arrival-duration` from the computed root style rather
than repeating it, so the timer that removes the mark and the animation that fades
it cannot drift apart — and 1200ms stays a design-system value rather than becoming
a number in a TypeScript file. `check-interaction.mjs` reads the same token for the
same reason.

**1200ms is a judgement, not a measurement**, and it stands until a real student
says otherwise (decided 2026-08-21).

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

**It does not show the popover or the arrival ring, and that is a decision**
(owner, 2026-08-21): it is slated for deletion, so it is not worth the time. The
same reasoning covers 6b's editor panels.

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

**6b is the first phase to actually use the narrowed exception**, and it uses it
exactly as specified. `+page.svelte` passes `data.nowISO` into `resolveRows` and
into every date control; nothing in `taskBoard.ts` calls `new Date()` with no
argument. `new Date(iso)` is parsing a string the server sent, which is a
different act from asking the browser what day it is.

**Nothing enforces this, and that is the point of writing it down.** In Next the
`"use client"` boundary enforced it at compile time. SvelteKit has no such wall:
a component can `import { describeDue }` and call it with no `now`, and the
default parameter is `new Date()`, so it compiles, renders something plausible,
and is wrong in another timezone. **Review is the enforcement.**

### The three sanctioned client reads

1. **`nowMinutes()`** in `calendarSources.ts` — minutes past midnight, for the
   calendar's "next up" line. Called from a handler or a memo, never during a
   server render, and only when the selected day *is* today.
2. **`matchesWide()`** in the floating-panel geometry — listed, and **not ported
   yet**; the floating panels are a later phase.
3. **`TaskNotes`' autofocus gate** — `matchMedia('(hover: hover)')`, added in 6b.
   Opening the note panel is an explicit request to write, so focus lands in the
   field, but only where a keyboard will not cover the screen: on a phone
   autofocus throws the keyboard over half the card and the note button sits in a
   thumb's resting arc.

**Read (3) against the deleted one, because they look identical and are not.**
`hoverIntent` read `(hover: hover)` to gate hover-to-*reveal*, which is CSS —
Tailwind's `hover:` utilities compile to that media query with no JavaScript
needing an opinion — so when hover came out of the popovers the action was deleted
rather than parked. `TaskNotes` decides whether to move **focus**, and there is no
CSS form of that to prefer. That is the whole test for a fourth: *could CSS have
done this?*

**A `Date.now()` used as an id nonce is not a clock read** in the sense this rule
is about. `quickList.ts` and `taskBoard.ts`'s `mintTaskId` both use one; neither
is ever parsed back into a day. A nonce is not a date.

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

That ordering has two consequences, one found per phase.

**In 6a:** four undated rows fill the collapsed slice on their own and push the
overdue task — the one the coral pill counts — off screen. `reveal.spec.ts` pins
that path.

**In 6b: making those rows visible made a latent crash certain.** Every date
converter carries the task's existing clock time over when only its day changes,
by reading `new Date(fromISO).getHours()`. For an unparseable date that is `NaN`,
`setHours(NaN, NaN)` yields an Invalid Date, and `Invalid Date.toISOString()`
**throws a RangeError**. `toDateInputValue` was quieter and no better, returning
the literal `"NaN-NaN-NaN"` that a date input silently rejects.

The group guaranteed to hit it is `unknown`, whose entire purpose is that a
student can fix it — so every route out of it would have raised an exception in
front of the person using the one control it was surfaced for. Reproduced against
the Next source before fixing. All three converters now guard it via one
`clockFrom` helper falling back to the reference instant and then to local
midnight; a date that never parsed has no time of day to preserve, so nothing is
lost. Five tests cover the paths.

**The lesson generalises and is in FINDINGS:** when you make a previously
invisible state visible, audit every path that state can now reach. The fixtures
contain no unparseable date, so no amount of using the app would have found it.

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
root `+layout.svelte` inside `$effect`, and nowhere else (`hydrateTaskNotes()`
sits beside it because notes are not an override store and so are not in the
registry). Storage presence, not `$app/environment`, decides browser-vs-server —
which keeps the whole layer testable in Node with no jsdom.

**6b was the first phase to write to this layer from the UI, and it needed no
changes to it.** Every one of the seven keys plus `taskNotes` and the undo slot
was built in 3b and used as-is. That is the phase's main evidence that the layer
was designed rather than guessed: the only additions were pure functions on top.

### Resolve overrides ONCE per page, not once per consumer

The corollary 6b added, and it is now in CONVENTIONS.

Home has two things reading the same task list: the stat pills and the Tasks card.
`+page.svelte` calls `resolveRows` and hands the same array to both. If the card
resolved its own, moving a due date would restyle the list while the coral pill
above it went on counting the server's stale `due.urgency` — two views of one list
that can disagree, which is the exact bug that moved the counting to the client in
6a, one level up.

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

**Student-created task ids are prefixed `own-`** so they cannot collide with a
fixture's and so their origin is readable in `localStorage`. `removeAddedTask`
clears the five sibling overrides too, leaving no orphan keys pointing at an id
that no longer exists.

### What is deliberately NOT persisted

Card collapse state, and the reveal channel that can drive it. See §13 — the
non-persistence is structural, not a `reset()` somebody remembers to call.

Also not persisted: the drag in progress, the open editor, the note draft before
it commits, and the live-region sentence. All momentary.

### `.svelte.ts` is not decoration

Svelte only processes runes in `.svelte.js` / `.svelte.ts`. A plain `.ts` with
`$state` is **silently inert**. Six files carry the suffix: `overrideStore`,
`userEdits`, `taskNotes`, `toast`, `ignoreUndo`, `reveal`.

**And the suffix is a claim, so it has to be true in the other direction too.**
`arrive.ts` is DOM code with no runes and is a plain `.ts` for exactly that
reason — it was moved out of `reveal.svelte.ts` on 2026-08-21 partly to stop
implying otherwise. `taskBoard.ts` is the same: pure functions, no runes, plain
`.ts`, and 6b added no seventh rune file.

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
| `useTaskBoard`'s two `useMemo`s and three `useCallback`s | Same: deriveds recompute on read, and a plain function is stable enough |
| `TaskNotes`' `latest` ref + syncing `useEffect` | It existed only so an unmount cleanup could read the current draft. `onDestroy` reads it directly |

**One collapse was requested and made:** `localDayKey(iso)` folded into
`dayKeyOf(value: Date | string)`.

**One hook was split rather than translated.** `useTaskBoard` did resolution,
grouping, counting and mutation in one place; here grouping and counting are
`homeGroups.ts` (6a) and resolution plus the date arithmetic are `taskBoard.ts`
(6b). Both pure, both fully testable, and the split is what let 6a ship a correct
read-only card without stubbing anything.

**Hooks that became module singletons:** `useTaskToggle` → `taskToggle`,
`useIgnoreEvents` → `ignoreEvents`. One undo slot app-wide rather than one per
calling component, which matches what `toast` already did deliberately.

**The reveal channel is deliberately NOT a module singleton**, and it is the one
place that pattern was rejected — see §13.

**`onDestroy` is not a `useEffect` teardown, and 6b needed the difference.**
`TaskNotes` commits its draft on destroy. Written as an `$effect` returning a
cleanup, it would re-run on every keystroke and commit on each one — the exact
behaviour the component exists to avoid. `onDestroy` is not reactive at all,
which is what the React unmount effect actually meant.

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
  follow the same pair (`min-h-11 lg:min-h-9`), including the inert zero one, and
  so do 6b's editor buttons.
- **`--thrive-page-gutter-bottom`** is the page's bottom breathing room, used
  twice: on mobile added to the bottom nav's height (that bar is fixed *over* the
  page), and above `lg` it is the whole padding.
- **Icons are component references held as values**, rendered via
  `{@const Icon = item.icon}`. Not `<svelte:component>`, deprecated in Svelte 5.
- **Accessibility:** skip link, `main` landmark with `tabindex="-1"`, exactly one
  `nav` landmark in the a11y tree at a time, `aria-current="page"` on the active
  item.
- **`Toast` is mounted here**, once, for every route. See below.

### The app-wide toast

`toast.svelte.ts` shipped in Phase 3b with its six tests and **no consumer** —
nothing rendered it, so `showToast` wrote to a store no one read. Harmless while
nothing called it, and it sat in the loose-end list as "one import".

6b's copy-to-quick-list is the first caller and would have been the worst possible
one to leave unrendered: the floating quick list is feature-flagged off, so the
copy has **no visible destination either**. The button would have succeeded,
persisted, and shown the student nothing at all — a silent no-op from an action
that worked. So the component was built and mounted.

`role="status"` rather than `alert`: copying a row is not urgent and must not
interrupt what a screen reader is already saying. The region is **mounted always**
and only its text changes, because a live region created and populated in the same
tick announces unreliably. `pointer-events-none` so a confirmation can never
swallow a press meant for the page beneath it.

### The two actions

`frontend/src/lib/actions/` — Svelte actions rather than translated `useEffect`s.
The shared shape is that **the listener's lifetime is the element's**: put one on
something inside an `{#if open}` and it exists exactly when the thing it dismisses
does, so there is no open state to keep a listener in step with.

| Action | Role | Callers |
|---|---|---|
| `escapeKey` | Escape-to-dismiss | `StatPopover`, `DueDateEditor` |
| `clickOutside` | Capture-phase `pointerdown`, with an `alsoInside` list | `StatPopover`, `DueDateEditor` |

`clickOutside` takes `alsoInside` because a disclosure's own trigger is not inside
its panel but *is* inside its widget. Without it, pressing the trigger to close
fires the dismissal, the panel unmounts, and the trigger's own click reopens what
was just dismissed — a button that visibly refuses to close.

**Both gained a second caller in 6b**, which is the argument for having made them
actions rather than effects: `DueDateEditor` replaced the Next version's two
`useEffect`-managed document listeners with two `use:` directives and no open
state to keep them in step with.

**The same shape, one level up.** `TasksCard` clears its drag state from a
`document` `dragend` listener inside an `$effect` keyed on `drag !== null`. It is
not an action because there is no element whose lifetime matches — the drag
outlives any one row, which is precisely the bug it fixes (§13).

**`hoverIntent` existed and was deleted**, same day. It held the one
`(hover: hover)` gate for the popovers' hover opener. When hover came out of that
interaction it had no caller, and it was deleted rather than parked: nothing queued
has a hover-reveal requirement that Tailwind's `hover:` utilities do not already
cover. See §15.

### Feature flags

`FEATURES.floatingTodo` and `FEATURES.floatingAssistant`, both `false`. Mount
points exist in `AppShell`, gated. **Left untouched when `/ask` became a route** —
two Ask THRIVE surfaces is a later decision, not an accident to create now.

**`floatingTodo` now gates a second thing: the task row's copy-to-list control.**
The quick list is the only surface where a copied item is visible, so with the flag
off the copy succeeded, persisted, and showed the student nothing — the same
"invisible result reads as broken" argument that withholds a "View all" pointing at
a parked route. Nothing was deleted: the store, `addQuickItem`, its tests and the
toast all stay, and flipping one word restores the button to a byte-identical row.

**The consequence, recorded rather than discovered later:** with the button hidden,
`showToast` has no caller, so the `Toast` mounted in `AppShell` cannot fire. That is
coherent — the toast exists for exactly this action and returns with it on the same
flag — but the toast is currently unexercised by anything but its tests. It was
built during 6b precisely because a copy had no visible destination; hiding the
button is the other half of that same problem, solved at the source.

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

**`/events` is still parked, and its card no longer links to it.** Home's Upcoming
Events card used to carry a "View all" pointing there; a link that lands on a
placeholder reads as broken rather than unfinished, so the link is withheld while
the route is parked. The card's heading and content are unchanged. Unparking
`/events` brings the link back with no edit — see below.

### A card links out only when its destination is built

`isBuiltRoute(href)` asks `primaryNav`, and `SectionCard` renders its "View all"
only when the answer is yes. **`primaryNav` membership IS the definition** of a
real destination — the same list that decides what the rail and the bottom bar
show — so moving a route out of `parkedNav` restores every card's link to it with
no further edit.

Decided in `SectionCard`, the one component that renders the affordance, rather
than per card: four cards link out and three of them pointed at parked routes, so
the alternative was four places to edit and four chances to forget one. Same
reasoning as `parkedNav` being a separate list rather than a flag — make the
failure impossible rather than something to remember.

**Which cards lost their link:** Tasks (`/assignments`), My Classes (`/classes`),
Upcoming Events (`/events`). Today's classes keeps `/calendar`, which is primary.

**`isKnownRoute` is the companion, and it exists to separate two answers that look
identical.** A parked route and a mistyped one both fail `isBuiltRoute`, for
completely different reasons, and hiding a link because somebody fat-fingered an
href is the silent no-op this repo treats as its worst failure mode. So
`SectionCard` warns in development on an href in neither list. A warning and not a
throw: `PagePlaceholder` can throw because it IS the page, whereas taking Home
down over a "View all" would be worse than the missing link.

**`/classes` is unlikely ever to be built** (owner, 2026-08-21). The route and its
card stay; only the link goes.

**`/assignments` is parked and is now the next real consumer of a 6b component.**
The Tasks card's "View all" points at it, and it renders the same `TaskRow` — with
no `reorder` prop, since it has no groups to move between. It owes that row a
`role="list"` container; see §17.

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

Numbers worth knowing, because three design decisions rest on them: **10 tasks**
(8 open, 2 done — 1 overdue, 2 due today, 5 upcoming), and **159 upcoming events,
21 of them inside seven days**, generated 2–4 per day across a rolling horizon.
That 21-against-4 is what forced the events card decision in §13.

**The eight open tasks are why the collapse matters and why one gate check can
run at all.** Four are shown collapsed, so `check:interaction` can tick the last
of the eight, collapse the card, and undo into a row that is genuinely not
rendered — the hard case for the arrival. A smaller fixture would report SKIP.

**No fixture task has an unparseable due date**, which is exactly why the crash in
§7 survived to be found by reading rather than by using the app.

---

## 13. Home

The one fully-built page, fully editable since 6b, and the only route that reads
more than `getStudent()`.

`+page.server.ts` awaits **six providers in one `Promise.all`** and calls
`new Date()` once. Four cards in a **2×2 grid** at `lg`, one column below it.

**What is deliberately not computed on the server:** the three stat counts. They
have to see the student's persisted ticks, edits and ignores, which only exist in
the browser — counting them server-side freezes them at the fixture's answer and
lets the pills contradict the cards beneath them. What goes down is the classified
rows and, on each event row, a `thisWeek` flag: the data to count, not the count.

**`+page.svelte` resolves the task rows once**, for both consumers. See §8.

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
nothing overflowed at rest in 6a. Collapsed row COUNTS live in `$lib/cardLayout`
because JavaScript slices with them: **4** task rows, **2** course cards, **4**
class rows, and `VISIBLE_EVENTS = 4`.

**The Tasks card now scrolls inside that cap, and the trade is recorded at the
constant.** 6a measured 299px of collapsed content against the 300px cap — it fit
exactly. A desktop task row is now **61–81px rather than 54px** and the collapsed
body holds **424px**. That is arithmetic, not styling: a row carries five 44px
controls (WCAG 2.5.8; shrinking them trades a layout problem for an accessibility
one) plus the 44px "Add a task" button, and no arrangement of those fits 300px.

**The guarantee that matters is untouched.** The height is fixed, so the overflow
can only scroll and the grid cannot move — asserted twice, by
`check:interaction`'s *editing did not move the grid* and by `check:layout` on
every route and viewport. `COLLAPSED_TASK_ROWS = 3` would fit; it is a visible
change to Home's densest card, so it is the owner's call rather than a constant's.

**That fixed height is also what makes the reveal machinery below safe.**
Expanding a card to show a hidden row cannot move the grid, and nothing had to be
added to guarantee it.

### Tasks is flat when collapsed, grouped when expanded

The one real design decision in 6a, and it came from measuring. The card carried
~190px of fixed furniture — progress bar, three group headings, Done heading,
section gaps — before its first row, three and a half rows' worth. At any cap that
let the grid fit a laptop it showed one task.

So the progress bar moved into the header band (outside the scroll area) and the
collapsed view shows a flat list of the next four things with no headings. Nothing
is lost: every row already states its own urgency in its labels. Headings come
back on expand, where they earn their height.

**6b inherited a consequence from that decision: reordering is offered only when
the card is EXPANDED.** Collapsed, the rows are a flat slice spanning several
groups, and sort keys are read *per group* — so "move this up" across a group
boundary would persist a key and change nothing on screen. A control that appears
to work and does not is the failure mode this repo cares most about, so the
control is not offered. The Next app never had to answer this, because its card
was always grouped.

Everything else — tick, rename, priority, note, due chip, copy-to-list — works in
both states.

### Task editing (6b)

The persistence layer was already there from 3b. This phase was wiring, plus the
three things below.

| Component | Role |
|---|---|
| `TaskRow` | The row. Checkbox, title-as-label, chips, due chip, five 44px controls, and two disclosure panels |
| `UndoBar` | Fixed at the TOP of the list, not following the row. Deliberately **not** a live region |
| `DueDateEditor` | The due chip as a button opening a native `<input type="date">` plus Today / Tomorrow / Next week |
| `PriorityPicker` | Three radios, not a select. Deliberately uncoloured by its own value |
| `TaskNotes` | Draft local, committed on blur, on close, and on destroy — never per keystroke |
| `AddTaskForm` | Collapsed to one button. Title the only required field |

**A native date input rather than a hand-rolled calendar.** Keyboard-operable and
screen-reader-labelled for free, and on a phone it raises the platform's own
picker. The three shortcuts cover what a student actually wants without making
them read a calendar to find tomorrow.

**Three radios rather than a select**, because there are exactly three values: a
dropdown hides two behind a click and costs a keystroke. Radios also give
arrow-key movement and one tab stop for free. **Uncoloured by its own value** — the
row's left edge and wash already carry priority, and `high` is not the same signal
as overdue, which owns the coral.

**`AddTaskForm` keeps the Next source's native `<select>`** for priority, and that
is not an inconsistency with the paragraph above. They answer different questions:
on a row, priority is one of three values being *changed*, in a strip where all
three should be visible; in the form it is one of four fields being *filled* in
sequence, and a three-wide radio group would be wider than the field beside it.

**Notes commit on blur, on close, and on destroy.** The third is the one that
matters: ticking a task elsewhere regroups this row and can unmount the panel
mid-sentence, and without it the note would be gone with no action the student
took. Escape here **closes without discarding** — deliberately the opposite of the
title editor, because a title has an original to restore to and prose does not.

**The title commits on blur too, which the Next source did not do** (it committed
only on Enter and Save). That forced a guard: `blur` fires *before* `click`, so
pressing Cancel would have committed the draft and then restored a variable
nothing reads. Both halves of the guard are needed — a `pointerdown` flag for
mouse and touch, and for **Safari**, where clicking a button does not focus it and
so leaves `relatedTarget` null; and a `relatedTarget` check for the keyboard, where
Tab moves focus with no pointer event at all. Two paths abandon and only two:
Escape and Cancel. Everything else commits, so "I closed it" is not a coin flip.

**"Needs a date" accepts no drops.** You cannot move a task into having no due
date — `Task.dueDate` is required and `setTaskDue` only ever writes an instant, so
there is nothing to write. Enforced as a **type**, `DatedGroupKey =
Exclude<GroupKey, 'unknown'>`, so `dateForGroup` cannot be called with it and a
future drop target has to say out loud that it is doing something impossible.
Rows still leave that group and reorder within it.

**The tick resolution bug is not reintroduced.** Home's rows carry a real `Task`
object end to end and `taskToggle.toggle(task)` takes the object; nothing in this
path parses an id. The question does not really arise here — every row has a
writable source by construction — and the calendar's `tickItem` dispatch is
untouched.

**No `justChanged` ring.** The Next row outlined a ticked task for the whole
six-second undo window. Dropped by decision: this app has ONE arrival treatment
and a student learns it once. A tick is answered by the row striking through,
moving to Done, the undo strip appearing at the top of the list, and the card's
live sentence. The ring is spent on the **undo**, which is the move that needs
finding again.

**One live region, and the undo strip is not a second one.** Counts, undo and
every move come through the card's single `aria-live` sentence; three regions
would talk over each other on one action, which is what the events card had before
it was cut to one. The sentence is cleared after 4s so the *same* move announced
twice is announced the second time too — an unchanged live region says nothing,
which would make a repeated keyboard reorder silent exactly when it is being used
most.

**A row restored to a date past this week is announced rather than silently
skipped.** Done is not week-filtered, so a task due three weeks out can be ticked
and unticked, and the week filter then removes it again. There is no row to arrive
at, so the card says so instead.

### The row's structure, and defect 3 twice over

MIGRATION §9 defect 3 — "the worst thing in the app" — was every task title
wrapping to roughly one character per line at 375px, making Home ~7,700px tall.
It had **two** causes and 6b would have reintroduced the second.

**Cause 1, fixed in 6a and kept:** a flex item's default `min-width: auto` refuses
to shrink below its longest word, so a text child with no `min-w-0` pushes the row
wider than its container and the title gets what is left.

**Cause 2, dormant because a read-only row had no controls:** five 44px buttons
beside the title is 220px against a card about 343px wide. So the controls **wrap
to their own line below `sm`** and sit inline above it. The buttons stay 44px on
every pointer type. The row is simply taller on a phone, which costs nothing —
there is no height cap below `lg`.

**And a third thing, inherited from 6a's markup and only exposed by adding the due
chip.** 6a laid the title and its chips on one wrapping line with the title
`flex-1 min-w-0`. That reads as "the chips wrap when they run out of room" and does
the opposite: `flex-1` on a `min-w-0` item means the TITLE gives way. Measured at
375px mid-build, the title box was **90px**, wrapping "Submit peer review" over
three lines at six characters a line — defect 3, by another route. The title now
takes a line of its own, with the chips and the date on one line beneath it (which
is the Next source's arrangement, and worth ~27px a row).

Measured after: **303px and one line at 375px, 339px and one line at 1512px.**

**The row is a `<div>`, not a `<label>`.** It holds several interactive controls
and a label wrapping all of them would make pressing the note button tick the task
off. The **title** is the checkbox's label instead, which is what makes the tick
target the width of the row without `.thrive-checkbox` growing past its
design-system size.

**The control strip is right-anchored (`ms-auto`), and that is what makes the
always-present controls pixel-stable.** Above `sm` it already was, via the `flex-1`
content column — measured, Edit sits at the same x with two controls or three.
Below `sm` the strip wraps to its own line where it was LEFT-aligned, so removing
the leading control slid the rest 49px left, and expanding a card did the same in
reverse by inserting two reorder controls ahead of them. A pre-existing shift that
gating copy-to-list merely exposed. The invariant now: **a conditional control
appears and disappears at the strip's leading edge, and nothing already on screen
moves.**

Measured after: Edit at x=244 on a phone, identical with `floatingTodo` on and off.
Row heights identical there too; on desktop one of four rows is 20px shorter with
the control hidden, because the content column gains 46px and that row's chip line
stops wrapping. Card bodies stay 300px, so the grid is immovable.

**The row renders `role="listitem"`, and every caller owes it a `role="list"`
container.** That is the honest answer to a `draggable` div needing a role rather
than the one that quiets the linter: these rows were anonymous divs inside a
labelled section, and a list of tasks read as a run of text.

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
not expressible.

**And 6b is what would have broken that from the other side.** The pills count
`item.due.urgency`, which came off the *server's* descriptor. The moment a due date
became editable, "1 overdue" would have survived moving that task to next week —
the dashboard contradicting the list directly beneath it, which is the exact bug
that moved the counting to the client in the first place. Fixed by resolving once
in `+page.svelte` (§8). `check:interaction`'s *ticking every counted task takes its
pill to zero* is still green, now via real ticking rather than a seeded
`localStorage`.

**A list, not a menu.** `role="menu"` brings a single tab stop and Tab-to-exit,
which is right for a command menu and wrong for jump targets. Every item is an
ordinary tab stop; Arrow, Home and End are a convenience on top.

**Dismissal has one focus rule:** restore focus to the pill **if and only if**
focus is currently inside the panel. That covers Escape, a pointer down outside,
and focus leaving the widget. Choosing an item is the named exception — focus is
about to land on the revealed row, so it must not be pulled back on the way. Focus
follows the jump, not the dismissal.

`aria-controls` names an id that is absent while the popover is closed. **That
deviation is accepted** (owner, 2026-08-21): the alternative is a permanently
mounted panel and two permanently mounted document listeners per pill, which is
exactly what the action lifetimes in §10 exist to avoid.

**21 items is a long popover** and it scrolls at `max-h-60`. Decided: keep the
honest number, revisit a cap with a "see all in /events" tail only if the list gets
very long.

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

**Each show-more control governs its OWN region.** The Tasks card has two — the
open list's in the pinned footer, the done group's inside the body — and both used
to declare `aria-controls="tasks-card-list"`, the whole list including the group
neither of them expands. To a screen-reader user each then announces that it
expands something it does not. `#tasks-open-list` renders only when there are open
rows (so it is never an empty box taking a gap) and `#tasks-done-list` renders
always, empty while collapsed, so the id its control names is never absent.

It also cost two debugging rounds in the interaction gate, where "the control for
the open list" had to be disambiguated by document order and taking the first one
expanded Done instead — which looks exactly like the card refusing to open. Two
assertions hold it now: no two controls claim the same region, and every claimed
region resolves.

**`planReveal` has a second caller now**, which is the argument for having made it
a pure function rather than a method on the channel: `undoTick` asks it the same
question directly, with no channel involved, because it already knows which row it
wants.

### Arriving is one function, and it is the standard

**`arriveAtRow` in `$lib/arrive` is how ANYTHING on Home moves a student to a
row** (decided 2026-08-21). Never a hand-rolled `scrollIntoView`. Two arrival
treatments on one page would be worse than either alone, because a student learns
the cue once.

Asking and doing are separate modules on purpose: **`$lib/arrive`** is "I know
which row", **`$lib/reveal.svelte`** is "something else has to find it". A card
answering a channel request does both — it expands itself, then arrives.

**Two callers now:** a popover item, and 6b's undo. The calendar's "next up" is the
third and lands with the calendar.

**Not every focus move is an arrival**, and CONVENTIONS states both live
counter-examples: navigation inside a widget (`StatPopover` between its items), and
focus recovery onto a container after the row it was on stopped existing
(`UpcomingEvents` after an ignore). Marking the second would tell a student they
had been taken somewhere when they had in fact just lost their place.

#### Why the mark exists

Focus moved and the row scrolled, which was correct and **completely invisible** —
everything on Home is already on one page, so a student choosing "Submit peer
review" saw nothing change and concluded the click had failed. The focus ring is
not the answer: a pointer user does not get one.

So `arriveAtRow` focuses the row, scrolls it with `block: 'nearest'`, and marks it
with **`.thrive-arrived`** — an indigo ring, solid for most of a 1200ms beat and
then faded out.

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
- **Exactly one row is ever marked.** Any previous mark is cleared first,
  document-wide, so that holds across surfaces and not just within one.
- **Arriving twice at the same row forces a reflow** between the class removal and
  the re-add, or the browser never sees a change and the animation does not
  restart.
- **The mark is unconditional**, including for a row that needed no scrolling —
  that is exactly the case where nothing moves and the cue is the only feedback
  there is.

Focus behaviour is unchanged and the mark is additive. The accessible answer and
the visual one are different channels for different people.

#### The one-tick question, settled in 6b

`arriveAtRow` awaits exactly **one** `tick()`. 6a flagged the undo as the first
caller that might need two, since unticking moves a task between groups, and noted
that an arrival landing early is indistinguishable from a successful arrival at a
row that was already visible.

**One tick is enough. But the flush count was the wrong question, and asking it
that way would have produced the wrong fix.**

Svelte's deriveds are **pull-based**: reading one after a state write recomputes it
*synchronously*, with no flush at all. So `undoTick` unticks, READS the resulting
list, asks `planReveal` whether the restored row is past the collapsed slice,
expands the card if it is, and only then calls `arriveAtRow` — whose single tick
now has every change to flush. Three writes, one flush.

The rule for any caller, and it is in CONVENTIONS in these terms:

> **Make every state change the row's existence depends on BEFORE you call
> `arriveAtRow`. Never leave one to an effect that has not run yet.**

**Measured in a real browser, both ways.** With the expansion moved out of that
handler and into an effect, the hard case — a restored row hidden behind "show
more" — lands nowhere, focuses nothing, marks nothing, and logs **zero console
warnings**, because the gate drives the production build where `arriveAtRow`'s
dev-only warn is compiled out. Exactly the silent no-op the whole cue exists to
prevent.

**It fails loudly now, as was asked.** `check:interaction` asserts the hidden-row
arrival, and that assertion is what goes red. The dev warn still cannot be seen by
any gate, so the gate is the loud part.

The `console.warn` itself stays: it names the id it could not find, behind
`import.meta.env.DEV`, and it is a warning rather than a throw because a student
must never see an exception over a wayfinding cue.

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

**The header band carries a `min-h-11` floor** so it cannot shrink when a card's
"View all" is withheld — the link is a 44px touch target on mobile and would
otherwise be the tallest thing in a band whose title and description are short.
Measured, it is not the binding constraint on this fixture (the text block is 53px
at 375px, the link 44px), which is exactly why the floor is worth having: the
property should hold because a rule says so, not because today's copy is long
enough. No floor above `lg`, where the link is ~26px and a floor could only ever
grow a card.

**What the withheld link DID change, measured:** desktop is pixel-identical — all
four bands 67/103px, page 1218px. On a phone the Tasks band is **22px shorter**,
and the cause is horizontal rather than vertical: its description regains the width
the link took and now sets on one line instead of two. Nothing moves sideways and
nothing overlaps; the page is simply 22px shorter, at 3281px.

The show-more sits in the card's footer band rather than its body, because this
card scrolls at rest and a control inside the scroll area is unreachable exactly
when it is wanted. It is passed to `SectionCard` **only when there is something to
reveal** — the footer draws its own rule and padding, so an always-supplied
snippet that renders nothing leaves an empty ruled strip.

**Filter FIRST, then slice**, unchanged and still the behaviour: ignored events
are removed before the slice, which is what makes the next event move up instead
of leaving a gap.

**No extra wording on the card about the narrowing** (owner, 2026-08-21): the
show-more label carries it.

### Measured heights

Header block **375px → 266px** during the 6a density pass. Document
**1392px → 1238px** (6a) **→ 1218px** (6b, the read-only hint line went).

**Home fits a 1218px viewport whole.** The fixed card cap absorbed everything the
popovers, the arrival ring and all of 6b's editing added — the Tasks card scrolls
inside its own body instead. It does not fit 1052px, and the decision
(2026-08-21) is **do not cut card rows**: two task rows would make the card
useless, and "show more" exists for exactly that.

**The phone is 3303px**, up from 2949px, because a task row on a phone puts its
five controls on their own line. Accepted: there is no height cap below `lg`, so
this is a longer scroll rather than a broken layout, and the alternative was
sub-44px controls.

### Strings

**`$lib/messages` holds every user-facing string.** English only, no library, no
locale switching — this is not i18n, it is what makes i18n possible later without
a rewrite. Nested by surface, and **anything carrying a value is a function**, not
a template assembled at the call site: `showMore(count)` lets a translation move
the number, `{count} more` in markup bakes English word order in.

6b added a `taskEditing` group of ~45 entries, nearly all functions, because
almost every string there names a specific task — a screen reader must hear "Edit
Draft the case memo", not a row of buttons all called "Edit".

`stats.listLabel(count, label)` and `taskEditing.liveWithUndo(action, title, done,
total)` are the two clearest cases for the rule. The second is a whole sentence
carrying a clause, a count and an offer; assembling it at the call site would bake
the order of all three into markup, and a translation gets to put them wherever
that language puts them or drop the count from the middle entirely.

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
| `npm test` | 451 tests. Pure logic and source scans. **Nothing renders.** |
| `npm run check` | Types agree. **Does NOT prove the page renders** |
| `npm run build` | It compiles |
| `python3 scripts/check-contrast.py` | 58 assertions: 42 pairs, 6 ceilings, 10 structural |
| `npm run check:layout` | 12 routes × 3 viewports in a real browser |
| `npm run check:interaction` | 60 assertions in a real browser: the popovers, task editing, and what the cards offer to link or copy to |

**Four properties every gate here has.** The first three were the original set;
the fourth was added on 2026-08-21.

1. **It measures the thing rather than a model of it.**
2. **It reads its inputs from the source of truth.**
3. **It has been verified to fail** on the bug it was written for.
4. **It says what it does not cover.** A check that appears to cover something it
   cannot is worse than no check, because it converts an unknown into a false
   known — the absent check leaves you cautious, the misleading one makes you
   confident. Where a gate's reach stops short of what it seems to include, that
   boundary belongs *inside* the gate, at the assertion, not in a doc three files
   away.

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
button.

It reads `--thrive-arrival-duration` from the running page rather than repeating
it, and it knows no fixture ids — the task ids it needs are discovered by choosing
the popover's own items and reading where focus landed, or by reading the rows on
the page.

**Verified to fail, eight ways**, each broken on purpose:

| Broken | Result |
|---|---|
| Hover reintroduced | 6 red, including the original bug reproduced |
| The arrival mark not applied | 4 red |
| The mark never cleared | 2 red |
| The undo's expansion moved into an effect | **1 red, and NO console warning** |
| The title field's `onblur` removed | 2 red |
| A `dragend` put back on the row | 1 red (`derived_inert`) |
| `{#if href}` restored, so every card links out | 2 red (4 of 4 cards linking out) |
| The `floatingTodo` guard removed from copy-to-list | 1 red (4 copy controls, flag false) |

**The fourth is the one worth the ink.** It is the failure 6a predicted for 6b, it
produces no error and no visible difference from a successful arrival at a row that
was already on screen, and nothing else in the repo can see it.

**The sixth taught the gate a new limitation, now stated at the assertion.** Its
closing *nothing threw or warned anywhere on the way* reads like a blanket
guarantee over the page and is really a guarantee over **the gestures the script
performs**. A `derived_inert` warning was live in the production build with all six
gates green, simply because nothing dragged a row. So the gate drags one now, and
the rule is: **when a feature adds a gesture, the gate has to make that gesture**,
or its warning assertion silently narrows.

It reports **SKIP** rather than passing when the fixture cannot produce the case an
assertion needs, because silent degradation to a weaker assertion is how a gate
stops meaning anything. It also states its other blind spot: it drives the
production build, so `arriveAtRow`'s dev-only warn is compiled out and invisible
to it.

**Scope, revised.** The 6a decision was "stay on the widget that broke; extend
when something proves it needs one". 6b proved it: editing is gated through the
same script, which is where "the next thing that wants a rendered assertion"
landed. The general question — component tests via jsdom or
`vitest-browser-svelte` — is still open, and the answer so far is that driving the
built page has caught three real bugs for a dependency the repo already had.

**Anything behind `import.meta.env.DEV` has no gate by construction.** That is
usually the point, but it means the diagnostics — the code nobody exercises — are
the least covered code in the repo. Verify those by hand when they land.

Both browser gates **skip loudly and exit 0** when there is no chromium. A gate
that cries wolf gets ignored.

**`npm run check` is not a render.** `svelte-check` passed 0 errors on a component
that threw `ReferenceError` on every request — a prop was in the type but not the
destructuring, and an unknown identifier in a Svelte template is not a type error.

**And `npm run check` is held at 0 warnings, not just 0 errors.** 6b produced five
and all five were real questions: three `state_referenced_locally` on values that
are seeded once **on purpose** (each now carries a `svelte-ignore` and a note
saying why tracking them would overwrite what the student is typing), and two
`a11y_no_static_element_interactions` on drag containers, answered with
`role="list"` / `role="listitem"` because that is what those elements are.

---

## 15. Standing decisions

- **The old repo is read-only.** Verified untouched after every phase.
- **Django is not being written here**, and the port does not anticipate it beyond
  the provider signatures.
- **Measure layout in a real browser.** Never reason about pixels.
- **Drive interaction in a real browser too.** Types, tests, contrast and layout
  were all green on a dead button. Anything a person presses gets pressed by a
  gate — and anything a person *gestures* gets gestured.
- **A gate must be verified to fail** on the thing it guards, by breaking that
  thing on purpose and watching it go red.
- **Measure the counterfactual, not just the fix.** Confirming the good version
  works says nothing about *why*. Breaking it on purpose is what showed that the
  undo arrival depends on ordering rather than luck — without that step it would
  have been recorded as "one tick was fine", which is true and useless.
- **Say when a check cannot see what it looks like it checks**, at the assertion.
- **A silent no-op is the worst failure mode this app has.** It is what made the
  reveal read as a dead click, what an id-parsing row lookup did before `tickItem`
  dispatched on the attached source row, what a hover-swallowed press looked like,
  and what an undo arrival without its expansion does. Where a courtesy can
  silently not happen, prefer it failing loudly — and where it currently cannot,
  say so at the definition.
- **A control with two ways in has more states than it has booleans.** If two
  input methods can produce the same visible state, the state has to record which
  one produced it — or the second method will undo the first.
- **A correct implementation of a bad interaction is still bad.** The `openedBy`
  work was real engineering spent making hover behave, and the right answer was
  that hover should not have been there.
- **Delete an abstraction that loses its last caller**, unless a specific named
  surface wants it. `hoverIntent` went the day hover did. `escapeKey` was kept
  through Phase 4 with no caller against **two named surfaces** — and both arrived,
  which is the vindication of naming them rather than hoping.
- **Moving a student to a row goes through `arriveAtRow`.** One function, never a
  hand-rolled `scrollIntoView`. And **write everything before you call it** — the
  flush count is not the mechanism, the ordering is.
- **Resolve persisted overrides once per page, not once per consumer.** Two views
  of one list that can disagree is a bug waiting for the first edit.
- **Feedback beats correctness.** A correct action that shows nothing reads as a
  failure. "It works" and "it appears to work" are different acceptance criteria
  and only one of them is the product.
- **A feature whose destination is switched off still needs a confirmation.**
  Copy-to-list writes to a store nothing renders, so it got a toast rather than
  shipping as a button that does nothing visible.
- **Making an invisible state visible means auditing every path it can now
  reach.** 6a surfaced unparseable due dates; 6b found the RangeError that had been
  unreachable behind them.
- **A control whose result is invisible is worse than no control.** Copy-to-list
  is gated on the flag that owns its destination, and a "View all" is withheld while
  its route is parked. Both are the same rule: an action that appears to do nothing
  teaches the student that the app is broken.
- **An assertion's expected value must not be derived from the thing under test.**
  A gate that inferred a feature flag from the page matched the very control the
  flag gates, and so passed with the guard removed. Parse the source of truth.
- **A link to a page that is not built is worse than no link.** A student who
  spends a click to reach a placeholder distrusts the next link. Derive "is this
  built" from the navigation, so building a route restores its links with no edit.
- **A control's `aria-controls` must name the region it actually expands.** Two
  controls claiming one region is a promise to a screen reader that neither keeps,
  and it makes "the control for this list" ambiguous to anything scripting the page.
- **Prefer a type to a rule someone has to remember.** "You cannot drop into Needs
  a date" is `Exclude<GroupKey, 'unknown'>`, not a runtime guard and a comment.
- **A discard control must out-race every save-on-focus-loss path.** `blur` fires
  before `click`, so Cancel needs both a pointer flag and a `relatedTarget` check.
- **Durations are either motion or dwell**, and they do not share tokens.
- **Full CONTEXT regeneration is for accumulated drift across a session**, not for
  a four-spot delta inside one.
- **`@lucide/svelte`, not `lucide-svelte`** (the latter is pinned to Svelte 3/4).
- **`cn()` survives** for the `class`-override case only.
- **Vitest in Node, no jsdom.** Matches the prototype, where rendering was
  deliberately never tested.
- **Probe before asserting.** Test suites are written against observed output from
  a throwaway probe, not assumed behaviour. That includes a probe's own selectors
  and its own input synthesis: three checks failed on correct code because
  `ShowMore` also carries `aria-expanded`, and in 6b a synthetic `input` event left
  a submit button disabled, which made "add a task" look broken when it was not.
  **Suspect the probe before the product.**
- **`npm run check` is held at 0 warnings**, and a warning is answered rather than
  suppressed — or suppressed with a note saying why the compiler is wrong here.
- **Diff a port, do not review it.** Signatures grepped and compared; bodies
  diffed comments-stripped.
- **Any test asserting an absence needs a companion assertion that it can still
  see a presence.**
- **Keep a test's seam on the test's side of the wall** where possible. A
  test-only export is permanent.
- **Extract strings as you build**, not afterwards.
- **No Claude/Anthropic attribution anywhere** — commits, PRs, file headers.
  Verified clean across all 53 commits.

---

## 16. Voice and copy

Calm, plain, honest about what is simulated.

- Say plainly when something is a prototype or is not wired up. A placeholder
  that mimics a real answer teaches the student to trust something that is not
  there — which is why `AssistantConversation` has no brain and says so, and why
  `providers.ts` marks the request and resume flows **SIMULATED** in place.
- **The Tasks card's read-only hint is gone**, along with the disabled checkboxes
  it explained. Copy that exists to apologise for an unfinished feature has to be
  deleted the moment the feature lands, or it becomes a lie.
- Empty states are an invitation to act, never "No data". Never a dashed outline.
- "Overdue" alone, not "Overdue by 3 days" beside "3 days ago".
- Counts and timers in mono and tabular, so a row does not reflow.
- **If an action changes state the student cannot see, it needs a cue.** And if it
  changes state that then *removes the row*, it needs a sentence — hence
  "…is back on your list, but it is due past this week so it is not shown here."
- **Name the subject in an accessible label.** Five identical "Edit" buttons in a
  list are five buttons a screen-reader user cannot tell apart.
- Comments explain **why**, not what.

---

## 17. Open loose ends

**Blocking before any multi-person demo**

1. **The three mock stores are process-global.** §9 defect 1. Concurrent students
   book over each other and see each other's data; everything resets on restart.
   An `adapter-node` process has the same module-scope hazard the Next server had.
   **Django is the fix.**

**Next up**

2. **The calendar** — 15 components, the largest surface. Needs
   `buildScheduleData()`, still unported, which wants five providers that now
   exist. Two things are waiting there specifically: the **`eventIdOf` key-space
   defect**'s calendar half (item 9 below), and the **"next up" arrival** (item 15).

3. **`/assignments`** — the same `TaskRow`, with no `reorder` prop, since it has no
   groups to move between. It is the first outside caller of the row and **owes it
   a `role="list"` container**; the row renders `role="listitem"`.

4. **Then:** appointments, then the **Ask THRIVE page** — three tabs (chat, class
   recommender, job recommender), a chat window, and a **saved chat history rail on
   the LEFT beside the nav rail**, so two rails sit side by side. Wired to
   **Shankar's RAG** later.

**New from 6b**

5. **The collapsed Tasks card scrolls ~124px inside its fixed body.** A desktop row
   is 61–81px rather than 54px because five 44px controls plus a 44px add button
   cannot fit 300px. The grid still cannot move. `COLLAPSED_TASK_ROWS = 3` would
   fit and is a visible change to Home's densest card — owner's call. Recorded at
   the constant.

6. **Nothing gates the drag on touch.** HTML5 drag does not fire there at all,
   which is why the keyboard move buttons exist — but no gate asserts those buttons
   are the only route on a phone, or that they are reachable there. **Flag again
   when we test on a real phone** (owner, 2026-08-21).

7. **`/calendar` keeps its card link while its own body is still a note.** It is in
   `primaryNav`, so `isBuiltRoute` says yes, and the rail already links there — so a
   card doing the same is no worse. Worth revisiting only if "in the navigation" and
   "has real content" come apart for longer than one phase.

**Carried**

8. **Provider copies are shallow.** `{ ...version }` shares nested arrays with the
   store. Pinned by a test that says why.
9. **`npm test` renders nothing.** A component can render the wrong content with
   correct types, correct classes and no page overflow. `check:interaction` now
   covers the popovers and task editing on one page; it is still not a general
   answer.
10. **Home fits 1218px, not 1052px.** Accepted. Phone is 3281px.
11. **Three dead providers:** `getSyllabi`, `getResources`, `getCurrentResume`.
12. **`requestTypeHelp` has no consumer** anywhere in the prototype.
13. **The ignore store key-space defect** — Home and the calendar keyed it
    differently. Home is fixed (raw `Event.id`, no prefix stripping); the calendar
    half lands with the calendar.
14. **`thrive:event-joins` is keyed on the calendar item id**, not the raw
    `Event.id` (§9 defect 13). Home's "Count me in" is deliberately visual-only
    rather than writing to a different key.
15. **Two product decisions parked pending real screens:** the missing year in
    `formatShortDate`, and `countdownPhrase` counting to "13 months".
16. **`taskNotes` on `createOverrideStore`?** It duplicates the persistence logic.
    6b used it heavily and did not need the refactor, which is mild evidence
    against bothering.
17. **`format.ts` still emits `"Invalid Date"` from `formatShortDate`.**
18. **A parseable-but-wrong date still gets through** `describeDue`: V8 rolls
    `"2026-02-30"` into March.
19. **The calendar's "next up" uses `arriveAtRow` directly**, not the reveal
    channel — it knows its own item, so there is nothing to ask. **Unless** it has
    to reach a row inside a collapsed day group, which is the channel's shape
    again. Decided: settle it when the calendar lands. Note 6b's rule applies
    either way: write the expansion before arriving.
20. **`matchesWide()` is still unported** — listed in CONVENTIONS as a sanctioned
    client read for a surface that does not exist yet.
21. **A task moved beyond seven days leaves Home's list.** Correct — Home is "what's
    next" — and now announced rather than silent, but a student who dates something
    three weeks out has no way to see it here. `/assignments` is where it lives.

**Closed this session**

- **Phase 6b is done.** Ticking, undo, rename, priority, notes, due dates, reorder,
  add.
- **`arriveAtRow`'s single `tick()`** — answered, and the answer is about ordering,
  not counting. Now gated.
- **The done-group branch in `TasksCard`'s reveal effect** was built in 6a for 6b's
  undo. It is exercised now.
- **"Mount `Toast`?"** — mounted, and it turned out to be a requirement rather than
  a nicety.
- **`escapeKey` and `clickOutside` each have a second caller.** `DueDateEditor`.
- The `readOnlyHint` string and the disabled checkboxes are gone.
- **The shared `aria-controls` on the Tasks card's two show-more controls.** Each
  governs its own region now, and two assertions hold it.
- **"View all" links landing on placeholders.** Withheld while a route is parked,
  derived from `primaryNav`.

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
Resource Navigator surface, (d) per-task time estimates. **(a) is now complete** —
Home is real and editable, no longer "pending 6b". Three were never begun.
