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
npm test                 # vitest run, 277 tests
npm run test:unit        # vitest watch
```

From the repo root:

```bash
python3 scripts/check-contrast.py    # must stay 43/43
```

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
