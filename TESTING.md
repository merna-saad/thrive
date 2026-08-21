# TESTING

**Last verified:** 2026-08-21 at `d3621b9`. **389 tests, 18 files, all passing.**
Verified green in all seven timezones of the sweep below.

```bash
cd frontend
npm test           # vitest run
npm run test:unit  # watch
npm run check      # svelte-check
```

Plus two gates that are tests in everything but name:

```bash
python3 scripts/check-contrast.py    # 58 assertions: 42 pairs, 6 ceilings, 10 structural
npm run check:layout                 # 12 routes x 3 viewports, in a real browser
npm run check:interaction            # 37 assertions on the stat pill popovers
```

`check-contrast.py` PARSES `app.css` rather than mirroring it, so a token edited
there is checked there. `check:layout` needs a browser and skips loudly (exit 0)
when it cannot find one — see the note below.

---

## Setup

**Vitest, Node environment, no jsdom.** Nothing renders. Configured as
`usages:unit` only, matching the prototype where all 83 tests were pure logic
and rendering was deliberately never tested.

The `@lib` alias comes from the `sveltekit()` plugin in `vite.config.ts`, which
the Vitest project extends. **Runes work in `.svelte.ts` under the Node env** —
smoke-tested before the store layer was written, since the whole phase depended
on it.

`src/lib/testing/fakeStorage.ts` is a `localStorage` stand-in. It exists because
the store layer decides "am I in a browser" by asking whether `localStorage`
*exists*, not via `$app/environment` — so a fake is all it takes to exercise the
entire persistence layer without jsdom. It covers the server case (uninstall
it), the quota case (`failWrites()`), assertions on what was persisted
(`dump()`), and storage that **throws on property access**.

Module singletons need `vi.resetModules()` + `await import()` per test. **Do not
mix that with static imports of the same module in one file** — the static import
is a different instance. That is why store tests live in their own spec files
rather than being appended to the pure-logic ones.

---

## Coverage

| Spec | Tests | Covers |
|---|---|---|
| `providers.spec.ts` | 47 | The four provider properties (Promise-returning, copies-not-references, deterministic generation, fixtures relative to now), the public surface of `$lib/data` including what must **not** leak, and every store behaviour: booking claims, double-book throws, cancel releases only its own slot, `submitRequest` idempotence, unknown ids returning null |
| `collapse.spec.ts` | 13 | The fit-on-one-screen rule at its boundaries: exactly-at-the-limit produces no control, one-over holds back one, a zero limit means show-none (the done group), a negative limit clamps rather than slicing from the end, and `visible` is never the caller's array |
| `homeGroups.spec.ts` | 12 | Home's grouping: the four groups in order with `unknown` first, "this week" held to a week, done pulled out, a student's override outranking the fixture BOTH ways, and an unparseable date landing in its own group rather than vanishing |
| `taskView.spec.ts` | 14 | `rowPriorityOf` (deadline outranks stated priority; done strips the tint), `taskLabels` (two-label cap, course code over source word, Done replaces rather than joins), and the tone maps — including that `standingTone` never lands on `primary` |
| `programStrip.spec.ts` | 5 | `abbreviateTerm` on all four seasons, an unexpected shape passed through unchanged, and every phase status having a spoken form |
| `designSystem.spec.ts` | 4 | The two rules nothing else enforces: no hardcoded colour in a component, no component naming a font, every `.thrive-*` class in the known vocabulary |
| `format.spec.ts` | 89 | `describeDue` across all four branches with every field asserted; the boundaries rather than the middles (day 0/−1, 1/2, 6/7, exact midnight, ±1s across a rollover); `calendarDaysBetween` and `countdownPhrase` through their public surfaces; both DST transitions; month, year and leap-day spans; both countdown thresholds from both directions; every other exported helper |
| `calendarStores.spec.ts` | 35 | Calendar prefs store, quick list, labels/urgent/custom events, ignored events, `tickItem` writing back through the attached row, and **the three key spaces staying separate** |
| `schedule.spec.ts` | 27 | Grid arithmetic, `isVisible`/`filterSchedule`, `nextUpItem`, `groupAgenda`, `groupDayItems`, `weekGrid`, and the collapsed `dayKeyOf` agreeing across both signatures |
| `userEdits.spec.ts` | 27 | Property 4 one setter at a time, `isTaskDone`, `applyTaskEdits`, added tasks, `removeAddedTask` cleanup, `reorderWithin`, the undo slot and its clock |
| `overrideStore.spec.ts` | 21 | All four store properties, including corrupt input in five shapes and a failing write |
| `ignoredEvents.spec.ts` | 21 | Id normalisation, eligibility across every legend category, the never-hide-an-obligation guard, month-dot and `+n` arithmetic, undo restoring position |
| `calendarSources.spec.ts` | 18 | `taskToItem`/`todoToItem`, and that every tickable row carries its source object |
| `taskNotes.spec.ts` | 13 | Hydration gate, corrupt input, forget-on-empty, merge-not-replace |
| `calendarPrefs.spec.ts` | 11 | Defaults and migration. Has caught four separate new-field omissions in its life |
| `calendarItems.spec.ts` | 9 | Custom-event mapping, rejecting malformed and non-existent dates, label/urgent filtering |
| `toast.spec.ts` | 6 | The single slot, its 3000ms clock, and that it persists nothing |
| `reveal.spec.ts` | 16 | `planReveal` at the boundaries (last row of the slice vs first row past it; not-found kept distinct from found-and-visible; a zero limit); the reveal path run against the list `TasksCard` really builds, so an undated row pushing the overdue task past the cap is asserted rather than imagined; that no overdue or due-today task can be filtered out of the card's list; and `expandedEventLimit`'s prefix argument, including that a quiet week never loses rows |

