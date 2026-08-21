<script lang="ts">
	import Bell from '@lucide/svelte/icons/bell';

	import Avatar from '$lib/components/Avatar.svelte';
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
	 */
	let {
		student,
		notificationCount = 0
	}: { student: Student; notificationCount?: number } = $props();
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

		<span aria-hidden="true" class="text-faint lg:hidden">·</span>

		<p class="min-w-0 truncate text-2xs text-muted-ink">{student.currentTerm}</p>
	</div>

	<!-- Ask THRIVE used to sit here as a centred field that did nothing. It is a
	     floating widget now, which frees the header's whole middle and gives the
	     real assistant somewhere to land that is not a text input pretending to
	     work. Hidden this phase behind FEATURES.floatingAssistant. -->
	<div class="flex-1"></div>

	<!-- gap-2 is a floor, not a taste call: two 44px targets 4px apart are one
	     mis-tap away from each other on a phone. -->
	<div class="flex shrink-0 items-center gap-2">
		<!-- The shared IconButton is not ported yet, so its ghost treatment is
		     inlined: a border box held at rest so the button cannot change size on
		     hover, drawing nothing until it is reached for. A real 44px box rather
		     than a 36px one with a padded hit area -- this is chrome in a bar with
		     room for it, and a target you can see beats one you can only hit. -->
		<button
			type="button"
			aria-label={notificationCount > 0
				? `Notifications, ${notificationCount} unread`
				: 'Notifications'}
			class="relative inline-flex size-11 items-center justify-center rounded-md border border-transparent text-muted-ink transition-[background-color,color,border-color] duration-(--motion-fast) ease-standard hover:border-line hover:bg-sunken hover:text-ink"
		>
			<Bell aria-hidden="true" class="size-5" />
			{#if notificationCount > 0}
				<span
					aria-hidden="true"
					class="absolute top-2 right-2 size-2 rounded-pill bg-watch ring-2 ring-surface"
				></span>
			{/if}
		</button>

		<!-- A 44px hit area around a 36px mark: the target clears the touch
		     minimum without the avatar itself growing into a headline. -->
		<button
			type="button"
			aria-label={`Account menu for ${student.name}`}
			class="flex size-11 items-center justify-center rounded-pill transition-opacity duration-(--motion-fast) ease-standard hover:opacity-80"
		>
			<Avatar name={student.name} src={student.avatarUrl} class="size-9" />
		</button>
	</div>
</header>
