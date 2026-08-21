<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import CircleCheckBig from '@lucide/svelte/icons/circle-check-big';
	import Clock from '@lucide/svelte/icons/clock';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Video from '@lucide/svelte/icons/video';
	import X from '@lucide/svelte/icons/x';

	import {
		REASON_MAX,
		type AppointmentView,
		type ServiceView
	} from '$lib/appointmentsView';
	import { slotsForDay, type ModeFilter } from '$lib/availability';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { downloadIcs, icsFromAppointment } from '$lib/ics';
	import { messages } from '$lib/messages';
	import { fromDayKey } from '$lib/schedule';
	import { cn } from '$lib/utils';

	/**
	 * The booking form, and the confirmation it becomes.
	 *
	 * ## There is no day picker in here any more
	 *
	 * The Next version owned a `dayKey` of its own and mirrored an external
	 * selection into it with React's adjust-during-render idiom -- a `seenExternal`
	 * shadow, a comparison, and two setState calls during the render pass
	 * (MIGRATION.md section 8.5, which asks whether that becomes a `$derived` or an
	 * `$effect`).
	 *
	 * Neither. The month calendar is now the ONLY day picker on the page, so the
	 * day is not this component's state at all -- it is a prop. And the side
	 * effect the idiom existed to perform, clearing the chosen slot when the day
	 * moves, is not needed either: `selectedSlot` is derived by looking the chosen
	 * id up in THIS day's slots, so a day change drops the stale choice on its own.
	 * The whole mechanism dissolves rather than porting.
	 *
	 * ## Why a form rather than a click handler
	 *
	 * See `+page.server.ts`. Briefly: `load` re-runs after the action, which is
	 * what makes a fresh booking appear in the pane beside this one and in the list
	 * below it with nothing to keep in sync by hand.
	 *
	 * `use:enhance` keeps the result LOCAL rather than calling `applyAction`, so
	 * the confirmation and the error are this component's state and "Done" can
	 * simply clear them. Routing them through `form` would mean a page-level value
	 * that outlives the panel and has to be dismissed by some other means.
	 *
	 * ## A taken slot is a state, not an edge case
	 *
	 * Two people can want the same 2pm. The action returns 409 with the data
	 * layer's own sentence; this renders it in an alert and CLEARS the choice, so
	 * the student picks again from a list that has just been re-fetched rather than
	 * pressing the same dead slot twice.
	 */
	let {
		service,
		dayKey,
		onClose
	}: {
		service: ServiceView;
		/** The day the calendar is pointing at, or null before anything is chosen. */
		dayKey: string | null;
		onClose: () => void;
	} = $props();

	const copy = messages.appointments.panel;
	const confirmCopy = messages.appointments.confirmed;

	const MODE_FILTERS: { value: ModeFilter; label: string }[] = [
		{ value: 'any', label: copy.modeAny },
		{ value: 'in person', label: copy.modeInPerson },
		{ value: 'zoom', label: copy.modeZoom }
	];

	/**
	 * One stroke for every choice in this panel.
	 *
	 * Meeting types and times are the same kind of decision, so they are the same
	 * kind of control: a bordered box that darkens its edge when chosen rather than
	 * only tinting, which is what keeps the state legible in grayscale.
	 */
	const CHOICE_BASE = [
		'rounded-md border text-2xs',
		'transition-colors duration-(--motion-fast) ease-standard'
	].join(' ');

	const CHOICE_RESTING =
		'border-line bg-surface text-body hover:border-line-strong hover:bg-primary-soft hover:text-primary-hover';

	const CHOICE_ACTIVE = 'border-primary bg-primary-soft text-primary-hover';

	/** Small, uppercase, and in ink: this names a control group, so it is a label. */
	const FIELD_LABEL = 'mb-1.5 block text-2xs uppercase text-ink';

	let mode = $state<ModeFilter>('any');
	let chosenId = $state<string | null>(null);
	let reason = $state('');
	let pending = $state(false);
	let error = $state<string | null>(null);
	let confirmed = $state<AppointmentView | null>(null);

	const daySlots = $derived(dayKey ? slotsForDay(service.slots, dayKey, mode) : []);

	/**
	 * The chosen slot, or null.
	 *
	 * Derived from THIS day's list rather than held as its own object, which is
	 * what makes the day change self-cleaning: the id survives, the lookup fails,
	 * and the confirm button disables itself. `available` is re-checked here too,
	 * so a slot that went stale between renders cannot be submitted.
	 */
	const selectedSlot = $derived(
		daySlots.find((slot) => slot.id === chosenId && slot.available) ?? null
	);

	/**
	 * The day, in words. A client-side format of a day key, and the documented
	 * exception -- see the note in `MyDayPane`.
	 */
	const dayLabel = $derived(
		dayKey
			? fromDayKey(dayKey).toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				})
			: ''
	);

	function addToCalendar(appointment: AppointmentView) {
		downloadIcs(`thrive-${appointment.id}`, [
			icsFromAppointment(
				appointment,
				confirmCopy.icsTitle(appointment.advisorRole, appointment.advisorName)
			)
		]);
	}
