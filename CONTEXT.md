<!-- updated-at: ad38970 -->

# CONTEXT

The living context file. Read this and you should be able to pick up the work
without asking anyone.

**Regenerated in full every handoff.** Never patch it — a partial edit leaves
stale claims sitting beside fresh ones with no way to tell them apart.

This pass covers **the dark theme** and **two fixture bugs on Home**, in six
commits. The theme was the larger piece of work; the fixture bugs are the more
interesting record, because they are what a second theme flushed out of a
codebase that had been green on every gate for days.

**Regenerating rather than patching earned its keep this time**, which is worth
saying since the rule is usually obeyed on faith. Reading every section against
the tree turned up four stale claims that no gate covers and nobody was looking
for: `TopBar`'s control size (§10), the fixture's event and assignment counts
(§12), the fixture student's current term (§12), and a sentence naming the wrong
file as the source of `unitsRequired` (§12). Three of them had been wrong since
before the last regeneration.

---

## 1. What this is

**THRIVE** — an AI coworker and knowledge platform for the UC San Diego Rady
School **MSBA** program. One calm surface replacing the hunt across fragmented
systems (Canvas, TSS/EASy, the CMC, email, a dozen PDFs).

This repo is the **rebuild**. A working Next.js prototype already exists and is
now frozen; this is the SvelteKit + Django version of it.

- **Repo:** `rsm-msaad/thrive`, private, GitHub. Default branch `main`.
- **Owner:** one developer, working solo. Teammates have repo access to build the
  Django backend.
- **Local path:** `~/code/thrive`
- **Deployed:** Netlify, from `main`. **No authentication** — see §20.
- **No PRs.** Everything goes direct to `main`. Commit hashes stand in for PR
  links throughout the docs.

### The frozen prototype

`~/Desktop/Test 1/Thrive-msba-brain` — Next.js 16 / React 19, at commit
`4e0a65b`. **READ-ONLY REFERENCE. Never write to it.** Its uncommitted working
tree has been left exactly as found and verified untouched after every phase.

Everything worth knowing about it is inventoried in `MIGRATION.md` (§3), so in
practice you read that rather than the old tree.

**Phase 9 was the first surface with no prototype at all.** Ask THRIVE does not
exist in the old tree — the closest thing is a floating assistant panel behind a
feature flag, read for tone rather than ported. From here most work is design
rather than migration, and the docs should say which. **The dark theme is the
second such piece**: the prototype is light-only and has no dark palette to port.

### The app has two themes

Since 2026-08-21. Light is the original soft-cream direction, unchanged; dark is a
derived counterpart, and the system preference is the default. The whole of it is
a token swap — see §6 for the palette and §8 for how the choice is stored and why
there is no blocking script in the head.

### A note on dates in this repo

Several entries and `app.css` comments are stamped **2026-08-22**, a day ahead of
the real date, from a mis-stamp during the repalette. **Commit hashes are the
reliable ordering.** Dates here are ±1 day; do not use them to reason about
sequence. A great deal happened on 2026-08-21 in particular — that one date covers
Phases 8 and 9, the deploy, about a dozen follow-on redesigns, the dark theme and
the fixture fix.

---

## 2. Repo layout

```
thrive/
├── BACKEND.md       the contract Django has to satisfy — the backend's entry point
├── CONTEXT.md       this file — the snapshot
├── HANDOFF.md       the diary — what happened, per session
├── MIGRATION.md     the map of the frozen prototype, and the port spec
├── CONVENTIONS.md   the rules the tooling does not enforce
├── CODEMAP.md       navigation map for this repo
├── CHANGELOG.md     dated session summaries, newest first
├── FINDINGS.md      reusable patterns and lessons
├── BUGS.md          defects found and fixed
├── DEPENDENCIES.md  packages and why each is here
├── TESTING.md       coverage and gaps
├── setup_info.md    environment, versions, and how to run things
├── README.md        the public-facing explanation, and the doc guide
├── netlify.toml     the deploy config, at the root because Netlify reads it there
├── frontend/        the SvelteKit app
├── backend/         Django — not started, README only
└── scripts/
    ├── check-contrast.py       127 assertions over BOTH palettes and app.css
    ├── check-layout.mjs        17 targets x 3 viewports, in a real browser
    └── check-interaction.mjs   261 assertions: the popovers, task editing, the
                                calendar, booking, Ask THRIVE, the nav
                                disclosure, provenance, the term-plan accordion,
                                the page measure, and the theme
```

`MIGRATION.md` is also the **only surviving copy** of the prototype inventory —
it was never committed to the old repo.

**`BACKEND.md` is where a backend contributor starts.** The README's doc guide
routes by side and says honestly which files are frontend build history that a
backend engineer can skip.

---

## 3. MIGRATION.md is the spec, and it is now largely historical

1,457 lines, nine sections, written by reading the prototype at `4e0a65b`.

| § | Contents |
|---|---|
| 1 | Route inventory — 13 routes, which are real, which return `PagePlaceholder` |
| 2 | The data layer — provider signatures and the three module-level stores |
| 3 | Date and time handling — the timestamp rule as actually implemented |
| 4 | Component inventory — 75 components, shadcn/Radix wrappers marked |
| 5 | Design system — every token, and the conventions a port must preserve |
| 6 | State and stores — 14 `localStorage` keys, four properties |
| 7 | Tests — all 83, file by file |
| 8 | React-specific code needing a real decision, not a translation |
| 9 | Known defects, on a "build correctly, do not reproduce" list |

**It documents the PROTOTYPE, not this repo**, and the two have diverged enough
that several of its claims are stale about the current tree. `BACKEND.md` §9
lists them: the provider count is 28 rather than 25, `cancelAppointment` releases
by slot id rather than by start time, slot availability also depends on the clock,
and a `DegreeProgress` field it warns about has been removed. Add to that list
everything in §6 about type sizes and colour, **the entire course fixture** — the
prototype's four invented courses are gone (§12) — and now **the whole palette**,
which is two themes rather than one.

### The standing rule, and the four shapes it has taken

**Where MIGRATION.md and the prototype source disagree, the source wins, and it
gets reported.** Exercised repeatedly.

**Shape two: sometimes the source is simply WRONG, and porting it verbatim is the
bug.** Every date converter in the Next `taskBoard.ts` throws a `RangeError` on a
due date that will not parse. The agenda rendered all three groupings identically.

> **The right instinct when the source is wrong is to improve on it, not to port
> the mistake** (owner, 2026-08-21).

**Shape three: sometimes the source contradicts ITSELF.** MIGRATION §4 and
`WeekView.tsx`'s own comment both say week view is not rendered below `40rem`;
`CalendarView.tsx` renders it at every width with a horizontal scroll, which that
same comment calls the wrong answer.

> **A source that contradicts itself is not a source to follow** (owner).

**Shape four, found in Phase 8: sometimes the source declares a coupling and never
builds it.** `BookingPanel.tsx` takes a `selectedDayKey` prop documented as "day
chosen elsewhere on the page (the mini calendar)" and carries a full
adjust-during-render mechanism to adopt it — but `BookingArea.tsx` never renders a
calendar. The month calendar Phase 8 was asked to build was a coupling the
prototype had already declared and left dangling.

This is the mildest shape and the most encouraging: **a dangling declaration is a
design intention with the plumbing already in place.** Worth grepping for before
assuming a change is new.

**Shape five, and the dark theme is the instance: sometimes the source left a
HOOK.** `app.css` carried `@custom-variant dark (&:is(.dark *))` pinned to a class
nothing ever applied, with a comment saying it was kept so vendored `dark:` rules
would stay inert until there was a dark theme to serve them. Two years of it doing
nothing, and it was the right place to start.

---

## 4. Stack

**Frontend** — SvelteKit 2.63 · Svelte 5.56 (runes, forced outside
`node_modules`) · TypeScript 6 strict · Vite 8 · Tailwind v4 · Vitest 4 · npm.

Note this SvelteKit version has **no `svelte.config.js`** — the adapter choice,
the runes setting and the Vitest projects live in `vite.config.ts`.

**Two adapters, and an environment variable picks one.** `@sveltejs/adapter-netlify`
by default (what a push to `main` deploys); `@sveltejs/adapter-node` under
`ADAPTER=node`, which is what the two browser gates spawn — they drive a real
long-running server and a bundle of serverless functions is not that. Out
directories are separate: `build/` for Netlify, `build-node/` for the gates.

Nothing about the app differs between them, and that was checked rather than
assumed: there is no `prerender`, no `ssr = false` and no `csr = false` anywhere in
`src/routes`, so every route is server-rendered per request either way. That
property is load-bearing — `new Date()` inside a `load` is this app's one answer to
"what is today", and a prerendered route would stamp every relative fixture date at
build time.

**LightningCSS is in the pipeline and it rewrites colour.** Not a dependency
anybody chose — it arrives with Tailwind v4 / Vite — and it matters as of the dark
theme: it **downlevels `light-dark()`** into a `--lightningcss-light` /
`--lightningcss-dark` space-toggle pair. The transform is faithful, including the
specificity that makes an explicit choice beat the media query, and it was verified
by reading the compiled asset rather than trusted. The consequence is in §6: a
themed custom property is not a colour, and it is a *different* non-colour in dev
and in the build.

**Backend** — Django, not started. **Nothing here talks to it.** The provider
signatures are the only contract it has to honour; see `BACKEND.md`.

**`ORIGIN` is an adapter-node requirement**, not a Netlify one. Without it every
form POST is a 403, and the dev server is unaffected — so it worked in dev and
failed only in the build. See §20 and `setup_info.md`.

**No shadcn-svelte and no bits-ui yet.** Deferred deliberately. The stat pill
popover, the due-date editor, the calendar's key bar, the add form's kind picker,
`ItemDetail`, the nav rail's disclosure, the program strip's accordion and **the
theme toggle** are all hand-built; the agenda's grouping control is a deliberately
native `<select>`. No phase has added a new primitive since 7c.

**Dependencies added since Phase 1: two.** `playwright-core` (2026-08-21) for the
two browser gates, and `@sveltejs/adapter-netlify` (2026-08-21) for the deploy.
**The dark theme added none** — the palette is CSS and the toggle is a button.

Between them the browser gates have caught a dead button five other gates called
green, a `derived_inert` warning live in production, the undo arrival's silent
no-op, an unclamped `line-clamp`, a TypeError on every dialog close with focus in a
field, a 403 on every form submission, a chat log that stopped being a scroll
container, eight month-grid cells clipping their dot row, a fixture change that
emptied the calendar on the one day everything is dated relative to, and — this
pass — **a comment in `TopBar` that had been claiming the wrong control size since
the density pass.** `@types/node` was rejected in Phase 5 and stayed rejected when
the adapter switch wanted `process.env` — see §16.

---

## 5. Where the port has got to

| Phase | What | State |
|---|---|---|
| — | Inventory the prototype → `MIGRATION.md` | done |
| 1 | Scaffold + design system | done |
| 2 | Pure logic + its 83 tests | done |
| 3a / 3a-fix | `format.ts` suite; input guards on `describeDue` | done |
| 3b | Browser persistence layer → Svelte 5 runes | done |
| 4 | App shell, navigation, root layout | done |
| 5 | Data layer — providers, fixtures, three stores | done |
| — | Repalette to campus brand; tighten the two-face type rule | done |
| — | Trim navigation to four destinations | done |
| 6a | Home — the page, four cards, fit-on-one-screen | done |
| — | Stat pill popovers, the reveal channel, the arrival cue, `check:interaction` | done |
| 6b | Task editing — tick, undo, rename, priority, notes, due date, reorder, add | done |
| 7a | Calendar spine — `buildScheduleData`, month grid, selected day, day sections | done |
| 7b | Calendar views + filter — switcher, week, agenda, key bar | done |
| 7c | Calendar editing — item detail, add form, the events section | done |
| 8 | Appointments — cards, chip strip, booking panel, "Your day", a clickable month | done |
| 9 | Ask THRIVE — a history rail, a chat window, three destinations in the nav rail | done |
| — | Page measure and gutters | done |
| — | Netlify deploy, adapter-node retained for the gates | done |
| — | Calendar chrome: one heading row, the Key off its own column | done |
| — | "Your day" moved under the month it follows | done |
| — | Two density passes: call-site rhythm, then the whole desktop scale | done |
| — | The Key back as an 11rem side panel | done |
| — | Provenance: a Canvas pill, and an `origin` field to drive it | done |
| — | The real MSBA catalogue, and a `CourseRequirement` field | done |
| — | Suggested classes per term, behind a provider and an accordion | done |
| — | **A dark theme: a derived palette, a three-state switch, both themes gated** | **done** |
| — | **Home's fixture numbers, which described three different students** | **done** |
| **next** | `/assignments` — the same `TaskRow`, no groups | not started |
| then | The retrieval service behind Ask THRIVE, and the real recommender | needs a backend |
| later | **Group Projects — the first shared surface** | scoped, not built |
| later | Floating widgets, behind `FEATURES` | not started |

**694 tests, 33 spec files, all passing**, green in **all seven timezones** —
re-verified this pass rather than assumed. `svelte-check` clean over 473 files, 0
warnings. Build clean. Contrast **127/127 across both themes**. Layout **51/51**.
Interaction **261/261**. 132 commits, all pushed.

**188 files under `frontend/src`.**

**Four destinations are built:** `/`, `/calendar`, `/appointments`, `/ask`. That is
the whole of `primaryNav` — **every visible navigation item leads to a real page**.

### Fourteen follow-on changes, and eight of them were corrections

Worth reading before touching any of these surfaces, because the churn IS the
record and the reasons are the useful part.

1. **Booking flow measured and rearranged**, then reverted. The month grid read
   backwards; a day list fixed that; the owner reverted to the chip strip.
2. **Ask THRIVE's destinations moved into the nav rail**, and the page's second
   rail was removed as almost-empty — then brought back as a **history** rail,
   which is a different thing with one job.
3. **The page container** went 72rem → 96rem → 80rem plus a 40px gutter, with
   `/calendar` alone on 96rem — and then `--container-wide` was deleted and every
   route landed on 80rem.
4. **The month grid on `/appointments` became clickable**, which deleted the
   read-only mode added a change earlier.
5. **"Your day" moved BELOW the month grid.** The bug reported against it did not
   reproduce; the arrangement was most of the cause and the legibility of the date
   was the rest.
6. **The calendar's Key: column → full-width disclosure → column again**, at 11rem
   rather than 18. Three arrangements in one day, and the numbers are the argument.
7. **The Key's streams: a wrapping chip strip → a vertical list**, dots in one
   column.
8. **Type and spacing came down twice.** First at the call sites, then the whole
   desktop scale — the fourth time it was raised and the first time it was answered
   by making something smaller.
9. **Provenance arrived as a field, not a flag.** `origin`, not `isFromCanvas`.
10. **The invented course fixtures were replaced with the real MSBA catalogue.**
11. **The catalogue's term grouping was an inference and had to be corrected**, and
    with it all three enrolments and the six fixtures keyed to them.
12. **The core course list was four and should have been five.**
13. **The dark theme's first chroma pass was wrong and had to be backed off.**
    A uniform 1.6× boost walked `later` to dE 0.046 from the reserved indigo —
    worse than either theme's worst pair — to solve a problem dark surfaces had
    already solved. See §6.
14. **Home's numbers described three different students**, and the course fixtures
    were not the ones at fault. See §12.

**What the corrections cost:** two components written and deleted, three pure
functions written and deleted with their tests, `MiniCalendar` given and then
stripped of two modes, a fixture constant moved 5 → 25 → 5, one design token
(`--container-wide`) added and removed, one skill renamed and renamed back, a gate
assertion moved three times, and one gate assertion written against a stale comment
and rewritten against a measurement.

**What they bought:** every reversal left a residue that was never about the design
being reverted — `publishedByDay`, the per-chip open count, and `BookingDayView`
all survive because they answer questions the chip strip has too. See FINDINGS.

---

## 6. The design system

`frontend/src/app.css` is the single source of truth. **Never hardcode a colour,
size, radius, or duration in a component.** `designSystem.spec.ts` fails the
build on a hex or a font name in markup, on a `.thrive-*` class used from
TypeScript that `app.css` does not define, and — since the dark theme — **on any
colour from Tailwind's own stock palette**.

Three layers: raw `--thrive-*` tokens → shadcn semantic vars remapped onto them →
`@theme inline` exposing both as Tailwind utilities.

**Direction: soft cream, hairline, Rady navy with a yellow accent.** In dark: the
same direction, held warm, with the navy lifted and every reserved colour retuned
to keep its meaning.

### TWO THEMES, one declaration per token

Added 2026-08-21. Every colour token is a single
**`light-dark(light, dark)`** declaration.

**Not a second `:root` block, and this is a decision rather than a style.** The
obvious shape is `:root` for light plus a `[data-theme='dark']` block repeating
every token. That needs a **third** copy, because an explicit choice and a system
preference are different selectors and one of them has to sit inside a media
query. A repalette then becomes three edits, and the failure mode of missing one is
a single wrong colour in one theme — exactly the class of drift `check-contrast.py`
was rewritten to parse this file to prevent. One declaration cannot be half
retuned.

It also makes the gate **exact**: both arms are literals in one declaration, so
there is no mixing to reimplement and no rounding to guess at. That is most of why
the palette is expressed this way.

The mechanism, in three lines of CSS:

```css
:root                     { color-scheme: light dark; }   /* resolves light-dark() */
:root[data-theme='light'] { color-scheme: only light; }
:root[data-theme='dark']  { color-scheme: only dark; }
```

**`only` is the load-bearing word.** Plain `color-scheme: light` still lets the
browser fall back to dark for a UA-controlled surface; `only light` pins it, which
is what an explicit choice has to mean.

**No attribute means "follow the OS"**, which is both the default and the markup
the server already sends. See §8 for why that is the whole answer to the first
paint.

**`@custom-variant dark` was retuned, not deleted.** Nothing in `src/` writes a
`dark:` utility and nothing needs to — every colour comes from a token, so the
theme is a token swap. The variant still has a job: it is what will make
shadcn-svelte's own `dark:` rules land correctly when that phase arrives. It is the
block form with two arms, because there are two ways to be in dark and a single
selector cannot say that. **Getting only the attribute arm would leave a vendored
`dark:` rule silently inert for every student who never touched the toggle**, which
is most of them, and would look perfectly correct to anyone testing on a light
machine. The contrast gate asserts the media arm exists.

> **NEVER READ A THEMED TOKEN AS A CUSTOM PROPERTY.**
> `getPropertyValue('--thrive-bg')` returns no colour, and returns a *different*
> non-colour per environment: in dev the literal `light-dark(#faf9f5, #161512)`,
> in the production build LightningCSS's
> `var(--lightningcss-light,#faf9f5) var(--lightningcss-dark,#161512)`
> space-toggle. Read a **used** value off a real element, in the built app.

### The palette, both themes, measured

Dark ratios are on the dark surfaces; light ratios are unchanged.

