<script lang="ts">
	import Monitor from '@lucide/svelte/icons/monitor';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';

	import { nextTheme, readTheme, setTheme, theme, type ThemeChoice } from '$lib/theme';

	/**
	 * The theme control: one button, cycling system -> light -> dark.
	 *
	 * ## Why one button rather than three
	 *
	 * A three-state segmented control shows all its options at once, which is the
	 * better affordance, and it does not fit. The bar holds the wordmark, the term,
	 * a bell and an avatar, and at 375px the two existing controls are already
	 * 88px of a header whose left side is text that must not truncate. Three 44px
	 * touch targets is another 132px. Measured against the existing bar rather than
	 * guessed at: the segmented form needs a width the phone does not have, and
	 * duplicating the control per breakpoint is the thing `AppShell` explicitly
	 * does not do ("one instance, two widths, CSS deciding").
	 *
	 * ## What a cycling button owes, since its next state is not visible
	 *
	 * The label says BOTH halves: where you are and what pressing does. "Theme:
	 * system. Switch to light." A cycling control whose label names only its
	 * current state leaves a screen-reader user pressing to find out, and a
	 * control whose label names only its action leaves them unable to ask.
	 *
	 * `aria-live` is deliberately NOT here. The button's own accessible name
	 * changes when it is pressed, and a focused control renaming itself is already
	 * announced; a live region would say it twice.
	 *
	 * The icon is the current state, never the action -- a sun that means "press
	 * for light" and a sun that means "you are in light" cannot both be right, and
	 * the icon is decoration on top of a label that already says it.
	 */

	const current = $derived(theme());

	/**
	 * The label, as one sentence per state.
	 *
	 * Written out rather than assembled from a name and a verb: "Switch to
	 * system" is worse English than "Follow the system setting", and three
	 * hand-written sentences beat a template that produces one bad one.
	 */
	const LABELS: Record<ThemeChoice, string> = {
		system: 'Theme: following your system setting. Switch to light.',
		light: 'Theme: light. Switch to dark.',
		dark: 'Theme: dark. Follow your system setting instead.'
	};

	function press() {
		// `readTheme`, not the derived: a handler must not depend on a reactive read
		// having settled, and this is the store layer's own escape hatch for
		// exactly this case.
		setTheme(nextTheme(readTheme()));
	}
</script>

<!-- Same ghost treatment as the bell beside it: a transparent border held at
     rest so the box cannot change size on hover, 44px on touch and 36px on a
     pointer. Copied deliberately rather than extracted -- the shared IconButton
     is still not ported, and two inline copies is the state TopBar is already
     in. Whoever ports it takes both. -->
<button
	type="button"
	onclick={press}
	aria-label={LABELS[current]}
	title={LABELS[current]}
	data-theme-toggle={current}
	class="inline-flex size-11 items-center justify-center rounded-md border border-transparent text-muted-ink transition-[background-color,color,border-color] duration-(--motion-fast) ease-standard hover:border-line hover:bg-sunken hover:text-ink lg:size-9"
>
	{#if current === 'system'}
		<Monitor aria-hidden="true" class="size-5 lg:size-4" />
	{:else if current === 'light'}
		<Sun aria-hidden="true" class="size-5 lg:size-4" />
	{:else}
		<Moon aria-hidden="true" class="size-5 lg:size-4" />
	{/if}
</button>
