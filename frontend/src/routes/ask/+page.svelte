<script lang="ts">
	import PagePlaceholder from '$lib/components/PagePlaceholder.svelte';
	import { pageTitle } from '$lib/title';

	/**
	 * Ask THRIVE, as a route.
	 *
	 * A placeholder on purpose this phase. The real page is three tabs (chat, a
	 * class recommender, a job recommender), a chat window, and a saved-history
	 * rail on the left -- which puts two rails side by side and is the reason it
	 * is a page rather than the floating panel it used to be. None of that is
	 * built here.
	 *
	 * The floating version still exists in the Next tree as
	 * `assistant/AssistantWidget` and is still gated off by
	 * `FEATURES.floatingAssistant`, which this change deliberately left at false.
	 * Two Ask THRIVE surfaces is a later decision, not an accident to create now.
	 *
	 * Carry forward when the real page lands: `AssistantConversation` has no
	 * brain and says so, by decision. MIGRATION.md section 9 item 17 -- a
	 * placeholder that mimics a real answer teaches the student to trust
	 * something that is not there.
	 */
</script>

<svelte:head><title>{pageTitle('Ask THRIVE')}</title></svelte:head>

<PagePlaceholder href="/ask" />
