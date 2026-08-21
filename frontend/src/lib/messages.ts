/**
 * Every user-facing string in THRIVE, in one place.
 *
 * English only. No translation library, no locale switching, no runtime lookup
 * by key. This is not i18n -- it is the thing that makes i18n possible later
 * without a rewrite.
 *
 * ## The shape, and why
 *
 * A nested object of strings and functions, grouped by the surface that renders
 * them. Three properties matter, and they are the three that make a retrofit
 * cheap:
 *
 * 1. **No user-facing string is written inline in a component.** Finding all
 *    the copy is `messages.ts`, not a grep across the tree that will miss the
 *    one in a ternary.
 * 2. **Every string has a stable path.** `messages.home.tasks.title` does not
 *    move when the component is refactored, so a Mandarin file can be a
 *    parallel object with the same shape and swapping them is one import.
 * 3. **Anything with a value in it is a FUNCTION, not a template assembled at
 *    the call site.** This is the part that actually breaks translations. A
 *    component writing `{count} more` bakes English word order into markup;
 *    `showMore(count)` lets a translation put the number wherever that language
 *    puts it, or use a different form for one versus many.
 *
 * Rejected: flat dotted keys (`"home.tasks.title"`), which lose type safety and
 * autocomplete and gain nothing until there is a real i18n runtime; and
 * per-component message files, which spread the copy back out and make a
 * translator open twenty files.
 *
 * ## What does not belong here
 *
 * Anything that is not prose a person reads: `aria-label`s that name a value
 * already on screen still count as copy and DO belong here, but token names,
 * route hrefs, and data values do not. Fixture text (course titles, event
 * names) comes from the data layer and is not copy.
 */

