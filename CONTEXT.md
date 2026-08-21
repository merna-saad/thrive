<!-- updated-at: bac3fbf -->

# CONTEXT

The living context file. Read this and you should be able to pick up the work
without asking anyone.

**Regenerated in full every handoff.** Never patch it — a partial edit leaves
stale claims sitting beside fresh ones with no way to tell them apart.

This regeneration was **deferred across two phases on purpose** (owner, twice),
because three calendar phases were in flight and a stale-and-flagged file beats a
half-patched one. It therefore covers 7a and 7b together, and the deferral is
itself the evidence for the rule: before this pass the file still said the calendar
"lands in a later phase" while two thirds of it was built and pushed. Stale is
survivable; contradictory is not.

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

### The standing rule, and the three shapes it now has

**Where MIGRATION.md and the prototype source disagree, the source wins, and it
gets reported.** Exercised three times — §2 overstated `buildSlotsFor`'s
determinism, §2 omitted that provider copies are shallow, and §4's one-line entry
for the task-editing components omits `lib/taskBoard.ts` entirely, which is where
most of the behaviour actually lives.

**Shape two: sometimes the source is simply WRONG, and porting it verbatim is the
bug.** Every date converter in the Next `taskBoard.ts` throws a `RangeError` on a
due date that will not parse (§7). The agenda rendered all three groupings
identically, so a type-grouped list showed thirty days of rows each reading "9:30
AM" with nothing saying which day (§14).

> **The right instinct when the source is wrong is to improve on it, not to port
> the mistake** (owner, 2026-08-21). Recorded as a rule because it will come up
> again, and because "the source wins" read alone points the other way.

**Shape three, new in 7b: sometimes the source contradicts ITSELF, and there is no
behaviour to defer to.** MIGRATION §4 and `WeekView.tsx`'s own doc comment both
say week view is not rendered below `40rem` and the parent falls back to the
agenda. `CalendarView.tsx` renders it at every width, and `WeekView` handles narrow
screens with `overflow-x-auto` + `min-w-[42rem]` — a horizontal scroll, which is
the exact thing that comment calls the wrong answer.

> **A source that contradicts itself is not a source to follow** (owner,
> 2026-08-21). "The source wins" resolves a disagreement between the spec and the
> code. It cannot resolve a disagreement inside the code, and reaching for it there
> would have shipped the scroll.

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

Two things now queued need it rather than merely wanting it — Ask THRIVE's saved
chat history and Group Projects' shared data. See §18.

**No shadcn-svelte and no bits-ui yet.** Deferred deliberately; `MIGRATION.md`
§4 lists the Radix primitives that will need equivalents. The stat pill popover
and the due-date editor are both hand-built floating widgets rather than deferred
to one of them — see §13. The calendar added one more hand-built control and one
deliberately native one: the key bar's chips are labelled checkboxes, and the
agenda's grouping control is a plain `<select>` (§14).

**One dependency added since Phase 1: `playwright-core`** (2026-08-21), for the
layout gate. It has since paid for itself several times over: the same dependency
carries the interaction gate and every by-hand browser pass, and between them they
have caught a dead button five other gates called green, a `derived_inert` warning
live in the production build, the undo arrival's silent no-op, and 7b's unclamped
`line-clamp`. `@types/node` was rejected in Phase 5 because
`import.meta.glob(..., { query: "?raw" })` did that job with nothing added — the
rule is "do not add one where the platform already answers", not "never add one".
See DEPENDENCIES.md.

**No dependency changed in 7a or 7b.**

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
| 6b | Task editing — tick, undo, rename, priority, notes, due date, reorder, add | done |
| — | Honest affordances: no link to a parked route, no copy with nowhere to copy | done |
| **7a** | **Calendar spine — `buildScheduleData`, month grid, selected day, day sections** | **done** |
| **7b** | **Calendar views + filter — switcher, week, agenda, key bar** | **done** |
| **next** | **7c — item detail, add form, the events section** | not started |
| then | `/assignments` — the same `TaskRow`, no groups | not started |
| then | Appointments | not started |
| then | **Ask THRIVE — a full page: second left rail, chat, saved history** | scoped, not built |
| later | **Group Projects — a fifth nav item, and the first shared surface** | scoped, not built |
| later | Floating widgets, behind `FEATURES` | not started |

**507 tests, 23 spec files, all passing**, and green in **all seven timezones** of
the sweep. `svelte-check` clean over 411 files. Build clean. Contrast **58/58**.
Layout **36/36**. Interaction **60/60**. 71 commits, all pushed.

**147 files under `frontend/src`** — ~22,933 lines, 16,625 source / 6,308 test.

**Two routes are now built:** `/` and `/calendar`.

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

**`indigo` has three consumers now, and they are all the same sentence.** "You are
here" in the navigation, `.thrive-arrived` (the ring on a row something has just
moved the student to), and the calendar's two markers: today's date in a week
column, and the "next up" item — named in the header's line and outlined in the
square strip so the two agree. An arrival cue and a "this is next" marker *are*
"this is where you are now", so this widened indigo's use without weakening its
meaning. Anything else wanting indigo has to make that same argument.

**`categoryDot` / `categoryTag` are the one place hues are used CATEGORICALLY
rather than as status**, and they are exempt from the reservations by construction:
eleven calendar streams need more distinct dots than the reserved palette supplies,
which is why the categorical `civic` plum and the neutral `later` slate exist.
Every dot is paired with a written label in the key and in every row, so no meaning
there rests on colour alone. **Coral is deliberately absent from that map** — a
month grid dotted coral on every assignment day would drain "overdue" of meaning,
so assignments take amber, which already means "due soon" on a `DueChip`.

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

**The calendar was the rule's largest single test, and it is the biggest visual
difference from the prototype.** The Next calendar set the day figure, the
breakdown line, the whole "next up" sentence, every category tag, the view
switcher, the key bar's chips, the weekday initials and the agenda's group headings
in mono. Here only the values are: the day figure, the `n of m done` fraction, the
clock times, the day numbers, the `+n` overflow, and the group counts. Everything
made of words is DM Sans.

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

**Still nine after 7a and 7b**, which is worth noting: two phases and thirteen new
components added no new treatments. The calendar's panels are `.thrive-panel`, its
rows are `.thrive-row`, its strike-through is `.thrive-strike`, and its key-bar
chips are ordinary utilities.

- **`.thrive-popover`** carries only a WIDTH:
  `min(--thrive-popover-width, 100vw - 2 * --thrive-popover-viewport-inset)`. The
  clamp is what stops a pill near the right edge opening a panel off the screen.
  Not a `max-width`, or three pills would open three different-width lists.
- **`.thrive-arrived`** is the arrival ring. See §13, and note it is the only one
  of the nine applied from TypeScript rather than markup — which is why
  `designSystem.spec.ts` scans `.ts` files too.
- **`.thrive-checkbox` did not grow for 6b.** A 17px box is below the 24px WCAG
  2.5.8 pointer target the Next row cited when it built a 24px skin. Rather than
  change a design-system size, the row makes its **title** the checkbox's
  `<label>`, so the tick target is the width of the row.

### One token added in 7a: `--thrive-checkbox-size`

17px, and it replaced that number written in two places. `.thrive-checkbox` sizes
itself from it, and any row rendering a **spacer** where a checkbox would go
reaches for the same value via `size-checkbox` — the calendar's `ItemRow` does,
which is what makes a list of classes and tickable tasks align in one column
instead of two ragged ones. The Next version hardcoded `size-[17px]` there: a
literal that agrees with the stylesheet only until somebody resizes the control.

Measured after: the time column lands at a single x across tickable and untickable
rows.

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
it cannot drift apart. `check-interaction.mjs` reads the same token for the same
reason.

**1200ms is a judgement, not a measurement**, and it stands until a real student
says otherwise (decided 2026-08-21).

### `transition-colors` includes `outline-color`, and that has two consequences

Found in 7b while verifying the key bar's focus ring.

**One: a computed style read immediately after a state change is a reading of the
transition, not the value.** `getComputedStyle(chip).outlineColor` the instant
focus lands returns the *starting* colour — `currentColor`, i.e. the chip's text —
and settles on `--thrive-primary` 120ms later. It nearly bought a permanent change
to a class string justified by a comment stating a wrong measurement. **Wait past
the longest transition on an element before reading a computed style.** In
FINDINGS.

**Two: every focusable element carrying `transition-colors` has a focus ring that
FADES IN.** Minor, and `Button.svelte` already avoids it by enumerating
`transition-[background-color,color,border-color,opacity]` rather than reaching for
the shorthand — an enumeration now known to be load-bearing rather than fussy. Not
swept repo-wide; recorded so the next person choosing between the two knows what
the shorthand includes.

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

**It does not show the popover, the arrival ring, or anything the calendar added,
and that is a decision** (owner, 2026-08-21): it is slated for deletion, so it is
not worth the time.

---

