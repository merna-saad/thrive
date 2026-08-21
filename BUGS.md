# BUGS

Defects found and fixed, and the patterns behind them. Newest first.

Note on links: this repo has no PRs — all 13 commits went direct to `main`
(solo, no review gate yet). Commit hashes stand in.

---

## 2026-08-21 — fixed

### `describeDue` rendered an invalid date as a real, invisible deadline

**FIXED** · `adf11d0` · was **HIGH**

An unparseable date produced:

```
{ urgency: "upcoming", label: "Invalid Date",
  countdown: "in NaN months", days: NaN, fullLabel: "Due Invalid Date" }
```

The strings were the visible half. The damage was `urgency: "upcoming"` — every
`NaN` comparison is false, so a broken date fell past `days < 0`, `days === 0`
and `days === 1` into the final branch. It would **never appear in the overdue
group**, so a student would never see that deadline at all. Invisible is worse
than wrong.

Every sibling mapper already guarded with `Number.isNaN(date.getTime())` —
`taskToItem`, `todoToItem`, `customEventToItem`. This one function was the
exception.

**Fix:** `DueDescriptor` became a discriminated union with a fourth state,
`urgency: "unknown"`, where `days` is `null` rather than `NaN`.

**Pattern to watch:** a sentinel that shares its type with the valid case is not
a guard. `NaN` is a `number` as far as TypeScript is concerned, so it flows
silently into `a.days - b.days` and `days <= WEEK`. `null` does not typecheck
there, which is the whole point.

**Pattern to watch:** when one function in a family lacks a guard its siblings
all have, that is not a style difference.

### `formatClockTime` emitted `"NaN:undefined PM"`

**FIXED** · `adf11d0` · was **LOW**, latent

`formatClockTime("abc")` returned `"NaN:undefined PM"`, every part of which
reached the DOM. `formatClockTime("9:5")` returned `"9:5 AM"` — the minute half
was never parsed, just interpolated. `formatMeetingPattern` composes this, so a
malformed `CourseMeeting.startTime` produced `"Mon NaN:undefined PM"`.

Latent rather than live: no caller passes anything but a well-formed value. It
was still reachable.

**Fix:** validate the `HH:mm` shape and the ranges, return `"--:--"`. Lenient on
a one-digit hour (`"9:30"` already worked); strict on the minute, because
`"9:5"` is not a time.

---

## 2026-08-21 — found, recorded, NOT fixed

Each of these is pinned by a test named as a defect record, with a comment
saying it captures current behaviour rather than desired behaviour. The fix
arrives as a failing test, which is the right signal.

### The ignore store's two surfaces do not share a key space — **HIGH**

`calendarStores.spec.ts` → `"DEFECT: the two surfaces do NOT share a key space"`

`eventIdOf` strips exactly one leading `evt-`. But the raw `Event.id` in the
fixtures is **itself** `evt-3-1`, and the calendar prefixes it again to
`evt-evt-3-1`. So the function cannot tell them apart:

| Surface | Id it holds | After `eventIdOf` | Key space |
|---|---|---|---|
| Calendar | `evt-evt-3-1` | `evt-3-1` | **`evt-3-1`** |
| Home | `evt-3-1` | `3-1` | **`3-1`** |

Each surface is self-consistent. Cross-surface, **neither sees the other** —
ignoring an event on Home leaves it showing on the calendar and vice versa. That
is the exact opposite of the module's own headline ("ONE store, read by both
surfaces") and of MIGRATION.md §6.

Pre-existing in the prototype. **No existing test caught it** because each
exercises one side, and the two prototype cases encode *contradictory*
conventions — one asserts the map is keyed `"3-1"`, the other feeds
`filterSchedule` ids keyed `"evt-3-1"`. Both pass. Together they cannot both be
right.

**Why not fixed:** picking the canonical key changes which already-stored data
stays valid. My read is that the raw `Event.id` should win, making Home the
broken side — but the honest fix is probably to stop *deriving* the key from a
prefix at all, since `evt-`-prefixed raw ids make the normaliser ambiguous by
construction.

