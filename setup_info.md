# setup_info

Environment, versions, and how to run things.

**Last verified:** 2026-08-21 at `b0f7c3b`.

---

## Machine

| | |
|---|---|
| Platform | macOS (Darwin 25.5.0), Apple silicon |
| Shell | zsh |
| Node | **v24.14.1** |
| npm | **11.11.0** |
| Python | system `python3` — used only for `scripts/check-contrast.py`, which has zero dependencies |
| Package manager | **npm**. No pnpm/yarn lockfile; do not introduce one. |

No Docker anywhere yet. It will most likely arrive with the Django backend.

---

## Repos

| | |
|---|---|
| This repo | `~/code/thrive` → `git@github.com:rsm-msaad/thrive.git`, **private** |
| Default branch | `main` |
| Frozen prototype | `~/Desktop/Test 1/Thrive-msba-brain` → `thrive-msba-brain.git` |

**The prototype is READ-ONLY REFERENCE.** Never write to it, never touch its
remote. Its uncommitted working tree has been left exactly as found and verified
untouched after every phase. Everything worth knowing about it is in
`MIGRATION.md`.

`gh` is authenticated as `rsm-msaad`, git protocol **ssh**, token scopes
`gist, read:org, repo`.

Git identity for commits: `rsm-msaad <mesaad@ucsd.edu>`.

---

## Running the frontend

```bash
cd ~/code/thrive/frontend
npm install

npm run dev -- --open    # :5173, the one you want
npm run build            # production build
node build/index.js      # run the build, :3000
npm run preview          # vite's preview of the build, :4173
npm run check            # svelte-check
npm test                 # vitest run, 507 tests
npm run test:unit        # vitest watch
```

From the repo root:

```bash
python3 scripts/check-contrast.py    # must stay 58/58
```

### The timezone sweep

**Run this after touching anything date-shaped.** It is part of the definition of
green, not an extra, and it has caught two real failures — one in a test written the
same session, one in a test that had never been swept.

```bash
cd ~/code/thrive/frontend
for tz in UTC America/Los_Angeles Asia/Tokyo Pacific/Kiritimati \
          Pacific/Midway Australia/Lord_Howe Asia/Kathmandu; do
  TZ=$tz npx vitest --run
done
```

Seven zones, UTC+14 to UTC−11, including Australia/Lord_Howe's 30-minute DST
offset. Takes about 15 seconds. Note "date-shaped" means the change OR the test:
the second failure was in a spec that predated the sweep line in TESTING.md, so the
claim that the suite was green in all seven zones had been false for weeks.

### Gotcha: stale servers

If a page looks stale or a new route 404s, something is still holding the port.
This cost real debugging time — two orphaned `node build/index.js` processes made
`curl` hit an old build.

```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
lsof -ti:4173 | xargs kill -9
```

---

## Toolchain notes that will bite

**This SvelteKit version ships no `svelte.config.js`.** The adapter, the runes
setting, and the Vitest projects all live in `frontend/vite.config.ts` under the
`sveltekit()` plugin. Looking for the missing config file is a wasted ten
minutes.

**Runes only work in `.svelte.js` / `.svelte.ts`.** A plain `.ts` file containing
`$state` compiles, runs, and is silently not reactive. Four files carry the
suffix: `overrideStore`, `userEdits`, `taskNotes`, `toast`. Import them as
`$lib/overrideStore.svelte` — extensionless `.ts`, keep the `.svelte`.

**Vitest hides stdout on passing tests.** For a diagnostic probe you need
`npx vitest --run <file> --reporter=verbose --silent=false`.

**`npm run build` writes `.svelte-kit/` and `build/`**, both gitignored. `npm run
check` runs `svelte-kit sync` first, so it works from a clean checkout.

**`npm audit` reports issues** after the `@fontsource` / `@lucide/svelte`
installs. Not chased. Nothing is in a request path yet.

---

## Scaffold provenance

Recorded so it can be reproduced or compared:

```bash
npx sv@0.17.0 create frontend --template minimal --types ts --no-add-ons --install npm
npx sv@0.17.0 add tailwindcss=plugins:none vitest=usages:unit \
  sveltekit-adapter=adapter:node --install npm
```

Then, by hand: `@fontsource/dm-sans`, `@fontsource/jetbrains-mono`,
`@lucide/svelte`, `clsx`, `tailwind-merge`.

Removed from the scaffold: `src/routes/layout.css` (replaced by `src/app.css`)
and `src/lib/vitest-examples/`.

---

## Credentials

**None.** No `.env`, no `secret.md`, no API keys, no tokens anywhere in this
repo. The only credential in play is the GitHub SSH key already on the machine.

`.gitignore` covers `.env` and `.env.*` (with `!.env.example`) ahead of the
Django backend needing them. `secret.md` does not exist and has not been needed;
if it ever is, add it to `.gitignore` and verify with
`git check-ignore secret.md` **before** the first commit that could contain it.

---

## The two browser gates need a browser (added 2026-08-21)

`npm run check:layout` drives a real Chromium to assert no route can be scrolled
further than it paints. `npm run check:interaction` drives one to press the stat
pills. They are the only parts of the toolchain with an environment requirement
beyond Node, and they share all of the behaviour described here.

```bash
cd frontend
npm run build              # both gates measure the BUILD, not the dev server
npm run check:layout
npm run check:interaction
```

**That "the BUILD, not the dev server" has one consequence worth knowing.**
`arriveAtRow` warns on a missing row behind `import.meta.env.DEV`, so the branch
is compiled out of what `check:interaction` drives and no gate covers it. To see
it you need `npm run dev`. Noted here because it is an environment fact, not a
code one.

**`playwright-core` ships no browser.** On this machine the gate uses a Chromium
already in `~/Library/Caches/ms-playwright/` from an earlier Playwright install —
it tries `chromium.launch()` first and falls back to hunting a
`chrome-headless-shell` in that cache, because the cached revision was installed
by a different Playwright version than the one in `package.json`.

**If no browser is found it SKIPS and exits 0**, printing the install command:

```bash
npx playwright install chromium
```

That is deliberate. A gate that fails for a reason unrelated to the code gets
ignored, and an ignored gate is worse than no gate because it looks like
coverage. It is not part of `npm test` and not part of `npm run build`, so a
machine without a browser is never blocked.

**Each manages its own server.** The scripts spawn `node build/index.js` — the
layout gate on port 4399, the interaction gate on 4400 — wait for it, measure, and
kill it. Nothing to start by hand — but it
does require `npm run build` to have run, and it fails with a clear message if
`frontend/build/index.js` is missing.

### The full gate set

```bash
cd frontend
npm test                              # 451 tests, Node, no jsdom
npm run check                         # svelte-check
npm run build                         # vite build, adapter-node
npm run check:layout                  # 12 routes x 3 viewports, real browser
npm run check:interaction             # 60 assertions: popovers + editing, real browser
cd .. && python3 scripts/check-contrast.py   # 58 assertions, no dependencies
```