## 7. Dates: the rule the framework no longer enforces

**Components never see a raw timestamp.** Dates are classified and formatted on
the server inside `load` functions; components receive pre-formatted strings.

Full statement in `CONVENTIONS.md`. The short version:

- Read the clock in a `load` function. **Once.** Home's `+page.server.ts` calls
  `new Date()` a single time and every classification measures against it — two
  calls are two answers, and a task classified against 11:59:59 while the next
  line reads 12:00:00 is somehow both today and overdue. The calendar's load does
  the same and takes **three** values off that one instant: `todayKey`,
  `nowMinutes` and `nowISO`.
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

### The sanctioned client reads — and the calendar DECLINED one

The list is unchanged, but its first entry now has a consumer that chose not to be
one, and the reasoning generalises.

1. **`nowMinutes()`** in `calendarSources.ts` — minutes past midnight. **Still
   has no caller.** It was written for the calendar's "next up" line and the
   calendar reads the server's clock instead, via `nowMinutesAt(now)` in
   `buildSchedule.ts`.

   **Why it was declined.** In Next, `CalendarView` was a `"use client"` component,
   so its memo could only ever run in a browser. The Svelte component renders on
   the SERVER first, so a `$derived` calling `nowMinutes()` would run during SSR:
   the server would paint one "next up" row and one ringed square, and the browser
   would silently replace both a beat after hydration. That is the quiet drift this
   whole rule is about. The value freezes at page load either way, so the client
   read costs a visible flip and buys nothing.

   Kept on the list for a caller that genuinely runs only in a handler.
2. **`matchesWide()`** in the floating-panel geometry — listed, and **not ported
   yet**; the floating panels are a later phase. Note 7b did NOT become its first
   consumer: see the viewport rule below.
3. **`TaskNotes`' autofocus gate** — `matchMedia('(hover: hover)')`, added in 6b.
   Opening the note panel is an explicit request to write, so focus lands in the
   field, but only where a keyboard will not cover the screen.

**Read (3) against the deleted one, because they look identical and are not.**
`hoverIntent` read `(hover: hover)` to gate hover-to-*reveal*, which is CSS —
Tailwind's `hover:` utilities compile to that media query with no JavaScript
needing an opinion. `TaskNotes` decides whether to move **focus**, and there is no
CSS form of that to prefer. That is the whole test: *could CSS have done this?*

**A `Date.now()` used as an id nonce is not a clock read** in the sense this rule
is about. `quickList.ts` and `taskBoard.ts`'s `mintTaskId` both use one; neither
is ever parsed back into a day. A nonce is not a date.

### A viewport question that CSS can answer belongs in CSS

7b is where the hover rule was first tested on something other than hover, and it
held.

The week-to-agenda fallback (§14) is **two media-gated wrappers**, not a
`matchMedia` read. Three reasons, in order of weight: CSS has an exact equivalent
so the JS form buys nothing; a `matchMedia` read has to GUESS during SSR, so one
width of student watches the wrong view paint and be replaced after hydration; and
the cost is only that both subtrees build, which is cheap and keeps the hidden one
out of the accessibility tree via `display: none`.

**Pick the breakpoint by measuring, not by naming a size.** 40rem was built first
because that is the number MIGRATION and the Next comment both use. Measured, it
gave 71px columns — correctly clamped and still not readable — so it moved to 48rem
and 89px. "Fits" and "is legible" are different bars. **And the knob is always the
breakpoint:** a min-width would put back the horizontal scroll the fallback exists
to remove, which is what the source did.

### The accepted client-side formats

Locale-formatting differences, never date drift. Every one of these formats a day
key already built from local parts.

| Where | Why it cannot move to the server |
|---|---|
| The calendar's day heading | The day is chosen in the browser |
| The agenda's group headings | The range is walked client-side |
| `taskToItem` / `todoToItem`'s `timeLabel` | Their source rows are `localStorage`-only |
| **`MiniCalendar`'s month label and each day cell's accessible date** (7a) | The grid pages to ANY month with no round trip — the whole point of keeping classes as weekday rules — so there is no finite set of months a `load` could pre-format |
| **`WeekView`'s weekday abbreviations** (7b) | Same: the week is chosen client-side |
| **The agenda's per-row date** (7b) | Same: the thirty-day range is walked client-side |

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
reserved for real deadlines, and a missing date is a data problem.

That ordering has two consequences, one found per phase. **In 6a:** four undated
rows fill the collapsed slice on their own and push the overdue task off screen;
`reveal.spec.ts` pins that path. **In 6b: making those rows visible made a latent
crash certain** — every date converter read `new Date(fromISO).getHours()`, which
is `NaN` for an unparseable date, and `Invalid Date.toISOString()` **throws a
RangeError**. All three converters now guard it via one `clockFrom` helper.

**The lesson generalises and is in FINDINGS:** when you make a previously
invisible state visible, audit every path that state can now reach.

### The timezone sweep is part of the definition of green

Seven zones from UTC+14 to UTC−11, including Australia/Lord_Howe's 30-minute DST
offset. **Run it after touching anything date-shaped**, and it has now caught two
real failures.

The second, in 7a, is the instructive one. `reveal.spec.ts` had `NOW` as a `Z`
instant with `Z` due dates beside it — the exact shape TESTING.md forbids two
paragraphs above the sweep command. `tsk-today` at `2026-08-21T23:00:00Z` is
already *tomorrow* anywhere east of UTC+2, so the "every overdue and due-today task
stays reachable" property counted one row instead of two. Red in Asia/Tokyo,
Asia/Kathmandu and Australia/Lord_Howe; green in the other four including both
extremes.

**The bug was the FIXTURE, not `describeDue`.** A task due at 23:00 local on the
21st really is due today. Reaching for the classifier would have broken correct
behaviour to make a wrong test pass. And the file had never been swept: TESTING.md
claimed the suite was green in all seven zones and it was not, because that line
was written before that test was. **A verification claim decays exactly like a
comment does.**

---

## 8. The persistence layer

`frontend/src/lib/overrideStore.svelte.ts` is the one mechanism. 14
`localStorage` keys sit on it, plus `taskNotes` and `toast`.

**This is browser state, and a different thing from the three server-side mock
stores in §12.** Same word, opposite properties: this one is per-student and
survives a restart; those are shared by everyone and do not.

**And it is the layer that runs out first.** Everything persisted so far is one
student's private view of their own data, which is exactly what `localStorage` is
for. The two features queued in §18 are not: saved chat history is too large and
too long-lived, and Group Projects is shared between people by definition.

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

**Property 2 is visible on the calendar and is correct there.** `mergedSchedule`
reads nine stores, all empty until `hydrateStores()` runs, so the server and the
first client render both show "no personal items" and the student's own tasks,
to-dos and custom events land on the render after mount. A saved filter appearing
a beat after load is the same property and is expected.

### Resolve overrides ONCE per page, not once per consumer

Home has two things reading the same task list: the stat pills and the Tasks card.
`+page.svelte` calls `resolveRows` and hands the same array to both. If the card
resolved its own, moving a due date would restyle the list while the coral pill
above it went on counting the server's stale `due.urgency`.

**The calendar's form of the same rule is "one filter, applied once"** — see §14.

### Three key spaces, never merge them — and the HIGH defect that is now closed

| Space | Module | Keyed on |
|---|---|---|
| Task id | `userEdits.svelte.ts` | the task's own id |
| Calendar item id | `calendarItems.ts` | `asg-12`, `apt-3`, `task-7`, `todo-x`, `custom-…`, `evt-evt-3-1` |
| Raw `Event.id` | `ignoredEvents.ts` | `evt-3-1` — **stored verbatim** |

**The ignore store's two surfaces did not share a key space, and this was graded
HIGH.** Fixed in 7a.

`eventIdOf` strips exactly one leading `evt-`. Given a calendar item id
(`evt-evt-3-1`) that recovers the raw id. Given a RAW id — which begins with `evt-`
too — it *mangles* it to `3-1`. And **the store was normalising its own
arguments**, so Home's write to `evt-3-1` landed under `3-1` while the calendar's
landed under `evt-3-1`. Each surface self-consistent, neither able to see the
other: ignoring an event on Home left it showing on the calendar and the reverse.

**The fix is that the store normalises NOTHING it is handed.** It keys on precisely
the string given, and the one surface holding a prefixed id — the calendar — calls
`eventIdOf` once at its own boundary. `filterSchedule` was always in the raw space,
so **Home was the broken side**, and no Home component changed: every call site
there already passed `event.id` raw.

`eventIdOf`'s doc comment used to claim "passing a raw id through twice is safe".
That false sentence is why the bug was written twice, and it is gone.

**Old keys are inert, not migrated** (owner). An event ignored on Home before the
fix reappears once. Absence means "never touched" in this store, so a stale key is
harmless rather than corrupt, and a migration shim whose only input is a browser
nobody can inspect is worse than the one-time reappearance.

