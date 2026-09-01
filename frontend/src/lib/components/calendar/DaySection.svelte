<script lang="ts">
	import ItemRow from '$lib/components/calendar/ItemRow.svelte';
	import SectionHeading from '$lib/components/SectionHeading.svelte';
	import type { ScheduleItem } from '$lib/schedule';
	import { isTickable } from '$lib/tickItem';

	/**
	 * One titled group of items on the selected day.
	 *
	 * There will be several of these on a day -- classes, what is due, what the
	 * student set themselves, booked time -- and near-copies of a section shell is
	 * exactly how they start to disagree about padding, heading level and how a
	 * row looks.
	 */
	let {
		id,
		title,
		items,
		density = 'full',
		onTick,
		onOpen
	}: {
		id: string;
		title: string;
		items: ScheduleItem[];
		/**
		 * Passed straight through to every row. See `ItemRow`.
		 *
		 * ADDITIVE, and deliberately so: it defaults to `full`, so this component's
		 * existing contract is unchanged and no call site had to move. The rail
		 * needed a narrower row, not a different section.
		 *
		 * Chosen over a container query, which was the tempting alternative -- the
		 * row would read its own width and adapt with no prop at all. The failure
		 * mode decided it: a container query with no `@container` ancestor never
		 * matches, so a section rendered somewhere that forgot the ancestor would
		 * silently pick the narrow shape and look almost right. An explicit prop is
		 * greppable and cannot fail quietly, which is the trade this repo makes
		 * everywhere else.
		 */
		density?: 'full' | 'rail' | 'column';
		onTick?: (item: ScheduleItem, done: boolean) => void;
		/** Passed straight through to the row. See `ItemRow`. */
		onOpen?: (item: ScheduleItem) => void;
	} = $props();

	/*
	 * THE COUNT IS OVER TICKABLE ITEMS, NOT OVER THE TOTAL. This was a real bug,
	 * it was fixed, and it must not come back.
	 *
	 * It used to read `done / items.length`, so a group holding one finished task
	 * and two classes rendered "1/3" and told the student three things could be
	 * ticked. Two of them could not be ticked by anyone: a class is not a thing
	 * you complete.
	 *
	 * `isTickable` is the same question the row's checkbox asks -- is a writable
	 * source row attached -- so the fraction's denominator is exactly the number
	 * of checkboxes rendered below it. Anything else lets the heading and the list
	 * disagree.
	 *
	 * A group with nothing tickable falls back to a bare total, because "0/0" is
	 * not information.
	 */
	const tickables = $derived(items.filter((entry) => isTickable(entry)));
	const done = $derived(tickables.filter((entry) => entry.done === true).length);
	const count = $derived(
		tickables.length > 0 ? `${done}/${tickables.length}` : `${items.length}`
	);
</script>

<!-- Empty groups are dropped by `groupDayItems` before they reach here, so a
     section that renders always has something in it and needs no empty state. -->
{#if items.length > 0}
	<section aria-labelledby={id} class="thrive-panel">
		<!-- Quiet in the rail. "Tasks" and "Classes" are wayfinding inside one day's
		     list, not things competing with the day heading above them -- see the
		     two-focal-points note in `CalendarView`. Loud everywhere else, because
		     under the grid and in the agenda this heading IS the top of its block. -->
		<SectionHeading
			as="h3"
			{id}
			{title}
			{count}
			tone={density === 'rail' ? 'quiet' : 'default'}
		/>

		<!-- REAL GAP BETWEEN CARDS IN THE RAIL. `space-y-0.5` is a list separator --
		     right when rows are rows inside a panel, wrong when each row is its own
		     white card, because two cards 1.7px apart read as one card with a seam. -->
		<ul class={density === 'rail' ? 'mt-2 space-y-2' : 'mt-2 space-y-0.5'}>
			{#each items as item (item.id)}
				<li>
					<ItemRow {item} {density} {onTick} {onOpen} />
				</li>
			{/each}
		</ul>
	</section>
{/if}
