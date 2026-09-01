<script lang="ts">
	import { cn } from '$lib/utils';
	import { messages } from '$lib/messages';
	import { abbreviateTerm, phaseStatusWord } from '$lib/programStrip';
	import TermPlanPanel from './TermPlanPanel.svelte';
	import type { ProgramTimeline } from '$lib/data';
	import type { TermPlan } from '$lib/homeView';

	/**
	 * The program as a strip. The full stepper lives on /degree.
	 *
	 * Read-only, and derived end to end: nothing here is stored. `percentComplete`
	 * and `expectedFinishTerm` are computed by `buildProgramTimeline` from the
	 * student's start date and track, so switching track moves both with no edit.
	 *
	 * ## Bare, not a panel
	 *
	 * This used to carry `.thrive-panel px-3 py-2.5` and sit as its own box above
	 * the greeting. It is now a band inside `HomeHeader`'s single panel, because
	 * two stacked boxes cost a set of panel padding and a stack gap -- 32px of
	 * measured height for a boundary that was not saying anything. It keeps its
	 * `<section>` and its `aria-labelledby`: the landmark was never the panel.
	 */
	let {
		timeline,
		termPlans
	}: {
		timeline: ProgramTimeline;
		/** What each phase holds, keyed by phase id. Built in the load. */
		termPlans: Record<string, TermPlan>;
	} = $props();

	const current = $derived(timeline.phases.find((phase) => phase.id === timeline.currentPhaseId));

	/**
	 * Which phase's plan is open, or null. AN ACCORDION: one at a time.
	 *
	 * Six triggers over ONE region, which is the shape that keeps this honest at
	 * six terms — six independent regions would mean six panels can be open at
	 * once and Home stops fitting a screen by the third. Pressing the open one
	 * closes it, so the strip is never stuck open.
	 *
	 * Not persisted. An open panel is a momentary intent, the same call the card
	 * collapse and the calendar's selected day make.
	 */
	let openPhase = $state<string | null>(null);

	const PANEL_ID = 'program-term-plan';

	const openPlan = $derived(openPhase ? (termPlans[openPhase] ?? null) : null);

	function toggle(phaseId: string) {
		openPhase = openPhase === phaseId ? null : phaseId;
	}
</script>

<!-- ITS OWN PANEL SINCE 2026-08-31. It used to be a band inside `HomeHeader`'s
     box and inherited that panel's edge; standing at the foot of the page it needs
     one of its own or it reads as loose text under the grid. -->
<section aria-labelledby="program-strip-heading" class="thrive-panel p-4 lg:p-5">
	<div class="flex flex-wrap items-baseline justify-between gap-x-3">
		<!-- A <p>, not an <h2>. This strip renders above the page's <h1>, so a
		     heading here would put the document out of order for anyone navigating
		     by headings. `aria-labelledby` names the section from it either way --
		     the relationship never needed the element to be a heading.

		     The term alone, not label plus term: now that the opening phase is named
		     after its quarter, "Summer Quarter · Summer 2026" said the same thing
		     twice. -->
		<p id="program-strip-heading" class="text-2xs text-ink">
			{current ? current.term : messages.home.timeline.fallbackTerm}
			{#if current}
				<span class="font-normal text-muted-ink">{messages.home.timeline.youAreHere}</span>
			{/if}
		</p>
		<!-- The percentage is a value, so mono; the sentence around it is words.
		     Two message entries rather than one -- see the note in messages.ts. -->
		<p class="text-2xs text-muted-ink">
			<span class="thrive-numeric text-primary">
				{messages.home.timeline.progressPercent(timeline.percentComplete)}
			</span>{messages.home.timeline.progressRest(timeline.expectedFinishTerm)}
		</p>
	</div>

	<!-- Pips repeat the stepper's states in miniature, each named by the term
	     printed under it, so the row is not colour-only and does not rely on a
	     `title` tooltip that touch and keyboard could never reach.

	     Every pip is a solid fill inside a stroke. An earlier pass drew "current"
	     at 45% primary (1.96:1) and "upcoming" as a bare fill, both under the 3:1
	     a meaningful graphic has to clear -- the row of pips is the only place the
	     strip shows progress, so it cannot be a hint. Required and optional
	     upcoming phases are told apart by stroke colour, not by a dash. -->
	<ol class="mt-1 flex items-start gap-1">
		{#each timeline.phases as phase (phase.id)}
			<li
				aria-current={phase.status === 'current' ? 'step' : undefined}
				class="min-w-0 flex-1"
			>
				<!--
					EVERY pip is a button, including the current term.

					A strip where five of six things are pressable and one is not reads
					as broken — the same argument that made the appointments month grid
					clickable again. The current term has real content to show (the
					enrolled classes and when they meet), so it opens too; what differs
					is what comes back, not whether anything does.

					`min-h-11` for a 44px touch target on a phone, which the pip and its
					8px bar could never be on their own. `aria-expanded` is per-trigger
					and `aria-controls` names the one shared region — six triggers over
					one region is an accordion, and only the pressed one reports itself
					expanded.
				-->
				<button
					type="button"
					aria-expanded={openPhase === phase.id}
					aria-controls={PANEL_ID}
					aria-label={openPhase === phase.id
						? messages.home.timeline.plan.close(phase.term)
						: messages.home.timeline.plan.open(phase.term)}
					onclick={() => toggle(phase.id)}
					class="block w-full min-h-11 rounded-sm px-0.5 pt-1 pb-0.5 transition-colors duration-(--motion-fast) ease-standard hover:bg-sunken lg:min-h-0"
				>
				<span
					aria-hidden="true"
					class={cn(
						'block h-2 rounded-pill border',
						phase.status === 'complete' && 'border-line-strong bg-primary',
						phase.status === 'current' && 'border-primary bg-primary-fill',
						phase.status === 'upcoming' && !phase.optional && 'border-line-strong bg-surface',
						phase.status === 'upcoming' && phase.optional && 'border-line bg-sunken'
					)}
				></span>

				<!-- The term under the bar rather than inside it. Inside, the label
				     would sit on three different fills and would need a different
				     colour on each to stay legible. Under it, every label is on the
				     panel surface, so one contrast pair covers all six states.

				     Two spellings, swapped by CSS rather than by measuring: six full
				     terms cannot fit across a phone. `aria-hidden` on both because the
				     spoken label below already says the term in full. -->
				<span
					aria-hidden="true"
					class={cn(
						'block truncate text-center text-3xs',
						phase.status === 'current' ? 'text-ink' : 'text-muted-ink'
					)}
				>
					<span class="sm:hidden">{abbreviateTerm(phase.term)}</span>
					<span class="max-sm:hidden">{phase.term}</span>
				</span>
				<span class="sr-only">
					{messages.home.timeline.phaseStatus(
						phase.label,
						phase.term,
						phaseStatusWord[phase.status],
						phase.optional
					)}
				</span>
				</button>
			</li>
		{/each}
	</ol>

	<!--
		The plan opens BELOW the strip, in the reading order, rather than in a
		popover anchored to a pip.

		Three reasons. The last pip sits at the right edge of the panel, so a
		popover would either cover the pips it came from or need the clamp to shove
		it back over them. The content wants WIDTH — a course title runs to 55
		characters and the popover token is 272px. And a row under the strip needs
		no anchoring geometry at all, which is the thing most likely to be subtly
		wrong at six positions across four breakpoints.

		Kept out of the DOM when shut, so it is out of the tab order rather than
		merely invisible.
	-->
	<div id={PANEL_ID}>
		{#if openPlan}
			<TermPlanPanel plan={openPlan} />
		{/if}
	</div>
</section>