| Token | Light | Dark | Dark: bg / card / sunken |
|---|---|---|---|
| `bg` | `#faf9f5` | `#161512` | — |
| `surface` | `#ffffff` | `#201f1b` | — |
| `sunken` | `#f1efea` | `#2f2e29` | — |
| `ink` | `#17181c` | `#eeede8` | 15.58 / 14.07 / 11.60 |
| `body` | `#3a3b42` | `#b9bbc2` | 9.52 / 8.60 / 7.09 |
| `muted` | `#6b6c72` | `#97999f` | 6.41 / 5.79 / **4.78** floor |
| `faint` | `#85868c` | `#78787e` | 4.16 / 3.76 / 3.10 |
| `hairline` | `#e6e3dc` | `#34332f` | 1.30 on card — decorative |
| `hairline-soft` | `#efece6` | `#282724` | 1.10 on card — decorative |
| `primary` | `#182b49` | `#9fb5d7` | 8.75 / 7.91 / 6.52 |
| `primary-hover` | `#22395e` | `#b3c7e7` | 9.61 on card |
| `primary-active` | `#101d33` | `#89a0c3` | 6.19 on card |
| `on-primary` | `#ffffff` | `#09121f` | 9.00 on primary; ≥6.36 on every fill |
| `primary-soft` | `#e9edf3` | `#273140` | 6.29 holding `primary` |
| `primary-fill` | `#9dbcdb` | `#2c5377` | 2.05 — still cannot hold its edge |
| `on-primary-fill` | `#0d1b2e` | `#edf3f8` | 7.19 on the fill |
| `scrim` | ink @ 20% | black @ 60% | a NEW token — see below |
| `yellow` | `#ffcd00` | `#ffcd00` | **12.16 / 10.98 / 9.06** |
| `indigo` | `#4c5bd4` | `#788eff` | 6.18 / 5.59 / 4.61 |
| `on-track` | `#00716c` | `#14a8a0` | 6.21 / 5.61 / 4.62 |
| `watch` | `#946000` | `#ce8800` | 6.21 / 5.61 / 4.63 |
| `needs-help` | `#7851c2` | `#b07bff` | 6.19 / 5.59 / 4.61 |
| `urgent` | `#b8462f` | `#ff6343` | 6.19 / 5.59 / 4.61 |
| `civic` | `#994ea3` | `#d56de2` | 6.19 / 5.59 / 4.61 |
| `later` | `#4c74ad` | `#6e98d4` | 6.18 / 5.58 / 4.60 |
| the seven `*-soft` | `color-mix(…, white)` | literal hexes | 4.60–4.64 holding their hue |

**Method:** hold the light theme's HUE exactly, solve for the lightness that
reproduces the light theme's own contrast ratio against the dark surfaces, then
raise chroma **1.30×**. Chroma is capped rather than maximised because lifting
lightness *costs* chroma — the sRGB gamut narrows toward white — so a hue that keeps
its ratio has less saturation available than the same hue on light, and the gamut
boundary at high L is the neon the light chroma pass also refused. Worked in oklch.

**One surface relationship INVERTS on purpose.** On light `sunken` is *darker* than
the card; on dark it is *lighter*. It is the row hover fill, and a fill darker than
an already-dark card is invisible. `surface` stays raised relative to `bg` in both.

**`faint` is the tightest token in the system and it decided the dark surfaces.**
It has to clear 3:1 against the LIGHTEST dark surface and stay under 4.5 against
the DARKEST, so the window is bounded from both ends: 3.10 on sunken, 4.16 on bg.
Widening the gap between `bg` and `sunken` closes that window and no value passes.
**If a future pass wants more separation between the dark surfaces, this is the
token that says no.**

### The three tokens that could not simply be lifted

**`primary`: PMS 2767 is 1.16:1 on the dark card.** Navy *is* a dark colour; there
is no dark surface it can sit on and be seen. The dark value is the brand hue (259)
held exactly, lifted to a light steel.

That destroys an axis. On light, navy and the reserved `indigo` separate on
**lightness first** (14.18 vs 5.59) and saturation second. Lift navy and both are
light blues, so only the second axis is left — the one the light theme already
names, *"indigo is vivid, navy is nearly desaturated"*. Held at chroma 0.055
against indigo's 0.168.

**Honestly: the pair is dE 0.144 on dark against 0.271 on light.** Still nearly
twice the grid's worst pair, and the 3.1× chroma ratio is the same proportion light
runs (0.061 vs 0.185) — the same *kind* of separation at the same proportion,
thinner. A future pass tightening either token needs to know which theme has the
headroom.

**`on-primary` flips, white → `#09121f`.** The one token whose value depends on the
theme rather than surviving it: every solid fill is dark on light and light on dark,
so the text on one cannot be white in both. **Flipping ONE token retunes every chip
in `tones.ts`, all eight `text-on-primary` call sites and the checkbox's tick** —
which is the whole argument for the token existing rather than each site naming a
colour. Eight sites in `schedule.ts` *did* name one, and that is §12's bug.

**`later` takes NO chroma boost, unlike the other six.** Its light-theme 2.46× gain
existed to escape `muted`; on dark that pair measures 0.0926 *before* any boost,
because dark surfaces let a low-chroma slate read as blue unaided. Meanwhile the
boost has a new cost: at 1.30× it landed **dE 0.046** from the reserved indigo —
worse than either theme's worst pair, a fresh collision with the most reserved
colour in the system, bought to solve a problem that had gone away.

**And `needs-help` needed the same 4° hue shift the light chroma pass gave it, for
the same reason.** Held at H 296 it came out dE 0.0728 from dark indigo. Re-centred
to 300: 0.0875 against indigo, civic holding at 0.0770.

> **A hue collision lives in the hue corridor, not in the lightness.** Re-tuning for
> a second theme does not inherit the first theme's fix, and does not inherit its
> problems either. Each theme buys its own way out, and a chroma change is never a
> free move — check it against every RESERVED colour, in every theme.

**Grid separation:** worst dark pair **dE 0.0759** (`later`/`indigo`) against the
light grid's **0.0727** (`needs-help`/`indigo`). Marginally better overall, pairs
reshuffled. The one real loss is `muted`/`primary`, 0.2484 → 0.0964, which is the
navy lift's bill rather than the dot set's.

### Yellow: the measurement changed and the role did not

**The value does not move.** The only colour token identical in both themes — the
brand yellow is already light. What moves is what it measures:

| | card | page | sunken |
|---|---|---|---|
| light | 1.50 | 1.43 | 1.31 |
| dark | **10.98** | **12.16** | **9.06** |

On dark it clears the graphic bar by 3× and the text bar by 2×, everywhere. **The
role stays decoration-only anyway**, and the reason is no longer the ratio: a
meaning legible in one theme and 1.43:1 in the other needs a second carrier in that
theme, and *"the meaning has two colours depending on your OS"* is worse than a
flourish. The reservation was never really about the ratio; the ratio was what made
it obvious.

The light **ceilings** still enforce it — a promotion would have to be legible in
light to be worth making — and dark gets **floors** that pin the new fact, so a
future pass lightening the dark surfaces enough to drag yellow under 3:1 gets told.

**And the one legible pairing inverts outright.** On light, yellow works on navy
(9.45) and nowhere else. On dark, `primary` is a light steel, so yellow on it
collapses to **1.39** — worse than yellow on cream — while yellow on the dark
surface is 10.98. **A component drawing a yellow mark on a navy ground is correct
in light and invisible in dark.** The gate checks each theme's own pairing.

> **A pairing is not a property of two colours; it is a property of two colours in
> a theme.**

### Reserved colours

| Token | Reserved for |
|---|---|
| `indigo` | **"You are here" and nothing else** |
| `urgent` | Overdue and genuinely urgent only |
| `on-track` | Status only. Teal |
| `watch` / `needs-help` | Status only |
| `civic` / `later` | Categorical only, never status |

**`indigo` has three consumers, and they are all the same sentence.** "You are
here" in the navigation, `.thrive-arrived` (the ring on a row something has just
moved the student to), and the calendar's two markers: today's date in a week
column, and the "next up" item. Anything else wanting indigo has to make that
argument.

**`categoryDot` / `categoryTag` are the one place hues are used CATEGORICALLY**,
and they are exempt by construction: eleven calendar streams need more distinct
dots than the reserved palette supplies, which is why the categorical `civic` plum
and the neutral `later` slate exist. Every dot is paired with a written label in the
key and in every row, so no meaning there rests on colour alone. **Coral is
deliberately absent from that map** — a month grid dotted coral on every assignment
day would drain "overdue" of meaning, so assignments take amber.

**`on-track` is the only reserved colour whose MEANING has changed.** It moved off
green because green had become "an action you can take"; a blue chip beside a
**navy** button was that same collision, so it moved again, to teal.

**`muted` and `ink` are deliberately NOT tinted in either theme.** `muted` is the
colour of every piece of secondary text and `ink` is every heading; tinting either
would tint the whole interface to make two dots better.

### The light chroma pass, which the dark set was modelled on

Five status hues gained chroma and **not** lightness, because the month grid's dots
read muted and muddy and they are the only thing on that grid carrying stream
identity. **The constraint:** each is used as TEXT somewhere as well as as a fill
(see `tones.ts`), so each must clear 4.5:1 on card — vibrance could not come from
lightening them.

| Token | Before | After | Chroma | Card |
|---|---|---|---|---|
| `on-track` | `#14706b` | `#00716c` | 0.0803 → 0.0856 (1.07×) | 5.90 → 5.87 |
| `watch` | `#8f6220` | `#946000` | 0.0988 → 0.1137 (1.15×) | 5.34 → 5.34 |
| `needs-help` | `#6a5fb0` | `#7851c2` | 0.1240 → 0.1697 (1.37×) | 5.42 → 5.59 |
| `civic` | `#8a5f8f` | `#994ea3` | 0.0884 → 0.1497 (1.69×) | 5.10 → 5.29 |
| `later` | `#64748b` | `#4c74ad` | 0.0407 → 0.1001 (2.46×) | 4.76 → 4.76 |

**What it bought, honestly: very little for teal and amber**, already at the gamut
boundary for their lightness. That is a real limit rather than a tuning failure.
**The size change did more than the colour did** — the 8px dot is 1.8× the area of
the 6px one.

**The collision it fixed:** `later` and `muted` were the two least distinguishable
dots by a wide margin (dE 0.039) and between them carried FOUR of the eleven
categories. `muted` cannot move. `later` can, and nothing about "later" requires
grey.

### Surfaces, ink, lines

Ink has four steps and **only the first three may carry text**; `faint` is held
below 4.5:1 by a ceiling in **both** themes so words placed in it fail a check.

**A 1px decorative hairline and a 1.5px control boundary are different things,
carried by different tokens, and must never collapse.** Control boundaries owe 3:1
under WCAG 1.4.11 because the boundary is the only thing marking where the control
is. Only `.thrive-checkbox` and `--input` consume the 1.5px stroke.

**There is a third ring width, deliberately not either of those.**
`--thrive-arrival-ring: 2px` matches the focus ring, because both draw a ring
around something you have just arrived at and two ring weights would read as two
kinds of thing.

**Hairlines are not checked in either theme, and that is the point.** Nothing in
this direction depends on a line to be legible. On dark they are the only tokens
not derived from a ratio, because there is no ratio to hit — they sit ABOVE the
dark card for the same reason `sunken` does.

### `--thrive-scrim`, the one new token

`ItemDetail` drew its scrim as `bg-ink/20`, justified in a comment as "the ink
colour at low alpha, a use of the palette rather than a new entry in it". True
until ink stopped being dark: on dark that expression is a **20% white veil that
lightens the page it exists to recede**.

**A scrim is always a darkening, so it is the one colour that must not follow the
ink.** Alphas differ by measurement — 20% of ink on light, 60% black on dark, where
the dialog sits only 0.04 in lightness above the page behind it and the scrim has to
do more of the separating. Matching the light alpha on dark produces a dialog you
cannot find. The light arm is spelled as the same `color-mix(… 20%, transparent)`
that Tailwind's `/20` compiled to, so the light value is provably unchanged.

> **An alpha composite of a token inherits everything that token does, including
> flipping.** Before deriving one colour from another, ask whether the derived thing
> has a direction the source does not.

### The soft tints, and a guarantee that moved

**`color-mix()` on light, literal hexes on dark.** The asymmetry is honest rather
than tidy: a gate cannot evaluate a mix, and these tints carry text —
`bg-urgent-soft text-urgent` owes 4.5:1 and **nothing had ever measured it**. The
dark seven are measured (4.60–4.64). The light seven still are not, and the gate's
footer names them. **It is the light theme that has the unchecked colours, and it
always did.** Left as `color-mix` (owner, 2026-08-21): closing the gap means
literals in light, which moves light values, and that is not worth it.

**One property was lost and a gate replaced it.** The tints read
`color-mix(…, var(--thrive-urgent) 9%, white)`, and that `var()` is what made them
unable to drift from the base hue. A `light-dark()` cannot nest inside another, so
the light arm names the hex outright — and a repeated hex can fall out of step,
**silently**, since tint and hue would both still pass their own pairs and only
their *relationship* would be wrong. `check-contrast.py` now asserts each light mix
names the light arm of the token it claims to tint. **The guarantee moved from "by
construction" to "by gate"; it did not go.**

### Type: two faces, and the rule is tight now

**DM Sans for everything. JetBrains Mono for NUMBERS ONLY.**

The old rule ended "…and any label that is a system value", and almost any label can
be argued into that, so mono spread to eyebrows, view switchers, chips, stream names
and tags. A face used for a third of the interface is not an accent, it is a second
body font.

- **Mono keeps:** clock times, counts, unit totals, percentages, fractions, IDs —
  values a person *scans or compares*, where digits lining up is the point.
- **Mono loses:** anything made of words. A date in prose is words and takes DM
  Sans; the time inside it is a value and stays mono.
- **The test:** would you ever want this to line up in a column with the thing
  above it? Column → mono. Sentence → sans.

Expressed as two classes so a component asks for a **treatment**, not a font:
`.thrive-numeric` (mono + tabular figures) and `.thrive-eyebrow` (size, case,
tracking, weight). A component that writes `font-mono` fails `designSystem.spec.ts`.

**Weight is not in the type scale.** Set it at the call site or you get 400. Only
400/500/700 load, so `font-semibold` (600) synthesises — never use it.

### THE TYPE SCALE, and the four times it was raised as too large

**All nine steps are RESPONSIVE and all nine are raw `--thrive-text-*` tokens.**
Two overrides:

| Where | What it does |
|---|---|
| `@media (width >= 40rem)` | the top four steps shrink — a display-type decision |
| `@media (width >= 64rem)` | **all nine** shrink, plus the spacing step |

Source order is load-bearing: the 64rem block sits AFTER the 40rem block, so it
wins where both apply. Putting it earlier silently gives desktop the tablet's
headings, which happened once during the pass.

**Phone (below 40rem):** 12 / 13 / 14 / **16 body** / 18 / 22 / 27 / 34 / **40**, at
a 16px root. **Desktop (64rem+), at the 15px root:** 11.25 / 12 / 12.75 / **14.25
body** / 15.75 / 17.25 / 19.5 / 21.75 / **24**.

Graduated on purpose: the largest steps were the most oversized. `3xl / sm` went
2.00 → 1.68 — still unmistakably a title, and it stops shouting. Every step stays
strictly larger than the one below. Tracking on the top three steps only, plus
`.thrive-eyebrow`.

#### The four passes, and what each actually found

1. **The root was a real bug.** `--text-sm` — the body default — is `1rem`, so at a
   16px root the desk body was **16px, not the 15 the design was drawn for**, and a
   phone bump of 106.25% stacked on top to make **17px**. Every rem inherited it.
   Fixed at the root: **100% below 64rem, 93.75% at 64rem and up.**
2. **The top four steps were drawn for a 72rem page.** They render identically at
   1512 and 1920, so nothing was scaling with the viewport.
3. **Call-site rhythm.** Nav rail pitch 45 → 39.38px and a step of air out of six
   containers, all scoped to `lg`+.
4. **The whole desktop scale.** The first three passes had reported that the root
   computes to 15px and the spacing step to 3.75px, both true and neither an answer.

> **"The app renders too large" is usually not one knob.** Measure the two global
> ones, then stop looking for a global one. Reporting "the root is already correct"
> is more useful than finding something to adjust — but it is not a substitute for
> making it smaller when asked.

#### And one thing that had to be read out of the compiled CSS

The first attempt at (2) overrode `--text-3xl` in a media query and changed nothing:
**`@theme inline` BAKES a literal theme value into the utility** —
`.text-3xl{font-size:2.5rem}` — so there is no variable left at runtime. A theme
value that is itself a `var()` is inlined AS the reference. **Every responsive token
in this system exists because of that one mechanic**, including `--spacing`.

### Spacing, and why `--spacing` is not the lever it looks like

`--spacing: var(--thrive-spacing)`, **0.25rem on a phone and 0.225rem above
64rem** — a 4px step becomes 3.375px on desktop, and every `gap-*`, `p-*` and
`space-y-*` follows with no component touched.

**IT ALSO MOVES CONTROL HEIGHTS AND ICONS.** In Tailwind v4 `min-h-11` is
`calc(var(--spacing) * 11)`, so on desktop it is **37.13px**, not 44. `size-9` is
**30.375px** — which is the number `TopBar` spent a while claiming was 36 (§10).
`size-3.5` is 11.81px. All intended. **Neither would be acceptable on a phone, which
is why the block starts at 64rem.**

**Mobile is unchanged by both density passes, and it is measured rather than
claimed.** Phone document heights were byte-identical before and after each.

### The component classes

Ten, and each exists because Tailwind cannot express it at the call site:
`.thrive-numeric`, `.thrive-eyebrow`, `.thrive-panel`, `.thrive-row`,
`.thrive-checkbox`, `.thrive-strike`, `.thrive-card-body`, `.thrive-popover`,
`.thrive-arrived`, `.thrive-priority-label`.

**No new treatment since 7c**, and the dark theme added none — it needed a TOKEN
(`--thrive-scrim`), not a class, which is the same shape as the chat window needing
a height.

- **`.thrive-popover`** carries only a WIDTH:
  `min(--thrive-popover-width, 100vw - 2 * --thrive-popover-viewport-inset)`.
- **`.thrive-arrived`** is the arrival ring, and the only one applied from
  TypeScript — which is why `designSystem.spec.ts` scans `.ts` files too.
- **`.thrive-panel[data-tone="sunken"]`** is the recessed variant, used by the Ask
  THRIVE history rail. **On dark that reads as INSET rather than raised**, because
  `sunken` inverts — the separation is intact (1.15:1 light, 1.21:1 dark) and only
  the raised/recessed reading flips. Recorded at the call site rather than left as a
  comment that had gone false.
- **`.thrive-checkbox` did not grow for 6b.** A 17px box is below the 24px WCAG
  2.5.8 pointer target, so instead the row makes its **title** the checkbox's
  `<label>` and the tick target is the width of the row.

### The layout tokens, and why each is one

**Four separate questions, never solved with each other:**

| Token | Utility | Answers |
|---|---|---|
| `--container-page` (80rem) | `max-w-page` | how wide may a page get |
| `--thrive-page-gutter-x` (2.5rem) | `lg:px-page-x` | how far off the edges does it sit |
| `--container-measure` (68ch) | `max-w-measure` | how long may a LINE OF TEXT get |
| `--thrive-key-width` (11rem) | in a grid template | how wide is the calendar's Key |

**The gutter and the cap are two knobs and you need both.** 72rem left ~120px of
dead margin at 1512px, so it went to 96rem — and then the cap stopped biting at that
width, the gutter collapsed to 20px, and content ran to the edge.

**`--container-wide` (96rem) existed and was DELETED.** On a 1920px screen the
calendar was 1440px wide with a 127px gutter while every other route had 248px —
**the page with the most furniture had the least breathing room.** A route wanting
more re-adds its own token and declares it in the gate's cap loop.

**Put the line-length cap on the element that OWNS the text** — a full-width `<p>`
wrapping a capped `<span>` looks identical and is not the same thing.

### Four size tokens, and why each is a token

**`--thrive-checkbox-size: 17px`** — `.thrive-checkbox` sizes itself from it, and
any row rendering a **spacer** where a checkbox would go reaches for the same value
via `size-checkbox`. The calendar's `ItemRow` does, which is what makes a list of
classes and tickable tasks align in one column instead of two ragged ones.

