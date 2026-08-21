import type House from '@lucide/svelte/icons/house';
import BookOpen from '@lucide/svelte/icons/book-open';
import Briefcase from '@lucide/svelte/icons/briefcase';
import CalendarCheck from '@lucide/svelte/icons/calendar-check';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import CalendarRange from '@lucide/svelte/icons/calendar-range';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import FileText from '@lucide/svelte/icons/file-text';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import HouseIcon from '@lucide/svelte/icons/house';
import LibraryBig from '@lucide/svelte/icons/library-big';
import Settings from '@lucide/svelte/icons/settings';

/**
 * The icon type, derived from a real icon rather than declared.
 *
 * `@lucide/svelte` exports `LucideIcon` from a `types` module that is not in its
 * package exports map, so it cannot be imported. Taking `typeof` an icon gets
 * the same `Component<LucideProps>` through the public surface, and cannot drift
 * from what the icons actually are.
 */
export type NavIcon = typeof House;

export interface NavItem {
	href: string;
	label: string;
	icon: NavIcon;
	/** Short description, used as the accessible hint and rail tooltip. */
	description: string;
}

/**
 * The primary navigation. ONE LIST drives the desktop rail, the mobile bottom
 * bar, and the stub route pages, so the three can never drift apart.
 *
 * Add a route here, not in three places. `PagePlaceholder` looks its own href up
 * in these lists and throws if it is missing, which is what makes that a
 * guarantee rather than an intention.
 */
export const primaryNav: NavItem[] = [
	{
		href: '/',
		label: 'Home',
		icon: HouseIcon,
		description: 'Your day at a glance'
	},
	{
		href: '/calendar',
		label: 'Calendar',
		icon: CalendarDays,
		description: 'Classes, deadlines, and events on one timeline'
	},
	{
		href: '/classes',
		label: 'Classes',
		icon: BookOpen,
		description: 'Your courses this term'
	},
	{
		href: '/syllabi',
		label: 'Syllabi',
		icon: FileText,
		description: 'What each course expects of you'
	},
	{
		href: '/assignments',
		label: 'Assignments',
		icon: ClipboardList,
		description: 'Everything due, in one list'
	},
	{
		href: '/degree',
		label: 'Degree',
		icon: GraduationCap,
		description: 'Progress toward graduation'
	},
	{
		href: '/events',
		label: 'Events',
		icon: CalendarRange,
		description: 'Career fairs, panels, and workshops'
	},
	{
		href: '/career',
		label: 'Career',
		icon: Briefcase,
		description: 'Steps toward your goal'
	},
	{
		href: '/appointments',
		label: 'Appointments',
		icon: CalendarCheck,
		description: 'Book time with advising and career coaching'
	},
	{
		href: '/resources',
		label: 'Resources',
		icon: LibraryBig,
		description: 'Support and services across campus'
	}
];

/** Pinned to the bottom of the rail, separate from the primary list. */
export const secondaryNav: NavItem[] = [
	{
		href: '/settings',
		label: 'Settings',
		icon: Settings,
		description: 'Preferences, connections, and consent'
	}
];

/**
 * True when `href` is the section the user is currently in. Exact match for
 * Home so it doesn't stay lit on every route; prefix match elsewhere so
 * nested routes still highlight their section.
 */
export function isActiveRoute(href: string, pathname: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}
