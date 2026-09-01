<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Video from '@lucide/svelte/icons/video';

	import type { AppointmentView } from '$lib/appointmentsView';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { messages } from '$lib/messages';
	import { cn } from '$lib/utils';

	/**
	 * The student's booked appointments, each with a way out.
	 *
	 * ## One form per row, and that is the point
	 *
	 * The Next version called a server action imperatively from a click handler,
	 * so the button did nothing at all without JavaScript. A one-field form per row
	 * costs nothing and works regardless -- and the id travels in the request body
	 * rather than in a closure, which is what makes the action testable without a
	 * browser.
	 *
	 * ## Cancelling releases the slot by id
	 *
	 * Not by matching start times. `Appointment.slotId` exists for this, and the
	 * scan it replaced released the wrong slot the moment an advisor published two
	 * simultaneous ones -- MIGRATION.md section 9 defect 8, fixed in the data layer
	 * in Phase 5. Nothing here needs to know that, and that is the point of it
	 * being fixed there.
	 */
	let { items }: { items: AppointmentView[] } = $props();

	const copy = messages.appointments.list;

	/** Which row is mid-request. One at a time, because one button was pressed. */
	let pendingId = $state<string | null>(null);
	let error = $state<string | null>(null);
</script>

{#if items.length === 0}
	<EmptyState icon={CalendarClock} message={copy.empty} />
{:else}
	<div class="space-y-3">
		{#if error}
			<p
				role="alert"
				class="rounded-sm border border-urgent bg-urgent-soft px-2.5 py-1.5 text-2xs text-urgent"
			>
				{error}
			</p>
		{/if}

		{#each items as appointment (appointment.id)}
			{@const busy = pendingId === appointment.id}

			<article
				class={cn(
					'thrive-panel flex flex-wrap items-start justify-between gap-3 p-4 lg:p-5',
					'transition-opacity duration-(--motion-base) ease-standard',
					busy && 'opacity-60'
				)}
			>
				<div class="min-w-0">
					<!--
						WHO LEADS, NOT WHEN, as of 2026-08-31. Reversed deliberately.

						The old note argued the when is the row's identity because "a list of
						these is read by scanning dates down a column", and that is true of a
						long list. This one holds a handful of booked appointments, where the
						question is "who am I seeing" and the date is the qualifier -- and the
						page already sorts them, so the column is in date order whether or not
						the date leads it.

						It also brings the row into line with every other row in the app after
						this pass: a name in medium weight, then muted metadata beneath. A
						surface that orders its rows differently from the rest is a surface
						you have to learn separately.
					-->
					<p class="text-sm font-medium text-ink">
						{copy.advisorLine(appointment.advisorName, appointment.advisorRole)}
					</p>

					<!-- Time and modality on ONE muted line. They were two lines and they
					     answer one question: where and when to turn up. The time keeps the
					     numeric face inside the line, because it is still a value. -->
					<p class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-3xs text-muted-ink">
						<span class="thrive-numeric">{appointment.whenLabel}</span>
						<span aria-hidden="true">·</span>
						<span class="inline-flex min-w-0 items-center gap-1">
							{#if appointment.mode === 'zoom'}
								<Video aria-hidden="true" class="size-3.5 shrink-0" />
							{:else}
								<MapPin aria-hidden="true" class="size-3.5 shrink-0" />
							{/if}
							{appointment.location}
						</span>
					</p>

					{#if appointment.reason}
						<!-- Nested inside a panel, so it drops the offset edge. -->
						<p
							data-tone="sunken"
							data-flush="true"
							class="thrive-panel mt-1.5 px-2.5 py-1.5 text-xs text-body"
						>
							{appointment.reason}
						</p>
					{/if}
				</div>

				<form
					method="POST"
					action="?/cancel"
					use:enhance={() => {
						pendingId = appointment.id;
						error = null;

						return async ({ result }) => {
							pendingId = null;

							if (result.type === 'failure') {
								error = String((result.data as { error?: string } | undefined)?.error ?? '');
							} else if (result.type !== 'success') {
								// Never silent. A cancel that appears to do nothing reads as a
								// booking that would not go away. Same reasoning as the panel's.
								error = messages.appointments.errors.unexpected;
							}

							// Either way: the server is the truth about what is still booked,
							// and a released slot has to reappear in the panel above.
							await invalidateAll();
						};
					}}
				>
					<input type="hidden" name="appointmentId" value={appointment.id} />

					<!-- Cancelling really does destroy a booking, which is the one thing
					     `danger` is for. It draws on intent rather than at rest, so a list
					     of these does not read as a row of warnings. -->
					<Button type="submit" variant="danger" size="sm" disabled={busy}>
						{#if busy}
							<LoaderCircle aria-hidden="true" class="size-3 animate-spin" />
						{/if}
						{busy ? copy.cancelling : copy.cancel}
						<span class="sr-only">{copy.cancelSubject(appointment.whenLabel)}</span>
					</Button>
				</form>
			</article>
		{/each}
	</div>
{/if}