### The interaction gate

`npm run check:interaction` · `scripts/check-interaction.mjs` · 37 assertions.

**Why it exists.** The other five gates were ALL green on a version of the stat
pill popovers where pressing a pill did nothing at all. Hover had already opened
the panel, so the click found it open and closed it again. None of the other five
can press a button.

**What it covers.** Opening and closing; the pill's number matching the length of
the list it opens; focus moving into the list; Arrow, Home and End; Escape and
click-outside with focus returning to the pill; the reveal, including a card
expanding to show a hidden row; the arrival mark appearing, being unique, and
clearing itself; reduced motion; the inert zero-count pill; and the clamped panel
at 375px.

**And one absence.** `hovering a pill does NOT open its popover`. Hover was built,
rejected and removed, and reintroducing it is the only route back to the original
bug — so it is asserted rather than assumed. The check is non-vacuous: the gate
first asserts the driving browser reports `(hover: hover)`, or "hover did nothing"
would pass on a browser that cannot hover at all.

**It reads its inputs from the source of truth.** The arrival dwell comes from
`--thrive-arrival-duration` on the running page, not from a copy in the script, so
retuning the token cannot leave the gate passing against the old value. Same
principle as `check-contrast.py` parsing `app.css`.

**It knows no fixture ids.** The task ids it ticks to force a zero count are
discovered by choosing the popover's own items and reading where focus landed. A
gate that hardcodes `tsk-001` starts failing the day the fixture is edited, which
teaches everyone to ignore it.

**Verified to fail**, three ways, by breaking each thing on purpose:

| Break | Red |
|---|---|
| Hover reintroduced on the wrapper | 6, including "clicking a pill opens its popover" — the original bug, reproduced |
| The arrival mark never applied | 4 |
| The arrival mark never cleared | 2 |

**It reports SKIP, not PASS,** for the "a hidden row makes its card expand" check
when the fixture has no target past a collapsed slice. Degrading silently to a
weaker assertion is how a gate stops meaning anything. Today's fixture proves it
(8 → 25 rows), but a quieter one would not.

**It fails on console warnings, not only throws** — and the note at that assertion
says what it cannot see. `arriveAtRow` warns in development when the row it was
sent to is absent, and that warning is behind `import.meta.env.DEV` while this gate
drives the production build, so the branch is compiled out. Stated at the check
rather than left implied, because an assertion that looks like it covers something
it cannot is worse than no assertion. That branch was verified by hand against
`vite dev`: a normal arrival warns about nothing, a row with its id removed warns
exactly once and names the id.

**Skips loudly and exits 0** with no chromium, same as the layout gate.

### The layout gate

