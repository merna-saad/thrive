# HANDOFF

Session log, newest first. What happened, what was decided, what is still open.

---

## 2026-08-21 — copy-to-list follows its surface

**HEAD:** `5e6b3d1` · 1 commit, pushed · 451 tests green · all six gates green.

Third in the same family as the two below: an action whose result the student
cannot see reads as broken. The quick list lives in the floating To-do panel
behind `FEATURES.floatingTodo`, so with the flag off the copy succeeded, persisted
to `thrive:quicklist`, and showed nothing. Now gated on that flag. Visibility
only — store, logic, tests and toast all stay, and flipping the flag restores a
byte-identical row (verified by flipping it and re-measuring).

### The strip is right-anchored now, and it fixed a pre-existing shift

The brief asked that removing a control not move the others. Above `sm` that
already held — the `flex-1` content column pushes the strip right, and Edit sits
at x=761 with two controls or three.

Below `sm` it did not. The strip wraps to its own line, where it was LEFT-aligned,
so removing the leading Copy control slid Edit and Add-a-note 49px left (x=86 →
37). **Expanding a card did the same thing in reverse**, since that inserts two
reorder controls ahead of them — so this was a shift that already existed and
gating one control merely exposed.

`ms-auto` at every width. Measured after: Edit at x=244, last control's right edge
at x=340 on a phone, identical with the flag on and off.

### What I could not make identical, and why

Row heights are identical on a phone and the page is 3281px either way. **On
desktop one of four rows is 20px shorter** with the control hidden: the content
column gains 46px and that row's chip line stops wrapping to a second line. It is
a horizontal reflow, not the strip's geometry, and the only way to prevent it
would be to reserve 46px of dead space on every row forever — which would keep
that row needlessly wrapped. Card bodies stay 300px and the page 1218px, so the
grid is immovable.

### What broke — my own gate assertion, and it is the useful part

The first version of `copy-to-list appears exactly when the quick list does`
inferred the flag from the page: it looked for a To-do launcher and treated its
presence as "flag on". The selector `/to-?do list$/i` **matched the copy button's
own accessible name**, "Copy X to your to-do list" — so the check read the thing
it was gating as proof the gate was open. It passed with the guard AND with the
guard removed.

Caught only by running the verified-to-fail step. The flag is parsed from
`features.ts` now, the way `check-contrast.py` parses `app.css`, and it fails
correctly in both directions.

**New standing decision:** an assertion's expected value must never be derived
from the thing under test.

### Decisions made

- **`FEATURES.floatingTodo` gates the control, not a new flag** (brief). One word
  brings back the panel and the button together.
- **The strip is right-anchored at every width** (mine). Needed to honour the
  no-shift constraint below `sm`, and it removes an existing shift on expand. It
  does move the phone strip from left- to right-aligned, which is a visible change
  to the current state — flagged here rather than buried.
- **The toast stays mounted** even with no caller. It returns with the button on
  the same flag; removing and re-adding it would be churn.

### Loose ends carried forward

- **`Toast` has no caller while `floatingTodo` is false**, so it is unexercised
  outside its six tests. Not dead code — same flag restores both — but worth
  knowing that nothing on screen can currently raise one.
- Everything from the entry below is unchanged.

---

## 2026-08-21 — two follow-ons after 6b

**HEAD:** `df72ad1` · 2 commits, both pushed · 451 tests green · all six gates green.

Both were loose ends 6b's own handoff had just written down, closed the same day.

### 1. Each show-more control governs its own region

Loose end 6 from the entry below. Both disclosures on the Tasks card named
`tasks-card-list` — the whole list, including the done group neither expands.

Fixed by giving each region an id: `#tasks-open-list` renders only when there are
open rows (so it is never an empty box taking a `space-y-3` gap — safe, because
the footer control exists only when there are rows to hide) and
`#tasks-done-list` renders always, empty while collapsed, so the id its control
names is never absent.

The gate's selectors are `button[aria-controls="tasks-open-list"]` now, which
deleted the `.at(-1)` document-order hack that had cost two debugging rounds. Two
assertions hold the property.

### 2. A card links out only when its destination is built

`isBuiltRoute(href)` asks `primaryNav`; `SectionCard` renders its "View all" only
when the answer is yes. Decided in the one component that renders the affordance,
so all four cards got it at once and a fifth gets it free.

**Tasks, My Classes and Upcoming Events lost their link.** Today's classes keeps
`/calendar`.

