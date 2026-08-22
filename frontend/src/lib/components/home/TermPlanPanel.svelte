<script lang="ts">
	import Sparkles from '@lucide/svelte/icons/sparkles';

	import { messages } from '$lib/messages';
	import { cn } from '$lib/utils';
	import type { TermPlan } from '$lib/homeView';

	/**
	 * What a term on the program strip holds, once a pip is pressed.
	 *
	 * ## Two kinds of list, and they must never read alike
	 *
	 * An ENROLLED term is a fact: these are the classes, here is when they meet.
	 * A SUGGESTED term is a recommendation somebody made, which the student is
	 * free to ignore and which registers nothing. The difference is carried three
	 * ways rather than one, because a list of course codes looks exactly like an
	 * enrolment whatever the heading says:
	 *
	 *  1. **The heading.** "Your classes · Summer 2026" against "Suggested for
	 *     Fall 2026".
	 *  2. **A standing note**, under the heading on suggested terms only, saying
	 *     nothing is registered and nothing was sent to the program.
	 *  3. **The AI badge**, with the assistant's sparkle icon, saying a
	 *     recommendation was MADE rather than a fact stated.
	 *
	 * The badge's visible text is two words and its spoken form is a sentence —
	 * "AI suggested" out of context tells a screen reader user neither what was
	 * suggested nor by what. Same construction as `SourcePill`.
	 *
	 * ## Core is tagged, and its reason is fixed copy
	 *
	 * A core course is not really a suggestion — it is a scheduling fact inside a
	 * term the student has not reached. So it carries the `core` tag and the words
	 * "Required for the degree" rather than a recommender's sentence, which would
	 * be the interface pretending to advise where it is informing.
	 *
	 * ## The labels do the work, not the tag's border
	 *
	 * "Core" against "Suggested elective" — a requirement and a recommendation,
	 * said in words. Two same-shaped chips reading "core" and "elective" would
	 * leave that distinction to a border weight, and requirement-versus-suggestion
	 * is not a thing to encode in styling.
	 *
	 * An elective in the ENROLLED panel says plain "Elective", because a course
	 * already on the timetable is not being suggested to anybody. Three labels for
	 * two values, and the third is what stops the word "suggested" appearing beside
	 * a class the student is sitting in.
	 */
	let { plan }: { plan: TermPlan } = $props();

	const copy = messages.home.timeline.plan;

	/**
	 * The badge and the disclaimer belong to a LIST, not to a term.
	 *
	 * An empty term has nothing to attribute and nothing to disclaim, so "AI
	 * suggested" above "No classes listed for this term yet" would be claiming the
	 * assistant suggested an absence. Both are gated on there being rows.
	 *
	 * ## TWO TERMS ARE PERMANENTLY EMPTY, and that is the correct answer
	 *
	 * The catalogue covers four terms — Summer 2026 through Spring 2027 — and the
	 * 17 month timeline has six phases. So **Summer 2027 and Fall 2027 render this
	 * empty state and always will** until somebody extends the catalogue.
	 *
	 * Settled rather than left as a gap (owner, 2026-08-22): the empty state is
	 * HONEST, and the catalogue genuinely does not cover those terms. Inventing
	 * two terms of courses to make six pips look uniform would put fabricated
	 * course codes on a page whose whole point is telling a student what they are
	 * actually taking — and this app already carries real instructor names beside
	 * invented grades, which is as far as that should ever go.
	 *
	 * So do not "fix" these two panels. If the catalogue grows, they fill
	 * themselves; nothing here needs to change either way.
	 */
	const hasSuggestions = $derived(plan.kind === 'suggested' && plan.courses.length > 0);
</script>

<div class="mt-2 border-t border-hairline-soft pt-2">
	<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
		<p class="text-2xs font-medium text-ink">
			{plan.kind === 'enrolled'
				? copy.enrolledHeading(plan.term)
				: copy.suggestedHeading(plan.term)}
		</p>

		{#if hasSuggestions}
			<!-- The attribution sits beside the heading, not on each row: it is true
			     of the whole list, and repeating it eleven times would make it
			     furniture rather than a statement. -->
			<span class="inline-flex shrink-0 items-center gap-1 text-3xs text-primary">
				<Sparkles aria-hidden="true" class="size-3 shrink-0" />
				<span aria-hidden="true">{copy.aiBadge}</span>
				<span class="sr-only">{copy.aiBadgeSpoken}</span>
			</span>
		{/if}
	</div>

	{#if hasSuggestions}
		<p class="mt-0.5 text-3xs text-muted-ink">{copy.suggestedNote}</p>
	{/if}

	{#if plan.courses.length === 0}
		<p class="mt-1.5 text-3xs text-muted-ink">{copy.empty}</p>
	{:else}
		<ul class="mt-1.5 space-y-1">
			{#each plan.courses as course (course.code)}
				<li class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<!-- A course code is a value people compare down a column, so the
					     numeric face with tabular figures. `w-20` so the titles line up
					     rather than starting at four different x positions. -->
					<span class="thrive-numeric w-20 shrink-0 text-2xs text-ink">{course.code}</span>

					<span class="min-w-0 flex-1">
						<span class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
							<span class="min-w-0 text-2xs break-words text-body">{course.title}</span>
							<span
								class={cn(
									'shrink-0 rounded-xs border px-1 text-3xs',
									course.requirement === 'core'
										? 'border-line-strong text-ink'
										: 'border-hairline text-muted-ink'
								)}
							>
								{#if course.requirement === 'core'}
									{copy.coreTag}
								{:else if plan.kind === 'suggested'}
									{copy.electiveTag}
								{:else}
									{copy.electiveEnrolledTag}
								{/if}
							</span>
						</span>

						<!--
							One line of context per row, and which line depends on the kind.

							Enrolled: when it meets, which is the fact a student wants.
							Suggested: why it was suggested, or "Required for the degree" for
							a core course. Never both, and never an empty line — a suggested
							course has no meeting time and a blank slot on every row would
							read as missing data.
						-->
						{#if plan.kind === 'enrolled'}
							<span class="mt-0.5 block text-3xs text-muted-ink">
								{course.scheduleLabel}{course.instructor ? ` · ${course.instructor}` : ''}
							</span>
						{:else}
							<span class="mt-0.5 block text-3xs text-muted-ink">
								{course.requirement === 'core' ? copy.coreReason : (course.reason ?? '')}
								{#if course.instructor}
									<span> · {course.instructor}</span>
								{:else}
									<span> · {copy.noInstructor}</span>
								{/if}
							</span>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