`npm run check:layout` drives the built page in a real browser and asserts, for
every route at three viewports, that the furthest the page can scroll is no
further than the lowest thing it paints.

**Why it is not a Vitest test.** It needs a real layout engine. Vitest runs in
Node with no jsdom here by standing decision, and jsdom would not help: it does
no layout and reports every height as zero. A gate built on a model inherits the
model's blind spots, which is precisely how this bug survived —
`documentElement.scrollHeight` reported 1275px while nothing rendered below
1238px, so any assertion built on it would have been green on a broken page.

**It does not use `scrollHeight`.** It scrolls the page and reads where it landed.

**It skips rather than fails when there is no browser.** `playwright-core` ships
none. A gate that fails for reasons unrelated to the code gets ignored, and an
ignored gate is worse than no gate because it looks like coverage. It also finds
a cached chromium from a different playwright version by hand.

**Verified to fail on the bug it was written for** before being trusted:
commenting out `contain: paint` gives `/ desktop  renders 1238  scrolls to 1275
FAIL  37px of empty scroll` and exit 1.

### What is still not tested

**Rendering.** No component is mounted anywhere in the suite. The design-system
guards and the layout gate scan source and drive a browser respectively; between
them there is a real gap — a component can render the wrong content with correct
types, correct classes, and no page-level overflow. Phase 6b's editing behaviour
is the first thing that will genuinely want a rendered assertion, and it is worth
deciding then whether jsdom or Playwright covers it.

### Testing the provider layer

**Properties, not fixture contents.** The fixtures are demo data and will be
deleted when Django lands, so asserting on them would be writing tests with a
known expiry date. `providers.spec.ts` asserts the four things that have to
survive the swap, and the store behaviours that have gone wrong before.

**Isolation comes from the test side.** The three stores are module-scope
objects, so under one registry a test that books an appointment changes what the
next test sees and the suite starts passing on file order. Each test calls
`vi.resetModules()` and re-imports. A `resetStores()` export would have been
more convenient and would have put a test-only function in the production
surface, where it would still be sitting long after Django made the stores
irrelevant.

**Freeze `Date` only.** `vi.useFakeTimers({ toFake: ["Date"] })` — because
`resolveAfterDelay` needs a real `setTimeout` to resolve. Faking all timers
deadlocks every provider call. Latency goes to 0 through `setMockLatencyMs`,
which is the whole reason that knob exists.

**One test asserts on source text.** The `Math.random()` scan reads the data
directory through `import.meta.glob(..., { query: "?raw" })` — not `node:fs`,
because this repo has no `@types/node` and `npm run check` is a gate. It strips
comments first: both hash functions carry a comment naming `Math.random()` as
the thing they avoid, and a guard that forced those comments out would be
deleting the explanation to satisfy the check. It also asserts the stripped
corpus still contains both hash functions, so it cannot pass vacuously.

### What the suite is actually good at

**The four store properties**, each pinned because breaking it fails *silently*:
an override that quietly comes back, or quietly does not. Property 1's test —
that an explicit `false` is a different thing from an absent key — is the one
that encodes why this is an override map and not a set of ids.

**Boundaries over middles.** `describeDue` is tested at day 6 vs day 7, exact
midnight, and one second either side of a rollover, not just "overdue" and
"upcoming".

**Calendar days vs elapsed hours.** A 23:00→01:00 pair is two hours apart and
**one calendar day**. An elapsed-time rewrite would floor it to zero and call a
tomorrow deadline "today". That single assertion is the most load-bearing in the
suite.

**Timezone independence, proven not assumed.** The whole suite passes in seven
zones from UTC+14 to UTC−11, including Australia/Lord_Howe's 30-minute DST
offset:

```bash
for tz in UTC America/Los_Angeles Asia/Tokyo Pacific/Kiritimati \
          Pacific/Midway Australia/Lord_Howe Asia/Kathmandu; do
  TZ=$tz npx vitest --run
done
```

Every fixture instant is built from **local parts** and only then serialised.
Run this sweep after touching anything date-shaped — it caught a
timezone-dependent assertion in a test written this session.

### Three tests are defect records, not assertions of intent

Named `DEFECT:` or `DOCUMENTS A GAP:`, each commented with why it was not fixed.
They pin current behaviour so the defect cannot be lost, and so the eventual fix
arrives as a **failing test**. See `BUGS.md`.