**The double prefix itself is deliberate and stays.** Every calendar item id names
its stream, and events are the one stream whose source ids share that prefix.
Dropping it would make the space non-uniform — `asg-12`, `apt-3`, `task-7`, then a
bare `evt-3-1` — and the label and urgent stores are keyed on that space.

**Student-created task ids are prefixed `own-`** so they cannot collide with a
fixture's. `removeAddedTask` clears the five sibling overrides too.

### What is deliberately NOT persisted

Card collapse state, and the reveal channel that can drive it (§13). Also: the
drag in progress, the open editor, the note draft before it commits, the live-region
sentence, and the calendar's `selectedKey` / `monthKey` — a selected day is a
momentary place, not a preference. **The calendar's FILTER is persisted**, through
`calendarPrefs`, because a filter that resets on every navigation is a filter
nobody uses twice.

### `.svelte.ts` is not decoration

Svelte only processes runes in `.svelte.js` / `.svelte.ts`. A plain `.ts` with
`$state` is **silently inert**. Six files carry the suffix: `overrideStore`,
`userEdits`, `taskNotes`, `toast`, `ignoreUndo`, `reveal`.

**And the suffix is a claim, so it has to be true in the other direction too.**
`arrive.ts` is DOM code with no runes and is a plain `.ts` for exactly that reason.
7a and 7b added five pure modules and **no seventh rune file**.

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
| `useTaskBoard`'s two `useMemo`s and three `useCallback`s | Deriveds recompute on read |
| `TaskNotes`' `latest` ref + syncing `useEffect` | `onDestroy` reads the draft directly |
| **`MiniCalendar`'s `gridRef` + `requestAnimationFrame`** | A ref to query the grid, and a frame's guess at when the month had re-rendered. `bind:this` plus `await tick()` is the flush, not a guess |
| **`CalendarView`'s five `useMemo`s** | Same as above: filter, labels, next-up, squares, day groups all recompute on read |

**Two collapses were requested and made:** `localDayKey(iso)` folded into
`dayKeyOf(value: Date | string)`, and `CalendarView`'s
`view === "agenda" ? <Agenda/> : <dayPanel/>` became a **snippet** rendered by two
branches — the ternary read as "agenda is the odd one out" and hid that the day
panel is shared by month and week.

**One hook was split rather than translated.** `useTaskBoard` did resolution,
grouping, counting and mutation in one place; here grouping and counting are
`homeGroups.ts` (6a) and resolution plus the date arithmetic are `taskBoard.ts`
(6b).

**Hooks that became module singletons:** `useTaskToggle` → `taskToggle`,
`useIgnoreEvents` → `ignoreEvents`. One undo slot app-wide rather than one per
calling component. **The reveal channel is deliberately NOT one** — see §13.

**`onDestroy` is not a `useEffect` teardown, and 6b needed the difference.**
`TaskNotes` commits its draft on destroy; written as an `$effect` returning a
cleanup it would commit on every keystroke.

---

## 10. The shell

`frontend/src/lib/components/shell/` — `AppShell`, `SideRail`, `TopBar`,
`BottomNav`.

- **`nav.ts` is the single source** for the rail and the bottom bar.
  `PagePlaceholder` looks its own `href` up and **throws** when there is no
  match, which is what makes that a guarantee rather than an intention.
- **The top bar is 48px above `lg`, 56px below.** The CONTROLS change size — 44px
  touch, 36px pointer — and the bar's height follows from them. WCAG 2.5.5 asks
  44px of a touch target and 2.5.8 asks 24px of a pointer one. The stat pills, 6b's
  editor buttons, and 7b's view switcher and key-bar chips all follow the same pair
  (`min-h-11` below, relaxing above).
- **`--thrive-page-gutter-bottom`** is the page's bottom breathing room, used
  twice: on mobile added to the bottom nav's height, and above `lg` it is the whole
  padding.
- **Icons are component references held as values.** Not `<svelte:component>`,
  deprecated in Svelte 5.
- **Accessibility:** skip link, `main` landmark with `tabindex="-1"`, exactly one
  `nav` landmark in the a11y tree at a time, `aria-current="page"` on the active
  item.
- **`Toast` is mounted here**, once, for every route.

**One thing the shell will have to grow:** Ask THRIVE wants a SECOND left rail
beside the nav rail (§18). The single-`nav`-landmark rule is the constraint to
design against.

### The app-wide toast

`toast.svelte.ts` shipped in Phase 3b with six tests and **no consumer**. 6b's
copy-to-quick-list is the first caller and would have been the worst possible one
to leave unrendered: the floating quick list is feature-flagged off, so the copy
has **no visible destination either**.

`role="status"` rather than `alert`: copying a row is not urgent and must not
interrupt a screen reader. The region is **mounted always** and only its text
changes, because a live region created and populated in the same tick announces
unreliably. `pointer-events-none` so a confirmation can never swallow a press.

**It currently has no caller, and that is expected** (owner, 2026-08-21). Copy-to-
list is gated on the same flag, so the toast and its one raiser return together.

### The two actions

`frontend/src/lib/actions/` — `escapeKey` and `clickOutside`. Svelte actions rather
than translated `useEffect`s, and the shared shape is that **the listener's
lifetime is the element's**: put one inside an `{#if open}` and it exists exactly
when the thing it dismisses does.

Callers: `StatPopover` and `DueDateEditor` for both. **Neither gained a third in
7a or 7b** — the calendar has no dismissible floating surface yet; `ItemDetail` in
7c is the candidate.

`clickOutside` takes `alsoInside` because a disclosure's own trigger is not inside
its panel but *is* inside its widget. Without it, pressing the trigger to close
fires the dismissal, the panel unmounts, and the trigger's own click reopens it.

**The same shape, one level up.** `TasksCard` clears its drag state from a
`document` `dragend` listener inside an `$effect` keyed on `drag !== null`. Not an
action, because no element's lifetime matches — the drag outlives any one row.

**`hoverIntent` existed and was deleted**, same day. See §16.

### Feature flags

`FEATURES.floatingTodo` and `FEATURES.floatingAssistant`, both `false`. Mount
points exist in `AppShell`, gated.

**`floatingTodo` gates a second thing: the task row's copy-to-list control.** The
quick list is the only surface where a copied item is visible, so with the flag off
the copy succeeded, persisted, and showed the student nothing.

**A flag that gates a destination should gate the routes INTO it.** That is the
generalisable form.

**A note the calendar sharpens:** the quick list's *items* now surface somewhere
the flag does not gate. The agenda renders undated to-dos, which are `QuickItem`s,
and they are tickable there. That is deliberate — the agenda is the only view that
can carry them and they would otherwise be invisible forever — but it means the
store has a visible consumer while its panel does not.

---

## 11. Routes and navigation

13 routes. **Four are in the navigation:** Home, Calendar, Appointments, Ask
THRIVE — in that order. **Two are built:** `/` and `/calendar`.

Nine of the previous eleven destinations were placeholders, and a nav that is
four-fifths stubs reads as broken rather than unfinished.

**A fifth nav item is coming.** Group Projects (§18) will be the first addition
since the trim to four — and the first time the four-slot bottom bar has to hold
five things.

### Parked, not deleted

`/classes`, `/syllabi`, `/assignments`, `/degree`, `/events`, `/career`,
`/resources` and **`/settings`** live in `parkedNav` — a list **no surface
renders**. The routes, files, icons and descriptions are intact and reachable by
URL; the only thing removed is the way in.

**Why a separate list rather than a `hidden` flag:** a flag needs every surface to
remember to filter on it, and the failure mode of forgetting is a parked item
silently reappearing in one place.

**`allNav`** is the lookup list — visible plus parked. `PagePlaceholder` resolves
against it, so parking a route does not start it throwing.

**Settings is parked and stays parked** (confirmed 2026-08-21). It was also the
reason the mobile **More sheet** could go.

**Two parked routes are scoped to be absorbed rather than unparked.** Ask THRIVE's
second rail names Resources and Career (§18).

### A card links out only when its destination is built

`isBuiltRoute(href)` asks `primaryNav`, and `SectionCard` renders its "View all"
only when the answer is yes. **`primaryNav` membership IS the definition** of a
real destination, so moving a route out of `parkedNav` restores every card's link
with no further edit.

Decided in `SectionCard` rather than per card: four cards link out and three
pointed at parked routes, so the alternative was four places to forget.

**Which cards lost their link:** Tasks (`/assignments`), My Classes (`/classes`),
Upcoming Events (`/events`). Today's classes keeps `/calendar` — and that link now
lands on a real page, which it did not when the decision was made.

**`isKnownRoute` is the companion**, separating a parked route from a mistyped one.
`SectionCard` warns in development on an href in neither list. A warning and not a
throw: taking Home down over a "View all" would be worse than the missing link.

**`/classes` will not be built, and its card stays link-less indefinitely**
(owner, settled — do not revisit). The card IS the feature.

