<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	import { cn } from '$lib/utils';
	import { messages } from '$lib/messages';
	import { clickOutside } from '$lib/actions/clickOutside';
	import { escapeKey } from '$lib/actions/escapeKey';
	import { hoverIntent } from '$lib/actions/hoverIntent';
	import type { RevealItem } from '$lib/reveal';

	/**
	 * The list behind a number.
	 *
	 * A stat pill says "3 overdue" and this is what it opens: the three actual
	 * tasks, each one a jump to its row on the page. Wraps a trigger rather than
	 * being one, so the pill keeps its own look and this keeps the behaviour.
	 *
	 * ## Click always. Hover only where a cursor exists.
	 *
	 * Click is the way in, on every device. Hover is additive and gated on
	 * `(hover: hover)` -- the same media feature Tailwind compiles every `hover:`
	 * utility in this app into, so the JS opener and the CSS reveals agree about
	 * what a hovering device is. A phone has no cursor, and a popover reachable
	 * only by hover is a popover a phone cannot open. The gate lives in
	 * `hoverIntent` so there is one expression of it; see that file.
	 *
	 * `hoverIntent` sits on the WRAPPER, not the trigger, so moving the mouse off
	 * the pill and onto the panel it just opened is not a "leave".
	 *
	 * ## Hover does not move focus
	 *
	 * Opening by pointer leaves focus where it was; opening by click or keyboard
	 * moves it to the first item. Moving a mouse across a dashboard should never
	 * relocate the caret -- three pills in a row would fling focus about as the
	 * cursor crossed them. Which is also why the component tracks WHY it is open
	 * rather than only whether; see `openedBy`.
	 *
	 * ## Dismissal, and the one focus rule
	 *
	 * Escape, a pointer down outside, or focus leaving the widget. All three route
	 * through `dismiss()`, which restores focus to the trigger IF AND ONLY IF focus
	 * is currently inside the panel. One rule covers every case: Escape from a
	 * keyboard-opened list puts you back on the pill, while a mouse leaving a
	 * hover-opened list moves nothing, because there was nothing of yours in there.
	 *
	 * Choosing an item is the exception, and `dismiss(HAND_OFF)` names it: focus is
	 * about to land on the revealed row, so it must not be pulled back to the pill
	 * on the way. Focus follows the jump, not the dismissal.
	 *
	 * ## Why this is a list and not a menu
	 *
	 * `role="menu"` brings menu keyboard semantics with it -- a single tab stop,
	 * Tab exits, arrow keys are the only way through. That is right for a command
	 * menu and wrong here: these are jump targets, so every one is an ordinary
	 * button in the tab order, and the arrow keys are a convenience on top rather
	 * than the only way through.
	 */
	let {
		items,
		onSelect,
		listLabel,
		triggerClass,
		children
	}: {
		/** Never empty: a caller with nothing to list must not render a popover. */
		items: RevealItem[];
		onSelect: (item: RevealItem) => void;
		/** Names the list for assistive tech, e.g. "3 overdue". */
		listLabel: string;
		/** Applied to the trigger button, so the pill keeps its own look. */
		triggerClass?: string;
		/** The trigger's content. */
		children: Snippet;
	} = $props();

	/** Passed to `dismiss` when focus is about to be placed somewhere else. */
	const HAND_OFF = true;

	const panelId = $props.id();
	const labelId = `${panelId}-label`;

	/**
	 * WHY it is open, not just whether.
	 *
	 * A bare boolean was wrong twice, and both faults only showed up when the page
	 * was driven in a real browser:
	 *
	 *  1. Pressing the pill did nothing visible. A mouse click is preceded by a
	 *     pointer entering, so the hover had already opened the panel and the click
	 *     arrived to find it open and closed it again.
	 *  2. Clicking to open and then moving the mouse closed it, because a pointer
	 *     leaving the widget cannot tell a hover it started from a click it did not.
	 *
	 * With the reason recorded, both answer themselves. Hover opens only what is
	 * shut, hover closes only what hover opened, and a click on a hover-opened panel
	 * PROMOTES it -- the student pressed the button, so they get the pinned version
	 * with focus in the list rather than a panel that vanishes on the next mouse
	 * twitch. Click on an already-pinned panel is the one that closes.
	 */
	type OpenReason = 'pointer' | 'command';

	let openedBy = $state<OpenReason | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);

	const open = $derived(openedBy !== null);

	function itemButtons(): HTMLButtonElement[] {
		return panelEl ? [...panelEl.querySelectorAll<HTMLButtonElement>('button[data-item]')] : [];
	}

	/** `edge` is which end to land on, for ArrowUp opening from the trigger. */
	async function openPanel(reason: OpenReason, edge: 'first' | 'last' = 'first') {
		openedBy = reason;
		if (reason !== 'command') return;

		// The panel does not exist until Svelte has flushed the state above.
		await tick();
		const buttons = itemButtons();
		(edge === 'last' ? buttons.at(-1) : buttons.at(0))?.focus();
	}

	function dismiss(handOff = false) {
		if (!open) return;

		const held = !handOff && panelEl?.contains(document.activeElement);
		openedBy = null;
		if (held) triggerEl?.focus();
	}

	/** Hover never closes a panel the student deliberately opened. */
	function onPointerLeave() {
		if (openedBy === 'pointer') dismiss();
	}

	function onTriggerClick() {
		if (openedBy === 'command') dismiss();
		else void openPanel('command');
	}

	function onTriggerKeydown(event: KeyboardEvent) {
		// Enter and Space already fire `click`. These two are the extra affordance
		// a disclosure holding a list is expected to have.
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			void openPanel('command', 'first');
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			void openPanel('command', 'last');
		}
	}

	/**
	 * Arrow, Home and End across the items.
	 *
	 * On each ITEM rather than on the panel. Focus is always on an item when these
	 * keys should do anything, so the panel was the wrong place twice over: it put
	 * a keydown handler on a `<div>` with no role, and it would have fired for keys
	 * pressed while focus was somewhere else inside the panel entirely.
	 */
	function onItemKeydown(event: KeyboardEvent) {
		const buttons = itemButtons();
		if (buttons.length === 0) return;

		const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
		let next: number | null = null;

		if (event.key === 'ArrowDown') next = at < 0 ? 0 : (at + 1) % buttons.length;
		else if (event.key === 'ArrowUp')
			next = at < 0 ? buttons.length - 1 : (at - 1 + buttons.length) % buttons.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = buttons.length - 1;

		if (next === null) return;
		event.preventDefault();
		buttons[next].focus();
	}

	/**
	 * Tabbing into a hover-opened list pins it.
	 *
	 * Otherwise the panel is still only "pointer-open", so the next time the mouse
	 * drifts off the widget it closes and drags focus back to the pill -- out of a
	 * list the student had just deliberately walked into with the keyboard. Reaching
	 * for it with a key is a command whichever way it opened.
	 */
	function onWidgetFocusin(event: FocusEvent) {
		if (openedBy !== 'pointer') return;
		if (event.target instanceof Node && panelEl?.contains(event.target)) {
			openedBy = 'command';
		}
	}

	/**
	 * Tab out of the widget closes it.
	 *
	 * `relatedTarget` is where focus is GOING. A move between two items inside the
	 * panel keeps it, so the check has to be against the whole widget rather than
	 * against the panel alone. Hand off, because focus has already left and pulling
	 * it back would trap the student in a popover they just tabbed out of.
	 */
	function onWidgetFocusout(event: FocusEvent) {
		const going = event.relatedTarget;
		if (going instanceof Node && event.currentTarget instanceof Node) {
			if (event.currentTarget.contains(going)) return;
		}
		dismiss(HAND_OFF);
	}

	function choose(item: RevealItem) {
		dismiss(HAND_OFF);
		onSelect(item);
	}