`isKnownRoute` is the companion: a parked route and a typo both fail
`isBuiltRoute` for different reasons, and hiding a link over a typo is the silent
no-op this repo hates, so `SectionCard` warns in dev on an href in neither list.

**The layout claim, stated precisely rather than as "no shift".** A `min-h-11`
floor on the header row guarantees the band cannot shrink below the link's 44px
touch target. Desktop is pixel-identical — four bands at 67/103px, page 1218px.
**On a phone the Tasks band is 22px shorter**, because its description regains the
width the link occupied and sets on one line instead of two. That is a horizontal
reflow, not the button's height, and no floor can prevent it. Reported rather than
smoothed over.

### Decisions made

- **`primaryNav` membership IS the definition of "built"** (owner). Derived, so
  unparking a route restores its links with no edit.
- **`/classes` is unlikely ever to be built** (owner). Route and card stay; only
  the link goes.
- **`COLLAPSED_TASK_ROWS` stays at 4** (owner): a 124px inner scroll is barely
  noticeable, losing a quarter of the visible tasks is, and the grid not moving is
  what mattered.
- **Touch drag stays unaddressed** (owner), to be flagged again on a real phone.
- **A task past seven days leaving Home's list is fine** (owner); `/assignments`
  comes later.
- **A dev warning, not a throw, for an unknown href.** `PagePlaceholder` can throw
  because it IS the page; taking Home down over a "View all" would be worse than
  the broken link.

### What broke

Nothing in the product. Two authoring faults of mine, both fixed before commit: a
python re-indent that left the new wrapper's contents one tab short, and a first
attempt at the gate helper that factored the selector into a shared function —
which `page.evaluate` cannot see, since it serialises only the one function it is
given (`ReferenceError: tasksCardControl is not defined`).

### Loose ends carried forward

- **`/calendar` keeps its card link while its own body is still a note.** It is
  primary and the rail already links there, so the card is no worse. Revisit only
  if "in the navigation" and "has real content" stay apart.
- **Nothing gates the drag on touch** — unchanged, and deferred to a real phone by
  decision.
- **CONTEXT was PATCHED for these two changes, not regenerated.** §11, §13, §14 and
  §17, plus the counts in §5. The sanctioned same-session exception, flagged at the
  top of the file.

### Still open from earlier phases

Unchanged: §9 defect 1 (process-global mock stores, **BLOCKING** a multi-person
demo), shallow provider copies, `buildScheduleData()` unported, three dead
providers, `requestTypeHelp` with no consumer, the calendar half of the ignore
key-space defect, Home fitting 1218px rather than 1052px.

---

## 2026-08-21 — Phase 6b: task editing

**HEAD:** `5cdad70` · 4 commits, all pushed · 439 tests green · all six gates green.

Everything deferred from 6a. The persistence layer was already there from 3b, so
the work was wiring and the interesting parts were the three things the brief
asked to be handled deliberately.

### 1. The undo arrival: one tick IS enough, and here is why

Measured in a real browser, not reasoned about, and measured **both ways**.

`undoTick` unticks, then READS the derived list — Svelte's deriveds are pull-based,
so the post-undo list is available immediately with no flush — then asks
`planReveal` whether the restored row is past the collapsed slice, expands the card
if so, and only then calls `arriveAtRow`. Every write precedes the single `tick()`.

**The counterfactual is the part worth keeping.** With the expansion moved out of
that handler and into an effect, the hard case — a restored row hidden behind "show
more" — lands nowhere, focuses nothing, marks nothing, and logs **zero console
warnings**, because the gate drives the production build where the dev warn is
compiled out. Indistinguishable from a successful arrival at a row that was already
on screen. Exactly the silent no-op that was most feared.

So the reframe: **the flush count was the wrong question.** The rule is "write
everything before you arrive", and it is now in CONVENTIONS in those terms. The
loud failure is the gate assertion `a hidden row still gets its arrival mark`.

### 2. The tick resolution bug: not reintroduced

Home's rows carry a real `Task` object end to end. `taskToggle.toggle(task)` takes
the object; nothing in this path parses an id. `isTickable` does not arise here
because every row has a writable source by construction — the calendar's
`tickItem` dispatch is untouched.

### 3. The stat pills are still honest — and would not have been

This needed a change 6a did not anticipate. `TaskStatPills` counts
`item.due.urgency` off the **server's** descriptor. The moment a due date became
editable, "1 overdue" would have survived moving that task to next week: the
dashboard contradicting the list beneath it, which is the exact bug that moved the
counting to the client in the first place.