**`/assignments` is parked and is the next real consumer of a 6b component.** It
renders the same `TaskRow` with no `reorder` prop, and **owes that row a
`role="list"` container**.

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

1. **Every provider returns a `Promise`.**
2. **Every provider returns copies.** *The copies are shallow*, as in the
   prototype — see §18.
3. **Deterministic generation. Never `Math.random()`**, which desynchronises
   server from client. A test scans the whole directory.
4. **Fixtures dated relative to now**, so a demo never looks stale.

### The three module-level stores

`mock/appointments.ts`, `mock/requests.ts`, `mock/resume.ts`. Lazy seeding,
because their dates are relative to "now" and module load may be hours earlier.

**The id generators count independently of the seeds.** They work only because
somebody numbered the request seed `req-000` by hand and set the resume counter to
4. Commented at the generator, and pinned by a test.

### Five providers finally have a calendar consumer

`buildScheduleData()` was the gating unported piece from Phase 2 to 7a. It reads
**`getCourses`, `getAssignments`, `getEvents`, `getMyAppointments`, `getAdvisors`**
in one `Promise.all` — see §14 for what it does with them.

### Four MIGRATION §9 defects built correctly rather than reproduced

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

**There is exactly one student, and Group Projects is the first thing that breaks
that assumption** — see §18.

### The fixture's shape, measured

**10 tasks** (8 open, 2 done — 1 overdue, 2 due today, 5 upcoming), and **159
upcoming events, 21 of them inside seven days**, generated 2–4 per day across a
rolling horizon. That 21-against-4 is what forced the events card decision in §13.

**Event ids are `` `evt-${dayOffset}-${i}` `` — already `evt-`-prefixed**, which is
the root of the key-space defect in §8. Verified at `mock/events.ts:287`.

**The eight open tasks are why the collapse matters and why one gate check can run
at all.** Four are shown collapsed, so `check:interaction` can tick the last of the
eight, collapse the card, and undo into a row that is genuinely not rendered.

**No fixture task has an unparseable due date**, which is why the crash in §7
survived to be found by reading rather than by using the app. **And no fixture item
carries a label**, which is why the calendar key's labels dimension had to be
exercised by seeding the store by hand (§14).

---

## 13. Home

The dashboard, and the only editable surface. `+page.server.ts` awaits **six
providers in one `Promise.all`** and calls `new Date()` once. Four cards in a
**2×2 grid** at `lg`, one column below it.

**What is deliberately not computed on the server:** the three stat counts. They
have to see the student's persisted ticks, edits and ignores, which only exist in
the browser. What goes down is the classified rows and, on each event row, a
`thisWeek` flag: the data to count, not the count.

**`+page.svelte` resolves the task rows once**, for both consumers. See §8.

### The fit-on-one-screen behaviour

- **Desktop: a FIXED height per card body, scrolling inside.** Fixed, not
  `max-height` — with a maximum, a short card still *grows* when expanded, moving
  its grid row. Fixed means expanding can only ever scroll.
- **Mobile: no cap at all.** A nested scroll region inside a page that already
  scrolls eats the swipe meant for the page.
- **The state does not persist.** An expanded card is a momentary intent.
- **`contain: paint`** on the card body — load-bearing, see BUGS.md.

**Cap: `--thrive-card-body-cap: 18.75rem` (300px)**. Collapsed row COUNTS live in
`$lib/cardLayout`: **4** task rows, **2** course cards, **4** class rows,
`VISIBLE_EVENTS = 4`. **`COLLAPSED_TASK_ROWS` stays at 4** (owner, settled).

### Tasks is flat when collapsed, grouped when expanded

The one real design decision in 6a, and it came from measuring: the card carried
~190px of fixed furniture before its first row. So the progress bar moved into the
header band and the collapsed view shows a flat list of the next four things.
Headings come back on expand.

**6b inherited a consequence: reordering is offered only when EXPANDED.**
Collapsed, the rows are a flat slice spanning several groups, and sort keys are read
*per group* — so "move this up" across a group boundary would persist a key and
change nothing on screen.

### Task editing (6b)

| Component | Role |
|---|---|
| `TaskRow` | The row. Checkbox, title-as-label, chips, due chip, 44px controls, two disclosure panels |
| `UndoBar` | Fixed at the TOP of the list. Deliberately **not** a live region |
| `DueDateEditor` | The due chip as a button opening a native `<input type="date">` plus three shortcuts |
| `PriorityPicker` | Three radios, not a select. Deliberately uncoloured by its own value |
| `TaskNotes` | Draft local, committed on blur, on close, and on destroy — never per keystroke |
| `AddTaskForm` | Collapsed to one button. Title the only required field |

**A native date input rather than a hand-rolled calendar.** Keyboard-operable and
screen-reader-labelled for free, and on a phone it raises the platform's own picker.

**Three radios rather than a select**, because there are exactly three values.
**`AddTaskForm` keeps a native `<select>`** and that is not an inconsistency: on a
row, priority is one of three values being *changed* in a strip where all three
should be visible; in the form it is one of four fields being *filled*.

**Notes commit on blur, on close, and on destroy.** The third matters: ticking a
task elsewhere regroups the row and can unmount the panel mid-sentence. Escape
**closes without discarding** — the opposite of the title editor, because a title
has an original to restore to and prose does not.

**The title commits on blur too, which the Next source did not do.** That forced a
guard: `blur` fires *before* `click`, so pressing Cancel would have committed the
draft. Both halves are needed — a `pointerdown` flag for mouse, touch and
**Safari** (where clicking a button does not focus it, leaving `relatedTarget`
null), and a `relatedTarget` check for the keyboard.

**"Needs a date" accepts no drops**, enforced as a type:
`DatedGroupKey = Exclude<GroupKey, 'unknown'>`.

**No `justChanged` ring.** This app has ONE arrival treatment. A tick is answered
by the row striking through, moving to Done, the undo strip, and the live sentence.
The ring is spent on the **undo**.

**One live region, and the undo strip is not a second one.** The sentence is cleared
after 4s so the *same* move announced twice is announced the second time too.

### The row's structure, and defect 3 twice over

MIGRATION §9 defect 3 — "the worst thing in the app" — was every task title
wrapping to roughly one character per line at 375px. It had **two** causes and 6b
would have reintroduced the second.

**Cause 1, fixed in 6a:** a flex item's default `min-width: auto` refuses to shrink
below its longest word. **Cause 2, dormant because a read-only row had no
controls:** several 44px buttons beside the title is ~220px against a 343px card,
so the controls **wrap to their own line below `sm`**.

**And a third thing, exposed only by adding the due chip.** `flex-1` on a `min-w-0`
title means the TITLE gives way, not the chips. Measured at 375px mid-build the
title box was **90px**. The title now takes a line of its own.

Measured after: **303px and one line at 375px, 339–385px at 1512px.**

**The row is a `<div>`, not a `<label>`.** It holds several controls and a label
wrapping all of them would make pressing the note button tick the task off. The
**title** is the checkbox's label instead.

**The control strip is right-anchored (`ms-auto`).** The invariant: a conditional
control appears and disappears at the strip's leading edge, and nothing already on
screen moves.

**The row renders `role="listitem"`, and every caller owes it a `role="list"`
container.**

### The stat pill popovers

Each pill opens a popover listing the actual items behind its number, clickable and
jumping to the row.

**Click, and only click.** Hover-to-open was built, gated, tried, and **rejected**:
three pills in one row meant a cursor crossing it opened and closed panels nobody
asked for.

**A count of zero is not a control.** No button, no `aria-expanded`. It keeps
`min-h-11` so a row of pills is never two heights.

**The count and the list are one expression** — each pill's number is
`items.length` of the list it opens.

**A list, not a menu.** `role="menu"` brings a single tab stop and Tab-to-exit,
right for a command menu and wrong for jump targets.

**Dismissal has one focus rule:** restore focus to the pill **if and only if** focus
is currently inside the panel. Choosing an item is the named exception.

**21 items is a long popover** and it scrolls at `max-h-60`.

### The reveal channel: the page owns the intent, the cards own their state

- **`$lib/reveal.ts`** is pure and tested. `planReveal(ids, limit, targetId)` is the
  one question a card asks. `found: false` is kept distinct from "found, and already
  visible".
- **`$lib/reveal.svelte.ts`** carries the request. A popover calls
  `reveal.request({ kind, id })` and knows nothing else. Nothing outside a card ever
  writes a card's state.

**The channel lives in page CONTEXT, not at module scope.** That is what keeps
"collapse resets on navigation" true because of where the channel lives rather than
because something remembers to reset it. This is the one place the module-singleton
pattern of §9 was rejected.

**The nonce is load-bearing.** Two clicks on the same item are two requests, and
with only a target in the slot the second write is `target === target` and Svelte
makes it a no-op — precisely the click a student makes when the first did not seem
to work.

