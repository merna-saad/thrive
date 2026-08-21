# TESTING

**Last verified:** 2026-08-21 at `b0f7c3b`. **277 tests, 11 files, all passing.**

```bash
cd frontend
npm test           # vitest run
npm run test:unit  # watch
npm run check      # svelte-check
```

Plus the palette gate, which is a test in everything but name:

```bash
python3 scripts/check-contrast.py    # 43 assertions, 3 of them ceilings
```

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
