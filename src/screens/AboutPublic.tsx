import { MarketingLayout } from '../components/layout/MarketingLayout';
import { IGCSE_PATH, MARKING_PATH, MISTAKES_PATH, ROLEPLAY_HUB_PATH, TOPICS_HUB_PATH } from '../data/seo/paths';
import { Eyebrow, LinkCard, PracticePanel } from './publicContent/parts';
import { MUTED } from './publicContent/styles';
import { LIMITS_COPY } from './landing/landingContent';

const BREADCRUMB = [
  { label: 'Home', href: '/' },
  { label: 'About' },
];

// Logged-out, non-guest rendering of /about — mounted by PublicRoutes, no
// AppProvider/AuthContext dependency. The signed-in/guest rendering is
// About.tsx (TopContextBar + PageShell, in-app tokens) around AboutContent;
// the public page is written for a visitor who has never seen the app, in the
// marketing tokens, so it has its own copy. Every claim here is one the
// landing page already makes (Landing.test.tsx holds those).
export function AboutPublic() {
  return (
    <MarketingLayout route="/about" breadcrumb={BREADCRUMB}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-12">
        <header>
          <Eyebrow>About</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">About French Coach</h1>
          <p className="text-lg leading-relaxed" style={MUTED}>
            French Coach is a speaking-practice coach for IGCSE French learners. You answer out loud, see what you
            actually said, and get feedback on what to change.
          </p>
        </header>

        <section>
          <h2 className="font-display text-2xl mb-3">Why it exists</h2>
          <p className="text-base leading-relaxed mb-3" style={MUTED}>
            Most students know more French than they can say under pressure. You can read it and write it, but when
            the examiner asks a question the words vanish. In a normal lesson there is little time for each student
            to speak, so the speaking exam is the part that gets the least practice.
          </p>
          <p className="text-base leading-relaxed" style={MUTED}>
            French Coach gives you that practice at any time. It was built by one person who felt that gap as a
            student; the{' '}
            <a href="/story" className="mk-link">
              story behind French Coach
            </a>{' '}
            tells it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">What you can do</h2>
          <ul className="list-disc pl-5 space-y-2 text-base leading-relaxed" style={MUTED}>
            <li>
              <strong style={{ color: 'var(--mk-ink)' }}>Practise a question.</strong> Pick a topic, record your
              answer and get coaching: what went well, what to fix first and a better way to say it. Every
              correction quotes your own words.
            </li>
            <li>
              <strong style={{ color: 'var(--mk-ink)' }}>Sit a mock exam.</strong> A role play and two topic
              conversations, in the order of Paper 3, with a 10-minute preparation first. The result is marked
              against the Cambridge 0520 speaking criteria and reported out of 40.
            </li>
            <li>
              <strong style={{ color: 'var(--mk-ink)' }}>Read first, then speak.</strong> Free{' '}
              <a href={TOPICS_HUB_PATH} className="mk-link">
                model answers for 16 topics
              </a>{' '}
              and{' '}
              <a href={ROLEPLAY_HUB_PATH} className="mk-link">
                role-play examples
              </a>{' '}
              show what a strong answer sounds like.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">What it is, and is not</h2>
          <p className="text-base leading-relaxed mb-3" style={MUTED}>
            French Coach is an independent practice tool, not affiliated with or endorsed by Cambridge Assessment
            International Education. Treat a mock mark as practice, not a Cambridge result: its job is to show you
            where marks are being lost.
          </p>
          <p className="text-base leading-relaxed" style={MUTED}>
            To see how the marks work, read{' '}
            <a href={MARKING_PATH} className="mk-link">
              how the IGCSE French speaking exam is marked
            </a>{' '}
            and{' '}
            <a href={MISTAKES_PATH} className="mk-link">
              common mistakes in IGCSE French speaking
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">Free to start</h2>
          <p className="text-base leading-relaxed" style={MUTED}>
            You can start as a guest with no account and no card. A free account gives you {LIMITS_COPY}, and keeps
            your progress safe. All you need is a phone or laptop with a microphone and a modern browser; Chrome gives
            the smoothest experience.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-5">Where to start</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li>
              <LinkCard href={IGCSE_PATH} title="IGCSE French speaking exam guide" sub="What Paper 3 covers and how it runs" />
            </li>
            <li>
              <LinkCard href={TOPICS_HUB_PATH} title="Topics and model answers" sub="Sixteen topics, four answers each" />
            </li>
            <li>
              <LinkCard href={ROLEPLAY_HUB_PATH} title="Role-play examples" sub="Six practice role plays with model replies" />
            </li>
            <li>
              <LinkCard href="/french-roleplay-practice" title="French roleplay practice" sub="Everyday scenarios to speak your way through" />
            </li>
          </ul>
        </section>

        <PracticePanel
          heading="Ready to speak?"
          body="Answer a question out loud and see what to change. Free to start, no card needed."
          button="Start practising free"
          cta="about_page_start"
        />
      </div>
    </MarketingLayout>
  );
}