**`--thrive-cal-dot: 8px`**, up from a hardcoded `size-1.5`. The dot and the row
that reserves its height have to agree, or the row clips **silently**. 8px was
measured: three dots plus two 2px gaps is 28px, the "+n" case is two dots and a
count in 36px, and the narrowest cell the grid draws is 38px at 320px.

**`--thrive-chat-height: 34rem`**, above `xl` only. A token for a different reason
from the others: **the number is what makes a layout work at all.** Without a
definite height the log's `flex-1 min-h-0` resolves to its own content, so the
document grows instead of the log scrolling and the composer walks off the bottom.
**Deliberately not applied below `xl`** — a 544px box inside an 812px screen gives a
student two nested scrollbars to fight.

> **A `min-h-0` chain makes a child ABLE to shrink. Something still has to give it a
> height to shrink within.**

**And `flex-1` on that panel is gated on `xl`**, the other half of the same lesson:
in the row it governs WIDTH, in the column below `xl` it governs HEIGHT and silently
beats the token beside it.

**`--thrive-key-width: 11rem`** is sized from its CONTENT — the longest stream row
is "appointment" at ~96px with its dot and padding, the widest view toggle is
"ignored events" with its count at ~110px. 165px clears both and the gate asserts it.

### Durations: motion versus dwell

Three motion tokens (120/160/260ms) are **transition lengths**.
`--thrive-arrival-duration: 1200ms`, the toast's 3000ms, the undo's 6000ms and the
live region's 4000ms are **dwells**. Different kinds of number, and they must not
share a token: reusing `--thrive-motion-slow` for the arrival mark would have tied
the fade's speed to how long the mark lasts.

The three dwells not in `app.css` live at their definitions because nothing in CSS
reads them. The arrival duration IS in `app.css` precisely because two things do:
`arrive.ts` reads it from the computed root style, and `check-interaction.mjs` reads
the same token.

### `transition-colors` includes `outline-color`, and that has two consequences

**One: a computed style read immediately after a state change is a reading of the
transition, not the value.** `getComputedStyle(chip).outlineColor` the instant focus
lands returns the *starting* colour and settles 120ms later. **Wait past the longest
transition on an element before reading a computed style.**

**Two: every focusable element carrying `transition-colors` has a focus ring that
FADES IN.** `Button.svelte` avoids it by enumerating
`transition-[background-color,color,border-color,opacity]` — an enumeration now
known to be load-bearing rather than fussy.

### A utility can lose to another utility

`leading-none` on `MiniCalendar`'s day number **loses** to the `text-*` utility's
own line-height, so the number's box is 18px rather than 12.75. Adding
`lg:leading-none` did not fix it either. **The cell is sized to the box the browser
actually produces** — a utility fight settled by stylesheet order is a worse thing
to depend on than a measured height.

### The one responsive shell token

`--thrive-topbar-height` is **56px on mobile, 48px above `lg`**, overridden in a
media query on the raw token rather than by a class. `SideRail` draws its brand band
at `h-topbar`, so the rail's edge and the bar's edge continue one line.

### `/swatch`

Renders every token, both border weights, the brand values with their PMS numbers,
the yellow constraint, and the two-face rule as a table of worked pairs. Throwaway;
delete before Release 1.

**Its swatches follow the theme; its printed hex values and ratios do not** — they
are literal text and every one describes the LIGHT theme. **It now says so on the
page**, because a page whose whole job is to be believed about colour should not
print "1.43:1 on cream" while rendering dark. Not otherwise updated: it is slated
for deletion and deliberately outside every maintenance pass (owner, 2026-08-21).

---

## 7. Dates: the rule the framework no longer enforces

**Components never see a raw timestamp.** Dates are classified and formatted on the
server inside `load` functions; components receive pre-formatted strings.

Full statement in `CONVENTIONS.md`. The short version:

- Read the clock in a `load` function. **Once.** Home's `+page.server.ts` calls
  `new Date()` a single time and every classification measures against it — two
  calls are two answers, and a task classified against 11:59:59 while the next line
  reads 12:00:00 is somehow both today and overdue. The calendar's load does the
  same and takes **three** values off that one instant: `todayKey`, `nowMinutes` and
  `nowISO`.
- **`describeDue(iso, now)` stays pure and keeps its `now` parameter.**
- **The narrowed exception:** anything the student can edit gets `nowISO` as a prop
  and re-runs the pure `describeDue` against it. The server still decides what "now"
  is; only the recomputation moved.
- **`dayKeyOf(value: Date | string)`** is the only place a local day key is built.
- **The week window is a date question and is answered on the server.** Each
  `EventRowData` carries a `thisWeek` boolean, not an ISO string the client compares.

**Nothing enforces this, and that is the point of writing it down.** In Next the
`"use client"` boundary enforced it at compile time. SvelteKit has no such wall: a
component can `import { describeDue }` and call it with no `now`, and the default
parameter is `new Date()`, so it compiles, renders something plausible, and is wrong
in another timezone. **Review is the enforcement.**

### The sanctioned client reads — and the calendar DECLINED one

1. **`nowMinutes()`** in `calendarSources.ts` — **still has no caller.** It was
   written for the "next up" line and the calendar reads the server's clock instead.
   **Why it was declined:** in Next, `CalendarView` was `"use client"`, so its memo
   could only run in a browser. The Svelte component renders on the SERVER first, so
   a `$derived` calling `nowMinutes()` would run during SSR — the server would paint
   one "next up" row and one ringed square, and the browser would silently replace
   both a beat after hydration. The value freezes at page load either way, so the
   client read costs a visible flip and buys nothing.
2. **`matchesWide()`** in the floating-panel geometry — listed, **not ported yet**.
3. **`TaskNotes`' autofocus gate** — `matchMedia('(hover: hover)')`. Opening the
   note panel is an explicit request to write, so focus lands in the field, but only
   where a keyboard will not cover the screen.
4. **`downloadIcs`** reads `new Date()` for the `.ics` file's `DTSTAMP`. It is inside
   a click handler, can never run on the server, and **the pure builder takes the
   instant as an argument** precisely so the whole thing stays testable.

**Phases 8 and 9 added none, and nothing since has either — including the theme.**
The toggle reads no clock. `/ask` renders a timestamp on every message and
**`ConversationView` carries no ISO field at all**; `ask.spec.ts` asserts that
absence. Where a phase can reach that shape it should, because it is a property
rather than a discipline.

**Read (3) against the deleted `hoverIntent`, because they look identical and are
not.** `hoverIntent` read `(hover: hover)` to gate hover-to-*reveal*, which is CSS.
`TaskNotes` decides whether to move **focus**, and there is no CSS form of that.
That is the whole test: *could CSS have done this?*

**A `Date.now()` used as an id nonce is not a clock read.** `quickList.ts`,
`mintTaskId` and `calendarAdd.ts`'s `own-${Date.now()}` all use one; none is parsed
back into a day. **Phase 9's chat composer does not even need one** — a plain
incrementing counter.

### A viewport question that CSS can answer belongs in CSS

The week-to-agenda fallback (§14) is **two media-gated wrappers**, not a
`matchMedia` read. Three reasons in order of weight: CSS has an exact equivalent so
the JS form buys nothing; a `matchMedia` read has to GUESS during SSR, so one width
of student watches the wrong view paint and be replaced after hydration; and the cost
is only that both subtrees build, which is cheap.

**The Key's two arrangements follow the same rule.** **And so does the theme, which
is the strongest instance yet** — the default is `prefers-color-scheme` resolved by
the browser in CSS, so there is no width-or-preference guess to make during SSR at
all. See §8.

**Pick the breakpoint by measuring, not by naming a size.** 40rem was built first
for the week fallback because that is the number MIGRATION and the Next comment both
use. Measured, it gave 71px columns — correctly clamped and still not readable — so
it moved to 48rem and 89px. **"Fits" and "is legible" are different bars.** And the
knob is always the breakpoint: a min-width would put back the horizontal scroll the
fallback exists to remove.

### The accepted client-side formats

Locale-formatting differences, never date drift. Every one formats a day key already
built from local parts.

| Where | Why it cannot move to the server |
|---|---|
| The calendar's day heading | The day is chosen in the browser |
| The agenda's group headings | The range is walked client-side |
| `taskToItem` / `todoToItem`'s `timeLabel` | Their source rows are `localStorage`-only |
| `MiniCalendar`'s month label and each day cell's accessible date | The grid pages to ANY month with no round trip, so there is no finite set a `load` could pre-format |
| `WeekView`'s weekday abbreviations | The week is chosen client-side |
| The agenda's per-row date | The thirty-day range is walked client-side |
| `customEventToItem`'s `timeLabel` | `localStorage`-only, and it stores a wall clock |
| `MyDayPane`'s day heading | The clickable month can point that pane at ANY day |

**`BookingPanel` was briefly on this list and came off.** The chip strip carries
every day's finished labels from the server, so the panel takes a PROP.

**Nothing from Phase 9 is on this list, and nothing since.**

### `describeDue` has four states, not three

`DueDescriptor` is a **discriminated union**: `overdue | today | upcoming` plus
`unknown` for a date that will not parse, carrying `days: null` rather than `NaN`.
**`NaN` is a `number` to the type system** and flows silently into `a.days - b.days`;
`null` does not typecheck there, so a caller must narrow.

**`unknown` is deliberately NOT in `DueUrgency`** — "how urgent is it" has no answer
for a date that does not exist.

**Where an unknown row goes is decided:** its own group, **first in the list**,
headed "Needs a date". Loud is correct, invisible is not. It is not tinted `urgent`:
that tone is reserved for real deadlines, and a missing date is a data problem.

Two consequences, one found per phase. **In 6a:** four undated rows fill the
collapsed slice and push the overdue task off screen; `reveal.spec.ts` pins that
path. **In 6b: making those rows visible made a latent crash certain** — every date
converter read `new Date(fromISO).getHours()`, `NaN` for an unparseable date, and
`Invalid Date.toISOString()` **throws a RangeError**. All three now guard it via one
`clockFrom` helper.

> **When you make a previously invisible state visible, audit every path that state
> can now reach.**

### The timezone sweep is part of the definition of green

Seven zones from UTC+14 to UTC−11, including Australia/Lord_Howe's 30-minute DST
offset. **Run it after touching anything date-shaped**, and it has caught two real
failures. **Re-run this pass** — 694 tests green in all seven — because "nothing here
touches a date" is a prediction and this file is not for predictions.

The second failure, in 7a, is the instructive one. `reveal.spec.ts` had `NOW` as a
`Z` instant with `Z` due dates beside it — the exact shape TESTING.md forbids two
paragraphs above the sweep command. `tsk-today` at `2026-08-21T23:00:00Z` is already
*tomorrow* anywhere east of UTC+2, so a property counted one row instead of two. Red
in three zones, green in the other four including both extremes.

**The bug was the FIXTURE, not `describeDue`.** A task due at 23:00 local on the 21st
really is due today. Reaching for the classifier would have broken correct behaviour
to make a wrong test pass. And the file had never been swept: TESTING.md claimed the
suite was green in all seven zones and it was not, because that line was written
before that test was. **A verification claim decays exactly like a comment does.**

**`fixtureConsistency.spec.ts` follows the rule** — its `NOW` is
`new Date(2026, 7, 21)`, local parts, and it passes in all seven zones.

---

## 8. The persistence layer

`frontend/src/lib/overrideStore.svelte.ts` is the one mechanism. **15**
`localStorage` keys sit on it, plus `taskNotes` and `toast`.

**This is browser state, and a different thing from the three server-side mock
stores in §12.** Same word, opposite properties: this one is per-student and
survives a restart; those are shared by everyone and do not.

**And it is the layer that runs out first.** Everything persisted so far is one
student's private view of their own data, which is exactly what `localStorage` is
for.

**Phase 9 is where it ran out, and the answer was not to stretch it.** Saved chat
history is too large, grows without bound, and — the deciding argument — a student
opening THRIVE on a second laptop would find an empty history *indistinguishable
from never having asked anything*. A history complete on one machine and empty on
another is not a smaller feature, it is a misleading one. So conversations are
provider data from the start (§12), and a message sent before the backend exists
lives in component state that is gone on navigation, with the page saying so BEFORE
anything is typed.

`check:interaction` asserts sending writes **no** `localStorage` key. That assertion
is what stops the constraint eroding, because eroding it would be one convenient
line.

Group Projects, still queued in §18, is the same wall for a different reason: shared
between people by definition.

### Four properties that must survive

1. **Overrides keyed by id, never the whole truth.** `undefined` means "never
   touched, use the source value". A bare set of done-ids cannot express *"I unticked
   something that ships as done"*.
2. **Empty on the server, real after mount.**
3. **Corrupt input cannot take the page down.**
4. **A write matching the source value forgets the override.**

All four pinned by tests. **Hydration is one explicit `hydrateStores()`** in the root
`+layout.svelte` inside `$effect`, and nowhere else. Storage presence, not
`$app/environment`, decides browser-vs-server — which keeps the whole layer testable
in Node with no jsdom.

**Property 2 is visible on the calendar and is correct there.** `mergedSchedule`
reads nine stores, all empty until `hydrateStores()` runs, so the server and the
first client render both show "no personal items" and the student's own tasks,
to-dos and custom events land on the render after mount. A saved filter appearing a
beat after load is the same property and is expected.

### The theme is the fifteenth key, and its default is an ABSENCE

`theme.ts`, on `createOverrideStore` under one fixed key (`thrive:theme`) — the same
compromise `calendarPrefs.ts` and `floatingPanel.ts` make: this is UI state rather
than an override over provider truth, but that module is the single persistence
mechanism and one seam to change later beats two. Three states:
`system | light | dark`, defaulting to `system`.

**`system` is stored as the absence of an override, not as the string.**
`setTheme('system')` passes `undefined`, which is **property 4** — a write matching
the source value forgets the override. So a student who cycles all the way round
leaves no key behind, and the persisted state of the default is identical to a fresh
browser's. It also emits **no `data-theme` attribute**, because absence is what
`app.css` reads as "follow the OS" — and that is the same markup the server already
sends, so the default state needs no DOM change at all and cannot be got wrong by
arriving late.

**`system` has to be a reachable state rather than an initial one**, because a
student who tries dark and wants to go back needs somewhere to go back TO — and
"back" is not "light", it is "whatever my machine says", which may change at sunset.

#### The first paint, and why there is no script in the head

The server cannot know a student's theme. The usual fix is a **blocking inline
script** in `<head>` that reads storage and stamps a class before the first paint.
That is a SECOND hydration strategy, and this app has one — strategy A, "empty on the
server, real after mount", stated in the root layout and in `overrideStore`. Adding a
blocking read would mean two different answers to the same question in one codebase,
and the theme is not the thing worth making that exception for.

**So the default is expressed in CSS instead of in JavaScript.**
`color-scheme: light dark` on `:root` plus `light-dark()` tokens means the browser
resolves `prefers-color-scheme` itself, before the first paint, with nothing in the
path.

- A student on `system` — the default, the state with no stored key — gets the
  **correct first paint.** No flash, and no script needed to avoid one.
- A student who explicitly chose the theme their OS is *not* set to sees **one
  frame** of the other theme before `hydrateStores()` runs.

That is strategy A's existing cost on one more preference, paid by the subset who
opted out of the default — smaller than the flash the script would remove, and by
fewer people, so the exception is not worth its precedent. **It is a real flash and a
student who picks light on a dark machine will see it.**

`check:interaction` proves the mechanism by driving the page with **JavaScript
disabled**: if an OS-dark browser paints dark with no JS at all, no JS was ever
needed, so there is nothing for a flash to happen during. Timing a screenshot would
be flaky and would prove nothing.

**Two effects in the root layout, not one**, and they want different dependencies.
`hydrateStores()` is a one-shot that must not re-run; `applyTheme(theme())` has to
re-run every time the choice changes. Merging them would either re-hydrate on every
toggle or freeze the attribute at its mount value, and both are silent. Effect
ordering is not relied on: if the theme effect runs first it reads `system`, writes
no attribute, and the CSS is already doing exactly that.

**`applyTheme` writes both `theme-color` meta tags** rather than adding a third
unscoped one. `app.html` carries one tag per `prefers-color-scheme` so the browser
chrome is right with no JavaScript; an explicit choice contradicts that key, and a
tag with no `media` always matches, so a third would win over the pair and break the
no-JS default. The colour is **read off the page** — `getComputedStyle(body)` after
the attribute is set — so there is no hex in a `.ts` to fall out of step with
`app.css`, and the `system` case works without either branch naming a colour.

**Theme preference belongs on the user record once accounts exist** — `BACKEND.md`
carries the note, including that `absent` must mean "system" and never "light". It is
a weaker case than chat history's and is recorded as a decision to be *made* then
rather than a defect: a display preference is arguably per-device on purpose.

### Resolve overrides ONCE per page, not once per consumer

Home has two things reading the same task list: the stat pills and the Tasks card.
`+page.svelte` calls `resolveRows` and hands the same array to both. If the card
resolved its own, moving a due date would restyle the list while the coral pill above
it went on counting the server's stale `due.urgency`.

**The calendar's form of the same rule is "one filter, applied once"** — see §14.

### Three key spaces, never merge them — and BOTH defects are now closed

| Space | Module | Keyed on |
|---|---|---|
| Task id | `userEdits.svelte.ts` (6 of its 7 stores) | the task's own id |
| Calendar item id | `calendarItems.ts` | `asg-12`, `apt-3`, `task-7`, `todo-x`, `custom-…`, `evt-evt-3-1` |
| Raw `Event.id` | `ignoredEvents.ts` **and `thrive:event-joins`** | `evt-3-1` — **stored verbatim** |

**Still three spaces, not four.** The test for whether a new store needs a new one
is: *is this a fact about the EVENT, or about the ROW?* A join and an ignore are facts
about an event. A label and an urgent flag are facts about a row.

**The theme store introduced no key space**, which is worth stating because the count
has bitten this project twice. It is keyed on the literal string `"value"` — the same
single-key compromise `calendarPrefs` and `floatingPanel` make — and keys nothing
about the student's data at all. **The rule the count tracks is *persisted browser key
spaces*, and the count is still three.**

**Defect one, fixed in 7a: the ignore store.** `eventIdOf` strips exactly one leading
`evt-`. Given a calendar item id (`evt-evt-3-1`) that recovers the raw id. Given a
RAW id — which begins with `evt-` too — it *mangles* it to `3-1`. And **the store was
normalising its own arguments**, so Home's write to `evt-3-1` landed under `3-1`
while the calendar's landed under `evt-3-1`. Each surface self-consistent, neither
able to see the other.

**The fix is that the store normalises NOTHING it is handed.** It keys on precisely
the string given, and the one surface holding a prefixed id calls `eventIdOf` once at
its own boundary. `filterSchedule` was always in the raw space, so **Home was the
broken side**, and no Home component changed.

**Defect two, fixed in 7c: `thrive:event-joins`.** The same bug in a second store,
invisible because the store had exactly one consumer — and one consumer is
self-consistent under any key space at all.

**`eventIdOf`'s doc comment used to claim "passing a raw id through twice is safe".**
That false sentence is why the bug was written twice, and it is gone.

**Old keys are inert, not migrated** (owner, both times). An event ignored before the
fix is asked about once more. Absence means "never touched", so a stale key is
harmless rather than corrupt, and a migration shim whose only input is a browser
nobody can inspect is worse than the one-time reappearance.

**Student-created task ids are prefixed `own-`** so they cannot collide with a
fixture's. `removeAddedTask` clears the five sibling overrides too, and
`deleteCustomEvent` does the same for a custom event's label and urgent.

### How to test a key space, because the obvious way does not work

**Pin the STORED KEY. Never round-trip.**

A store that mangles on write and mangles identically on read is perfectly
self-consistent about a key nothing else uses. That is what 7a's bug was, and two
round-trip tests passed the whole time it was broken.

