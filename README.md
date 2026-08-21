# THRIVE

An AI coworker and knowledge platform for the UC San Diego Rady MSBA program.
One calm surface replacing the hunt across fragmented systems.

This repo is the rebuild. The original prototype was a Next.js app
(`thrive-msba-brain`); this is the SvelteKit + Django version. That old repo is
read-only reference from here on — nothing in it should be edited again.

## Layout

```
thrive/
├── MIGRATION.md    the map of the Next prototype, and the spec for the rebuild
├── README.md       this file
├── frontend/       the SvelteKit app
├── backend/        the Django API — not started
└── scripts/        repo-wide checks that belong to neither side
```

### `MIGRATION.md`

The complete inventory of the Next prototype at commit `4e0a65b`: every route,
all 25 data-layer providers, the date-handling rules, every component, the
design system, every store, all 83 tests, and the known defects that must not
be reproduced. It is the reference for each phase of the port, and it is also
the only surviving copy — it was never committed to the old repo.

Read it before touching either side of this repo.

### `frontend/`

SvelteKit, Svelte 5 with runes, TypeScript strict, Vite, `adapter-node`,
Tailwind v4, Vitest. Runs as a plain Node process, which is what
`adapter-node` is for — no serverless platform assumptions.

```bash
cd frontend
npm install
npm run dev      # dev server
npm run build    # production build
npm run check    # svelte-check against tsconfig
npm test         # vitest, once
```

### `backend/`

Nothing yet. Django, when it arrives.

The prototype had no backend at all — its data layer read from in-memory
fixtures that reset whenever the server restarted and were shared by every
visitor at once. `MIGRATION.md` §2 documents the 25 provider functions that
form the seam Django plugs into, and §9 records why the shared-store behaviour
is graded blocking rather than merely known.

### `scripts/`

`check-contrast.py` — 43 WCAG assertions over the palette, no dependencies.

```bash
python3 scripts/check-contrast.py
```

It is the palette's regression test and the gate for any token change. Three of
the 43 are **ceilings**: they assert `--thrive-faint` stays *below* 4.5:1, so
putting words in a decorative colour fails a check rather than quietly
shipping. Run it in the same commit as any change to a colour token.

Its hex values are hardcoded to mirror the `:root` block in
`frontend/src/app.css`. Its docstring still points at the Next app's old path
(`src/app/globals.css`) — it was copied over unmodified so the gate could not
be accused of having been tuned to pass.

## The design system

`frontend/src/app.css` is the single source of truth. Never hardcode a colour,
size, radius, or duration in a component.

Three things about it are load-bearing enough to state up front:

1. **A 1px decorative hairline and a 1.5px control boundary are different
   things, and the two must never collapse into one token.** Hairlines mean
   nothing — if removing one makes a layout ambiguous, the layout is wrong.
   Control boundaries (checkbox, radio, input, select) owe 3:1 under WCAG
   1.4.11 because the boundary is the only thing marking where the control is.
   Getting this wrong is silent: the page looks fine and the guarantee is gone.

2. **Weight is not in the type scale.** Set it at the call site or you get 400.
   Only 400/500/700 load, so `font-semibold` (600) synthesises — do not use it.

3. **Light-only, and no shadows.** A white card on cream with a hairline is the
   entire elevation system. `dark:` is pinned to a class nothing applies.

Fonts are self-hosted through `@fontsource` — DM Sans 400/500/700 and JetBrains
Mono 400/500, latin subset, `font-display: swap`. No Google Fonts link. Mono
marks machine truth: numerals, counts, IDs, compact dates, eyebrows. Prose
never goes in mono.

`/swatch` renders every token, type step, border weight, and both faces on one
page. It is a throwaway comparison target for the port and should be deleted
before Release 1.
