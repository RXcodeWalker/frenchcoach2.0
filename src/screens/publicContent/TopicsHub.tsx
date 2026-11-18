import { MarketingLayout } from '../../components/layout/MarketingLayout';
import { TOPICS_HUB_SEO } from '../../config/publicContentSeo';
import { TOPIC_PAGES } from '../../data/seo/topics';
import { conversationLabel } from '../../data/seo/syllabus';
import { IGCSE_PATH, MARKING_PATH, MISTAKES_PATH, ROLEPLAY_HUB_PATH, TOPICS_HUB_PATH, topicPath } from '../../data/seo/paths';
import { Eyebrow, LinkCard, PracticePanel } from './parts';
import { FAINT, MUTED } from './styles';

/** /igcse-french-speaking/topics: every topic page, with the exam's own structure above it. */
export function TopicsHub() {
  return (
    <MarketingLayout
      route={TOPICS_HUB_PATH}
      seo={TOPICS_HUB_SEO}
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'IGCSE French Speaking Exam', href: IGCSE_PATH },
        { label: 'Topics and model answers' },
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-14">
        <header>
          <Eyebrow>IGCSE French speaking</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
            IGCSE French speaking topics and model answers
          </h1>
          <p className="text-lg leading-relaxed" style={MUTED}>
            {TOPIC_PAGES.length} topics, each with four model answers (describing, giving an opinion, the past and
            the future), the key vocabulary and more questions to practise. Read the answer, say your own, then
            compare.
          </p>
        </header>

        <section>
          <h2 className="font-display text-2xl mb-3">How the topic conversations work</h2>
          <p className="text-base leading-relaxed mb-3" style={MUTED}>
            Paper 3 has two topic conversations of about four minutes each. The first is on a topic from Area A
            (everyday activities) or Area B (personal and social life); the second is on a topic from Area C (the
            world around us), D (the world of work) or E (the international world). You are told the topic as the
            conversation starts, so it pays to prepare several.
          </p>
          <p className="text-base leading-relaxed" style={MUTED}>
            For the marks, how the exam is built and what to expect, see the{' '}
            <a href={IGCSE_PATH} className="mk-link">
              IGCSE French speaking exam guide
            </a>
            . To practise the role-play part, see the{' '}
            <a href={ROLEPLAY_HUB_PATH} className="mk-link">
              role-play examples
            </a>
            . To see what the marks reward, read{' '}
            <a href={MARKING_PATH} className="mk-link">
              how the exam is marked
            </a>
            , and for the slips to avoid,{' '}
            <a href={MISTAKES_PATH} className="mk-link">
              common mistakes in IGCSE French speaking
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-5">Choose a topic</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {TOPIC_PAGES.map((t) => (
              <li key={t.slug}>
                <LinkCard
                  href={topicPath(t.slug)}
                  title={t.title}
                  sub={`${t.frTitle} · can come up in ${conversationLabel(t.areas)}`}
                />
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed mt-4" style={FAINT}>
            The topic names are French Coach’s own; each page shows the syllabus area it matches most closely.
          </p>
        </section>

        <PracticePanel
          heading="Practise these topics out loud"
          body="Pick a topic, record your answers and get feedback on every one. Free to start, no card needed."
          button="Start practising free"
          cta="topics_hub_start"
          to="/learn"
        />
      </div>
    </MarketingLayout>
  );
}