So a key-space test must not share a transformation with the code:

- read the string straight out of the fake `localStorage` and compare it to a
  hard-coded literal, **or**
- write through one surface's real path and read through the other's, with the
  reading side's id hard-coded rather than derived.

Then break it on purpose and count the reds. `calendarEvents.spec.ts` goes **7 red**
with `eventId = item.id` reinstated.

**The theme store follows it in both directions**, which is the cleanest instance in
the repo: `theme.spec.ts` asserts the stored string is exactly `{"value":"dark"}`,
and `check:interaction` reads that same literal out of a real browser. **Both sides
hardcode it on purpose, so the two cannot agree by sharing a transformation.**

**And a unit test still cannot prove the two SURFACES share it**, because it renders
neither. That half is `check:interaction`.

### What is deliberately NOT persisted

Card collapse state, and the reveal channel that can drive it (§13). Also: the drag
in progress, the open editor, the note draft before it commits, the live-region
sentence, **the detail dialog's open item and its delete-confirmation step**, the
calendar's `selectedKey` / `monthKey`, whether the Key's panel is open below `xl`,
and which term on the program strip is expanded — all momentary places, not
preferences. **The calendar's FILTER is persisted**, through `calendarPrefs`, because
a filter that resets on every navigation is a filter nobody uses twice. **And so is
the theme**, for the same reason one level up.

### `.svelte.ts` is not decoration

Svelte only processes runes in `.svelte.js` / `.svelte.ts`. A plain `.ts` with
`$state` is **silently inert**. Six files carry the suffix: `overrideStore`,
`userEdits`, `taskNotes`, `toast`, `ignoreUndo`, `reveal`.

**And the suffix is a claim, so it has to be true in the other direction too.**
`arrive.ts` is DOM code with no runes and is a plain `.ts` for exactly that reason.
**`theme.ts` is the newest instance** — it holds a store built elsewhere and a DOM
function, and no runes of its own, so it is a plain `.ts` like `calendarPrefs.ts`.
**Still six rune files.**

---

## 9. React-isms deliberately dropped

Each because the constraint behind it does not exist in Svelte. Recorded so nobody
reintroduces them thinking they were an oversight.

| Dropped | Why it existed in React |
|---|---|
| `useCalendarPrefs`'s `useMemo` | A fresh object per render busted every downstream memo |
| The frozen shared `EMPTY` | `getServerSnapshot()` had to return the *same object* |
| `useMergedSchedule`'s 9-dependency `useMemo` | Hooks cannot know their own dependencies |
| `useCallback` on `isDone` / `resolve` | Referential stability for memoizing callers |
| `useEffect` timer cleanup | A module singleton has no unmount |
| The `use*` prefix on every reader | Signalled call-order rules that do not apply |
| `useFloatingGeometry`'s ref-into-a-hook | A React Compiler render-phase rule; `bind:this` removes it |
| `useState` + `useRef` for the More sheet | Moot — the sheet is gone (§11) |
| `useTaskBoard`'s two `useMemo`s and three `useCallback`s | Deriveds recompute on read |
| `TaskNotes`' `latest` ref + syncing `useEffect` | `onDestroy` reads the draft directly |
| `MiniCalendar`'s `gridRef` + `requestAnimationFrame` | `bind:this` plus `await tick()` is the flush, not a guess |
| `CalendarView`'s five `useMemo`s | Filter, labels, next-up, squares, day groups all recompute on read |
| `ItemDetail`'s two `useEffect`s and a `useRef` | All three are **one action** here — `focusTrap` plus `escapeKey`, whose lifetimes ARE the element's |
| `AddItemForm`'s three `useId()`s | Only one add form is ever mounted |

**Two collapses were requested and made:** `localDayKey(iso)` folded into
`dayKeyOf(value: Date | string)`, and `CalendarView`'s
`view === "agenda" ? <Agenda/> : <dayPanel/>` became a **snippet** rendered by two
branches — the ternary read as "agenda is the odd one out" and hid that the day panel
is shared by month and week.

**One hook was split rather than translated.** `useTaskBoard` did resolution,
grouping, counting and mutation in one place; here grouping and counting are
`homeGroups.ts` and resolution plus the date arithmetic are `taskBoard.ts`.

**Hooks that became module singletons:** `useTaskToggle` → `taskToggle`,
`useIgnoreEvents` → `ignoreEvents`. One undo slot app-wide rather than one per
calling component. **The reveal channel is deliberately NOT one** — see §13.

**`onDestroy` is not a `useEffect` teardown, and 6b needed the difference.**
`TaskNotes` commits its draft on destroy; written as an `$effect` returning a cleanup
it would commit on every keystroke.

### A prop is a getter, and 7c learned that the hard way

**In Svelte 5 a prop is a getter over the parent's state, so its declared type has a
lifetime.** `ItemDetail` declares `item: ScheduleItem`, and that is true of the
VALUE. Closing writes `null` into `CalendarView.detail`; the `{#if}` tears the
subtree down a tick later. In between, the getter returns null while the component's
handlers still exist.

It threw, in production, on an ordinary dismissal: closing with focus in the label
field fired the input's `onblur` **during teardown**, `commitLabel` read `item.id`,
and the page logged `Cannot read properties of null (reading 'id')`.

**The remedy is to latch the value at mount** — `const row = untrack(() => item)` —
which fixes the whole class rather than one handler, and states the assumption out
loud. It is only correct when the prop genuinely cannot change for the instance's
lifetime, and that has to be arguable. Where a prop really does change, guard the
handler instead.

Same family as 6b's `derived_inert` — a `dragend` on a row a drop destroyed. Both are
"the DOM outlives the state for one tick".

### And a `$derived` body is still ordinary block-scoped TypeScript

Reading a `const` declared LATER in the same script fails to compile even though the
read only happens at runtime. Declaration order in a `<script>` is not a suggestion.

---

## 10. The shell

`frontend/src/lib/components/shell/` — `AppShell`, `SideRail`, `TopBar`,
`BottomNav`, **`ThemeToggle`**.

- **`nav.ts` is the single source** for the rail and the bottom bar, and it is a
  TREE: the `/ask` item carries `children`. `flattenNav` is what keeps it single —
  `allNav` and `isBuiltRoute` are DERIVED from the tree, so a child cannot exist in
  the rail and be missing from the lookup. `PagePlaceholder` resolves its own `href`
  against `allNav` and **throws** when there is no match.
- **The top bar is 48px above `lg`, 56px below.** The CONTROLS change size and the
  bar's height follows from them: **44px on touch, 30.375px above `lg`.**
- **`--thrive-page-gutter-bottom`** is the page's bottom breathing room, used twice:
  on mobile added to the bottom nav's height, and above `lg` it is the whole padding.
- **Icons are component references held as values.** Not `<svelte:component>`,
  deprecated in Svelte 5.
- **A nav item with `children` is a DISCLOSURE**, and the rail owes it the whole
  contract: the link navigates, a SEPARATE button carries `aria-expanded` and
  `aria-controls`, collapsing REMOVES the children from the DOM rather than hiding
  them, the group opens itself when a child is current, and `aria-current` lands on
  the child only. A parent whose child is current takes full ink rather than the solid
  fill — prefix matching would otherwise paint two rows as "here".
- **Rail rows are `min-h-11`, which is 37.13px on desktop** after the density pass,
  and the rail only ever renders at `lg`+ so that is the only value it has.
- **Accessibility:** skip link, `main` landmark with `tabindex="-1"`,
  `aria-current="page"` on the active item, and **one `nav` landmark per purpose**.
- **`Toast` is mounted here**, once, for every route.

### THE BAR'S CONTROL SIZE, and a comment that was wrong for several passes

**30.375px above `lg`, not 36px.** `lg:size-9` is `calc(var(--spacing) * 9)`, and the
desktop density pass took `--thrive-spacing` to 0.225rem at a 93.75% root, so 9 ×
3.375px is 30.375px. **`TopBar`'s own comment claimed 36px** and nobody re-measured
the bar after that pass; §16's "36px floor" was a house preference stated in the same
breath.

It surfaced because the theme toggle's new gate assertion asked for 36px **on the
strength of that comment** and failed — and the bell beside it, with a byte-identical
class string, would have failed too.

**Resolved: the density is deliberate, the controls are NOT growing, and the comment
was the thing that was wrong** (owner, 2026-08-21). 30.375px clears WCAG 2.5.8's 24px
comfortably. The gate no longer reads a number out of any comment: it measures the
toggle **against the bell beside it** — the property that survives a density change,
that the three controls in this bar match — plus the standard that actually applies.

> **A comment stating a measurement is a verification claim and decays like one.** And
> when a new assertion fails, check whether it describes the NEIGHBOURS too before
> changing anything.

### The theme toggle lives here, not on `/settings`

One button, cycling `system → light → dark`, beside the bell. On every route because
the bar is.

**Why one button rather than three.** A three-state segmented control shows all its
options at once, which is the better affordance, and it does not fit: at 375px the
bar already holds a wordmark, a term, a bell and an avatar, and three 44px touch
targets is another ~132px. Measured against the existing bar rather than guessed at.
Duplicating the control per breakpoint is what the shell explicitly does not do.

**What a cycling button owes, since its next state is not visible:** the label says
BOTH halves — *"Theme: light. Switch to dark."* A cycling control whose label names
only its current state leaves a screen-reader user pressing to find out; one that
names only its action leaves them unable to ask. **The icon is the current state,
never the action** — a sun meaning "press for light" and a sun meaning "you are in
light" cannot both be right.

**No `aria-live`.** The button's own accessible name changes when pressed, and a
focused control renaming itself is already announced; a live region would say it
twice.

**`/settings` is still parked** (§11), and the theme control going to the bar rather
than to that page is why it stays parked rather than becoming the first real
preferences surface.

### The `nav` landmark rule, as it actually settled

`SideRail` and `BottomNav` both carry `aria-label="Primary"`. That is CORRECT:
whichever is displayed IS the primary navigation, and they are never displayed
together. But **both are in the DOM at every width**, which is not the same thing — a
gate scoping by that label matched both and counted one `aria-current` twice, which
is why they now carry `data-nav="rail"` / `data-nav="bottom"` hooks.

`/ask` has up to three `nav` landmarks, each named and each with one purpose: the
primary rail, the destination band (`lg:hidden`), and the conversation history. Never
two with the same name in the tree at once.

> **`display: none` is out of the a11y tree and the tab order, and IN
> `querySelectorAll`.** That one sentence explains the duplicate-landmark bug, and it
> is why the calendar's Key gate asserts VISIBILITY rather than presence.

### The app-wide toast

`toast.svelte.ts` shipped in Phase 3b with six tests and **no consumer**. 6b's
copy-to-quick-list was the first caller and would have been the worst possible one to
leave unrendered: the floating quick list is feature-flagged off, so the copy had no
visible destination either.

`role="status"` rather than `alert`: a confirmation is not urgent and must not
interrupt a screen reader. The region is **mounted always** and only its text
changes, because a live region created and populated in the same tick announces
unreliably. `pointer-events-none` so a confirmation can never swallow a press.

**7c gave it three live callers**, so it is no longer flag-dependent.

### The three actions

`frontend/src/lib/actions/` — `escapeKey`, `clickOutside`, **`focusTrap`**. Svelte
actions rather than translated `useEffect`s, and the shared shape is that **the
listener's lifetime is the element's**.

`clickOutside` takes `alsoInside` because a disclosure's own trigger is not inside its
panel but *is* inside its widget. Without it, pressing the trigger to close fires the
dismissal, the panel unmounts, and the trigger's own click reopens it.

**`focusTrap` is one action for three obligations, and that is deliberate.** Move
focus in, keep it in, put it back. The first and third are two halves of a single fact
— the element focused at mount is the element that gets it back at destroy.

It does **not** close anything and does **not** decide what a dialog is. It also does
not make the rest of the document `inert`, which would mean an action reaching outside
its own node. **Its focusable set is queried LIVE on every Tab**, because
`ItemDetail`'s delete control replaces itself with a two-button confirmation while the
trap is up.

**The same shape, one level up.** `TasksCard` clears its drag state from a `document`
`dragend` listener inside an `$effect` keyed on `drag !== null` — not an action,
because no element's lifetime matches.

**`hoverIntent` existed and was deleted**, same day. See §16.

### Feature flags

`FEATURES.floatingTodo` and `FEATURES.floatingAssistant`, both `false`. Mount points
exist in `AppShell`, gated.

**`floatingTodo` gates a second thing: the task row's copy-to-list control.** The
quick list is the only surface where a copied item is visible, so with the flag off
the copy succeeded, persisted, and showed the student nothing.

**A flag that gates a destination should gate the routes INTO it.**

**The calendar sharpens that twice over.** The quick list's *items* surface somewhere
the flag does not gate: the agenda renders undated to-dos, which are `QuickItem`s, and
they are tickable there. **And 7c's add form can now CREATE one.** Deliberate on both
counts, but it means the store has two visible consumers and a writer while its panel
does not exist.

**The theme is not behind a flag**, and that was never considered — a preference with
no default worth hiding is not a feature to gate.

---

## 11. Routes and navigation

13 routes plus two nested under `/ask`. **Four destinations are in the navigation:**
Home, Calendar, Appointments, Ask THRIVE — in that order. **All four are built.**

Ask THRIVE's three subjects are `children` of its nav item — real routes
(`/ask/resources`, `/ask/courses`, `/ask/career`) with their own hrefs, labels, icons
and descriptions, rendered as a rail disclosure. `/ask` itself redirects to the first.

Nine of the previous eleven destinations were placeholders, and a nav that is
four-fifths stubs reads as broken rather than unfinished.

**A fifth nav item is coming.** Group Projects (§18) will be the first addition since
the trim to four — and the first time the four-slot bottom bar has to hold five things.

### Parked, not deleted

`/classes`, `/syllabi`, `/assignments`, `/degree`, `/events`, `/career`, `/resources`
and **`/settings`** live in `parkedNav` — a list **no surface renders**. The routes,
files, icons and descriptions are intact and reachable by URL; the only thing removed
is the way in.

**Why a separate list rather than a `hidden` flag:** a flag needs every surface to
remember to filter on it, and the failure mode of forgetting is a parked item silently
reappearing in one place.

**`allNav`** is the lookup list — visible plus parked. `PagePlaceholder` resolves
against it, so parking a route does not start it throwing.

**Settings is parked and stays parked** (confirmed), **including after the theme
landed** — the toggle went to the top bar (§10) rather than becoming the first reason
to build a preferences page. It was also the reason the mobile **More sheet** could go.

**Two parked routes share a NAME with an Ask THRIVE destination and are not the same
thing.** `/resources` and `/career` are parked stubs; `/ask/resources` and
`/ask/career` are built chat surfaces.

**Note what this means for `/degree`.** It is parked, so `DegreeProgress.coreDone`,
`coreRequired`, `electiveDone`, `electiveRequired` and `gaps` **render nowhere today**
— only `unitsCompleted` and `unitsRequired` reach a screen, through Home's greeting
panel. That is exactly how four of those fields came to describe a different student
(§12).

### A card links out only when its destination is built

`isBuiltRoute(href)` asks `primaryNav`, and `SectionCard` renders its "View all" only
when the answer is yes. **`primaryNav` membership IS the definition** of a real
destination, so moving a route out of `parkedNav` restores every card's link with no
further edit.

Decided in `SectionCard` rather than per card: four cards link out and three pointed
at parked routes, so the alternative was four places to forget.

**Which cards lost their link:** Tasks (`/assignments`), My Classes (`/classes`),
Upcoming Events (`/events`). Today's classes keeps `/calendar`.

**`isBuiltRoute` is flattened**, so a nested destination counts as built.
**`isKnownRoute` is the companion**, separating a parked route from a mistyped one.
`SectionCard` warns in development on an href in neither list — a warning and not a
throw, because taking Home down over a "View all" would be worse than the missing link.

**`/classes` will not be built, and its card stays link-less indefinitely** (owner,
settled — do not revisit). The card IS the feature.

**`/assignments` is parked and is the next real consumer of a 6b component.** It
renders the same `TaskRow` with no `reorder` prop, and **owes that row a
`role="list"` container**.

`pageTitle()` in `lib/title.ts` reproduces Next's `"%s · THRIVE"` template.

---

## 12. The data layer

`frontend/src/lib/data/` — 23 files. **This is the seam.** `BACKEND.md` is the
contract written out for whoever implements it.

**Built against mock fixtures.** No HTTP client, no API layer, no Django
integration. Django replaces the provider *bodies* later; the signatures are the
contract and do not move.

### The public surface

`data/index.ts` re-exports exactly three modules: `types`, `providers` (**28**
functions + `SlotUnavailableError`), and `labels`. **`mock/` and `latency` are
private** — a component that needs something from either has found a gap in the
provider surface. Widen the surface, do not reach through it.

### Four properties, each pinned by a test

1. **Every provider returns a `Promise`.**
2. **Every provider returns copies.** *The copies are shallow*, as in the
   prototype — see §18.
3. **Deterministic generation. Never `Math.random()`**, which desynchronises server
   from client. A test scans the whole directory.
4. **Fixtures dated relative to now**, so a demo never looks stale.

### The three module-level stores

`mock/appointments.ts`, `mock/requests.ts`, `mock/resume.ts`. Lazy seeding, because
their dates are relative to "now" and module load may be hours earlier.

**The id generators count independently of the seeds.** They work only because
somebody numbered the request seed `req-000` by hand and set the resume counter to 4.
Commented at the generator, and pinned by a test.

### THE COURSE DATA, which is two fixtures and two types

| | `Course` / `mock/courses.ts` | `CatalogueCourse` / `mock/catalogue.ts` |
|---|---|---|
| What it is | a course the student is TAKING | a course in the CATALOGUE |
| Rows | 3 (Summer 2026) | 12 (four terms) |
| Has | meeting times, progress, standing, next assignment, grade, `syllabusId` | code, title, instructor, term, requirement, units |
| Provider | `getCourses()` | reached through `getSuggestedCourses(term)` |

**Two shapes because a course in a term that has not happened has none of those
fields.** Serving `progress: 0`, `standing: "onTrack"` and an empty schedule for a
Spring 2027 listing would put four fields on screen that mean nothing and read as
real. `getCourses()` therefore returns **three rows, not twelve**.

**The catalogue is the real MSBA one.** Course numbers, titles and instructors are
transcribed verbatim; the source runs Summer 2025 → Spring 2026 and every term here
is that plus one year. **The app's timeline was not moved to match** — it is computed
from `programStart` and a track, and moving it would move the current phase, the
percentage and the finish term.

```
Summer 2026   MGTA464 Perols · MGTA403 Nijs · MGTA451 Buti/Shin/Wilbur
Fall 2026     MGTA453 August · MGTA461 McAuley · MGTA452 Hansen
Winter 2027   MGTA402 Salovey · MGTA455 Nijs · MGTA444 Peterson
Spring 2027   MGTA454 (no instructor) · MGT449 Nijs/Teixeira · MGTA495 Yavorsky
```

**The grouping was inferred once and was wrong.** The list arrived without terms, so
it was split three-per-term in the order given. The real sequence is not an even
split, and the shape is the tell: **Summer holds ONE core course, Fall holds TWO.**

**Two things about the codes.** `MGT449` is cross-listed and is **not** an `MGTA`
code — anything parsing a prefix off a course code is wrong about that row, and a test
pins it. And `MGTA454`, the capstone, has **no instructor**; the field is optional and
the UI writes "Instructor to be announced" itself.

**`units: 4` on all twelve is a PLACEHOLDER** and did not come from the real
catalogue. **It is no longer true that nothing depends on it** — as of this pass the
degree audit's `unitsRequired` is derived from it (48 = 12 × 4), so correcting these
means re-deriving that. Flagged in both files.

