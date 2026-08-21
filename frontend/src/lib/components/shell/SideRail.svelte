<script lang="ts">
	import { page } from '$app/state';

	import { isActiveRoute, primaryNav, secondaryNav, type NavItem } from '$lib/nav';

	/**
	 * Desktop navigation rail. Hidden below `lg`, where BottomNav takes over.
	 * Rendered as its own <nav> landmark so screen reader users can jump to it.
	 *
	 * Structural chrome, drawn as a bounded region: a recessed fill and a
	 * hairline edge. The fill is what separates it -- `sunken` against the page's
	 * `bg` -- and the line only tidies the boundary.
	 *
	 * PORTED AT 1px, NOT 2px. The Next source draws `border-r-2` here and its
	 * comment calls that "the standard 2px edge". Both are left over from the
	 * bordered direction of 2026-08-12, which the 08-15 restyle reversed without
	 * sweeping the call sites: under the current direction a decorative hairline
	 * is 1px and only a control boundary is 1.5px. MIGRATION.md section 5 lists
	 * the leftover 2px strokes as an unfinished sweep, and section 9 puts them on
	 * the build-correctly list.
	 *
	 * `RailLink` was its own component in the Next tree, for one reason: the rail
	 * renders two lists and they must not drift. A snippet is the Svelte
	 * equivalent and keeps it in the file that uses it.
	 */

	const pathname = $derived(page.url.pathname);
</script>

{#snippet railLink(item: NavItem)}
	{@const active = isActiveRoute(item.href, pathname)}
	{@const Icon = item.icon}
	<a
		href={item.href}
		aria-current={active ? 'page' : undefined}
		title={item.description}
		class="group relative flex min-h-11 items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-2xs font-medium transition-colors duration-(--motion-fast) ease-standard
			{active
			? // Solid fill plus the control-weight stroke. The stroke is the part
				// that matters: appearing and disappearing is a shape change, so the
				// selected item still reads as selected to someone who cannot separate
				// the forest green from the rail behind it. aria-current carries it
				// non-visually.
				'border-line-strong bg-primary text-on-primary'
			: 'border-transparent text-body hover:border-line hover:bg-surface hover:text-ink'}"
	>
		<!-- Resting icons sit on muted rather than faint. Faint clears the
		     non-text contrast bar but disappears next to 13px/500 labels. -->
		<Icon
			aria-hidden="true"
			class="size-5 shrink-0 {active ? 'text-on-primary' : 'text-muted-ink'}"
		/>
		<span class="truncate">{item.label}</span>
	</a>
{/snippet}

<nav
	aria-label="Primary"
	class="fixed inset-y-0 left-0 z-30 hidden w-rail flex-col border-r border-line bg-sunken lg:flex"
>
	<!-- Ruled off at the same height as the header, so the rail's edge and the
	     top bar's edge continue one line across the shell. -->
	<div class="flex h-topbar shrink-0 items-center border-b border-line px-4">
		<!-- A small tracked cap rather than a headline. One piece of branding at
		     13px / 0.14em, letting the content be the loudest thing on screen.
		     Weight is set here, at the call site: the type scale carries size,
		     leading and tracking only. -->
		<a href="/" class="rounded-sm text-2xs font-medium tracking-[0.14em] text-ink uppercase">
			THRIVE
			<span class="sr-only"> home</span>
		</a>
	</div>

	<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
		{#each primaryNav as item (item.href)}
			<li>{@render railLink(item)}</li>
		{/each}
	</ul>

	<ul class="shrink-0 border-t border-line px-2 py-2">
		{#each secondaryNav as item (item.href)}
			<li>{@render railLink(item)}</li>
		{/each}
	</ul>
</nav>
