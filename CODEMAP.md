<!-- built-at: 0dcca16 -->
<!-- updated: 2026-08-22 -->

# CODEMAP

Navigation map for the THRIVE rebuild. Read this before opening files.

**Built:** 2026-08-22, refreshed after Phase 5 (the data layer).
**Size:** 77 files under `frontend/src` — ~11,611 lines, 7,551 source / 4,060 test.

> The `built-at` comment above is machine-read by the codemap staleness hook.
> Keep it as the first line, in that exact `<!-- built-at: <hash> -->` form.

---

## Read these first

| File | Why |
|---|---|
| `CONTEXT.md` | The snapshot. What this is, where the port has got to, every standing decision. |
| `MIGRATION.md` | The spec. The frozen Next prototype, inventoried in nine sections. |
| `CONVENTIONS.md` | Four rules the tooling does not enforce. Review is the enforcement. |
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

No framework surface. All of it ported in Phase 2 and under test.

| File | Role |
|---|---|
| `data/` | **The provider boundary.** Its own section below. Import from `$lib/data`, never deeper. |
| `format.ts` | Server-side formatting. `describeDue()` is the important one — returns a 4-state discriminated union. |
| `schedule.ts` | **The calendar's vocabulary.** Category maps, the three category sets and their guards, grid arithmetic, `filterSchedule`/`isVisible` (the one filter), grouping, `nextUpItem`. Read this first for anything calendar-shaped. |
| `buildSchedule.ts` | `todayKey()` only. `buildScheduleData()` is still unported — it needs five providers, which now exist. |
| `calendarSources.ts` | `taskToItem`, `todoToItem`, `mergedSchedule()`, `nowMinutes()`. |
| `calendarItems.ts` | Custom events, labels, urgent. Keyed by **calendar item id**. |
| `calendarPrefs.ts` | `normalisePrefs` + the persisted store. |
| `ignoredEvents.ts` | `eventIdOf()`, `canIgnore()`, and the store. Keyed on **raw `Event.id`**. |
| `tickItem.ts` | `tickItem()` and `isTickable()`. Dispatches on the **attached source row**, never by parsing an id. |
| `quickList.ts` | The scratch list: `QuickItem` plus its store and panel store. |
| `nav.ts` | **One list drives the rail, the bottom bar, and every stub page.** |
| `features.ts` | `FEATURES` — both floating widgets off. |
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
| `actions/escapeKey.ts` | Svelte action. Escape-to-dismiss, scoped to the element's lifetime. |

---

## Routes — `frontend/src/routes/`

13 routes. Two render a heading, ten are `PagePlaceholder`, one is the swatch.

| Route | State |
|---|---|
| `/` | Heading + note. Deliberately **not** `PagePlaceholder`. |
| `/calendar` | Real header, ported verbatim. Body is a note. |
| `/classes` `/syllabi` `/events` `/resources` `/settings` `/assignments` `/appointments` | `PagePlaceholder` |
| `/degree` `/career` | Placeholder body. Both are *partial* in the prototype and need providers. |
| `/swatch` | **Throwaway.** Every token, type step, border weight, both faces. Delete before Release 1. |

---

## Tests — 277, 11 files

`npm test`. Vitest, **Node environment, no jsdom**, so nothing renders.

| Spec | Holds down |
|---|---|
| `format.spec.ts` (89) | `describeDue` across every branch, field and boundary; both private helpers via their public surfaces; both DST transitions |
| `calendarStores.spec.ts` (35) | Prefs, quick list, annotations, ignored events, `tickItem`, and the three key spaces |
| `schedule.spec.ts` (27) | Grid arithmetic, filtering, grouping, the collapsed `dayKeyOf` |
| `userEdits.spec.ts` (27) | Property 4 one setter at a time, added tasks, the undo slot |
| `overrideStore.spec.ts` (21) | All four store properties |
| `ignoredEvents.spec.ts` (21) | Id normalisation, eligibility, month-dot arithmetic |
| `calendarSources.spec.ts` (18) | The mappers, and that each item carries its source row |
| `taskNotes.spec.ts` (13) | Hydration, corrupt input, forget-on-empty |
| `calendarPrefs.spec.ts` (11) | Defaults and migration |
| `calendarItems.spec.ts` (9) | Custom-event mapping, label and urgent filtering |
| `toast.spec.ts` (6) | The single slot and its clock |

**Three tests are defect records**, named as such, pinning current behaviour
rather than desired behaviour. See `BUGS.md`.

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
`evt-`-prefixed. This is a live defect; see `BUGS.md`.

**The old Next repo is read-only.** `~/Desktop/Test 1/Thrive-msba-brain`.

---

## Commands

```bash
cd frontend
npm run dev -- --open      # dev server, :5173
npm run build              # production build
node build/index.js        # run the build, :3000
npm run check              # svelte-check
npm test                   # vitest run — 277 tests

python3 scripts/check-contrast.py    # 43 palette assertions, 3 of them ceilings
```

If a page looks stale locally, something is holding the port:
`lsof -ti:3000 | xargs kill -9`.
