import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import {
  ANSWER_FIT,
  EXAM_PARTS,
  MODE_GOALS,
  ORDER_SCRAMBLE,
  SORT_ITEMS,
  STUCK_STEPS,
  TIME_FRAME_ITEMS,
  TIME_FRAME_LABEL,
  type MarkArea,
  type TimeFrame,
} from '../../features/examGuide/guideContent';

/**
 * The guide's short practice exercises, one per chapter idea: tap-to-order,
 * sort, pick-the-answer, spot-the-tense, a stuck-question walk-through and a
 * mode picker. Component state only — nothing is stored or sent.
 */

const optionBase =
  'flex min-h-11 items-center gap-2 rounded-control border px-3 py-2 text-left text-body-s transition-colors duration-state ease-smooth disabled:cursor-default';
const optionIdle = 'border-hairline bg-surface text-ink enabled:hover:border-hairline-strong';

function Panel({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-card surface-recessed border border-hairline p-4" data-testid={testId}>
      {children}
    </div>
  );
}

function Counter({ n, of, label }: { n: number; of: number; label: string }) {
  return (
    <span className="text-eyebrow uppercase text-ink-subtle">
      {label} <span className="font-numeral">{n}</span> of <span className="font-numeral">{of}</span>
    </span>
  );
}

function Verdict({ right, title, children }: { right: boolean; title: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col gap-1 rounded-control border p-3 ${right ? 'fb-good' : 'fb-bad'}`}
      aria-live="polite"
    >
      <p className="fb-heading text-label text-ink">{title}</p>
      <div className="text-body-s text-ink">{children}</div>
    </motion.div>
  );
}

function Done({ score, of, note, onAgain, testId }: { score: number; of: number; note: string; onAgain: () => void; testId: string }) {
  return (
    <Panel testId={testId}>
      <p className="text-section text-ink">
        <span className="font-numeral">{score}</span> of <span className="font-numeral">{of}</span> right.
      </p>
      <p className="text-body-s text-ink-muted">{note}</p>
      <div>
        <Button variant="secondary" size="sm" onClick={onAgain}>
          <RotateCcw size={14} aria-hidden="true" /> Try again
        </Button>
      </div>
    </Panel>
  );
}

// ── Chapter 1: put the exam in order ─────────────────────────────────────────

export function OrderTheExam() {
  const [placed, setPlaced] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const done = placed.length === EXAM_PARTS.length;
  const partById = (id: string) => EXAM_PARTS.find((p) => p.id === id)!;

  const tap = (id: string) => {
    if (placed.includes(id)) return;
    const expected = EXAM_PARTS[placed.length].id;
    if (id === expected) {
      setPlaced((p) => [...p, id]);
      setMiss(null);
    } else {
      setMiss(id);
      setMistakes((m) => m + 1);
    }
  };

  return (
    <Panel testId="guide-order">
      <p className="text-label text-ink">Tap the parts in the order they happen.</p>
      <ol className="flex flex-col gap-1.5" aria-label="Your order">
        {EXAM_PARTS.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-hairline-strong font-numeral text-caption text-ink-muted">
              {i + 1}
            </span>
            <span className={`text-body-s ${placed[i] ? 'text-ink' : 'text-ink-subtle'}`}>
              {placed[i] ? `${partById(placed[i]).label} · ${partById(placed[i]).length}` : '…'}
            </span>
          </li>
        ))}
      </ol>
      {!done && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Parts to place">
          {ORDER_SCRAMBLE.filter((id) => !placed.includes(id)).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => tap(id)}
              data-testid={`guide-order-${id}`}
              className={`rounded-pill border px-3 py-2 text-label transition-colors duration-state ease-smooth
                ${miss === id ? 'fb-bad text-ink' : 'border-hairline bg-surface text-ink hover:border-hairline-strong'}`}
            >
              {partById(id).label}
            </button>
          ))}
        </div>
      )}
      {miss && !done && (
        <p className="text-body-s text-ink-muted" aria-live="polite">
          Not yet: something else comes before “{partById(miss).label}”.
        </p>
      )}
      {done && (
        <Verdict right title={mistakes === 0 ? 'Perfect, first time.' : 'That’s the order.'}>
          Preparation and the greeting aren’t marked. Everything you say from the role play onwards counts.
          <div className="mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPlaced([]);
                setMistakes(0);
                setMiss(null);
              }}
            >
              <RotateCcw size={14} aria-hidden="true" /> Again
            </Button>
          </div>
        </Verdict>
      )}
    </Panel>
  );
}

// ── Chapter 2: which mark is it? ─────────────────────────────────────────────

const AREA_LABEL: Record<MarkArea, string> = { communication: 'Communication', qualityOfLanguage: 'Quality of Language' };

export function SortTheMarks() {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<(MarkArea | null)[]>(() => SORT_ITEMS.map(() => null));
  const reset = () => {
    setIndex(0);
    setPicks(SORT_ITEMS.map(() => null));
  };

  if (index >= SORT_ITEMS.length) {
    const score = picks.filter((p, i) => p === SORT_ITEMS[i].area).length;
    return (
      <Done
        testId="guide-sort-done"
        score={score}
        of={SORT_ITEMS.length}
        note="Rule of thumb: Communication is what you say and how you handle the questions; Quality of Language is how well your French is put together and sounds."
        onAgain={reset}
      />
    );
  }

  const item = SORT_ITEMS[index];
  const pick = picks[index];
  return (
    <Panel testId="guide-sort">
      <Counter label="Statement" n={index + 1} of={SORT_ITEMS.length} />
      <p className="text-subtitle text-ink">“{item.text}”</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Which mark rewards this?">
        {(Object.keys(AREA_LABEL) as MarkArea[]).map((area) => {
          const isAnswer = pick !== null && area === item.area;
          const wrong = pick === area && area !== item.area;
          return (
            <button
              key={area}
              type="button"
              disabled={pick !== null}
              onClick={() => setPicks((p) => p.map((v, i) => (i === index ? area : v)))}
              data-testid={`guide-sort-${area}`}
              className={`${optionBase} justify-center text-center font-semibold ${isAnswer ? 'fb-good border' : wrong ? 'fb-bad border' : optionIdle}`}
            >
              {isAnswer && <Check size={16} aria-hidden="true" />}
              {AREA_LABEL[area]}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <Verdict right={pick === item.area} title={pick === item.area ? 'Right.' : `It’s ${AREA_LABEL[item.area]}.`}>
          {item.why}
          <div className="mt-2">
            <Button size="sm" onClick={() => setIndex((i) => i + 1)} data-testid="guide-sort-next">
              {index + 1 < SORT_ITEMS.length ? 'Next' : 'See how you did'}
            </Button>
          </div>
        </Verdict>
      )}
    </Panel>
  );
}

// ── Chapter 3: which reply answers the question? ─────────────────────────────

export function AnswerTheQuestion() {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => ANSWER_FIT.map(() => null));
  const reset = () => {
    setIndex(0);
    setPicks(ANSWER_FIT.map(() => null));
  };

  if (index >= ANSWER_FIT.length) {
    const score = picks.filter((p, i) => p === ANSWER_FIT[i].answer).length;
    return (
      <Done
        testId="guide-fit-done"
        score={score}
        of={ANSWER_FIT.length}
        note="In the exam, catch the question word and the tense first. They tell you exactly what a full answer needs."
        onAgain={reset}
      />
    );
  }

  const item = ANSWER_FIT[index];
  const pick = picks[index];
  return (
    <Panel testId="guide-fit">
      <Counter label="Question" n={index + 1} of={ANSWER_FIT.length} />
      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink-subtle">Examiner</span>
        <p lang="fr" className="exam-serif text-body-l text-ink">{item.prompt}</p>
        <p className="text-caption text-ink-subtle">{item.promptEn}</p>
      </div>
      <div className="flex flex-col gap-2" role="group" aria-label="Which reply answers it?">
        {item.options.map((opt, oi) => {
          const isAnswer = pick !== null && oi === item.answer;
          const wrong = pick === oi && oi !== item.answer;
          return (
            <button
              key={opt}
              type="button"
              lang="fr"
              disabled={pick !== null}
              onClick={() => setPicks((p) => p.map((v, i) => (i === index ? oi : v)))}
              data-testid={`guide-fit-${item.id}-${oi}`}
              className={`${optionBase} exam-serif ${isAnswer ? 'fb-good border' : wrong ? 'fb-bad border' : optionIdle}`}
            >
              {isAnswer && <Check size={16} aria-hidden="true" className="shrink-0" />}
              « {opt} »
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <Verdict right={pick === item.answer} title={pick === item.answer ? 'Right.' : 'Not that one.'}>
          {item.why}
          <div className="mt-2">
            <Button size="sm" onClick={() => setIndex((i) => i + 1)} data-testid="guide-fit-next">
              {index + 1 < ANSWER_FIT.length ? 'Next question' : 'See how you did'}
            </Button>
          </div>
        </Verdict>
      )}
    </Panel>
  );
}

// ── Chapter 4: spot the time frame ───────────────────────────────────────────

export function SpotTheTimeFrame() {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<(TimeFrame | null)[]>(() => TIME_FRAME_ITEMS.map(() => null));
  const reset = () => {
    setIndex(0);
    setPicks(TIME_FRAME_ITEMS.map(() => null));
  };

  if (index >= TIME_FRAME_ITEMS.length) {
    const score = picks.filter((p, i) => p === TIME_FRAME_ITEMS[i].frame).length;
    return (
      <Done
        testId="guide-tense-done"
        score={score}
        of={TIME_FRAME_ITEMS.length}
        note="Aim to use at least three of these time frames across each conversation. That range is what Quality of Language rewards."
        onAgain={reset}
      />
    );
  }

  const item = TIME_FRAME_ITEMS[index];
  const pick = picks[index];
  return (
    <Panel testId="guide-tense">
      <Counter label="Sentence" n={index + 1} of={TIME_FRAME_ITEMS.length} />
      <div className="flex flex-col gap-1">
        <p lang="fr" className="exam-serif text-body-l text-ink">« {item.fr} »</p>
        {pick !== null && <p className="text-caption text-ink-subtle">{item.en}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Which time frame?">
        {(Object.keys(TIME_FRAME_LABEL) as TimeFrame[]).map((frame) => {
          const isAnswer = pick !== null && frame === item.frame;
          const wrong = pick === frame && frame !== item.frame;
          return (
            <button
              key={frame}
              type="button"
              disabled={pick !== null}
              onClick={() => setPicks((p) => p.map((v, i) => (i === index ? frame : v)))}
              data-testid={`guide-tense-${frame}`}
              className={`${optionBase} justify-center text-center font-semibold ${isAnswer ? 'fb-good border' : wrong ? 'fb-bad border' : optionIdle}`}
            >
              {isAnswer && <Check size={16} aria-hidden="true" />}
              {TIME_FRAME_LABEL[frame]}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <Verdict right={pick === item.frame} title={pick === item.frame ? 'Right.' : `It’s ${TIME_FRAME_LABEL[item.frame].toLowerCase()}.`}>
          {item.clue}
          <div className="mt-2">
            <Button size="sm" onClick={() => setIndex((i) => i + 1)} data-testid="guide-tense-next">
              {index + 1 < TIME_FRAME_ITEMS.length ? 'Next sentence' : 'See how you did'}
            </Button>
          </div>
        </Verdict>
      )}
    </Panel>
  );
}

// ── Chapter 4: when you get stuck, step by step ──────────────────────────────

type StuckWhen = 'early' | 'later';

export function StuckWalkthrough() {
  const [when, setWhen] = useState<StuckWhen>('later');
  const [shown, setShown] = useState(1);
  const steps = STUCK_STEPS[when];
  const finished = shown >= steps.length;
  return (
    <Panel testId="guide-stuck">
      <Segmented<StuckWhen>
        label="Which question"
        value={when}
        onChange={(w) => {
          setWhen(w);
          setShown(1);
        }}
        options={[
          { id: 'early', label: 'Questions 1–2' },
          { id: 'later', label: 'Questions 3–5' },
        ]}
      />
      <ol className="flex flex-col gap-2">
        {steps.slice(0, shown).map((s, i) => (
          <motion.li key={`${when}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-hairline-strong font-numeral text-caption text-ink-muted">
              {i + 1}
            </span>
            <span className="text-body-s text-ink">{s}</span>
          </motion.li>
        ))}
      </ol>
      {finished ? (
        <p className="text-body-s text-ink-muted">
          That question earns you nothing, so always say something. A short, simple answer beats silence every time.
        </p>
      ) : (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setShown((n) => n + 1)} data-testid="guide-stuck-next">
            Still stuck?
          </Button>
        </div>
      )}
    </Panel>
  );
}

// ── Chapter 5: which mode today? ─────────────────────────────────────────────

export function ModePicker() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState<string | null>(null);
  const pick = MODE_GOALS.find((g) => g.id === goal);
  return (
    <Panel testId="guide-mode-picker">
      <p className="text-label text-ink">What do you want to do today?</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Your goal today">
        {MODE_GOALS.map((g) => {
          const on = g.id === goal;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setGoal(g.id)}
              aria-pressed={on}
              data-testid={`guide-goal-${g.id}`}
              className={`${optionBase} ${on ? 'border-action bg-action-soft text-ink' : optionIdle}`}
            >
              {g.goal}
            </button>
          );
        })}
      </div>
      {pick && (
        <motion.div key={pick.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 border-t border-hairline pt-3" aria-live="polite">
          <p className="text-section text-ink" data-testid="guide-mode-pick">Go for: {pick.pick}</p>
          <p className="text-body-s text-ink-muted">{pick.why}</p>
          <div>
            <Button size="sm" variant="secondary" onClick={() => navigate(pick.path)}>
              {pick.action}
            </Button>
          </div>
        </motion.div>
      )}
    </Panel>
  );
}