**Each show-more control governs its OWN region.** Two controls claiming one region
is a promise to a screen reader that neither keeps.

**`RevealKind` is a closed union — `'task' | 'event'` — on purpose.** Nothing in 7a
or 7b needed a third, and it was checked rather than assumed: the calendar's "next
up" line is a static sentence, not a jump, so no calendar surface asks the channel
for anything. A third member would force an id-space decision, which is why the
union is closed. **The calendar has added no arrival caller at all yet.**

### Arriving is one function, and it is the standard

**`arriveAtRow` in `$lib/arrive` is how ANYTHING moves a student to a row.** Never a
hand-rolled `scrollIntoView`. Two arrival treatments on one page would be worse than
either alone.

Asking and doing are separate modules: **`$lib/arrive`** is "I know which row",
**`$lib/reveal.svelte`** is "something else has to find it".

**Two callers:** a popover item, and 6b's undo. The calendar was expected to be the
third and **is not** — see the note above.

**Not every focus move is an arrival.** Two live counter-examples: navigation inside
a widget (`StatPopover` between its items, and now `MiniCalendar`'s arrow-key grid
movement), and focus recovery onto a container after the row it was on stopped
existing (`UpcomingEvents` after an ignore).

`MiniCalendar` is the clearest case for the distinction: it moves focus on every
arrow press, and marking each one would turn a wayfinding cue into a cursor.

#### Why the mark exists

Focus moved and the row scrolled, which was correct and **completely invisible** —
everything on Home is on one page. The focus ring is not the answer: a pointer user
does not get one.

`arriveAtRow` focuses the row, scrolls it with `block: 'nearest'`, and marks it with
**`.thrive-arrived`** — an indigo ring, solid for most of a 1200ms beat then faded.

- **Indigo** because it is the reserved "you are here" colour.
- **An outline**, because it cannot move the layout, does not collide with the row's
  own priority wash, and follows the element's own `border-radius`.
- **The ring is a normal declaration and the animation only takes it away**, because
  the global reduced-motion block forces `animation-duration: 0.01ms !important` and
  a mark *painted* by a keyframe would vanish instantly.
- **Exactly one row is ever marked**, document-wide.
- **Arriving twice at the same row forces a reflow** between removal and re-add.
- **The mark is unconditional**, including for a row that needed no scrolling.

#### The one-tick question, settled in 6b

`arriveAtRow` awaits exactly **one** `tick()`. **One tick is enough — but the flush
count was the wrong question.**

Svelte's deriveds are **pull-based**: reading one after a state write recomputes it
synchronously. So `undoTick` unticks, READS the resulting list, asks `planReveal`,
expands the card if it must, and only then arrives.

> **Make every state change the row's existence depends on BEFORE you call
> `arriveAtRow`. Never leave one to an effect that has not run yet.**

**Measured both ways.** With the expansion in an effect instead, the hard case lands
nowhere and logs **zero console warnings**, because the gate drives the production
build where the dev-only warn is compiled out.

### Upcoming Events: collapsed is four, expanded is this week

The events pill counts events *this week* — 21 in the fixture — while the card showed
four *upcoming*, so seventeen popover items had no row to jump to.

The fix rests on both sets being **prefixes of the same list**.
`expandedEventLimit(collapsedLimit, weekCount)` returns `max` of the two, and a test
asserts the prefix property. The `max` is not decoration: on a quiet week the week
count is *shorter* than the collapsed slice.

**Filter FIRST, then slice** — ignored events are removed before the slice, which is
what makes the next event move up instead of leaving a gap.

### Measured heights

Header block **375px → 266px** (6a density pass). Document **1392px → 1238px** (6a)
**→ 1218px** (6b). **Home fits a 1218px viewport whole**, not 1052px, and the
decision is **do not cut card rows**. **The phone is 3281px.**

### Strings

**`$lib/messages` holds every user-facing string.** English only, no library. Nested
by surface, and **anything carrying a value is a function**, not a template
assembled at the call site.

6b added a `taskEditing` group of ~45 entries. 7a and 7b added a `calendar` group of
~50, with the same property: `countPart(count, singular, plural)` hands a translation
both word-forms so it can pluralise its own way, and `dayLabel(date, items, today)`
decides what a day cell says and in what order rather than letting markup concatenate
it.

**This is a standing rule, not a Home thing.** Every surface extracts its strings as
it is built, or Mandarin stops being possible.

---

## 14. The calendar

**The second built surface, and the largest.** `/calendar` — 13 files, ~2,011 lines.
7a built the spine, 7b the other two views and the filter. 7c is item detail, the add
form and the events section.

### The load: one clock read, three values, and no merge

`routes/calendar/+page.server.ts` awaits `buildScheduleData()` and `getTasks()` in
one `Promise.all`, calls `new Date()` once, and returns `todayKey`, `nowMinutes` and
`nowISO` off that single instant.

**Tasks are fetched here and deliberately NOT merged here.** A task's due date can
be moved by the student and stored only in `localStorage`; a student can add tasks
the server has never seen; a quick-list to-do has no server row at all. Merging
server-side would render a date the student has already changed.

### `buildScheduleData` returns two shapes, and that is the whole design

Five providers flattened into one `ScheduleData`:

- **Dated rows** — assignments (`asg-`), events (`evt-`), appointments (`apt-`) —
  each pinned to one `dayKey` with `timeLabel` and `sortMinutes` pre-computed.
- **Classes as WEEKDAY RULES** — `dayOfWeek` + a wall-clock `startTime` + a
  pre-rendered `timeLabel`, expanded onto whichever days a view is showing.

**That split is why the month grid can page to any month with no round trip.**
Pre-expanding classes would mean either choosing a horizon on the server and having
the grid go blank past it, or shipping every meeting of the term to render one month.
A wall-clock time carries no timezone, so expanding it is safe wherever it happens.

An event with no distinct `end` becomes `allDay: true` with `timeLabel: "All day"`
and `sortMinutes: 0` — a marker for the day rather than a slot on it.

### The three rules that hold it together

**1. ONE filter, applied once.** `filterSchedule` runs on the whole `ScheduleData`
in `CalendarView` before anything renders, and the month grid, the week columns and
the agenda all read that one result. **No view filters for itself.** The old failure
— a dot on a day with no row beneath it — is structurally impossible rather than
something to remember.

The checkable consequence, and the one to verify in a browser after any change here:
**switching view does not change what a day COUNTS.** The header figure, the
`n of m done` fraction and the month dots are all derived from the filtered data
independent of `prefs.view`. Measured across a month-to-week switch: 5 and 5.

**2. ONE `selectedKey`.** Owned by `CalendarView`, read and written by every view,
so switching view never loses the student's place. Selecting a day from an adjacent
month pulls the view onto that month so the selection is never off-screen.

**3. The clock is the server's.** `nowMinutes` arrives as a prop. Nothing in the
subtree asks the browser what time it is — see §7 for why the sanctioned client read
was declined.

### The components

| File | Role |
|---|---|
| `CalendarView` (401) | **The only stateful node.** Owns `selectedKey`, `monthKey`, `detail`. Merges, filters once, and renders the day panel as a **snippet** shared by month and week |
| `MiniCalendar` (355) | The month grid. Up to 3 category dots per day plus `+n`, a roving tabindex, full grid keyboard navigation |
| `KeyBar` (240) | The key AND the filter. Two dimensions that never merge — below |
| `ItemRow` (209) | One item in the shape every view renders it. Three shapes: full, `compact`, and full-with-a-date |
| `AgendaView` (140) | A flat grouped list over 30 days. **The only view that can carry undated to-dos** |
| `CalendarHeader` (123) | The day's summary: big figure, breakdown, `n of m done`, "next up", the square strip |
| `WeekView` (116) | Seven columns. Not rendered below `48rem` |
| `SquareGrid` (103) | A day's items as squares. Re-exports `SquareCell` / `SquareGroup` from `calendarDay` |
| `ViewSwitcher` (87) | month / week / agenda as a radiogroup, plus the **agenda-only** grouping select |
| `DaySection` (65) | One titled group on the selected day |
| `DayGroupToggle` (49) | Arrange the day by type (default) or time |

### The pure layer behind it

Everything that could be a decision rather than markup was extracted, because
**Vitest runs in Node with no jsdom, so logic inside a `.svelte` file is logic no
gate can see.**

| Module | Holds |
|---|---|
| `schedule.ts` | The vocabulary. Category maps, the three category sets and their guards, grid arithmetic, `filterSchedule`/`isVisible`, grouping, `nextUpItem` |
| `buildSchedule.ts` | `buildScheduleData`, `todayKey`, `nowMinutesAt` |
| `calendarSources.ts` | `taskToItem`, `todoToItem`, `mergedSchedule` |
| `calendarDay.ts` (7a) | The selected day: `sortDayItems`, `arrangeDay`, `squareGroupsFor`, `dayCountParts` |
| `calendarViews.ts` (7b) | The views: `agendaRange`, `showsRowDate`, `undatedTodoItem`, `visibleUndatedTodos` |
| `calendarPrefs.ts` | `normalisePrefs` + the persisted store |
| `calendarItems.ts` | Custom events, labels, urgent — keyed by calendar item id |
| `ignoredEvents.ts` | `eventIdOf`, `canIgnore`, the store — keyed on raw `Event.id` |
| `tickItem.ts` | `tickItem`, `isTickable` — dispatching on the attached source row |

