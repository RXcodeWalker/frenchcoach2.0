import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Mic, RotateCcw, Sparkles, ArrowRight } from 'lucide-react';

// One Learn answer going through the real loop: speak → marked → coach
// feedback in the same three moves the app's coach view uses (what you did
// well → fix this first → say it better; src/features/feedback/coachPoints.ts).
// The wording is written for the demo; no score is shown because a Learn
// answer's value is the coaching, and the mock-exam mark lives in ExamSection.
// French spacing before '?', non-breaking so it never wraps alone.
const QUESTION_FR = 'Qu’est-ce que tu as fait pendant les vacances\u00a0?';
const QUESTION_EN = 'What did you do in the holidays?';
const ERROR = 'j’ai allé';
// Word by word for the typing effect, with the error kept as one token so it
// is marked as a single span once the feedback lands.
const TRANSCRIPT_WORDS = ['L’été', 'dernier,', ERROR, 'en', 'Espagne', 'avec', 'ma', 'famille.', 'C’était', 'génial', 'parce', 'qu’il', 'faisait', 'très', 'chaud.'];
const ERROR_INDEX = TRANSCRIPT_WORDS.indexOf(ERROR);

type Phase = 'recording' | 'marking' | 'feedback';

const WORD_MS = 120;
const PAUSE_MS = 700;
const MARKING_MS = 1500;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * The hero's live demo. Server/prerender output (no `window`) and
 * reduced-motion visitors get the finished card; everyone else watches it play
 * once when it scrolls into view, and can replay it. Every block is always
 * rendered and only toggled with `visibility`, so the card never changes size
 * and nothing below it jumps.
 */
