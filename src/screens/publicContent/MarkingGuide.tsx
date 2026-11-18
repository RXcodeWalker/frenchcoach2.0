import { MarketingLayout } from '../../components/layout/MarketingLayout';
import { MARKING_SEO } from '../../config/publicContentSeo';
import {
  COMMUNICATION,
  CRITERIA,
  EXAM_PARTS,
  QUALITY_OF_LANGUAGE,
  ROLE_PLAY,
  ROLE_PLAY_EXAMPLES,
  SORT_ITEMS,
  TOTAL_MARKS,
  type MarkArea,
} from '../../features/examGuide/guideContent';
import { IGCSE_PATH, MISTAKES_PATH, ROLEPLAY_HUB_PATH, MARKING_PATH, TOPICS_HUB_PATH } from '../../data/seo/paths';
import { Eyebrow, Fr, PracticePanel } from './parts';
import { FAINT, MUTED } from './styles';

// /igcse-french-speaking/marking. Every number comes from the scoring engine's
// own sourced data (rubric.ts, through the exam guide's content module) and
// every explanation is the guide's plain English. No Cambridge descriptor text
// is quoted (public-seo-pages §2), and the one figure the notes we hold do not
// state — the paper's share of the qualification — is left out.

const BAND_RANGES = COMMUNICATION.bands.map((b) => (b.min === b.max ? `${b.min}` : `${b.min}–${b.max}`));

const MARKED_PARTS = EXAM_PARTS.filter((p) => p.marked);

function behaviours(area: MarkArea) {
  return SORT_ITEMS.filter((i) => i.area === area);
}

