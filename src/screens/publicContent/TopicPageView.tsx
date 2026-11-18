import { MarketingLayout } from '../../components/layout/MarketingLayout';
import { getPublicContentSeo } from '../../config/publicContentSeo';
import { COMMUNICATION, QUALITY_OF_LANGUAGE } from '../../domain/igcse/rubric';
import { getTopicPage } from '../../data/seo/topics';
import { ANSWER_KIND_LABEL, type ModelAnswer, type TopicPage } from '../../data/seo/types';
import { AREA_NAMES, conversationLabel } from '../../data/seo/syllabus';
import { IGCSE_PATH, ROLEPLAY_HUB_PATH, TOPICS_HUB_PATH, topicPath } from '../../data/seo/paths';
import { Eyebrow, Fr, LinkCard, PracticePanel } from './parts';
import { FAINT, MUTED } from './styles';

function AnswerBlock({ answer, index }: { answer: ModelAnswer; index: number }) {
  return (
    <article className="rounded-2xl border mk-hairline p-6 md:p-7" style={{ background: 'var(--mk-surface)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--mk-accent)' }}>
        {index + 1}. {ANSWER_KIND_LABEL[answer.kind]}
      </p>
      <h3 className="text-xl font-semibold leading-snug">
        <Fr>{answer.question}</Fr>
      </h3>
      <p className="text-sm mb-4" style={FAINT}>
        {answer.questionEn}
      </p>
      <Fr as="p" className="text-base leading-relaxed mb-5">
        {answer.answer}
      </Fr>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={FAINT}>
        Why it earns marks
      </p>
      <ul className="flex flex-col gap-2.5">
        {answer.highlights.map((h) => (
          <li key={h.fr} className="text-sm leading-relaxed" style={MUTED}>
            <Fr className="font-semibold" style={{ color: 'var(--mk-ink)' }}>
              « {h.fr} »
            </Fr>{' '}
            — {h.note}
          </li>
        ))}
      </ul>
    </article>
  );
}

/** One topic page: model answers for each question shape, tips, vocabulary and more questions. */
export function TopicPageView({ slug }: { slug: string }) {
  const topic: TopicPage | undefined = getTopicPage(slug);
  if (!topic) return <TopicNotFound />;

  const path = topicPath(topic.slug);
  const related = topic.related.map((s) => getTopicPage(s)).filter((t): t is TopicPage => t !== undefined);
  const areaLine = topic.areas.map((a) => `Area ${a}: ${AREA_NAMES[a]}`).join(' · ');

  return (
    <MarketingLayout
      route={path}
      seo={getPublicContentSeo(path)}
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'IGCSE French Speaking Exam', href: IGCSE_PATH },
        { label: 'Topics and model answers', href: TOPICS_HUB_PATH },
        { label: topic.title },
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-14">
        <header>
          <Eyebrow>IGCSE French speaking · topic</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
            {topic.title}: model answers for IGCSE French speaking
          </h1>
          <p className="text-lg leading-relaxed mb-6" style={MUTED}>
            {topic.intro}
          </p>
          <dl className="rounded-xl border mk-hairline p-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold" style={FAINT}>
                Where it sits in the syllabus
              </dt>
              <dd className="mt-0.5">
                {areaLine}
                <span style={MUTED}> — {topic.subTopics.join('; ')}</span>
              </dd>
            </div>
            <div>
              <dt className="font-semibold" style={FAINT}>
                Where it can come up
              </dt>
              <dd className="mt-0.5">In {conversationLabel(topic.areas)}</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed mt-3" style={FAINT}>
            The topic names are French Coach’s own; the syllabus areas are the closest match. The examiner chooses
            the topics, so prepare more than one.
          </p>
        </header>

        <section id="answers">
          <h2 className="font-display text-2xl mb-3">Four model answers</h2>
          <p className="text-base leading-relaxed mb-6" style={MUTED}>
            A topic conversation asks four kinds of question: describe something in the present, give an opinion
            with reasons, talk about the past, and talk about the future or a “what if”. Here is one model answer
            for each, at the level the IGCSE asks for (A2 with elements of B1). The notes under each one show
            where the marks come from.
          </p>
          <div className="flex flex-col gap-6">
            {topic.answers.map((answer, i) => (
              <AnswerBlock key={answer.kind} answer={answer} index={i} />
            ))}
          </div>
        </section>

        <section id="how-marked" className="rounded-2xl border mk-hairline p-6">
          <h2 className="font-display text-2xl mb-3">How these answers are marked</h2>
          <p className="text-base leading-relaxed" style={MUTED}>
            The two topic conversations together earn {COMMUNICATION.maxMarks} marks for Communication (what you
            say: relevant, developed, with opinions and reasons) and {QUALITY_OF_LANGUAGE.maxMarks} for Quality of
            Language (how you say it: range and accuracy of structures and vocabulary, plus pronunciation). They
            are marked across both conversations, not question by question, so one weak answer does not sink you.
            The full breakdown is in the{' '}
            <a href={IGCSE_PATH} className="mk-link">
              IGCSE French speaking exam guide
            </a>
            .
          </p>
        </section>

        <section id="tips">
          <h2 className="font-display text-2xl mb-4">How to prepare this topic</h2>
          <ul className="flex flex-col gap-3">
            {topic.tips.map((tip) => (
              <li key={tip} className="text-base leading-relaxed pl-4 border-l-2" style={{ borderColor: 'var(--mk-accent)', ...MUTED }}>
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <section id="vocabulary">
          <h2 className="font-display text-2xl mb-4">Key vocabulary</h2>
          <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {topic.vocab.map((v) => (
              <div key={v.fr} className="flex justify-between gap-4 border-b mk-hairline pb-2.5 text-sm">
                <dt>
                  <Fr className="font-semibold">{v.fr}</Fr>
                </dt>
                <dd style={MUTED}>{v.en}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="practice">
          <h2 className="font-display text-2xl mb-3">More questions to practise</h2>
          <p className="text-base leading-relaxed mb-4" style={MUTED}>
            Say each answer out loud first, then check it against the shape of the model answers above: an
            opinion with a reason, the right tense for the time frame, and one extra detail.
          </p>
          <ol className="flex flex-col gap-2 list-decimal pl-5 text-base">
            {topic.moreQuestions.map((q) => (
              <li key={q}>
                <Fr>{q}</Fr>
              </li>
            ))}
          </ol>
        </section>

        <PracticePanel
          heading={`Practise “${topic.title}” out loud`}
          body="Record your own answers to questions like these and get feedback on what you said. Free to start, no card needed."
          button="Start practising free"
          cta="topic_page_start"
          to={`/learn?topic=${encodeURIComponent(topic.learnKey)}`}
        />

        <section>
          <h2 className="font-display text-2xl mb-4">Keep going</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((t) => (
              <LinkCard key={t.slug} href={topicPath(t.slug)} title={t.title} sub="Topic and model answers" />
            ))}
            <LinkCard href={TOPICS_HUB_PATH} title="All 16 topics" sub="Topics and model answers" />
            <LinkCard href={ROLEPLAY_HUB_PATH} title="Role-play examples" sub="Six practice role plays with model replies" />
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}

function TopicNotFound() {
  return (
    <MarketingLayout route="/404">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-20 text-center">
        <h1 className="font-display text-3xl mb-4">Topic not found</h1>
        <p className="text-base leading-relaxed mb-6" style={MUTED}>
          There is no topic page at that address. Every topic is listed on the{' '}
          <a href={TOPICS_HUB_PATH} className="mk-link">
            topics page
          </a>
          .
        </p>
      </div>
    </MarketingLayout>
  );
}
