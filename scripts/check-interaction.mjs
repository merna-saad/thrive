#!/usr/bin/env node
/**
 * Interaction gate: the things on Home that only a real browser can prove.
 *
 *     npm run check:interaction     (from frontend/)
 *     node scripts/check-interaction.mjs
 *
 * Two surfaces, for the same reason: both are behaviour no other gate can see.
 *
 *  1. **The stat pill popovers.** Exits non-zero if a pill cannot be opened or
 *     dismissed, if the list cannot be walked with a keyboard, if choosing an item
 *     does not arrive at the row behind it, or if hover has crept back in.
 *  2. **Task editing (Phase 6b).** Ticking, the undo offer, the arrival after an
 *     undo -- including the hard case where the restored row is hidden and the card
 *     has to expand -- and an inline rename committing on blur.
 *
 * No arguments, no config.
 *
 * ## Why this exists
 *
 * On 2026-08-21 the first version of `StatPopover` held ONE boolean for its open
 * state while it opened on both hover and click. Pressing a pill did nothing at
 * all: a mouse click is preceded by a pointer entering, so hover had already
 * opened the panel and the click arrived to find it open and closed it again. The
 * feature's headline interaction was dead.
 *
 * Every other gate in the repo was green on that version. 389 tests,
 * `svelte-check` 0 errors and 0 warnings, a clean build, contrast 58/58, layout
 * 36/36. **None of them can press a button.** It was found by driving the built
 * page by hand, and the only reason it was found at all is that somebody thought
 * to try clicking. That is not a process.
 *
 * Hover has since been removed outright -- three pills in one row meant a cursor
 * crossing that row opened and closed panels nobody asked for. So the bug this
 * gate was written for is now structurally impossible, and the gate's job shifted
 * to keeping it that way: **hovering a pill must NOT open it.** That assertion is
 * the one that would catch hover being quietly reintroduced, which is the only
 * route back to the original fault.
 *
 * ## Why it is not a Vitest test
 *
 * It needs a real browser: real pointer events, real focus, real
 * `matchMedia('(hover: hover)')`, and a real animation clock for the arrival
 * mark. Vitest runs in Node with no jsdom here (a standing decision -- see
 * TESTING.md), and jsdom would not help: it has no pointer model, no layout, and
 * no media queries worth the name. Same shape as `check-layout.mjs` and
 * `check-contrast.py`: a separate gate, run deliberately, that measures the thing
 * rather than a model of it.
 *
 * ## Why it skips instead of failing when there is no browser
 *
 * `playwright-core` ships no browser. On a machine or CI runner without one this
 * would fail for a reason that has nothing to do with the code, and a gate that
 * cries wolf gets ignored. It says loudly that it skipped and exits 0. Install a
 * browser with `npx playwright install chromium`.
 *
 * ## What it does NOT do
 *
 * It knows no fixture ids. Every id it needs it discovers from the page: the task
 * ids it ticks to force a zero count come from choosing the popover's own items
 * and reading where focus landed. A gate that hardcodes `tsk-001` starts failing
 * the day the fixture is edited, which teaches everyone to ignore it.
 *
 * ## Verified to fail
 *
 * The third property every gate here is meant to have, demonstrated rather than
 * claimed. Each was broken on purpose and the count checked:
 *
 *  - hover reintroduced                      6 red (the original bug, reproduced)
 *  - the arrival mark not applied            4 red
 *  - the mark never cleared                  2 red
 *  - the undo's expansion moved out of its
 *    handler and into an effect              1 red, and NO console warning
 *  - the title field's `onblur` removed      2 red
 *  - a `dragend` handler put back on the
 *    row, reading a destroyed block's prop   1 red (`derived_inert`)
 *
 * The fourth is the one worth the ink. It is the failure 6a predicted for 6b, it
 * produces no error, no warning and no visible difference from a successful
 * arrival at a row that was already on screen, and **this gate is the only thing
 * in the repo that can see it.**
 *
 * The last one is why the drag is performed rather than assumed. That warning was
 * present in the production build and every other gate was green: `svelte-check`
 * cannot see it, 439 unit tests cannot see it, and the "nothing threw or warned"
 * assertion at the foot of this file could only see it once something here
 * actually dragged a row.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
/*
 * The ADAPTER-NODE build, not the Netlify one.
 *
 * `frontend/build/` is Netlify's publish directory and holds static assets plus a
 * bundle of serverless functions -- nothing this can spawn. `adapter-node` writes
 * `build-node/` instead, and `npm run check:layout` / `check:interaction` build it
 * first (`ADAPTER=node vite build`). Two adapters writing one folder would mean
 * whichever ran last decided what this gate measured.
 */
const ENTRY = join(FRONTEND, 'build-node', 'index.js');
const PORT = 4400;
const BASE = `http://127.0.0.1:${PORT}`;

/** Home is the only surface with stat pills. When another gains them, add it. */
const ROUTE = '/';

const DESKTOP = { width: 1512, height: 1052 };
const PHONE = { width: 375, height: 812 };

/** How long a pointer gesture or a dismissal is given to settle. */
const SETTLE = 150;

/**
 * The arrival mark's own dwell, read from `app.css` at run time.
 *
 * Not repeated here. The stylesheet owns that number, and a gate carrying its own
 * copy would keep passing after the token was retuned -- which is the failure mode
 * `check-contrast.py` avoids by parsing app.css rather than mirroring it.
 */
let arrivalMs = 0;

/**
 * `FEATURES.floatingTodo`, parsed from its own source.
 *
 * Copy-to-quick-list renders only when this is true, because the quick list lives
 * in the floating To-do panel and there is nowhere to see a copy without it. The
 * gate therefore has to know the flag to know what it should be looking at — and
 * it must NOT try to infer it from the page, which is how the first version of
 * that check became vacuous (see the assertion for the details).
 *
 * Parsed rather than imported: this file is plain node with no bundler, and
 * `features.ts` is TypeScript. A regex over one boolean is honest about that; a
 * copy of the value would rot the day the flag flips.
 */
const floatingTodo = /floatingTodo:\s*true/.test(
	readFileSync(join(FRONTEND, 'src', 'lib', 'features.ts'), 'utf8')
		// Strip the interface declaration, so `floatingTodo: boolean` cannot match.
		.replace(/export interface Features \{[\s\S]*?\}/, '')
);

function skip(reason) {
	console.log('check-interaction: SKIPPED');
	console.log(`  ${reason}`);
	console.log('  Install a browser with: npx playwright install chromium');
	process.exit(0);
}

/*
 * Resolved from `frontend/`, not from here -- this file lives in the repo-root
 * `scripts/`, which has no `node_modules` of its own. Same note as
 * check-layout.mjs, and the same failure it avoids: a bare import fails in a way
 * that looks exactly like "not installed".
 */
let chromium;
try {
	const require = createRequire(join(FRONTEND, 'package.json'));
	const mod = await import(pathToFileURL(require.resolve('playwright-core')).href);
	chromium = mod.chromium ?? mod.default?.chromium;
	if (!chromium) throw new Error('no chromium export');
} catch (error) {
	skip(`Could not load playwright-core from frontend/: ${error.message.split('\n')[0]}`);
}