### `CourseRequirement`, and why it is not a boolean

```ts
type CourseRequirement = "core" | "elective";   // required on both shapes
```

**Core is FIVE: MGTA451, 452, 453, 454, 455.** It was four for one commit, missing
451.

Not `isCore`, for the same reason `origin` is not `isFromCanvas`. It is a
classification with obvious room to grow, and it has two consumers that need it for
different reasons. **Degree progress** counts units toward a requirement — and "0 of
20 core units" is a different sentence from "0 of 48 units". **The recommender** needs
to know a core course is not really a suggestion. Neither is a rendering question,
which is why it is on the type rather than derived from a list of codes in a component.

### `getSuggestedCourses(term)` — the recommender's seam

Filters the catalogue by term and attaches a reason to each **elective**. A core
course gets none: "why is this here" has one answer for a required course, and
`requirement` already says it. An unknown or empty term returns `[]` rather than
throwing — a term with nothing scheduled and a term that does not exist are the same
answer from the student's side, and a throw would take Home down over a typo.

**Called once per program phase from Home's load** — six calls, in one `Promise.all`.
That keeps every component out of the provider layer and every date formatted
server-side. **It is also the shape to revisit when a real recommender lands**: six RAG
calls per dashboard render for panels nobody may open is wasteful. Nothing about
`CourseSuggestion` assumes it arrived early.

### Provenance: `origin`, and why it is not called `source`

```ts
type SourceSystem = "canvas" | "handshake" | "student";
```

Optional on `Course`, `Assignment` and `Task`. **`getCourses` and `getAssignments`
return `"canvas"` on every row; `getTasks` returns nothing** — the field exists on
`Task` so the model is uniform and is deliberately unset.

**`source` was already taken and means something else.** `Task.source` is a
`TaskSource` — `"class" | "career" | "admin" | "event"` — which is the KIND OF WORK.
Two fields called `source` on one model meaning two axes is a bug waiting to be
written, so the systems axis is `origin`.

**A named value rather than a boolean, on purpose.** `isFromCanvas` would have made
every render site know which system was special. One component renders from a label
map keyed by the union, and **nothing in the app branches on `"canvas"`**.

**Absent means UNKNOWN, never "not from Canvas".** Two paths render nothing and they
are deliberately the same path: no origin at all, and an origin whose label this build
does not know. The map is PARTIAL so Django can send a value ahead of a frontend
release without putting `handshake_v2` on a row.

**The decision lives in `$lib/sources`, not in the component**, because Vitest runs in
Node with no jsdom — logic inside a `.svelte` file is logic no gate can see, and the
case worth pinning is the negative one. An empty badge on every row reads as a styling
glitch rather than a bug anyone reports, which is exactly how it would survive.

### Four MIGRATION §9 defects built correctly rather than reproduced

| # | Defect | What this repo does |
|---|---|---|
| 8 | `cancelAppointment` released by matching start time | `Appointment.slotId`; one exact delete |
| 11 | A page imported a label map from `lib/data/mock/requests` | Both maps in `data/labels.ts`, public side |
| 15 | Four providers returned fixtures by reference | All 28 return copies |
| 9 | `expectedCompletion` hardcoded vs a derived finish term | Field dropped; read `expectedFinishTerm` |

**Defect 9 is the one to read twice**, because this pass found three more instances of
exactly its shape. See below.

### The fixture student

`mock/student.ts`. One MSBA student · **17 month** track · goal "Data Scientist" ·
**Summer 2026** · `programStart: 2026-08-03` · standing `onTrack`. `programStart` is a
**start** date; the finish term and the percentage are both derived.

Two advisors, and the pair matters rather than the people: **a graduate student
advisor** (an on-campus room in Rady) and **a career coach** (the CMC, or Zoom). One
in-person-only and one with a remote mode, which is what the booking panel's mode
filter exists to distinguish.

**There is exactly one student, and Group Projects is the first thing that breaks that
assumption** — see §18.

### HOME'S NUMBERS DESCRIBED THREE DIFFERENT STUDENTS

Fixed 2026-08-21, and this is the most useful entry in this section because none of it
was a type error, a crash, or anything a gate could see.

Four fixtures land within about 200 pixels of each other on Home — the timeline strip,
the greeting panel, the degree chips and the top bar — and each was written at a
different time. Nothing typed them together.

| What it said | What was true |
|---|---|
| `degree.unitsCompleted: 38` of 52 | The student is 18 days into their first term |
| `student.currentTerm: "Fall 2026"` | The timeline's current phase is **Summer 2026** |
| `standingSummary`: "**Data Visualization** has slipped" | No course by that title exists in either fixture |
| `degree.track: "11 month"` | `student.track` is `"17 month"` |
| `coreRequired: 9`, `electiveRequired: 4`, `unitsRequired: 52` | 5 core, 7 electives, 12 courses, 48 units |
| `gap-001`: "two elective slots are open" | The catalogue fixes the sequence; none is unchosen |

**The unit count, DERIVED rather than picked.** The timeline is the authority on
position and the catalogue on what a term is worth:

1. `buildProgramTimeline("2026-08-03", "17 month")` puts today inside the FIRST
   phase. Exactly one phase is `current`, five are `upcoming`, **none is `complete`**.
2. Units are earned by finishing a course. Every enrolment is in that current phase,
   carrying progress 72, 60 and 45 — **in progress, none finished**.
3. So completed courses is 0 in core and electives alike, and `unitsCompleted` is
   **0**.

`0 of 48` against "4% through your program" is coherent: 4% is elapsed CALENDAR time,
and a student three weeks in has spent some of the clock without closing out a course.
**The old 38 claimed 73% of the degree in 4% of the time.**

The requirement totals came from the catalogue for the same reason. `52` implied a
**thirteenth** four-unit course that exists in no term. `coreRequired 5` is
`CORE_CODES.length`; `electiveRequired 7` is the remainder; `unitsRequired 48` is
12 × 4. **That 48 rests on the placeholder unit values** and is the first thing to
re-derive if real ones arrive.

**"Data Visualization" was `MGT 253`** in the invented four-course set the real
catalogue replaced. The greeting was telling the student a course they are not taking
had slipped. It now names **MGTA403**, the one enrolment carrying `standing:
"needsHelp"` and the nudge.

#### The Summer-courses report, and why the course fixtures were innocent

The bug was reported as "Home is showing the wrong Summer courses". **The enrolment
fixture and the catalogue were both correct and agreed with each other the whole
time.** What disagreed was `student.currentTerm`: the top bar said the student's
current term was **Fall 2026**, whose courses are MGTA452, MGTA453 and MGTA461. Read
the bar and Home was showing the wrong three.

**Why the catalogue-versus-enrolment agreement test did not fire.** It exists, it is
green, and it was green throughout — `catalogue.spec.ts`'s *"agrees with the enrolment
fixture on every shared field"* joins the two fixtures on `code` and compares title,
instructor, term and requirement. Both were right, so it passed correctly.

**It could not have caught this, and the join key is why.** The stale data was in a
THIRD fixture the test never looks at, and `student.ts` shares **no field** with the
catalogue at all — there is nothing to join on. `currentTerm` is a free-text string
and `standingSummary` is prose. **A test that compares two fixtures cannot see a third
one contradicting both.**

> **`expectedCompletion` was deleted for being a second answer to a derived question,
> and three more of exactly that shape survived it.** `currentTerm` duplicates the
> timeline's current phase; `degree.track` duplicates `student.track`; `unitsCompleted`
> duplicates what the timeline and the catalogue already imply. **When a field can be
> derived, deriving it is not a refactor — it is the only way it cannot drift.**

**`currentTerm` should probably not exist.** It is corrected rather than deleted only
because `TopBar` renders it as a prop and removing it is a behaviour change. The right
fix is to delete the field and have the bar read the timeline's current phase.
`degree.track` is kept because the type is part of the backend contract, and flagged.

#### `fixtureConsistency.spec.ts` pins relationships, not numbers

15 assertions. **The obvious test — `expect(unitsCompleted).toBe(0)` — would have been
green on `38` too**, had it been written when 38 was the fixture. A literal pins
whatever was there when someone looked. What catches this class is deriving the
expected value from the OTHER fixture and letting the two argue:

- `unitsCompleted` ≤ the units a `complete` phase could have awarded — **and** today
  that ceiling is 0, **and** a companion assertion at a later date proves the ceiling
  can be non-zero, so the zero is not vacuous.
- `student.currentTerm` == the timeline's `current` phase term.
- the enrolments' terms == exactly `[student.currentTerm]`.
- `degree.track` == `student.track` == `timeline.track`.
- `coreRequired` == `CORE_CODES.length`; `core + elective` == `catalogue.length`;
  `unitsRequired` == the catalogue's summed units.
- `coreDone + electiveDone` × per-course units == `unitsCompleted`.
- the standing summary names only enrolled course codes, and names the one course
  actually carrying `needsHelp`.

**Verified to fail** by restoring each original value: 3 red for `38`, 2 for `52`, 2
for `coreRequired`, 1 for the track, 2 for the term, 2 for the summary.

**The summary check is the entry worth reading.** It appears to compare course codes,
so it ought to miss a course TITLE — which is what the bug was. It catches it anyway,
via the assertion that at least one code-shaped token is present at all: prose naming
a course by title names nothing checkable. **The counterfactual established that, not
my reading of the code.** So the rule it really enforces is *name a course by its code
in fixture prose*, which is checkable, where "do not name a course that does not
exist" is not.

### REAL NAMES BESIDE INVENTED PERFORMANCE DATA

**The one thing in this section that is not a technical note.** The course numbers,
titles and instructor names are real. `progress`, `standing`, `currentGrade`, `nudge`,
`nextAssignment`, `schedule` and `syllabusId` are **all fabricated**.

So on a publicly reachable URL, a real instructor's name sits beside a made-up "C+"
and a made-up "Grade slipped to C+". Today that is MGTA403 and Nijs, who also teaches
MGTA455 and MGT449. **And as of this pass the greeting panel names that course by code
on the front page**, which makes the pairing slightly more prominent than it was.

**Not changed, deliberately** (owner, 2026-08-21). Recorded in the header of both
`courses.ts` and `catalogue.ts`, and it is the sharpest reason the README says not to
share the deployed link outside the team.

### The fixture's shape, measured

**Measured this pass rather than carried forward, and three of these numbers had
drifted in this file.** They are generated relative to "now", so the event counts move
day to day — which is exactly why a stale figure here is easy to write and hard to
notice.

- **10 tasks** (8 open, 2 done — 1 overdue, 2 due today, 5 upcoming)
- **3 enrolments** and **12 catalogue courses**
- **8 assignments** (this file said 9)
- **157 upcoming events, 19 of them inside seven days** (this file said 159 and 21),
  generated 2–4 per day across a rolling horizon

That 19-against-4 is what forced the events card decision in §13.

**The three enrolments cover Mon–Fri between them**, and that is load-bearing rather
than tidy. The fixture's anchor day is a **Friday**; when the real catalogue replaced
four invented courses with three, the course that went was the only one meeting on a
Friday, and the calendar's day panel and Home's class list went empty on the one day
every other fixture is dated relative to. `check:interaction` found it by reporting no
provenance pill. MGTA403 sits on Friday for that reason.

**Event ids are `` `evt-${dayOffset}-${i}` `` — already `evt-`-prefixed**, which is
the root of both key-space defects in §8.

**The eight open tasks are why the collapse matters and why one gate check can run at
all.** Four are shown collapsed, so `check:interaction` can tick the last of the eight,
collapse the card, and undo into a row that is genuinely not rendered.

**No fixture task has an unparseable due date**, which is why the crash in §7 survived
to be found by reading rather than by using the app. **And no fixture item carries a
label**, which is why the calendar key's labels dimension has to be exercised by
seeding the store by hand.

**Every course and every assignment carries `origin: "canvas"`. No task does.**
`sources.spec.ts` asserts all three.

---

## 13. Home

The dashboard, and the only editable surface besides the calendar. `+page.server.ts`
awaits **six providers in one `Promise.all`**, calls `new Date()` once, and then
builds the term plans. Four cards in a **2×2 grid** at `lg`, one column below it.

**What is deliberately not computed on the server:** the three stat counts. They have
to see the student's persisted ticks, edits and ignores, which only exist in the
browser. What goes down is the classified rows and, on each event row, a `thisWeek`
flag: **the data to count, not the count.**

**`+page.svelte` resolves the task rows once**, for both consumers. See §8.

**Every number in the header block describes one student, and `fixtureConsistency.spec.ts`
is what says so** — see §12. As it renders today: *"Summer 2026 · you are here"*, *"4%
through your program · finish Fall 2027"*, *"17 month track"*, *"0 of 48 units"*, and a
standing summary naming MGTA403. The top bar says "Summer 2026" too.

### The fit-on-one-screen behaviour

- **Desktop: a FIXED height per card body, scrolling inside.** Fixed, not
  `max-height` — with a maximum, a short card still *grows* when expanded, moving its
  grid row. Fixed means expanding can only ever scroll.
- **Mobile: no cap at all.** A nested scroll region inside a page that already scrolls
  eats the swipe meant for the page.
- **The state does not persist.** An expanded card is a momentary intent.
- **`contain: paint`** on the card body — load-bearing, see BUGS.md.

**Cap: `--thrive-card-body-cap: 18.75rem` (300px)**. Collapsed row COUNTS live in
`$lib/cardLayout`: **4** task rows, **2** course cards, **4** class rows,
`VISIBLE_EVENTS = 4`. **`COLLAPSED_TASK_ROWS` stays at 4** (owner, settled).

### The program strip is an accordion

`ProgramTimelineCompact` plus `TermPlanPanel`. **Every pip is a button**, six triggers
over ONE region, one open at a time, and pressing the open one closes it.

**Six independent regions would mean six panels open at once and Home stops fitting a
screen by the third.** `aria-expanded` is per-trigger; only the pressed one reports
itself expanded.

**The current term opens too**, and that is deliberate: a strip where five of six
things are pressable reads as broken. What differs is what comes back.

**Two kinds of list, and they must never read alike.**

| | ENROLLED (the current term) | SUGGESTED (a future term) |
|---|---|---|
| Heading | "Your classes · Summer 2026" | "Suggested for Fall 2026" |
| Per row | the meeting pattern and instructor | why it was suggested |
| Badge | none | the sparkle, "AI suggested" |
| Note | none | "Suggestions only. Nothing here is registered…" |

**Three ways, not one, because a list of course codes looks exactly like an enrolment
whatever the heading says.** The badge's visible text is two words and its spoken form
is a sentence — "AI suggested" out of context tells a screen reader user neither what
was suggested nor by what. Same construction as `SourcePill`.

**Both the badge and the note are suppressed on an empty term.** "AI suggested" above
"No classes listed for this term yet" would be claiming the assistant suggested an
absence. **Two of the six phases ARE empty** — Summer 2027 and Fall 2027 sit past the
catalogue's four terms.

**Enrolled-versus-suggested is decided on the DATA, not the phase's status.** A term
the student has enrolments in is enrolled whether the timeline calls it current or
complete, which keeps this correct as time passes rather than only today.

**Labels are "Core" and "Suggested elective" — the difference is in the WORDS.** And
there are **three labels for two values**: an elective in the ENROLLED panel says
plain "Elective", because a course already on the timetable is not being suggested to
anybody.

**The panel opens BELOW the strip, not in a popover.** Three reasons: the last pip
sits at the right edge so a popover would cover the pips it came from, a course title
runs to 55 characters against a 272px popover token, and a row in the reading order
needs no anchoring geometry at six positions across four breakpoints.

**Home is 1096px with nothing open** and the pip is a 44px touch target on a phone.

### Tasks is flat when collapsed, grouped when expanded

The one real design decision in 6a, and it came from measuring: the card carried
~190px of fixed furniture before its first row. So the progress bar moved into the
header band and the collapsed view shows a flat list of the next four things. Headings
come back on expand.

**6b inherited a consequence: reordering is offered only when EXPANDED.** Collapsed,
the rows are a flat slice spanning several groups, and sort keys are read *per group* —
so "move this up" across a group boundary would persist a key and change nothing on
screen.

### Task editing (6b)

| Component | Role |
|---|---|
| `TaskRow` | The row. Checkbox, title-as-label, chips, due chip, controls, two disclosure panels |
| `UndoBar` | Fixed at the TOP of the list. Deliberately **not** a live region |
| `DueDateEditor` | The due chip as a button opening a native `<input type="date">` plus three shortcuts |
| `PriorityPicker` | Three radios, not a select. Deliberately uncoloured by its own value |
| `TaskNotes` | Draft local, committed on blur, on close, and on destroy — never per keystroke |
| `AddTaskForm` | Collapsed to one button. Title the only required field |

**A native date input rather than a hand-rolled calendar.** Keyboard-operable and
screen-reader-labelled for free, and on a phone it raises the platform's own picker.

**Three radios rather than a select**, because there are exactly three values.
**`AddTaskForm` keeps a native `<select>`** and that is not an inconsistency: on a
row, priority is one of three values being *changed* in a strip where all three should
be visible; in the form it is one of four fields being *filled*. **Its explicit
colours now do a different job than the comment used to claim** — `color-scheme: light
dark` handles the native widget palette, so the fill and ink are there to match the
app's surface rather than to survive a dark-set OS.

**Notes commit on blur, on close, and on destroy.** The third matters: ticking a task
elsewhere regroups the row and can unmount the panel mid-sentence. Escape **closes
without discarding** — the opposite of the title editor, because a title has an
original to restore to and prose does not.

**The title commits on blur too, which the Next source did not do.** That forced a
guard: `blur` fires *before* `click`, so pressing Cancel would have committed the
draft. Both halves are needed — a `pointerdown` flag for mouse, touch and **Safari**
(where clicking a button does not focus it, leaving `relatedTarget` null), and a
`relatedTarget` check for the keyboard.

**That Safari note came back in 7c**, one layer up: a pointer press does not reliably
leave focus on a button, so `ItemRow` focuses its details trigger before opening the
dialog, or `focusTrap` has nowhere to put focus back (§14).

**"Needs a date" accepts no drops**, enforced as a type:
`DatedGroupKey = Exclude<GroupKey, 'unknown'>`.

**No `justChanged` ring.** This app has ONE arrival treatment. A tick is answered by
the row striking through, moving to Done, the undo strip, and the live sentence. The
ring is spent on the **undo**.

**One live region, and the undo strip is not a second one.** The sentence is cleared
after 4s so the *same* move announced twice is announced the second time too.

### The row's structure, and defect 3 twice over

MIGRATION §9 defect 3 — "the worst thing in the app" — was every task title wrapping to
roughly one character per line at 375px. It had **two** causes and 6b would have
reintroduced the second.

**Cause 1, fixed in 6a:** a flex item's default `min-width: auto` refuses to shrink
below its longest word. **Cause 2, dormant because a read-only row had no controls:**
several 44px buttons beside the title is ~220px against a 343px card, so the controls
**wrap to their own line below `sm`**.

**And a third thing, exposed only by adding the due chip.** `flex-1` on a `min-w-0`
title means the TITLE gives way, not the chips. Measured at 375px mid-build the title
box was **90px**. The title now takes a line of its own. Measured after: **303px and
one line at 375px.**

**The row is a `<div>`, not a `<label>`.** It holds several controls and a label
wrapping all of them would make pressing the note button tick the task off. The
**title** is the checkbox's label instead. **The calendar's `ItemRow` follows the same
rule for the same reason.**

**The control strip is right-anchored (`ms-auto`).** The invariant: a conditional
control appears and disappears at the strip's leading edge, and nothing already on
screen moves. **`ItemRow`'s details control follows it** — last in the strip.

**The row renders `role="listitem"`, and every caller owes it a `role="list"`
container.** It renders the listitem itself rather than being wrapped in an `<li>`,
which is why a gate looking for task rows queries `.thrive-row` with a checkbox inside
rather than `li`.