**Each extracted function has a branch that has already been got wrong once:**

- **The two-slice concatenation.** `schedule` and `personal` are two filtered slices
  of an already-sorted day, and two sorted lists joined end to end are not sorted, so
  every task landed after every class regardless of when it was due. `arrangeDay`
  sorts again.
- **The tickable denominator.** A section's fraction used to read `done /
  items.length`, so a group holding one finished task and two classes rendered "1/3"
  and implied three things could be ticked.
- **"1 classes".** `class` is the only irregular plural in the category list.
- **The attached source row on an undated to-do.** Built as an object literal in the
  prototype's markup, which is exactly where a field gets dropped — and dropping
  `quickItem` renders a checkbox that appears to tick and reverts on the next render.
  `undatedTodoItem` is a named construction with a test asserting the MECHANISM via
  `isTickable`.

### Ticking dispatches on the attached source row, never on a parsed id

`mergedSchedule` puts the resolved `Task` or `QuickItem` on each item and `tickItem`
reads it. `isTickable` asks that same question — is a writable source attached — not
whether `done` happens to be set, and never by slicing a prefix off an id.

The id-parsing version missed every task the student added themselves (those live in
`addedStore`, not the server's array) and every undated to-do in the agenda (whose
synthetic id was never prefixed). Both failed identically and **silently**: the guard
found nothing and returned, the checkbox appeared to tick, and the next render put it
back.

### `KeyBar`: two dimensions that do not merge

```
STREAMS   where a thing came from      fixed, legendOrder, known at build time
LABELS    what the student called it   open-ended, appears as they use it
```

**One list of chips is the obvious simplification and it is the wrong answer.** A
stream is a KIND OF THING that every student has; a label exists only because this
student typed it. Mixed together, "Career" and somebody's "thesis" look like the same
kind of switch.

They are kept apart **structurally, not by styling**, so an edit cannot flatten them
by accident: separate headings, separate `<ul>`s each with their own
`aria-labelledby`, separate prefs fields (`hidden` / `hiddenLabels`), separate helpers
(`toggleCategory` / `toggleLabel`), different accessible-name shapes ("Hide Class" vs
"Hide items labelled thesis"), a dot on a stream and never on a label, and the labels
section absent entirely when nothing is labelled. **Nothing iterates a merged array.**

**`allLabels` runs on the UNFILTERED merge**, and that is load-bearing: from
`filtered`, switching a label off would remove its own chip from the key and leave no
way to switch it back on.

**Off reads as off, not as absent** — a hidden stream keeps its chip, dimmed and
struck through. `hide all` exists and so does the warning that follows it: an empty
page the student caused and might not remember causing is the one case that owes an
explanation.

The three toggles are real checkboxes so keyboard and screen-reader behaviour come
from the platform. They are `sr-only`, which means the app's global focus ring lands
on a 1px clipped box — `has-[:focus-visible]` moves it out to the chip at the same
2px primary outline and offset the base layer draws, so there is one focus treatment
rather than two.

### The week-to-agenda fallback, at 48rem

Seven columns on a 375px screen gives each one about 50px, narrower than the word
"Assignment". So below `md` the week grid does not render and the agenda answers.

**The Next source never had this.** MIGRATION §4 and `WeekView.tsx`'s own comment
both claim it; `CalendarView.tsx` renders the week at every width and `WeekView`
papers over narrow screens with `overflow-x-auto` + `min-w-[42rem]`. See §3, shape
three.

**It is CSS** — two media-gated wrappers, for the reasons in §7. Below the
breakpoint, week renders **exactly what agenda renders** (list, no day panel); the
alternative, list plus day panel, is a shape no view has. And it **says so on
screen**: the switcher still shows "week" selected, because that is the student's
choice and it is honoured the moment the screen is wide enough, so the page owes a
reason rather than appearing to have ignored the click.

**48rem, not 40rem, and the difference was measured.** 40rem gave 71px columns —
correctly clamped and still reading as three short stacks. 48rem gives 89px, with
~75px of text per title, enough that whole words land on a line.

| width | week columns | column | agenda | note | h-overflow |
|---|---|---|---|---|---|
| 1330px | 7 | 132px | — | no | 0px |
| 900px | 7 | 108px | — | no | 0px |
| 769px | 7 | 89px | — | no | 0px |
| 768px | 7 | 89px | — | no | 0px |
| 767px | 0 | — | 28 groups | yes | 0px |
| 375px | 0 | — | 28 groups | yes | 0px |

**There is no min-width and no horizontal scroll in `WeekView`.** The fallback is
what guarantees the room, so a scrollbar would mean the fallback was doing nothing.
**The knob is the breakpoint, never a min-width.**

### The agenda is the only view that can carry undated to-dos

Which is the whole reason it exists rather than being a nicer month grid. They have
no day, so they are not in `ScheduleData` at all — they travel beside it as
`MergedSchedule.undatedTodos` and get their own section, because pretending they are
due today would be a lie the student did not tell.

**`filterSchedule` cannot reach them, so `visibleUndatedTodos` applies the two
dimensions that can, by the same rules.** `showDone` is obvious. **`urgentOnly` hides
all of them**, because urgent is applied by `mergedSchedule`'s `annotate` over
`data.dated` only, so an undated to-do can never carry the flag — and leaving them in
meant switching urgent-only on emptied the whole page except that one section, which
reads as a broken filter. **That is `filterSchedule`'s own recurring-classes rule
finished, not a new one**, and nothing in `filterSchedule` changed.

They render `allDay: false` with an empty time column, departing from the source's
`allDay: true` — which made `ItemRow` label every one "all day", a claim about a day
they do not have.

### Agenda rows name their own date when the grouping is not by day

Grouped by day the heading IS the date and repeating it is noise. Grouped by type or
by course, a row's time alone does not say which of thirty days it falls on — and **a
time without a date, in a list spanning a month, is the wrong half of the information
rather than less of it.** The prototype rendered all three groupings identically.
`showsRowDate` is the decision, in the pure layer. Kept on review (owner).

The range is **anchored on TODAY, not on the selection**: the agenda answers "what is
coming up", and an anchor that moved with the selection would answer a different
question every time a student touched the month grid.

### Two known-and-accepted gaps

**The day's figure counts events that have no rows until 7c.** A day can read "5"
above three rendered rows. Both alternatives are worse: filtering events out of the
count and the dots breaks "one filter, applied once" and changes the grid twice, and
folding events into a generic day group ships them without their register controls,
blurb and relevance badge. Pinned by a test that states the reason. **Stands unless
the owner says otherwise after seeing it.**

**`check:layout` only ever visits `/calendar` in its DEFAULT view.** Empty
`localStorage` means `normalisePrefs` returns `view: 'month'`, so week and agenda are
unvisited by every gate — which matters most for the agenda, 13,764px tall on a phone.
Covered by hand at eight widths in all three views. **Approved for 7c.**

### What has no gate, and was verified by hand instead

`check:interaction` stays scoped to Home (owner's instruction), and nothing in 7a or
7b argued for extending it: both phases moved their decisions into the pure layer
where the suite can see them. What is left is genuinely browser-only, and was driven
against the production build:

- **`MiniCalendar`'s keyboard grid.** 42 cells, one tab stop, arrows in all four
  directions with focus and selection agreeing, Home/End six days apart,
  PageDown/PageUp moving the month while focus survives the swap **and the document
  does not scroll** — the Next version's shared `preventDefault()` sat after the
  branch that returns, so paging also scrolled the page. Six ArrowUps pull the view
  back a month; a trailing-cell click pulls it forward.
- **The 48rem boundary**, the table above.
- **The filter end to end.** Hiding a stream took the month dots 57 → 40, persisted,
  survived a reload, and was restored by "show all". Urgent-only took 114 agenda rows
  to 0 and removed the undated section too. Show-ignored read "(1)" and took 114 → 115.
- **The labels dimension**, which needed a seeded `thrive:item-labels` because **no
  fixture item carries a label**. Hiding "thesis" removed the row and left the chip.
- **Ticking**, on the calendar and in the agenda's undated section: both wrote to
  their stores and survived a reload.
- **A chip by keyboard**, ring on the chip at `--thrive-primary`, Space toggling.

No console warnings or errors at any width, in any view.

---

## 15. The gates

| Command | What it proves |
|---|---|
| `npm test` | 507 tests. Pure logic and source scans. **Nothing renders.** |
| `npm run check` | Types agree. **Does NOT prove the page renders** |
| `npm run build` | It compiles |
| `python3 scripts/check-contrast.py` | 58 assertions: 42 pairs, 6 ceilings, 10 structural |
| `npm run check:layout` | 12 routes × 3 viewports in a real browser |
| `npm run check:interaction` | 60 assertions in a real browser: the popovers and task editing |
| the timezone sweep | The suite in seven zones, UTC+14 to UTC−11 |

**Four properties every gate here has.**

1. **It measures the thing rather than a model of it.**
2. **It reads its inputs from the source of truth.**
3. **It has been verified to fail** on the bug it was written for.
4. **It says what it does not cover.** A check that appears to cover something it
   cannot is worse than no check, because it converts an unknown into a false
   known. Where a gate's reach stops short, that boundary belongs *inside* the gate,
   at the assertion.

**Property 2 has teeth.** Two gates parse a source file rather than restating it:
`check-contrast.py` parses `app.css`, and `check-interaction.mjs` parses
`features.ts` for `floatingTodo` — the second added *after* a version that inferred
the flag from the page matched the very control the flag gates.

**`check:layout` asserts the page cannot scroll further than it paints.** It does
**not** use `documentElement.scrollHeight` — that is the property that reported
1275px while nothing rendered below 1238px.

**`check:interaction` exists because the other five were all green on a version
where pressing a pill did nothing at all.** None of the others can press a button.

**Verified to fail, ten ways**, each broken on purpose:

| Broken | Result |
|---|---|
| Hover reintroduced | 6 red, including the original bug reproduced |
| The arrival mark not applied | 4 red |
| The mark never cleared | 2 red |
| The undo's expansion moved into an effect | **1 red, and NO console warning** |
| The title field's `onblur` removed | 2 red |
| A `dragend` put back on the row | 1 red (`derived_inert`) |
| `{#if href}` restored, so every card links out | 2 red |
| The `floatingTodo` guard removed from copy-to-list | 1 red |
| **The ignore store's normaliser reinstated** (7a) | **7 red across two spec files** |
| **`block` put back beside `line-clamp-3`** (7b) | measured 140px vs 60px — no gate, found by hand |

**The ninth carries its own lesson, and it is about the shape of the test rather
than the bug.** One direction of the new cross-surface ignore test *still passes*
with the bug reinstated, because both sides then share the same mangling — write
`"3-1"`, read `"3-1"`. **"Crosses two surfaces" is not the property that catches a
key-space split; not sharing a transformation is.** The four assertions that pin the
STORED KEY are what actually go red.

**The tenth had no gate at all**, which is the honest entry in this table. An
unclamped `line-clamp` is not an error: the text is all there, nothing throws, and
it only looks wrong if you happen to be measuring row heights in a narrow column.

`check:interaction` reports **SKIP** rather than passing when the fixture cannot
produce the case an assertion needs. It also states its blind spot: it drives the
production build, so `arriveAtRow`'s dev-only warn is compiled out and invisible.

**Scope, revised twice.** 6a: "stay on the widget that broke". 6b proved editing
needed it. **7a and 7b did not extend it, by instruction and by judgement** — both
phases answered "what can only a browser prove?" by moving everything else into the
pure layer, and then drove the remainder by hand. The general question — component
tests via jsdom or `vitest-browser-svelte` — is still open.

**Anything behind `import.meta.env.DEV` has no gate by construction.**

Both browser gates **skip loudly and exit 0** when there is no chromium.

**`npm run check` is not a render.** `svelte-check` passed 0 errors on a component
that threw `ReferenceError` on every request. **And it is held at 0 warnings.** 7a
produced three and all three were real questions: one `a11y` complaint about a grid
role on a non-interactive `<abbr>` (answered by moving the role onto a wrapping div,
which is what that element actually is), and two `state_referenced_locally` on state
seeded from a prop, answered with `untrack` — which says out loud that the prop is
the initial value and not a source the state follows.

---

## 16. Standing decisions

- **The old repo is read-only.** Verified untouched after every phase.
- **Django is not being written here** — but two queued features now require it
  (§18).
- **Measure layout in a real browser.** Never reason about pixels.
- **Drive interaction in a real browser too.** Anything a person presses gets
  pressed; anything a person *gestures* gets gestured.
- **A gate must be verified to fail** on the thing it guards. This is the only thing
  that distinguishes a passing check from a check that cannot fail.
- **An assertion's expected value must not be derived from the thing under test.**
- **"Crosses two surfaces" does not make a test non-vacuous.** Not sharing a
  transformation does. Count which assertions go red, do not trust the shape.
- **Measure the counterfactual, not just the fix.**
- **Say when a check cannot see what it looks like it checks**, at the assertion.
- **A silent no-op is the worst failure mode this app has.** The reveal reading as a
  dead click, an id-parsing row lookup, a hover-swallowed press, an undo arrival
  without its expansion, a checkbox with nothing to write to, and **an unclamped
  `line-clamp`** are all the same failure.
- **A control with two ways in has more states than it has booleans.**
- **A correct implementation of a bad interaction is still bad.**
- **Delete an abstraction that loses its last caller**, unless a specific named
  surface wants it. `hoverIntent` went the day hover did. `Toast` is the counter-case
  and not an exception: its one raiser returns on the same flag.
- **Moving a student to a row goes through `arriveAtRow`**, and **write everything
  before you call it**.
- **`RevealKind` is closed on purpose.** A third member forces an id-space decision,
  so it is made deliberately or not at all.
- **Resolve persisted overrides once per page**, and **apply the calendar's filter
  once per page**. Two views of one list that can disagree is a bug waiting for the
  first edit.
- **Never resolve a row by parsing its id.** Attach the resolved source object at
  merge time and dispatch on that.
- **A normaliser that cannot distinguish its input cases is a defect, not a
  helper.** `eventIdOf` cannot tell a raw event id from a calendar item id, so the
  store normalises nothing and the one prefixed surface converts at its own boundary.
- **Feedback beats correctness.** "It works" and "it appears to work" are different
  acceptance criteria and only one of them is the product.
- **A control whose result is invisible is worse than no control**, and **a link to a
  page that is not built is worse than no link.** Derive the condition from the thing
  that owns the destination so building it restores the affordance with no edit.
- **If a fallback hides something the student explicitly chose, say so on screen.**
- **Making an invisible state visible means auditing every path it can now reach.**
- **A control's `aria-controls` must name the region it actually expands.**
- **Prefer a type to a rule someone has to remember.**
- **A discard control must out-race every save-on-focus-loss path.**
- **Durations are either motion or dwell**, and they do not share tokens.
- **A viewport question CSS can answer belongs in CSS.** The JS form is for cases
  with no CSS equivalent — moving focus, not choosing a layout.
- **Pick a breakpoint by measuring, not by naming a size**, and the knob is always
  the breakpoint. "Fits" and "is legible" are different bars.
- **A utility that works by setting `display` conflicts silently with every
  `display` utility.** `line-clamp-*`, `truncate`, `sr-only`.
- **Wait past the longest transition on an element before reading a computed
  style.** `transition-colors` includes `outline-color`.
- **A verification claim decays exactly like a comment does.** TESTING.md said the
  suite was green in seven zones and it was not, because that line predated the test
  that broke it. Re-run the sweep on any date-shaped change, not just on new
  date-shaped code.
- **Where the source and MIGRATION disagree, the source wins.** Where the source is
  *wrong*, improve on it. Where the source contradicts **itself**, it is not a source
  to follow at all.
- **CONTEXT is regenerated in full every handoff** — with the owner able to defer it
  across a run of phases, which is what happened for 7a and 7b. A same-session patch
  is a sanctioned exception for a small delta.
- **`@lucide/svelte`, not `lucide-svelte`.**
- **`cn()` survives** for the `class`-override case only.
- **Vitest in Node, no jsdom.** Which is why logic gets extracted out of components.
- **Probe before asserting.** **Suspect the probe before the product** — three checks
  failed on correct code because `ShowMore` also carries `aria-expanded`, a synthetic
  `input` event left a submit button disabled, and a computed style read at t=0
  reported the wrong colour.
- **`npm run check` is held at 0 warnings**, and a warning is answered rather than
  suppressed.
- **Diff a port, do not review it.**
- **Any test asserting an absence needs a companion assertion that it can still see a
  presence.**
- **Extract strings as you build**, not afterwards.
- **No Claude/Anthropic attribution anywhere** — commits, PRs, file headers.
  Verified clean across all 71 commits.

---

## 17. Voice and copy

Calm, plain, honest about what is simulated.

- Say plainly when something is a prototype or is not wired up. A placeholder that
  mimics a real answer teaches the student to trust something that is not there —
  which is why `AssistantConversation` has no brain and says so, and why
  `providers.ts` marks the request and resume flows **SIMULATED** in place.
- **Copy that apologises for an unfinished feature has to be deleted the moment the
  feature lands**, or it becomes a lie. The Tasks card's read-only hint is gone.
- **Sometimes the honest answer is to say nothing.** A "View all" pointing at a
  placeholder was replaced by no link rather than by a caption explaining why.
- **But sometimes it is to say exactly what happened.** The week fallback tells the
  student their screen is too narrow rather than silently showing a different view —
  the difference from the case above is that here the student made a choice and the
  page is not honouring it yet.
- Empty states are an invitation to act, never "No data". Never a dashed outline.
- "Overdue" alone, not "Overdue by 3 days" beside "3 days ago".
- Counts and timers in mono and tabular, so a row does not reflow.
- **If an action changes state the student cannot see, it needs a cue.** And if it
  changes state that then *removes the row*, it needs a sentence.
- **Name the subject in an accessible label.** Five identical "Edit" buttons in a
  list are five buttons a screen-reader user cannot tell apart. The calendar's chips
  say what pressing them will DO — "Hide Class" — rather than what is currently true.
- Comments explain **why**, not what.

---

## 18. Open loose ends

**Blocking before any multi-person demo**

1. **The three mock stores are process-global.** MIGRATION §9 defect 1. Concurrent students
   book over each other and see each other's data; everything resets on restart.
   **Django is the fix**, and two queued features (5 and 6) now depend on it.

**Next up**

2. **7c — the calendar's last third.** `ItemDetail` (a dialog with every edit
   control: label, urgent, delete), `AddItemForm` (three kinds routing to three
   different stores), and `DayEventsSection` ("happening, register" — join / leave /
   `.ics` / ignore, its own section because opting in is a different act from ticking
   off).

   Four things queued to land with it:
   - **`thrive:event-joins` is keyed on the calendar item id**, not the raw
     `Event.id` (MIGRATION §9 defect 13). **It is the same bug as §8's, in a second store**,
     and it is LOW only because its one consumer does not exist yet. 7c builds that
     consumer, so the key-space choice gets made with `DayEventsSection` on screen
     rather than in the abstract. The mechanism is settled; what 7c must decide is
     whether the raw `Event.id` is right for joins too (it almost certainly is — a
     join is a fact about an EVENT, not about a calendar row) and how to write a
     cross-surface test that is non-vacuous in **both** directions.
   - **`check:layout` extended to the week and agenda views** (owner: approved).
   - **The day-figure gap closes on its own** once events have rows.
   - **`ItemDetail` is the candidate third caller** for `escapeKey` and
     `clickOutside`.

