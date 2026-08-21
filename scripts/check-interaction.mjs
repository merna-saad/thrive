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
const ENTRY = join(FRONTEND, 'build', 'index.js');
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
	console.error(`  No build at ${ENTRY}. Run \`npm run build\` first.`);
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

	// ═══ Phase 8: booking against a month calendar ═════════════════════════
	/*
	 * Four things here, and each is unprovable in Node for its own reason.
	 *
	 *  1. **One selection drives two panes.** The whole point of replacing the
	 *     five day chips with a month grid is that the times list AND "Your day"
	 *     follow the day you press. Nothing in the unit suite renders, so nothing
	 *     in it can press a cell and read what two other components did.
	 *
	 *  2. **A closed day cannot be selected, but can still be reached.** The grid
	 *     keeps a focus cursor separate from the selection so a keyboard can cross
	 *     a shut weekend to the Monday behind it -- `aria-disabled`, not
	 *     `disabled`. That is a focus-model claim, and this repo's suite has no
	 *     focus model.
	 *
	 *  3. **The double-booking path, raced for real.** `providers.spec.ts` proves
	 *     the throw and `appointmentsActions.spec.ts` proves the 409. Neither can
	 *     show a student holding a slot that somebody else takes underneath them.
	 *     Two browser pages against one server CAN, because the mock store is
	 *     process-global -- MIGRATION.md section 9 defect 1, which is a blocking
	 *     bug and, exactly once, a useful one.
	 *
	 *  4. **No horizontal overflow at 375px with the panel open.** MIGRATION.md
	 *     section 9 defect 6 is an overflow on this route at this width.
	 *     `check:layout` measures vertical scroll only.
	 */
	const appt = await browser.newPage({ viewport: DESKTOP, acceptDownloads: true });
	appt.on('pageerror', (error) => pageErrors.push(`appointments: ${error}`));
	appt.on('console', (msg) => noisy(msg) && pageErrors.push(`appointments: ${msg.text()}`));
	await appt.goto(BASE + '/appointments', { waitUntil: 'networkidle' });

	/** The month grid's cells, with everything the three states are carried by. */
	const readGrid = () =>
		[...document.querySelectorAll('[data-day]')].map((cell) => ({
			day: cell.dataset.day,
			open: Number(cell.dataset.open ?? '0'),
			selected: cell.getAttribute('aria-selected') === 'true',
			today: cell.getAttribute('aria-current') === 'date',
			disabled: cell.getAttribute('aria-disabled') === 'true',
			tabStop: cell.getAttribute('tabindex') === '0',
			label: cell.getAttribute('aria-label') ?? ''
		}));

	/** What the two panes are showing, as text a student could read. */
	const readPanes = () => ({
		times: [...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')]
			.map((b) => b.textContent.trim().replace(/\s+/g, ' '))
			.filter((t) => /\d/.test(t)),
		day:
			document
				.querySelector('section[aria-labelledby="my-day"] p')
				?.textContent.trim()
				.replace(/\s+/g, ' ') ?? '',
		rows: document.querySelectorAll('section[aria-labelledby="my-day"] ul > li').length
	});

	check(
		'the appointments page renders no month grid until a service is chosen',
		(await appt.evaluate(readGrid)).length === 0,
		'the calendar belongs to the panel, not to the page'
	);

	await appt.click('[data-service]:not([disabled])');
	await appt.waitForSelector('[data-day]', { state: 'visible' });
	await appt.waitForTimeout(SETTLE);

	const grid = await appt.evaluate(readGrid);
	const marked = grid.filter((cell) => cell.open > 0);
	const closed = grid.filter((cell) => cell.open === 0 && cell.disabled);

	check('choosing a service opens a month grid', grid.length === 42, `${grid.length} cells`);
	check(
		'days with availability are marked with a count',
		marked.length > 0 && marked.every((cell) => !cell.disabled),
		`${marked.length} of 42 bookable`
	);
	check(
		'a marked day says how much is open in words',
		marked.every((cell) => /time(s)? open/.test(cell.label)),
		'so the mark never rests on its colour'
	);
	check(
		'days with nothing open are marked closed and say why',
		closed.length > 0 &&
			closed.every((cell) => /nothing open|too far ahead|already past/.test(cell.label)),
		`${closed.length} closed`
	);
	/*
	 * The three closed reasons are DISTINCT sentences, and this is the assertion
	 * that caught them not being. A month grid renders six leading cells from the
	 * previous month, so the past is always on screen -- and the first version
	 * announced last Tuesday as "too far ahead to book". Both cells are grey and
	 * both refuse the click, so the label is the only channel where the difference
	 * exists at all.
	 */
	check(
		'a day in the past does not claim to be too far ahead',
		closed
			.filter((cell) => /already past/.test(cell.label))
			.every((cell) => !/too far ahead/.test(cell.label)) &&
			closed.some((cell) => /already past/.test(cell.label)),
		`${closed.filter((c) => /already past/.test(c.label)).length} past, ` +
			`${closed.filter((c) => /too far ahead/.test(c.label)).length} beyond the window`
	);
	check(
		'the panel opens on a day that actually has times',
		(await appt.evaluate(readPanes)).times.length > 0,
		'not on today, which is frequently shut'
	);

	// ── One selection, two panes ───────────────────────────────────────────
	const before = await appt.evaluate(readPanes);
	const firstSelected = grid.find((cell) => cell.selected)?.day;
	const nextOpen = marked.find((cell) => cell.day !== firstSelected);

	if (!nextOpen) {
		unproven('picking a day moves both panes together', 'only one bookable day in view');
	} else {
		await appt.click(`[data-day="${nextOpen.day}"]`);
		await appt.waitForTimeout(SETTLE);
		const after = await appt.evaluate(readPanes);
		const nowSelected = (await appt.evaluate(readGrid)).find((cell) => cell.selected)?.day;

		check('clicking a day selects it', nowSelected === nextOpen.day, `${nowSelected}`);
		check(
			'the times list follows the selection',
			after.times.join('|') !== before.times.join('|') && after.times.length > 0,
			`${before.times.length} then ${after.times.length}`
		);
		check(
			'"Your day" follows the SAME selection',
			after.day !== before.day && after.day !== '',
			`${before.day} then ${after.day}`
		);
	}

	// ── A closed day refuses the selection but not the focus ────────────────
	const openDay = (await appt.evaluate(readGrid)).find((cell) => cell.selected)?.day;

	if (!closed.length || !openDay) {
		unproven('a closed day cannot be selected', 'no closed day rendered');
	} else {
		const shut = closed[0].day;
		// `force`, because Playwright's actionability model treats `aria-disabled`
		// as disabled -- which is the right reading, and is why the click has to be
		// pressed through deliberately to prove the handler refuses it.
		await appt.click(`[data-day="${shut}"]`, { force: true });
		await appt.waitForTimeout(SETTLE);
		const held = await appt.evaluate(readGrid);

		check(
			'clicking a closed day does not select it',
			held.find((cell) => cell.selected)?.day === openDay,
			`selection stayed on ${openDay}`
		);
		check(
			'a closed day is still focusable, so the keyboard can cross it',
			await appt.evaluate((day) => {
				const cell = document.querySelector(`[data-day="${day}"]`);
				cell.focus();
				return document.activeElement === cell;
			}, shut),
			'aria-disabled, not disabled'
		);
	}

	/*
	 * The cursor and the selection are two values, and this is what proves it.
	 *
	 * Arrowing off the selected day onto a closed one has to move focus WITHOUT
	 * moving the selection. With one value -- which is what the calendar's grid
	 * had before this phase -- exploring the month would have booked days by
	 * accident.
	 */
	const walkFrom = (await appt.evaluate(readGrid)).find((cell) => cell.selected)?.day;

	if (!walkFrom) {
		unproven('arrowing onto a closed day moves focus only', 'nothing selected');
	} else {
		/*
		 * Click it first, then focus it. The forced click on a closed cell above
		 * left the grid's focus CURSOR sitting on a day in the past -- which is the
		 * cursor working correctly, and it made the walk below start at the window's
		 * far edge where every arrow press is legitimately refused. Choosing an open
		 * day clears the cursor back to the selection.
		 */
		await appt.click(`[data-day="${walkFrom}"]`);
		await appt.waitForTimeout(SETTLE);
		await appt.focus(`[data-day="${walkFrom}"]`);
		let landed = null;
		// Walk until focus lands on a closed cell, or the row runs out. Six presses
		// covers a week from any starting column.
		for (let step = 0; step < 6 && !landed; step += 1) {
			await appt.keyboard.press('ArrowRight');
			await appt.waitForTimeout(SETTLE / 2);
			const state = await appt.evaluate(() => {
				const active = document.activeElement;
				return {
					day: active?.dataset?.day ?? null,
					disabled: active?.getAttribute('aria-disabled') === 'true',
					selected:
						document.querySelector('[data-day][aria-selected="true"]')?.dataset.day ?? null
				};
			});
			if (state.disabled) landed = state;
		}

		if (!landed) {
			unproven('arrowing onto a closed day moves focus only', 'no closed day within a week');
		} else {
			check(
				'arrowing onto a closed day moves focus there',
				landed.day !== null,
				`focus on ${landed.day}`
			);
			check(
				'arrowing onto a closed day does NOT move the selection',
				landed.selected !== landed.day,
				`selection held at ${landed.selected}`
			);
		}
	}

	// ── The window is bounded, and the control says so ──────────────────────
	check(
		'paging before the booking window is refused at the control',
		await appt.evaluate(() => {
			const buttons = [...document.querySelectorAll('button[aria-label]')];
			const back = buttons.find((b) => /previous month/i.test(b.getAttribute('aria-label')));
			return back?.disabled === true;
		}),
		'this month is the first bookable one, so back is a dead end'
	);

	// ── Booking, and the three states landing on one cell ───────────────────
	const todayCell = (await appt.evaluate(readGrid)).find((cell) => cell.today);
	check(
		'today is marked independently of the selection and the availability',
		todayCell !== undefined && /today/.test(todayCell.label),
		'three states, three channels, all able to co-occur'
	);

	const bookable = (await appt.evaluate(readGrid)).find((cell) => cell.open > 0);
	await appt.click(`[data-day="${bookable.day}"]`);
	await appt.waitForTimeout(SETTLE);

	const pickedSlot = await appt.evaluate(() => {
		const slot = [...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')].find(
			(b) => /\d/.test(b.textContent) && !b.disabled
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
		/*
		 * Page A picks a slot and holds it. Page B books the same one. Then A
		 * confirms, and has to be told rather than crashed at.
		 */
		const racerA = await browser.newPage({ viewport: DESKTOP });
		racerA.on('pageerror', (error) => pageErrors.push(`race-a: ${error}`));
		const racerB = await browser.newPage({ viewport: DESKTOP });
		racerB.on('pageerror', (error) => pageErrors.push(`race-b: ${error}`));

		for (const page of [racerA, racerB]) {
			await page.goto(BASE + '/appointments', { waitUntil: 'networkidle' });
			await page.click('[data-service]:not([disabled])');
			await page.waitForSelector('[data-day]', { state: 'visible' });
			await page.waitForTimeout(SETTLE);
		}

		const contested = await racerA.evaluate(() => {
			const slot = [
				...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')
			].find((b) => /\d/.test(b.textContent) && !b.disabled);
			slot?.click();
			return slot?.getAttribute('title') === null ? slot?.textContent.trim() : null;
		});

		if (!contested) {
			unproven('a slot taken underneath you is a state, not a crash', 'no free slot to contest');
		} else {
			// B takes it first, choosing the same position in the same list.
			await racerB.evaluate(() => {
				const slot = [
					...document.querySelectorAll('form[action="?/book"] button[aria-pressed]')
				].find((b) => /\d/.test(b.textContent) && !b.disabled);
				slot?.click();
			});
			await racerB.click('form[action="?/book"] button[type="submit"]');
			await racerB.waitForSelector('[aria-labelledby="booking-confirmed"]', {
				state: 'visible'
			});

			// Now A confirms the slot B just took.
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

	// ── Phone: one column, and nothing hanging off the side ────────────────
	/*
	 * MIGRATION.md section 9 defect 6: a horizontal overflow on this route at
	 * 375px, on the do-not-reproduce list. `check:layout` measures vertical scroll
	 * only, so this is the one place it is checked -- with the panel OPEN, which
	 * is the state that has a month grid and a slot list in it.
	 */
	const apptPhone = await browser.newPage({ viewport: PHONE, hasTouch: true, isMobile: true });
	apptPhone.on('pageerror', (error) => pageErrors.push(`appointments-phone: ${error}`));
	apptPhone.on('console', (msg) => noisy(msg) && pageErrors.push(`appointments-phone: ${msg.text()}`));
	await apptPhone.goto(BASE + '/appointments', { waitUntil: 'networkidle' });
	await apptPhone.click('[data-service]:not([disabled])');
	await apptPhone.waitForSelector('[data-day]', { state: 'visible' });
	await apptPhone.waitForTimeout(SETTLE);

	const sideways = await apptPhone.evaluate(() => {
		const before = window.scrollX;
		window.scrollTo(1e6, 0);
		const maxScroll = Math.round(window.scrollX);
		window.scrollTo(before, 0);
		return { maxScroll, docWidth: document.documentElement.scrollWidth };
	});

	check(
		'the open booking panel does not scroll sideways at 375px',
		sideways.maxScroll <= 1,
		`scrolls ${sideways.maxScroll}px, document ${sideways.docWidth}px wide`
	);
	check(
		'a day cell is a real touch target on a phone',
		(await apptPhone.evaluate(
			() => document.querySelector('[data-day]')?.getBoundingClientRect().height ?? 0
		)) >= 40,
		'comfortable size, so the grid is not a row of pinpricks'
	);
	await apptPhone.close();

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
