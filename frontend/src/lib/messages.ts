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
			emptyOpen: 'Everything on your list is done. Enjoy it.'
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
		/** Only ever spoken. `rowPriorityLabel` uses it; no chip renders it. */
		later: 'Later',
		done: 'Done',
		class: 'Class',
		career: 'Career',
		admin: 'Admin',
		event: 'Event'
	},

	/**
	 * Editing a task in place. Shared by Home and, later, /assignments.
	 *
	 * Nearly every entry here is a function, and the reason is the same one every
	 * time: these strings name a specific task, so a screen reader hears "Edit
	 * Draft the case memo" rather than a row of buttons all called "Edit". A
	 * template assembled at the call site would bake English word order into five
	 * components.
	 */
	taskEditing: {
		/* --- The row's controls --------------------------------------------- */
		/** The checkbox's accessible name IS the task, so it needs no verb. */
		toggle: (title: string) => title,
		copyToList: (title: string) => `Copy ${title} to your to-do list`,
		copied: (title: string) => `“${title}” copied to your to-do list`,
		edit: (title: string) => `Edit ${title}`,
		addNote: (title: string) => `Add a note to ${title}`,
		editNote: (title: string) => `Edit your note on ${title}`,

		/* --- Reordering ----------------------------------------------------- */
		/** Names where the row is now, so a move has a stated starting point. */
		position: (index: number, count: number, group: string) =>
			`position ${index} of ${count} in ${group}`,
		moveUp: (title: string, position: string) => `Move ${title} up. Currently ${position}.`,
		moveDown: (title: string, position: string) => `Move ${title} down. Currently ${position}.`,
		/** Announced after a keyboard or pointer move lands. */
		moved: (title: string, index: number, count: number, group: string) =>
			`${title} moved to position ${index} of ${count} in ${group}.`,
		movedToGroup: (title: string, group: string) => `${title} moved to ${group}. Due date updated.`,

		/* --- The inline editor ---------------------------------------------- */
		titleField: 'Title',
		titleHint: 'Enter to save, Escape to cancel. Clear the field to restore the original.',
		priorityField: 'Priority',
		save: 'Save',
		saveSubject: (title: string) => ` changes to ${title}`,
		cancel: 'Cancel',
		cancelSubject: (title: string) => ` editing ${title}`,

		/* --- Priority ------------------------------------------------------- */
		priorityLegend: (title: string) => `Priority for ${title}`,
		priorityHigh: 'High',
		priorityMedium: 'Med',
		priorityLow: 'Low',
		/** The full word, spoken after the abbreviation the button shows. */
		priorityHighFull: 'High priority',
		priorityMediumFull: 'Medium priority',
		priorityLowFull: 'Low priority',

		/* --- Notes ---------------------------------------------------------- */
		noteLabel: (title: string) => `Your note on ${title}`,
		notePlaceholder: 'A note to yourself…',

		/* --- The due date editor -------------------------------------------- */
		changeDue: (title: string) => ` — change the due date for ${title}`,
		dueDialogLabel: (title: string) => `Due date for ${title}`,
		dueToday: 'Today',
		dueTomorrow: 'Tomorrow',
		dueNextWeek: 'Next week',
		duePick: 'Pick a date',
		dueUpdated: (title: string) => `${title} due date updated.`,
		/*
		 * The row has just left the list, and saying so is the point.
		 *
		 * Home shows this week only, so a date set further out removes the row --
		 * correctly, and invisibly. A student who sets a date and watches the row
		 * vanish with no explanation has been given the app's worst failure mode: a
		 * correct action that looks like a broken one. The date is a value, so it is
		 * passed in already formatted.
		 */
		dueMovedOutOfWeek: (title: string, when: string) =>
			`${title} moved to ${when}, which is past this week. It is no longer in this list.`,

		/* --- Undo ----------------------------------------------------------- */
		markedDone: 'Marked done',
		markedNotDone: 'Marked not done',
		undoSubject: (action: string, title: string) => ` ${action.toLowerCase()}: ${title}`,
		/*
		 * The whole live sentence while an undo offer stands.
		 *
		 * ONE function rather than three strings joined at the call site, and this is
		 * the entry that shows why the rule is not pedantry: the card would otherwise
		 * write `${a} ${b}${c}` in markup, baking in the order of a clause, a count
		 * and an offer. A translation gets to put them wherever that language puts
		 * them, or to drop the count from the middle entirely.
		 */
		liveWithUndo: (action: string, title: string, done: number, total: number) =>
			`${action}: ${title}. ${done} of ${total} tasks done this week. Undo is available.`,
		/*
		 * Undone, but not shown -- because Home is this week only.
		 *
		 * Unticking a task due three weeks out puts it back on the list and then the
		 * week filter removes it again, so the row the student was looking at is
		 * simply gone. Saying so is the point: a correct action that looks like a
		 * broken one is this app's worst failure mode.
		 */
		restoredOutOfWeek: (title: string) =>
			`${title} is back on your list, but it is due past this week so it is not shown here.`,

		/* --- Adding --------------------------------------------------------- */
		addOpen: 'Add a task',
		addTitleField: 'Task',
		addTitlePlaceholder: 'What needs doing?',
		addDueField: 'Due',
		addPriorityField: 'Priority',
		addLabelField: 'Label',
		/** Rendered in normal case beside a small-caps label. */
		addLabelOptional: '(optional)',
		addLabelPlaceholder: 'MGT 253',
		addSubmit: 'Add task',
		addClose: 'Done adding',
		added: (title: string) => `${title} added.`
	},

	/**
	 * The calendar. Phase 7a covers the page, the month grid and the selected day;
	 * the filter bar, the other two views, editing and events land in 7b and 7c.
	 *
	 * Two things here are worth naming because they are easy to get wrong on a
	 * retrofit:
	 *
	 * 1. **The counts line is one function, not a loop over a template.** A day
	 *    reads "4 classes · 3 tasks · 2 clubs", and assembling that at the call
	 *    site would bake both the pluralisation and the separator into markup. It
	 *    takes already-labelled pairs and returns the whole line.
	 * 2. **`dayFigureLabel` exists because the big number has no words beside it.**
	 *    A `3xl` "12" reads as a heading to a screen reader and as nothing at all
	 *    to a student who cannot see the breakdown next to it.
	 */
	calendar: {
		documentTitle: 'Calendar',
		eyebrow: 'calendar · fall 2026',
		title: 'Everything, one page',
		intro:
			'Classes, deadlines, tasks, appointments, your own to-dos, and what you could sign up for. Filter it, group it, add to it.',

		/* --- The month grid ------------------------------------------------- */
		grid: {
			label: 'Calendar',
			today: 'Today',
			previousMonth: 'Previous month',
			nextMonth: 'Next month',
			/** Weekday column initials, Sunday first. Paired with the names below. */
			weekdayInitials: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
			weekdayNames: [
				'Sunday',
				'Monday',
				'Tuesday',
				'Wednesday',
				'Thursday',
				'Friday',
				'Saturday'
			],
			/**
			 * A day cell's whole accessible name. The date arrives already
			 * formatted; this decides what else is said and in what order.
			 */
			dayLabel: (date: string, items: string, today: boolean) =>
				today ? `${date}, ${items}, today` : `${date}, ${items}`,
			noItems: 'no items',
			itemCount: (count: number) => (count === 1 ? '1 item' : `${count} items`),
			/** The "+n" when a day has more categories than there are dots for. */
			overflow: (count: number) => `+${count}`
		},

		/* --- The selected day's header -------------------------------------- */
		header: {
			headingId: 'calendar-day-heading',
			todayChip: 'today',
			/** Names the bare figure, which otherwise reads as a heading. */
			dayFigureLabel: (count: number) =>
				count === 1 ? '1 item on this day' : `${count} items on this day`,
			nothing: 'nothing scheduled',
			/** "4 classes · 3 tasks". Pairs come in already pluralised. */
			countsLine: (parts: string[]) => parts.join(' · '),
			/** One "4 classes" pair. The irregular plural is the category's own. */
			countPart: (count: number, singular: string, plural: string) =>
				count === 1 ? `1 ${singular}` : `${count} ${plural}`,
			doneOfTickable: (done: number, tickable: number) => `${done} of ${tickable} done`,
			nextUpLabel: 'next up:',
			/** The square strip, named as a whole. */
			squaresLabel: 'What is left on this day',
			/** One square. State is a word, so colour is never the only channel. */
			squareLabel: (title: string, state: string) => `${title}: ${state}`,
			squareDone: 'done',
			squareNext: 'next up',
			squareNotDone: 'not done',
			/**
			 * The one live region on the page, read on every day change.
			 *
			 * Says what changed and how much is in it, because a student moving
			 * through the grid with arrow keys never sees the panel below repaint.
			 */
			announcement: (heading: string, schedule: number, personal: number) =>
				`${heading}. ${schedule} on your schedule, ${personal} on your list.`
		},

		/* --- The day's sections --------------------------------------------- */
		day: {
			headingId: 'day-items',
			eyebrow: 'your day',
			empty: 'Nothing scheduled this day. A good day to get ahead.',
			/** Arrange-by control. Words, so this is not a numeric treatment. */
			groupByLabel: 'Arrange the day by',
			groupByPrefix: 'by',
			groupByType: 'type',
			groupByTime: 'time',
			/** The single group the "time" arrangement produces. */
			chronological: 'Everything, in order'
		},

		/* --- One row -------------------------------------------------------- */
		row: {
			allDay: 'all day',
			urgent: 'urgent',
			/** The checkbox says what pressing it will do, not what is true now. */
			toggle: (title: string, done: boolean) =>
				done ? `Mark ${title} not done` : `Mark ${title} done`
		}
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
