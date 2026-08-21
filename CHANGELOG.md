# CHANGELOG

Dated session summaries, most recent first.

---

## 2026-08-21 — repo created, SvelteKit port through Phase 4

### What changed

- **`MIGRATION.md`** — inventoried the frozen Next prototype at `4e0a65b`. 1,449
  lines, nine sections: routes, all 25 providers, date handling, 75 components,
  the design system, 14 stores, all 83 tests, React-specific decisions, and ten
  known defects.
- **Repo created** — `rsm-msaad/thrive`, private. Monorepo layout: `frontend/`,
  `backend/` (empty), `scripts/`.
- **Phase 1** — SvelteKit scaffold (Svelte 5 runes, TS strict, `adapter-node`,
  Tailwind v4, Vitest) and the design system ported to `app.css`. Fonts
  self-hosted via `@fontsource`. `/swatch` built as a visual diff target.
- **Phase 2** — the pure logic and all 83 tests. `localDayKey` collapsed into
  `dayKeyOf(value: Date | string)`. `CONVENTIONS.md` written.
- **Phase 3a** — 73 tests for `format.ts`, which had none.
- **Phase 3a-fix** — input guards on `describeDue` and `formatClockTime`.
  `DueDescriptor` became a 4-state discriminated union.
- **Phase 3b** — the browser persistence layer ported to Svelte 5 runes. 102
  tests pinning four properties.
- **Phase 4** — app shell, navigation, root layout, 13 routes.
  `hydrateStores()` wired. Floating widgets gated behind `FEATURES`.

### Commits merged

13, all direct to `main`, no PRs (solo, no review gate yet):

```
93d921d chore: repo skeleton, the migration map, and the palette gate
dec84d4 feat: scaffold the SvelteKit frontend
1d7932b feat: port the design system from the Next app
8e5b395 feat: port the domain types and the pure calendar logic
336b555 test: port all 83 pure-logic tests
be4d545 docs: state the timestamp rule that the framework no longer enforces
4215885 test: cover format.ts, describeDue above all
adf11d0 fix: guard describeDue and formatClockTime against malformed input
4812f4b feat: port the browser persistence layer to Svelte 5 runes
89d4311 test: pin the four store properties, and record an ignore-store defect
83e18ce feat: nav config, feature flags, and the shell's supporting modules
33d7a72 feat: app shell, root layout, and the one store hydration point
b0f7c3b feat: a route for every nav destination
```

### Gates

| Gate | Result |
|---|---|
| `npm test` | **277 passed** (11 files) |
| `npm run check` | **302 files, 0 errors, 0 warnings** |
| `npm run build` | clean, `adapter-node` |
| `scripts/check-contrast.py` | **43/43** |
| Timezone sweep | 277 passed in 7 zones, UTC+14 → UTC−11 |

### Known issues

- **Ignore store key-space split.** Home and the calendar key it differently, so
  ignoring an event on one surface does not affect the other. Pre-existing in the
  prototype; found by a new cross-surface test. Recorded as a defect test, not
  fixed — the canonical key affects already-stored data.
- **An `urgency: "unknown"` row matches no group** in a list grouped by
  overdue/today/upcoming. Accepted: the discriminated union turns it into a
  compile error rather than a silent drop.
- **A parseable-but-wrong date still passes `describeDue`** — V8 rolls
  `"2026-02-30"` into March rather than rejecting it.
- **`formatShortDate` can still emit `"Invalid Date"`** — the last unguarded
  function in `format.ts`.
- **No year in `formatShortDate` / `fullLabel`**, and `countdownPhrase` counts to
  "13 months". Both parked as product decisions pending real screens.

### Next priorities

1. Phase 5 — the 25 data providers, against Django.
2. Shared primitives (`Button`, `Card`, `Tag`, …), built at the correct border
   weight rather than inheriting the prototype's 20 `border-2` call sites.
3. Decide the ignore store's canonical key, fix it, promote the defect tests.
4. Re-set Release 1 scope and dates against the rebuild.