export function MarkingGuide() {
  const rolePlay = CRITERIA.find((c) => c.id === 'rolePlay')!;
  const communication = CRITERIA.find((c) => c.id === 'communication')!;
  const quality = CRITERIA.find((c) => c.id === 'qualityOfLanguage')!;

  return (
    <MarketingLayout
      route={MARKING_PATH}
      seo={MARKING_SEO}
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'IGCSE French Speaking Exam', href: IGCSE_PATH },
        { label: 'How it is marked' },
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-14">
        <header>
          <Eyebrow>IGCSE French speaking</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4">
            How the IGCSE French speaking exam is marked
          </h1>
          <p className="text-lg leading-relaxed" style={MUTED}>
            The speaking exam (Paper 3) is worth {TOTAL_MARKS} marks, and they come from three places: the role
            play, and two marks that each cover both topic conversations together. Knowing which is which tells
            you where practice pays off.
          </p>
        </header>

        <section>
          <h2 className="font-display text-2xl mb-4">The {TOTAL_MARKS} marks at a glance</h2>
          <div className="rounded-xl border mk-hairline overflow-hidden">
            {CRITERIA.map((c) => (
              <div key={c.id} className="flex items-start gap-4 p-4 border-b mk-hairline">
                <div className="flex-1">
                  <p className="text-base font-semibold">{c.name}</p>
                  <p className="text-sm mt-1" style={MUTED}>
                    {c.covers}
                  </p>
                </div>
                <span className="text-base font-bold">{c.max}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 p-4" style={{ background: 'var(--mk-accent-soft)' }}>
              <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--mk-accent)' }}>
                Total
              </span>
              <span className="text-lg font-bold">{TOTAL_MARKS} marks</span>
            </div>
          </div>
          <p className="text-base leading-relaxed mt-4" style={MUTED}>
            The exam has {MARKED_PARTS.length} marked parts after a 10-minute preparation:{' '}
            {MARKED_PARTS.map((p, i) => (
              <span key={p.id}>
                {i > 0 && (i === MARKED_PARTS.length - 1 ? ' and ' : ', ')}
                {p.label.toLowerCase()} ({p.length})
              </span>
            ))}
            . The level aimed at is CEFR A2 with elements of B1.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">
            {ROLE_PLAY.name}: {ROLE_PLAY.tasks} tasks, {ROLE_PLAY.marksPerResponse} marks each
          </h2>
          <p className="text-base leading-relaxed mb-3" style={MUTED}>
            {rolePlay.plain} Each answer is marked on its own, so one weak answer never drags down the next.
          </p>
          <p className="text-base leading-relaxed mb-6" style={MUTED}>
            A short answer can be a full-mark answer: what counts is that the information is complete and correct,
            not how long the reply is. These four examples show how a mark is decided. The marks are French Coach’s
            own reading of the published mark scheme, so treat them as a guide.
          </p>
          <ul className="space-y-3">
            {ROLE_PLAY_EXAMPLES.map((ex) => (
              <li key={ex.id} className="rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                <p className="text-sm" style={FAINT}>
                  Examiner: <Fr>{ex.question}</Fr> ({ex.questionEn})
                </p>
                <p className="text-base mt-1">
                  Candidate: <Fr className="font-semibold">{ex.answer}</Fr>
                </p>
                <p className="text-sm mt-2 font-semibold" style={{ color: 'var(--mk-accent)' }}>
                  {ex.mark} of {ROLE_PLAY.marksPerResponse} marks
                </p>
                <p className="text-sm mt-1 leading-relaxed" style={MUTED}>
                  {ex.why}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-base leading-relaxed mt-5" style={MUTED}>
            To see this on whole cards, read the{' '}
            <a href={ROLEPLAY_HUB_PATH} className="mk-link">
              role-play examples with model replies
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">
            {COMMUNICATION.name}: what you say ({COMMUNICATION.maxMarks} marks)
          </h2>
          <p className="text-base leading-relaxed mb-4" style={MUTED}>
            {communication.plain} It is one mark for {COMMUNICATION.combinedAcross} together, so your whole
            performance counts, not any single answer. Behaviours that belong to this mark:
          </p>
          <ul className="space-y-3">
            {behaviours('communication').map((b) => (
              <li key={b.id} className="rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                <p className="text-base font-semibold">{b.text}</p>
                <p className="text-sm mt-1 leading-relaxed" style={MUTED}>
                  {b.why}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">
            {QUALITY_OF_LANGUAGE.name}: how you say it ({QUALITY_OF_LANGUAGE.maxMarks} marks)
          </h2>
          <p className="text-base leading-relaxed mb-4" style={MUTED}>
            {quality.plain} Like Communication, it is one mark for {QUALITY_OF_LANGUAGE.combinedAcross} together.
            Behaviours that belong to this mark:
          </p>
          <ul className="space-y-3">
            {behaviours('qualityOfLanguage').map((b) => (
              <li key={b.id} className="rounded-xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
                <p className="text-base font-semibold">{b.text}</p>
                <p className="text-sm mt-1 leading-relaxed" style={MUTED}>
                  {b.why}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-base leading-relaxed mt-5" style={MUTED}>
            Both of these marks are won in the topic conversations. The{' '}
            <a href={TOPICS_HUB_PATH} className="mk-link">
              topic pages
            </a>{' '}
            show model answers with the reason each part earns credit, and{' '}
            <a href={MISTAKES_PATH} className="mk-link">
              common mistakes in IGCSE French speaking
            </a>{' '}
            covers the slips that cost the most.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">How the two conversation marks are decided</h2>
          <p className="text-base leading-relaxed mb-3" style={MUTED}>
            Communication and Quality of Language are each scored out of {COMMUNICATION.maxMarks} and grouped
            into bands of marks: {BAND_RANGES.join(', ')}. The examiner first decides which band best fits your
            whole performance across both conversations, then chooses a mark within it. Needing the question
            repeated now and then, or the simpler alternative question, is normal; needing them often is what
            moves a performance down a band.
          </p>
          <p className="text-base leading-relaxed" style={MUTED}>
            The two marks are independent: a conversation can be rich in ideas but loose in grammar, or accurate
            but thin, and each shows in its own mark.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl mb-3">How French Coach marks your practice</h2>
          <p className="text-base leading-relaxed mb-3" style={MUTED}>
            In a full mock exam your spoken answers are written out and checked against the Cambridge 0520
            speaking criteria, then reported as a mark out of {TOTAL_MARKS} split into role play, communication and
            quality of language. Practice questions give coaching instead of a mark: what went well, what to fix
            first and a better way to say it.
          </p>
          <p className="text-base leading-relaxed" style={MUTED}>
            Treat a mock mark as practice only, not a Cambridge result: its job is to show where marks are being lost.
            French Coach is an independent practice tool, not affiliated with or endorsed by Cambridge Assessment
            International Education. For the format of the exam, see the{' '}
            <a href={IGCSE_PATH} className="mk-link">
              IGCSE French speaking exam guide
            </a>
            .
          </p>
        </section>

        <PracticePanel
          heading="See where your marks are"
          body="Answer out loud and get feedback on what to change. Free to start, no card needed."
          button="Start practising free"
          cta="marking_page_start"
        />
      </div>
    </MarketingLayout>
  );
}