Fixed by resolving ONCE in `+page.svelte` and handing the same array to both. The
gate's `ticking every counted task takes its pill to zero` is still green, now via
real ticking rather than a seeded `localStorage`.

### Decisions made

- **Controls wrap to their own line below `sm`** (owner). Five 44px buttons is
  220px against a 343px card. Shrinking them would trade a layout bug for a WCAG
  2.5.8 failure.
- **No `justChanged` ring** (owner). The Next row marked a ticked task for the
  whole 6s undo window; this app has ONE arrival treatment and the ring is spent on
  the undo, which is the move that needs finding again.
- **"Needs a date" accepts no drops** (owner). Nothing to write —
  `Task.dueDate` is required. Enforced as a TYPE (`DatedGroupKey`), not remembered.
- **`TaskNotes`' `matchMedia('(hover: hover)')` is the THIRD sanctioned client
  read** (owner), and recorded in CONVENTIONS. It is not the deleted `hoverIntent`:
  that gated hover-to-reveal, which is CSS; this decides whether to move FOCUS, and
  no media query can do that.
- **Reordering only when the card is expanded** (mine, forced by 6a's flat-when-
  collapsed decision). Collapsed rows are a flat slice spanning groups, and sort
  keys are read per group, so a move across a boundary would persist a key and
  change nothing on screen — a control that appears to work and does not.
- **Commit-on-blur for the title**, which the Next source did not do (it committed
  only on Enter and Save). Requested for the gate. It forced the Cancel guard.
- **`AddTaskForm` keeps the source's native `<select>`** for priority; the
  three-radio rule was about `PriorityPicker`. Different question: three values
  being changed in a strip, versus one of four fields being filled in sequence.
- **`Toast` built and mounted.** Not scope creep: without it, copy-to-list is a
  silent no-op, because the floating quick list is feature-flagged off so the copy
  has no visible destination either.
- **`COLLAPSED_TASK_ROWS` stays at 4** — see the loose end below.

### What broke

Two real defects, both mine to find and both fixed:

- **Every date converter threw a `RangeError` on a "Needs a date" row.** Latent in
  the Next source; 6a made it reachable by surfacing those rows. Reproduced against
  the Next source before fixing rather than assumed.
- **`dragend` on a dropped row read a destroyed `{#each}` block's derived** —
  `derived_inert`, live in the production build with all six gates green. Found by
  dragging by hand.

And **defect 3 nearly returned twice.** The controls were one cause; the other was
inherited from 6a — title and chips on one wrapping line with the title
`flex-1 min-w-0` means the TITLE gives way, not the chips. Measured mid-build at
375px: a 90px title box, three lines, six characters a line. Fixed by giving the
title its own line; 303px and one line after.

Three authoring faults in my own probes and gate code: a synthetic `input` event
that left a submit button disabled (so "add a task" looked broken when it was not),
taking the FIRST `aria-controls="tasks-card-list"` control (which expands Done, not
the list), and a blind toggle that collapsed an already-open card and made the drag
check report SKIP for its own bug.

### Loose ends carried forward

- **The collapsed Tasks card scrolls ~124px inside its fixed body.** 6a measured
  299px of content against the 300px cap — it fit exactly. A desktop row is now
  61–81px rather than 54px and the collapsed body holds 424px. This is arithmetic,
  not styling: five 44px controls plus the 44px add button cannot fit 300px in any
  arrangement. **The grid still cannot move** (fixed height, asserted by two gates).
  `COLLAPSED_TASK_ROWS = 3` would fit and is a visible change to Home's densest
  card, so it is the owner's call, not this constant's. Recorded at the definition.
- **`TaskRow` now requires a `role="list"` container.** It renders
  `role="listitem"`. `/assignments` is the next caller and owes it that.
- **The two show-more controls on the Tasks card share `aria-controls`.** The done
  group's and the open list's both name `tasks-card-list`. It tripped the gate twice
  during authoring. Harmless to a reader, but two controls claiming the same region
  is not right and it is a trap for the next script.
- **Nothing gates the drag on touch.** HTML5 drag does not fire there at all, which
  is why the keyboard buttons exist; but no gate asserts the buttons are the only
  route on a phone.
- **`check:interaction`'s "nothing threw or warned" is per-gesture, not per-page.**
  Stated at the assertion now. When a feature adds a gesture, the gate must make it.

### Still open from earlier phases

