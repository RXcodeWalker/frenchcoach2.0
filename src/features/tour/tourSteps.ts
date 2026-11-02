/**
 * The first-run guided tour's steps. Copy rules: short, second person, no
 * jargon, benefit before feature, and only what a learner can see today —
 * Launch scope (src/config/launchScope.ts) hides /about and /study-groups, and
 * the tour test bans naming anything that is not a nav destination.
 *
 * Shape of the tour (the order is the point, not an accident):
 *   1. welcome   — the promise, and how long this takes
 *   2. learn     — the place to start (recommended path)
 *   3. feedback  — SHOW what comes back (a worked example, not a description)
 *   4. exam      — the test, framed as the step after practice
 *   5. more      — everything else in one scannable step, not three
 *   6. mic       — prime the browser's microphone prompt right before the
 *                  action that triggers it, then hand over to a concrete CTA
 *
 * `anchors` name `data-tour` attributes on the real nav (Navigation.tsx).
 * A step whose anchors are all missing or invisible (e.g. a layout without
 * the nav) falls back to a centred card, so a step can never point at nothing.
 * `visual` picks a small illustration from TourVisuals.tsx.
 */
export type TourVisualId = 'feedback' | 'more' | 'mic';

export interface TourStep {
  id: string;
  title: string;
  body: string;
  anchors?: string[];
  visual?: TourVisualId;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Français AI',
    body:
      'Answer questions out loud in French and get a teacher’s feedback in seconds. Here’s a look around: it takes 30 seconds.',
  },
  {
    id: 'learn',
    title: 'Learn: practise a little, often',
    body:
      'Pick a topic, answer one question out loud and get feedback straight away. Short sessions, any time. This is the best place to start.',
    anchors: ['nav-learn'],
  },
  {
    id: 'feedback',
    title: 'Feedback you can act on',
    body:
      'Every answer comes back with what you did well and the one or two fixes that matter most. Here’s what that looks like:',
    visual: 'feedback',
  },
  {
    id: 'exam',
    title: 'Exam: your full mock',
    body:
      'When you feel steady, sit a mock speaking exam: a role play and two topic conversations, marked out of 40 against the Cambridge criteria.',
    anchors: ['nav-exam'],
  },
  {
    id: 'more',
    title: 'Everything else is a tap away',
    body: 'Three more places you’ll use:',
    anchors: ['nav-explore', 'nav-progress', 'nav-profile'],
    visual: 'more',
  },
  {
    id: 'mic',
    title: 'One thing before you start',
    body:
      'The first time you tap record, your browser asks to use your microphone. Tap Allow, or we can’t hear you. If you miss it, switch it on from the lock icon in the address bar.',
    visual: 'mic',
  },
];
