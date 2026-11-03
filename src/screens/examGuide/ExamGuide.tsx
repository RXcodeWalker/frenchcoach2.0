import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Check, MessagesSquare, Mic, Sparkles } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { TopContextBar } from '../../components/TopContextBar';
import { Button } from '../../components/ui/Button';
import { useShowNavRail } from '../../components/layout/shellChrome';
import { enter, enterReduced, fill } from '../../components/motion/variants';
import { track } from '../../services/telemetry/telemetryService';
import { markExamGuideSeen, type ExamGuideLocationState, type StartSimLocationState } from '../../features/examGuide/guideSeen';
import {
  CHAPTERS,
  COMMUNICATION,
  EXAM_WINDOW_DAYS,
  HELP_LADDER,
  LEARN_ANSWERS_PER_DAY,
  MODE_ROWS,
  PRACTICE_ONLY_REASONS,
  PRINCIPLE_RP_CONCISE,
  QUALITY_OF_LANGUAGE,
  ROLE_PLAY,
  TOTAL_MARKS,
  type ChapterId,
} from '../../features/examGuide/guideContent';
import {
  AnswerLadder,
  BandExplorer,
  GuideQuiz,
  MarksBar,
  PartsTimeline,
  PhraseList,
  RolePlayMarker,
  TopicAreaList,
} from './GuideWidgets';

/**
 * The exam guide (`/exam/guide`), opened from the exam chooser: a six-chapter
 * lesson on how Paper 3 runs, how it is marked, how to answer each part, and
 * how to prepare in the app, ending in a short quiz. Every mark and band
 * descriptor comes from the scorer's own rubric data (`guideContent.ts`).
 *
 * It names no question set and no topic a learner could meet in Exam Sim
 * (exam-conduct §4): the examples are the app's own teaching sentences.
 * It writes no app state; the only side effect is two counts-only events.
 */
export function ExamGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  /** Opened automatically before a first Exam Sim: the way out leads into that exam. */
  const thenSim = (location.state as ExamGuideLocationState | null)?.thenSim === true;
  const startSim = () => navigate('/exam', { state: { startSim: true } satisfies StartSimLocationState });
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<Set<ChapterId>>(() => new Set<ChapterId>([CHAPTERS[0].id]));
  const topRef = useRef<HTMLDivElement>(null);

  // A reading page, like the chooser it opens from: the side rail stays.
  useShowNavRail(true);

  useEffect(() => {
    markExamGuideSeen();
    track({ name: 'exam_guide_opened', props: {} });
  }, []);

  const chapter = CHAPTERS[index];
  const isLast = index === CHAPTERS.length - 1;

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, next));
    setIndex(clamped);
    setVisited((v) => new Set(v).add(CHAPTERS[clamped].id));
    topRef.current?.scrollIntoView?.({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <>
      <TopContextBar title="How the exam works" subtitle="Exam · Guide" showBack onBack={() => navigate('/exam')} backLabel="Back to Exam" />
      <PageShell maxWidth="md" gap={24}>
        <motion.div variants={item} ref={topRef} className="flex scroll-mt-24 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-eyebrow uppercase text-ink-subtle">Cambridge IGCSE French 0520 · Paper 3 Speaking</span>
            <h1 className="exam-serif text-title text-ink">Know the exam before you sit it</h1>
          </div>
          {thenSim && (
            <div className="flex flex-col gap-3 rounded-card border border-action bg-action-soft p-4 sm:flex-row sm:items-center" data-testid="guide-first-sim">
              <p className="flex-1 text-body-s text-ink">
                Before your first Exam Sim: a few minutes here shows you how the exam runs and how it’s marked. You’ll only
                see this once.
              </p>
              <Button variant="secondary" size="sm" onClick={startSim} className="shrink-0 self-start sm:self-center" data-testid="guide-skip-to-sim">
                Skip to the exam
              </Button>
            </div>
          )}
          <ChapterNav index={index} visited={visited} onPick={goTo} />
        </motion.div>

        <motion.section
          key={chapter.id}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          aria-labelledby="guide-chapter-title"
          className="flex flex-col gap-6"
          data-testid={`guide-chapter-${chapter.id}`}
        >
          <header className="flex flex-col gap-1">
            <span className="text-eyebrow uppercase text-ink-subtle">
              Chapter <span className="font-numeral">{index + 1}</span> of <span className="font-numeral">{CHAPTERS.length}</span>
            </span>
            <h2 id="guide-chapter-title" className="exam-serif text-display-m text-ink">{chapter.title}</h2>
          </header>
          <ChapterBody id={chapter.id} />
        </motion.section>

        <nav aria-label="Chapters" className="flex items-center justify-between gap-3 border-t border-hairline pt-5">
          {index > 0 ? (
            <Button variant="quiet" onClick={() => goTo(index - 1)}>
              <ArrowLeft size={16} aria-hidden="true" /> {CHAPTERS[index - 1].title}
            </Button>
          ) : (
            <span />
          )}
          {isLast ? (
            <Button onClick={thenSim ? startSim : () => navigate('/exam')} data-testid="guide-finish">
              {thenSim ? 'Start Exam Sim' : 'Go to exams'} <ArrowRight size={16} aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={() => goTo(index + 1)} data-testid="guide-next">
              Next: {CHAPTERS[index + 1].title} <ArrowRight size={16} aria-hidden="true" />
            </Button>
          )}
        </nav>
      </PageShell>
    </>
  );
}

