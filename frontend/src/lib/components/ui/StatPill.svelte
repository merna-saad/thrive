<script lang="ts">
	import type { Component } from 'svelte';

	import { cn } from '$lib/utils';
	import { statTones, type StatTone } from '$lib/tones';

	/**
	 * A single number worth acting on. Three across the top of Home answer "is
	 * anything on fire" before the student reads a word.
	 *
	 * The value is mono, the label is not. That split is the two-face rule at its
	 * clearest: the number is scanned and compared against the pill beside it, the
	 * word is read once.
	 */
	let {
		icon,
		value,
		label,
		tone = 'primary',
		class: className
	}: {
		icon: Component;
		value: number;
		label: string;
		tone?: StatTone;
		class?: string;
	} = $props();

	const Icon = $derived(icon);
	const styles = $derived(statTones[tone]);
</script>

<div class={cn('inline-flex items-center gap-2.5 rounded-md px-3 py-2', styles.wrap, className)}>
	<Icon aria-hidden="true" class={cn('size-3.5 shrink-0', styles.icon)} />
	<p class="flex items-baseline gap-1.5 text-sm leading-none">
		<span class="thrive-numeric text-base">{value}</span>
		<!-- No opacity dim: at 90% every tone lands just under AA for 13px text on
		     its own soft wash. At full strength all three clear it. -->
		<span class="text-2xs font-medium">{label}</span>
	</p>
</div>