3. **`/assignments`** — the same `TaskRow` with no `reorder` prop. First outside
   caller of the row, and **owes it a `role="list"` container**.

4. **Appointments.**

**Scoped, not built**

5. **Ask THRIVE as a full page.** **This replaces the earlier tabs-on-top idea** —
   do not build tabs.

   The shape: **a SECOND left rail, beside the nav rail**, holding three sub-items —
   **Resources, Course Recommender, Career** — plus a **chat window** and **saved
   chat history**.

   Two things to settle before building:
   - **Saved chat history cannot live in `localStorage`.** Too large, too long-lived,
     and the first persisted thing that is not a small override keyed by id. Needs
     **Django or Shankar's service**.
   - **Two rails and one `nav` landmark.** §10 keeps exactly one `nav` in the a11y
     tree at a time.

   Also unsettled: Resources and Career are the subjects of two PARKED routes (§11).
   And `FEATURES.floatingAssistant` still exists — a floating assistant plus a page
   with chat and history is two homes for one conversation.

   Wired to **Shankar's RAG** later.

6. **Group Projects — a future FIFTH nav item.** Group members, a project holding
   tasks and subtasks, assigning a task to a person.

   **The first feature that is not one student's private view**, and that is the whole
   difficulty:
   - **Real accounts.** MIGRATION §9 defect 2 — no auth on any server action — stops
     being a note and becomes a blocker.
   - **A shared database.** Every persistence property in §8 assumes one person's
     overrides in their own browser.
   - **The fixtures model one student** (§12).
   - **The nav has four destinations by decision**, and the mobile bar has four slots.