### The stat pill popovers

Each pill opens a popover listing the actual items behind its number, clickable and
jumping to the row.

**Click, and only click.** Hover-to-open was built, gated, tried, and **rejected**:
three pills in one row meant a cursor crossing it opened and closed panels nobody
asked for.

**A count of zero is not a control.** No button, no `aria-expanded`. It keeps
`min-h-11` so a row of pills is never two heights.

**The count and the list are one expression** — each pill's number is `items.length`
of the list it opens.

**A list, not a menu.** `role="menu"` brings a single tab stop and Tab-to-exit, right
for a command menu and wrong for jump targets.

**Dismissal has one focus rule:** restore focus to the pill **if and only if** focus is
currently inside the panel. Choosing an item is the named exception.

**Nineteen items is a long popover** and it scrolls at `max-h-60`.

### Upcoming Events, and the join control that is finally live

The events pill counts events *this week* — 19 in the fixture — while the card showed
four *upcoming*, so fifteen popover items had no row to jump to.

The fix rests on both sets being **prefixes of the same list**.
`expandedEventLimit(collapsedLimit, weekCount)` returns `max` of the two, and a test
asserts the prefix property. The `max` is not decoration: on a quiet week the week
count is *shorter* than the collapsed slice.

**Filter FIRST, then slice** — ignored events are removed before the slice, which is
what makes the next event move up instead of leaving a gap.

**"Count me in" was inert from 6a until the 7c follow-on**, with a comment beside it
saying exactly why: the join store was keyed on the calendar item id, so a write from
Home would have landed under a key the calendar never reads.

**An inert control is a dead affordance, and Home has none left.** Four have been
removed: "View all" pointing at a parked route, copy-to-list with nowhere to copy to,
"count me in", and **"Add to calendar"** — which downloads an `.ics` through
`icsFromEvent`, Home's own mapper. Nothing leaves the browser.

**`icsFromEvent` is a SECOND mapper rather than a shared one.** An `Event` has a real
`location` and a required `start`; a `ScheduleItem` has a `detail` that means a
location on an event row and a course code on a task, and an OPTIONAL `startISO`
because a recurring class is a weekday rule. Collapsing them means widening one type or
narrowing the other. The one rule they DO share — no distinct end means a marker at the
start — is asserted on both.

### Provenance on Home

**Class rows and course cards carry the Canvas pill. Task rows do not.**

`ClassRow` gained an `origin` field carried through from `Course.origin` in the load
function, which is this repo's view-model rule: the row arrives with everything it
needs rather than looking something up in the component. `CourseCard` reads
`course.origin` directly and puts the pill beside the course CODE rather than the
title, so it does not push a two-line title around.

**Task rows show nothing, and it is SETTLED rather than scoped out.** The obvious
objection is that a task with a `courseId` came from a class, so it came from Canvas.
The answer is that the pill does not mean "this was influenced by Canvas" — it means
**this row is a Canvas OBJECT**. A task is the student's own object even when it came
from a class: they can rename it, reprioritise it, move its due date, tick it and
delete it, and none of that touches anything in Canvas. An assignment is none of those
things.

Marking tasks would make the pill mean two different things on two rows of the same
list, which is worse than marking nothing (owner, 2026-08-21). Recorded in
`sources.spec.ts`, and a gate assertion checks that 0 of 4 task rows carry a pill while
a class row inches away does.

### The reveal channel: the page owns the intent, the cards own their state

- **`$lib/reveal.ts`** is pure and tested. `planReveal(ids, limit, targetId)` is the
  one question a card asks. `found: false` is kept distinct from "found, and already
  visible".
- **`$lib/reveal.svelte.ts`** carries the request. A popover calls
  `reveal.request({ kind, id })` and knows nothing else. Nothing outside a card ever
  writes a card's state.

**The channel lives in page CONTEXT, not at module scope.** That is what keeps
"collapse resets on navigation" true because of where the channel lives rather than
because something remembers to reset it. This is the one place the module-singleton
pattern of §9 was rejected.

**The nonce is load-bearing.** Two clicks on the same item are two requests, and with
only a target in the slot the second write is `target === target` and Svelte makes it a
no-op — precisely the click a student makes when the first did not seem to work.

**Each show-more control governs its OWN region.** Two controls claiming one region is
a promise to a screen reader that neither keeps.

**`RevealKind` is a closed union — `'task' | 'event'` — on purpose.** Nothing since 7a
has needed a third, and it was checked rather than assumed each time. A third member
would force an id-space decision. **The calendar has still added no arrival caller at
all.**

### Arriving is one function, and it is the standard

**`arriveAtRow` in `$lib/arrive` is how ANYTHING moves a student to a row.** Never a
hand-rolled `scrollIntoView`. Two arrival treatments on one page would be worse than
either alone.

Asking and doing are separate modules: **`$lib/arrive`** is "I know which row",
**`$lib/reveal.svelte`** is "something else has to find it".

**Two callers, still:** a popover item, and 6b's undo.

**Not every focus move is an arrival.** Navigation inside a widget, focus recovery onto
a container after the row it was on stopped existing, **and `focusTrap`'s two moves**.
None of them is "here is the row you asked for", which is the only thing the mark
means. `MiniCalendar` is the clearest case: it moves focus on every arrow press, and
marking each one would turn a wayfinding cue into a cursor.

#### Why the mark exists

Focus moved and the row scrolled, which was correct and **completely invisible** —
everything on Home is on one page. The focus ring is not the answer: a pointer user does
not get one.

`arriveAtRow` focuses the row, scrolls it with `block: 'nearest'`, and marks it with
**`.thrive-arrived`** — an indigo ring, solid for most of a 1200ms beat then faded.

- **Indigo** because it is the reserved "you are here" colour.
- **An outline**, because it cannot move the layout, does not collide with the row's own
  priority wash, and follows the element's own `border-radius`.
- **The ring is a normal declaration and the animation only takes it away**, because the
  global reduced-motion block forces `animation-duration: 0.01ms !important` and a mark
  *painted* by a keyframe would vanish instantly.
- **Exactly one row is ever marked**, document-wide.
- **Arriving twice at the same row forces a reflow** between removal and re-add.
- **The mark is unconditional**, including for a row that needed no scrolling.

#### The one-tick question, settled in 6b

`arriveAtRow` awaits exactly **one** `tick()`. **One tick is enough — but the flush
count was the wrong question.** Svelte's deriveds are **pull-based**: reading one after
a state write recomputes it synchronously. So `undoTick` unticks, READS the resulting
list, asks `planReveal`, expands the card if it must, and only then arrives.

> **Make every state change the row's existence depends on BEFORE you call
> `arriveAtRow`. Never leave one to an effect that has not run yet.**

**Measured both ways.** With the expansion in an effect instead, the hard case lands
nowhere and logs **zero console warnings**, because the gate drives the production build
where the dev-only warn is compiled out.

### Measured heights

Header block **375px → 266px** (6a density pass). Document **1392 → 1238 (6a) → 1218
(6b) → 1136 (the call-site density pass) → 1091 (the type scale) → 1096px** after the
term-plan accordion added a 44px touch target to each pip. **The phone is 3040px.**

Home fits a 1096px viewport whole, not 1052px, and the decision is **do not cut card
rows.** **The theme changed no height** — it is a token swap, and `check:layout`
reported the same 51 figures before and after.

### Strings

**`$lib/messages` holds every user-facing string.** English only, no library. Nested by
surface, and **anything carrying a value is a function**, not a template assembled at
the call site.

6b added a `taskEditing` group of ~45 entries. The calendar phases added a `calendar`
group of ~90, with the same property: `countPart(count, singular, plural)` hands a
translation both word-forms so it can pluralise its own way.

**Two groups are not owned by a surface.** `common.events` — Home and the calendar
render the same eight strings for the same act against the same store. `common.source`
— a label map and a `spoken(name)` function, rendered by three surfaces and owned by
none.

**The theme toggle's three labels are the one exception in the app**, and it is
deliberate: they live in the component rather than in `messages`, written out as three
whole sentences rather than assembled from a state name and a verb, because "Switch to
system" is worse English than "Follow your system setting" and a template that produces
one bad sentence is worse than three good ones. **If a fourth state ever appears, move
them.**

**This is a standing rule, not a Home thing.** Every surface extracts its strings as it
is built, or Mandarin stops being possible.

---

## 14. The calendar

**The second built surface and the largest.** `/calendar` — 14 components plus nine
pure modules. 7a built the spine, 7b the other two views and the filter, 7c the three
editing surfaces. Everything since has been layout.

### The load: one clock read, three values, and no merge

`routes/calendar/+page.server.ts` awaits `buildScheduleData()` and `getTasks()` in one
`Promise.all`, calls `new Date()` once, and returns `todayKey`, `nowMinutes` and
`nowISO` off that single instant.

**Tasks are fetched here and deliberately NOT merged here.** A task's due date can be
moved by the student and stored only in `localStorage`; a student can add tasks the
server has never seen; a quick-list to-do has no server row at all. Merging
server-side would render a date the student has already changed.

### `buildScheduleData` returns two shapes, and that is the whole design

Five providers flattened into one `ScheduleData`:

- **Dated rows** — assignments (`asg-`), events (`evt-`), appointments (`apt-`) — each
  pinned to one `dayKey` with `timeLabel` and `sortMinutes` pre-computed.
- **Classes as WEEKDAY RULES** — `dayOfWeek` + a wall-clock `startTime` + a
  pre-rendered `timeLabel`, expanded onto whichever days a view is showing.

**That split is why the month grid can page to any month with no round trip.**
Pre-expanding classes would mean either choosing a horizon on the server and having the
grid go blank past it, or shipping every meeting of the term to render one month. A
wall-clock time carries no timezone, so expanding it is safe wherever it happens.

An event with no distinct `end` becomes `allDay: true` with `timeLabel: "All day"` and
`sortMinutes: 0` — a marker for the day rather than a slot on it.

**`origin` rides along both shapes.** `RecurringMeeting` carries the course's, and each
meeting's expansion into a `ScheduleItem` copies it, so a class row can say where it
came from without a second lookup.

### The three rules that hold it together

**1. ONE filter, applied once.** `filterSchedule` runs on the whole `ScheduleData` in
`CalendarView` before anything renders, and the month grid, the week columns, the
agenda, the day sections **and the events section** all read that one result. **No view
filters for itself.** The old failure — a dot on a day with no row beneath it — is
structurally impossible rather than something to remember. The checkable consequence:
**switching view does not change what a day COUNTS.**

**2. ONE `selectedKey`.** Owned by `CalendarView`, read and written by every view, so
switching view never loses the student's place. Selecting a day from an adjacent month
pulls the view onto that month so the selection is never off-screen.

**3. The clock is the server's.** `nowMinutes` arrives as a prop. Nothing in the
subtree asks the browser what time it is.

### The page's chrome, after the layout pass

**One heading row.** An eyebrow, a 30px two-line title ("Everything, one page") and a
subtitle listing the six streams — three things saying one thing — pushed the month
grid's top edge to 202px on a 1052px laptop. What survives is the page's NAME, on a row
it shares with the view switcher and (below `xl`) the Key's trigger. The term is already
on the month header a few pixels below, the streams are named in the Key, and every
day-panel row carries its own labelled tag.

**`max-w-page`, like every other route.** It was `max-w-wide` — see §6.

### The Key, and its three arrangements in one day

| Arrangement | Grid width at 1512 | Why it changed |
|---|---|---|
| 18rem right column | 927px | A legend paying full-time rent for a third of the page |
| full-width disclosure above the grid | 1198px | Opening it pushed the month down the page, and eleven stream rows sat in a narrow left column with most of 1200px empty |
| **11rem right column** | **1023px** | current |

**A side panel and a full-width grid cannot both exist.** 1023px is the trade, stated
rather than smuggled, and it is 96px MORE than the last column gave because the column
is 7rem narrower. The grid is the page's subject, so the Key takes the smallest column
its content actually needs.

**Always visible above `xl`, and the trigger is `xl:hidden` there.** A control offering
to open something already on screen is a control with no job.

**The DOM order is grid THEN Key, at every width.** This is what makes "opening the Key
never pushes the calendar down" true rather than approximately true. Below `xl` the Key
is the SECOND row of a one-column grid, so revealing it appends below the month —
measured on a phone, the grid's top is 175px before and 175px after. Above `xl` an
explicit `row-start-1` on both children pulls it up beside the grid.

**`hidden`/`block` rather than an `{#if}`**, because one instance has two jobs at two
widths and duplicating it would give a screen reader two "Class" toggles for one
filter. `display: none` still takes it out of the tab order and the a11y tree; what it
does not do is leave `querySelectorAll`, which is why the gate asserts VISIBILITY
rather than presence.

**`items-start` on the grid**, or the Key would stretch to the height of the left
column — which is the month plus the entire day panel.

### The components

| File | Role |
|---|---|
| `CalendarView` | **The only stateful node.** Owns `selectedKey`, `monthKey`, `detail`, `keyOpen`. Merges, filters once, and renders the day panel as a **snippet** shared by month and week |
| `ItemDetail` | **The dialog.** Everything about one item plus label, urgent and delete |
| `MiniCalendar` | The month grid. Up to 3 category dots per day plus `+n`, a roving tabindex, full grid keyboard navigation |
| `ItemRow` | One item in the shape every view renders it. Three shapes: full, `compact`, and full-with-a-date. Carries the details trigger and the provenance pill |
| `AddItemForm` | Add a task, a to-do or a custom event. Markup only — the routing is a module |
| `KeyBar` | The key AND the filter. Two dimensions that never merge |
| `DayEventsSection` | "Happening, register". Join, leave, `.ics`, ignore |
| `AgendaView` | A flat grouped list over 30 days. **The only view that can carry undated to-dos** |
| `CalendarHeader` | The day's summary: big figure, breakdown, `n of m done`, "next up", the square strip |
| `WeekView` | Seven columns. Not rendered below `48rem` |
| `SquareGrid` | A day's items as squares. Re-exports `SquareCell` / `SquareGroup` from `calendarDay` |
| `ViewSwitcher` | month / week / agenda as a radiogroup, plus the **agenda-only** grouping select |
| `DaySection` | One titled group on the selected day |
| `DayGroupToggle` | Arrange the day by type (default) or time |

### The pure layer behind it

Everything that could be a decision rather than markup was extracted, because **Vitest
runs in Node with no jsdom, so logic inside a `.svelte` file is logic no gate can see.**

| Module | Holds |
|---|---|
| `schedule.ts` | The vocabulary. Category maps, the three category sets and their guards, grid arithmetic, `filterSchedule`/`isVisible`, grouping, `nextUpItem` |
| `buildSchedule.ts` | `buildScheduleData`, `todayKey`, `nowMinutesAt` |
| `calendarSources.ts` | `taskToItem`, `todoToItem`, `mergedSchedule` |
| `calendarDay.ts` | The selected day: `sortDayItems`, `arrangeDay`, `squareGroupsFor`, `dayCountParts` |
| `calendarViews.ts` | The views: `agendaRange`, `showsRowDate`, `undatedTodoItem`, `visibleUndatedTodos` |
| `calendarEvents.ts` | **The event boundary.** `dayEventRows`, `joinedCount` |
| `calendarAdd.ts` | **The routing.** `addCalendarItem`, `instantFor` |
| `ics.ts` | `buildIcs` (pure, clock as an argument), `icsFromItem`, `icsFromEvent`, `downloadIcs`. **Two mappers, not one** |
| `calendarPrefs.ts` | `normalisePrefs` + the persisted store |
| `calendarItems.ts` | Custom events, labels, urgent — keyed by calendar item id. Plus `labelFor` / `urgentFor`, the ONE resolution rule |
| `ignoredEvents.ts` | `eventIdOf`, `canIgnore`, the store — keyed on raw `Event.id` |
| `tickItem.ts` | `tickItem`, `isTickable` — dispatching on the attached source row |
| `sources.ts` | `sourceLabel`, `sourceSpoken` — provenance, and the negative case |

**Each extracted function has a branch that has already been got wrong once:**

- **The two-slice concatenation.** `schedule` and `personal` are two filtered slices of
  an already-sorted day, and two sorted lists joined end to end are not sorted, so every
  task landed after every class regardless of when it was due. `arrangeDay` sorts again.
- **The tickable denominator.** A section's fraction used to read `done / items.length`,
  so a group holding one finished task and two classes rendered "1/3".
- **"1 classes".** `class` is the only irregular plural in the category list.
- **The attached source row on an undated to-do.** Built as an object literal in the
  prototype's markup, which is exactly where a field gets dropped.
- **The three-store routing.** A to-do filed as a task turns up on Home under a heading
  that says "pulled from every source", which is then untrue; a task filed as an event
  cannot be ticked, so a deadline quietly stops being one. Neither throws, neither
  fails a type check, and neither is visible on the day it happens.
- **The event id boundary.** An id shedding a prefix it did not have, or not shedding
  one it did. Invisible to types, to `svelte-check`, and to any round-trip test.
- **An absent provenance.** Renders an empty bordered badge if the guard goes, which
  reads as a styling glitch rather than a bug and therefore never gets reported.

> **Extract by failure mode, not by size.** `AddItemForm` is a radio group and three
> inputs — nothing about it is hard. The routing is the only part that fails silently,
> so the routing is the part that left the component.

### Ticking dispatches on the attached source row, never on a parsed id

`mergedSchedule` puts the resolved `Task` or `QuickItem` on each item and `tickItem`
reads it. `isTickable` asks that same question — is a writable source attached — not
whether `done` happens to be set, and never by slicing a prefix off an id.

The id-parsing version missed every task the student added themselves and every undated
to-do in the agenda. Both failed identically and **silently**: the guard found nothing
and returned, the checkbox appeared to tick, and the next render put it back.

**7c extended the same rule to deletion.** `customEventToItem` attaches the
`CustomEvent` to the row, so `ItemDetail` deletes by `item.customEvent.id` rather than
`item.id.replace(/^custom-/, "")` as the source did — doubly hazardous there, because a
custom event's item id carries the prefix **twice**.

### `KeyBar`: two dimensions that do not merge

```
STREAMS   where a thing came from      fixed, legendOrder, known at build time
LABELS    what the student called it   open-ended, appears as they use it
```

**One list of chips is the obvious simplification and it is the wrong answer.** A
stream is a KIND OF THING that every student has; a label exists only because this
student typed it. Mixed together, "Career" and somebody's "thesis" look like the same
kind of switch.

