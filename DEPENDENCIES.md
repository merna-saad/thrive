# DEPENDENCIES

What is installed in `frontend/`, and why each thing is here.

**Last verified:** 2026-08-30 at `e3fbfae`.

---

## Runtime

| Package | Version | Why |
|---|---|---|
| `@fontsource/jetbrains-mono` | `^5.3.0` | Self-hosted JetBrains Mono, 400/500. Mono marks machine truth and never carries a heading, so no 700. |
| `@fontsource/teko` | `^5.3.0` | Self-hosted Teko, latin 500/600. UC San Diego's own free substitute for Refrigerator Deluxe (2026-08-29). **Display type only** — the `h1` on a route, in caps, via `.thrive-display`. See the note below. |
| `@lucide/svelte` | `^1.33.0` | Icons. See the note below — **not `lucide-svelte`**. |
| `clsx` | `^2.1.1` | Conditional class strings. Mostly superseded by Svelte 5's native `class={[...]}`; kept as `twMerge`'s input. |
| `tailwind-merge` | `^3.6.0` | Tailwind conflict resolution. The half of `cn()` Svelte does **not** replace — needed wherever a component takes a `class` override. |

### ADDED: `@fontsource/teko` (2026-08-29)

UC San Diego names Teko as the free substitute for **Refrigerator Deluxe**, the licensed
condensed face the campus brand sets in caps for headlines. It is display type only: the
`h1` on a route, and never a row title, label, button, nav item or line of body copy.

**Two weight files, latin subset only.** `latin-500.css` and `latin-600.css`. The
package also ships `latin-ext` and `devanagari` — Devanagari is most of the family's
weight and none of its use here, and this app is not localised.

**600 is the one in use. 500 ships without a call site, deliberately.** Teko's weights
are far apart and there is no 550, so the step below the display weight has to be in the
browser before anyone can judge whether a heading wants it. It costs a build artifact and
nothing else: `document.fonts` on a built route reports `500:unloaded` beside
`600:loaded`, because a `@font-face` is only fetched when something uses that family at
that weight. Home, which took no display type, reports both unloaded.

**Brix Sans is NOT adopted.** It is the brand's body face; the interface stays on the
system stack. UCSD names Roboto as its free substitute and that was declined — this
change is display type and spacing only. **Do not "complete" the brand adoption by
swapping the body face without reading CONTEXT §6**, which records why the system stack
is there.

### REMOVED: `@fontsource/dm-sans` (2026-08-22)

The interface font is the system stack now — `-apple-system, BlinkMacSystemFont,
"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. DM Sans did not read naturally
at any size across four passes of the type scale, and the OS face is hinted for the
display in a way no webfont is.

**Six font files stopped shipping** (three weights × woff2 + woff). The build carried
two where it had carried eight. Nothing loads a webfont for prose — still true after
Teko arrived on 2026-08-29, since Teko sets page titles rather than prose.

The reasoning, the measurements and the cross-platform trade are in CONTEXT §6. **Do not
re-add a webfont for interface text without reading that section** — the trade is that
the app looks slightly different per platform, and it was taken deliberately.

`@fontsource` ships `font-display: swap` in each weight file already, matching
what `next/font` was configured to do. **No Google Fonts link anywhere** —
self-hosting is a requirement, not a preference.

---

## Development

| Package | Version | Why |
|---|---|---|
| `@sveltejs/kit` | `^2.63.0` | Framework. |
| `svelte` | `^5.56.1` | Runes, forced on outside `node_modules`. |
| `playwright-core` | `^1.62.1` | **Added 2026-08-21. The first dependency since Phase 1.** Drives a real browser for `npm run check:layout` and `npm run check:interaction`. See the note below. |
| `@sveltejs/vite-plugin-svelte` | `^7.1.2` | Compiles `.svelte` and `.svelte.ts`. |
| `@sveltejs/adapter-node` | `^5.5.4` | Runs as a plain Node process. **Still here after the Netlify swap** — the two browser gates spawn it. See the note below. |
| `@sveltejs/adapter-netlify` | `^6.0.4` | **Added 2026-08-21.** What a push to `main` deploys. See the note below. |
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

### Two adapters, and why both stay

**Added `@sveltejs/adapter-netlify` and did NOT remove `@sveltejs/adapter-node`.**
`vite.config.ts` picks one from an environment variable: unset selects Netlify,
`ADAPTER=node` selects Node.

The swap was asked for so teammates could open a URL instead of cloning the repo
and getting onto Tailscale. Deleting adapter-node would have cost the two gates
that have caught the most real defects in this project — the dead stat pill, the
`derived_inert` warning live in production, the dialog's TypeError, and the 403 on
every form submission. They spawn a real long-running server and drive it with
Playwright, and a bundle of serverless functions is not that.

The alternative was pointing them at `netlify dev`, which would put the Netlify
CLI and a serverless emulator between a gate and the thing it measures, and add a
dependency far heavier than the adapter it replaced.

**It is not a hedge, because it is not a fork.** Both adapters consume the same
SvelteKit build and neither changes the app: there is no `prerender`, no
`ssr = false` and no `csr = false` anywhere in `src/routes`, so every route is
server-rendered per request either way. The out directories are separate —
`build/` for Netlify, `build-node/` for the gates — so whichever ran last cannot
decide what a gate is testing.

**What it costs:** one more package to keep current, and a build script that is
`npm run build` for deployment and `npm run build:node` for the gates. Both are in
the README.

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

**What it is for.** Two gates now.

`scripts/check-layout.mjs` asserts that no route can be scrolled further than it
paints. That needs a real layout engine: Vitest runs in Node with no jsdom here,
and jsdom does no layout — every height it reports is zero. There is no
zero-dependency way to measure a rendered page, and the alternative was leaving a
real, invisible bug ungated (BUGS.md, the 37px of scrollable empty space).

`scripts/check-interaction.mjs` presses the stat pills. That needs real pointer
events, real focus, real `matchMedia`, and a real animation clock — none of which
jsdom has either. **It cost nothing to add**, which is the retrospective
justification for the first gate having paid for the dependency: the second one
was free, and it caught a dead button that five other gates called green.

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
