# FINDINGS

Reusable patterns and lessons. Things worth knowing again.

---

## 2026-08-21 — porting a React app to Svelte 5

### Probe before asserting. Every time.

Every test suite this session was written against **observed output from a
throwaway probe spec**, then the probe was deleted. Not once was it wasted, and
twice it changed what I wrote:

- **V8 is inconsistent about invalid ISO dates.** `new Date("2026-13-01")` is
  `Invalid Date`, but `new Date("2026-02-30")` silently **rolls forward** into
  March and parses fine. I would have written a wrong test from first
  principles, and I would have believed a guard was tighter than it is.
- **`Intl` output is not guessable.** `toLocaleDateString("en-US", {weekday:
  "long", month: "short", day: "numeric"})` gives `"Monday, Aug 17"`. Close
  enough to guess wrong.

**The pattern:** write a spec that only `console.log`s, run it with
`--reporter=verbose --silent=false` (Vitest hides stdout on passing tests),
read the real values, write the real spec, delete the probe.

### A test that only exercises one side of a symmetry proves nothing

The ignore store's key-space defect survived because the prototype's two test
files each exercised one surface — and they encode **contradictory** key
conventions. `isEventIgnored("evt-3-1", {"3-1": true})` assumes one; the
`filterSchedule` cases assume the other. Both pass. Together they cannot both be
right.

**The pattern:** when two callers are supposed to agree, test the round trip
between them, not each one against a fixture. The first cross-surface test found
it in one run.

### Timezone-dependent tests are invisible until they are not

A `TZ=` sweep across the suite caught one of my own new tests hardcoding a
UTC-dependent date. Cheap to run, and the only thing that finds this class of
bug:

```bash
for tz in UTC America/Los_Angeles Asia/Tokyo Pacific/Kiritimati \
          Pacific/Midway Australia/Lord_Howe Asia/Kathmandu; do
  TZ=$tz npx vitest --run
done
```

Lord Howe has a **30-minute** DST offset and Kiritimati is UTC+14 — the two that
break naive arithmetic.

**The rule that prevents it:** build every fixture instant from **local parts**
(`new Date(y, m, d, h)`) and only then `toISOString()`. Never
`new Date("2026-08-17")`, which parses as UTC. The one test that *had* to pass a
malformed ISO string is exactly the one that failed the sweep.

### `NaN` is a `number` to the type system, `null` is not

The single most useful thing learned this session. An unparseable date used to
produce `days: NaN`, which typechecks in `a.days - b.days` and `days <= WEEK`
and poisons both silently. Changing it to `days: null` inside a discriminated
union turns every arithmetic call site into a **compile error** the author has to
answer for.

**The pattern:** when a value can be "absent", make the absence a type the
compiler cannot ignore. A sentinel that shares its type with the valid case is
not a guard.

### Widen the type instead of smuggling a sentinel into a field

`describeDue` needed a fourth outcome. The temptations were `urgency: "upcoming"`
with a magic label, or `days: -1`. Both would have read as a real deadline
somewhere downstream. A discriminated union on `urgency` gave detection with no
string matching, kept `DueUrgency` meaning only "how urgent is this real
deadline", and made the invalid state unrepresentable by accident.

Deliberately kept `"unknown"` **out** of `DueUrgency`, so every
`Record<DueUrgency, Tone>` map in the UI stays exhaustive over real statuses.

### Run the existing suite *before* adding new tests to a fix

After adding both guards, I ran the 159 existing tests and only then wrote the
16 new ones. That ordering is what makes "all 159 pass unmodified" a real claim
about the guard rather than an artifact of tests written alongside it.

### Pure logic ports across frameworks for free — and that is a testable claim

All 83 tests moved from React to SvelteKit with **only an import-alias change**
and passed on the first run. Nothing behavioural was touched. That is the
strongest available evidence the logic really was pure, and it is worth
structuring a port to produce that evidence.

---

## Svelte 5 specifics worth remembering

### `$state` in a plain `.ts` file is silently inert

Svelte only processes runes in `.svelte.js` / `.svelte.ts`. A plain `.ts`
containing `$state` compiles, runs, and is not reactive — no error, no warning.
The worst failure mode available.

**The rule:** if a file declares a rune, it gets the `.svelte.ts` suffix.
Files that only *read* reactive state from such a module stay `.ts` — reactivity
is tracked at property access, so it works from anywhere.

### Most React caching has no reason to exist here

Six workarounds dropped, all for one underlying reason: **Svelte tracks the
signal, not object identity.** `useMemo` for referential stability,
`useCallback` for stable function identity, a frozen shared `EMPTY` snapshot —
all of it existed so downstream memos would not bust. There are no downstream
memos.