function ChapterNav({ index, visited, onPick }: { index: number; visited: Set<ChapterId>; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="block h-1 overflow-hidden rounded-pill bg-track" aria-hidden="true">
        <motion.span
          className="block h-full rounded-pill bg-action"
          initial={false}
          animate={{ width: `${(visited.size / CHAPTERS.length) * 100}%` }}
          transition={fill(0)}
        />
      </span>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CHAPTERS.map((c, i) => {
          const on = i === index;
          const seen = visited.has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-current={on ? 'step' : undefined}
                data-testid={`guide-tab-${c.id}`}
                className={`flex h-full w-full items-start gap-2 rounded-control border p-2.5 text-left transition-colors duration-state ease-smooth
                  ${on ? 'border-action bg-action-soft' : 'border-hairline bg-surface hover:border-hairline-strong'}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill font-numeral text-caption
                    ${seen && !on ? 'bg-action text-action-ink' : 'border border-hairline-strong text-ink-muted'}`}
                  aria-hidden="true"
                >
                  {seen && !on ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-label text-ink">{c.title}</span>
                  <span className="hidden text-caption text-ink-subtle sm:block">{c.blurb}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ChapterBody({ id }: { id: ChapterId }) {
  switch (id) {
    case 'exam':
      return <ExamChapter />;
    case 'marks':
      return <MarksChapter />;
    case 'rolePlay':
      return <RolePlayChapter />;
    case 'conversations':
      return <ConversationsChapter />;
    case 'app':
      return <AppChapter />;
    case 'check':
      return <CheckChapter />;
  }
}

// ── Building blocks ──────────────────────────────────────────────────────────

function Block({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-subtitle text-ink">{title}</h3>
        {intro && <p className="text-body-base text-ink-muted">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

/** The one thing to remember from a chapter. */
function KeyPoint({ children }: { children: ReactNode }) {
  return (
    <aside className="flex gap-3 rounded-card border border-action bg-action-soft p-4">
      <Sparkles size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-action-text" />
      <p className="text-body-base text-ink">{children}</p>
    </aside>
  );
}

function Tips({ items }: { items: readonly { title: string; body: ReactNode }[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((t, i) => (
        <li key={t.title} className="flex gap-3 rounded-card border border-hairline bg-surface p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-action-soft font-numeral text-label text-action-text">
            {i + 1}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-section text-ink">{t.title}</span>
            <span className="text-body-s text-ink-muted">{t.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// ── Chapters ─────────────────────────────────────────────────────────────────

function ExamChapter() {
  return (
    <>
      <p className="text-body-l text-ink-muted">
        The speaking exam is a one-to-one conversation with an examiner, recorded and marked later. After
        preparation it lasts about 10 minutes, in three parts. Tap each part to see what happens.
      </p>
      <PartsTimeline />
      <Block
        title="Where the topics come from"
        intro="The syllabus groups topics into five areas. Conversation 1 comes from Area A or B, conversation 2 from C, D or E. You find out the exact topic only when the examiner introduces it."
      >
        <TopicAreaList />
      </Block>
      <KeyPoint>
        You can’t learn the topics in advance, but you can learn the shape: one role play, then two conversations of
        five questions each. Practise the shape and the topics take care of themselves.
      </KeyPoint>
    </>
  );
}

function MarksChapter() {
  return (
    <>
      <p className="text-body-l text-ink-muted">
        Your mark is out of <span className="font-numeral">{TOTAL_MARKS}</span>, made of three parts. Tap each to see
        what it rewards.
      </p>
      <MarksBar />
      <Block
        title="Explore the bands"
        intro="Communication and Quality of Language are each marked with five bands. Slide the mark to read the official description an examiner checks you against."
      >
        <BandExplorer />
      </Block>
      <Block title="What level is expected?">
        <p className="text-body-base text-ink-muted">
          Cambridge tells examiners the exam certifies French at level A2 with elements of B1 on the Common European
          Framework (CEFR). In plain words: confident everyday French, with some longer sentences, opinions and reasons. Marking is
          positive: the examiner looks for what you can do, not for every mistake.
        </p>
      </Block>
      <Block title="And your grade?">
        <p className="text-body-base text-ink-muted">
          Cambridge sets grade boundaries for each exam series and combines this paper with your other papers, so
          there’s no fixed “marks to grade” table for speaking alone. FrenchCoach shows your mark out of{' '}
          <span className="font-numeral">{TOTAL_MARKS}</span> and the band for each part. It is our estimate of how an
          examiner would mark you, not an official mark, so use it to see which part to work on next.
        </p>
      </Block>
      <KeyPoint>
        <span className="font-numeral">{COMMUNICATION.maxMarks + QUALITY_OF_LANGUAGE.maxMarks}</span> of the <span className="font-numeral">{TOTAL_MARKS}</span> marks come
        from the two conversations. The role play matters, but the conversations are where most marks are won.
      </KeyPoint>
    </>
  );
}

function RolePlayChapter() {
  return (
    <>
      <p className="text-body-l text-ink-muted">
        <span className="font-numeral">{ROLE_PLAY.tasks}</span> questions, up to{' '}
        <span className="font-numeral">{ROLE_PLAY.marksPerResponse}</span> marks each, every answer marked on its own.
        The examiner plays a character from your card: a hotel receptionist, a friend, a shop assistant.
      </p>
      <KeyPoint>{PRINCIPLE_RP_CONCISE}</KeyPoint>
      <Block title="Mark it like an examiner" intro="Four answers to four role-play questions. Decide the mark, then see why.">
        <RolePlayMarker />
      </Block>
      <Block title="How to get 2 every time">
        <Tips
          items={[
            { title: 'Answer exactly what was asked', body: 'Listen for the question word: quand, où, pourquoi, combien, qu’est-ce que. Give that information first.' },
            { title: 'Match the time frame', body: 'Asked in the past (« Qu’est-ce que vous avez fait… ? »), answer in the past. A wrong tense can make the meaning unclear and cost a mark.' },
            { title: 'Answer both parts', body: 'Some questions come in two parts. The examiner waits for your first answer, then asks the second. Each part needs its own answer.' },
            { title: 'Use your 10 minutes', body: 'Read the card and guess what the character will ask: dates, prices, opinions, plans. Rehearse an answer to each in your head.' },
            { title: 'Didn’t catch it? Ask', body: '« Pouvez-vous répéter, s’il vous plaît ? » The question is repeated once, word for word.' },
          ]}
        />
      </Block>
    </>
  );
}

function ConversationsChapter() {
  return (
    <>
      <p className="text-body-l text-ink-muted">
        Each conversation has five questions on one topic, about 4 minutes. Here the examiner rewards how much you
        develop your answers, and the range and accuracy of your French.
      </p>
      <Block title="Build a better answer" intro="Start with a simple answer and level it up one step at a time. Watch what each step adds.">
        <AnswerLadder />
      </Block>
      <Block title="When you get stuck" intro="Here is what the examiner does if you can’t answer, and what it means for your mark.">
        <ol className="flex flex-col gap-2">
          {HELP_LADDER.map((h, i) => (
            <li key={h.step} className="flex gap-3 rounded-card border border-hairline bg-surface p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-hairline-strong font-numeral text-label text-ink-muted">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-section text-ink">{h.step}</span>
                <span className="text-body-s text-ink">{h.detail}</span>
                <span className="text-body-s text-ink-muted">{h.band}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-body-s text-ink-muted">
          If an answer is very short, the examiner may ask you to say a little more. Take the hint: it’s a second chance
          to develop your idea.
        </p>
      </Block>
      <Block title="Phrases worth knowing">
        <PhraseList />
      </Block>
      <KeyPoint>
        Answer, explain, add a time frame. « Je joue au foot » is an answer; « …parce que ça me détend, et le week-end
        dernier nous avons gagné » is a top-band answer.
      </KeyPoint>
    </>
  );
}

function AppChapter() {
  const navigate = useNavigate();
  return (
    <>
      <p className="text-body-l text-ink-muted">
        FrenchCoach runs the same exam with Henri as your examiner. Pick the mode that fits what you need today.
      </p>
      <Block title="Exam Sim or Coached Practice?">
        <div className="overflow-hidden rounded-card border border-hairline">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-hairline text-body-s">
            <span className="bg-surface p-3 text-caption text-ink-subtle" />
            <span className="bg-surface p-3 text-label text-ink">Exam Sim</span>
            <span className="bg-surface p-3 text-label text-ink">Coached</span>
            {MODE_ROWS.map((r) => (
              <ModeRow key={r.label} {...r} />
            ))}
          </div>
        </div>
        <p className="text-body-s text-ink-muted">
          Use <strong className="font-semibold text-ink">Coached</strong> to learn, with feedback after every answer.
          Use <strong className="font-semibold text-ink">Exam Sim</strong> to find out where you really are. An Exam Sim
          only counts if it runs like the real thing, so these turn it into practice:
        </p>
        <ul className="flex flex-col gap-1.5">
          {PRACTICE_ONLY_REASONS.map((r) => (
            <li key={r} className="flex gap-2 text-body-s text-ink-muted">
              <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-pill bg-ink-subtle" />
              {r}
            </li>
          ))}
        </ul>
      </Block>
      <Block title="A week that works" intro="Small and often beats one long cram. A plan you can actually keep:">
        <ol className="flex flex-col gap-2">
          <PlanStep
            icon={<BookOpen size={18} />}
            when="Every day"
            title="Learn"
            body={`Answer up to ${LEARN_ANSWERS_PER_DAY} questions a day with AI feedback on each, and fix one thing at a time.`}
            action="Open Learn"
            onAction={() => navigate('/learn')}
          />
          <PlanStep
            icon={<MessagesSquare size={18} />}
            when="Two or three times a week"
            title="Role-play drill"
            body="One card, five exchanges, coaching on each answer. It doesn’t use your weekly exam."
            action="Open the drill"
            onAction={() => navigate('/exam/role-play')}
          />
          <PlanStep
            icon={<Mic size={18} />}
            when={`Once every ${EXAM_WINDOW_DAYS} days`}
            title="A full exam"
            body="You get one full exam a week. Coached when you’re learning the format, Exam Sim when you want a real reading. Then read the report and pick one thing to fix."
            action="Choose an exam"
            onAction={() => navigate('/exam')}
          />
        </ol>
      </Block>
      <Block title="On the day you practise">
        <Tips
          items={[
            { title: 'A quiet room and a good mic', body: 'Your answers are transcribed before they are marked. If some can only be read from the live captions, the report tells you.' },
            { title: 'Turn the sound on', body: 'Henri reads every question aloud, like the real examiner. If your device has no French voice, the questions are shown as text.' },
            { title: 'Keep going', body: 'In Exam Sim there’s no pausing, just like the real test. If you lose your way, say what you can and carry on.' },
          ]}
        />
      </Block>
    </>
  );
}

function ModeRow({ label, sim, coached }: { label: string; sim: string; coached: string }) {
  return (
    <>
      <span className="bg-surface p-3 text-label text-ink-muted">{label}</span>
      <span className="bg-surface p-3 text-ink">{sim}</span>
      <span className="bg-surface p-3 text-ink">{coached}</span>
    </>
  );
}

function PlanStep({
  icon,
  when,
  title,
  body,
  action,
  onAction,
}: {
  icon: ReactNode;
  when: string;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-eyebrow uppercase text-ink-subtle">{when}</span>
        <span className="text-section text-ink">{title}</span>
        <span className="text-body-s text-ink-muted">{body}</span>
      </span>
      <Button variant="secondary" size="sm" onClick={onAction} className="shrink-0 self-start sm:self-center">
        {action}
      </Button>
    </li>
  );
}

function CheckChapter() {
  return (
    <>
      <p className="text-body-l text-ink-muted">Six quick questions. Each one is explained as soon as you answer.</p>
      <GuideQuiz onFinish={(correct, total) => track({ name: 'exam_guide_quiz_done', props: { correct, total } })} />
    </>
  );
}