function findCachedShell() {
	const cache = join(process.env.HOME ?? '', 'Library', 'Caches', 'ms-playwright');
	if (!existsSync(cache)) return null;
	for (const entry of readdirSync(cache)) {
		if (!entry.startsWith('chromium')) continue;
		for (const path of [
			join(cache, entry, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
			join(cache, entry, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell')
		]) {
			if (existsSync(path)) return path;
		}
	}
	return null;
}

if (!existsSync(ENTRY)) {
	console.error('check-interaction: FAILED');
	console.error(`  No build at ${ENTRY}. Run \`npm run build:node\` first.`);
	console.error('  (`npm run build` produces the Netlify output, which this cannot spawn.)');
	process.exit(1);
}

/*
 * `ORIGIN` is not optional once the app has a form action.
 *
 * `adapter-node` cannot know the public URL it is served on, so without this it
 * guesses -- and SvelteKit's CSRF check compares a POST's `Origin` header against
 * that guess. Every form submission comes back **403 "Cross-site POST form
 * submissions are forbidden"**, which is what happened the first time this gate
 * tried to book an appointment.
 *
 * Nothing before Phase 8 posted anything: Home and the calendar write to
 * `localStorage`, so the whole app was GET-only and the omission was invisible.
 * Setting it here is not a workaround for the gate -- it is the same variable a
 * real deployment has to set, so the gate now drives the app the way it must
 * actually be run. See setup_info.md.
 */
const server = spawn(process.execPath, [ENTRY], {
	cwd: FRONTEND,
	env: { ...process.env, PORT: String(PORT), ORIGIN: BASE },
	stdio: 'ignore'
});

async function waitForServer() {
	for (let i = 0; i < 60; i += 1) {
		try {
			const res = await fetch(BASE + '/');
			if (res.ok) return true;
		} catch {
			/* not up yet */
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	return false;
}

let failures = 0;
let unprovenCount = 0;
let total = 0;

function check(name, passed, detail = '') {
	total += 1;
	if (!passed) failures += 1;
	console.log(`${(passed ? 'PASS' : 'FAIL').padEnd(7)}${name.padEnd(58)}${detail}`);
}

/** Console output a passing page should not produce. */
function noisy(msg) {
	return msg.type() === 'error' || msg.type() === 'warning';
}

/** A check this fixture cannot currently produce. Loud, and counted apart. */
function unproven(name, reason) {
	unprovenCount += 1;
	console.log(`${'SKIP'.padEnd(7)}${name.padEnd(58)}${reason}`);
}

/*
 * Everything below is expressed in terms of the accessible shape, never component
 * internals: a pill is a button with `aria-expanded` inside the greeting section,
 * and an open popover is the presence of `.thrive-popover`.
 *
 * That panel selector matters. Asking for `button[aria-expanded="true"]`
 * document-wide does NOT mean "a popover is open" -- `ShowMore` carries
 * aria-expanded too, so an expanded card matches it. Three checks failed on
 * correct code before this was scoped properly.
 */

/** Every pill, read off the page. Runs in the browser. */
function readPills() {
	const section = document.querySelector('#greeting-heading')?.closest('section');
	if (!section) return [];
	return [...section.querySelectorAll('button[aria-expanded]')].map((button) => ({
		label: button.textContent.trim().replace(/\s+/g, ' '),
		count: Number(button.textContent.trim().match(/^\d+/)?.[0] ?? -1),
		expanded: button.getAttribute('aria-expanded'),
		controls: button.getAttribute('aria-controls'),
		height: Math.round(button.getBoundingClientRect().height)
	}));
}

/** The open panel, or null. Runs in the browser. */
function readPanel() {
	const panel = document.querySelector('.thrive-popover');
	if (!panel) return null;
	const trigger = document.querySelector(`button[aria-controls="${panel.id}"]`);
	const box = panel.getBoundingClientRect();
	return {
		items: panel.querySelectorAll('button[data-item]').length,
		listLabel: panel.querySelector('p')?.textContent.trim() ?? '',
		triggerCount: Number(trigger?.textContent.trim().match(/^\d+/)?.[0] ?? -1),
		triggerExpanded: trigger?.getAttribute('aria-expanded'),
		focusInside: panel.contains(document.activeElement),
		right: Math.round(box.right),
		width: Math.round(box.width)
	};
}

const ROW_IDS = '[id^="reveal-task-"], [id^="reveal-event-"]';

/*
 * The Tasks card, read and driven through its accessible shape.
 *
 * Same rule as the popover helpers above: no component internals, and no fixture
 * ids. Every id these need comes off the page.
 */

/** The task list's state. Runs in the browser. */
function readTasks() {
	const list = document.querySelector('#tasks-card-list');
	const section = list?.closest('section');
	const rows = [...(list?.querySelectorAll('[id^="reveal-task-"]') ?? [])];
	const undoButton = [...(list?.querySelectorAll('button') ?? [])].find((b) =>
		/^Undo/.test(b.textContent.trim())
	);

	return {
		rows: rows.map((row) => row.id),
		open: rows.filter((row) => row.dataset.done === 'false').map((row) => row.id),
		/* ENABLED, not merely present. Phase 6a rendered these disabled on purpose,
		   so "a checkbox exists" would have passed against the read-only card. */
		tickable: rows.filter(
			(row) => row.querySelector('input[type="checkbox"]:not([disabled])') !== null
		).length,
		/* Reordering is offered only when the card is expanded: collapsed, the rows
		   are a flat slice spanning groups and "move up" has nothing to write. */
		moveControls: [...(list?.querySelectorAll('button span.sr-only') ?? [])].filter((span) =>
			/^Move /.test(span.textContent.trim())
		).length,
		undoBar: !!undoButton,
		/* The undo strip must NOT be a region of its own: the card announces the tick
		   and the offer in one breath, and a second region talks over it. */
		undoBarIsLive: undoButton ? undoButton.closest('[aria-live]') !== null : false,
		liveRegions: section?.querySelectorAll('[aria-live]').length ?? 0,
		live: section?.querySelector('p[aria-live]')?.textContent.trim() ?? ''
	};
}

/** Tick one row by id. Runs in the browser. */
function tickRow(id) {
	document.getElementById(id)?.querySelector('input[type="checkbox"]')?.click();
}

/** Press the undo offer, if one stands. Runs in the browser. */
function pressUndo() {
	const list = document.querySelector('#tasks-card-list');
	[...(list?.querySelectorAll('button') ?? [])]
		.find((b) => /^Undo/.test(b.textContent.trim()))
		?.click();
}

/*
 * Each of these is passed whole to `page.evaluate`, which serialises the ONE
 * function it is given -- so they cannot call a shared helper defined out here.
 * The duplicated selector is the price of that, and it is cheaper than the
 * `ReferenceError` a factored-out version raises at run time.
 *
 * The open list's control is found by the region it CONTROLS. Both show-more
 * controls on this card used to declare `aria-controls="tasks-card-list"`, so
 * "the control for the open list" had to be disambiguated by document order --
 * `.at(-1)`, because the open one sits in the pinned footer. Taking the first
 * expanded the DONE group instead, which looks exactly like the card refusing to
 * open, and it cost two debugging rounds. The ids are distinct now and the
 * selector says what it means.
 */
function toggleTasksCard() {
	const control = document.querySelector('button[aria-controls="tasks-open-list"]');
	control?.click();
	return !!control;
}

/**
 * Expand the Tasks card if it is not already. Runs in the browser.
 *
 * Asserting the state rather than toggling blindly, because by this point in the
 * run the card may already be open -- the undo above expands it to reach a hidden
 * row. A blind toggle COLLAPSED it instead, the grouped `<section>`s stopped
 * existing, and the drag check below reported the fixture as having too few groups
 * to test. A gate reporting SKIP for its own bug is worse than one failing.
 */
function expandTasksCard() {
	const control = document.querySelector('button[aria-controls="tasks-open-list"]');
	// "Show 3 more" means collapsed; "Show less" means it is already open.
	if (control && /^Show \d/.test(control.textContent.trim())) control.click();
	return !!control;
}

/**
 * Every show-more control on the Tasks card, with the region each one claims.
 *
 * Runs in the browser. Exists to assert that no two controls claim the same
 * region and that every claimed region is really in the document -- an
 * `aria-controls` pointing at nothing is a promise to a screen reader that
 * nothing keeps.
 */
function readTaskDisclosures() {
	const section = document.querySelector('#tasks-card-list')?.closest('section');
	const controls = [...(section?.querySelectorAll('button[aria-controls]') ?? [])].filter((b) =>
		/^Show/.test(b.textContent.trim())
	);
	const claimed = controls.map((b) => b.getAttribute('aria-controls'));
	return {
		count: controls.length,
		claimed,
		unique: new Set(claimed).size === claimed.length,
		allResolve: claimed.every((id) => id && document.getElementById(id) !== null)
	};
}

try {
	if (!(await waitForServer())) {
		console.error('check-interaction: FAILED\n  Server did not start.');
		process.exit(1);
	}

	let browser;
	try {
		browser = await chromium.launch();
	} catch {
		const executablePath = findCachedShell();
		if (!executablePath) {
			server.kill();
			skip('No chromium found, either at the expected revision or in the cache.');
		}
		browser = await chromium.launch({ executablePath });
	}

	const pageErrors = [];

	console.log(`${'result'.padEnd(7)}${'behaviour'.padEnd(58)}detail`);
	console.log('-'.repeat(98));

	// ── Desktop ────────────────────────────────────────────────────────────
	const page = await browser.newPage({ viewport: DESKTOP });
	page.on('pageerror', (error) => pageErrors.push(`desktop: ${error}`));
	page.on('console', (msg) => noisy(msg) && pageErrors.push(`desktop: ${msg.text()}`));
	await page.goto(BASE + ROUTE, { waitUntil: 'networkidle' });

	arrivalMs = await page.evaluate(() => {
		const raw = getComputedStyle(document.documentElement)
			.getPropertyValue('--thrive-arrival-duration')
			.trim();
		const value = parseFloat(raw);
		if (!Number.isFinite(value) || value <= 0) return 0;
		return raw.endsWith('ms') ? value : value * 1000;
	});
	check(
		'app.css publishes an arrival duration to measure against',
		arrivalMs > 0,
		`--thrive-arrival-duration = ${arrivalMs}ms`
	);

	const hovers = await page.evaluate(() => matchMedia('(hover: hover)').matches);
	check(
		'the driving browser reports a hovering pointer',
		hovers === true,
		'so the no-hover check below is not vacuous'
	);

	const pills = await page.evaluate(readPills);
	const live = pills.filter((pill) => pill.count > 0);
	// Non-vacuous: every check below asserts something about a pill, and all of
	// them would pass on a page that rendered none.
	check('Home renders stat pills that own a popover', live.length > 0, `${live.length} interactive`);
	check(
		'a pill starts collapsed and names what it controls',
		pills.length > 0 && pills.every((pill) => pill.expanded === 'false' && pill.controls),
		pills.map((pill) => pill.label).join(' / ')
	);

	const biggest = live.reduce((a, b) => (b.count > a.count ? b : a));
	const pill = (label) => page.locator('button[aria-expanded]', { hasText: label });
	const target = pill(biggest.label);
	const box = await target.boundingBox();
	const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	const away = { x: DESKTOP.width - 40, y: DESKTOP.height - 40 };

	// ── Hover must do nothing ──────────────────────────────────────────────
	/*
	 * The guard on the whole design. Hover-to-open was built, tried and rejected:
	 * three pills sit in one row, so a cursor crossing it opened and closed panels
	 * the student never asked for. Reintroducing hover is also the only route back
	 * to the original bug, where the hover swallowed the click.
	 */
	await page.mouse.move(centre.x, centre.y);
	await page.waitForTimeout(SETTLE * 2);
	check(
		'hovering a pill does NOT open its popover',
		(await page.evaluate(() => !!document.querySelector('.thrive-popover'))) === false,
		'click is the only way in'
	);
	await page.mouse.move(away.x, away.y);

	// ── Opening and closing ────────────────────────────────────────────────
	await target.click();
	let panel = await page.evaluate(readPanel);
	check('clicking a pill opens its popover', panel !== null, biggest.label);
	check(
		'the number on the pill IS the length of the list it opens',
		panel !== null && panel.triggerCount === panel.items,
		`pill=${panel?.triggerCount} items=${panel?.items}`
	);
	check('the trigger reports itself expanded', panel?.triggerExpanded === 'true');
	check('opening moves focus into the list', panel?.focusInside === true);
	check(
		'the panel stays inside the viewport',
		(panel?.right ?? 0) <= DESKTOP.width,
		`right=${panel?.right} of ${DESKTOP.width}`
	);

	await target.click();
	await page.waitForTimeout(SETTLE);
	check(
		'clicking the pill again closes it',
		(await page.evaluate(() => !!document.querySelector('.thrive-popover'))) === false
	);

	// ── The keyboard ───────────────────────────────────────────────────────
	await target.click();
	const first = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
	await page.keyboard.press('ArrowDown');
	const second = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
	check('ArrowDown moves to the next item', first !== second && second !== '');

	await page.keyboard.press('End');
	check(
		'End jumps to the last item',
		(await page.evaluate(() => {
			const items = [...document.querySelectorAll('.thrive-popover button[data-item]')];
			return items.length > 1 && items.indexOf(document.activeElement) === items.length - 1;
		})) === true
	);

	await page.keyboard.press('Home');
	check(
		'Home jumps back to the first',
		(await page.evaluate(() => {
			const items = [...document.querySelectorAll('.thrive-popover button[data-item]')];
			return items.indexOf(document.activeElement) === 0;
		})) === true
	);

	// ── Dismissal ──────────────────────────────────────────────────────────
	await page.keyboard.press('Escape');
	await page.waitForTimeout(SETTLE);
	const afterEscape = await page.evaluate(() => ({
		open: !!document.querySelector('.thrive-popover'),
		onTrigger: document.activeElement?.hasAttribute('aria-expanded') === true
	}));
	check('Escape closes the popover', afterEscape.open === false);
	check('Escape returns focus to the pill it came from', afterEscape.onTrigger === true);

	await target.click();
	await page.mouse.click(Math.round(DESKTOP.width * 0.7), 20);
	await page.waitForTimeout(SETTLE);
	check(
		'a pointer down outside closes it',
		(await page.evaluate(() => !!document.querySelector('.thrive-popover'))) === false
	);

	// ── The reveal, and the arrival ────────────────────────────────────────
	/*
	 * The LAST item, because that is the one furthest past whatever the owning card
	 * shows collapsed. The gate records whether the row is on the page beforehand:
	 * if it is not, the card MUST expand, and that is the strong form of this.
	 */
	await target.click();
	const chosen = await page.evaluate(() => {
		const items = [...document.querySelectorAll('.thrive-popover button[data-item]')];
		const last = items.at(-1);
		last.setAttribute('data-check-target', '');
		return last.textContent.trim().replace(/\s+/g, ' ').slice(0, 32);
	});
	const rowsBefore = await page.evaluate(
		(sel) => document.querySelectorAll(sel).length,
		ROW_IDS
	);

	await page.click('button[data-check-target]');
	await page.waitForTimeout(SETTLE);

	const arrived = await page.evaluate((sel) => {
		const active = document.activeElement;
		const id = active?.id ?? '';
		const body = active?.closest('.thrive-card-body');
		const rowBox = active?.getBoundingClientRect();
		const bodyBox = body?.getBoundingClientRect();
		const control = body
			?.closest('section')
			?.querySelector('button[aria-controls]:not([aria-controls=""])');
		return {
			id,
			landedOnRow: /^reveal-(task|event)-/.test(id),
			marked: active?.classList.contains('thrive-arrived') === true,
			markedCount: document.querySelectorAll('.thrive-arrived').length,
			outline: active ? getComputedStyle(active).outlineWidth : '',
			rowsNow: document.querySelectorAll(sel).length,
			popoverOpen: !!document.querySelector('.thrive-popover'),
			insideBody:
				!!rowBox &&
				!!bodyBox &&
				rowBox.top >= bodyBox.top - 2 &&
				rowBox.bottom <= bodyBox.bottom + 2,
			control: control?.textContent.trim().replace(/\s+/g, ' ') ?? ''
		};
	}, ROW_IDS);

	check(
		'choosing an item moves focus to its row',
		arrived.landedOnRow === true,
		`"${chosen}" -> ${arrived.id}`
	);
	check('the popover closes on the way', arrived.popoverOpen === false);
	check('the revealed row is scrolled inside its card', arrived.insideBody === true);
	check(
		'the arrived row is visibly marked',
		arrived.marked === true && arrived.outline !== '0px',
		`outline-width=${arrived.outline}`
	);
	check(
		'exactly one row is marked, never two',
		arrived.markedCount === 1,
		`${arrived.markedCount} marked`
	);

	if (arrived.rowsNow > rowsBefore) {
		check(
			'a hidden row makes its card expand to show it',
			/Show less/.test(arrived.control),
			`${rowsBefore} -> ${arrived.rowsNow} rows, control reads "${arrived.control}"`
		);
	} else {
		unproven(
			'a hidden row makes its card expand to show it',
			'this fixture had no target past a collapsed slice'
		);
	}

	/* The mark has to take itself off, or a second jump leaves two rows looking
	   chosen. Waited out with a margin over the published dwell. */
	await page.waitForTimeout(arrivalMs + SETTLE * 2);
	const settled = await page.evaluate(() => ({
		anyMarked: document.querySelectorAll('.thrive-arrived').length,
		stillFocused: /^reveal-(task|event)-/.test(document.activeElement?.id ?? '')
	}));
	check('the mark clears itself after its beat', settled.anyMarked === 0);
	check(
		'focus stays on the row after the mark has gone',
		settled.stillFocused === true,
		'the cue is additive, not a replacement for focus'
	);

	/*
	 * Arriving at a row that needs no scrolling must look the same. The FIRST item
	 * is the one already on screen, and it must still be marked -- that is the case
	 * where the scroll does nothing and the cue is the only feedback there is.
	 */
	await target.click();
	await page.evaluate(() => {
		document.querySelector('.thrive-popover button[data-item]')?.click();
	});
	await page.waitForTimeout(SETTLE);
	const visibleJump = await page.evaluate(() => ({
		marked: document.activeElement?.classList.contains('thrive-arrived') === true,
		id: document.activeElement?.id ?? ''
	}));
	check(
		'a row that needed no scrolling is marked just the same',
		visibleJump.marked === true,
		visibleJump.id
	);

	/*
	 * The grid must not move. That is a property of `.thrive-card-body` being a
	 * fixed height rather than a maximum, and of the arrival mark being an outline,
	 * which cannot take up space. If either broke, the bodies would differ.
	 */
	const capped = await page.evaluate(() => {
		const heights = [...document.querySelectorAll('.thrive-card-body')].map((b) =>
			Math.round(b.getBoundingClientRect().height)
		);
		return { heights, allEqual: new Set(heights).size === 1 };
	});
	check(
		'every card body is still one fixed height, so the grid did not move',
		capped.allEqual === true,
		capped.heights.join(',')
	);

	// ── A count of zero is not a control ───────────────────────────────────
	/*
	 * The ids come from the page, not from the fixture. Each item in a task pill's
	 * popover is chosen in turn, and the row focus lands on carries the task id --
	 * which is what the done-override store is keyed on.
	 */
	const taskPill = live.find((entry) => /overdue|due today/.test(entry.label));
	if (!taskPill) {
		unproven('a zero count renders no control at all', 'no task pill has a non-zero count');
	} else {
		const ids = [];
		for (let i = 0; i < taskPill.count; i += 1) {
			await pill(taskPill.label).click();
			await page.evaluate((index) => {
				const items = [...document.querySelectorAll('.thrive-popover button[data-item]')];
				items[index]?.click();
			}, i);
			await page.waitForTimeout(80);
			const match = /^reveal-task-(.+)$/.exec(await page.evaluate(() => document.activeElement?.id ?? ''));
			if (match) ids.push(match[1]);
		}

		const noun = taskPill.label.replace(/^\d+\s*/, '');
		const zeroPage = await browser.newPage({ viewport: DESKTOP });
		zeroPage.on('pageerror', (error) => pageErrors.push(`zero: ${error}`));
		await zeroPage.addInitScript((done) => {
			localStorage.setItem(
				'thrive:task-done',
				JSON.stringify(Object.fromEntries(done.map((id) => [id, true])))
			);
		}, ids);
		await zeroPage.goto(BASE + ROUTE, { waitUntil: 'networkidle' });
		await zeroPage.waitForTimeout(SETTLE);

		const zeroed = await zeroPage.evaluate((label) => {
			const section = document.querySelector('#greeting-heading')?.closest('section');
			const chip = [...section.querySelectorAll('div, button')].find(
				(el) => el.textContent.trim().replace(/\s+/g, ' ') === `0 ${label}`
			);
			return chip
				? { tag: chip.tagName, expanded: chip.getAttribute('aria-expanded') }
				: { tag: 'not found', expanded: null };
		}, noun);

		check(
			'ticking every counted task takes its pill to zero',
			zeroed.tag !== 'not found',
			`${ids.length} ticked, "0 ${noun}" is <${zeroed.tag.toLowerCase()}>`
		);
		check(
			'a zero count renders no control at all',
			zeroed.tag === 'DIV' && zeroed.expanded === null,
			`<${zeroed.tag.toLowerCase()}> aria-expanded=${zeroed.expanded}`
		);
		await zeroPage.close();
	}

	await page.close();

	// ── Editing: the tick, the undo, and the arrival after it ──────────────
	/*
	 * Its own page, so ticking cannot pollute the counts the sections above read.
	 *
	 * ## Why the undo arrival is gated here and nowhere else
	 *
	 * `arriveAtRow` awaits exactly ONE `tick()`, and 6a flagged the undo as the
	 * first caller that might need two: unticking pulls a task out of Done and back
	 * into its group, so the arrival lands on a row that has just moved.
	 *
	 * Measured rather than reasoned about. One tick IS enough -- but only because
	 * `TasksCard.undoTick` makes every state write, INCLUDING expanding the card,
	 * before it calls `arriveAtRow`. Sequencing, not flush count.
	 *
	 * **Verified to fail.** With the expansion moved out of that handler, the hard
	 * case below reports no focus and no mark -- and, because this drives the
	 * PRODUCTION build where `arriveAtRow`'s dev warning is compiled out, **zero
	 * console warnings**. A silent no-op, which is the single failure mode the whole
	 * arrival cue exists to prevent. Nothing but this gate can see it.
	 */
	const edit = await browser.newPage({ viewport: DESKTOP });
	edit.on('pageerror', (error) => pageErrors.push(`edit: ${error}`));
	edit.on('console', (msg) => noisy(msg) && pageErrors.push(`edit: ${msg.text()}`));
	await edit.goto(BASE + ROUTE, { waitUntil: 'networkidle' });
	await edit.waitForTimeout(SETTLE);

	const startTasks = await edit.evaluate(readTasks);
	check(
		'every task row is really tickable now',
		startTasks.tickable === startTasks.rows.length && startTasks.rows.length > 0,
		`${startTasks.tickable}/${startTasks.rows.length} checkboxes enabled`
	);
	check(
		'the card still has exactly one live region',
		startTasks.liveRegions === 1,
		`${startTasks.liveRegions} found`
	);
	check(
		'collapsed, no row offers to be reordered',
		startTasks.moveControls === 0,
		'position is grouped-only, and collapsed is flat'
	);

	/*
	 * Copy-to-quick-list is gated on `FEATURES.floatingTodo`, because the quick list
	 * lives in the floating To-do panel and with the flag off the student has no way
	 * to see what they just copied.
	 *
	 * Asserted against the FLAG rather than against "the button is absent", which is
	 * the difference between a check that survives the flag being flipped and one
	 * that has to be rewritten the day it is.
	 *
	 * **The flag is PARSED from `features.ts`**, not inferred from the page, and the
	 * first attempt at this got it wrong in an instructive way: it looked for a
	 * To-do launcher in the DOM and treated its presence as "flag on". But the
	 * selector `/to-?do list$/i` matched the copy button's OWN accessible name —
	 * "Copy X to your to-do list" — so the check read the thing it was gating as
	 * proof the gate was open. It passed both with the guard and with the guard
	 * removed. A vacuous check, and the exact shape this file's fourth gate property
	 * warns about.
	 *
	 * Reading the source of truth is what `check-contrast.py` does with `app.css`,
	 * for the same reason: the answer cannot be derived from the thing under test.
	 */
	const copyControl = await edit.evaluate(() => ({
		copies: [...document.querySelectorAll('#tasks-card-list button span.sr-only')].filter((s) =>
			/to your to-do list$/.test(s.textContent.trim())
		).length,
		rows: document.querySelectorAll('#tasks-card-list [id^="reveal-task-"]').length
	}));

	check(
		'copy-to-list appears exactly when the quick list does',
		floatingTodo
			? copyControl.copies === copyControl.rows && copyControl.rows > 0
			: copyControl.copies === 0,
		`floatingTodo=${floatingTodo}, ${copyControl.copies} copy controls on ${copyControl.rows} rows`
	);

	/*
	 * Two disclosures on one card, and each must govern its OWN region.
	 *
	 * They both declared `aria-controls="tasks-card-list"` — the whole list,
	 * including the done group neither of them expands. To a screen-reader user each
	 * control then announces that it expands something it does not, and to this gate
	 * "the control for the open list" was ambiguous enough to need disambiguating by
	 * document order, which cost two debugging rounds.
	 */
	/*
	 * A "View all" must never land on a placeholder.
	 *
	 * Several cards point at PARKED routes, which render a title and a note, so the
	 * link renders only when `isBuiltRoute` says its destination exists. Asserted in
	 * the browser rather than only in Vitest because the question is "what did the
	 * page actually put in front of a student" — a unit test can prove the predicate
	 * and still miss a card that stopped asking it.
	 *
	 * The nav lists are read from the page's own rail, so this knows no hrefs: when
	 * a route is built and moves into `primaryNav`, the rail gains it and this check
	 * starts allowing it, with no edit here.
	 */
	const viewAll = await edit.evaluate(() => {
		const rail = document.querySelector('nav');
		const navigable = new Set(
			[...(rail?.querySelectorAll('a[href]') ?? [])].map((a) => a.getAttribute('href'))
		);
		const links = [...document.querySelectorAll('.thrive-panel > div:first-child a[href]')];
		return {
			navigable: [...navigable],
			targets: links.map((a) => a.getAttribute('href')),
			cards: document.querySelectorAll('.thrive-card-body').length,
			allNavigable: links.every((a) => navigable.has(a.getAttribute('href')))
		};
	});

	check(
		'every "View all" points at a page the nav links to',
		viewAll.allNavigable === true && viewAll.navigable.length > 0,
		`${viewAll.targets.length} of ${viewAll.cards} cards link out: ${viewAll.targets.join(', ') || 'none'}`
	);
	check(
		'a card whose destination is parked shows no link at all',
		viewAll.targets.length < viewAll.cards,
		'otherwise this fixture cannot prove the link is ever withheld'
	);

	const disclosures = await edit.evaluate(readTaskDisclosures);
	check(
		'each show-more control governs its own region',
		disclosures.unique === true,
		disclosures.claimed.join(' + ') || 'none rendered'
	);
	check(
		'every region a control claims is really in the document',
		disclosures.allResolve === true,
		'an aria-controls pointing at nothing is a promise nothing keeps'
	);

	// Tick the first open row, and read the sentence back.
	const tickTarget = startTasks.open[0];
	await edit.evaluate(tickRow, tickTarget);
	await edit.waitForTimeout(SETTLE);

	const afterTick = await edit.evaluate(readTasks);
	const doneBefore = Number(/(\d+) of/.exec(startTasks.live)?.[1] ?? -1);
	const doneAfter = Number(/(\d+) of/.exec(afterTick.live)?.[1] ?? -2);

	check(
		'ticking a row counts it as done',
		doneAfter === doneBefore + 1,
		`"${startTasks.live}" -> "${afterTick.live}"`
	);
	check('ticking offers a way back', afterTick.undoBar === true, tickTarget);
	check(
		'the undo strip is not a live region of its own',
		afterTick.undoBarIsLive === false,
		'the card announces the tick and the offer in one sentence'
	);
	check(
		'the one live sentence carries the undo offer',
		/undo is available/i.test(afterTick.live),
		afterTick.live
	);

	// Undo, and land back on the row.
	await edit.evaluate(pressUndo);
	await edit.waitForTimeout(SETTLE);

	const afterUndo = await edit.evaluate(
		(id) => ({
			focus: document.activeElement?.id ?? '',
			marked: document.querySelectorAll('.thrive-arrived').length,
			markedIsTarget: document.querySelector('.thrive-arrived')?.id === id,
			restored: document.getElementById(id)?.dataset.done === 'false'
		}),
		tickTarget
	);

	check('undo puts the task back', afterUndo.restored === true, tickTarget);
	check(
		'undo arrives at the row it restored',
		afterUndo.focus === tickTarget && afterUndo.markedIsTarget === true,
		`focus=${afterUndo.focus} marked=${afterUndo.marked}`
	);

	/*
	 * The HARD case: the restored row sits past the collapsed slice, so the arrival
	 * needs the card to EXPAND as well as the task to be unticked. Two state writes,
	 * still one tick. Expand, tick the last row, collapse, undo.
	 */
	await edit.waitForTimeout(arrivalMs + SETTLE);
	await edit.evaluate(toggleTasksCard);
	await edit.waitForTimeout(SETTLE);
	const openWide = await edit.evaluate(readTasks);

	if (openWide.open.length <= startTasks.open.length) {
		unproven(
			'undo expands the card when the row is hidden',
			'this fixture has no open row past the collapsed slice'
		);
		unproven('a hidden row still gets its arrival mark', 'same fixture limit');
	} else {
		check(
			'expanded, rows offer to be reordered',
			openWide.moveControls > 0,
			`${openWide.moveControls} move controls`
		);

		const deep = openWide.open.at(-1);
		await edit.evaluate(tickRow, deep);
		await edit.waitForTimeout(SETTLE);
		// Collapse again, so the row undo restores is not rendered.
		await edit.evaluate(toggleTasksCard);
		await edit.waitForTimeout(SETTLE);
		const wasHidden = await edit.evaluate((id) => !document.getElementById(id), deep);

		await edit.evaluate(pressUndo);
		await edit.waitForTimeout(SETTLE);

		const deepArrival = await edit.evaluate(
			(id) => ({
				rendered: !!document.getElementById(id),
				focus: document.activeElement?.id ?? '',
				marked: document.querySelector('.thrive-arrived')?.id === id,
				control:
					document
						.querySelector('button[aria-controls="tasks-open-list"]')
						?.textContent.trim() ?? ''
			}),
			deep
		);

		check(
			'undo expands the card when the row is hidden',
			wasHidden === true && deepArrival.rendered === true && /Show less/.test(deepArrival.control),
			`hidden beforehand=${wasHidden}, control now "${deepArrival.control}"`
		);
		/* THE assertion this section exists for. One tick suffices only because the
		   expansion is written before `arriveAtRow` is called; move it into an effect
		   and this goes red with no console warning to explain why. */
		check(
			'a hidden row still gets its arrival mark',
			deepArrival.focus === deep && deepArrival.marked === true,
			`focus=${deepArrival.focus} marked=${deepArrival.marked}`
		);
	}

	// ── Dragging a row into another group ──────────────────────────────────
	/*
	 * A real mouse drag, because that is the only thing that fires HTML5 drag
	 * events -- and because the last bug here was invisible to every other gate.
	 *
	 * Dropping a row into another group tears down its `{#each}` block, and the
	 * `dragend` that arrives afterwards used to read a prop belonging to that
	 * destroyed block: Svelte's `derived_inert`. `npm run check` was clean, 439
	 * tests were green, and the PRODUCTION build logged the warning -- so the
	 * "nothing threw or warned" assertion at the end of this file could have caught
	 * it, but only for a gesture something actually performed. Nothing did.
	 *
	 * So this drags. The assertion is the move landing; the warning check at the
	 * foot of the file is what makes the gesture worth performing.
	 */
	await edit.waitForTimeout(arrivalMs + SETTLE);
	await edit.evaluate(expandTasksCard);
	await edit.waitForTimeout(SETTLE);

	const dragPlan = await edit.evaluate(() => {
		/* Only DATED groups: "Needs a date" accepts no drops, because there is
		   nothing to write -- a task cannot be moved into having no due date. */
		const sections = [...document.querySelectorAll('#tasks-card-list section')].filter(
			(s) => !/Needs a date|Done/.test(s.getAttribute('aria-label') ?? '')
		);
		const from = sections.find((s) => s.querySelector('[id^="reveal-task-"]'));
		const to = sections.find((s) => s !== from && s.querySelector('[id^="reveal-task-"]'));
		if (!from || !to) return null;

		from.querySelector('[id^="reveal-task-"]').setAttribute('data-drag-from', '');
		to.querySelector('[id^="reveal-task-"]').setAttribute('data-drag-to', '');
		return {
			id: from.querySelector('[id^="reveal-task-"]').id,
			from: from.getAttribute('aria-label'),
			to: to.getAttribute('aria-label')
		};
	});

	if (!dragPlan) {
		unproven('dragging a row into another group moves it', 'fixture has fewer than two dated groups');
	} else {
		await edit.dragAndDrop('[data-drag-from]', '[data-drag-to]');
		await edit.waitForTimeout(SETTLE * 2);

		const dropped = await edit.evaluate(
			(plan) => ({
				group: document.getElementById(plan.id)?.closest('section')?.getAttribute('aria-label') ?? '',
				live:
					document
						.querySelector('#tasks-card-list')
						?.closest('section')
						?.querySelector('p[aria-live]')
						?.textContent.trim() ?? ''
			}),
			dragPlan
		);

		check(
			'dragging a row into another group moves it',
			dropped.group === dragPlan.to,
			`${dragPlan.from} -> ${dropped.group} (wanted ${dragPlan.to})`
		);
		check(
			'the move rewrites the due date and says so',
			/moved to .*\. Due date updated\./i.test(dropped.live),
			dropped.live
		);
	}

	// ── An inline rename commits on blur ───────────────────────────────────
	/*
	 * Blur is the commit path with no button behind it, so it is the one that
	 * silently loses a rename. It is also a deliberate addition to the Next source,
	 * which committed only on Enter and Save -- and it is why Cancel needs a guard,
	 * since `blur` fires BEFORE `click`.
	 */
	await edit.waitForTimeout(arrivalMs + SETTLE);
	const renamed = await edit.evaluate(async () => {
		const row = document.querySelector('#tasks-card-list [id^="reveal-task-"]');
		const titleOf = (node) => node?.querySelector('label[for^="tick-"]')?.textContent.trim() ?? '';
		const before = titleOf(row);

		[...row.querySelectorAll('button')]
			.find((b) => /^Edit /.test(b.querySelector('span.sr-only')?.textContent.trim() ?? ''))
			?.click();
		await new Promise((r) => setTimeout(r, 80));

		const field = row.querySelector('input[name="task-title"]');
		if (!field) return { before, after: before, typed: '', hadField: false, editorClosed: false };

		const typed = `${before} (edited)`;
		field.focus();
		field.value = typed;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		/* Blur with nothing to click: focus leaves for the document body, which is the
		   case a `relatedTarget` guard has to get right. */
		field.blur();
		await new Promise((r) => setTimeout(r, 150));

		const now = document.querySelector('#tasks-card-list [id^="reveal-task-"]');
		return {
			before,
			typed,
			hadField: true,
			after: titleOf(now),
			editorClosed: !now?.querySelector('input[name="task-title"]')
		};
	});

	check(
		'the pencil opens an inline title editor',
		renamed.hadField === true,
		renamed.hadField ? '' : 'no input[name="task-title"] appeared'
	);
	check(
		'an inline rename commits on blur',
		renamed.after === renamed.typed && renamed.after !== renamed.before,
		`"${renamed.before}" -> "${renamed.after}"`
	);
	check('committing closes the editor', renamed.editorClosed === true);

	/* The grid must still be immovable with every editor in the tree. */
	const editCapped = await edit.evaluate(() => {
		const heights = [...document.querySelectorAll('.thrive-card-body')].map((b) =>
			Math.round(b.getBoundingClientRect().height)
		);
		return { heights, allEqual: new Set(heights).size === 1 };
	});
	check('editing did not move the grid', editCapped.allEqual === true, editCapped.heights.join(','));

	await edit.close();

	// ═══ Phase 7c: the calendar's editing surfaces ═════════════════════════
	/*
	 * Three things here that no other gate in this repo can see, and one that no
	 * gate anywhere could:
	 *
	 *  1. **The day figure agrees with the rows beneath it.** For two phases the
	 *     header counted a day's events while nothing rendered them, so a day read
	 *     "12" above ten rows. That gap closed when `DayEventsSection` landed, and
	 *     "closed" is a claim about LAYOUT -- it is a count of DOM nodes against a
	 *     rendered number, which needs a browser by definition. This is the check
	 *     that keeps it closed.
	 *  2. **The dialog is a real dialog.** Focus in, focus trapped, focus returned.
	 *     `role="dialog"` and `aria-modal="true"` are attributes anyone can type;
	 *     what they promise is behaviour, and the Next source made three of those
	 *     promises without keeping them. `svelte-check` cannot tell the difference
	 *     and neither can 553 unit tests -- there is no `document.activeElement` in
	 *     a Node process.
	 *  3. **Delete asks first.** A confirmation step is only a confirmation if the
	 *     first press does nothing, which is a statement about two presses.
	 */
	const cal = await browser.newPage({ viewport: DESKTOP });
	cal.on('pageerror', (error) => pageErrors.push(`calendar: ${error}`));
	cal.on('console', (msg) => noisy(msg) && pageErrors.push(`calendar: ${msg.text()}`));
	await cal.goto(BASE + '/calendar', { waitUntil: 'networkidle' });
	await cal.waitForTimeout(SETTLE);

	/** The day's figure, and every row rendered under it. Runs in the browser. */
	function readDay() {
		const header = document.querySelector('section[aria-labelledby="calendar-day-heading"]');
		/* The big number, read off the figure rather than recomputed. Its sr-only
		   twin follows it in the same paragraph, hence the leading-digits match. */
		const figure = Number(
			header?.querySelector('p')?.textContent.trim().match(/^\d+/)?.[0] ?? -1
		);

		/* `> ul > li` and not a descendant match: the wrapper `#day-items` section
		   also starts with "day-", and it contains every group. */
		const dayRows = document.querySelectorAll('section[aria-labelledby^="day-"] > ul > li').length;
		const eventRows = document.querySelectorAll(
			'section[aria-labelledby="calendar-happening"] > ul > li'
		).length;

		return { figure, dayRows, eventRows, rows: dayRows + eventRows };
	}

	/*
	 * Every day in the month that has anything on it, not a sampled one.
	 *
	 * The mismatch this guards against is per-category -- it appeared on days with
	 * EVENTS and nowhere else -- so a check that happened to land on a Tuesday of
	 * classes would have passed throughout the two phases the gap was open.
	 */
	const busyDays = await cal.evaluate(() =>
		[...document.querySelectorAll('button[data-day]')]
			.filter((cell) => !/no items/.test(cell.getAttribute('aria-label') ?? ''))
			.map((cell) => cell.dataset.day)
	);

	/**
	 * Select a day, paging the grid forward if the selection has left it behind.
	 *
	 * Choosing a day in an adjacent month pulls the view onto THAT month, which is
	 * correct behaviour and means the next day in an ascending walk may no longer
	 * be drawn. The grid spans six weeks, so one page forward is always enough.
	 */
	async function selectDay(day) {
		if (!(await cal.$(`button[data-day="${day}"]`))) {
			await cal.click('button[aria-label="Next month"]');
			await cal.waitForTimeout(60);
		}
		await cal.click(`button[data-day="${day}"]`);
		await cal.waitForTimeout(60);
	}

	const mismatches = [];
	/* Non-vacuous: at least one day must actually render an events section, or the
	   check above could not have caught the gap it exists for. Collected in the
	   same walk, because walking twice would page the grid twice. */
	const daysWithEvents = [];

	for (const day of busyDays) {
		await selectDay(day);
		const seen = await cal.evaluate(readDay);
		if (seen.figure !== seen.rows) mismatches.push(`${day}: ${seen.figure} vs ${seen.rows}`);
		if (seen.eventRows > 0) daysWithEvents.push({ day, ...seen });
	}

	check(
		'every day figure equals the rows rendered beneath it',
		busyDays.length > 0 && mismatches.length === 0,
		busyDays.length === 0
			? 'no day in this month has any items — the check proved nothing'
			: `${busyDays.length} days checked${mismatches.length ? `: ${mismatches.join(', ')}` : ''}`
	);

	check(
		'at least one of them rendered an events section',
		daysWithEvents.length > 0,
		daysWithEvents.length > 0
			? `${daysWithEvents.length} days, e.g. ${daysWithEvents[0].day} = ${daysWithEvents[0].dayRows} + ${daysWithEvents[0].eventRows}`
			: 'the figure/rows check could not have caught the 7a gap'
	);

	// ── The detail dialog ──────────────────────────────────────────────────
	/*
	 * Back to a known day, from a known month.
	 *
	 * The walk above left the grid on whichever month the last busy day belonged
	 * to. "Today" puts both the month and the selection back where they started,
	 * so the day chosen next is reachable by the same one-page rule.
	 */
	await cal.click('button:has-text("Today")');
	await cal.waitForTimeout(SETTLE);

	const eventDay = daysWithEvents[0]?.day ?? busyDays[0];
	if (eventDay) await selectDay(eventDay);
	await cal.waitForTimeout(SETTLE);

	const opened = await cal.evaluate(async () => {
		const trigger = document.querySelector('button[aria-label^="Details for "]');
		if (!trigger) return null;
		trigger.setAttribute('data-opener', '');
		trigger.click();
		await new Promise((r) => setTimeout(r, 120));

		const dialog = document.querySelector('[role="dialog"]');
		return {
			open: dialog !== null,
			modal: dialog?.getAttribute('aria-modal') ?? '',
			labelled: Boolean(document.getElementById(dialog?.getAttribute('aria-labelledby') ?? '')),
			focusInside: dialog?.contains(document.activeElement) === true,
			onClose: document.activeElement?.hasAttribute('data-dialog-close') === true
		};
	});

	if (!opened) {
		unproven('the details control opens a dialog', 'no row on this day offers one');
	} else {
		check('the details control opens a dialog', opened.open === true);
		check('it is announced as modal and named by its title', opened.modal === 'true' && opened.labelled);
		check('opening moves focus into the dialog', opened.focusInside === true);
		check(
			'focus lands on close, not in the label field',
			opened.onClose === true,
			'the common case is reading; stealing focus into an input makes Escape feel like a cancel'
		);

		/*
		 * Tab all the way round and out the other side.
		 *
		 * Twelve presses is more than the dialog has stops, so an untrapped one
		 * walks out into the page behind the scrim -- which is the whole failure.
		 * The trap wraps instead, so focus is still inside after any number.
		 */
		for (let i = 0; i < 12; i += 1) await cal.keyboard.press('Tab');
		check(
			'Tab is trapped inside the dialog',
			await cal.evaluate(
				() => document.querySelector('[role="dialog"]')?.contains(document.activeElement) === true
			),
			'12 presses, more stops than the dialog has'
		);

		await cal.keyboard.press('Shift+Tab');
		await cal.keyboard.press('Shift+Tab');
		check(
			'Shift+Tab is trapped too',
			await cal.evaluate(
				() => document.querySelector('[role="dialog"]')?.contains(document.activeElement) === true
			)
		);

		await cal.keyboard.press('Escape');
		await cal.waitForTimeout(SETTLE);
		const afterEscape = await cal.evaluate(() => ({
			open: document.querySelector('[role="dialog"]') !== null,
			onOpener: document.activeElement?.hasAttribute('data-opener') === true
		}));
		check('Escape closes the dialog', afterEscape.open === false);
		check(
			'closing returns focus to the control that opened it',
			afterEscape.onOpener === true,
			'a student who pressed details on row nine lands back on row nine'
		);

		/* An outside press is the other dismissal, and it goes through a
		   capture-phase listener so nothing downstream can swallow it. */
		await cal.evaluate(() => document.querySelector('[data-opener]')?.click());
		await cal.waitForTimeout(SETTLE);
		await cal.mouse.click(4, 4);
		await cal.waitForTimeout(SETTLE);
		check(
			'a press outside closes it as well',
			(await cal.evaluate(() => document.querySelector('[role="dialog"]'))) === null
		);
	}

	// ── Adding, and the two-step delete ────────────────────────────────────
	/*
	 * The add form's routing is proved in `calendarAdd.spec.ts`, one store at a
	 * time. What is left for a browser is that the form can be driven at all and
	 * that the row it produces really appears on the day — and a custom event is
	 * also the only kind of row that can be deleted, so this is the fixture the
	 * confirmation step needs.
	 */
	const TITLE = 'Gate-added event';
	const added = await cal.evaluate(async (title) => {
		[...document.querySelectorAll('button')]
			.find((b) => /Add to this day/i.test(b.textContent))
			?.click();
		await new Promise((r) => setTimeout(r, 100));

		const kind = document.querySelector('input[name="add-kind"][value="event"]');
		if (!kind) return { built: false };
		kind.click();

		const field = document.getElementById('add-item-title');
		field.focus();
		field.value = title;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 60));

		const submit = document.querySelector('form button[type="submit"]');
		const submitLabel = submit?.textContent.trim() ?? '';
		submit?.click();
		await new Promise((r) => setTimeout(r, 200));

		const rows = [...document.querySelectorAll('section[aria-labelledby^="day-"] > ul > li')];
		return {
			built: true,
			submitLabel,
			landed: rows.some((li) => li.textContent.includes(title)),
			formClosed: document.getElementById('add-item-title') === null
		};
	}, TITLE);

	if (!added.built) {
		unproven('the add form puts a new row on the day', 'the kind radios did not render');
	} else {
		check(
			'the submit button names the kind it will file under',
			/event/i.test(added.submitLabel),
			added.submitLabel
		);
		check('the add form puts a new row on the day', added.landed === true, TITLE);
		check('a successful add closes the form', added.formClosed === true);

		/* And the figure moved with it, which is the same agreement re-asserted
		   after a write rather than only on first paint. */
		const afterAdd = await cal.evaluate(readDay);
		check(
			'the figure still agrees after adding',
			afterAdd.figure === afterAdd.rows,
			`${afterAdd.figure} vs ${afterAdd.rows}`
		);

		const firstPress = await cal.evaluate(async (title) => {
			const row = [...document.querySelectorAll('section[aria-labelledby^="day-"] > ul > li')].find(
				(li) => li.textContent.includes(title)
			);
			row?.querySelector('button[aria-label^="Details for "]')?.click();
			await new Promise((r) => setTimeout(r, 120));

			const dialog = document.querySelector('[role="dialog"]');
			[...(dialog?.querySelectorAll('button') ?? [])]
				.find((b) => b.textContent.trim() === 'Delete')
				?.click();
			await new Promise((r) => setTimeout(r, 120));

			const live = document.querySelector('[role="dialog"]');
			return {
				stillOpen: live !== null,
				stillOnDay: [...document.querySelectorAll('section[aria-labelledby^="day-"] > ul > li')].some(
					(li) => li.textContent.includes(title)
				),
				asks: /cannot be undone/i.test(live?.textContent ?? ''),
				focusIsKeep: document.activeElement?.textContent.trim() === 'Keep it'
			};
		}, TITLE);

		check(
			'one press of Delete deletes nothing',
			firstPress.stillOnDay === true && firstPress.stillOpen === true,
			'a confirmation is only a confirmation if the first press is inert'
		);
		check('it asks, naming what it would destroy', firstPress.asks === true);
		check(
			'focus goes to the safe control, not the destructive one',
			firstPress.focusIsKeep === true,
			'so Enter agrees with the pointer, and a double-tap cannot delete'
		);

		const second = await cal.evaluate(async (title) => {
			const dialog = document.querySelector('[role="dialog"]');
			[...(dialog?.querySelectorAll('button') ?? [])]
				.find((b) => b.textContent.trim() === 'Delete for good')
				?.click();
			await new Promise((r) => setTimeout(r, 200));

			return {
				closed: document.querySelector('[role="dialog"]') === null,
				gone: ![...document.querySelectorAll('section[aria-labelledby^="day-"] > ul > li')].some(
					(li) => li.textContent.includes(title)
				)
			};
		}, TITLE);

		check('confirming deletes the row', second.gone === true);
		check('and closes the dialog behind it', second.closed === true);
	}

	// ── Joining an event ───────────────────────────────────────────────────
	/*
	 * The store key is pinned in `calendarEvents.spec.ts`. What is left for a
	 * browser is that the control writes at all, and that the heading's fraction
	 * follows it -- a count that does not move is how "count me in" quietly
	 * becomes decorative, which is precisely what Home's version is today.
	 */
	if (daysWithEvents.length > 0) {
		await selectDay(daysWithEvents[0].day);
		await cal.waitForTimeout(SETTLE);

		const joined = await cal.evaluate(async () => {
			const section = document.querySelector('section[aria-labelledby="calendar-happening"]');
			const countOf = () =>
				section?.querySelector('.thrive-numeric')?.textContent.trim() ?? '';
			const before = countOf();

			[...section.querySelectorAll('button')]
				.find((b) => /Count me in/i.test(b.textContent))
				?.click();
			await new Promise((r) => setTimeout(r, 150));

			return {
				before,
				after: countOf(),
				states: /You’re in/.test(section.textContent),
				offersExit: [...section.querySelectorAll('button')].some((b) =>
					/Remove from my list/i.test(b.textContent)
				),
				says: /Nobody was notified/i.test(section.textContent)
			};
		});

		check('joining states the fact', joined.states === true);
		check(
			'and offers a visible way out',
			joined.offersExit === true,
			'a control whose off-switch is invisible is one students are afraid to press'
		);
		check(
			'the joined fraction follows the button',
			joined.after !== joined.before,
			`${joined.before} -> ${joined.after}`
		);
		check('a joined row says nothing was sent anywhere', joined.says === true);
	} else {
		unproven('joining an event', 'no day in this month renders an events section');
	}


	// ── The join, across both surfaces, in the real app ────────────────────
	/*
	 * `calendarEvents.spec.ts` pins the stored key, and that is the assertion that
	 * would catch a key-space split. What it cannot do is prove the two SURFACES
	 * really share it, because a unit test does not render either of them: it can
	 * only exercise the paths it was told are the real ones.
	 *
	 * This does the round trip in the built app. Join on the calendar, navigate to
	 * Home, and the same event must say so — with nothing in between but a page
	 * load and `localStorage`.
	 *
	 * The pair matters. Home's control was inert for four phases BECAUSE this key
	 * space was unsettled, so wiring it without a cross-surface check would repeat
	 * the exact conditions of the 7a defect: two surfaces, one store, each
	 * self-consistent, nothing looking at both at once.
	 */
	if (daysWithEvents.length > 0) {
		const joinedTitle = await cal.evaluate(() => {
			const section = document.querySelector('section[aria-labelledby="calendar-happening"]');
			const li = [...(section?.querySelectorAll('li') ?? [])].find((row) =>
				/You’re in/.test(row.textContent)
			);
			return li?.querySelector('h4')?.textContent.trim() ?? null;
		});

		if (!joinedTitle) {
			unproven('a join made on the calendar shows on Home', 'nothing was joined above');
		} else {
			await cal.goto(BASE + ROUTE, { waitUntil: 'networkidle' });
			await cal.waitForTimeout(SETTLE);

			const onHome = await cal.evaluate((title) => {
				const row = [...document.querySelectorAll('article[id^="reveal-event-"]')].find((el) =>
					el.querySelector('h3')?.textContent.trim() === title
				);
				return {
					found: row !== undefined,
					states: /You’re in/.test(row?.textContent ?? ''),
					offersExit: [...(row?.querySelectorAll('button') ?? [])].some((b) =>
						/Remove from my list/i.test(b.textContent)
					)
				};
			}, joinedTitle);

			if (!onHome.found) {
				unproven(
					'a join made on the calendar shows on Home',
					`"${joinedTitle}" is not among Home's upcoming events`
				);
			} else {
				check(
					'a join made on the calendar shows on Home',
					onHome.states === true,
					`"${joinedTitle}" — one store, two surfaces, nothing in between but a page load`
				);
				check('and Home offers the same way out', onHome.offersExit === true);
			}
		}
	} else {
		unproven('a join made on the calendar shows on Home', 'no day rendered an events section');
	}

	// ── Home's own control, and the key it writes ──────────────────────────
	/*
	 * The other direction, and a cross-check the unit tests structurally cannot
	 * make: the id in the DOM and the id in the store arrive by two different
	 * routes — `revealRowId()` builds the row's `id` attribute, the click handler
	 * passes `event.id` to `setEventJoined`. If those ever disagree, the popover
	 * would jump to a row the store has never heard of.
	 */
	const home = await browser.newPage({ viewport: DESKTOP, acceptDownloads: true });
	home.on('pageerror', (error) => pageErrors.push(`home-join: ${error}`));
	home.on('console', (msg) => noisy(msg) && pageErrors.push(`home-join: ${msg.text()}`));

	/*
	 * Capture the .ics instead of catching the download.
	 *
	 * `downloadIcs` builds a Blob, makes an object URL and clicks an anchor. Asserting
	 * that a download FIRED would prove the button is wired and nothing else — and
	 * "wired" is not the interesting claim, since the file is read by a calendar
	 * client rather than by a person and an unescaped comma or a wrong DTSTART
	 * imports "successfully" and is wrong.
	 *
	 * So this wraps `createObjectURL` before the page loads and keeps the text. The
	 * assertions below are about the CONTENT: the right event, at the right instant.
	 */
	await home.addInitScript(() => {
		const original = URL.createObjectURL.bind(URL);
		window.__icsFiles = [];
		URL.createObjectURL = (blob) => {
			if (blob instanceof Blob && blob.type.includes('calendar')) {
				blob.text().then((text) => window.__icsFiles.push(text));
			}
			return original(blob);
		};
	});

	await home.goto(BASE + ROUTE, { waitUntil: 'networkidle' });
	await home.waitForTimeout(SETTLE);

	const homeJoin = await home.evaluate(async () => {
		const row = document.querySelector('article[id^="reveal-event-"]');
		if (!row) return null;

		const rowId = row.id;
		[...row.querySelectorAll('button')]
			.find((b) => /Count me in/i.test(b.textContent))
			?.click();
		await new Promise((r) => setTimeout(r, 150));

		const now = document.getElementById(rowId);
		return {
			rowId,
			states: /You’re in/.test(now?.textContent ?? ''),
			offersExit: [...(now?.querySelectorAll('button') ?? [])].some((b) =>
				/Remove from my list/i.test(b.textContent)
			),
			says: /Nobody was notified/i.test(now?.textContent ?? ''),
			stored: Object.keys(JSON.parse(localStorage.getItem('thrive:event-joins') ?? '{}'))
		};
	});

	if (!homeJoin) {
		unproven("Home's join control writes the raw Event.id", 'no event rows on Home');
	} else {
		check("Home's join states the fact", homeJoin.states === true);
		check('and offers a visible way out', homeJoin.offersExit === true);
		check('a joined row on Home says nothing was sent anywhere', homeJoin.says === true);

		/*
		 * The row's DOM id is `reveal-event-<raw Event.id>`. The store key must be
		 * that same raw id — not the calendar's `evt-evt-` form, and not `3-1`,
		 * which is what `eventIdOf` produces if it is wrongly applied here.
		 */
		const expected = homeJoin.rowId.replace(/^reveal-event-/, '');
		check(
			"Home's join control writes the raw Event.id",
			homeJoin.stored.length === 1 && homeJoin.stored[0] === expected,
			`stored ${JSON.stringify(homeJoin.stored)}, row is ${homeJoin.rowId}`
		);

		const undone = await home.evaluate(async (rowId) => {
			[...(document.getElementById(rowId)?.querySelectorAll('button') ?? [])]
				.find((b) => /Remove from my list/i.test(b.textContent))
				?.click();
			await new Promise((r) => setTimeout(r, 150));
			return {
				backToOffer: /Count me in/i.test(document.getElementById(rowId)?.textContent ?? ''),
				stored: Object.keys(JSON.parse(localStorage.getItem('thrive:event-joins') ?? '{}'))
			};
		}, homeJoin.rowId);

		check('leaving puts the offer back', undone.backToOffer === true);
		check(
			'and deletes the key rather than storing false',
			undone.stored.length === 0,
			'which is what makes "never touched" answerable'
		);
	}


	// ── Home's "Add to calendar" ───────────────────────────────────────────
	/*
	 * The last inert control in the app, wired after the join. Nothing leaves the
	 * browser: this builds a file the student chooses to import, and there is no
	 * calendar API call anywhere in the path.
	 */
	const exported = await home.evaluate(async () => {
		const row = document.querySelector('article[id^="reveal-event-"]');
		if (!row) return null;

		const title = row.querySelector('h3')?.textContent.trim() ?? '';
		[...row.querySelectorAll('button')]
			.find((b) => /Add to calendar/i.test(b.textContent))
			?.click();
		await new Promise((r) => setTimeout(r, 200));

		return { title, rowId: row.id, files: window.__icsFiles ?? [] };
	});

	if (!exported) {
		unproven('the Add to calendar button produces an .ics', 'no event rows on Home');
	} else {
		const text = exported.files[0] ?? '';
		const lines = text.split('\r\n');

		check(
			'the Add to calendar button produces an .ics',
			exported.files.length === 1,
			`${exported.files.length} file(s) captured`
		);
		check(
			'it is a valid single-event calendar',
			lines[0] === 'BEGIN:VCALENDAR' &&
				lines.at(-1) === 'END:VCALENDAR' &&
				lines.filter((l) => l === 'BEGIN:VEVENT').length === 1
		);
		check(
			'it names the event the row is showing',
			lines.some((l) => l.startsWith('SUMMARY:') && l.includes(exported.title.slice(0, 20))),
			exported.title
		);
		check(
			'it carries a real DTSTART, not a placeholder',
			lines.some((l) => /^DTSTART:\d{8}T\d{6}Z$/.test(l)),
			lines.find((l) => l.startsWith('DTSTART:')) ?? 'none'
		);
		/*
		 * The UID must be the RAW `Event.id` — the same id the join store keys on and
		 * the same one the row's DOM id carries. If Home ever exported the calendar's
		 * doubly-prefixed form, importing the same event from the two surfaces would
		 * make two entries in the student's real calendar instead of updating one.
		 */
		check(
			'the UID is the raw Event.id, so re-importing updates rather than duplicates',
			lines.includes(`UID:${exported.rowId.replace(/^reveal-event-/, '')}@thrive.local`),
			lines.find((l) => l.startsWith('UID:')) ?? 'none'
		);
	}

	await home.close();

	await cal.close();

	// ═══ The program strip's term plans ════════════════════════════════════
	/*
	 * Six triggers over one region, and the claims worth making are about MEANING
	 * rather than mechanics.
	 *
	 * The failure this guards is a student reading a suggestion as a registration.
	 * A list of course codes under a term heading looks exactly like an enrolment,
	 * so three things carry the difference and all three are asserted: the
	 * heading's wording, a standing note saying nothing was registered, and the AI
	 * attribution. If any one of them goes the list starts lying.
	 */
	const strip = await browser.newPage({ viewport: DESKTOP });
	strip.on('pageerror', (error) => pageErrors.push(`strip: ${error}`));
	strip.on('console', (msg) => noisy(msg) && pageErrors.push(`strip: ${msg.text()}`));
	await strip.goto(BASE + '/', { waitUntil: 'networkidle' });
	await strip.waitForTimeout(SETTLE);

	const PIP = '[aria-controls="program-term-plan"]';

	const shut = await strip.evaluate((sel) => {
		const pips = [...document.querySelectorAll(sel)];
		return {
			count: pips.length,
			expanded: pips.filter((p) => p.getAttribute('aria-expanded') === 'true').length,
			/* Shut means ABSENT from the DOM, so it is out of the tab order. */
			panelChildren: document.querySelector('#program-term-plan')?.children.length ?? null,
			named: pips.every((p) => /show classes for/i.test(p.getAttribute('aria-label') ?? '')),
			docHeight: document.documentElement.scrollHeight
		};
	}, PIP);

	check(
		'every term on the strip is pressable, including the current one',
		shut.count === 6,
		`${shut.count} pips — a strip where five of six are pressable reads as broken`
	);
	check(
		'each pip says what it opens',
		shut.named === true,
		'"Show classes for Fall 2026" — a pip is otherwise an 8px bar with no name'
	);
	check(
		'nothing is open on arrival, and the region is empty rather than hidden',
		shut.expanded === 0 && shut.panelChildren === 0,
		`${shut.expanded} expanded, ${shut.panelChildren} children in the region`
	);

	const pips = await strip.$$(PIP);

	/* The CURRENT term: enrolments, which are facts. */
	await pips[0].click();
	await strip.waitForTimeout(SETTLE);
	const enrolled = await strip.evaluate((sel) => {
		const panel = document.querySelector('#program-term-plan');
		const text = (panel?.textContent ?? '').replace(/\s+/g, ' ');
		return {
			text,
			rows: panel?.querySelectorAll('li').length ?? 0,
			expanded: [...document.querySelectorAll(sel)].filter(
				(p) => p.getAttribute('aria-expanded') === 'true'
			).length
		};
	}, PIP);

	check(
		'the current term opens its ENROLLED classes, not suggestions',
		/your classes/i.test(enrolled.text) &&
			!/suggested/i.test(enrolled.text) &&
			enrolled.rows > 0,
		`${enrolled.rows} rows, headed "Your classes" — these are facts, so no badge and no disclaimer`
	);
	check(
		'an enrolled row says when the class meets',
		/\b(Mon|Tue|Wed|Thu|Fri)/.test(enrolled.text) && /\d:\d\d/.test(enrolled.text),
		'the meeting pattern, formatted on the server like every other date here'
	);
	check(
		'the real catalogue is what renders',
		/MGTA45[23]/.test(enrolled.text),
		'real course numbers, not the invented MGT 142 / MGT 100 placeholders'
	);

	/*
	 * A FUTURE term: suggestions, which are not.
	 *
	 * Index 2 (Winter 2027) rather than the next one along, deliberately: it is the
	 * only future term in the catalogue holding BOTH a core course and electives,
	 * so the "core is distinguishable" check has something to distinguish. Fall
	 * 2026 is three electives, and the assertion passed there by finding no core at
	 * all -- which is the vacuous-pass shape this repo has been bitten by twice.
	 */
	await pips[2].click();
	await strip.waitForTimeout(SETTLE);
	const suggested = await strip.evaluate((sel) => {
		const panel = document.querySelector('#program-term-plan');
		const text = (panel?.textContent ?? '').replace(/\s+/g, ' ');
		return {
			text,
			rows: panel?.querySelectorAll('li').length ?? 0,
			svgs: panel?.querySelectorAll('svg').length ?? 0,
			spoken: [...(panel?.querySelectorAll('.sr-only') ?? [])].map((s) => s.textContent.trim()),
			expanded: [...document.querySelectorAll(sel)].filter(
				(p) => p.getAttribute('aria-expanded') === 'true'
			).length
		};
	}, PIP);

	check(
		'a future term is unmistakably SUGGESTIONS',
		/suggested for/i.test(suggested.text) && !/your classes/i.test(suggested.text),
		`headed "Suggested for", ${suggested.rows} rows`
	);
	check(
		'and says out loud that nothing was registered',
		/nothing here is registered/i.test(suggested.text) &&
			/nothing was sent to the program/i.test(suggested.text),
		'the heading alone cannot out-argue a list that looks like an enrolment'
	);
	check(
		'the AI attribution is present, with an icon and a spoken sentence',
		/ai suggested/i.test(suggested.text) &&
			suggested.svgs > 0 &&
			suggested.spoken.some((s) => /suggested by the thrive assistant/i.test(s)),
		`"AI suggested" plus the sparkle, spoken as "${suggested.spoken.find((s) => /assistant/i.test(s)) ?? '(none)'}"`
	);
	check(
		'core is distinguishable from elective in the list',
		/\bcore\b/.test(suggested.text) && /\belective\b/.test(suggested.text),
		'a core course is not really a suggestion, and the tag is text rather than a colour'
	);
	check(
		'a core course carries no invented recommendation',
		/required for the degree/i.test(suggested.text),
		'"Required for the degree" — writing advice beside something compulsory would be pretending'
	);
	check(
		'only one term is open at a time',
		suggested.expanded === 1,
		'six panels open at once and Home stops fitting a screen by the third'
	);

	/* Pressing the open pip closes it, so the strip is never stuck open. */
	await pips[2].click();
	await strip.waitForTimeout(SETTLE);
	const reclosed = await strip.evaluate(
		() => document.querySelector('#program-term-plan')?.children.length ?? null
	);
	check(
		'pressing an open term closes it again',
		reclosed === 0,
		'an accordion with no way back is a strip stuck open'
	);
	await strip.close();

	/* And the pip is a real touch target on a phone, where it is an 8px bar. */
	const stripPhone = await browser.newPage({ viewport: PHONE, hasTouch: true, isMobile: true });
	await stripPhone.goto(BASE + '/', { waitUntil: 'networkidle' });
	await stripPhone.waitForTimeout(SETTLE);
	const pipHeight = await stripPhone.evaluate((sel) => {
		const p = document.querySelector(sel);
		return p ? Math.round(p.getBoundingClientRect().height) : null;
	}, PIP);
	check(
		'a term pip is a 44px touch target on a phone',
		pipHeight !== null && pipHeight >= 44,
		`${pipHeight}px around an 8px bar`
	);
	await stripPhone.close();

	// ═══ Provenance: the Canvas pill ═══════════════════════════════════════
	/*
	 * `sources.spec.ts` pins the DECISION -- absent or unknown origin renders
	 * nothing. What a unit test cannot see is whether the pill reached the rows,
	 * because Vitest renders nothing at all.
	 *
	 * Three claims a browser can make and nothing else can:
	 *
	 *  1. It is ON a class row on Home, and on the calendar's rows.
	 *  2. Its accessible name is a SENTENCE, not the bare product name. The
	 *     visible text is `aria-hidden` and an `sr-only` span carries "From
	 *     Canvas" -- a screen reader hearing only "Canvas" beside a title learns
	 *     the word and nothing about why it is there.
	 *  3. Rows with no origin carry NO pill. This is the negative that would
	 *     otherwise ship as an empty badge on every row and be read as a styling
	 *     glitch rather than reported as a bug.
	 */
	const prov = await browser.newPage({ viewport: DESKTOP });
	prov.on('pageerror', (error) => pageErrors.push(`source: ${error}`));
	prov.on('console', (msg) => noisy(msg) && pageErrors.push(`source: ${msg.text()}`));

	const readSourcePills = () => {
		const pills = [...document.querySelectorAll('span')].filter((s) => {
			const hidden = s.querySelector(':scope > [aria-hidden="true"]');
			const sr = s.querySelector(':scope > .sr-only');
			return hidden && sr && /^(Canvas|Handshake|You)$/.test(hidden.textContent?.trim() ?? '');
		});
		return {
			count: pills.length,
			visible: pills[0]?.querySelector('[aria-hidden="true"]')?.textContent?.trim() ?? null,
			spoken: pills[0]?.querySelector('.sr-only')?.textContent?.trim() ?? null,
			/* Empty badge check: a bordered pill with no text at all. */
			empty: pills.filter((p) => (p.textContent ?? '').trim() === '').length
		};
	};

	await prov.goto(BASE + '/', { waitUntil: 'networkidle' });
	await prov.waitForTimeout(SETTLE);
	const homePills = await prov.evaluate(readSourcePills);

	check(
		'a class on Home says it came from Canvas',
		homePills.count > 0,
		`${homePills.count} provenance pill(s) on Home`
	);
	check(
		'the pill speaks a sentence rather than a bare product name',
		homePills.spoken !== null && /^From /.test(homePills.spoken) && homePills.visible === 'Canvas',
		`visible "${homePills.visible}", spoken "${homePills.spoken}"`
	);
	check(
		'no pill renders empty',
		homePills.empty === 0,
		`${homePills.empty} empty badge(s) — an absent origin must render nothing at all`
	);

	/*
	 * And on Home's TASK rows, which is the negative case with a surface attached:
	 * `Task` carries no origin in the fixtures, so a task row must have no pill
	 * even though a class row three inches away does.
	 */
	const taskRowPills = await prov.evaluate(() => {
		/* `.thrive-row` is ON the row element, which IS the listitem -- TaskRow
		   renders `role="listitem"` itself rather than wrapping in an `<li>`. A row
		   is a task row when it holds a checkbox; a class row does not. */
		const rows = [...document.querySelectorAll('.thrive-row')].filter((r) =>
			r.querySelector('input[type="checkbox"]')
		);
		return {
			rows: rows.length,
			withPill: rows.filter((r) =>
				[...r.querySelectorAll('span')].some((s) => /^Canvas$/.test(s.textContent?.trim() ?? ''))
			).length
		};
	});
	check(
		"Home's task rows carry no pill, because a task is not an assignment",
		taskRowPills.rows > 0 && taskRowPills.withPill === 0,
		`${taskRowPills.withPill} of ${taskRowPills.rows} task rows — unmarked by instruction, not by accident`
	);

	await prov.goto(BASE + '/calendar', { waitUntil: 'networkidle' });
	await prov.waitForTimeout(SETTLE);
	const calPills = await prov.evaluate(readSourcePills);
	check(
		"the calendar's class and assignment rows say so too",
		calPills.count > 0 && calPills.empty === 0,
		`${calPills.count} pill(s), ${calPills.empty} empty`
	);
	await prov.close();

	// ═══ The page measure, and the calendar's order ════════════════════════
	/*
	 * Four spatial claims, all of which need a real layout engine.
	 *
	 *  1. **A page fills the room the gutter leaves it** at 1512, where the caps do
	 *     not bite. Asserted as a RELATIONSHIP to the available room rather than as
	 *     a pixel count, so it survives a different viewport.
	 *  2. **There is a visible gutter.** This is the one that regressed: the measure
	 *     went 72rem -> 96rem to fix ~120px of dead margin, and overshot so far that
	 *     the cap stopped biting at 1512 and the gutter collapsed to the shell's
	 *     20px of padding. Content ran to the edge.
	 *  3. **The cap bites on a big monitor.** At 1920 every page must STOP rather
	 *     than stretch, on the SAME cap. `/calendar` had its own 96rem cap for a
	 *     while; that is gone, because it left the busiest page with a 127px gutter
	 *     while every other route had 248px.
	 *  4. **The calendar shows the calendar first.** The Key used to sit above the
	 *     month grid and pushed its top edge to 472px on a 1052px laptop; then it
	 *     was a column beside it and the grid started at 223px but was only 927px
	 *     wide. It is now a disclosure on the header row: grid top 169px, 1198px
	 *     wide.
	 *
	 * The prose assertion is the counterweight to all of it: changing a container
	 * must NOT change the paragraphs, or the page trades one problem for a worse one.
	 */
	const wide = await browser.newPage({ viewport: DESKTOP });
	wide.on('pageerror', (error) => pageErrors.push(`width: ${error}`));
	wide.on('console', (msg) => noisy(msg) && pageErrors.push(`width: ${msg.text()}`));

	const readMeasure = () => {
		const box = (el) => (el ? el.getBoundingClientRect() : null);
		/*
		 * `main`'s CONTENT box, not its border box. It carries the page's side
		 * gutters (`sm:px-5`), so comparing the page's measure against the outer
		 * width would report a 40px shortfall that is the gutter doing its job.
		 */
		const mainEl = document.querySelector('#main-content');
		const mainStyle = mainEl ? getComputedStyle(mainEl) : null;
		const main =
			mainEl && mainStyle
				? {
						width:
							mainEl.clientWidth -
							parseFloat(mainStyle.paddingLeft) -
							parseFloat(mainStyle.paddingRight)
					}
				: null;
		const content = box(document.querySelector('#main-content > *'));
		/* The gutter on the RIGHT, which is the side with no rail beside it and
		   therefore the side where "against the edge" is visible. */
		const gutterRight = content ? Math.round(window.innerWidth - content.right) : null;
		/* The ROOT SIZE, so a cap can be asserted in the unit it is written in.
		   `--container-page` is 80rem, not 1280px, and the root is 15px on desktop
		   and 16px below 64rem -- so a px expectation here silently encodes the
		   root and breaks the day it changes. It did exactly that. */
		const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
		let prose = 0;
		for (const el of document.querySelectorAll('p')) {
			const r = el.getBoundingClientRect();
			if (r.height > 0 && (el.textContent ?? '').trim().length > 60) {
				prose = Math.max(prose, Math.round(r.width));
			}
		}
		return {
			main: main ? Math.round(main.width) : null,
			content: content ? Math.round(content.width) : null,
			gutterRight,
			root,
			prose
		};
	};

	for (const route of ['/', '/calendar', '/appointments', '/ask/resources']) {
		await wide.goto(BASE + route, { waitUntil: 'networkidle' });
		await wide.waitForTimeout(SETTLE);
		const m = await wide.evaluate(readMeasure);

		/*
		 * The real invariant, which the earlier version of this check got wrong.
		 *
		 * It asserted `main - content <= 4` -- "the page always fills its gutter
		 * box" -- which was true only while the caps were wider than any viewport
		 * this runs at. The moment the root font-size dropped to 15px the caps
		 * (80rem / 96rem) shrank with it and started biting at 1512, and three
		 * routes went red for being CORRECTLY capped.
		 *
		 * What actually has to hold is: the content never overflows its gutter box,
		 * and it is narrower than that box only because a cap said so -- never for
		 * some third reason nobody chose.
		 */
		const capped =
			m.content !== null &&
			m.root !== null &&
			Math.abs(m.content - 80 * m.root) <= 4;
		check(
			`${route} is limited by its gutter or by its cap, and nothing else`,
			m.content !== null &&
				m.main !== null &&
				m.content <= m.main + 4 &&
				(m.main - m.content <= 4 || capped),
			`content ${m.content}px in a ${m.main}px gutter box at root ${m.root}px` +
				(capped ? ' — at its cap' : ' — gutter-limited')
		);
		check(
			`${route} keeps a visible gutter`,
			(m.gutterRight ?? 0) >= 32,
			`${m.gutterRight}px on the right (was 20px, which read as edge-to-edge)`
		);

		if (m.prose > 0) {
			check(
				`${route} does not widen its prose with its container`,
				m.prose <= 800,
				`widest paragraph ${m.prose}px — capped by --container-measure at 68ch`
			);
		}
	}

	// ── The caps, on a monitor big enough for them to bite ─────────────────
	/*
	 * At 1512 every route is gutter-limited to the same width, so the two caps are
	 * indistinguishable there. 1920 is the smallest common size where they separate,
	 * which is the only place this can be checked at all.
	 */
	await wide.setViewportSize({ width: 1920, height: 1052 });

	/** Gutter per route at 1920, so the routes can be compared to each other. */
	const gutterAt1920 = new Map();

	/*
	 * Ceilings in REM, resolved against the measured root. `--container-page` is
	 * 80rem; writing 1280 here encoded a 16px root as a fact and broke when it
	 * became 15.
	 *
	 * One cap for all four routes now. `--container-wide` (96rem) existed for
	 * `/calendar` and has been deleted along with the token -- so if a route ever
	 * wants a second cap, this loop is where it has to be declared, rather than a
	 * page quietly reaching for a general-purpose "wide".
	 */
	for (const [route, capRem] of [
		['/', 80],
		['/appointments', 80],
		['/ask/resources', 80],
		['/calendar', 80]
	]) {
		await wide.goto(BASE + route, { waitUntil: 'networkidle' });
		await wide.waitForTimeout(SETTLE);
		const m = await wide.evaluate(readMeasure);
		const ceiling = capRem * (m.root ?? 16);
		gutterAt1920.set(route, m.gutterRight);

		check(
			`${route} stops growing at its cap on a 1920px screen`,
			m.content !== null && Math.abs(m.content - ceiling) <= 4,
			`${m.content}px against a ${capRem}rem cap = ${Math.round(ceiling)}px at root ${m.root}px, gutter ${m.gutterRight}px`
		);
	}

	/*
	 * THE CHECK THAT REPLACED "the calendar is allowed more width than the rest".
	 *
	 * That one was asserted as a literal `true` with a sentence for a reason, which
	 * is not an assertion at all -- and the sentence went stale the moment the cap
	 * did. The claim worth holding is the one the owner actually asked for: the
	 * calendar gets THE SAME breathing room as everything else. On a 1920px screen
	 * the old 96rem cap left it a 127px gutter while every other route had 248px.
	 */
	check(
		'the calendar has the same gutter as every other route at 1920px',
		gutterAt1920.get('/calendar') !== null &&
			gutterAt1920.get('/calendar') === gutterAt1920.get('/'),
		`calendar ${gutterAt1920.get('/calendar')}px, home ${gutterAt1920.get('/')}px ` +
			`(calendar was 127px against home's 248px on the 96rem cap)`
	);

	await wide.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });

	// ── The calendar's vertical order ───────────────────────────────────────
	await wide.goto(BASE + '/calendar', { waitUntil: 'networkidle' });
	await wide.evaluate(() =>
		localStorage.setItem('thrive:calendar-prefs', JSON.stringify({ value: { view: 'month' } }))
	);
	await wide.reload({ waitUntil: 'networkidle' });
	await wide.waitForTimeout(SETTLE);

	const KEY_TRIGGER = '[aria-controls="calendar-key-panel"]';

	const arrangement = await wide.evaluate((trigger) => {
		const grid = document.querySelector('[role="grid"]')?.closest('.thrive-panel') ?? null;
		const g = grid?.getBoundingClientRect();
		const t = document.querySelector(trigger);
		const key = document.querySelector('#calendar-key-panel');
		const k = key?.getBoundingClientRect();
		return {
			gridTop: g ? Math.round(g.top + window.scrollY) : null,
			gridWidth: g ? Math.round(g.width) : null,
			gridRight: g ? Math.round(g.right) : null,
			/* The panel is always in the DOM now — it has two jobs at two widths and
			   only one instance may exist. So what is asserted at each width is
			   whether it is DISPLAYED, not whether it is present. */
			keyVisible: key ? getComputedStyle(key).display !== 'none' : null,
			keyLeft: k ? Math.round(k.left) : null,
			keyWidth: k ? Math.round(k.width) : null,
			keyTop: k ? Math.round(k.top + window.scrollY) : null,
			/* The trigger is `xl:hidden`: above `xl` there is nothing to toggle. */
			triggerVisible: t ? getComputedStyle(t).display !== 'none' : null,
			triggerLabel: (t?.textContent ?? '').replace(/\s+/g, ' ').trim(),
			viewportHeight: window.innerHeight
		};
	}, KEY_TRIGGER);

	check(
		'the month grid starts well above the fold',
		arrangement.gridTop !== null && arrangement.gridTop < 320,
		`grid top ${arrangement.gridTop}px of a ${arrangement.viewportHeight}px viewport (472 above the Key, 202 beside it)`
	);
	check(
		'the month grid uses the width it was given',
		(arrangement.gridWidth ?? 0) > 1000,
		`${arrangement.gridWidth}px (672 at max-w-2xl, 927 beside an 18rem Key, 1198 with no Key column)`
	);

	/*
	 * ── The Key is a side panel above `xl` ─────────────────────────────────
	 *
	 * Its third arrangement in a day, and the numbers are why. As an 18rem column
	 * the grid was 927px. As a full-width disclosure the grid was 1198px, but
	 * opening it pushed the whole month down the page and eleven stream rows sat in
	 * a narrow left column with most of 1200px empty beside them. It is a column
	 * again at 11rem, sized from its content, and the grid is 1023px.
	 *
	 * A side panel and a full-width grid cannot both exist. 1023 is the trade,
	 * stated rather than smuggled — and it is still 96px more than the old column
	 * gave, because the column is 7rem narrower.
	 *
	 * Five claims:
	 *
	 *  1. It is BESIDE the grid, not above it. Asserted on geometry.
	 *  2. It is always displayed here, and the trigger is not — a button offering to
	 *     open something already on screen is a button with no job.
	 *  3. It stays narrow. If it ever widens, the grid pays, so the width has a
	 *     ceiling in the check rather than a comment.
	 *  4. No stream name wraps. That is what the 11rem was measured against.
	 *  5. Both dimensions and every filter survive the move.
	 */
	check(
		'the Key sits beside the grid, not above it',
		arrangement.keyLeft !== null &&
			arrangement.gridRight !== null &&
			arrangement.keyLeft >= arrangement.gridRight - 4,
		`Key starts at ${arrangement.keyLeft}, grid ends at ${arrangement.gridRight}`
	);
	check(
		'the Key is always visible on a desktop, and its trigger is not',
		arrangement.keyVisible === true && arrangement.triggerVisible === false,
		`panel displayed: ${arrangement.keyVisible}, trigger displayed: ${arrangement.triggerVisible}`
	);
	check(
		'the Key column stays narrow enough that the grid keeps the page',
		(arrangement.keyWidth ?? 0) > 0 && (arrangement.keyWidth ?? 0) <= 200,
		`${arrangement.keyWidth}px from --thrive-key-width (11rem), against 18rem before`
	);

	const keyOpened = await wide.evaluate(() => {
		const panel = document.querySelector('#calendar-key-panel');
		if (!panel) return null;
		const streams = [...panel.querySelectorAll('[aria-labelledby="key-streams"] > li')];
		return {
			streamsHeading: panel.querySelector('#key-streams')?.textContent?.trim() ?? null,
			labelsHeading: panel.querySelector('#key-labels')?.textContent?.trim() ?? null,
			labelledLists: panel.querySelectorAll(
				'[aria-labelledby="key-streams"], [aria-labelledby="key-labels"]'
			).length,
			checkboxes: panel.querySelectorAll('input[type="checkbox"], [role="checkbox"], button[aria-pressed]')
				.length,
			/* A wrapped row is taller than one line of 12.75px text plus padding. The
			   whole justification for 11rem is that "appointment" fits on one line. */
			wrappedRows: streams.filter((li) => {
				const label = li.querySelector('label');
				return label ? label.getBoundingClientRect().height > 34 : false;
			}).length
		};
	});

	if (!keyOpened) {
		check(
			'the Key panel is on the page',
			false,
			'no #calendar-key-panel — the only route to every filter'
		);
	} else {
		check(
			'no stream name wraps in the narrow column',
			keyOpened.wrappedRows === 0,
			`${keyOpened.wrappedRows} wrapped of 11 — 11rem was measured against "appointment"`
		);
		/*
		 * The labels dimension renders only when the data HAS labels, so this is two
		 * claims rather than one: streams is always its own labelled list, and when
		 * labels appear they appear as a SECOND one. What it rules out is the
		 * flattening — one undifferentiated list of chips from both dimensions.
		 */
		check(
			'the Key still keeps streams and labels as two dimensions',
			keyOpened.streamsHeading !== null &&
				keyOpened.labelledLists === (keyOpened.labelsHeading === null ? 1 : 2),
			`streams "${keyOpened.streamsHeading}", labels "${keyOpened.labelsHeading}", ` +
				`${keyOpened.labelledLists} separately-labelled list(s)`
		);
		check(
			'every filter is still reachable in the Key panel',
			keyOpened.checkboxes >= 6,
			`${keyOpened.checkboxes} filter controls inside the panel`
		);

		/*
		 * ── The streams are a column, and the dots line up ──────────────────
		 *
		 * Eleven chips used to wrap into four ragged rows, where the dot -- the thing
		 * that ties a name to a colour in the grid -- landed at a different x on
		 * every line. One per line is the claim, and "the dots form ONE column" is
		 * the part that is actually load-bearing: a `flex-col` list whose rows are
		 * not `w-full` would still be one per line while the dots stayed put, so
		 * asserting the layout direction alone would not catch the regression.
		 */
		const streams = await wide.evaluate(() => {
			const items = [...document.querySelectorAll('[aria-labelledby="key-streams"] > li')];
			if (items.length === 0) return null;
			const dots = items.map((li) => {
				const d = li.querySelector('span[aria-hidden="true"]');
				return d ? Math.round(d.getBoundingClientRect().left) : null;
			});
			const rows = items.map((li) => li.getBoundingClientRect());
			return {
				count: items.length,
				distinctTops: new Set(rows.map((r) => Math.round(r.top))).size,
				dotColumns: new Set(dots).size,
				rowHeight: Math.round(rows[0].height * 100) / 100,
				/* Struck-through when off is the non-colour cue, and it has to survive
				   the row rewrite. */
				pressedStates: items.filter((li) => li.querySelector('input:checked')).length
			};
		});

		if (!streams) {
			check('the Key lists every stream', false, 'no stream rows found');
		} else {
			check(
				'each stream is on its own line',
				streams.distinctTops === streams.count,
				`${streams.count} streams on ${streams.distinctTops} lines (was 11 on 4)`
			);
			check(
				'and every dot sits in one column',
				streams.dotColumns === 1,
				`${streams.dotColumns} distinct dot x-position(s) across ${streams.count} rows`
			);
			check(
				'a stream row is still a real, checked control',
				streams.pressedStates > 0,
				`${streams.pressedStates} of ${streams.count} checked — the checkbox carries the state, not the fill`
			);
		}
	}
	await wide.close();

	// ── And on a phone the grid still comes BEFORE the Key's trigger ───────
	const narrow = await browser.newPage({ viewport: PHONE, hasTouch: true, isMobile: true });
	narrow.on('pageerror', (error) => pageErrors.push(`width-phone: ${error}`));
	await narrow.goto(BASE + '/calendar', { waitUntil: 'networkidle' });
	await narrow.evaluate(() =>
		localStorage.setItem('thrive:calendar-prefs', JSON.stringify({ value: { view: 'month' } }))
	);
	await narrow.reload({ waitUntil: 'networkidle' });
	await narrow.waitForTimeout(SETTLE);

	/*
	 * On a phone the trigger is ABOVE the grid, which is the opposite of the old
	 * claim and is correct: it is one 44px row, not an 18rem panel, so it costs the
	 * grid one row rather than a screenful. What still has to hold is that the
	 * PANEL does not push the grid down until it is asked to.
	 */
	const stacked = await narrow.evaluate((trigger) => {
		const grid = document.querySelector('[role="grid"]')?.closest('.thrive-panel');
		const t = document.querySelector(trigger);
		if (!grid || !t) return null;
		const box = t.getBoundingClientRect();
		const panel = document.querySelector('#calendar-key-panel');
		return {
			gridTop: Math.round(grid.getBoundingClientRect().top + window.scrollY),
			triggerHeight: Math.round(box.height),
			keyVisible: panel ? getComputedStyle(panel).display !== 'none' : null
		};
	}, KEY_TRIGGER);

	if (!stacked) {
		unproven('on a phone the Key is a disclosure below the grid', 'could not find the grid or the trigger');
	} else {
		check(
			'on a phone the Key is closed on arrival',
			stacked.keyVisible === false && stacked.gridTop < 300,
			`grid top ${stacked.gridTop}px, trigger ${stacked.triggerHeight}px tall, panel not displayed`
		);
		check(
			'the Key trigger is still a 44px touch target on a phone',
			stacked.triggerHeight >= 44,
			`${stacked.triggerHeight}px`
		);

		/*
		 * And the rows INSIDE it. The streams became one-per-line rows at
		 * `lg:min-h-8` (30px), which is a desktop height -- on a phone they have to
		 * stay a full 44px, and `min-h-11` at a 16px root is exactly that.
		 */
		await narrow.click(KEY_TRIGGER);
		await narrow.waitForTimeout(SETTLE);
		const phoneOpen = await narrow.evaluate(() => {
			const li = document.querySelector('[aria-labelledby="key-streams"] > li');
			const label = li?.querySelector('label');
			const grid = document.querySelector('[role="grid"]')?.closest('.thrive-panel');
			const panel = document.querySelector('#calendar-key-panel');
			return {
				rowHeight: label ? Math.round(label.getBoundingClientRect().height * 100) / 100 : null,
				gridTop: grid ? Math.round(grid.getBoundingClientRect().top + window.scrollY) : null,
				panelTop: panel ? Math.round(panel.getBoundingClientRect().top + window.scrollY) : null,
				visible: panel ? getComputedStyle(panel).display !== 'none' : null
			};
		});
		check(
			'a stream row is a 44px touch target on a phone',
			phoneOpen.rowHeight !== null && phoneOpen.rowHeight >= 44,
			`${phoneOpen.rowHeight}px — 30px on desktop, where a pointer is doing the work`
		);
		/*
		 * THE ONE THAT MATTERS ON A PHONE. The Key is the SECOND row of a one-column
		 * grid, so revealing it appends below the month rather than above it. The
		 * grid's top must be identical before and after, or the arrangement has
		 * regressed to the thing that made the full-width disclosure worse than what
		 * it replaced.
		 */
		check(
			'opening the Key on a phone does not move the grid',
			phoneOpen.visible === true &&
				phoneOpen.gridTop === stacked.gridTop &&
				(phoneOpen.panelTop ?? 0) > (phoneOpen.gridTop ?? 0),
			`grid stayed at ${phoneOpen.gridTop}px; panel opened at ${phoneOpen.panelTop}px, below it`
		);
	}
	await narrow.close();

	// ═══ Appointments: the chip strip, and a read-only month ═══════════════
	/*
	 * The month calendar as the day picker is reverted. What this block proves:
	 *
	 *  1. The chips are the picker again, they are a strip rather than a grid, and
	 *     each says how much is open.
	 *  2. The month under "Your day" is a REFERENCE. It has no controls, no
	 *     focusable cells, no paging, and is hidden from assistive technology with
	 *     a real link out beside it. That last part is the whole justification, so
	 *     it is asserted rather than assumed.
	 *  3. Booking behaviour is untouched, including the double-booking race.
	 */
	const appt = await browser.newPage({ viewport: DESKTOP, acceptDownloads: true });
	appt.on('pageerror', (error) => pageErrors.push(`appointments: ${error}`));
	appt.on('console', (msg) => noisy(msg) && pageErrors.push(`appointments: ${msg.text()}`));
	await appt.goto(BASE + '/appointments', { waitUntil: 'networkidle' });

	/** The day chips, with everything a chip says about itself. */
	const readChips = () =>
		[...document.querySelectorAll('form[action="?/book"] [data-day]')].map((chip) => ({
			day: chip.dataset.day,
			open: Number(chip.dataset.open ?? '0'),
			disabled: chip.disabled === true,
			selected: chip.getAttribute('aria-pressed') === 'true',
			text: chip.textContent.trim().replace(/\s+/g, ' '),
			label: chip.getAttribute('aria-label') ?? ''
		}));

	const readPanes = () => ({
		times: [...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')]
			.map((b) => b.textContent.trim().replace(/\s+/g, ' '))
			.filter((t) => /:\d\d/.test(t)),
		day:
			document
				.querySelector('section[aria-labelledby="my-day"] p')
				?.textContent.trim()
				.replace(/\s+/g, ' ') ?? ''
	});

	await appt.click('[data-service]:not([disabled])');
	await appt.waitForSelector('form[action="?/book"] [data-day]', { state: 'visible' });
	await appt.waitForTimeout(SETTLE);

	const chips = await appt.evaluate(readChips);
	const openChips = chips.filter((chip) => chip.open > 0);

	check(
		'the day picker is a strip of chips, not a month of cells',
		chips.length > 0 && chips.length <= 8,
		`${chips.length} chips — five business days, not twenty-two`
	);
	check(
		'every chip says how much is open, or that it is full',
		chips.every((chip) => /\d+ free|1 free|Full/.test(chip.text)),
		'the one thing kept from the month-grid work'
	);
	check(
		'a full day is disabled rather than selectable-and-then-empty',
		chips.filter((chip) => chip.open === 0).every((chip) => chip.disabled),
		`${chips.filter((c) => c.open === 0).length} full`
	);
	check(
		'the panel opens on a chip that actually has times',
		(await appt.evaluate(readPanes)).times.length > 0,
		'not on today, which is frequently empty by the afternoon'
	);

	// ── The chips and the times are one movement ───────────────────────────
	const hop = await appt.evaluate(() => {
		const chip = document.querySelector('form[action="?/book"] [data-day][aria-pressed="true"]');
		const time = [...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')].find(
			(b) => /:\d\d/.test(b.textContent) && !b.disabled
		);
		if (!chip || !time) return null;
		const a = chip.getBoundingClientRect();
		const b = time.getBoundingClientRect();
		return { dx: Math.round(b.left - a.left), dy: Math.round(b.top - a.top) };
	});

	check(
		'choosing a day and then a time is one short move downward',
		hop !== null && hop.dy > 0 && Math.abs(hop.dx) < 240,
		hop ? `dx=${hop.dx} dy=${hop.dy} — both inside one panel` : 'not measurable'
	);

	// ── One selection, two panes ───────────────────────────────────────────
	const before = await appt.evaluate(readPanes);
	const firstSelected = chips.find((chip) => chip.selected)?.day;
	const nextOpen = openChips.find((chip) => chip.day !== firstSelected);

	if (!nextOpen) {
		unproven('choosing a day moves both panes together', 'only one bookable day');
	} else {
		await appt.click(`form[action="?/book"] [data-day="${nextOpen.day}"]`);
		await appt.waitForTimeout(SETTLE);
		const after = await appt.evaluate(readPanes);

		check(
			'the times follow the chosen chip',
			after.times.join('|') !== before.times.join('|') && after.times.length > 0,
			`${before.times.length} then ${after.times.length}`
		);
		check(
			'"Your day" follows the SAME chip',
			after.day !== before.day && after.day !== '',
			`${before.day} then ${after.day}`
		);
	}
	check(
		'"Your day" still says what it does and does not show',
		await appt.evaluate(() =>
			/Classes and booked time only/.test(
				document.querySelector('section[aria-labelledby="my-day"]')?.textContent ?? ''
			)
		),
		'the deliberate exclusion, kept and stated'
	);

	// ── The month grid is CLICKABLE, and moves only "Your day" ─────────────
	/*
	 * It shipped for one commit as a read-only reference, with cells as `<div>`s and
	 * a caption saying nothing was clickable. A month grid with dots invites a click
	 * and a grid that refuses one reads as broken, so it is a control again.
	 *
	 * The interesting assertion is the NEGATIVE one: clicking it must not move the
	 * booking chips. Booking and browsing are two questions on this page, the
	 * coupling runs one way, and a unit test cannot see either.
	 */
	const readMonth = () => {
		const section = document.querySelector('section[aria-labelledby="appointments-month"]');
		if (!section) return null;
		const cells = [...section.querySelectorAll('[data-day]')];
		return {
			cells: cells.length,
			cellTag: cells[0]?.tagName ?? null,
			gridcells: section.querySelectorAll('[role="gridcell"]').length,
			focusable: cells.filter((c) => c.getAttribute('tabindex') === '0').length,
			/*
			 * The GRID's own hidden state, not any descendant's. The dot row inside
			 * each cell is legitimately `aria-hidden` -- it repeats what the cell's
			 * accessible name already says in words -- so a query for any hidden
			 * element in this section matches by design and proves nothing.
			 */
			hidden: section.querySelector('[role="grid"]')?.getAttribute('aria-hidden') === 'true',
			selected: section.querySelector('[data-day][aria-selected="true"]')?.dataset.day ?? null,
			today: section.querySelector('[data-day][aria-current="date"]')?.dataset.day ?? null,
			pages: [...section.querySelectorAll('button[aria-label]')].filter((b) =>
				/month/i.test(b.getAttribute('aria-label') ?? '')
			).length,
			linkOut: section.querySelector('a[href="/calendar"]') !== null,
			note: section.querySelector('p')?.textContent?.trim() ?? ''
		};
	};

	const month = await appt.evaluate(readMonth);

	if (!month) {
		unproven('the month grid is clickable', 'no month grid rendered');
	} else {
		check('a month grid renders above "Your day"', month.cells === 42, `${month.cells} cells`);
		check(
			'its cells are real controls again',
			month.cellTag === 'BUTTON' && month.gridcells === 42,
			`cells are <${month.cellTag?.toLowerCase()}> with gridcell roles`
		);
		check(
			'it is reachable by keyboard, with one tab stop',
			month.focusable === 1,
			'a roving tabindex, reused from the calendar rather than rewritten'
		);
		check(
			'it is no longer hidden from assistive technology',
			month.hidden === false,
			'it was aria-hidden while it was a reference; it is a control now'
		);
		check(
			'the caption says what a click DOES',
			/Pick a day to see what is on it/.test(month.note) &&
				!/Nothing here is clickable/.test(month.note),
			month.note
		);
		check('the link to the real calendar is kept', month.linkOut === true);
		check(
			'it pages between months',
			month.pages === 2,
			'read-only-and-frozen was defensible; controls that refuse to page are not'
		);

		// ── The result sits BELOW the control ───────────────────────────────
		/*
		 * "Your day" was above the grid that changes it. At 1512 the pane ran
		 * 358-503px and the grid 629-876px, so the click was 270px below its own
		 * result, and at an 800px viewport height the grid's last row was already
		 * past the fold -- scrolling down to click scrolled the answer away. That
		 * arrangement is most of why a working feature was reported as broken, so the
		 * order is now asserted rather than left to a comment.
		 */
		const order = await appt.evaluate(() => {
			const box = (sel) => {
				const el = document.querySelector(sel);
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) };
			};
			return {
				month: box('section[aria-labelledby="appointments-month"]'),
				pane: box('section[aria-labelledby="my-day"]'),
				grid: box('section[aria-labelledby="appointments-month"] [role="grid"]')
			};
		});

		check(
			'"Your day" sits below the month that changes it',
			order.month !== null && order.pane !== null && order.pane.top >= order.month.bottom - 4,
			`month ends ${order.month?.bottom}px, pane starts ${order.pane?.top}px ` +
				`(pane was 358-503 with the grid at 629-876)`
		);
		check(
			'the click and its result are within one screen of each other',
			order.grid !== null && order.pane !== null && order.pane.bottom - order.grid.top < 700,
			`grid top ${order.grid?.top}px to pane bottom ${order.pane?.bottom}px = ` +
				`${(order.pane?.bottom ?? 0) - (order.grid?.top ?? 0)}px`
		);

		// ── The one-way coupling, and that the PANE'S CONTENT follows ───────
		/*
		 * WHAT THE OLD VERSION OF THIS CHECK ACTUALLY ASSERTED, and why it was green
		 * while the owner was watching a click do nothing.
		 *
		 * It read `section[aria-labelledby="my-day"] p` -- "the first paragraph in
		 * the pane" -- and asserted only that its text differed after the click. Two
		 * holes:
		 *
		 *  1. **It never looked at the list.** The date line moving is not the claim
		 *     worth making; the ITEMS are what a student reads. Latch the list and
		 *     leave the date reactive and this check stays green on a pane that shows
		 *     the wrong day's classes.
		 *  2. **It picked the first eligible cell**, which is all but always inside
		 *     the displayed month. The adjacent-month trailing cells -- the ones a
		 *     student reaches for when the day they want is at a month boundary --
		 *     were never clicked once.
		 *
		 * And the selector itself was a hazard: "the first `<p>`" is only the date
		 * line while the date line happens to be first. It is now `[data-my-day-date]`
		 * and the scope line carries `[data-my-day-scope]`, so neither can stand in
		 * for the other.
		 *
		 * The target days are chosen for CONTENT that differs, not just a different
		 * key. Classes recur weekly in this data, so two Mondays show an identical
		 * row; asserting "the text changed" against a day picked without regard to
		 * that is a check that fails for a reason nobody wants to debug.
		 */
		const readCoupling = () => {
			const chips = [...document.querySelectorAll('form[action="?/book"] [data-day]')];
			const pane = document.querySelector('section[aria-labelledby="my-day"]');
			return {
				chip: chips.find((c) => c.getAttribute('aria-pressed') === 'true')?.dataset.day ?? null,
				chipOrder: chips.map((c) => c.dataset.day).join('|'),
				times: [...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')]
					.map((b) => b.textContent.trim().replace(/\s+/g, ' '))
					.filter((t) => /:\d\d/.test(t))
					.join('|'),
				/* The date line, by its own hook. */
				date: pane?.querySelector('[data-my-day-date]')?.textContent.trim().replace(/\s+/g, ' ') ?? '',
				/* And the rows, which is what the student is actually reading. */
				items: [...(pane?.querySelectorAll('li') ?? [])]
					.map((li) => li.textContent.trim().replace(/\s+/g, ' '))
					.join('||'),
				selected:
					document
						.querySelector(
							'section[aria-labelledby="appointments-month"] [data-day][aria-selected="true"]'
						)
						?.dataset.day ?? null
			};
		};

		/*
		 * Candidates in two groups: cells INSIDE the displayed month, and the leading
		 * or trailing cells belonging to an ADJACENT one.
		 *
		 * The second group is the path the owner named and the path that had never
		 * been clicked. A 42-cell grid cannot hold one month, so these always exist;
		 * finding none means the query is wrong, and that is a hard failure rather
		 * than an `unproven`.
		 */
		const candidates = await appt.evaluate(() => {
			const section = document.querySelector('section[aria-labelledby="appointments-month"]');
			const cells = [...section.querySelectorAll('[data-day]')];
			const chipDays = new Set(
				[...document.querySelectorAll('form[action="?/book"] [data-day]')].map((c) => c.dataset.day)
			);
			/* The displayed month is whichever one most of the 42 cells belong to. */
			const tally = new Map();
			for (const c of cells) {
				const m = (c.dataset.day ?? '').slice(0, 7);
				tally.set(m, (tally.get(m) ?? 0) + 1);
			}
			const shown = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
			const days = (inShown) =>
				cells
					.filter(
						(c) =>
							!chipDays.has(c.dataset.day) &&
							((c.dataset.day ?? '').slice(0, 7) === shown) === inShown
					)
					.map((c) => c.dataset.day);
			return { shown, inMonth: days(true), adjacent: days(false) };
		});

		/*
		 * Walk a group until the pane's ROWS change, rather than guessing which day
		 * has different content from the outside.
		 *
		 * Guessing is what made the first version of this check fragile: the cell's
		 * dot count comes from `categoriesForDay`, which includes deadlines, and the
		 * pane deliberately excludes them -- so a cell with dots can sit above an
		 * empty pane, legitimately. Clicking and reading is the only way to know, and
		 * it also means every click on the way is a chip-stability sample.
		 */
		const walkUntilRowsMove = async (days) => {
			let lastMove = null;
			for (const day of days) {
				const before = await appt.evaluate(readCoupling);
				await appt.click(`section[aria-labelledby="appointments-month"] [data-day="${day}"]`);
				await appt.waitForTimeout(SETTLE);
				const after = await appt.evaluate(readCoupling);
				/* Every click, not just the interesting one, has to leave booking alone. */
				if (after.chip !== before.chip || after.chipOrder !== before.chipOrder) {
					return { day, before, after, chipsMoved: true };
				}
				if (after.times !== before.times) return { day, before, after, timesMoved: true };
				if (after.date === before.date || after.date === '') {
					return { day, before, after, dateStuck: true };
				}
				if (after.items !== before.items) return { day, before, after, moved: true };
				lastMove = { day, before, after };
			}
			return lastMove ? { ...lastMove, exhausted: true } : null;
		};

		for (const [kind, days] of [
			['inside the displayed month', candidates.inMonth],
			['from an adjacent month', candidates.adjacent]
		]) {
			if (days.length === 0) {
				check(
					`the grid offers days ${kind} to click`,
					false,
					`none found — displayed month ${candidates.shown}`
				);
				continue;
			}

			const walk = await walkUntilRowsMove(days);

			check(
				`THE BOOKING CHIPS DO NOT MOVE for any day ${kind}`,
				walk !== null && !walk.chipsMoved,
				walk?.chipsMoved
					? `chip went ${walk.before.chip} -> ${walk.after.chip} on ${walk.day}`
					: `${days.length} day(s) clicked, chip stayed on ${walk?.after.chip}`
			);
			check(
				`and neither do the available times, for any day ${kind}`,
				walk !== null && !walk.timesMoved,
				'the times belong to the chip, not to the grid'
			);
			check(
				`clicking a day ${kind} moves the date "Your day" names`,
				walk !== null && !walk.dateStuck,
				walk?.dateStuck
					? `stuck on "${walk.after.date}" after clicking ${walk.day}`
					: `last: ${walk?.before.date} -> ${walk?.after.date} [${walk?.day}]`
			);
			check(
				`clicking a day ${kind} repaints the pane's own rows`,
				walk !== null && walk.moved === true,
				walk?.moved
					? `${walk.day}: "${walk.before.items.slice(0, 40) || '(none)'}" -> "${walk.after.items.slice(0, 40) || '(none)'}"`
					: `walked all ${days.length} day(s) and the rows never changed`
			);
			check(
				`the day ${kind} is marked selected in the grid`,
				walk !== null && walk.after.selected === walk.day,
				`${walk?.after.selected} after clicking ${walk?.day}`
			);
		}

		// ── Today stays distinguishable from the selection ──────────────────
		const bothOnToday = await appt.evaluate(() => {
			const section = document.querySelector('section[aria-labelledby="appointments-month"]');
			const todayCell = section.querySelector('[data-day][aria-current="date"]');
			if (!todayCell) return null;
			todayCell.click();
			return todayCell.dataset.day;
		});

		if (!bothOnToday) {
			unproven('today stays distinguishable when it is also selected', 'today not in view');
		} else {
			await appt.waitForTimeout(SETTLE);
			const overlap = await appt.evaluate((day) => {
				const cell = document.querySelector(
					`section[aria-labelledby="appointments-month"] [data-day="${day}"]`
				);
				const cs = getComputedStyle(cell);
				return {
					selected: cell.getAttribute('aria-selected') === 'true',
					current: cell.getAttribute('aria-current') === 'date',
					// The ring is what carries "today" once the fill carries "selected".
					ring: cs.getPropertyValue('--tw-ring-color') !== '' || cs.outlineWidth !== '0px',
					bold: Number(cs.fontWeight) >= 600 || cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
				};
			}, bothOnToday);

			check(
				'today stays distinguishable when it is also the selection',
				overlap.selected && overlap.current,
				'two attributes on one cell — the fill says selected, the ring says today'
			);
		}

		// ── An empty day reads as empty, not as broken ──────────────────────
		const emptyDay = await appt.evaluate(() => {
			const section = document.querySelector('section[aria-labelledby="appointments-month"]');
			// A cell with no category dots is a day with nothing on it.
			const cell = [...section.querySelectorAll('[data-day]')].find(
				(c) => c.querySelectorAll('span.rounded-pill').length === 0
			);
			cell?.click();
			return cell?.dataset.day ?? null;
		});

		if (!emptyDay) {
			unproven('an empty day gives an empty state', 'every day in view has something on it');
		} else {
			await appt.waitForTimeout(SETTLE);
			const pane = await appt.evaluate(
				() => document.querySelector('section[aria-labelledby="my-day"]')?.textContent ?? ''
			);

			check(
				'an empty day reads as nothing scheduled, not as a failure',
				/Nothing scheduled this day/.test(pane),
				'a state, not an error'
			);
			check(
				'and it still says the pane shows classes and booked time only',
				/Classes and booked time only/.test(pane),
				'the exclusion is exactly what a student would misread on an empty day'
			);
		}
	}

	// ── Booking, unchanged behaviour ───────────────────────────────────────
	const pickedSlot = await appt.evaluate(() => {
		const slot = [...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')].find(
			(b) => /:\d\d/.test(b.textContent) && !b.disabled
		);
		slot?.click();
		return slot?.textContent.trim().replace(/\s+/g, ' ') ?? null;
	});

	if (!pickedSlot) {
		unproven('a booking confirms and appears in the list', 'no free slot on the chosen day');
	} else {
		const listedBefore = await appt.evaluate(
			() => document.querySelectorAll('section[aria-labelledby="my-appointments"] article').length
		);

		await appt.fill('#booking-reason', 'Course planning for winter.');
		await appt.click('form[action="?/book"] button[type="submit"]');
		await appt.waitForSelector('[aria-labelledby="booking-confirmed"]', { state: 'visible' });
		await appt.waitForTimeout(SETTLE * 2);

		check('confirming a slot shows the confirmation', true, pickedSlot);
		check(
			'the confirmation quotes back what was typed',
			await appt.evaluate(() =>
				/Course planning for winter/.test(
					document.querySelector('[aria-labelledby="booking-confirmed"]')?.textContent ?? ''
				)
			)
		);
		check(
			'the booking appears in the list below without a reload',
			(await appt.evaluate(
				() =>
					document.querySelectorAll('section[aria-labelledby="my-appointments"] article').length
			)) ===
				listedBefore + 1,
			'which is the form action re-running load'
		);

		// ── The race, with the store shared between two pages ──────────────
		const racerA = await browser.newPage({ viewport: DESKTOP });
		racerA.on('pageerror', (error) => pageErrors.push(`race-a: ${error}`));
		const racerB = await browser.newPage({ viewport: DESKTOP });
		racerB.on('pageerror', (error) => pageErrors.push(`race-b: ${error}`));

		for (const page of [racerA, racerB]) {
			await page.goto(BASE + '/appointments', { waitUntil: 'networkidle' });
			await page.click('[data-service]:not([disabled])');
			await page.waitForSelector('form[action="?/book"] [data-day]', { state: 'visible' });
			await page.waitForTimeout(SETTLE);
		}

		const contested = await racerA.evaluate(() => {
			const slot = [
				...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')
			].find((b) => /:\d\d/.test(b.textContent) && !b.disabled);
			slot?.click();
			return slot?.textContent.trim() ?? null;
		});

		if (!contested) {
			unproven('a slot taken underneath you is a state, not a crash', 'no free slot to contest');
		} else {
			await racerB.evaluate(() => {
				const slot = [
					...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')
				].find((b) => /:\d\d/.test(b.textContent) && !b.disabled);
				slot?.click();
			});
			await racerB.click('form[action="?/book"] button[type="submit"]');
			await racerB.waitForSelector('[aria-labelledby="booking-confirmed"]', {
				state: 'visible'
			});

			await racerA.click('form[action="?/book"] button[type="submit"]');
			await racerA.waitForSelector('[role="alert"]', { state: 'visible' });
			await racerA.waitForTimeout(SETTLE * 2);

			const raced = await racerA.evaluate(() => ({
				alert: document.querySelector('[role="alert"]')?.textContent.trim() ?? '',
				confirmed: document.querySelector('[aria-labelledby="booking-confirmed"]') !== null,
				submitDisabled:
					document.querySelector('form[action="?/book"] button[type="submit"]')?.disabled ??
					null
			}));

			check(
				'a slot taken underneath you says so rather than crashing',
				/taken|no longer/i.test(raced.alert),
				raced.alert
			);
			check('the losing page shows no confirmation', raced.confirmed === false);
			check(
				'the losing page clears the choice, so the same dead slot cannot be pressed again',
				raced.submitDisabled === true,
				'confirm goes back to disabled until a new time is picked'
			);
		}

		await racerA.close();
		await racerB.close();
	}

	await appt.close();

	// ── Phone ──────────────────────────────────────────────────────────────
	const apptPhone = await browser.newPage({ viewport: PHONE, hasTouch: true, isMobile: true });
	apptPhone.on('pageerror', (error) => pageErrors.push(`appointments-phone: ${error}`));
	apptPhone.on('console', (msg) => noisy(msg) && pageErrors.push(`appointments-phone: ${msg.text()}`));
	await apptPhone.goto(BASE + '/appointments', { waitUntil: 'networkidle' });
	await apptPhone.click('[data-service]:not([disabled])');
	await apptPhone.waitForSelector('form[action="?/book"] [data-day]', { state: 'visible' });
	await apptPhone.waitForTimeout(SETTLE);

	const sideways = await apptPhone.evaluate(() => {
		const before = window.scrollX;
		window.scrollTo(1e6, 0);
		const maxScroll = Math.round(window.scrollX);
		window.scrollTo(before, 0);
		return { maxScroll, docWidth: document.documentElement.scrollWidth };
	});

	check(
		'the open panel does not scroll sideways at 375px',
		sideways.maxScroll <= 1,
		`scrolls ${sideways.maxScroll}px, document ${sideways.docWidth}px wide`
	);
	check(
		'a day chip is a real touch target on a phone',
		(await apptPhone.evaluate(
			() =>
				document.querySelector('form[action="?/book"] [data-day]')?.getBoundingClientRect()
					.height ?? 0
		)) >= 44,
		'MIGRATION section 9 defect 6 is an overflow on this route at this width'
	);
	await apptPhone.close();

	// ═══ Phase 9: Ask THRIVE ═══════════════════════════════════════════════
	/*
	 * Five things, and each is a browser-only claim:
	 *
	 *  1. **Two rails on a desktop, one on a phone.** The whole layout decision.
	 *     It is CSS on one DOM tree, so nothing in Node can see which form is in
	 *     effect -- Vitest has no layout engine and every height it reports is
	 *     zero.
	 *
	 *  2. **The destination and the conversation are in the URL, and Back works.**
	 *     A history claim. No unit test has a history stack.
	 *
	 *  3. **The log is a live region that a keyboard can scroll.** axe's
	 *     `scrollable-region-focusable` is the rule this satisfies, and it is about
	 *     a real element's real overflow.
	 *
	 *  4. **Nothing is persisted.** The brief forbids a localStorage chat store, so
	 *     the assertion is that sending a message writes NO key -- which needs a
	 *     real `localStorage` to be empty of.
	 *
	 *  5. **Switching destination clears the unsent exchange.** A remount claim,
	 *     and remounting is a runtime behaviour rather than a value.
	 */
	const ask = await browser.newPage({ viewport: DESKTOP });
	ask.on('pageerror', (error) => pageErrors.push(`ask: ${error}`));
	ask.on('console', (msg) => noisy(msg) && pageErrors.push(`ask: ${msg.text()}`));
	await ask.goto(BASE + '/ask', { waitUntil: 'networkidle' });

	check(
		'/ask sends you to a destination rather than a landing page',
		ask.url().endsWith('/ask/resources'),
		ask.url()
	);

	/** Boxes, so "uses its width" can be measured rather than asserted. */
	const readBoxes = () => {
		const box = (el) => {
			if (!el) return null;
			const cs = getComputedStyle(el);
			if (cs.display === 'none') return null;
			const r = el.getBoundingClientRect();
			return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
		};
		return {
			nav: box(document.querySelector('[data-nav="rail"]')),
			history: box(document.querySelector('nav[aria-label="Saved conversations"]')),
			chat: box(document.querySelector('[role="log"]')),
			main: box(document.querySelector('#main-content')),
			viewport: window.innerWidth
		};
	};

	const boxes = await ask.evaluate(readBoxes);

	check(
		'the page reads nav rail, history rail, chat — left to right',
		boxes.nav !== null &&
			boxes.history !== null &&
			boxes.chat !== null &&
			boxes.history.left >= boxes.nav.right &&
			boxes.chat.left >= boxes.history.right,
		`nav ends ${boxes.nav?.right}, history ${boxes.history?.left}-${boxes.history?.right}, chat starts ${boxes.chat?.left}`
	);
	check(
		'the history rail is a column, not a strip, on a desktop',
		(boxes.history?.width ?? 0) > 180 && (boxes.history?.width ?? 0) < 320,
		`${boxes.history?.width}px`
	);
	check(
		'the chat still uses the width the page has',
		boxes.chat !== null && boxes.chat.width > 700,
		`chat ${boxes.chat?.width}px inside a ${boxes.viewport}px viewport`
	);
	check(
		'the history and the chat scroll independently',
		await ask.evaluate(() => {
			const list = document.querySelector('nav[aria-label="Saved conversations"] ul');
			const log = document.querySelector('[role="log"]');
			if (!list || !log) return false;
			const scrolls = (el) => {
				const o = getComputedStyle(el).overflowY;
				return o === 'auto' || o === 'scroll';
			};
			// Two separate scroll containers, and neither contains the other.
			return scrolls(list) && scrolls(log) && !list.contains(log) && !log.contains(list);
		}),
		'so scrolling one cannot move the other'
	);
	check(
		'the page reaches close to the edges',
		boxes.main !== null &&
			boxes.viewport - (boxes.nav?.width ?? 0) - boxes.main.width < 140,
		`${Math.round(boxes.viewport - (boxes.nav?.width ?? 0) - boxes.main.width)}px of margin beside the rail`
	);
	check(
		'the message TEXT is still capped, so a wide panel does not mean a wide line',
		await ask.evaluate(() => {
			const bubble = document.querySelector('[role="log"] p.inline-block');
			if (!bubble) return true;
			return bubble.getBoundingClientRect().width <= 780;
		}),
		'--thrive-chat-measure caps the bubble, not the panel'
	);

	// ── The URL is the state, and the destinations are in the NAV rail ─────
	const destinationLinks = '[data-nav="rail"] a[href^="/ask/"]';

	check(
		'the nav rail offers all three destinations',
		(await ask.locator(destinationLinks).count()) === 3,
		'Resources, Course Recommender, Career — as a group under Ask THRIVE'
	);
	check(
		'the group is a disclosure with a real aria-expanded',
		await ask.evaluate(() => {
			const toggle = document.querySelector(
				'[data-nav="rail"] button[aria-expanded][aria-controls]'
			);
			return toggle?.getAttribute('aria-expanded') === 'true';
		}),
		'open, because a child is current'
	);
	check(
		'the group expands itself when a child is current',
		await ask.evaluate(() => {
			const toggle = document.querySelector('[data-nav="rail"] button[aria-controls]');
			const list = document.getElementById(toggle?.getAttribute('aria-controls') ?? '');
			return list !== null && list.querySelectorAll('a').length === 3;
		}),
		'landing on a destination directly shows the group open'
	);
	check(
		'the parent is not ALSO marked current when a child is',
		await ask.evaluate(
			() =>
				document.querySelectorAll('[data-nav="rail"] a[aria-current="page"]').length === 1
		),
		'prefix matching would otherwise say the student is in two places'
	);

	// Collapse it, and the children must LEAVE THE DOM rather than hide.
	await ask.click('[data-nav="rail"] button[aria-controls]');
	await ask.waitForTimeout(SETTLE);

	check(
		'collapsing removes the children from the DOM, not just from view',
		(await ask.locator(destinationLinks).count()) === 0,
		'so they are genuinely out of the tab order — `hidden` is treated inconsistently'
	);
	check(
		'the toggle reports itself collapsed',
		await ask.evaluate(
			() =>
				document
					.querySelector('[data-nav="rail"] button[aria-controls]')
					?.getAttribute('aria-expanded') === 'false'
		)
	);

	// Keyboard: Enter on the toggle must reopen it.
	await ask.focus('[data-nav="rail"] button[aria-controls]');
	await ask.keyboard.press('Enter');
	await ask.waitForTimeout(SETTLE);

	check(
		'the disclosure is keyboard operable',
		(await ask.locator(destinationLinks).count()) === 3,
		'Enter on the toggle reopens the group'
	);

	await ask.click(`${destinationLinks}[href="/ask/career"]`);
	await ask.waitForURL('**/ask/career');
	await ask.waitForTimeout(SETTLE);

	check(
		'choosing a destination is reflected in the URL',
		ask.url().endsWith('/ask/career'),
		ask.url()
	);
	check(
		'the chosen destination is the current one in the rail',
		await ask.evaluate(
			() =>
				document
					.querySelector('[data-nav="rail"] a[aria-current="page"]')
					?.getAttribute('href') === '/ask/career'
		),
		'aria-current on the child, not on the group'
	);
	check(
		'each destination has its own empty state rather than a blank box',
		await ask.evaluate(() => {
			const log = document.querySelector('[role="log"]');
			return /job search/i.test(log?.textContent ?? '');
		}),
		'the Career copy, not a shared one'
	);

	await ask.goBack();
	await ask.waitForURL('**/ask/resources');
	check(
		'the back button returns to the previous destination',
		ask.url().endsWith('/ask/resources'),
		ask.url()
	);

	// ── A saved conversation is linkable ───────────────────────────────────
	const historyLinks = 'nav[aria-label="Saved conversations"] ul a';
	const savedCount = await ask.locator(historyLinks).count();

	if (savedCount === 0) {
		unproven('opening a saved conversation is linkable', 'no saved conversation in this section');
	} else {
		await ask.locator(historyLinks).first().click();
		await ask.waitForFunction(() => location.search.includes('c='));
		await ask.waitForTimeout(SETTLE);

		const opened = await ask.evaluate(() => ({
			search: location.search,
			bubbles: document.querySelectorAll('[role="log"] p.inline-block').length,
			spoken: [...document.querySelectorAll('[role="log"] .sr-only')].map((s) => s.textContent.trim())
		}));

		check(
			'opening a saved conversation puts it in the URL',
			/^\?c=conv-/.test(opened.search),
			opened.search
		);
		check(
			'the open conversation is marked current in the history rail',
			await ask.evaluate(
				() =>
					document.querySelectorAll(
						'nav[aria-label="Saved conversations"] a[aria-current="page"]'
					).length === 1
			),
			'one row, and it is the one named in the URL'
		);
		check(
			'there is always a way to start a new conversation',
			(await ask.locator('nav[aria-label="Saved conversations"] a[href="/ask/resources"]').count()) === 1,
			'a link to the bare destination, which IS a new conversation here'
		);

		/*
		 * ── The rail reads as a region, and its rows read as controls ────────
		 *
		 * It shipped on the page's own cream with a single right-hand border, and it
		 * read as text floating in a margin rather than as a panel. Rows carried
		 * `border-transparent` with no fill until hover, so there was no affordance
		 * until a pointer had already arrived -- and none at all for a reader who
		 * never hovers.
		 *
		 * Asserted against COMPUTED colour rather than against class names, because
		 * the claim is "it looks like a panel", and a class list can say `bg-sunken`
		 * while something else wins the cascade.
		 */
		const railSkin = await ask.evaluate(() => {
			const rail = document.querySelector('nav[aria-label="Saved conversations"]');
			if (!rail) return null;
			const rs = getComputedStyle(rail);
			const page = getComputedStyle(document.body).backgroundColor;
			const rows = [...rail.querySelectorAll('a[href*="?c="]')];
			const resting = rows.find((r) => r.getAttribute('aria-current') !== 'page');
			const current = rows.find((r) => r.getAttribute('aria-current') === 'page');
			const seen = (el) => {
				if (!el) return null;
				const s = getComputedStyle(el);
				return {
					bg: s.backgroundColor,
					border: s.borderTopColor,
					leftWidth: s.borderLeftWidth,
					leftColour: s.borderLeftColor
				};
			};
			return {
				page,
				railBg: rs.backgroundColor,
				railBorder: rs.borderTopWidth,
				railRadius: rs.borderTopLeftRadius,
				resting: seen(resting),
				current: seen(current)
			};
		});

		if (!railSkin) {
			check('the history rail reads as its own region', false, 'rail not found');
		} else {
			check(
				'the history rail has a surface of its own, not the page behind it',
				railSkin.railBg !== railSkin.page && railSkin.railBg !== 'rgba(0, 0, 0, 0)',
				`rail ${railSkin.railBg} on a ${railSkin.page} page`
			);
			check(
				'and the edge treatment the rest of the app uses for a panel',
				parseFloat(railSkin.railBorder) >= 1 && parseFloat(railSkin.railRadius) > 0,
				`${railSkin.railBorder} hairline, ${railSkin.railRadius} radius`
			);
			check(
				'a saved conversation looks clickable before it is hovered',
				railSkin.resting !== null &&
					railSkin.resting.bg !== 'rgba(0, 0, 0, 0)' &&
					railSkin.resting.border !== 'rgba(0, 0, 0, 0)',
				`resting row: ${railSkin.resting?.bg} behind a ${railSkin.resting?.border} edge`
			);
			check(
				'the current conversation is marked by more than a tint',
				railSkin.current !== null &&
					railSkin.resting !== null &&
					railSkin.current.bg !== railSkin.resting.bg &&
					railSkin.current.leftColour !== railSkin.resting.leftColour,
				`current has a ${railSkin.current?.leftColour} stripe; resting has ${railSkin.resting?.leftColour}`
			);
			check(
				'the stripe does not shift the list sideways',
				railSkin.current?.leftWidth === railSkin.resting?.leftWidth,
				`both ${railSkin.current?.leftWidth} — coloured differently, not widened`
			);
		}
		check(
			'the saved messages render',
			opened.bubbles > 1,
			`${opened.bubbles} messages`
		);
		check(
			'each message says WHO said it, in words',
			opened.spoken.some((s) => /^You said/.test(s)) &&
				opened.spoken.some((s) => /^THRIVE said/.test(s)),
			'so the speaker does not rest on which side of the column a bubble sits on'
		);

		// ── The log is a live region a keyboard can reach ──────────────────
		const log = await ask.evaluate(() => {
			const el = document.querySelector('[role="log"]');
			el.focus();
			return {
				live: el.getAttribute('aria-live'),
				labelled: (el.getAttribute('aria-label') ?? '').length > 0,
				tabbable: el.getAttribute('tabindex') === '0',
				focused: document.activeElement === el,
				scrollable: el.scrollHeight > el.clientHeight,
				scrollTop: el.scrollTop
			};
		});

		check('the conversation log is a polite live region', log.live === 'polite');
		check('the log is named, not just typed', log.labelled === true);
		check(
			'the log is focusable, which is what makes it keyboard-scrollable',
			log.tabbable === true && log.focused === true,
			"axe's scrollable-region-focusable"
		);

		check(
			'the log is the scroller, not the document',
			await ask.evaluate(() => {
				const el = document.querySelector('[role="log"]');
				return getComputedStyle(el).overflowY === 'auto' && el.clientHeight > 0;
			}),
			'a definite height on the panel above xl -- see --thrive-chat-height'
		);

		/*
		 * Force the overflow rather than hoping the fixture supplies it.
		 *
		 * A four-message conversation fits inside a 34rem panel, so asserting on the
		 * saved history alone left this permanently unproven -- and an unproven
		 * keyboard-scroll check is the one that matters least when it is skipped and
		 * most when it is not. Sending pushes real rows in until it overflows.
		 */
		let overflowing = log.scrollable;
		for (let attempt = 0; attempt < 14 && !overflowing; attempt += 1) {
			// Long enough to wrap: the panel is 90rem wide now, so a short line takes
			// many more sends to fill 34rem of height than it did behind a rail.
			await ask.fill(
				'#ask-composer',
				`Padding question ${attempt}, long enough to wrap across the measure and add real height to the log.`
			);
			await ask.press('#ask-composer', 'Enter');
			await ask.waitForTimeout(SETTLE);
			overflowing = await ask.evaluate(() => {
				const el = document.querySelector('[role="log"]');
				return el.scrollHeight > el.clientHeight + 1;
			});
		}

		if (!overflowing) {
			unproven('a keyboard can scroll the log', 'could not make the log overflow');
		} else {
			// Back to the top, focus the log, then press End. Sending already scrolled
			// it to the bottom, so measuring from there would measure nothing.
			await ask.evaluate(() => {
				const el = document.querySelector('[role="log"]');
				el.scrollTop = 0;
				el.focus();
			});
			const from = await ask.evaluate(() => document.querySelector('[role="log"]').scrollTop);
			await ask.keyboard.press('End');
			await ask.waitForTimeout(SETTLE);
			const moved = await ask.evaluate(() => document.querySelector('[role="log"]').scrollTop);

			check('a keyboard can scroll the log', moved > from, `${from} -> ${moved}`);
		}

		// Leave the log clean for the composer checks below, which assert on an
		// exchange they create themselves.
		await ask.reload({ waitUntil: 'networkidle' });
		await ask.waitForTimeout(SETTLE);
	}

	// ── The composer, and the honesty about it ─────────────────────────────
	check(
		'the composer refuses an empty question',
		await ask.evaluate(
			() => document.querySelector('#ask-composer').closest('form').querySelector('button[type="submit"]').disabled
		),
		'disabled until something is typed'
	);
	check(
		'the page says nothing is saved BEFORE anything is typed',
		await ask.evaluate(() => /Nothing you type here is saved/.test(document.body.innerText))
	);

	const keysBefore = await ask.evaluate(() => Object.keys(localStorage).sort());

	/*
	 * A question that appears NOWHERE in the fixture or the empty-state copy.
	 *
	 * The first version typed "Which electives suit product analytics?", which is
	 * word for word one of the Course Recommender's example questions -- so the
	 * "switching destination clears it" assertion below matched the example rather
	 * than the message and went red against correct code. A test that can pass or
	 * fail for a reason other than the one it names is worse than no test.
	 */
	await ask.fill('#ask-composer', 'Can I switch my capstone team in week 4?');
	await ask.press('#ask-composer', 'Enter');
	await ask.waitForTimeout(SETTLE * 2);

	const afterSend = await ask.evaluate(() => ({
		text: document.querySelector('[role="log"]').innerText,
		keys: Object.keys(localStorage).sort(),
		draft: document.querySelector('#ask-composer').value
	}));

	check(
		'sending a question shows it in the log',
		/capstone team/.test(afterSend.text),
		'the student half of the exchange'
	);
	check(
		'the reply says plainly that it cannot answer yet',
		/can’t answer this yet|cannot answer this yet/.test(afterSend.text),
		'a placeholder that mimicked an answer would teach the student to trust it'
	);
	check('sending clears the field', afterSend.draft === '');
	/*
	 * The honest constraint, asserted. The brief forbids a localStorage chat store
	 * -- conversations are too large for it and a second laptop would show an empty
	 * history indistinguishable from never having asked anything. So the exchange
	 * above must have written NOTHING.
	 */
	check(
		'sending a question writes no persisted key',
		afterSend.keys.join('|') === keysBefore.join('|'),
		afterSend.keys.length === 0 ? 'localStorage untouched' : `keys: ${afterSend.keys.join(', ')}`
	);

	// ── Switching destination clears what was never saved ──────────────────
	await ask.click(`${destinationLinks}[href="/ask/courses"]`);
	await ask.waitForURL('**/ask/courses');
	await ask.waitForTimeout(SETTLE);

	check(
		'switching destination clears the unsent exchange',
		await ask.evaluate(
			() => !/capstone team/.test(document.querySelector('[role="log"]').innerText)
		),
		'the {#key} remount, so a question cannot appear under another title'
	);

	await ask.close();

	// ── An unknown destination is a 404, not an empty page ─────────────────
	const bogus = await browser.newPage({ viewport: DESKTOP });
	const response = await bogus.goto(BASE + '/ask/recommender', { waitUntil: 'networkidle' });
	check(
		'a mistyped destination is a 404 rather than a redirect',
		response?.status() === 404,
		`status ${response?.status()} — a quiet redirect would make a broken link look fine`
	);
	await bogus.close();

	// ── Phone: one rail, and it is not this one's column form ──────────────
	const askPhone = await browser.newPage({ viewport: PHONE, hasTouch: true, isMobile: true });
	askPhone.on('pageerror', (error) => pageErrors.push(`ask-phone: ${error}`));
	askPhone.on('console', (msg) => noisy(msg) && pageErrors.push(`ask-phone: ${msg.text()}`));
	await askPhone.goto(BASE + '/ask/resources?c=conv-001', { waitUntil: 'networkidle' });
	await askPhone.waitForTimeout(SETTLE);

	const phoneBoxes = await askPhone.evaluate(readBoxes);

	check(
		'the nav rail is gone at 375px',
		phoneBoxes.nav === null,
		'BottomNav has that job at this width'
	);
	check(
		'the destinations are still reachable where there is no nav rail',
		(await askPhone.locator('nav[aria-label="Ask about"] a').count()) === 3,
		'a page-level band, `lg:hidden`, driven by the SAME nav children'
	);
	check(
		'the band and the nav group never appear together',
		await askPhone.evaluate(() => {
			const band = document.querySelector('nav[aria-label="Ask about"]');
			const rail = document.querySelector('[data-nav="rail"]');
			const shown = (el) => el !== null && getComputedStyle(el).display !== 'none';
			return shown(band) !== shown(rail);
		}),
		'so a student never sees the same three links twice'
	);
	check(
		'the bottom bar shows the PARENT, highlighted, for a child destination',
		await askPhone.evaluate(() => {
			const bar = document.querySelector('[data-nav="bottom"]');
			const link = bar?.querySelector('a[href="/ask"]');
			return link !== null && link?.getAttribute('aria-current') === 'page';
		}),
		'four fixed slots, so the group cannot live there'
	);

	const phoneSideways = await askPhone.evaluate(() => {
		const before = window.scrollX;
		window.scrollTo(1e6, 0);
		const max = Math.round(window.scrollX);
		window.scrollTo(before, 0);
		return max;
	});
	check(
		'the page itself does not scroll sideways at 375px',
		phoneSideways <= 1,
		`${phoneSideways}px — the destination row scrolls, the document does not`
	);
	check(
		'on a phone the history is a strip rather than a second rail',
		await askPhone.evaluate(() => {
			const rail = document.querySelector('nav[aria-label="Saved conversations"]');
			const log = document.querySelector('[role="log"]');
			if (!rail || !log) return true;
			const r = rail.getBoundingClientRect();
			const l = log.getBoundingClientRect();
			// Above the chat, not beside it, and capped so it cannot push the composer
			// off the bottom.
			return r.bottom <= l.top + 1 && r.height <= 240;
		}),
		'two rails plus a chat cannot fit 375px, so this one flips axis'
	);
	await askPhone.close();

	// ── Reduced motion: still marked, still cleared ────────────────────────
	/*
	 * The global reduced-motion block forces `animation-duration: 0.01ms` on
	 * everything, so a mark PAINTED by a keyframe would be invisible here. This is
	 * the check that says the ring is a real declaration and only its fade is
	 * animated.
	 */
	const calm = await browser.newPage({ viewport: DESKTOP, reducedMotion: 'reduce' });
	calm.on('pageerror', (error) => pageErrors.push(`reduced-motion: ${error}`));
	await calm.goto(BASE + ROUTE, { waitUntil: 'networkidle' });
	await calm.locator('button[aria-expanded]', { hasText: biggest.label }).click();
	await calm.evaluate(() => {
		document.querySelector('.thrive-popover button[data-item]')?.click();
	});
	await calm.waitForTimeout(SETTLE);
	const calmMarked = await calm.evaluate(() => ({
		marked: document.activeElement?.classList.contains('thrive-arrived') === true,
		animation: document.activeElement ? getComputedStyle(document.activeElement).animationName : '',
		outline: document.activeElement ? getComputedStyle(document.activeElement).outlineWidth : ''
	}));
	check(
		'with reduced motion the row is still visibly marked',
		calmMarked.marked === true && calmMarked.outline !== '0px',
		`animation-name=${calmMarked.animation} outline-width=${calmMarked.outline}`
	);
	check(
		'with reduced motion nothing animates',
		calmMarked.animation === 'none',
		'the ring is declared, not painted by a keyframe'
	);
	await calm.waitForTimeout(arrivalMs + SETTLE * 2);
	check(
		'with reduced motion the mark still clears itself',
		(await calm.evaluate(() => document.querySelectorAll('.thrive-arrived').length)) === 0
	);
	await calm.close();

	// ── Phone: no cursor, so click has to be enough ────────────────────────
	const phone = await browser.newPage({ viewport: PHONE, hasTouch: true, isMobile: true });
	phone.on('pageerror', (error) => pageErrors.push(`phone: ${error}`));
	phone.on('console', (msg) => noisy(msg) && pageErrors.push(`phone: ${msg.text()}`));
	await phone.goto(BASE + ROUTE, { waitUntil: 'networkidle' });

	check(
		'a touch device reports no hovering pointer',
		(await phone.evaluate(() => matchMedia('(hover: hover)').matches)) === false,
		'which is why hover could never have been the way in'
	);

	await phone.locator('button[aria-expanded]', { hasText: biggest.label }).click();
	await phone.waitForTimeout(SETTLE);
	const phonePanel = await phone.evaluate(readPanel);
	const phonePill = (await phone.evaluate(readPills)).find((entry) => entry.count > 0);
	check('click opens the popover with no cursor available', phonePanel !== null);
	check(
		'the clamped panel stays on screen',
		(phonePanel?.right ?? 0) <= PHONE.width,
		`right=${phonePanel?.right} width=${phonePanel?.width} of ${PHONE.width}`
	);
	check('a pill is a 44px touch target', (phonePill?.height ?? 0) >= 44, `${phonePill?.height}px`);
	await phone.close();

	/*
	 * Warnings count, not just throws.
	 *
	 * `arriveAtRow` warns when the row it was sent to is not in the DOM -- a silent
	 * no-op there is the failure the arrival cue exists to prevent, so it says so.
	 * That warning is behind `import.meta.env.DEV` and this gate drives the
	 * PRODUCTION build, so it is compiled out and **this check cannot see it**.
	 * Stated rather than implied, because a check that looks like it covers
	 * something it cannot is worse than no check.
	 *
	 * What this does cover is any warning that survives into production, which is
	 * a category worth failing on regardless.
	 */
	check(
		'nothing threw or warned anywhere on the way',
		pageErrors.length === 0,
		pageErrors.join(' | ')
	);

	await browser.close();
} finally {
	server.kill();
}

console.log('-'.repeat(98));
console.log(
	`${total - failures}/${total} pass` +
		(unprovenCount > 0 ? ` · ${unprovenCount} unproven by this fixture` : '')
);
process.exit(failures === 0 ? 0 : 1);