**The real-phone list**

7. Two things wait on a session with an actual handset, because a simulated viewport
   cannot answer either:
   - **Touch drag on Home's task rows.** HTML5 drag does not fire on touch, which is
     why the keyboard move buttons exist — but no gate asserts those buttons are the
     only route on a phone or that they are reachable there.
   - **The month grid at 375px.** The page is 1513px and passes the layout gate, but
     the cells are ~44px wide — at the touch-target floor, in a 7×6 grid, each holding
     a dot row. Nothing measurable is wrong; it has never been touched by a thumb.

**Carried**

8. **Provider copies are shallow.** `{ ...version }` shares nested arrays with the
   store. Pinned by a test that says why.
9. **`npm test` renders nothing.** `check:interaction` covers Home; it is still not a
   general answer, and the calendar's browser-only behaviour is verified by hand.
10. **Home fits 1218px, not 1052px.** Accepted. Phone is 3281px. **The calendar's
    agenda is 13,764px on a phone**, which is a long list rather than a broken layout.
11. **Three dead providers:** `getSyllabi`, `getResources`, `getCurrentResume`.
12. **`requestTypeHelp` has no consumer** anywhere in the prototype.
13. **Two product decisions parked pending real screens:** the missing year in
    `formatShortDate`, and `countdownPhrase` counting to "13 months".
14. **`taskNotes` on `createOverrideStore`?** It duplicates the persistence logic. Two
    more phases have not needed the refactor, which is mild evidence against it.
15. **`format.ts` still emits `"Invalid Date"` from `formatShortDate`**, and a
    parseable-but-wrong date still gets through `describeDue`: V8 rolls `"2026-02-30"`
    into March.
16. **`matchesWide()` is still unported**, and 7b deliberately did not become its
    first consumer — see §7.
17. **`calendarSources.nowMinutes()` has no consumer** and may never get one. See §7.
18. **`CalendarView.detail` is declared and never written.** The one thing in the
    calendar that anticipates a later phase, kept because it is one of the three
    things that node owns and moving it in later would mean re-deciding where it
    lives.
19. **MIGRATION §9 defect 14 — `custom-custom-…` ids.** Cosmetic and internally
    consistent; `deleteCustomEvent` clears the matching key. Noted, unscheduled.
20. **A task moved beyond seven days leaves Home's list.** Correct, and announced
    rather than silent. `/assignments` is where it lives (owner: accepted).
21. **`prefs.view` can hold a stale `week` or `agenda`** from a hand-edited store.
    Harmless — nothing but `ViewSwitcher` writes it, and that now exists.

**Closed in 7a and 7b**

- **`buildScheduleData` is ported.** The gating piece since Phase 2.
- **The ignore key-space defect is fixed, both halves.** Its defect-record test is
  replaced by a real cross-surface one.
- **MIGRATION §9 defect 10 — `SquareGrid`'s white ring halo** — built correctly with
  an `outline` instead. Verified: 2px solid `rgb(76,91,212)`, no box-shadow.
- **The 40rem week fallback**, which never existed in the source, is built at 48rem.
- **A pre-existing timezone bug in `reveal.spec.ts`**, found by running the sweep.
- **`line-clamp-3` silently unclamped** beside `block`.
- **TESTING.md's coverage table** was three specs short and three counts stale. It
  sums to 507 across 23 rows now, checked programmatically.
- **The calendar's "next up" arrival** — settled as NOT an arrival. It is a static
  line in the source, so there is no caller, and inventing one would have forced a
  third `RevealKind`.
- **Agenda rows naming their own date** — kept on review (owner).
- **All nine of 7b's absence decisions** — approved (owner).

---

## 19. Timeline

Release 1 target was **end of August 2026**; a control group was planned for the
**last week of August**. Both dates come from the prototype's `REPORT.md` and
predate the decision to rebuild — **they need re-setting against the rebuild,
which is the largest open planning question.**

Note the interaction with loose end 1: a control group implies concurrent users,
and the process-global stores mean concurrent users see each other's data. Either
Django lands first or the control group is one person at a time.

**Two scoped features move Django from "later" to "on the critical path".** Ask
THRIVE's saved chat history cannot live in `localStorage`, and Group Projects is
shared between people by definition. Neither can be demoed on the mock layer at all,
which is a different situation from the appointment and request flows — those work
today and are merely process-global.

The prototype's Release 1 scope was: (a) the student dashboard, (b) appointment
scheduling with history/notes/summaries/topic tagging, (c) `/resources` as the
Resource Navigator surface, (d) per-task time estimates.

**(a) is complete.** Home is real and editable. **And the calendar — which was not
in that scope at all — is now two thirds built and is the second-largest surface in
the app**, which is worth noting when the dates are re-set: the rebuild's actual
shape has diverged from the prototype's plan. (b) and (d) were never begun, and (c)
may be absorbed into Ask THRIVE's second rail rather than built as `/resources`.