They are kept apart **structurally, not by styling**, so an edit cannot flatten them by
accident: separate headings, separate `<ul>`s each with their own `aria-labelledby`,
separate prefs fields (`hidden` / `hiddenLabels`), separate helpers (`toggleCategory` /
`toggleLabel`), different accessible-name shapes ("Hide Class" vs "Hide items labelled
thesis"), a dot on a stream and never on a label, and the labels section absent
entirely when nothing is labelled. **Nothing iterates a merged array.**

**The streams are a VERTICAL LIST, one per line, `w-full` so the dots form one
column.** Eleven chips used to wrap into four ragged rows, where the dot — the thing
tying a name to a colour in the grid — landed at a different x on every line. `w-full`
is the load-bearing part: a `flex-col` list whose rows shrink to their text is still
one-per-line while the dots stay exactly where they were, so the gate asserts the dot
column rather than the layout direction.

Rows are `min-h-11` (44px on a phone) and `lg:min-h-8` on desktop. **The three view
toggles are stacked too**, so their checkboxes form a column the way the dots do. The
rule above them is kept: they are not a third dimension, they change what is shown
about items already shown, and the line says so.

**Height stopped being a problem the moment the Key was beside the grid.** Internal
scrolling was considered and **rejected** — a scroller inside a panel hides filters, and
below `xl` the panel is already collapsed.

**`allLabels` runs on the UNFILTERED merge**, and that is load-bearing: from `filtered`,
switching a label off would remove its own chip from the key and leave no way to switch
it back on.

**Off reads as off, not as absent** — a hidden stream keeps its row, dimmed and struck
through. `hide all` exists and so does the warning that follows it.

The toggles are real checkboxes so keyboard and screen-reader behaviour come from the
platform. They are `sr-only`, and `has-[:focus-visible]` moves the focus ring out to the
row at the same 2px primary outline the base layer draws. **7c's add form uses the same
construction** for its kind picker.

### `ItemDetail` is a real dialog, which the source was not

The Next version had `role="dialog"` and `aria-modal="true"` on a div that kept three of
the six promises those attributes make.

| Obligation | How |
|---|---|
| Named | `aria-labelledby` at the real heading |
| Announced as modal | `aria-modal="true"` plus the scrim |
| Focus moves in | `use:focusTrap`, `initial: '[data-dialog-close]'` |
| Focus is trapped | the same action |
| Focus returns to the opener | the same action, on destroy |
| Escape dismisses | `use:escapeKey` |

**Focus lands on CLOSE, not the label field.** The common case is reading, and stealing
focus into a text input makes Escape feel like it cancelled an edit that never started.

**The opener must be focused before the dialog opens.** A pointer press does not
reliably leave focus on a button — Chrome does it, Safari on macOS does not — so
`ItemRow` calls `focus()` on itself in the handler before `onOpen`.

**The two live fields read their STORES, not the row.** `detail` is a snapshot, so
reading its `urgent` for the checkbox would show the value as it was when the dialog
opened and never move — which is what the source does.

**Delete asks first, and the second step's geometry is thought about.** "Keep it" takes
the position "Delete" occupied, and holds focus, so neither a double-tap nor an Enter
can destroy anything. **A confirm button rendered where the trigger was reintroduces
the accident the step exists to prevent.** And Escape peels one layer.

**The dialog is mounted outside the view branches**, because the agenda has no day panel
and its rows open one too, and `dayPanel` is keyed on the selection — which a student
can change from the keyboard while the dialog is open.

**Its scrim is `bg-scrim` as of the dark theme**, not `bg-ink/20`. See §6.

### `AddItemForm`: three kinds, three stores

```
task   work with a deadline   -> thrive:task-added     joins Home's Tasks list
todo   a scratch item         -> thrive:quicklist      joins the quick list
event  something happening    -> thrive:custom-events  goes nowhere else
```

**Three departures from the source, each fixing something:**

- **A to-do is dated at the day's start, not the form's time.** The quick list never
  offers a time and `todoToItem` renders every one "All day", so storing 09:00 puts a
  number in the store that nothing reads and that contradicts the row it produces.
- **Label and urgent go to the annotation stores only.**
- **The confirmation names the list.** Three kinds go to three places and a student who
  picked the wrong one finds out days later on another page.

**No arrival, and that is a decision.** `arriveAtRow` needs a row with a DOM id and
calendar rows carry none. The form sits directly above the list it just added to, on the
day it added to.

**Default time is 9:00, not "now".** Adding something to next Tuesday at the current
wall-clock time is almost never what was meant — and it would make the module read the
clock for no reason.

### `DayEventsSection`, and the day-figure gap that is now closed

**Its own section rather than a group in the day list, because opting in is a different
act from ticking off.** A class is something the student is already committed to and an
assignment is something they owe; these are invitations, and they carry a blurb, a "for
you" badge and three controls no other row has.

**Joining states a fact and leaving is a separate control.** It used to be one toggle
reading "You're in", which removed you when pressed again — an off-switch nobody could
discover.

**Nothing is sent anywhere.** "Count me in" is local intent; "add to calendar" downloads
an `.ics` the student chooses to import. Each joined row says so.

**The fraction counts the rows ON SCREEN**, not the store, which holds every event the
student has ever joined across every day.

**THE 7a GAP IS CLOSED.** The header's figure counts everything on the day, events
included, so for two phases a day could read "12" above ten rows. Both alternatives
were worse — filtering events out of the count would also have taken them off the month
grid, breaking "one filter, applied once".

**And it is gated rather than argued.** `check:interaction` walks **every day in the
month with anything on it** — 36 days, 14 of them rendering an events section — and
asserts the figure equals the rows rendered, then asserts it again after an add. The
whole-month walk matters: the mismatch was per-category, so a check that happened to
land on a Tuesday of classes would have passed throughout.

**No provenance pill here**, because it renders events, which have no origin.

### The week-to-agenda fallback, at 48rem

Seven columns on a 375px screen gives each one about 50px, narrower than the word
"Assignment". So below `md` the week grid does not render and the agenda answers.

**The Next source never had this.** See §3, shape three.

**It is CSS** — two media-gated wrappers, for the reasons in §7. Below the breakpoint,
week renders **exactly what agenda renders** (list, no day panel); the alternative, list
plus day panel, is a shape no view has. And it **says so on screen**: the switcher still
shows "week" selected, because that is the student's choice and it is honoured the
moment the screen is wide enough.

**48rem, not 40rem, and the difference was measured.** 40rem gave 71px columns —
correctly clamped and still reading as three short stacks. **There is no min-width and
no horizontal scroll in `WeekView`.** The fallback is what guarantees the room, so a
scrollbar would mean the fallback was doing nothing. **The knob is the breakpoint, never
a min-width.**

### The agenda is the only view that can carry undated to-dos

Which is the whole reason it exists rather than being a nicer month grid. They have no
day, so they are not in `ScheduleData` at all — they travel beside it as
`MergedSchedule.undatedTodos` and get their own section, because pretending they are due
today would be a lie the student did not tell.

**`filterSchedule` cannot reach them, so `visibleUndatedTodos` applies the two
dimensions that can, by the same rules.** `showDone` is obvious. **`urgentOnly` hides
all of them**, because urgent is applied by `mergedSchedule`'s `annotate` over
`data.dated` only, so an undated to-do can never carry the flag — and leaving them in
meant switching urgent-only on emptied the whole page except that one section.

They render `allDay: false` with an empty time column, departing from the source's
`allDay: true` — which made `ItemRow` label every one "all day", a claim about a day
they do not have.

**They get the details trigger too.** The agenda is the only place an undated to-do is
reachable, so it is the only place one can be labelled or flagged urgent.

### Agenda rows name their own date when the grouping is not by day

Grouped by day the heading IS the date and repeating it is noise. Grouped by type or by
course, a row's time alone does not say which of thirty days it falls on — and **a time
without a date, in a list spanning a month, is the wrong half of the information rather
than less of it.** The prototype rendered all three groupings identically.
`showsRowDate` is the decision, in the pure layer. Kept on review (owner).

The range is **anchored on TODAY, not on the selection**: the agenda answers "what is
coming up", and an anchor that moved with the selection would answer a different
question every time a student touched the month grid.

### One deliberate absence: the agenda has no add form and no events section

**Settled by the owner.** The agenda spans thirty days, so there is no day for a new
item to land on, and both other views offer one. Do not revisit without a proposal for
what day an agenda-level add would add to.

### The month grid's cell height, and a latent utility conflict

Cells are `h-11` on a phone (44px) and `lg:h-10` on desktop (33.75px), down from
41.25px, with the day number at 12.75px. The grid is 243px, down from 292px.

**One step smaller CLIPS, and the reason is older than the change.** At `lg:h-9`
(30.38px) 8 of 42 cells reported `scrollHeight > clientHeight` — the ones carrying a dot
row, which needs 32px. `leading-none` on the day number **loses** to the `text-*`
utility's own line-height, so the number's box is 18px rather than 12.75, and adding
`lg:leading-none` did not win either. The cell is sized to the box the browser actually
produces. See §6.

### What still has no gate, and was verified by hand

- **`MiniCalendar`'s keyboard grid.** 42 cells, one tab stop, arrows in all four
  directions with focus and selection agreeing, Home/End six days apart,
  PageDown/PageUp moving the month while focus survives the swap **and the document does
  not scroll** — the Next version's shared `preventDefault()` sat after the branch that
  returns, so paging also scrolled the page.
- **The 48rem boundary.**
- **The filter end to end.** Hiding a stream took the month dots 57 → 40, persisted,
  survived a reload, and was restored by "show all". Urgent-only took 114 agenda rows to
  0 and removed the undated section too.
- **The labels dimension**, which needed a seeded `thrive:item-labels` because **no
  fixture item carries a label**.
- **The dot geometry**, at six widths.
- **The calendar in DARK.** The theme's gate checks one thing here — that the worst
  filled chip on the page clears 4.5:1 — and nothing has looked at the month grid's
  eleven dots on a dark ground with human eyes. See §18.
- **The WEEKEND, until 2026-08-22.** The three enrolments meet Mon-Fri, so a Saturday
  day panel has no classes and nothing due. Two assertions depended on that without
  saying so and both went red the first time the gate ran on one — with no code change
  behind it. One is now a SKIP; the other found a real defect. See §15.

No console warnings or errors at any width, in any view.

---

## 15. The gates

| Command | What it proves |
|---|---|
| `npm test` | **694 tests**, 33 files. Pure logic and source scans. **Nothing renders.** |
| `npm run check` | Types agree over 473 files. **Does NOT prove the page renders** |
| `npm run build` | It compiles, with `adapter-netlify` |
| `python3 scripts/check-contrast.py` | **127 assertions, BOTH THEMES** |
| `npm run check:layout` | **17 targets × 3 viewports** in a real browser |
| `npm run check:interaction` | **261 assertions** in a real browser |
| the timezone sweep | The suite in seven zones, UTC+14 to UTC−11 |

**Both browser gates build their own server first** (`npm run build:node`,
`adapter-node` into `build-node/`) rather than assuming one exists. That closed a real
hole: `check:layout` used to be able to measure yesterday's output and pass.

**Four properties every gate here has.**

1. **It measures the thing rather than a model of it.**
2. **It reads its inputs from the source of truth.**
3. **It has been verified to fail** on the bug it was written for.
4. **It says what it does not cover.** A check that appears to cover something it
   cannot is worse than no check, because it converts an unknown into a false known.
   Where a gate's reach stops short, that boundary belongs *inside* the gate, at the
   assertion.

**Property 2 has teeth.** Three gates parse a source file rather than restating it:
`check-contrast.py` parses `app.css` — which is why the chroma pass needed no gate edit
at all — `check-interaction.mjs` parses `features.ts` for `floatingTodo`, **and it now
parses `app.css` too**, for the two `--thrive-bg` arms. Writing `rgb(22, 21, 18)` into
an assertion would have reintroduced the exact drift that rewrite killed, with the
extra twist that the gate would then assert a colour the app no longer uses and report
PASS.

### The contrast gate checks both themes

58 assertions → **127**. Every pair runs twice against its own theme's surfaces.
Parsing a `light-dark()` is **exact** — both values are literals in one declaration, so
there is no mixing to reimplement and no rounding to guess at, which is most of why the
palette is expressed that way.

Three things are deliberately asymmetric and each says so at its own definition:
yellow's ceiling is a light fact and its floor a dark one; the yellow/navy pairing
inverts; and the soft tints can only be measured on dark. **Anything else that differs
between the themes is a bug in the palette, not a property of it.**

It also asserts things that are not contrast: the `.thrive-*` treatments exist,
`.thrive-card-body`'s fixed height and `contain: paint`, **and the four structural facts
the theme rests on** — `color-scheme: light dark` on `:root`, both `only` overrides, and
that the `dark:` variant covers the media query as well as the attribute.

**Verified to fail seven ways:** dark `muted` dimmed 1 red, `faint` past its ceiling 3
red, `on-primary` left white 9 red, navy left at the brand value 7 red, a soft tint
pointed at the wrong hue 1 red, `color-scheme` back to light-only 1 red, the variant's
media arm deleted 1 red. Exit 1 on each, 0 restored.

**The two structural entries are the ones worth having**, because they have **no visual
symptom for whoever is testing**: delete the variant's media arm and every student
whose OS is dark but who never touched the toggle silently gets the light theme, which
looks perfectly correct on a light machine.

**And one regex was wrong on correct CSS.** `[^}]*` cannot cross the `}` of the
variant's nested block, so the check reported a miss on a file that was already right.
Caught by the check failing, fixed by allowing one level of nesting.

### `check:layout`

**It asserts the page cannot scroll further than it paints.** It does **not** use
`documentElement.scrollHeight` — that is the property that reported 1275px while nothing
rendered below 1238px. **It needed no update for either density pass, the provenance
pill, the real catalogue, the dark theme, or the fixture fix**, which is the property
that makes it survive this kind of work: it compares each route's scroll height against
its painted height rather than hardcoding either, so a new height is simply the new
truth. **Five consecutive structural changes and no gate edit** is the property, not
luck.

**It covers the calendar three times, because the view is a persisted PREFERENCE rather
than a URL.** The gate writes `thrive:calendar-prefs` before each target and removes it
when a target names none, so a view cannot leak forward.

### `check:interaction`

**It exists because the other five were all green on a version where pressing a pill
did nothing at all.** None of the others can press a button.

**Verified to fail, fourteen ways**, each broken on purpose:

| Broken | Result |
|---|---|
| Hover reintroduced | 6 red, including the original bug reproduced |
| The arrival mark not applied | 4 red |
| The mark never cleared | 2 red |
| The undo's expansion moved into an effect | **1 red, and NO console warning** |
| The title field's `onblur` removed | 2 red |
| A `dragend` put back on the row | 1 red (`derived_inert`) |
| `{#if href}` restored, so every card links out | 2 red |
| The `floatingTodo` guard removed from copy-to-list | 1 red |
| **The ignore store's normaliser reinstated** | **7 red across two spec files** |
| `block` put back beside `line-clamp-3` | measured 140px vs 60px — no gate, found by hand |
| **`eventId = item.id` in `dayEventRows`** | **7 red in `calendarEvents.spec.ts`** |
| **`annotate`'s old `!label && !isUrgent` shortcut** | 1 red |
| **`applyTheme` never writing the attribute** | **5 red** |
| **The category chips reverted to a stock white** | **1 red, at 2.94:1** |

**The ninth and eleventh carry the same lesson**, and it is about the shape of the test
rather than the bug. One direction of a cross-surface test *still passes* with the bug
reinstated, because both sides then share the same mangling. **"Crosses two surfaces" is
not the property that catches a key-space split; not sharing a transformation is.**

**The two theme entries fail in opposite ways and are worth reading together.**
Breaking the attribute leaves "the choice survives a reload" reporting
`state=dark attribute=null` — the STORE was fine and the DOM was not, so an assertion on
the stored value alone, or on the painted colour against an OS already set to dark,
would have stayed green. That is why the reload check asserts the attribute beside the
colour, and why **the whole theme block is driven on an OS-DARK browser**: on an
OS-light one, `data-theme="light"` and doing nothing at all are indistinguishable.

**The chip entry is the sweep's own finding, kept as a gate.** At 2.94:1 it looked fine
on screen.

### Two assertions depended on the day of the week, silently

Found 2026-08-22, when this gate ran on a **Saturday** for the first time. Two reds
appeared with no code change behind them, and both were verified against the previous
commit in a worktree before anything was touched.

The three enrolments meet Mon–Fri between them (§12), so a weekend day panel has no
classes and nothing due.

- **The provenance check** asserted `count > 0` unconditionally, so "no pills on a day
  with nothing to mark" was reported as "the pills are broken". It **SKIPs** now — this
  gate's own stated property for a case the fixture cannot produce — while the
  `empty === 0` half still runs on any day, because an EMPTY badge is a real defect
  whenever a row exists.
- **The prose check found something real.** An event blurb in `DayEventsSection` was
  967px wide with no line-length cap — about 150 characters a line — and had been since
  7c. It takes `max-w-measure` now.

**The second one is the shape worth remembering.** That assertion is a `max` over every
paragraph on the page, so **a too-wide paragraph hides behind a wider one that is
correctly capped.** It only surfaced on a day whose events carry long descriptions.

> **A gate whose greenness depends on the day of the week will fail on somebody else's
> Saturday and be dismissed as flaky.** If an assertion needs a fixture condition, say so
> at the assertion and skip when it is absent — and be suspicious of any `max`-over-a-set
> check, which reports only its loudest member.

### The first-paint claim is tested with JavaScript DISABLED

The strongest assertion added this pass. The design says a student on the default gets
the right theme on the first paint because CSS resolves it, with no script in the path.
Timing a screenshot would be flaky and would not prove the mechanism. **Turning
JavaScript off proves it exactly:** if the page is still dark on an OS-dark machine with
no JS at all, then no JS was ever needed, so there is nothing for a flash to happen
during. Both directions checked, and both with no attribute written.

> **To prove something does not depend on JavaScript, turn JavaScript off.** It converts
> a timing question into a structural one.

### THREE false greens, and they are the same defect in three costumes

**One: an assertion that read a POSITION rather than an identity.** The appointments
grid check read *the first paragraph in the pane* and asserted only that its text
differed after a click. It never looked at the list, and it took the first eligible
cell, which is always inside the displayed month, so the adjacent-month path had never
been clicked once.

**Two: `check(name, true, 'a sentence')`.** "The calendar is allowed more width than the
rest" was asserted as a literal `true` with prose for a reason. It could never go red,
and its prose was stale the moment the cap changed. **Grep for `check(` calls whose
second argument is a literal.**

**Three: an assertion satisfiable by an ABSENCE.** "Core is distinguishable from
elective" carried an `|| !hasCore` escape branch and was run against a term holding no
core course, so it passed by finding nothing to distinguish.

A fourth, in the unit suite: `expect(core).toEqual([...CORE_CODES])` beside
`expect(core).toHaveLength(4)`. The first compares a fixture against the constant the
app reads, so it proves consistency and not correctness; the second counts to four,
which a wrong list of four satisfies exactly. The core list WAS wrong.

**And a fifth, of a new kind, found this pass: an assertion pinning a LITERAL that a
fixture correction invalidates.** `providers.spec.ts` asserted
`unitsCompleted).toBe(38)` inside a test about *defensive copying* — nothing to do with
unit counts. Correcting the fixture broke a test that was not about the fixture. It now
reads the value BEFORE the mutation and compares against that, with a `not.toBe(999)`
companion so it cannot pass by comparing a value to itself.

> **An assertion that can be satisfied by an absence, by a literal, or by comparing a
> thing to itself is not an assertion.** Five instances now. And **a test should pin the
> narrowest thing that makes it true** — a defensive-copy test that names a fixture
> value has coupled itself to data it does not care about.

### The invariant-versus-literal rule, which this pass is the clearest case of

`fixtureConsistency.spec.ts` exists because `expect(unitsCompleted).toBe(0)` **would
have been green on `38`**, had it been written when 38 was the fixture. A literal pins
whatever was there when someone looked; it cannot notice that the value contradicts a
different fixture.

So every assertion in that file derives its expected value from **another fixture** and
lets the two argue: the timeline decides where the student is, the catalogue decides
what a term is worth. Change the start date or the track and the tests follow with no
edit.

> **When two fixtures describe the same subject, test the RELATIONSHIP.** A number is
> only checkable against something that also knows what it should be.

**And an absence needs a companion.** The unit ceiling is 0 today, so three assertions
about it are all satisfied by a derivation that always returns 0 — a typo in the helper
would make the whole block permanently green. A fourth assertion runs the same
derivation a year later and requires the ceiling to be non-zero.

### What the browser gate covers that nothing else can

A count of DOM nodes against a rendered number; `document.activeElement` (the whole
focus contract); a statement about two presses; a store write reflected in rendered text
on **another page**; a two-page double-booking RACE; the negative assertion that clicking
the month grid does NOT move the booking chips; the nav disclosure's DOM-removal on
collapse; that Ask THRIVE writes no `localStorage` key; two independent scroll
containers; the page measure at two viewport widths; **computed colour rather than class
names**, because a class list can say `bg-sunken` while something else wins the cascade;
**a page rendered with no JavaScript at all**; and **whether a pill reached a row**,
which no unit test can see because Vitest renders nothing.

`check:interaction` reports **SKIP** rather than passing when the fixture cannot produce
the case an assertion needs. It also states its blind spot: it drives the production
build, so `arriveAtRow`'s dev-only warn is compiled out and invisible.

**Anything behind `import.meta.env.DEV` has no gate by construction.**

Both browser gates **skip loudly and exit 0** when there is no chromium.

**`npm run check` is not a render.** `svelte-check` passed 0 errors on a component that
threw `ReferenceError` on every request. **And it is held at 0 warnings.**

### `designSystem.spec.ts` rejects the palette, not the notation

It had rejected `#fff` in markup since it was written. Eight entries in `schedule.ts`
named Tailwind's own `white`, and it sailed through for two reasons at once: the check
only looked for hex notation, and the file is a `.ts`, where the colour rule had never
been applied at all.

**In a light-only app the bug was unobservable** — `--thrive-on-primary` *is* white, so
the token and the stock colour rendered identically. The theme is what made them differ,
at 2.85–2.96:1.

It now rejects the whole stock palette, with `indigo` and `yellow` exempted as real
THRIVE tokens while their numbered variants are not. **Its companion test proves each
pattern still matches** a sample offender and still *passes* the THRIVE tokens that
share those words — an absence assertion over 200 files is worthless if a typo in one
entry silently stops matching.

**It scans raw source and does not strip comments**, deliberately: a comment-stripping
regex that is wrong somewhere would HIDE a real offender, and this rule's own history is
the evidence that a silently passing colour check is the expensive failure. The cost is
that prose in this repo has to describe the offending utility rather than quote it.

---

## 16. Standing decisions

### Settled this session

- **There are two themes, and every colour token is ONE `light-dark()` pair.** Not a
  second `:root` block — that needs three copies, and a half-retuned token is a wrong
  colour nothing catches.
- **The dark palette holds each hue exactly and solves for lightness.** Not an
  inversion. A dark value that fails the bar gets retuned; the bar does not move.
- **`system` is the theme default and is stored as an ABSENCE**, emitting no
  `data-theme` attribute. **Absent must never come to mean "light."**
- **No blocking inline script for the theme. Strategy A stands.** The default is correct
  on the first paint because CSS resolves it, not because JS beat the paint. An explicit
  choice against the OS costs one un-personalised frame, and that is stated rather than
  hidden.
- **Yellow stays decoration-only in BOTH themes**, even though it measures 9.06:1 at
  worst on dark. A meaning that holds in one theme and not the other needs two carriers.
- **The theme control is one cycling button in `TopBar`**, on every route. `/settings`
  stays parked.
- **`--thrive-scrim` is its own token because a scrim is always a darkening.**
- **The seven light `*-soft` tints stay `color-mix`** (owner). Closing the measurement
  gap means moving light values, which is not worth it.
- **`TopBar`'s desktop controls are 30.375px and are NOT growing** (owner). The density
  was deliberate and they clear WCAG 2.5.8's 24px; the comment claiming 36px was the
  thing that was wrong, and the repo's "36px floor" was a house preference.
- **`unitsCompleted` is 0 and is DERIVED from the timeline and the enrolments.** So are
  `coreRequired` (5), `electiveRequired` (7) and `unitsRequired` (48), from the
  catalogue. The 48 rests on placeholder unit values and says so.
- **`student.currentTerm` should be deleted and read from the timeline instead.**
  Corrected rather than deleted this pass only because `TopBar` renders it as a prop.
- **`degree.track` is a second answer to `student.track`** and is kept only because the
  type is the backend's contract. If it ever renders, delete it.
- **Fixture prose names a course by its CODE**, because that is checkable and a title is
  not.

### Standing

- **The old repo is read-only.** Verified untouched after every phase.
- **Django is not being written here** — and it is on the critical path rather than
  merely queued (§18). `BACKEND.md` is the contract.
- **Measure layout in a real browser.** Never reason about pixels.
- **Drive interaction in a real browser too.** Anything a person presses gets pressed;
  anything a person *gestures* gets gestured.
- **A gate must be verified to fail** on the thing it guards. This is the only thing
  that distinguishes a passing check from a check that cannot fail.
- **`check(name, true, 'because')` is not an assertion.**
- **An assertion that reads a POSITION rather than an identity is a false green waiting
  for a layout change.** Put a hook on the element.
- **Assert the thing the user reads.**
- **An assertion's expected value must not be derived from the thing under test** — and
  **a test should pin the narrowest thing that makes it true**, or a fixture correction
  breaks a test about something else.
- **When two fixtures describe the same subject, test the RELATIONSHIP.** A literal pins
  whatever was there when someone looked.
- **Any test asserting an absence needs a companion assertion that it can still see a
  presence.**
- **"Crosses two surfaces" does not make a test non-vacuous.** Not sharing a
  transformation does.
- **Pin the STORED KEY, never a round trip**, for anything key-space shaped.
- **Measure the counterfactual, not just the fix.**
- **Say when a check cannot see what it looks like it checks**, at the assertion.
- **To prove something does not depend on JavaScript, turn JavaScript off.**
- **A silent no-op is the worst failure mode this app has.** The reveal reading as a dead
  click, an id-parsing row lookup, a hover-swallowed press, an undo arrival without its
  expansion, a checkbox with nothing to write to, an unclamped `line-clamp`, an urgent
  flag that will not clear because it is stored twice, an empty provenance badge, and
  **a chip at 2.9:1 that looks fine in a screenshot** are all the same failure.
- **Before hunting a reactivity bug, check whether the change is VISIBLE.**
- **A control with two ways in has more states than it has booleans.**
- **A correct implementation of a bad interaction is still bad.**
- **Delete an abstraction that loses its last caller**, unless a specific named surface
  wants it.
- **Moving a student to a row goes through `arriveAtRow`**, and **write everything
  before you call it**. **Not every focus move is an arrival.**
- **`RevealKind` is closed on purpose.**
- **Resolve persisted overrides once per page**, and **apply the calendar's filter once
  per page.**
- **Never resolve a row by parsing its id.** Attach the resolved source object at merge
  time and dispatch on that.
- **A normaliser that cannot distinguish its input cases is a defect, not a helper.**
- **Is this a fact about the EVENT or about the ROW?** That is the test for whether
  something belongs in a new key space.
- **When you have to guess at data, write the assertions against the INVARIANT and not
  against the guess.**
- **A test comparing a fixture against the constant the code reads proves consistency,
  not correctness.**
- **When a field can be derived, deriving it is not a refactor — it is the only way it
  cannot drift.** Four instances now: `expectedCompletion`, `currentTerm`,
  `degree.track`, `unitsCompleted`.
- **A label describes the ROW IN ITS CONTEXT, not just the field's value.**
- **`@theme inline` decides what can ever be responsive**, at declaration time. A literal
  is baked into the utility; a `var()` is inlined as a reference.
- **`--spacing` is not a typography knob.** It moves control heights and icon sizes.
- **When two same-specificity utilities disagree, size to the box the browser actually
  produces** rather than adding a third utility.
- **A field that names a system beats a boolean that names one system.** And **absent
  must mean unknown, never the negative.**
- **A prop is a getter, so its declared type has a lifetime.**
- **A dialog owes six things and attributes are three of them.**
- **A destructive step's second press needs its geometry thought about.**
- **Extract by failure mode, not by size.**
- **Feedback beats correctness.** "It works" and "it appears to work" are different
  acceptance criteria and only one of them is the product.
- **A control whose result is invisible is worse than no control**, and **a link to a
  page that is not built is worse than no link**, and **an inert control is a dead
  affordance**.
- **The thing being changed must not sit above the thing that changes it.**
- **If a fallback hides something the student explicitly chose, say so on screen.**
- **Making an invisible state visible means auditing every path it can now reach.**
- **A control's `aria-controls` must name the region it actually expands.**
- **`display: none` is out of the a11y tree and the tab order, and IN
  `querySelectorAll`.**
- **One instance, two widths, CSS deciding** — not two instances.
- **A viewport question CSS can answer belongs in CSS.** The JS form is for cases with no
  CSS equivalent — moving focus, not choosing a layout. **A theme is the strongest
  instance: the OS preference is a media query, so the default needs no JS at all.**
- **Pick a breakpoint by measuring, not by naming a size.**
- **Work colour in a perceptual space, and raise chroma at fixed lightness** when
  contrast is the binding constraint. **And check the result against every RESERVED
  colour, in every theme.**
- **A hue collision lives in the hue corridor, not the lightness.** Re-tuning for a
  second theme inherits neither the first theme's fixes nor its problems.
- **A pairing is not a property of two colours; it is a property of two colours in a
  theme.**
- **An alpha composite of a token inherits everything that token does, including
  flipping.**
- **A colour's ROLE must hold in every theme, even when the measurement stops.**
- **Write the colour rule against the PALETTE, not the notation.** "No hex" catches the
  careless case; "nothing outside our tokens" catches the case that looks correct.
- **Never read a themed token as a custom property.** It is not a colour, and it is a
  different non-colour in dev and in the build.
- **Size may be the cheaper lever than colour.**
- **A utility that works by setting `display` conflicts silently with every `display`
  utility.**
- **A `text-*` utility carries a line-height and can beat `leading-none`.**
- **Source order decides which media query wins** when two of them match.
- **Wait past the longest transition on an element before reading a computed style.**
- **A verification claim decays exactly like a comment does** — including a comment that
  states a measurement. Re-run the sweep on any date-shaped change; re-measure a number
  a comment asserts before writing a gate against it.
- **Where the source and MIGRATION disagree, the source wins.** Where the source is
  *wrong*, improve on it. Where it contradicts **itself**, it is not a source to follow.
- **When a request says "give it a distinct surface", find what already has one.**
- **CONTEXT is regenerated in full every handoff.** This pass is the argument for the
  rule: reading every section against the tree found four stale claims nobody was
  looking for.
- **`@lucide/svelte`, not `lucide-svelte`.**
- **`cn()` survives** for the `class`-override case only.
- **Vitest in Node, no jsdom.** Which is why logic gets extracted out of components.
- **Probe before asserting.** **Suspect the probe before the product.**
- **`npm run check` is held at 0 warnings**, and a warning is answered rather than
  suppressed.
- **Diff a port, do not review it.**
- **Extract strings as you build**, not afterwards.
- **No personal names in any doc.** Roles instead. Fixture data is out of scope.
- **Capture the artefact, not the event.**
- **No Claude/Anthropic attribution anywhere** — commits, PRs, file headers. Verified
  clean across all 132 commits.

---

## 17. Voice and copy

Calm, plain, honest about what is simulated.

- Say plainly when something is a prototype or is not wired up. A placeholder that mimics
  a real answer teaches the student to trust something that is not there — which is why
  the chat surface has no brain and says so, and why `providers.ts` marks the request and
  resume flows **SIMULATED** in place.
- **Copy that apologises for an unfinished feature has to be deleted the moment the
  feature lands**, or it becomes a lie.
- **Sometimes the honest answer is to say nothing.** A "View all" pointing at a
  placeholder was replaced by no link rather than by a caption explaining why. An
  unrecognised provenance value renders nothing rather than a slug.
- **But sometimes it is to say exactly what happened.** The week fallback tells the
  student their screen is too narrow rather than silently showing a different view.
- **And sometimes it is to say where a thing went.** The add form's confirmation names
  WHICH list the item joined. The month browser's caption says which pane a click moves.
- **State a promise where a student could reasonably assume otherwise.** Every joined
  event row says nothing was sent anywhere, and the detail dialog says everything typed
  into it stays in this browser.
- **A page that exists to be believed about something must not lie about it.**
  `/swatch` prints hex values and ratios that are the light theme's only, and now says so
  on the page — a reference sheet rendering dark while printing "1.43:1 on cream" is
  worse than no sheet.
- **A control that cycles must say what pressing it will do**, because its next state is
  not visible. The theme toggle's label carries both halves.
- Empty states are an invitation to act, never "No data". Never a dashed outline.
- "Overdue" alone, not "Overdue by 3 days" beside "3 days ago".
- Counts and timers in mono and tabular, so a row does not reflow.
- **If an action changes state the student cannot see, it needs a cue.** And if it
  changes state that then *removes the row*, it needs a sentence.
- **Say why a control is disabled.**
- **Name the subject in an accessible label.** Five identical "Edit" buttons in a list
  are five buttons a screen-reader user cannot tell apart. The calendar's rows say what
  pressing them will DO — "Hide Class" — rather than what is currently true.
- **A bare product name is not an accessible label.**
- **The visible text and the accessible name may differ on purpose**, and when they do
  the reason belongs in the markup.
- **Fixture prose is copy too.** A greeting naming a course the student is not taking is
  a lie the app tells on its front page, and it survived for days because prose is the
  one thing no gate reads. Name courses by code so a test can check them.
- Comments explain **why**, not what.

---

## 18. Open loose ends

1. **Django is not started, and three features now need it.** Ask THRIVE's saved
   history, Group Projects, and the real recommender. `BACKEND.md` is the contract.
2. **The mock stores are process-global**, so two people using the deployed site at once
   see each other's data (§20). BLOCKING for a control group.
3. **Provider copies are shallow.** As in the prototype. A caller mutating a nested
   object still reaches the fixture.
4. **Group Projects is scoped and not built.** The first shared surface, the first fifth
   nav item, and the first thing that breaks "there is exactly one student".
5. **`/assignments` is the next real page**, and it owes `TaskRow` a `role="list"`
   container.
6. **Nobody has looked at the dark theme on a real screen.** Every claim about it in §6
   is a measurement, and a measurement does not catch "this teal is ugly" or "the coral
   is too hot at 2am". `later`/`indigo` at dE 0.0759 is the pair most likely to draw a
   complaint on the month grid, and `#ff6343` is the value most likely to read hot. **The
   owner is looking at it now.**
7. **The seven light `*-soft` tints are unmeasured** — they are `color-mix`, which the
   contrast gate will not evaluate. Left that way (owner). The dark seven are measured.
8. **`prefers-contrast` and forced-colors have never been considered.** Neither was in
   scope for the theme.
9. **`student.currentTerm` and `degree.track` are still second answers to derived
   questions.** Both corrected, neither deleted. Deleting `currentTerm` means `TopBar`
   reads the timeline instead, which is a behaviour change.
10. **The catalogue's `units: 4` is a placeholder that now has a consumer.**
    `unitsRequired: 48` is derived from it, so correcting the units means re-deriving
    the total.
11. **The catalogue covers four terms; the 17-month timeline has six phases.** Summer
    2027 and Fall 2027 have no courses at all, so their term panels render the empty
    state. Not wrong, but nobody has decided whether those terms should hold anything.
12. **`/swatch` documents the light theme only** and is slated for deletion before
    Release 1.
13. **Release 1 dates need re-setting** — see §19.
14. **`nowMinutes()` and `matchesWide()` still have no callers.**
15. **The floating widgets are flagged off** and the quick list has visible consumers
    without a visible panel (§10).

---

## 19. Timeline

Release 1 target was **end of August 2026**; a control group was planned for the **last
week of August**. Both dates come from the prototype's `REPORT.md` and predate the
decision to rebuild — **they need re-setting against the rebuild, which is the largest
open planning question.**

Note the interaction with loose end 2: a control group implies concurrent users, and the
process-global stores mean concurrent users see each other's data. Either Django lands
first or the control group is one person at a time.

**Three scoped features move Django from "later" to "on the critical path".** Ask
THRIVE's saved chat history cannot live in `localStorage`, Group Projects is shared
between people by definition, and the course recommender is a service rather than a
fixture. None can be demoed on the mock layer at all.

The prototype's Release 1 scope was: (a) the student dashboard, (b) appointment
scheduling with history/notes/summaries/topic tagging, (c) `/resources` as the Resource
Navigator surface, (d) per-task time estimates.

**(a) is complete.** Home is real and editable. **And the calendar — which was not in
that scope at all — is the largest surface in the app.** (b) is real, including the
double-booking path. (d) was never begun, and (c) exists in a different shape than
planned: `/ask/resources` answers questions from program material, while `/resources`
stays a parked stub.

**Four surfaces are finished** — Home, the calendar, appointments and Ask THRIVE — and
the app is deployed. **What is missing is not screens; it is a backend.**

**Two things this pass are worth separating from the polish.** The dark theme is a
product feature rather than a legibility fix — a student reading at night is a real use
case and the app now serves it. And **the fixture fix is the more important of the two**:
Home was showing a student 38 of 52 units in their first week, and a dashboard that
contradicts itself on its own front page undermines everything else on it. That is worth
knowing before any control group sees it.

---

## 20. Deployment, and what a public URL changes

Deployed to **Netlify** from `main` since 2026-08-21, so teammates can open a link
instead of cloning the repo.

### The setup, and why it is committed

`netlify.toml` lives at the **repo root** with `base = "frontend"`, because the app is
not at the root and that is the only place Netlify reads the file from or accepts
`base`. `command`, `publish` and a pinned `NODE_VERSION = "22"` are all in it, so the
deploy is reproducible from a clone rather than from settings somebody typed into a
dashboard once. Nothing is configured in the UI.

**One expected line in the build log, recorded so nobody "fixes" it:**

```
Using @sveltejs/adapter-netlify
  No netlify.toml found. Using default publish directory.
```

The adapter looks for that file relative to its own working directory, which is
`frontend/`. It therefore never sees the root file and falls back to its default,
`build` — which is exactly what the root file declares. The adapter takes no `publish`
option. A second copy inside `frontend/` would silence the line at the cost of two files
that can drift.

### Both adapters stay

See §4. `adapter-node` is not a fallback; it is what the two browser gates spawn, and
those gates have caught more real defects than everything else in this repo combined.

### What the URL changes, which is nothing technical and everything socially

None of this is new. It has been true since the data layer was built against fixtures.
**A public URL is what makes it matter**, and it is written into the README:

- **No authentication.** No login, no session, no per-student anything. Anyone with the
  URL is the fixture student.
- **The mock stores are process-global.** Two people using the site at once book over
  each other and see each other's appointments.
- **The form actions have no auth check** and are reachable by direct POST.
- **A cold start silently wipes the stores.** Netlify sleeps the function after
  inactivity; waking it starts a fresh process and the stores live in that process. So
  the first visit after a quiet period is slow AND arrives to an empty appointment list.
  **Nobody cancelled anything.** This is the one that will be mistaken for data loss, so
  the README says to book what you need to demo in the same sitting.
- **A real instructor's name sits beside invented grades** (§12), and as of this pass one
  of those course codes is named in the greeting on the front page.

**Do not share the link outside the team, and do not put anything real into it.**

### The theme is per-browser, and a shared link does not carry it

`thrive:theme` is `localStorage`, so a teammate opening the link gets their own OS
preference rather than whatever the last person chose. That is the correct behaviour for
a display preference and worth knowing before somebody reports the theme "not saving"
across machines. See §8 and `BACKEND.md`.

### The UTC date question, settled

The deployed site can show a different day than a laptop in California, for the hours
between UTC midnight and local midnight.

**That is the date rule working, not a bug.** The server decides what "today" is, once,
and hands down formatted strings — which is the whole of §7. A viewer's clock is
deliberately not consulted, because consulting it is what produced the hydration drift
the rule exists to prevent.

If it should follow the viewer instead, that is a **product decision**, not a formatting
fix: it means storing a per-student timezone and reading it in the `load` alongside
`new Date()`. Nothing about the current behaviour needs changing to support that later.

---