export const messages = {
	/** Reused across surfaces. Kept here rather than duplicated per card. */
	common: {
		viewAll: 'View all',
		/** Names which section a "View all" leads to, for screen readers. */
		viewAllIn: (section: string) => ` in ${section}`,
		undo: 'Undo',
		ignore: 'Ignore',
		/** Appended to a one-word button so the accessible name has a subject. */
		ignoreSubject: (title: string) => ` ${title}`,
		showMore: (count: number) => `Show ${count} more`,
		showLess: 'Show less',
		done: 'Done',
		/** A group heading's count, e.g. "Done · 3". */
		countSuffix: (count: number) => ` · ${count}`
	},

	home: {
		/** The eyebrow above the greeting, and the page title. */
		documentTitle: 'Home',

		greeting: {
			/** `greetingFor()` supplies "Good morning"; this joins it to a name. */
			line: (greeting: string, firstName: string) => `${greeting}, ${firstName}`,
			headingId: 'greeting-heading',
			goalChip: (goal: string) => `Becoming: ${goal}`,
			trackChip: (track: string) => `${track} track`,
			unitsChip: (completed: number, required: number) =>
				`${completed} of ${required} units`,
			unitsBarLabel: 'Units completed toward the degree'
		},

		stats: {
			overdue: 'overdue',
			dueToday: 'due today',
			eventsThisWeek: 'events this week',
			/*
			 * The popover's list name, e.g. "3 overdue".
			 *
			 * A function rather than `${count} ${label}` at the call site, and this
			 * is the case that shows why the rule is not pedantry: the pill's own
			 * label is already a separate string, so a language that puts the count
			 * after the noun, or inflects the noun on the count, has one place to say
			 * so. Assembling it in markup would bake English order into three
			 * components.
			 */
			listLabel: (count: number, label: string) => `${count} ${label}`,
			/** The accessible name of a popover row. The arrow alone is not a name. */
			jumpTo: (title: string) => `Jump to ${title}`
		},

		timeline: {
			/** Shown when no phase is current, e.g. between terms. */
			fallbackTerm: 'Your program',
			youAreHere: ' · you are here',
			/*
			 * Split in two on purpose, and the one place in this file where a
			 * sentence is not a single string.
			 *
			 * The percentage is a value, so the two-face rule puts it in mono, which
			 * means it has to be its own element inside the sentence. Exposing the
			 * split as two message entries is the honest way to do that: a
			 * translation can rewrite `progressRest` completely, including the
			 * punctuation and where the finish term falls.
			 *
			 * The limitation, stated rather than discovered: the VALUE always comes
			 * first. A language that wants "through 42% of your program" cannot
			 * express that here. If one turns up, this becomes a function returning
			 * parts rather than two strings -- which is a change to one entry and one
			 * component, not to the architecture.
			 */
			progressPercent: (percent: number) => `${percent}%`,
			progressRest: (finishTerm: string) =>
				` through your program · finish ${finishTerm}`,
			/** Spoken form of one pip, which is otherwise colour-only. */
			phaseStatus: (label: string, term: string, status: string, optional: boolean) =>
				`${label}, ${term}, ${status}${optional ? ', optional' : ''}`,
			statusComplete: 'completed',
			statusCurrent: 'in progress',
			statusUpcoming: 'not started'
		},

		tasks: {
			title: 'Tasks',
			description: 'What to do next, pulled from every source',
			progressLabel: 'Tasks done this week',
			progressValue: (done: number, total: number) => `${done} of ${total} done`,
			/** The live-region sentence. Read on load and after any change. */
			liveCount: (done: number, total: number) =>
				`${done} of ${total} tasks done this week.`,
			emptyAll: 'Nothing on your list yet. Add the first thing below.',
			emptyOpen: 'Everything on your list is done. Enjoy it.',
			/** Says why a row cannot be ticked yet, rather than looking broken. */
			readOnlyHint: 'Ticking tasks arrives in the next step.'
		},

		todaysClasses: {
			title: 'Today’s classes',
			empty: 'No classes today. A good day to get ahead.'
		},

		myClasses: {
			title: 'My Classes',
			description: (count: number) => `${count} courses this term`,
			progressLabel: (code: string) => `${code} course progress`,
			/*
			 * A prefix, not a whole sentence, for the same reason the timeline
			 * percentage is split: the assignment title is styled differently from
			 * the word introducing it, so it has to be its own element. Same
			 * value-comes-last limitation, same one-entry fix if a language needs
			 * otherwise.
			 */
			nextPrefix: 'Next: '
		},

		events: {
			title: 'Upcoming Events',
			description: 'Matched to your goal and track',
			empty: 'Nothing scheduled. New events appear here as they’re announced.',
			/** The only way back on Home, and only once nothing is left. */
			allIgnored: 'You have ignored every upcoming event.',
			bringBack: 'Bring them back',
			broughtBack: 'Ignored events restored',
			ignored: (title: string) => `Ignored “${title}”`,
			countMeIn: 'Count me in',
			countMeInSubject: (title: string) => ` for ${title}`,
			addToCalendar: 'Add to calendar',
			relevanceBadge: 'For you'
		}
	},

	/** Group headings for the task list. Also the spoken name of each group. */
	taskGroups: {
		/*
		 * A task whose due date will not parse. Its own group, at the TOP of the
		 * list -- decided 2026-08-21 after it spent a phase reachable in the data
		 * and rendered nowhere.
		 *
		 * "Needs a date" rather than "No date": the row is not describing itself,
		 * it is asking for something. A student who sees it can fix it; a student
		 * who never sees it has a deadline that silently does not exist.
		 */
		unknown: 'Needs a date',
		overdue: 'Overdue',
		today: 'Today',
		upcoming: 'This week',
		done: 'Done'
	},

	/** The two-label cap per task row. See taskView.ts. */
	taskLabels: {
		urgent: 'Urgent',
		dueSoon: 'Due soon',
		done: 'Done',
		class: 'Class',
		career: 'Career',
		admin: 'Admin',
		event: 'Event'
	},

	/** Event origin tags. One per EventType. */
	eventTypes: {
		career: 'Career',
		rady: 'Rady',
		club: 'Club',
		ucsd: 'UCSD',
		sandiego: 'San Diego'
	},

	/** Standing, as a word. Mirrors `standingLabel` in format.ts. */
	standing: {
		onTrack: 'On track',
		watch: 'Watch',
		needsHelp: 'Needs help'
	},

	/** Names the scroll region a capped card becomes on desktop. */
	cards: {
		scrollRegion: (section: string) => `${section}, scrollable`
	}
} as const;
