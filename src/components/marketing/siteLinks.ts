import {
  IGCSE_PATH,
  MARKING_PATH,
  MISTAKES_PATH,
  ROLEPLAY_HUB_PATH,
  TOPICS_HUB_PATH,
} from '../../data/seo/pathConstants';

/**
 * Every public page, grouped by what the visitor wants to do. The landing
 * page's guide block and the footer both render this one list, so a page added
 * here is reachable from the home page and from every other page, and the two
 * can never drift apart. (Link text here is also what the landing page's
 * "no unbuilt features" test reads, so keep it to the exam and practice pages.)
 */
export interface SiteLink {
  label: string;
  href: string;
  /** One line shown on the landing page's guide cards. */
  hint: string;
}

export interface SiteLinkGroup {
  title: string;
  links: readonly SiteLink[];
}

export const SITE_LINK_GROUPS: readonly SiteLinkGroup[] = [
  {
    title: 'Understand the exam',
    links: [
      { label: 'IGCSE French speaking exam guide', href: IGCSE_PATH, hint: 'What Paper 3 covers and how it runs.' },
      { label: 'How the exam is marked', href: MARKING_PATH, hint: 'The three criteria and where the marks go.' },
      { label: 'Common mistakes', href: MISTAKES_PATH, hint: 'The slips that cost marks, and the fix.' },
    ],
  },
  {
    title: 'See what a good answer sounds like',
    links: [
      { label: 'Topics and model answers', href: TOPICS_HUB_PATH, hint: 'Every topic, with answers to read aloud.' },
      { label: 'Role-play examples', href: ROLEPLAY_HUB_PATH, hint: 'Role plays, task by task, with model replies.' },
    ],
  },
  {
    title: 'Practise speaking',
    links: [
      { label: 'French roleplay practice', href: '/french-roleplay-practice', hint: 'Everyday situations to talk your way through.' },
    ],
  },
];

/** The footer's last column: the project itself and the account. */
export const SITE_ABOUT_LINKS: readonly { label: string; href: string }[] = [
  { label: 'Our story', href: '/story' },
  { label: 'Sign in to your account', href: '/login' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];