</script>

{#if confirmed}
	<section aria-labelledby={confirmCopy.headingId} class="thrive-panel p-3">
		<div class="flex items-start gap-2.5">
			<!-- Teal is `on-track`, which already means "this is fine" everywhere else
			     in THRIVE. Reused here rather than invented, and it is a confirmation
			     rather than the availability marking that had to avoid green. -->
			<span
				class="grid size-9 shrink-0 place-items-center rounded-pill border border-on-track bg-on-track-soft"
			>
				<CircleCheckBig aria-hidden="true" class="size-5 text-on-track" />
			</span>

			<div class="min-w-0">
				<h2 id={confirmCopy.headingId} class="text-lg font-medium text-ink">
					{confirmCopy.heading}
				</h2>

				<p class="mt-0.5 text-sm text-body">
					{confirmCopy.line(
						confirmed.dateLabel,
						confirmed.timeLabel,
						confirmed.advisorName
					)}
				</p>

				<p class="mt-1 flex items-center gap-1.5 text-3xs text-muted-ink">
					{#if confirmed.mode === 'zoom'}
						<Video aria-hidden="true" class="size-3 shrink-0" />
					{:else}
						<MapPin aria-hidden="true" class="size-3 shrink-0" />
					{/if}
					{confirmed.location}
				</p>

				{#if confirmed.reason}
					<p
						data-tone="sunken"
						data-flush="true"
						class="thrive-panel mt-2 px-2.5 py-1.5 text-xs text-body"
					>
						{confirmCopy.reasonQuote(confirmed.reason)}
					</p>
				{/if}

				<p class="mt-2 text-3xs text-muted-ink">{confirmCopy.note}</p>

				<div class="mt-3 flex flex-wrap gap-1.5">
					<Button variant="primary" onclick={onClose}>{confirmCopy.done}</Button>

					<!-- Downloads a file the student chooses to import. Still no calendar
					     API call anywhere in THRIVE. -->
					<Button onclick={() => confirmed && addToCalendar(confirmed)}>
						<CalendarPlus aria-hidden="true" class="size-3.5" />
						{confirmCopy.addToCalendar}
					</Button>
				</div>
			</div>
		</div>
	</section>
{:else}
	<section aria-labelledby={copy.headingId} class="thrive-panel p-3">
		<div class="flex items-start justify-between gap-2.5">
			<div class="min-w-0">
				<h2 id={copy.headingId} class="text-lg font-medium text-ink">
					{copy.heading(service.serviceLabel)}
				</h2>
				<p class="mt-0.5 text-xs text-muted-ink">{copy.subheading(service.advisor.name)}</p>
			</div>

			<Button onclick={onClose} aria-label={copy.close} class="size-9 px-0">
				<X aria-hidden="true" class="size-4" />
			</Button>
		</div>

		<form
			method="POST"
			action="?/book"
			use:enhance={() => {
				pending = true;
				error = null;

				return async ({ result }) => {
					pending = false;

					if (result.type === 'success') {
						confirmed =
							(result.data as { booked?: AppointmentView } | undefined)?.booked ?? null;
						// Re-reads the server: the slot this took is now unavailable, the
						// pane beside this one gains a row, and the list below gains one.
						await invalidateAll();
						return;
					}

					if (result.type === 'failure') {
						error = String((result.data as { error?: string } | undefined)?.error ?? '');
						// Drop the choice. The list is about to be re-rendered from fresh
						// data and pressing the same dead slot again should not be possible.
						chosenId = null;
						await invalidateAll();
						return;
					}

					/*
					 * Anything else -- a redirect, or a real error like the 403 a
					 * missing `ORIGIN` produced the first time this ran. It MUST say
					 * something: leaving this branch silent made the confirm button
					 * visibly do nothing, which is indistinguishable from a broken
					 * page. See `messages.appointments.errors.unexpected`.
					 */
					error = messages.appointments.errors.unexpected;
					chosenId = null;
				};
			}}
		>
			<!-- The submitted choice. A hidden field rather than a fetch body, so the
			     form is the whole request and the action needs no client to call it. -->
			<input type="hidden" name="slotId" value={selectedSlot?.id ?? ''} />

			<!-- Meeting type. Each slot is published as one mode or the other, so this
			     NARROWS the list rather than changing a chosen time. -->
			<fieldset class="mt-3">
				<legend class={FIELD_LABEL}>{copy.modeLegend}</legend>
				<div class="flex flex-wrap gap-1.5">
					{#each MODE_FILTERS as filter (filter.value)}
						{@const active = filter.value === mode}
						<button
							type="button"
							aria-pressed={active}
							onclick={() => {
								mode = filter.value;
								chosenId = null;
							}}
							class={cn(
								CHOICE_BASE,
								'h-9 px-2.5',
								active ? CHOICE_ACTIVE : CHOICE_RESTING
							)}
						>
							{filter.label}
						</button>
					{/each}
				</div>
			</fieldset>

			<fieldset class="mt-3">
				<legend class={FIELD_LABEL}>
					{copy.timesLegend}
					{#if dayKey}
						<span class="text-muted-ink normal-case">{copy.timesFor(dayLabel)}</span>
					{/if}
				</legend>

				{#if !dayKey}
					<EmptyState icon={Clock} message={copy.noDaySelected} />
				{:else if daySlots.length === 0}
					<EmptyState icon={Clock} message={copy.noTimesForFilter} />
				{:else}
					<div class="flex flex-wrap gap-1.5">
						{#each daySlots as slot (slot.id)}
							{@const active = slot.id === chosenId}
							<button
								type="button"
								disabled={!slot.available}
								aria-pressed={active}
								title={slot.available ? undefined : copy.takenTitle}
								onclick={() => (chosenId = slot.id)}
								class={cn(
									CHOICE_BASE,
									'inline-flex h-9 items-center gap-1.5 px-2.5',
									'disabled:cursor-not-allowed disabled:line-through disabled:opacity-50',
									// The chosen time is the one commitment on this panel, so it
									// goes solid rather than tinted.
									active
										? 'border-line-strong bg-primary text-on-primary'
										: CHOICE_RESTING
								)}
							>
								{#if slot.mode === 'zoom'}
									<Video aria-hidden="true" class="size-3 shrink-0" />
								{:else}
									<MapPin aria-hidden="true" class="size-3 shrink-0" />
								{/if}
								<span class="thrive-numeric">{slot.timeLabel}</span>
								<!-- The mode and "taken" are carried by an icon and a
								     strikethrough on screen. Both are said in words here, so
								     neither rests on a glyph. -->
								<span class="sr-only">
									{copy.slotMode(slot.mode)}{slot.available ? '' : copy.slotTaken}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</fieldset>

			<div class="mt-3">
				<label for="booking-reason" class={FIELD_LABEL}>{copy.reasonLabel}</label>
				<textarea
					id="booking-reason"
					name="reason"
					bind:value={reason}
					maxlength={REASON_MAX}
					rows="3"
					placeholder={copy.reasonPlaceholder}
					class="w-full resize-y rounded-md border-[1.5px] border-line-strong bg-surface px-2.5 py-1.5 text-sm text-body placeholder:text-muted-ink"
				></textarea>
				<p class="thrive-numeric mt-1 text-right text-3xs text-muted-ink">
					{copy.reasonCount(reason.length, REASON_MAX)}
				</p>
			</div>

			{#if error}
				<p
					role="alert"
					class="mt-2 rounded-sm border border-urgent bg-urgent-soft px-2.5 py-1.5 text-2xs text-urgent"
				>
					{error}
				</p>
			{/if}

			<div class="mt-3 flex flex-wrap items-center gap-2.5">
				<Button type="submit" variant="primary" disabled={!selectedSlot || pending}>
					{#if pending}
						<LoaderCircle aria-hidden="true" class="size-3.5 animate-spin" />
					{/if}
					{pending ? copy.confirming : copy.confirm}
				</Button>

				<p aria-live="polite" class="text-2xs text-muted-ink">
					{selectedSlot
						? copy.selected(dayLabel, selectedSlot.timeLabel, selectedSlot.mode)
						: copy.pickTime}
				</p>
			</div>
		</form>
	</section>
{/if}
