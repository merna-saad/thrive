# DEPENDENCIES

What is installed in `frontend/`, and why each thing is here.

**Last verified:** 2026-08-21 at `f8593b7`.

---

## Runtime

| Package | Version | Why |
|---|---|---|
| `@fontsource/dm-sans` | `^5.3.0` | Self-hosted DM Sans. Latin subset, weights pinned 400/500/700. |
| `@fontsource/jetbrains-mono` | `^5.3.0` | Self-hosted JetBrains Mono, 400/500. Mono marks machine truth and never carries a heading, so no 700. |
| `@lucide/svelte` | `^1.33.0` | Icons. See the note below — **not `lucide-svelte`**. |
| `clsx` | `^2.1.1` | Conditional class strings. Mostly superseded by Svelte 5's native `class={[...]}`; kept as `twMerge`'s input. |
| `tailwind-merge` | `^3.6.0` | Tailwind conflict resolution. The half of `cn()` Svelte does **not** replace — needed wherever a component takes a `class` override. |

`@fontsource` ships `font-display: swap` in each weight file already, matching
what `next/font` was configured to do. **No Google Fonts link anywhere** —
self-hosting is a requirement, not a preference.

---

## Development

| Package | Version | Why |
|---|---|---|
| `@sveltejs/kit` | `^2.63.0` | Framework. |
| `svelte` | `^5.56.1` | Runes, forced on outside `node_modules`. |
| `playwright-core` | `^1.62.1` | **Added 2026-08-21. The first dependency since Phase 1.** Drives a real browser for `npm run check:layout`. See the note below. |
| `@sveltejs/vite-plugin-svelte` | `^7.1.2` | Compiles `.svelte` and `.svelte.ts`. |
| `@sveltejs/adapter-node` | `^5.5.4` | Runs as a plain Node process. No serverless assumptions. |
| `vite` | `^8.0.16` | Build. |
| `@tailwindcss/vite` | `^4.3.0` | Tailwind v4 as a Vite plugin, no PostCSS config. |
| `tailwindcss` | `^4.3.0` | The design system compiles through `@theme inline`. |
| `typescript` | `^6.0.3` | Strict. |
| `svelte-check` | `^4.6.0` | `npm run check`. |
| `vitest` | `^4.1.8` | Node environment, no jsdom. |

---

## Decisions

### `@lucide/svelte`, not `lucide-svelte`

`lucide-svelte@1.0.1` is the **legacy** package, peering
`svelte: ^3 || ^4 || ^5.0.0-next.42`. `@lucide/svelte@1.33.0` peers `svelte: ^5`
and tracks the same version line as the prototype's `lucide-react@^1.31.0`. Same
library, correct package for Svelte 5.

Import **per icon**, which is what its exports map supports:

```ts
import House from '@lucide/svelte/icons/house';
```

Its `LucideIcon` type lives in a `types` module that is **not** in the exports
map, so `nav.ts` derives the type as `typeof House` instead. That goes through
the public surface and cannot drift from what the icons actually are.

### No shadcn-svelte, no bits-ui — yet

Deferred deliberately. MIGRATION.md §4 lists the Radix primitives that will need
equivalents, and records that **only two of the nine vendored shadcn files in
the prototype were ever reachable** (`avatar` and `skeleton`); the other seven —
`tooltip`, `popover`, `separator`, `button`, `badge`, `card`, `input` — were
vendored and imported by nothing.

Consequence: `Avatar.svelte` is hand-rolled. The one behaviour Radix contributed
was falling back to initials on a missing or broken image.

`app.css` **keeps layer 2** (the shadcn semantic vars remapped onto
`--thrive-*`) even though shadcn is absent, for two reasons: the `@layer base`
`body` rule resolves through `--background` / `--foreground`, and it is what will
make stock shadcn-svelte primitives come out in THRIVE's palette with no
patching.

### Not carried over from the prototype

| Package | Why not |
|---|---|
| `class-variance-authority` | Used **only** in the two unreachable vendored shadcn files. |
| `radix-ui` | Deferred with shadcn-svelte. |
| `tw-animate-css` | Its only consumers were `ui/popover` and `ui/tooltip`, both vendored and imported by nothing. `animate-spin`/`animate-pulse` are core Tailwind; `animate-rise` is defined in `app.css`. **Comes back with shadcn-svelte**, whose popover and tooltip animations depend on it. |
| `shadcn` (the CLI) | Nothing to generate yet. |
| `next`, `react`, `react-dom`, `eslint-config-next` | Framework being replaced. |

### Python

`scripts/check-contrast.py` has **zero dependencies** — standard library only.
No `requirements.txt`, and none needed. Run it with the system `python3`.

---

## Audit

`npm audit` reports issues after the `@fontsource` and `@lucide/svelte`
installs. **Not chased this session.** Worth a look before anything is deployed;
nothing here is in a request path yet.

---

## `playwright-core`, and why the no-new-dependency streak ended

Added 2026-08-21, and the only dependency added since the Phase 1 scaffold.

**What it is for.** `scripts/check-layout.mjs` asserts that no route can be
scrolled further than it paints. That needs a real layout engine: Vitest runs in
Node with no jsdom here, and jsdom does no layout — every height it reports is
zero. There is no zero-dependency way to measure a rendered page, and the
alternative was leaving a real, invisible bug ungated (BUGS.md, the 37px of
scrollable empty space).

**Why `playwright-core` rather than `playwright`.** `playwright-core` ships no
browser binaries, so `npm install` stays fast and nothing downloads ~150MB into
the repo. The gate finds a browser at run time or skips.

**Why the earlier refusal still stands.** `@types/node` was rejected in Phase 5
for a test that read source text, because `import.meta.glob(..., { query:
"?raw" })` did the same job with nothing added. The test here is different in
kind: no amount of cleverness measures layout without a layout engine. The rule
was never "never add a dependency" — it is "do not add one where the platform
already answers".

**What it costs if it is absent.** Nothing breaks. The gate prints
`check-layout: SKIPPED` with the install command and exits 0, so a machine or CI
runner without a browser is not blocked. It is not in `npm test` and not in
`npm run build`.
