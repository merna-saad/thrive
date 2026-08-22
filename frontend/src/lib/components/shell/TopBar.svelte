<script lang="ts">
	import Bell from '@lucide/svelte/icons/bell';

	import Avatar from '$lib/components/Avatar.svelte';
	import ThemeToggle from '$lib/components/shell/ThemeToggle.svelte';
	import type { Student } from '$lib/data/types';

	/**
	 * Application header: identity on the left, bell and avatar on the right.
	 * Sticky, so it stays put while the page scrolls under it.
	 *
	 * The greeting lives on Home and only there. Repeating it here made the same
	 * three words appear twice on one screen at two different sizes.
	 *
	 * PORTED AT 1px. Same reason as the rail -- see the note there. The Next
	 * source's `border-b-2` and its comment about "its 2px bottom edge" are both
	 * from the reversed direction.
	 *
	 * ## Two heights, one token (2026-08-21)
	 *
	 * 56px on mobile, 48px above `lg`, via a media override on
	 * `--thrive-topbar-height` rather than a class here. The bar was 56px
	 * everywhere to hold two 44px touch targets, and it was paying that on
	 * desktop where nothing touches it -- on every route, not just Home.
	 *
	 * So the CONTROLS are what change size: 44px on mobile, **30.375px** above
	 * `lg`. The bar's height follows from them rather than the other way round.
	 * WCAG 2.5.8 asks 24px of a pointer target and 2.5.5 asks 44px of a touch one;
	 * the desktop size is comfortably past the first and mobile keeps the second
	 * intact.
	 *
	 * ## That number was wrong in this comment for a while, and it said 36px
	 *
	 * Corrected 2026-08-21. `lg:size-9` is `calc(var(--spacing) * 9)`, and the
	 * desktop density pass took `--thrive-spacing` to 0.225rem at a 93.75% root --
	 * so 9 x 3.375px is 30.375px, not the 36 this comment claimed. Nobody
	 * re-measured the bar after that pass; the theme work's new assertion asked for
	 * 36px on the strength of this paragraph and failed, which is how it surfaced.
	 *
	 * **The density is deliberate and the controls are NOT growing** (owner,
	 * 2026-08-21). 30.375px clears the real accessibility floor for a pointer by a
	 * comfortable margin, and this repo's own "36px" was a house preference rather
	 * than a standard. The comment was the thing that was wrong.
	 *
	 * `check:interaction` no longer asserts a number typed here. It measures the
	 * theme toggle against the bell beside it -- the property that actually matters,
	 * that the three controls in this bar match -- plus WCAG 2.5.8's 24px. A
	 * comment stating a measurement decays exactly like any other verification
	 * claim, so the gate does not read it.
	 */
	/**
	 * ## The term is DERIVED, and this bar is why the field is gone
	 *
	 * This used to render `student.currentTerm`, a stored string. It said
	 * "Fall 2026" while the timeline put the student in Summer 2026, so the bar
	 * named one term and Home's strip -- three lines below it -- named another.
	 *
	 * The field was deleted on 2026-08-22 rather than corrected again, and this
	 * prop is what replaced it: `ProgramTimeline.currentTerm`, threaded down from
	 * the root layout. The bar cannot disagree with the strip now, because both
	 * read the same derivation of the same two fields.
	 *
	 * `null` before the program starts or after the finish line, and then the
	 * separator goes with it -- a bare "·" beside a name is worse than nothing.
	 */
	let {
		student,
		currentTerm,
		notificationCount = 0
	}: { student: Student; currentTerm: string | null; notificationCount?: number } = $props();
</script>

<!-- Solid, not translucent. A blurred layer separates itself by depth, and depth
     is what this system stopped using: the header is a bounded region, held
     apart from the content scrolling under it by its fill and its hairline. -->
<header
	class="sticky top-0 z-20 flex h-topbar items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:px-4"
>
	<!-- The wordmark appears only below `lg`. Above it the rail already carries
	     one, and two THRIVEs side by side would repeat exactly the duplication
	     this block replaced. -->
	<div class="flex min-w-0 shrink-0 items-center gap-2">
		<a
			href="/"
			class="rounded-sm text-2xs font-medium tracking-[0.14em] text-ink uppercase lg:hidden"
		>
			THRIVE
			<span class="sr-only"> home</span>
		</a>

		<!-- Both the separator and the term go when there is no current phase. The
		     separator only exists to sit BETWEEN the wordmark and the term, so
		     leaving it behind a null term would render a stray "·" against the edge
		     of the bar. It is already `lg:hidden` because the wordmark is. -->
		{#if currentTerm}
			<span aria-hidden="true" class="text-faint lg:hidden">·</span>

			<p class="min-w-0 truncate text-2xs text-muted-ink">{currentTerm}</p>
		{/if}
	</div>

	<!-- Ask THRIVE used to sit here as a centred field that did nothing. It is a
	     floating widget now, which frees the header's whole middle and gives the
	     real assistant somewhere to land that is not a text input pretending to
	     work. Hidden this phase behind FEATURES.floatingAssistant. -->
	<div class="flex-1"></div>

	<!-- gap-2 is a floor, not a taste call: two 44px targets 4px apart are one
	     mis-tap away from each other on a phone. -->
	<div class="flex shrink-0 items-center gap-2">
		<!-- Theme first, so the two controls that do something to the PAGE sit
		     together and the account mark stays at the edge where it belongs. It is
		     on every route because the bar is, which is the point of putting it here
		     rather than on /settings -- that page is still a placeholder. -->
		<ThemeToggle />

		<!-- The shared IconButton is not ported yet, so its ghost treatment is
		     inlined: a border box held at rest so the button cannot change size on
		     hover, drawing nothing until it is reached for.
		     A real box rather than a padded hit area -- a target you can see beats
		     one you can only hit. 44px on touch, 36px on a pointer. -->
		<button
			type="button"
			aria-label={notificationCount > 0
				? `Notifications, ${notificationCount} unread`
				: 'Notifications'}
			class="relative inline-flex size-11 items-center justify-center rounded-md border border-transparent text-muted-ink transition-[background-color,color,border-color] duration-(--motion-fast) ease-standard hover:border-line hover:bg-sunken hover:text-ink lg:size-9"
		>
			<Bell aria-hidden="true" class="size-5 lg:size-4" />
			{#if notificationCount > 0}
				<!-- The dot rides the icon's corner, so it moves with the button as the
				     box shrinks rather than drifting off the glyph. -->
				<span
					aria-hidden="true"
					class="absolute top-2 right-2 size-2 rounded-pill bg-watch ring-2 ring-surface lg:top-1.5 lg:right-1.5"
				></span>
			{/if}
		</button>

		<!-- A hit area around a smaller mark: the target clears the touch minimum
		     without the avatar itself growing into a headline. Both shrink together
		     above `lg` so the ring of space around the avatar stays even. -->
		<button
			type="button"
			aria-label={`Account menu for ${student.name}`}
			class="flex size-11 items-center justify-center rounded-pill transition-opacity duration-(--motion-fast) ease-standard hover:opacity-80 lg:size-9"
		>
			<Avatar name={student.name} src={student.avatarUrl} class="size-9 lg:size-7" />
		</button>
	</div>
</header>
