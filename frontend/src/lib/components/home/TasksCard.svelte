<script lang="ts">
	import CheckCheck from '@lucide/svelte/icons/check-check';

	import { messages } from '$lib/messages';
	import { COLLAPSED_TASK_ROWS } from '$lib/cardLayout';
	import { collapseList } from '$lib/collapse';
	import { buildHomeGroups, nonEmptyGroups } from '$lib/homeGroups';
	import { planReveal } from '$lib/reveal';
	import { focusRevealedRow, getRevealChannel } from '$lib/reveal.svelte';
	import { taskDoneOverrides } from '$lib/userEdits.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import SectionCard from '$lib/components/ui/SectionCard.svelte';
	import ShowMore from '$lib/components/ui/ShowMore.svelte';
	import TaskRow from './TaskRow.svelte';
	import type { HomeRow } from '$lib/homeGroups';

	/**
	 * Home's Tasks card. READ-ONLY this phase -- see TaskRow.
	 *
	 * ## Why this reads the done store rather than trusting the server
	 *
	 * `task.done` is the fixture's answer. The student's own ticks live in
	 * `localStorage` and outlive a reload, so grouping by `task.done` alone would
	 * show a task ticked last week back under "Overdue". Ticking is disabled this
	 * phase, but the overrides are PERSISTED, so they can already exist -- which is
	 * why the store is read now rather than in 6b.
	 *
	 * Grouping and counting are in `$lib/homeGroups`, pure and tested. This
	 * component decides only what is on screen.
	 *
	 * ## Collapsed is FLAT. Expanded is grouped.
	 *
	 * This is the one real design decision in the phase, and it came from
	 * measuring rather than taste.
	 *
	 * With the progress bar, three group headings, the Done heading and the gaps
	 * between sections, this card carried about 190px of fixed furniture before its
	 * first task row -- three and a half rows' worth. At any cap that let the grid
	 * fit a laptop viewport, the card showed one task. The furniture was using the
	 * space the tasks needed.
	 *
	 * So collapsed, the card shows a flat list of the next four things and no
	 * headings at all; each row already states its own urgency in its labels
	 * ("Urgent", "Due soon"), so the heading was the redundant carrier, not the
	 * only one. The progress bar moved into the header band, which is outside the
	 * scroll area entirely. Expanded, the headings come back -- once you are
	 * reading the whole list, knowing where "Today" ends is worth its 22px.
	 *
	 * Overhead collapsed is now the Done heading alone.
	 *
	 * ## The collapse does not persist
	 *
	 * Local `$state`, deliberately not in the override store. An expanded card is a
	 * momentary intent -- "let me see the rest of this" -- not a preference, and a
	 * card that remembers being open makes the one-screen guarantee conditional on
	 * history. It resets on navigation, which is also what a reader expects from a
	 * disclosure.
	 *
	 * The done group starts collapsed behind its count: it is the record of what is
	 * finished, not the list of what to do.
	 *
	 * ## Reveal is a second way to open it, not a replacement
	 *
	 * A stat pill's popover can ask for a row that is currently collapsed. The card
	 * answers that itself: it reads the page's reveal channel, checks whether the
	 * request is about one of its own rows, and if the row is past the collapsed
	 * slice it sets its OWN `openExpanded`. Nothing outside writes that variable,
	 * and `ShowMore` still toggles it exactly as before -- a student can collapse
	 * again straight afterwards.
	 *
	 * Expanding cannot move the grid: `.thrive-card-body` is a FIXED height above
	 * `lg`, not a maximum, so growing the content can only ever scroll it. That
	 * guarantee was already in place and this feature needs nothing added to it.
	 */
	let { rows }: { rows: HomeRow[] } = $props();

	const reveal = getRevealChannel();

	let openExpanded = $state(false);
	let doneExpanded = $state(false);

	const board = $derived(buildHomeGroups(rows, taskDoneOverrides()));
	const groups = $derived(nonEmptyGroups(board.groups));

	/**
	 * The open rows in group order, flattened.
	 *
	 * Flattened so the collapse counts ROWS rather than groups. Collapsing per
	 * group would show four overdue, four today and four this week -- twelve rows,
	 * and no cap held. A student cares how much is on screen, not how much is on
	 * screen per heading.
	 */
	const flatOpen = $derived(groups.flatMap((group) => group.rows));

	const openCollapse = $derived(collapseList(flatOpen, COLLAPSED_TASK_ROWS, openExpanded));
	const doneCollapse = $derived(collapseList(board.done, 0, doneExpanded));

	/**
	 * The last reveal request this card acted on.
	 *
	 * A plain `let`, deliberately not `$state`: writing it must not re-trigger the
	 * effect that writes it. It is what makes handling idempotent without the
	 * channel needing a `clear()` -- and clearing from in here would be this card
	 * deciding on behalf of Upcoming Events, with effect ordering settling which of
	 * them saw the request.
	 */
	let handledNonce = -1;

	/*
	 * Answer a reveal request, if it is about one of these rows.
	 *
	 * `flatOpen` and `board.done` are read here and NOT `openCollapse` /
	 * `doneCollapse`. That is not tidiness: the collapse states depend on
	 * `openExpanded`, so reading one would make this effect depend on the variable
	 * it writes, and the write would re-run it. `planReveal` takes the full list
	 * and the limit and answers the same question without the cycle.
	 *
	 * The done group is included. Neither pill counts a done task today, so this
	 * branch is unreachable from Home as it stands -- it is here because the
	 * alternative is a card that silently ignores half its own rows, and 6b's undo
	 * is going to want exactly this path.
	 */
	$effect(() => {
		const request = reveal.current();
		if (!request || request.nonce === handledNonce) return;
		if (request.target.kind !== 'task') return;

		const openIds = flatOpen.map((row) => row.task.id);
		const openPlan = planReveal(openIds, COLLAPSED_TASK_ROWS, request.target.id);

		if (openPlan.found) {
			handledNonce = request.nonce;
			if (openPlan.expand) openExpanded = true;
			void focusRevealedRow(request.target);
			return;
		}

		const donePlan = planReveal(
			board.done.map((row) => row.task.id),
			0,
			request.target.id
		);

		if (donePlan.found) {
			handledNonce = request.nonce;
			if (donePlan.expand) doneExpanded = true;
			void focusRevealedRow(request.target);
		}
	});
