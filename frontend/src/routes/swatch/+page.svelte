<script lang="ts">
	/**
	 * THROWAWAY. Delete before Release 1.
	 *
	 * A visual diff target for the design-system port: every colour token, every
	 * type-scale step, both border weights, and both faces on one page, so this
	 * can be compared side by side against the Next app.
	 *
	 * Deliberately not a component. It hardcodes Tailwind strings because its
	 * whole job is to prove the tokens resolve -- reaching for shared primitives
	 * would test those instead.
	 */

	// Surfaces and ink. `onText` is the colour that stays legible on the swatch.
	const surfaces = [
		{ name: 'bg', cls: 'bg-bg', hex: '#faf9f5', note: 'cream page' },
		{ name: 'surface', cls: 'bg-surface', hex: '#ffffff', note: 'panels' },
		{
			name: 'sunken',
			cls: 'bg-sunken',
			hex: '#f1efea',
			note: 'wells, row hover fill, de-emphasis'
		}
	];

	const inks = [
		{ name: 'ink', cls: 'text-ink', hex: '#17181c', note: 'headings, 16.8:1 on cream' },
		{ name: 'body', cls: 'text-body', hex: '#3a3b42', note: 'body copy, 10.6:1' },
		{
			name: 'muted-ink',
			cls: 'text-muted-ink',
			hex: '#6b6c72',
			note: 'ALL secondary text, 4.97:1 cream / 4.55:1 sunken'
		},
		{
			name: 'faint',
			cls: 'text-faint',
			hex: '#85868c',
			note: 'DECORATIVE + control boundaries ONLY, 3.45 / 3.63 / 3.16'
		}
	];

	// Solid fills that carry white or near-white text.
	const fills = [
		{ name: 'primary', cls: 'bg-primary', on: 'text-on-primary', hex: '#3f6b4f', note: 'action accent, 6.13:1 on white' },
		{ name: 'primary-hover', cls: 'bg-primary-hover', on: 'text-on-primary', hex: '#355c43', note: '' },
		{ name: 'primary-active', cls: 'bg-primary-active', on: 'text-on-primary', hex: '#2b4a37', note: '' },
		{ name: 'mint', cls: 'bg-mint', on: 'text-on-mint', hex: '#6aab84', note: 'light fill, always ringed' },
		{ name: 'indigo', cls: 'bg-indigo', on: 'text-on-primary', hex: '#4c5bd4', note: 'RESERVED: "you are here", nothing else' },
		{ name: 'on-track', cls: 'bg-on-track', on: 'text-on-primary', hex: '#3d6fb0', note: 'RESERVED: status only' },
		{ name: 'watch', cls: 'bg-watch', on: 'text-on-primary', hex: '#8f6220', note: 'RESERVED: status only' },
		{ name: 'needs-help', cls: 'bg-needs-help', on: 'text-on-primary', hex: '#6a5fb0', note: 'RESERVED: status only' },
		{ name: 'urgent', cls: 'bg-urgent', on: 'text-on-primary', hex: '#b8462f', note: 'RESERVED hardest: overdue + urgent only' },
		{ name: 'civic', cls: 'bg-civic', on: 'text-on-primary', hex: '#8a5f8f', note: 'categorical only, never status' },
		{ name: 'later', cls: 'bg-later', on: 'text-on-primary', hex: '#64748b', note: 'categorical / neutral priority' }
	];

	// Derived tints. Every one is a color-mix() against white, so they cannot
	// drift from the base hue.
	const tints = [
		{ name: 'primary-soft', cls: 'bg-primary-soft', on: 'text-primary', note: 'literal #e7eee9, not a mix' },
		{ name: 'indigo-soft', cls: 'bg-indigo-soft', on: 'text-indigo', note: 'oklab 8%' },
		{ name: 'on-track-soft', cls: 'bg-on-track-soft', on: 'text-on-track', note: 'oklab 9%' },
		{ name: 'watch-soft', cls: 'bg-watch-soft', on: 'text-watch', note: 'oklab 10%' },
		{ name: 'needs-help-soft', cls: 'bg-needs-help-soft', on: 'text-needs-help', note: 'oklab 9%' },
		{ name: 'urgent-soft', cls: 'bg-urgent-soft', on: 'text-urgent', note: 'oklab 9%' },
		{ name: 'civic-soft', cls: 'bg-civic-soft', on: 'text-civic', note: 'oklab 9%' },
		{ name: 'later-soft', cls: 'bg-later-soft', on: 'text-later', note: 'oklab 9%' }
	];

	// Size, line-height and tracking only. Weight is set at the call site.
	const typeScale = [
		{ cls: 'text-3xs', label: '3xs', px: '12 / 16', use: 'meta, counts, timers' },
		{ cls: 'text-2xs', label: '2xs', px: '13 / 18', use: 'section labels, chips' },
		{ cls: 'text-xs', label: 'xs', px: '14 / 20', use: 'secondary copy' },
		{ cls: 'text-sm', label: 'sm', px: '16 / 23', use: 'BODY DEFAULT' },
		{ cls: 'text-base', label: 'base', px: '18 / 25', use: 'task titles, lead copy' },
		{ cls: 'text-lg', label: 'lg', px: '22 / 28', use: 'section heading' },
		{ cls: 'text-xl', label: 'xl', px: '27 / 33', use: 'tracking -0.025em' },
		{ cls: 'text-2xl', label: '2xl', px: '34 / 39', use: 'tracking -0.03em' },
		{ cls: 'text-3xl', label: '3xl', px: '40 / 44', use: 'page titles only, tracking -0.035em' }
	];

	const radii = [
		{ name: 'xs', cls: 'rounded-xs', px: '4', use: 'small chips' },
		{ name: 'sm', cls: 'rounded-sm', px: '6', use: 'controls, glyph buttons' },
		{ name: 'md', cls: 'rounded-md', px: '8', use: 'inline elements' },
		{ name: 'lg', cls: 'rounded-lg', px: '10', use: 'rows' },
		{ name: 'xl', cls: 'rounded-xl', px: '16', use: 'cards and panels' },
		{ name: 'pill', cls: 'rounded-pill', px: '999', use: 'pills' }
	];

	const motion = [
		{ name: 'motion-fast', value: '120ms' },
		{ name: 'motion-base', value: '160ms' },
		{ name: 'motion-slow', value: '260ms' },
		{ name: 'ease-standard', value: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
		{ name: 'ease-pop', value: 'cubic-bezier(0.2, 1.4, 0.4, 1) — checkbox tick only' }
	];

	const layout = [
		{ name: 'rail', value: '15rem', util: 'pl-rail, w-rail' },
		{ name: 'topbar', value: '3.5rem', util: 'h-topbar' },
		{ name: 'bottomnav', value: '3.75rem', util: 'h-bottomnav' }
	];

	let checked = $state(true);
	let done = $state(true);
</script>

<svelte:head><title>Swatch · THRIVE</title></svelte:head>

<main class="mx-auto w-full max-w-4xl space-y-8 p-6">
	<header>
		<p class="font-mono text-3xs tracking-wider text-muted-ink uppercase">
			design system · port verification
		</p>
		<h1 class="mt-1 text-3xl font-bold text-ink">Swatch</h1>
		<p class="mt-1.5 max-w-prose text-sm text-body">
			Every colour token, every type step, both border weights, both faces. Throwaway route
			for comparing this against the Next app side by side.
		</p>
	</header>

	<!-- ── Fonts ────────────────────────────────────────────────────────── -->
	<section class="thrive-panel space-y-4">
		<h2 class="text-lg font-bold text-ink">Fonts</h2>

		<div class="space-y-1">
			<p class="font-mono text-3xs text-muted-ink uppercase">
				DM Sans — what a person wrote
			</p>
			<p class="font-sans text-base font-normal text-ink">400 · Regular prose sits here.</p>
			<p class="font-sans text-base font-medium text-ink">500 · Row titles and emphasis.</p>
			<p class="font-sans text-base font-bold text-ink">700 · Page and section headings.</p>
			<p class="text-3xs text-muted-ink">
				600 is deliberately not loaded, so <code class="font-mono">font-semibold</code>
				synthesises. Do not use it.
			</p>
		</div>

		<div class="space-y-1">
			<p class="font-mono text-3xs text-muted-ink uppercase">
				JetBrains Mono — machine truth
			</p>
			<p class="font-mono text-base font-normal text-ink">400 · 0123456789 · apt-001</p>
			<p class="font-mono text-base font-medium text-ink">500 · 12/34 · 2026-08-21</p>
			<p class="text-3xs text-muted-ink">
				Numerals, counts, fractions, IDs, compact dates, eyebrows. Prose never in mono.
			</p>
		</div>

		<p class="text-2xs text-body" data-tabular>
			Tabular numerals, so a row does not reflow: <span class="font-mono">in 3 days</span> →
			<span class="font-mono">in 10 days</span>
		</p>
	</section>

	<!-- ── The two border weights ───────────────────────────────────────── -->
	<section class="thrive-panel space-y-4">
		<h2 class="text-lg font-bold text-ink">
			Border weights — the distinction that must not collapse
		</h2>
		<p class="max-w-prose text-xs text-body">
			Two separate concepts, never merged into one token. Getting this wrong is silent: the
			layout looks fine and the accessibility guarantee is gone.
		</p>

		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-2">
				<p class="font-mono text-3xs text-muted-ink uppercase">
					1px decorative hairline
				</p>
				<div class="rounded-lg border border-line bg-surface p-3">
					<p class="text-2xs text-body">
						<code class="font-mono">border border-line</code>
					</p>
					<p class="mt-1 text-3xs text-muted-ink">
						--thrive-hairline #e6e3dc · 1.22:1 · means nothing
					</p>
				</div>
				<div class="rounded-lg border border-hairline-soft bg-surface p-3">
					<p class="text-2xs text-body">
						<code class="font-mono">border-hairline-soft</code>
					</p>
					<p class="mt-1 text-3xs text-muted-ink">
						--thrive-hairline-soft #efece6 · 1.12:1 · inner dividers
					</p>
				</div>
			</div>

			<div class="space-y-2">
				<p class="font-mono text-3xs text-muted-ink uppercase">
					1.5px control boundary
				</p>
				<div
					class="rounded-lg bg-surface p-3"
					style="border: var(--thrive-control-stroke) solid var(--thrive-control-line)"
				>
					<p class="text-2xs text-body">
						<code class="font-mono">--thrive-control-stroke</code> +
						<code class="font-mono">--thrive-control-line</code>
					</p>
					<p class="mt-1 text-3xs text-muted-ink">
						1.5px #85868c · 3.45 / 3.63 / 3.16 · owes 3:1 under WCAG 1.4.11
					</p>
				</div>
				<div class="rounded-lg border border-line-strong bg-surface p-3">
					<p class="text-2xs text-body">
						<code class="font-mono">border border-line-strong</code>
					</p>
					<p class="mt-1 text-3xs text-urgent">
						Careful: this is the control-boundary COLOUR at 1px. The width does not
						come with the alias.
					</p>
				</div>
			</div>
		</div>

		<div class="space-y-2 border-t border-hairline-soft pt-3">
			<p class="font-mono text-3xs text-muted-ink uppercase">
				The only consumers of the 1.5px stroke
			</p>
			<label class="flex items-center gap-2 text-2xs text-body">
				<input type="checkbox" class="thrive-checkbox" bind:checked />
				.thrive-checkbox — 17×17, 5px radius, ease-pop tick
			</label>
			<label class="flex items-center gap-2 text-2xs text-body">
				<input type="checkbox" class="thrive-checkbox" />
				unchecked, so the boundary is the only thing marking it
			</label>
			<p class="text-3xs text-muted-ink">
				Plus <code class="font-mono">--input</code> in layer 2, for shadcn-svelte later.
			</p>
		</div>
	</section>

	<!-- ── Surfaces ─────────────────────────────────────────────────────── -->
	<section class="thrive-panel space-y-3">
		<h2 class="text-lg font-bold text-ink">Surfaces</h2>
		<div class="grid gap-2 sm:grid-cols-3">
			{#each surfaces as s (s.name)}
				<div class="rounded-lg border border-line p-3 {s.cls}">
					<p class="font-mono text-2xs font-medium text-ink">{s.name}</p>
					<p class="font-mono text-3xs text-muted-ink">{s.hex}</p>
					<p class="mt-1 text-3xs text-body">{s.note}</p>
				</div>
			{/each}
		</div>
		<p class="text-3xs text-muted-ink">
			No shadows anywhere. A white card on cream with a hairline is the entire elevation
			system. Nothing floats.
		</p>
	</section>

	<!-- ── Ink ──────────────────────────────────────────────────────────── -->
	<section class="thrive-panel space-y-2">
		<h2 class="text-lg font-bold text-ink">Ink — four steps, only the first three carry text</h2>
		{#each inks as i (i.name)}
			<div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
				<p class="w-24 shrink-0 font-mono text-2xs {i.cls}">{i.name}</p>
				<p class="text-sm {i.cls}">The quick brown fox jumps over the lazy dog</p>
				<p class="font-mono text-3xs text-muted-ink">{i.hex} · {i.note}</p>
			</div>
		{/each}
		<p class="pt-1 text-3xs text-body">
			<span class="text-faint">This line is in faint.</span> It clears 3:1 and stops short of
			4.5 on purpose, so putting words in it fails a contrast check rather than quietly
			shipping. Three of the 43 assertions are ceilings enforcing exactly that.
		</p>
	</section>

	<!-- ── Solid fills ──────────────────────────────────────────────────── -->
	<section class="thrive-panel space-y-3">
		<h2 class="text-lg font-bold text-ink">Solid fills and reserved colours</h2>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each fills as f (f.name)}
				<div class="rounded-lg p-3 {f.cls}">
					<p class="font-mono text-2xs font-medium {f.on}">{f.name}</p>
					<p class="font-mono text-3xs {f.on} opacity-80">{f.hex}</p>
					{#if f.note}<p class="mt-1 text-3xs {f.on} opacity-90">{f.note}</p>{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- ── Derived tints ────────────────────────────────────────────────── -->
	<section class="thrive-panel space-y-3">
		<h2 class="text-lg font-bold text-ink">Derived tints</h2>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each tints as t (t.name)}
				<div class="rounded-lg border border-line p-3 {t.cls}">
					<p class="font-mono text-2xs font-medium {t.on}">{t.name}</p>
					<p class="mt-0.5 text-3xs text-body">{t.note}</p>
				</div>
			{/each}
		</div>
		<p class="text-3xs text-muted-ink">
			Every one is <code class="font-mono">color-mix(in oklab, base N%, white)</code>, so a
			tint can never drift from its base hue.
		</p>
	</section>

	<!-- ── Type scale ───────────────────────────────────────────────────── -->
	<section class="thrive-panel space-y-3">
		<h2 class="text-lg font-bold text-ink">
			Type scale — weight is NOT baked in
		</h2>
		<p class="max-w-prose text-xs text-body">
			Every step below renders at 400 because none of them sets a weight. That is the rule,
			not a bug: set weight at the call site or you get 400.
		</p>
		{#each typeScale as t (t.cls)}
			<div class="border-t border-hairline-soft pt-2">
				<div class="flex flex-wrap items-baseline gap-x-3">
					<code class="font-mono text-3xs text-primary">{t.cls}</code>
					<span class="font-mono text-3xs text-muted-ink">{t.px}</span>
					<span class="text-3xs text-muted-ink">{t.use}</span>
				</div>
				<p class="{t.cls} text-ink">Everything, one page</p>
			</div>
		{/each}
		<div class="border-t border-hairline-soft pt-2">
			<p class="font-mono text-3xs text-muted-ink uppercase">
				the same step, weight set at the call site
			</p>
			<p class="text-xl font-normal text-ink">400 — text-xl font-normal</p>
			<p class="text-xl font-medium text-ink">500 — text-xl font-medium</p>
			<p class="text-xl font-bold text-ink">700 — text-xl font-bold</p>
		</div>
	</section>

	<!-- ── Panels and rows ──────────────────────────────────────────────── -->
	<section class="thrive-panel space-y-3">
		<h2 class="text-lg font-bold text-ink">CSS components</h2>

		<div class="space-y-2">
			<p class="font-mono text-3xs text-muted-ink uppercase">.thrive-panel, by data-tone</p>
			<div class="thrive-panel"><p class="text-2xs text-body">default — white surface</p></div>
			<div class="thrive-panel" data-tone="sunken">
				<p class="text-2xs text-body">data-tone="sunken"</p>
			</div>
			<div class="thrive-panel" data-tone="paper">
				<p class="text-2xs text-body">data-tone="paper"</p>
			</div>
			<div class="thrive-panel" data-emphasis="strong">
				<p class="text-2xs text-body">
					data-emphasis="strong" — control-line colour at 1px, the one visible
					decorative line
				</p>
			</div>
			<div class="thrive-panel" data-flush="true">
				<p class="text-2xs text-body">data-flush="true" — transparent border</p>
			</div>
		</div>

		<div class="space-y-1 border-t border-hairline-soft pt-3">
			<p class="font-mono text-3xs text-muted-ink uppercase">
				.thrive-row — transparent at rest, sunken on hover
			</p>
			<div class="thrive-row p-2"><p class="text-2xs text-body">Hover me</p></div>
			<div class="thrive-row p-2"><p class="text-2xs text-body">And me</p></div>
			<div class="thrive-row p-2" data-done="true">
				<p class="text-2xs text-body">data-done="true" — opacity 0.62</p>
			</div>
		</div>

		<div class="space-y-2 border-t border-hairline-soft pt-3">
			<p class="font-mono text-3xs text-muted-ink uppercase">
				.thrive-strike — scaleX, not line-through
			</p>
			<label class="flex items-center gap-2">
				<input type="checkbox" class="thrive-checkbox" bind:checked={done} />
				<span class="thrive-strike text-base text-ink" data-done={done}>
					Finish the design system port
				</span>
			</label>
			<p class="text-3xs text-muted-ink">
				Animates <code class="font-mono">transform</code>, never
				<code class="font-mono">width</code> — a transform runs on the compositor.
			</p>
		</div>
	</section>

	<!-- ── Radii, motion, layout ────────────────────────────────────────── -->
	<section class="thrive-panel space-y-4">
		<h2 class="text-lg font-bold text-ink">Radii, motion, layout</h2>

		<div class="space-y-2">
			<p class="font-mono text-3xs text-muted-ink uppercase">radii</p>
			<div class="flex flex-wrap gap-2">
				{#each radii as r (r.name)}
					<div class="border border-line-strong bg-sunken px-3 py-2 {r.cls}">
						<p class="font-mono text-3xs text-ink">{r.name} · {r.px}px</p>
						<p class="text-3xs text-muted-ink">{r.use}</p>
					</div>
				{/each}
			</div>
		</div>

		<div class="space-y-1 border-t border-hairline-soft pt-3">
			<p class="font-mono text-3xs text-muted-ink uppercase">motion</p>
			{#each motion as m (m.name)}
				<p class="font-mono text-3xs text-body">
					<span class="text-primary">{m.name}</span> · {m.value}
				</p>
			{/each}
			<button
				class="mt-1 rounded-sm border border-line-strong bg-surface px-3 py-1.5 text-2xs font-medium text-body transition-colors duration-(--motion-base) ease-standard hover:bg-sunken hover:text-ink"
			>
				hover me — duration-(--motion-base) ease-standard
			</button>
			<p class="text-3xs text-muted-ink">
				A global prefers-reduced-motion rule collapses every animation and transition to
				0.01ms. State changes still land, they just land instantly.
			</p>
		</div>

		<div class="space-y-1 border-t border-hairline-soft pt-3">
			<p class="font-mono text-3xs text-muted-ink uppercase">layout constants</p>
			{#each layout as l (l.name)}
				<p class="font-mono text-3xs text-body">
					<span class="text-primary">{l.name}</span> · {l.value} ·
					<span class="text-muted-ink">{l.util}</span>
				</p>
			{/each}
			<div class="mt-2 h-topbar rounded-md bg-primary-soft">
				<p class="p-2 font-mono text-3xs text-primary">h-topbar — 3.5rem</p>
			</div>
			<div class="mt-1 w-rail rounded-md bg-primary-soft">
				<p class="p-2 font-mono text-3xs text-primary">w-rail — 15rem</p>
			</div>
		</div>
	</section>

	<!-- ── Focus and animation ──────────────────────────────────────────── -->
	<section class="thrive-panel space-y-3">
		<h2 class="text-lg font-bold text-ink">Base-layer behaviour</h2>
		<p class="text-xs text-body">
			Tab through these. One focus treatment app-wide: 2px primary outline, 2px offset,
			radius-sm.
		</p>
		<div class="flex flex-wrap gap-2">
			<button class="rounded-md border border-line bg-surface px-3 py-1.5 text-2xs text-body">
				button
			</button>
			<a href="/swatch" class="rounded-md border border-line bg-surface px-3 py-1.5 text-2xs text-body">
				link
			</a>
			<input
				type="text"
				placeholder="input — border takes --input"
				class="rounded-md bg-surface px-3 py-1.5 text-2xs text-body"
				style="border: var(--thrive-control-stroke) solid var(--input)"
			/>
		</div>
		<div class="animate-rise border-t border-hairline-soft pt-3">
			<p class="font-mono text-3xs text-muted-ink uppercase">.animate-rise</p>
			<p class="text-2xs text-body">
				This block faded and rose on load. Reload to replay.
			</p>
		</div>
		<p class="text-3xs text-muted-ink">
			Below 40rem the root goes to 106.25%, lifting body to ~16px on phones. Resize a
			narrow window to see the whole system scale together.
		</p>
	</section>

	<section class="thrive-panel" data-tone="sunken">
		<h2 class="text-2xs font-bold text-ink">Deliberately absent</h2>
		<ul class="mt-1 space-y-0.5 text-3xs text-body">
			<li>
				No shadows. <code class="font-mono">--thrive-shadow-card</code> and
				<code class="font-mono">--thrive-shadow-lifted</code> were dropped in this port —
				both resolved to <code class="font-mono">none</code> and zero call sites
				referenced them.
			</li>
			<li>
				No <code class="font-mono">.thrive-priority-label</code> — defined in the Next
				app, used by nothing.
			</li>
			<li>
				No dark mode. <code class="font-mono">dark:</code> is pinned to a class nothing
				applies.
			</li>
			<li>No shadcn-svelte or bits-ui yet — later phase.</li>
		</ul>
	</section>
</main>
