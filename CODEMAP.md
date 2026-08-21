<!-- built-at: b0f7c3b -->
<!-- updated: 2026-08-21 -->

# CODEMAP

Navigation map for the THRIVE rebuild. Read this before opening files.

**Built:** 2026-08-21, first full build.
**Size:** 61 files under `frontend/src` — ~8,575 lines, 5,357 source / 3,218 test.

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
| `data/types.ts` | Every domain type. One file, on purpose. Dates are ISO **strings**, never `Date`. |
| `data/index.ts` | Public entry. Import from `$lib/data`, never deeper. Types only until Phase 5. |
| `data/stubProviders.ts` | **TEMPORARY.** One hardcoded student. Deleted in Phase 5. |
| `format.ts` | Server-side formatting. `describeDue()` is the important one — returns a 4-state discriminated union. |
| `schedule.ts` | **The calendar's vocabulary.** Category maps, the three category sets and their guards, grid arithmetic, `filterSchedule`/`isVisible` (the one filter), grouping, `nextUpItem`. Read this first for anything calendar-shaped. |
| `buildSchedule.ts` | `todayKey()` only. `buildScheduleData()` needs providers. |
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