1. The ignore store's two surfaces not sharing a key space.
2. A rolled-over date (`"2026-02-30"`) passing `describeDue`.
3. `eventIdOf`'s asymmetry being self-consistent within one surface, which is
   why it went unnoticed.

---

## Gaps

Ordered by how much they would hurt.

### No component or route tests at all

Zero. No jsdom, no `@testing-library/svelte`, no Playwright. Nothing verifies
that a component renders, that navigation works, or that `aria-current` lands on
the right item. **Everything visual and interactive is currently verified by
hand.**

Phase 4 was checked by `curl`-ing the SSR output of the built adapter-node
server for titles, the skip link, `aria-current` counts, and `PagePlaceholder`'s
throw (500 + the exact message). That is real verification, but it is not a test
and it does not run again.

**This is the largest gap and it grows with every UI phase.** Two decisions
pending: whether to add `vitest-browser-svelte` / jsdom for component tests, and
whether Playwright becomes a dependency. The prototype deliberately kept
Playwright out and ran it from a scratch directory twice.

**2026-08-21: this gap produced a real shipping bug and caught it by luck.** The
first `StatPopover` held one boolean, and pressing the pill did nothing at all —
a mouse click is preceded by a pointer entering, so hover had already opened the
panel and the click closed it again. `npm test` (389), `npm run check` (0/0),
`npm run build`, `check-contrast.py` (58/58) and `check:layout` (36/36) were ALL
green on that version. **None of the five gates can press a button.**

It was found by driving the built page in the machine's Playwright chromium — 27
assertions over opening, keyboard navigation, all four dismissal paths, the
reveal, and the clamped panel at 375px. Those assertions were a **throwaway
probe**, run once, and they do not exist in the repo.

**It is now a gate.** `npm run check:interaction`, 37 assertions, decided and
built the same day. No new dependency, and see its own section below.

The gap it closes is narrow and worth stating precisely: **one widget on one
page.** Nothing else in the app is pressed by anything. The general question —
component tests via jsdom or `vitest-browser-svelte` — is still open, and 6b's
editing is the next thing that genuinely wants a rendered assertion.

### Nothing exercises hydration for real

`hydrateStores()` is called from the root layout's `$effect`. Tests cover the
store layer's hydration *contract* — empty before, populated after — but nothing
proves the layout actually calls it, or that the un-personalised first paint
looks acceptable. Needs a browser.

### No provider tests

Phase 5's territory. `stubProviders.ts` is untested; it is one hardcoded object.

### Not covered in `lib`

- `taskView.ts` — never ported (imports a component type).
- `taskBoard.ts` — never ported.
- `buildScheduleData()` — needs providers.
- `mergedSchedule()` — **ported but untested.** Its two mappers are well
  covered; the merge that composes them, applies edits in order, and annotates
  last is not. Worth a suite: the ordering it encodes is subtle.
- `nowMinutes()` — ported, no caller, no test.
- `escapeKey` action — no test (needs a DOM).
- `ics.ts`, `useIgnoreUndo.ts`, `floatingPanel`/`assistantPanel` geometry — not
  ported.

### `format.ts` leftovers

`formatShortDate` can still emit `"Invalid Date"` and is deliberately untested —
pinning that string would entrench it.

---

## Conventions

- **Probe before asserting.** Write a spec that only `console.log`s, run it with
  `--reporter=verbose --silent=false` (Vitest hides stdout on passing tests),
  read the real values, write the real spec, delete the probe. This caught V8's
  inconsistency on invalid ISO dates and would otherwise have produced a wrong
  test.
- **Always pass `now` explicitly.** Nothing reads the real clock. That parameter
  exists for this.
- **Build fixtures from local parts** — `new Date(y, m, d, h)` then
  `toISOString()`. Never `new Date("2026-08-17")`, which parses as UTC.
- **Run the existing suite before adding tests to a fix**, so "all N passed
  unmodified" is a claim about the fix rather than an artifact.
- **Never weaken a test to make it pass.** If it fails, that is a finding.
- **Do not pin garbage output.** Flag it and leave it uncovered instead.
- Comments explain *why* the assertion matters, matching the house style.
