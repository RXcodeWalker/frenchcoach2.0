import { MarketingLayout } from '../../components/layout/MarketingLayout';
import { ROLEPLAY_HUB_SEO } from '../../config/publicContentSeo';
import { ROLE_PLAY } from '../../domain/igcse/rubric';
import { ROLE_PLAY_EXAMPLES } from '../../data/seo/rolePlays';
import { IGCSE_PATH, MARKING_PATH, MISTAKES_PATH, ROLEPLAY_HUB_PATH, TOPICS_HUB_PATH, rolePlayPath } from '../../data/seo/paths';
import { Eyebrow, LinkCard, PracticePanel } from './parts';
import { MUTED } from './styles';

/** /igcse-french-speaking/role-play: the role-play examples, with the rules of the part above them. */
export function RolePlayHub() {
  return (
    <MarketingLayout
      route={ROLEPLAY_HUB_PATH}
      seo={ROLEPLAY_HUB_SEO}
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'IGCSE French Speaking Exam', href: IGCSE_PATH },
        { label: 'Role-play examples' },
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-14">
        <header>
          <Eyebrow>IGCSE French speaking</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
            IGCSE French role-play examples with model answers
          </h1>
          <p className="text-lg leading-relaxed" style={MUTED}>
            {ROLE_PLAY_EXAMPLES.length} practice role plays. Each shows what the examiner says, what you have to get
            across in each task, and a short model reply, so you can see how little it takes to score well.
          </p>
        </header>

        <section>
          <h2 className="font-display text-2xl mb-3">What the role play is</h2>
          <p className="text-base leading-relaxed mb-3" style={MUTED}>
            The role play is the first marked part of the speaking exam and lasts about two minutes. The examiner
            plays a character from your card and asks you {ROLE_PLAY.tasks} questions, one task each. You can earn
            up to {ROLE_PLAY.marksPerResponse} marks for each, {ROLE_PLAY.maxMarks} in all.
          </p>
          <p className="text-base leading-relaxed" style={MUTED}>
            Short is fine: a reply that communicates the information fully and correctly can earn full marks, and
            you do not need to add extra detail. Some questions come in two parts, and then both parts need an
            answer. These examples are written for practice; they are not exam papers. See{' '}
            <a href={MARKING_PATH} className="mk-link">
              how the exam is marked
            </a>{' '}
            for worked marks, and{' '}
            <a href={MISTAKES_PATH} className="mk-link">
              common mistakes
            </a>{' '}
            for slips to avoid.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-5">Choose a role play</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ROLE_PLAY_EXAMPLES.map((r) => (
              <li key={r.slug}>
                <LinkCard href={rolePlayPath(r.slug)} title={r.title} sub={`${r.tasks.length} tasks with model replies`} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">Then the topic conversations</h2>
          <p className="text-base leading-relaxed" style={MUTED}>
            The other two parts of the exam are topic conversations, worth most of the marks. See the{' '}
            <a href={TOPICS_HUB_PATH} className="mk-link">
              topics and model answers
            </a>{' '}
            to prepare them.
          </p>
        </section>

        <PracticePanel
          heading="Practise a role play out loud"
          body="Speak the replies yourself and get feedback on each one. Free to start, no card needed."
          button="Start practising free"
          cta="roleplay_examples_hub_start"
        />
      </div>
    </MarketingLayout>
  );
}
