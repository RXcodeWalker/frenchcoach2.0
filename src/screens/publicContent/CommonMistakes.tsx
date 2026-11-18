import { MarketingLayout } from '../../components/layout/MarketingLayout';
import { MISTAKES_SEO } from '../../config/publicContentSeo';
import { COMMON_MISTAKES, type MistakeExample } from '../../data/seo/mistakes';
import { TOPIC_PAGES } from '../../data/seo/topics';
import { IGCSE_PATH, MARKING_PATH, MISTAKES_PATH, ROLEPLAY_HUB_PATH, TOPICS_HUB_PATH, topicPath } from '../../data/seo/paths';
import { Eyebrow, Fr, PracticePanel } from './parts';
import { MUTED } from './styles';

// /igcse-french-speaking/common-mistakes. The slips are data (data/seo/mistakes.ts);
// each "see it done right" example is looked up from the topic pages' own
// highlights at render time, so its note can never drift from the model answer.

function lookup(example: MistakeExample) {
  const topic = TOPIC_PAGES.find((t) => t.slug === example.topic);
  if (!topic) return undefined;
  for (const answer of topic.answers) {
    const highlight = answer.highlights.find((h) => h.fr === example.fr);
    if (highlight) return { topic, highlight };
  }
  return undefined;
}

export function CommonMistakes() {
  return (
    <MarketingLayout
      route={MISTAKES_PATH}
      seo={MISTAKES_SEO}
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'IGCSE French Speaking Exam', href: IGCSE_PATH },
        { label: 'Common mistakes' },
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-14">
        <header>
          <Eyebrow>IGCSE French speaking</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
            Common mistakes in IGCSE French speaking
          </h1>
          <p className="text-lg leading-relaxed" style={MUTED}>
            Four kinds of slip come up again and again in spoken French at IGCSE level: agreement, être and avoir,
            tense choice and answers that stop too soon. Each section shows the slip, the fix and where to see the
            right version in a model answer.
          </p>
          <p className="text-base leading-relaxed mt-4" style={MUTED}>
            To see where these slips cost marks, read{' '}
            <a href={MARKING_PATH} className="mk-link">
              how the exam is marked
            </a>
            .
          </p>
        </header>

        {COMMON_MISTAKES.map((m) => (
          <section key={m.id} aria-labelledby={`mistake-${m.id}`}>
            <h2 id={`mistake-${m.id}`} className="font-display text-2xl mb-3 scroll-mt-24">
              {m.title}
            </h2>
            <p className="text-base leading-relaxed mb-5" style={MUTED}>
              {m.lead}
            </p>

            <ul className="space-y-3 mb-6">
              {m.slips.map((s) => (
                <li key={s.wrong} className="rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                  <p className="text-base">
                    <Fr className="mk-mark-bad line-through decoration-1">{s.wrong}</Fr>
                  </p>
                  <p className="text-base mt-1">
                    <Fr className="mk-mark-good font-semibold">{s.right}</Fr>
                  </p>
                  <p className="text-sm mt-2 leading-relaxed" style={MUTED}>
                    {s.note}
                  </p>
                </li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold mb-2">What to do</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-base leading-relaxed mb-3" style={MUTED}>
              {m.fix.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed mb-6" style={MUTED}>
              {m.marks}
            </p>

            <h3 className="text-lg font-semibold mb-2">See it done right</h3>
            <ul className="space-y-3">
              {m.examples.map((ex) => {
                const found = lookup(ex);
                if (!found) return null;
                return (
                  <li key={`${ex.topic}:${ex.fr}`} className="text-base leading-relaxed">
                    <Fr className="font-semibold">{ex.fr}</Fr>
                    <span style={MUTED}> — {found.highlight.note} </span>
                    <a href={topicPath(found.topic.slug)} className="mk-link text-sm">
                      From the {found.topic.title.toLowerCase()} model answers
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="font-display text-2xl mb-3">Where to practise next</h2>
          <p className="text-base leading-relaxed" style={MUTED}>
            Read a full answer on a{' '}
            <a href={TOPICS_HUB_PATH} className="mk-link">
              topic page
            </a>
            , then say your own out loud. For the role play, work through the{' '}
            <a href={ROLEPLAY_HUB_PATH} className="mk-link">
              role-play examples
            </a>
            , where short, complete answers are exactly what is wanted.
          </p>
        </section>

        <PracticePanel
          heading="Catch these slips as you speak"
          body="Record an answer and get feedback that quotes your own words. Free to start, no card needed."
          button="Start practising free"
          cta="mistakes_page_start"
        />
      </div>
    </MarketingLayout>
  );
}
