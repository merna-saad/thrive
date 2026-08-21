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
import { existsSync, readdirSync } from 'node:fs';
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

const server = spawn(process.execPath, [ENTRY], {
	cwd: FRONTEND,
	env: { ...process.env, PORT: String(PORT) },
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