Unchanged: §9 defect 1 (process-global mock stores, **BLOCKING** a multi-person
demo), shallow provider copies, `buildScheduleData()` unported, three dead
providers, `requestTypeHelp` with no consumer, the calendar half of the ignore
key-space defect, Home fitting 1218px rather than 1052px.

---

## 2026-08-21 — click only, an arrival cue, and a gate that can press a button

**HEAD:** `aadfca9` · 6 commits, all pushed · 389 tests green · all six gates green.

Five pieces, all follow-ons from the popovers landing earlier the same day.

### 1. Hover removed. Click only.

Tried in use and rejected by the owner: three pills sit in one row, so a cursor
crossing that row opened and closed panels nobody asked for.

`openedBy: 'pointer' | 'command' | null` went with it. Every job that state did
was about reconciling hover with click — which one opened it, whether a pointer
leaving should close it, whether tabbing in should pin it — so with one way in
there was nothing left to distinguish. It collapsed back to `open`, and three
branches that could only take one value went rather than sitting there as
decoration. Focus now moves into the list unconditionally on open, for the same
reason: it was conditional because hover must never move the caret.

**`hoverIntent.ts` deleted, not parked.** One caller, and nothing queued — the
calendar, appointments, Ask THRIVE — needs a JS hover gate that Tailwind's
`hover:` utilities do not already cover. Kept-in-case is how a lib grows things
nobody can delete later. `clickOutside` and `escapeKey` both still have callers
and stay. No user-facing string mentioned hovering.

### 2. The jump is visible now

The reveal moved focus and scrolled, which was correct and invisible: everything
on Home is on one page, so a student choosing an item saw nothing change and
assumed the click had failed. `focusRevealedRow` became `arriveAtRow`.

**Indigo inset ring, solid for most of 1200ms then faded.** Indigo because it is
the reserved "this is where you are now" colour and an arrival cue is that
sentence. An outline because it cannot move the layout, does not contest the
background wash or left border a task row already uses for priority, and follows
each row's own radius — so one rule covers both row shapes.

**The ring is a normal declaration and the animation only removes it.** That is
backwards until you notice the global reduced-motion reset forces
`animation-duration: 0.01ms !important`: a mark painted by a keyframe would be
invisible under reduced motion. Declared plus `animation: none` there leaves the
ring on, still cleared on the beat by the timer.

Only one row is ever marked. A second jump to the same row forces a reflow between
the class removal and the re-add, or the animation does not restart. The duration
is a token read by both the component and the gate, so there is one copy of it.

### 3. `check:interaction` is a gate

37 assertions. The case for it was already written: the other five gates were all
green on the version where pressing a pill did nothing.

**Verified to fail, three ways**, by breaking each thing on purpose — hover
reintroduced (6 red, including the original bug reproduced exactly), the arrival
mark not applied (4 red), the mark never cleared (2 red). That is the third
property every gate here is supposed to have and it is now demonstrated rather
than claimed.

It reads `--thrive-arrival-duration` from the running page rather than repeating
it, and it knows no fixture ids — the task ids it ticks to force a zero count come
from choosing the popover's own items and reading where focus landed. One check
reports SKIP rather than passing when the fixture cannot produce a reveal target
past a collapsed slice.

### 4. `arriveAtRow` is the standard, not the popovers' helper

Promoted and moved to `$lib/arrive`. Three things want it and only one exists
yet: the popover jumping to a task, 6b's undo returning to a task just ticked,
and the calendar's "next up" pointing at the item it names. Each could hand-roll
a `scrollIntoView` and each would arrive differently, and two arrival treatments
on one page is worse than either — a student learns the cue once.

The move also splits two halves that were only sharing a file: **`$lib/arrive`**
is "I know which row", **`$lib/reveal.svelte`** is "something else has to find
it". Reach for the channel only when the asker cannot know which card owns the
row. And the new file declares no runes, which is what a plain `.ts` should mean
here.

CONVENTIONS carries the rule plus the part that is easy to get wrong: **not every
focus move is an arrival.** Navigation inside a widget is not one, and neither is
focus recovery onto a container after the row it was on stopped existing —
marking that would tell the student they had been taken somewhere when they had
just lost their place. Both cases are live in the tree.

No behaviour change; same 37 assertions.

### 5. `arriveAtRow` says so when the row is not there

Asked and answered mid-session: it returned without doing anything, which is the
failure the arrival cue exists to prevent, sitting inside the cue. Now a
`console.warn` naming the missing id, behind `import.meta.env.DEV` — a warning not
a throw, because a student must never see an exception over a wayfinding cue.

