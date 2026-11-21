import type { LandingSectionId } from '../../screens/landing/landingContent';

/**
 * The one navigation every public page shares. A visitor moving between the
 * landing page, the story and the guide pages sees the same header with the
 * same items in the same order — only the highlight changes. (It used to swap
 * between four in-page anchors on the landing page and four different page
 * links everywhere else, so the header changed under the reader's cursor.)
 *
 * An item is either a section of the landing page (`section`: an anchor on the
 * landing page itself, `/#section` from any other page) or a page of its own
 * (`path`). The order follows the landing page, top to bottom, so "Our story"
 * sits where the story teaser does — between "The exam" and "FAQ".
 */
export type SiteNavItem =
  | { label: string; section: LandingSectionId }
  | { label: string; path: string };

export const SITE_NAV: readonly SiteNavItem[] = [
  { label: 'How it works', section: 'how-it-works' },
  { label: 'Why it works', section: 'why' },
  { label: 'The exam', section: 'exam' },
  { label: 'Our story', path: '/story' },
  { label: 'FAQ', section: 'faq' },
];

export function isSectionItem(item: SiteNavItem): item is { label: string; section: LandingSectionId } {
  return 'section' in item;
}

/** Where an item points from the page the visitor is on. */
export function navHref(item: SiteNavItem, onLanding: boolean): string {
  if (!isSectionItem(item)) return item.path;
  return onLanding ? `#${item.section}` : `/#${item.section}`;
}