**Pattern to watch:** a normaliser that cannot distinguish its input cases. Also:
three copies of one id rule (MIGRATION §9 defect 12 flagged the copies without
characterising the consequence).

### A parseable-but-wrong date still gets through `describeDue` — **LOW**

`format.spec.ts` → `"DOCUMENTS A GAP: a rolled-over date is parseable"`

V8 is inconsistent about invalid ISO dates. `"2026-13-01"` (bad month) is
`Invalid Date` and the new guard catches it. `"2026-02-30"` (bad day) **rolls
forward into March** and parses fine, so it arrives as a real date the student
never chose.

**Why not fixed:** catching it needs a round-trip check — reformat the parsed
date and compare it to the input, which is what `customEventToItem` already does
for day keys — and that is input validation rather than a parse guard. Out of
scope for the guard phase.

### `formatShortDate` can still emit `"Invalid Date"` — **LOW**

Untested deliberately: writing `expect(...).toBe("Invalid Date")` would entrench
it. The last unguarded function in `format.ts`. Currently unreachable with
garbage via `describeDue` (the date has already parsed by then) but directly
callable.

---

## 2026-08-21 — inherited, on the do-not-reproduce list

From MIGRATION.md §9. Built correctly rather than ported.

### Page titles at weight 400 — **built correctly**

Twelve of thirteen `h1`s in the prototype render at 400, because weight came out
of the type scale on 08-15 and the headings were never updated. Every `h1` in
this port sets `font-bold` at the call site. `PagePlaceholder` alone accounted
for seven of the twelve.

### Leftover 2px strokes — **built correctly in the shell**

The rail, header and bottom bar all draw `border-*-2` in the prototype, with
comments calling it "the standard 2px edge" — both leftovers from the bordered
direction of 08-12 that the 08-15 restyle reversed without sweeping call sites.
Ported at **1px**, which is what a decorative hairline is under the current
direction.

**Not yet addressed:** the ~20 `border-2` call sites in `Button.tsx`, `TaskRow`,
`MiniCalendar`, `DueDateEditor`, `AddTaskForm`, `SectionCard`, `AssistantPanel`
and `QuickListWidget`. None of those is ported yet. `Button.tsx:20` puts
`border-2` on every variant, so building `Button` correctly fixes most of them
at once.

### Still open, inherited, not yet relevant

Recorded so they are not rediscovered. None is reachable in the port yet.

- **Home Tasks card collapses at 375px** — HIGH. Isolated to `TaskRow`,
  pre-existing rather than restyle damage (verified by stashing and re-measuring).
- **Avatar overlaps the nav** — MEDIUM. Not reproduced so far: the shell uses one
  `nav` landmark in the a11y tree at a time and the header is a separate
  stacking context. **Needs a browser check at both widths.**
- **Floating launchers cover page content at 375px** — MEDIUM. Both widgets are
  gated off behind `FEATURES`, so not currently reachable.
- **Empty states read as large grey slabs** — LOW, cosmetic.
- **`cancelAppointment` releases a slot by matching start time** — LOW. Wrong if
  an advisor ever publishes two simultaneous slots. Arrives with Phase 5.
- **Stale `DegreeProgress.expectedCompletion`** — LOW. Hardcoded `"Spring 2027"`
  while the timeline derives Fall 2027. Rendered nowhere. **Do not carry the
  field**; prefer the timeline's `expectedFinishTerm`.
- **`SquareGrid` ring offset assumes a white background** — LOW, visual.
- **Provider boundary violation** — `degree/requests/page.tsx` imports from
  `lib/data/mock/requests`. Becomes a build break when the mocks are deleted.
  `data/index.ts` in this repo documents where those label maps belong.
- **No auth on any server action** — HIGH. Not yet applicable: there are no form
  actions in the port. SvelteKit form actions have exactly the same property.
- **Module-level stores shared by every visitor** — was BLOCKING in the
  prototype. Resolved by construction here: there is no server-side store, and
  the Django backend is the real fix.