</script>

<!-- The positioning context for the panel, and the hover boundary for the whole
     widget. `onfocusout` is a focus event and does bubble, so it belongs here. -->
<div
	class="relative"
	use:hoverIntent={{
		onEnter: () => !open && void openPanel('pointer'),
		onLeave: onPointerLeave
	}}
	onfocusin={onWidgetFocusin}
	onfocusout={onWidgetFocusout}
>
	<button
		bind:this={triggerEl}
		type="button"
		aria-expanded={open}
		aria-controls={panelId}
		onclick={onTriggerClick}
		onkeydown={onTriggerKeydown}
		class={cn('text-left', triggerClass)}
	>
		{@render children()}
	</button>

	{#if open}
		<!-- Mounted only while open, which is what makes `escapeKey` and
		     `clickOutside` need no open state of their own: their listeners exist
		     exactly as long as the thing they dismiss. `aria-controls` names an id
		     that is absent while closed, which is the accepted cost of that -- the
		     alternative is a permanently mounted panel and two permanently mounted
		     document listeners per pill. -->
		<div
			bind:this={panelEl}
			id={panelId}
			use:escapeKey={() => dismiss()}
			use:clickOutside={{ onOutside: () => dismiss(), alsoInside: [triggerEl] }}
			class="thrive-popover absolute top-full left-0 z-20 mt-1 rounded-lg border border-line bg-surface p-1"
		>
			<p id={labelId} class="thrive-eyebrow px-2 py-1">{listLabel}</p>

			<ul aria-labelledby={labelId} class="max-h-60 overflow-y-auto overscroll-contain">
				{#each items as item (item.target.id)}
					<li>
						<button
							data-item
							type="button"
							onclick={() => choose(item)}
							onkeydown={onItemKeydown}
							class="thrive-row group flex w-full min-h-11 items-start gap-2 px-2 py-1.5 text-left lg:min-h-9"
						>
							<span class="min-w-0 flex-1">
								<span class="block text-xs break-words text-ink">{item.title}</span>
								<span
									class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-3xs text-muted-ink"
								>
									<span>{item.detail}</span>
									{#if item.value}
										<span aria-hidden="true">·</span>
										<span class="thrive-numeric">{item.value}</span>
									{/if}
								</span>
							</span>

							<!-- Says the row goes somewhere. The words are for screen
							     readers, since the arrow alone is not a name. -->
							<ArrowRight
								aria-hidden="true"
								class="mt-0.5 size-3 shrink-0 text-muted-ink transition-transform duration-(--motion-fast) ease-standard group-hover:translate-x-0.5"
							/>
							<span class="sr-only">{messages.home.stats.jumpTo(item.title)}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