The one that had teeth: `useCalendarPrefs`'s memo was genuinely load-bearing in
React (a fresh `prefs.hidden` array every render busted the schedule filter over
42 grid cells). It is *pointless* here. Porting it mechanically would have been
cargo-culting a fix for a problem that no longer exists.

**Corollary:** a 9-dependency `useMemo` becomes a plain function the caller
wraps in `$derived`. The caller is the only place that knows what to key the
caching on, and there is no dependency array to drift from the body.

### The `use*` prefix is itself a React-ism

`useTaskDoneOverrides` is not a hook in Svelte: no call-order rules, callable
outside a component, callable conditionally. Keeping the prefix would have been
cargo-culting the *naming* of the very thing being removed. Stripped
mechanically across ~20 exports.

### Actions replace effects that manage a listener

The React version of escape-to-dismiss was a `useEffect` keyed on `open` that
re-checked `open` inside itself, with a dependency array keeping the listener in
step. As a Svelte action on an element inside `{#if open}`, the listener's
lifetime **is** the element's. Nothing to keep in step.

### `bind:this` deletes a whole category of React ceremony

`useFloatingGeometry` took a ref as a parameter specifically because returning
it would have tripped the React Compiler's render-phase rules. That constraint,
and the shape it forced, simply do not exist.

### Snippets are the right answer for "two lists that must not drift"

`RailLink` and `BarLink` were components in the prototype for exactly one
reason: the rail renders two lists and they must look identical. A snippet does
that without leaving the file that uses it.

### Small mechanical notes

- Render a component from a variable with `{@const Icon = item.icon}` then
  `<Icon />`. Not `<svelte:component>`, deprecated in Svelte 5.
- A polymorphic tag is `<svelte:element this={as}>`. Keep the union narrow
  (`'h2' | 'h3'`) so it cannot quietly leave the document outline.
- `{@const}` must be an immediate child of a block — it cannot live inside an
  element.
- Reading a `$props()` value at init warns `state_referenced_locally`. Use
  `$derived.by()`; a throw inside it lands on first read, which is during
  render — the same moment React threw.
- SvelteKit ≥2.12: `page` from `$app/state`, not `$app/stores`.
- Some SvelteKit versions ship **no `svelte.config.js`** — adapter and compiler
  options live in `vite.config.ts`.

---

## Testing infrastructure

### A fake `localStorage` beats jsdom

Deciding "am I in a browser" by asking whether `localStorage` **exists** — not
via `$app/environment` — means the entire persistence layer is testable in the
Node environment the suite already uses. A ~40-line `fakeStorage` with
`installStorage()` / `uninstallStorage()` covers the server case (delete it),
the quota case (`failWrites()`), and assertions on what was actually persisted
(`dump()`).

It also covers the nastiest case: storage that **throws on property access**,
which happens in sandboxed and cookie-blocked contexts. Guard with `try/catch`
around the *access*, not just the call.

### Module singletons need `vi.resetModules()` per test

Stores are created at import. `vi.resetModules()` then `await import()` gives a
fresh graph per test. Install the fake storage before the import for tidiness,
though it is read lazily so it does not strictly matter.

**Do not mix** `vi.resetModules()` with static imports of the same module in one
file — the static import is a different instance. That is why store tests live
in their own spec files rather than being appended to the existing pure-logic
ones.

### Document an out-of-scope defect as a test, named as one

Three tests now exist whose names begin `DEFECT:` or `DOCUMENTS A GAP:`, each
with a comment saying it records current behaviour rather than desired
behaviour, and why it was not fixed. This keeps the suite green, makes the defect
impossible to lose, and means the fix arrives as a **failing test** — which is
the right signal.

The alternative, leaving it untested, is how the ignore store's split survived
this long.

### Do not write a test that pins garbage output

`describeDue("not a date")` used to return `"in NaN months"`. Writing
`expect(...).toBe("in NaN months")` would have entrenched it. Flagging it and
leaving it uncovered was correct — and it became a real fix one phase later.

---

## Process

### Verify against the artifact, not the source

Checked the *compiled* CSS for `--thrive-control-stroke:1.5px` and for the
absence of the dropped tokens, rather than trusting that the source said so. Two
of my greps failed because the output is minified (`control-stroke:1.5px`, no
space) — a tooling artifact that briefly looked like a missing token.

### Kill stale dev servers before believing a 404

Two orphaned `node build/index.js` processes on port 3000 made a verification
return 404, and I nearly concluded a route was not being matched. `lsof -ti:3000`
first.

### A brief's counts can be wrong; check them and say so

Three numbers in the original inventory brief were wrong (21 providers, 61
tests, the location of `todayKey`). Running the suite and grepping the exports
took two minutes and corrected all three. The old repo's own `CODEMAP.md`
undercounts providers the same way, which is probably the source.