`check:interaction` now fails on console warnings too, and **cannot see this one**
because it drives the production build. That limitation is written at the
assertion, and the branch was verified by hand against `vite dev` instead. See
FINDINGS: a check that appears to cover something it cannot is worse than no
check, because it converts an unknown into a false known.

### Decisions made

- **Hover is gone for good**, and its absence is asserted rather than assumed,
  because reintroducing it is the only route back to the swallowed-click bug.
- **Delete an abstraction that loses its last caller** unless a specific named
  surface wants it. `escapeKey` was rightly kept with no caller in Phase 4 — but
  against two named surfaces, not against the general chance.
- **A correct implementation of a bad interaction is still bad.** The `openedBy`
  work was real engineering spent making hover behave; the answer was that hover
  should not have been there.
- **Durations are motion or dwell**, and they do not share tokens.
- **`designSystem.spec.ts` now scans `.ts` too.** `.thrive-arrived` is the first
  class applied from JavaScript, and a typo there is the exact silent nothing that
  check exists to catch.
- **The aria-controls deviation is accepted** (owner): the panel names an id that
  is absent while closed. The alternative is a permanently mounted panel and two
  permanently mounted document listeners per pill.
- **No extra wording on the events card** (owner): the show-more label carries it.
- **Keep the honest 21-item popover** (owner); revisit a cap only if it gets very
  long.
- **`arriveAtRow` is the standard way anything on Home reaches a row** (owner).
  One treatment, one function, never a hand-rolled `scrollIntoView`.
- **`/swatch` stays as it is** (owner): the popover and the arrival ring are
  missing from it, and it is slated for deletion, so not worth the time.
- **`check:interaction` stays scoped to the widget that broke** (owner). Extend it
  when something else proves it needs one, not on principle.
- **1200ms stands** until a real student says otherwise (owner).
- **The CONTEXT patch is accepted** (owner). Full regeneration is for accumulated
  drift across a session, not a four-spot delta inside one. The rule stands for
  the normal case.
- **The calendar's "next up" uses `arriveAtRow` directly** (owner), unless it has
  to reach a row inside a collapsed day group — settle that when the calendar
  lands, not now.
- **`arriveAtRow`'s single `tick()` gets checked explicitly in 6b** (owner), and
  if one tick is not enough it must **fail loudly rather than quietly**. A silent
  no-op is the failure mode the owner most wants caught.
- **`arriveAtRow` warns in dev on a missing row** (owner, asked and answered). Not
  a throw: a student must never see an exception over a wayfinding cue. The branch
  is behind `import.meta.env.DEV`, so **no gate covers it** — `check:interaction`
  drives the production build. Verified by hand against `vite dev` instead, both
  directions. The gate now fails on console warnings anyway, with a note at the
  assertion saying exactly what it cannot see.

### What broke

Nothing in the product. Three probe/gate authoring faults, all mine: a stray
object-literal `=` for a `:`, one check name long enough to run into its own
detail column, and — earlier the same day — the `aria-expanded` selector that
matched `ShowMore`.

### Loose ends carried forward

- **`CONTEXT.md` was PATCHED for item 4, not regenerated.** Four spots: the file
  counts, the arrival paragraph in §13, one standing decision, and the
  CONVENTIONS rule count in CODEMAP. Grep-verified that no stale claim survives.
  Flagged because the standing rule is full regeneration and this is a deliberate
  deviation on a file that was thirty minutes old — say the word and it gets a
  clean regeneration.
- **`check:interaction` covers one widget on one page.** Scoped there by decision.
  The general component-test question is still open, and 6b's editing is the next
  thing that wants a rendered assertion.
- **The done-group branch in `TasksCard`'s reveal effect is still unreachable**
  from Home — no pill counts a done task. 6b's undo wants it.
- **`arriveAtRow` awaits ONE `tick()`.** Enough for every caller today (expanding
  a card is one state write). 6b's undo is the first case that might need two. It
  is named at the definition, in CONVENTIONS as a sharp edge, and in CONTEXT §17,
  and it now warns in dev — so 6b will hear it rather than having to know.
- **`CONTEXT.md` regenerated in full** at `d3621b9`. No longer a loose end.

### Still open from earlier phases

Unchanged: §9 defect 1 (process-global mock stores, **BLOCKING** a multi-person
demo), shallow provider copies, `buildScheduleData()` unported, three dead
providers, `requestTypeHelp` with no consumer, the calendar half of the ignore
key-space defect, Home fitting 1238px rather than 1052px.

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
