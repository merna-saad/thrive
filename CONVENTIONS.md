# Conventions

Rules this codebase holds by agreement rather than by tooling. Each one exists
because breaking it produced a real bug that was hard to see.

---

## Components never see a raw timestamp

**Every date is classified and formatted on the server, then passed down as a
string. A component receives `"Overdue"`, `"in 3 days"`, `"2:30 PM"`,
`"2026-08-17"` — never an ISO instant it has to interpret.**

### Why

Two failures, both invisible in normal use:

1. **A browser in a different timezone from the server disagrees about what
   "today" is.** A task due at 11:00pm on the 17th is "today" to the server and
   "tomorrow" to a student one timezone east. In Next this surfaced as a
   hydration mismatch. In SvelteKit it surfaces as SSR HTML that silently
   changes after hydration — quieter, and worse.

2. **A client-computed date freezes.** `describeDue()` called during render
   answers once and keeps that answer until something else re-renders it. A tab
   left open overnight insists an overdue assignment is still due tomorrow.

### How it is done

- **Read the clock in a `load` function.** `+page.server.ts` / `+layout.server.ts`
  call `new Date()`, pass it into `describeDue(iso, now)`, and return the
  resulting `DueDescriptor` — not the ISO string.
- **Return view models, not raw rows.** The Next app built `SlotView`,
  `AppointmentView`, `RequestView`, `VersionView`, `CourseworkRow`,
  `TaskWithDue`, `DayOption` for exactly this. Each has its date fields already
  rendered to strings. Keep that shape.
- **`todayKey()` is called once, on the server**, and travels down as a string
  that is compared with `===`. Never recompute it in a component.
- **`dayKeyOf()` is the only place a local day key is built.** It takes a `Date`
  or an ISO string. Do not hand-roll `toISOString().slice(0, 10)` — that shifts
  an evening item onto the next day anywhere behind UTC.

### The narrowed exception: anything the student can edit

A student can move a due date, and that edit lives only in `localStorage`. So
something has to reclassify it without a round trip.

**The rule is narrowed, not broken: the server still decides what "now" is.**

- A `load` function computes `nowISO = new Date().toISOString()` and passes it
  as a prop.
- The client re-runs `describeDue(iso, now)` — which is **pure and takes `now`
  as a parameter** — against that same instant.
- **The client never calls `new Date()` to ask what day it is.** There is still
  exactly one answer to that question and it is still the server's. Only the
  recomputation moved.

This is why `describeDue`'s `now` parameter exists. It is not a convenience or
a testing seam. Removing the parameter and reading the clock inside would
collapse the exception into the bug it was designed around.

### The two sanctioned client clock reads

Exactly two, both deliberate, both documented at their definition:

1. **`nowMinutes()`** in `calendarSources.ts` — minutes past midnight, for the
   calendar's "next up" line. Called from a handler or a memo, never during a
   server render, and only when the selected day *is* today. On any other day
   the caller passes `0`, which yields the first timed item.
2. **`matchesWide()`** in the floating-panel geometry — a `matchMedia` read, not
   a clock, but the same hydration shape and gated the same way. (Not yet ported;
   the floating panels are a later phase.)

A third briefly existed and is gone: `hoverIntent` read `(hover: hover)` for the
stat pill popovers' hover opener. Hover was removed from that interaction on
2026-08-21 — three pills in one row meant a cursor crossing it opened and closed
panels nobody asked for — and the action went with it. **Hover-to-reveal in this
app is CSS**, Tailwind's `hover:` utilities, which compile to
`@media (hover: hover)` without any JavaScript needing an opinion. If a surface
ever genuinely needs the JS form, put the media query in one action rather than
in each component.

Anything else reading the clock on the client is a bug until argued otherwise
in review.

### Nothing enforces this

This is the part that changed in the port, and it is the reason this file
exists.

In Next, the `"use client"` / server-component boundary enforced the rule **at
compile time**. A server-only module could not be imported into a client
component; the build failed. The discipline was mechanical.

**SvelteKit has no such wall.** `+page.server.ts` and `+page.svelte` are
ordinary modules. A component can `import { describeDue }` and call it with no
`now` argument — the default parameter is `new Date()`, so it compiles, runs,
renders something plausible, and is wrong in a way no test and no type will
catch.

So from here the rule is **convention, and review is what enforces it**.

What to look for in a diff:

- `new Date()` anywhere under `src/routes/**/*.svelte` or in a component
- `describeDue(x)` called with one argument
- `.toLocaleDateString(`, `.toLocaleTimeString(`, `.getHours()`,
  `Date.parse(`, or `Date.now()` in a `.svelte` file
- a prop typed as `string` that holds an ISO instant and is formatted at the
  point of render
- a new `load` function that returns a raw provider row instead of a view model

Known accepted deviations, inherited and recorded in MIGRATION.md §3 so they do
not get relitigated as discoveries: the calendar's day heading and the agenda's
group headings call `toLocaleDateString` on an already-safe day key, and
`taskToItem` / `todoToItem` format a `timeLabel` on the client because their
source rows are `localStorage`-only. These produce locale-formatting
differences, not date drift.

---

## Never resolve a row by parsing its id

**Attach the resolved source object at merge time and dispatch on that.**

`calendarSources` puts the whole `Task` or `QuickItem` onto each calendar item;
`isTickable` and the tick writer read `item.task` / `item.quickItem`. No id
slicing, no array search.

The previous version sliced a prefix off `item.id` and searched the server's
task array. It missed every task the student added themselves (those live in a
different store) and every undated to-do in the agenda (whose synthetic id was
never prefixed). Both failed the same way and **silently**: the guard found
nothing and returned, the checkbox appeared to tick, and the next render put it
back. No error, no log.

Corollary: `eventIdOf()` is the single normaliser for the `evt-` prefix. The
Next tree had two other sites stripping it inline while the docs claimed one —
see MIGRATION.md §9 defect 12. Do not add a third.

---

## One filter, applied once

`filterSchedule()` runs on the whole `ScheduleData` before anything renders.
The month dots, the week columns, the agenda and the day lists all read the
already-filtered result.

This makes the old failure — a dot on a day with no row beneath it —
structurally impossible rather than something to remember. If a new consumer
needs filtered data, give it the filtered `ScheduleData`; do not filter again
downstream.

---

## Store shape: overrides, never whole truth

Persisted state records **only what the student personally changed**, keyed by
id, with `undefined` meaning "never touched, use the source value".

A bare set of "done task ids" cannot express *"I unticked a task that ships as
done"* — reload and it silently re-ticks itself. A write that matches the
source value **forgets** the override rather than storing it, so the store only
ever holds genuine divergence.

The store layer is not ported yet. When it is, this shape is the requirement,
and so is the "empty on the server, real after mount" ordering.
