/**
 * The first-run guided tour's steps. Copy rules: short, second person, no
 * jargon, and only what a learner can see today — Launch scope
 * (src/config/launchScope.ts) hides everything but Home, Learn, Exam,
 * Progress and Profile, so never mention a hidden feature here.
 *
 * `anchors` name `data-tour` attributes on the real nav (Navigation.tsx).
 * A step whose anchors are all missing or invisible (e.g. a layout without
 * the nav) falls back to a centred card, so a step can never point at nothing.
 */
export interface TourStep {
  id: string;
  title: string;
  body: string;
  anchors?: string[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Français AI',
    body:
      'This is your speaking coach for IGCSE French. You answer questions out loud, in French, and get feedback on every answer. Here’s a quick look around.',
  },
  {
    id: 'learn',
    title: 'Learn: one question at a time',
    body:
      'Pick a topic, answer out loud and get feedback straight away. This is the best place to start.',
    anchors: ['nav-learn'],
  },
  {
    id: 'exam',
    title: 'Exam: the full mock',
    body:
      'When you’re ready, sit a full speaking exam: a role play and two topic conversations, marked out of 40.',
    anchors: ['nav-exam'],
  },
  {
    id: 'progress',
    title: 'Progress and Profile',
    body:
      'Progress tracks your scores and streak. Profile has your settings, and you can replay this tour from there.',
    anchors: ['nav-progress', 'nav-profile'],
  },
  {
    id: 'feedback',
    title: 'How your feedback works',
    body:
      'After each answer you’ll see what you did well, the mistakes to fix first, and a better way to say it. Mock exams are marked against the Cambridge 0520 speaking criteria.',
  },
  {
    id: 'first-question',
    title: 'Answer your first question',
    body: 'It takes about a minute. Say whatever you can — every answer helps you improve.',
    anchors: ['nav-learn'],
  },
];