export function LiveFeedbackDemo() {
  const [animated] = useState(() => typeof window !== 'undefined' && !prefersReducedMotion());
  const [phase, setPhase] = useState<Phase>(animated ? 'recording' : 'feedback');
  const [shown, setShown] = useState(animated ? 0 : TRANSCRIPT_WORDS.length);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const play = useCallback(() => {
    setPhase('recording');
    setShown(0);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!animated) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      play();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animated, play]);

  useEffect(() => {
    if (!playing) return;
    let t: number;
    if (phase === 'recording') {
      t = shown < TRANSCRIPT_WORDS.length
        ? window.setTimeout(() => setShown((n) => n + 1), WORD_MS)
        : window.setTimeout(() => setPhase('marking'), PAUSE_MS);
    } else if (phase === 'marking') {
      t = window.setTimeout(() => setPhase('feedback'), MARKING_MS);
    } else {
      setPlaying(false);
      return;
    }
    return () => window.clearTimeout(t);
  }, [playing, phase, shown]);

  const recording = phase === 'recording';
  const done = phase === 'feedback';
  const status = recording ? 'Listening…' : phase === 'marking' ? 'Marking your answer…' : 'Feedback ready';

  return (
    <figure ref={ref} className="mk-card rounded-3xl p-5 sm:p-6 m-0 relative" aria-label="Example: a spoken answer being marked">
      <div className="flex items-center justify-between gap-3 mb-5">
        <span className="mk-chip text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full">
          Learn · Holidays
        </span>
        <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--mk-ink-muted)' }} aria-live="polite">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full"
            style={{ background: recording ? 'var(--mk-bad)' : done ? 'var(--mk-good)' : 'var(--mk-accent)' }}
          />
          {status}
        </span>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--mk-ink-faint)' }}>
        Question
      </p>
      <p className="font-display text-lg sm:text-xl leading-snug" lang="fr">{QUESTION_FR}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--mk-ink-muted)' }}>{QUESTION_EN}</p>

      <div className="mt-5 rounded-2xl border mk-hairline p-4" style={{ background: 'var(--mk-surface)' }}>
        <div className="flex items-center gap-3 mb-3">
          <span
            aria-hidden="true"
            className={`mk-pulse ${recording && playing ? 'is-live' : ''} w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0`}
            style={{ background: recording ? 'var(--mk-accent-strong)' : 'var(--mk-accent-soft)', color: recording ? '#fff' : 'var(--mk-accent)' }}
          >
            <Mic size={16} />
          </span>
          <span aria-hidden="true" className={`mk-wave ${recording && playing ? 'is-live' : ''} flex items-center gap-[3px] h-6`}>
            {[10, 18, 24, 14, 20, 9, 16, 22, 12, 18, 8, 15].map((h, i) => (
              <span key={i} style={{ height: h, animationDelay: `${i * 70}ms`, opacity: recording ? 1 : 0.35 }} />
            ))}
          </span>
          <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--mk-ink-faint)' }} aria-hidden="true">
            0:{recording ? String(Math.min(9, Math.floor(shown / 2))).padStart(2, '0') : '09'}
          </span>
        </div>
        <p className="text-[15px] leading-relaxed" lang="fr">
          {TRANSCRIPT_WORDS.map((word, i) => {
            const isError = i === ERROR_INDEX;
            const visible = i < shown;
            const cls = `${visible ? '' : 'invisible'} ${isError && done ? 'mk-mark-bad' : ''}`;
            const last = recording && playing && i === shown - 1;
            return (
              <span key={i}>
                <span className={`${cls} ${last ? 'mk-caret' : ''}`}>{word}</span>
                {i < TRANSCRIPT_WORDS.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </p>
      </div>

      <div className="mt-4 relative">
        {/* Skeleton while listening/marking; same footprint as the feedback. */}
        {!done && (
          <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-3 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border mk-hairline p-3.5 flex gap-3">
                <span className={`w-7 h-7 rounded-lg shrink-0 ${phase === 'marking' ? 'mk-shimmer' : ''}`} style={{ background: 'var(--mk-hairline)' }} />
                <span className="flex-1 flex flex-col gap-2 pt-1">
                  <span className={`h-2.5 w-1/3 rounded-full ${phase === 'marking' ? 'mk-shimmer' : ''}`} style={{ background: 'var(--mk-hairline)' }} />
                  <span className={`h-2.5 w-4/5 rounded-full ${phase === 'marking' ? 'mk-shimmer' : ''}`} style={{ background: 'var(--mk-hairline)' }} />
                </span>
              </div>
            ))}
          </div>
        )}

        <ul className={`flex flex-col gap-3 ${done ? '' : 'invisible'}`}>
          <FeedbackRow
            animate={animated && done}
            delay={0}
            tone="good"
            icon={<Check size={15} />}
            label="What you did well"
          >
            You gave an opinion with a reason: <q lang="fr">c’était génial parce qu’il faisait très chaud</q>.
          </FeedbackRow>
          <FeedbackRow
            animate={animated && done}
            delay={120}
            tone="bad"
            icon={<ArrowRight size={15} />}
            label="Fix this first"
          >
            <span className="mk-mark-bad" lang="fr">{ERROR}</span> → <span className="mk-mark-good" lang="fr">je suis allé</span>.
            {' '}<span style={{ color: 'var(--mk-ink-muted)' }}>Aller takes être in the past.</span>
          </FeedbackRow>
          <FeedbackRow
            animate={animated && done}
            delay={240}
            tone="accent"
            icon={<Sparkles size={15} />}
            label="Say it better"
          >
            Add a plan: <q lang="fr">l’année prochaine, j’aimerais y retourner</q>.
            {' '}<span style={{ color: 'var(--mk-ink-muted)' }}>A future tense shows more range.</span>
          </FeedbackRow>
        </ul>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className="mk-focus inline-flex items-center gap-1.5 min-h-[44px] px-3 -mr-3 -mb-2 rounded-full text-xs font-semibold disabled:opacity-0 transition-opacity"
          style={{ color: 'var(--mk-ink-muted)' }}
        >
          <RotateCcw size={13} aria-hidden="true" />
          Replay demo
        </button>
      </div>
    </figure>
  );
}

const TONE: Record<'good' | 'bad' | 'accent', { bg: string; fg: string }> = {
  good: { bg: 'color-mix(in srgb, var(--mk-good) 14%, transparent)', fg: 'var(--mk-good)' },
  bad: { bg: 'color-mix(in srgb, var(--mk-bad) 14%, transparent)', fg: 'var(--mk-bad)' },
  accent: { bg: 'var(--mk-accent-soft)', fg: 'var(--mk-accent)' },
};

function FeedbackRow({
  animate,
  delay,
  tone,
  icon,
  label,
  children,
}: {
  animate: boolean;
  delay: number;
  tone: keyof typeof TONE;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`rounded-xl border mk-hairline p-3.5 flex gap-3 ${animate ? 'mk-enter' : ''}`}
      style={animate ? { animationDelay: `${delay}ms` } : undefined}
    >
      <span
        aria-hidden="true"
        className="w-7 h-7 rounded-lg shrink-0 inline-flex items-center justify-center"
        style={{ background: TONE[tone].bg, color: TONE[tone].fg }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: TONE[tone].fg }}>
          {label}
        </p>
        <p className="text-sm leading-relaxed">{children}</p>
      </div>
    </li>
  );
}
