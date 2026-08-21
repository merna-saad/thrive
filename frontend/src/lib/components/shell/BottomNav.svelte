<script lang="ts">
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { page } from '$app/state';

	import { escapeKey } from '$lib/actions/escapeKey';
	import { isActiveRoute, primaryNav, secondaryNav, type NavItem } from '$lib/nav';

	/**
	 * Mobile navigation. Replaces SideRail below `lg`.
	 *
	 * Nine destinations do not fit across a phone. The four most-used get a slot;
	 * the rest live behind "More" rather than in a cramped scrolling strip.
	 *
	 * PORTED AT 1px -- see the note in SideRail.
	 */

	const PRIMARY_SLOTS = ['/', '/calendar', '/classes', '/assignments'];

	const barItems: NavItem[] = PRIMARY_SLOTS.map(
		(href) => primaryNav.find((item) => item.href === href)!
	);

	const overflowItems: NavItem[] = [
		...primaryNav.filter((item) => !PRIMARY_SLOTS.includes(item.href)),
		...secondaryNav
	];

	const pathname = $derived(page.url.pathname);
	const overflowActive = $derived(overflowItems.some((item) => isActiveRoute(item.href, pathname)));

	let moreOpen = $state(false);
	let moreButton = $state<HTMLButtonElement | null>(null);

	/**
	 * Close and put focus back where it came from.
	 *
	 * `bind:this` rather than a ref threaded into a hook -- MIGRATION.md section 8
	 * item 6 notes the ref-passing shape existed only to satisfy the React
	 * Compiler's render-phase rules, which do not apply here.
	 *
	 * Called on Escape AND on a scrim click. The Next version only returned focus
	 * on Escape, which left a scrim tap dropping focus to the top of the document.
	 * Following a link does NOT return focus: navigation moves it anyway.
	 */
	function dismissMore() {
		moreOpen = false;
		moreButton?.focus();
	}
</script>

{#snippet barLink(item: NavItem)}
	{@const active = isActiveRoute(item.href, pathname)}
	{@const Icon = item.icon}
	<a
		href={item.href}
		aria-current={active ? 'page' : undefined}
		class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border py-1 text-2xs font-medium transition-colors duration-(--motion-fast) ease-standard
			{active
			? // Same treatment as the rail: a filled, bordered tab. The tint the
				// active tab used to get was doing the job with colour alone, and on a
				// phone in daylight it was doing it badly.
				'border-line-strong bg-primary text-on-primary'
			: 'border-transparent text-muted-ink hover:border-line hover:text-ink'}"
	>
		<Icon aria-hidden="true" class="size-5 shrink-0" />
		<span class="max-w-full truncate">{item.label}</span>
	</a>
{/snippet}

{#if moreOpen}
	<button
		type="button"
		aria-label="Close more navigation"
		onclick={dismissMore}
		class="fixed inset-0 z-30 bg-ink/20 lg:hidden"
	></button>
{/if}

<nav
	aria-label="Primary"
	class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface lg:hidden"
>
	{#if moreOpen}
		<!-- The action's lifetime is this element's, so the keydown listener exists
		     exactly while the sheet does. -->
		<ul
			id="bottom-nav-more"
			use:escapeKey={dismissMore}
			class="grid grid-cols-2 gap-1.5 border-b border-line p-2"
		>
			{#each overflowItems as item (item.href)}
				{@const active = isActiveRoute(item.href, pathname)}
				{@const Icon = item.icon}
				<li>
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						onclick={() => (moreOpen = false)}
						class="flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors duration-(--motion-fast) ease-standard
							{active
							? 'border-line-strong bg-primary text-on-primary'
							: 'border-transparent text-body hover:border-line hover:bg-bg'}"
					>
						<Icon
							aria-hidden="true"
							class="size-5 shrink-0 {active ? 'text-on-primary' : 'text-muted-ink'}"
						/>
						<span class="truncate">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- Only the top pad is set here -- the bottom one belongs to the safe-area
	     inset below, and a py-* would be silently overwritten by it. -->
	<ul
		class="flex h-bottomnav items-stretch gap-1 px-1.5 pt-1"
		style="padding-bottom: env(safe-area-inset-bottom)"
	>
		{#each barItems as item (item.href)}
			<li class="flex min-w-0 flex-1">{@render barLink(item)}</li>
		{/each}

		<li class="flex min-w-0 flex-1">
			<button
				bind:this={moreButton}
				type="button"
				aria-expanded={moreOpen}
				aria-controls="bottom-nav-more"
				onclick={() => (moreOpen = !moreOpen)}
				class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border py-1 text-2xs font-medium transition-colors duration-(--motion-fast) ease-standard
					{moreOpen || overflowActive
					? 'border-line-strong bg-primary text-on-primary'
					: 'border-transparent text-muted-ink hover:border-line hover:text-ink'}"
			>
				<Ellipsis aria-hidden="true" class="size-5 shrink-0" />
				<span>More</span>
			</button>
		</li>
	</ul>
</nav>
