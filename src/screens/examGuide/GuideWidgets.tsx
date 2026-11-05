import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { fill } from '../../components/motion/variants';
import {
  ANSWER_LADDER,
  COMMUNICATION,
  CRITERIA,
  EXAM_PARTS,
  LADDER_QUESTION,
  LADDER_QUESTION_EN,
  PHRASES,
  POSITION_COPY,
  QUALITY_OF_LANGUAGE,
  QUIZ,
  ROLE_PLAY,
  ROLE_PLAY_EXAMPLES,
  TOPIC_AREAS,
  TOTAL_MARKS,
  bandFor,
  positionInBand,
  type CriterionId,
} from '../../features/examGuide/guideContent';
import {
  getExaminerVoiceGeneration,
  hasFrenchVoice,
  isExaminerVoiceMuted,
  speakExaminerText,
  stopExaminerVoice,
} from '../../services/exam/examinerVoice';

// ── Chapter 1 ────────────────────────────────────────────────────────────────

/** The test as a timeline, each part proportional to its length; tap one to read about it. */
export function PartsTimeline() {
  const [selected, setSelected] = useState(EXAM_PARTS[0].id);
  const part = EXAM_PARTS.find((p) => p.id === selected) ?? EXAM_PARTS[0];
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Parts of the speaking test" className="flex flex-col gap-1 md:flex-row">
        {EXAM_PARTS.map((p) => {
          const on = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              aria-pressed={on}
              data-testid={`guide-part-${p.id}`}
              className={`flex min-w-[44px] flex-row items-baseline gap-x-3 gap-y-1 rounded-control border px-3 py-2.5 text-left md:flex-col md:items-start md:px-2
                transition-colors duration-state ease-smooth
                ${on ? 'border-action bg-action-soft' : 'border-hairline bg-surface hover:border-hairline-strong'}`}
              style={{ flexGrow: Math.max(p.minutes, 2.5), flexBasis: 0 }}
            >
              <span className="flex-1 text-label text-ink md:order-2 md:flex-none">{p.label}</span>
              <span className="text-caption text-ink-muted md:order-3">{p.length}</span>
              <span className={`text-caption md:order-1 ${p.marked ? 'font-semibold text-action-text' : 'text-ink-subtle'}`}>
                {p.marked ? 'Marked' : 'Not marked'}
              </span>
            </button>
          );
        })}
      </div>
      <motion.div key={part.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 rounded-card surface-recessed border border-hairline p-4">
        <p className="text-section text-ink">
          {part.label} <span className="font-normal text-ink-muted">· {part.length}</span>
        </p>
        <p className="text-body-base text-ink">{part.summary}</p>
        <ul className="flex flex-col gap-1.5">
          {part.points.map((pt) => (
            <li key={pt} className="flex gap-2 text-body-s text-ink-muted">
              <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-pill bg-ink-subtle" />
              {pt}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

/** The five syllabus topic areas and their sub-topics, one open at a time. */
export function TopicAreaList() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-2">
      {TOPIC_AREAS.map((a) => {
        const isOpen = open === a.area;
        return (
          <li key={a.area} className="rounded-card border border-hairline bg-surface">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : a.area)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-action-soft font-numeral text-label text-action-text">
                {a.area}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-label text-ink">{a.name}</span>
                <span className="text-caption text-ink-subtle">Conversation {a.conversation}</span>
              </span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={`shrink-0 text-ink-subtle transition-transform duration-slide ease-slide ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <ul className="flex flex-wrap gap-2 border-t border-hairline p-3">
                {a.subTopics.map((s) => (
                  <li key={s} className="rounded-pill border border-hairline px-3 py-1 text-caption text-ink-muted">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Chapter 2 ────────────────────────────────────────────────────────────────

/** The 40 marks as one bar; tap a part to see what it rewards. */
export function MarksBar() {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<CriterionId>('rolePlay');
  const criterion = CRITERIA.find((c) => c.id === selected) ?? CRITERIA[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="font-numeral text-num-l text-ink">{TOTAL_MARKS}</span>
        <span className="text-body-s text-ink-muted">marks in total</span>
      </div>
      <div role="group" aria-label="The three marks" className="flex gap-1">
        {CRITERIA.map((c, i) => {
          const on = c.id === selected;
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              aria-pressed={on}
              data-testid={`guide-criterion-${c.id}`}
              initial={reduced ? false : { opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={fill(0.1 * i)}
              style={{ flexGrow: c.max, flexBasis: 0, transformOrigin: 'left' }}
              className={`flex min-w-0 flex-col items-start gap-0.5 rounded-control border p-3 text-left transition-colors duration-state ease-smooth
                ${on ? 'border-action bg-action text-action-ink' : 'border-hairline bg-surface hover:border-hairline-strong'}`}
            >
              <span className={`font-numeral text-subtitle ${on ? 'text-action-ink' : 'text-ink'}`}>{c.max}</span>
              <span className={`text-caption ${on ? 'text-action-ink' : 'text-ink-muted'}`}>{c.name}</span>
            </motion.button>
          );
        })}
      </div>
      <motion.div key={criterion.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 rounded-card surface-recessed border border-hairline p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-section text-ink">
            {criterion.name} <span className="font-numeral font-normal text-ink-muted">/ {criterion.max}</span>
          </p>
          <span className="text-caption text-ink-subtle">{criterion.covers}</span>
        </div>
        <p className="text-body-base text-ink">{criterion.plain}</p>
        {criterion.id === 'rolePlay' && (
          <ul className="flex flex-col gap-2">
            {ROLE_PLAY.marks.map((m) => (
              <li key={m.mark} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-hairline-strong font-numeral text-label text-ink">
                  {m.mark}
                </span>
                <span className="text-body-s text-ink-muted">{m.descriptor.join(' ')}</span>
              </li>
            ))}
          </ul>
        )}
        {criterion.id !== 'rolePlay' && (
          <p className="text-body-s text-ink-muted">Explore its bands with the slider below.</p>
        )}
      </motion.div>
    </div>
  );
}

type BandCriterion = 'communication' | 'qualityOfLanguage';

/** Drag a mark from 0 to 15 and read the official band description it falls in. */
export function BandExplorer() {
  const [which, setWhich] = useState<BandCriterion>('communication');
  const [mark, setMark] = useState(11);
  const criterion = which === 'communication' ? COMMUNICATION : QUALITY_OF_LANGUAGE;
  const band = bandFor(criterion.bands, mark);
  const position = positionInBand(band, mark);
  return (
    <div className="flex flex-col gap-4">
      <Segmented<BandCriterion>
        label="Which mark"
        value={which}
        onChange={setWhich}
        options={[
          { id: 'communication', label: 'Communication' },
          { id: 'qualityOfLanguage', label: 'Quality of Language' },
        ]}
      />
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="guide-band-mark" className="text-label text-ink">Mark</label>
          <span className="text-body-s text-ink-muted">
            <span className="font-numeral text-num-m text-ink" data-testid="guide-band-mark">{mark}</span> / {criterion.maxMarks}
          </span>
        </div>
        <input
          id="guide-band-mark"
          type="range"
          min={0}
          max={criterion.maxMarks}
          step={1}
          value={mark}
          onChange={(e) => setMark(Number(e.target.value))}
          className="w-full accent-[var(--action)]"
        />
        <div className="flex gap-1" aria-hidden="true">
          {[...criterion.bands].reverse().map((b) => (
            <span
              key={b.min}
              className={`h-1.5 rounded-pill ${b === band ? 'bg-action' : 'bg-track'}`}
              style={{ flexGrow: b.max - b.min + 1, flexBasis: 0 }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-card surface-recessed border border-hairline p-4" aria-live="polite">
        <p className="text-section text-ink" data-testid="guide-band-label">
          {band.label ?? 'No creditable response'}{' '}
          <span className="font-numeral font-normal text-ink-muted">
            {band.min === band.max ? `(${band.min})` : `(${band.min}–${band.max})`}
          </span>
        </p>
        <ul className="flex flex-col gap-1.5">
          {band.descriptor.map((d) => (
            <li key={d} className="flex gap-2 text-body-s text-ink">
              <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-pill bg-ink-subtle" />
              {d}
            </li>
          ))}
        </ul>
        {position && <p className="border-t border-hairline pt-2 text-caption text-ink-muted">{POSITION_COPY[position]}</p>}
      </div>
    </div>
  );
}

// ── Chapter 3 ────────────────────────────────────────────────────────────────

/** Four example role-play answers: guess the mark, then see the examiner's reasoning. */
export function RolePlayMarker() {
  const [index, setIndex] = useState(0);
  const [guesses, setGuesses] = useState<(number | null)[]>(() => ROLE_PLAY_EXAMPLES.map(() => null));
  const done = index >= ROLE_PLAY_EXAMPLES.length;
  const matched = guesses.filter((g, i) => g === ROLE_PLAY_EXAMPLES[i].mark).length;

  if (done) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card surface-recessed border border-hairline p-4" data-testid="guide-rp-done">
        <p className="text-section text-ink">
          You matched the mark on <span className="font-numeral">{matched}</span> of{' '}
          <span className="font-numeral">{ROLE_PLAY_EXAMPLES.length}</span>.
        </p>
        <p className="text-body-s text-ink-muted">
          The pattern: answer exactly what was asked, in the right time frame, and stop. Accuracy matters only as far as it keeps the meaning clear.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setGuesses(ROLE_PLAY_EXAMPLES.map(() => null));
            setIndex(0);
          }}
        >
          <RotateCcw size={14} aria-hidden="true" /> Try again
        </Button>
      </div>
    );
  }

  const ex = ROLE_PLAY_EXAMPLES[index];
  const guess = guesses[index];
  const revealed = guess !== null;
  const right = guess === ex.mark;

  return (
    <div className="flex flex-col gap-4 rounded-card surface-recessed border border-hairline p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-eyebrow uppercase text-ink-subtle">
          Answer <span className="font-numeral">{index + 1}</span> of <span className="font-numeral">{ROLE_PLAY_EXAMPLES.length}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink-subtle">Examiner</span>
        <p lang="fr" className="exam-serif text-body-l text-ink">{ex.question}</p>
        <p className="text-caption text-ink-subtle">{ex.questionEn}</p>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink-subtle">Candidate</span>
        <p lang="fr" className="exam-serif text-body-l text-ink">« {ex.answer} »</p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-label text-ink">How many marks would you give?</span>
        <div className="flex gap-2" role="group" aria-label="Your mark">
          {[0, 1, 2].map((m) => {
            const chosen = guess === m;
            const isAnswer = revealed && m === ex.mark;
            return (
              <button
                key={m}
                type="button"
                disabled={revealed}
                onClick={() => setGuesses((g) => g.map((v, i) => (i === index ? m : v)))}
                aria-pressed={chosen}
                data-testid={`guide-rp-mark-${m}`}
                className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-control border font-numeral text-subtitle transition-colors duration-state ease-smooth
                  ${isAnswer ? 'border-action bg-action text-action-ink' : chosen ? 'border-hairline-strong bg-track text-ink' : 'border-hairline bg-surface text-ink hover:border-hairline-strong'}
                  disabled:cursor-default`}
              >
                {isAnswer && <Check size={16} aria-hidden="true" />}
                {m}
              </button>
            );
          })}
        </div>
      </div>
      {revealed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex flex-col gap-2 rounded-control border p-3 ${right ? 'fb-good' : 'fb-bad'}`} aria-live="polite">
          <p className="fb-heading text-label text-ink">
            {right ? 'Same as the examiner.' : `The examiner would give ${ex.mark}.`}
          </p>
          <p className="text-body-s text-ink">{ex.why}</p>
          <div>
            <Button size="sm" onClick={() => setIndex((i) => i + 1)} data-testid="guide-rp-next">
              {index + 1 < ROLE_PLAY_EXAMPLES.length ? 'Next answer' : 'See how you did'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Chapter 4 ────────────────────────────────────────────────────────────────

/** One answer, grown a step at a time, with what each step adds to the marks. */
export function AnswerLadder() {
  const [step, setStep] = useState(0);
  const shown = ANSWER_LADDER.slice(0, step + 1);
  const current = ANSWER_LADDER[step];
  const next = ANSWER_LADDER[step + 1];
  const words = shown.map((s) => s.text).join(' ').split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 rounded-card surface-recessed border border-hairline p-4">
      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink-subtle">Examiner</span>
        <p lang="fr" className="exam-serif text-body-l text-ink">{LADDER_QUESTION}</p>
        <p className="text-caption text-ink-subtle">{LADDER_QUESTION_EN}</p>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink-subtle">Your answer</span>
        <p lang="fr" className="exam-serif text-body-l text-ink" data-testid="guide-ladder-answer">
          {shown.map((s, i) => (
            <span key={s.text}>
              {i > 0 && ' '}
              <span className={i === step && step > 0 ? 'rounded bg-action-soft px-0.5' : ''}>{s.text}</span>
            </span>
          ))}
        </p>
        <p className="text-caption text-ink-subtle">
          <span className="font-numeral">{words}</span> words · {current.tenses}
        </p>
      </div>
      <motion.p key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-hairline pt-3 text-body-s text-ink" aria-live="polite">
        {current.why}
      </motion.p>
      <div className="flex flex-wrap items-center gap-2">
        {next ? (
          <Button size="sm" onClick={() => setStep((s) => s + 1)} data-testid="guide-ladder-next">
            {next.adds}
          </Button>
        ) : (
          <p className="text-body-s text-ink-muted">
            That’s a top-band answer. You won’t need every step every time: a few developed sentences, said naturally, beat a memorised speech.
          </p>
        )}
        {step > 0 && (
          <Button variant="quiet" size="sm" onClick={() => setStep(0)}>
            <RotateCcw size={14} aria-hidden="true" /> Start over
          </Button>
        )}
      </div>
    </div>
  );
}

/** Useful phrases, with a listen button when a French voice is available. */
export function PhraseList() {
  const [canListen, setCanListen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setCanListen(hasFrenchVoice() && !isExaminerVoiceMuted());
    return () => stopExaminerVoice();
  }, []);
  const listen = (text: string) => {
    stopExaminerVoice();
    void speakExaminerText(text, getExaminerVoiceGeneration());
  };
  const reveal = (fr: string) => setRevealed((r) => new Set(r).add(fr));
  return (
    <div className="flex flex-col gap-3">
      <Segmented<'learn' | 'test'>
        label="Phrase mode"
        value={testing ? 'test' : 'learn'}
        onChange={(m) => {
          setTesting(m === 'test');
          setRevealed(new Set());
        }}
        options={[
          { id: 'learn', label: 'Learn' },
          { id: 'test', label: 'Test yourself' },
        ]}
        testIdPrefix="guide-phrase-mode"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PHRASES.map((g) => (
          <section key={g.group} className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4">
            <h4 className="text-label text-ink">{g.group}</h4>
            <ul className="flex flex-col gap-2.5">
              {g.phrases.map((p) => {
                const hidden = testing && !revealed.has(p.fr);
                return (
                  <li key={p.fr} className="flex items-start gap-2">
                    <span className="flex min-w-0 flex-1 flex-col">
                      {testing && <span className="text-body-s text-ink">{p.en}</span>}
                      {hidden ? (
                        <button
                          type="button"
                          onClick={() => reveal(p.fr)}
                          data-testid="guide-phrase-reveal"
                          className="self-start text-left text-caption font-semibold text-action-text underline-offset-2 hover:underline"
                        >
                          Say it in French, then tap to check
                        </button>
                      ) : (
                        <span lang="fr" className={testing ? 'text-caption text-ink-muted' : 'text-body-s text-ink'}>{p.fr}</span>
                      )}
                      {!testing && <span className="text-caption text-ink-subtle">{p.en}</span>}
                    </span>
                    {canListen && !hidden && (
                      <button
                        type="button"
                        onClick={() => listen(p.fr)}
                        aria-label={`Listen: ${p.fr}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
                      >
                        <Volume2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

// ── Chapter 6 ────────────────────────────────────────────────────────────────

/** Six multiple-choice questions, each explained as soon as it's answered. */
export function GuideQuiz({ onFinish }: { onFinish: (correct: number, total: number) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null));
  const answeredCount = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === QUIZ[i].answer).length;
  const allDone = answeredCount === QUIZ.length;

  useEffect(() => {
    if (allDone) onFinish(correct, QUIZ.length);
    // Report once, when the last answer lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {QUIZ.map((q, qi) => {
          const chosen = answers[qi];
          const revealed = chosen !== null;
          return (
            <li key={q.id} className="flex flex-col gap-3 rounded-card surface-recessed border border-hairline p-4">
              <p className="text-section text-ink">
                <span className="font-numeral text-ink-subtle">{qi + 1}.</span> {q.question}
              </p>
              <div className="flex flex-col gap-2" role="group" aria-label={q.question}>
                {q.options.map((opt, oi) => {
                  const isAnswer = revealed && oi === q.answer;
                  const wrongPick = revealed && oi === chosen && oi !== q.answer;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={revealed}
                      onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                      data-testid={`guide-quiz-${q.id}-${oi}`}
                      className={`flex min-h-11 items-center gap-2 rounded-control border px-3 py-2 text-left text-body-s transition-colors duration-state ease-smooth disabled:cursor-default
                        ${isAnswer ? 'fb-good border text-ink' : wrongPick ? 'fb-bad border text-ink' : 'border-hairline bg-surface text-ink enabled:hover:border-hairline-strong'}`}
                    >
                      {isAnswer && <Check size={16} aria-hidden="true" className="shrink-0" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <p className="text-body-s text-ink-muted" aria-live="polite">
                  <span className="font-semibold text-ink">{chosen === q.answer ? 'Right. ' : 'Not quite. '}</span>
                  {q.explain}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {allDone && (
        <p className="text-section text-ink" data-testid="guide-quiz-result">
          <span className="font-numeral">{correct}</span> of <span className="font-numeral">{QUIZ.length}</span> right.{' '}
          <span className="font-normal text-ink-muted">
            {correct === QUIZ.length ? 'You know how the exam works. Time to practise it.' : 'Have another look at the chapters above for the ones you missed.'}
          </span>
        </p>
      )}
    </div>
  );
}