</script>

<SectionCard
	title={messages.home.tasks.title}
	description={messages.home.tasks.description}
	href="/assignments"
>
	{#snippet meta()}
		<!-- In the header band, not the body: it is always present and never
		     scrolled to, so inside the cap it was pure overhead. -->
		<ProgressBar
			value={board.percent}
			label={messages.home.tasks.progressLabel}
			valueText={messages.home.tasks.progressValue(board.doneCount, board.total)}
			showLabel
			tone={board.doneCount === board.total ? 'onTrack' : 'primary'}
		/>
	{/snippet}

	<!-- One live region for the count. Three would talk over each other on a
	     single action; 6b adds undo and moves to this same sentence. -->
	<p aria-live="polite" class="sr-only">
		{messages.home.tasks.liveCount(board.doneCount, board.total)}
	</p>

	<div id="tasks-card-list" class="space-y-3">
		{#if openCollapse.isExpanded}
			<!-- Expanded: grouped, because once you are reading the whole list,
			     knowing where "Today" ends is worth the headings' height. -->
			{#each groups as group (group.key)}
				<section aria-label={group.heading}>
					<h3 class="mb-1 text-2xs font-medium text-ink uppercase">{group.heading}</h3>
					<div class="space-y-1">
						{#each group.rows as row (row.task.id)}
							<TaskRow task={row.task} due={row.due} done={false} />
						{/each}
					</div>
				</section>
			{/each}
		{:else if flatOpen.length > 0}
			<!-- Collapsed: flat. Every row still states its own urgency in its
			     labels, so no information is lost with the headings. -->
			<div class="space-y-1">
				{#each openCollapse.visible as row (row.task.id)}
					<TaskRow task={row.task} due={row.due} done={false} />
				{/each}
			</div>
		{/if}

		{#if board.done.length > 0}
			<section aria-label={messages.taskGroups.done}>
				<h3 class="mb-1 text-2xs font-medium text-muted-ink uppercase">
					{messages.taskGroups.done}<span class="thrive-numeric">
						{messages.common.countSuffix(board.done.length)}
					</span>
				</h3>
				{#if doneCollapse.visible.length > 0}
					<div class="space-y-1">
						{#each doneCollapse.visible as row (row.task.id)}
							<TaskRow task={row.task} due={row.due} done={true} />
						{/each}
					</div>
				{/if}
				{#if doneCollapse.canExpand}
					<ShowMore
						hiddenCount={doneCollapse.hiddenCount}
						expanded={doneCollapse.isExpanded}
						controls="tasks-card-list"
						onToggle={() => (doneExpanded = !doneExpanded)}
					/>
				{/if}
			</section>
		{/if}

		{#if flatOpen.length === 0 && board.done.length === 0}
			<EmptyState icon={CheckCheck} message={messages.home.tasks.emptyAll} />
		{:else if flatOpen.length === 0}
			<EmptyState icon={CheckCheck} message={messages.home.tasks.emptyOpen} />
		{/if}
	</div>

	{#snippet footer()}
		{#if openCollapse.canExpand}
			<ShowMore
				hiddenCount={openCollapse.hiddenCount}
				expanded={openCollapse.isExpanded}
				controls="tasks-card-list"
				onToggle={() => (openExpanded = !openExpanded)}
			/>
		{/if}
		<!-- Says why the checkboxes do nothing, so a disabled row reads as
		     unfinished rather than broken. Goes when 6b lands. -->
		<p class="mt-1 text-center text-3xs text-muted-ink">
			{messages.home.tasks.readOnlyHint}
		</p>
	{/snippet}
</SectionCard>
