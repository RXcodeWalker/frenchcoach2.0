import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced } from '../../components/motion/variants';
import { QUESTIONS } from '../../data/questions';
import { TOPICS } from '../../data/gameData';
import { isTopicVisible } from '../learn/sessionSetup';
import { SOUND_FAMILIES } from '../../domain/pronunciation/lab/soundFamilies';
import { pickPracticeSentences, seededRng } from '../../domain/pronunciation/lab/practiceSentences';
import { SOUND_TIPS } from '../../domain/pronunciation/lab/tips';
import type { SoundFamilyId } from '../../domain/pronunciation/lab/types';
import { NOTEBOOK_PRACTISE_NOTE, PRACTISE_EMPTY, PRACTISE_INTRO, PRACTISE_TITLE } from './soundsCopy';

/**
 * "Practise a sentence" (pronunciation-lab plan §3.3): the learner picks what
 * to say. Sources are Learn's model answers (always recorded, so ▶ Native is
 * free) and — signed in only — the answers kept in the exam notebook (AI-
 * corrected text; Stage 4b records one on first play). Both are cut into
 * sentences by `splitSentences`, the recording script's own splitter.
 *
 * An optional sound filter shows only sentences with that sound in their
 * spelling (the same rules as "watch out for"). The learner's text never
 * leaves the device from here; saying a sentence is `LabPractice`'s job.
 */

interface Props {
  /** The exam-notebook answers, if the learner is signed in and has any. */
  notebookAnswers: readonly string[];
  initialFamily?: SoundFamilyId | null;
  onPick: (sentence: string) => void;
}

const SHOWN = 8;
const MODEL_ANSWERS = QUESTIONS.filter((q) => q.modelAnswer);
const TOPIC_OPTIONS = TOPICS.filter(isTopicVisible);

export function PracticePicker({ notebookAnswers, initialFamily = null, onPick }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [source, setSource] = useState<'model' | 'notebook'>('model');
  const [topic, setTopic] = useState<string>('all');
  const [family, setFamily] = useState<SoundFamilyId | null>(initialFamily);
  /** One number names a draw; "Show different ones" takes a new one. */
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));

  const sentences = useMemo(() => {
    const texts =
      source === 'notebook'
        ? [...notebookAnswers]
        : (topic === 'all' ? MODEL_ANSWERS : MODEL_ANSWERS.filter((q) => q.topicKey === topic)).map((q) => q.modelAnswer);
    return pickPracticeSentences(texts, { family, limit: SHOWN, rng: seededRng(seed) });
  }, [source, topic, family, notebookAnswers, seed]);

  const hasNotebook = notebookAnswers.length > 0;

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
      aria-label={PRACTISE_TITLE}
      data-testid="practice-picker"
    >
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow uppercase text-action-text">Practise</p>
        <h1 className="text-h1 text-ink">{PRACTISE_TITLE}</h1>
        <p className="text-body-s text-ink-muted">{PRACTISE_INTRO}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Where from">
        {(['model', ...(hasNotebook ? (['notebook'] as const) : [])] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={source === s}
            onClick={() => setSource(s)}
            className={`h-10 rounded-pill border px-3.5 text-[13px] font-semibold transition-colors duration-state ease-smooth
              ${source === s ? 'border-action bg-action-soft text-action-text' : 'border-hairline-strong text-ink hover:bg-track'}`}
          >
            {s === 'model' ? 'Model answers' : 'My notebook'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {source === 'model' && (
          <label className="flex flex-col gap-1 text-caption text-ink-muted">
            Topic
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-11 rounded-control border border-hairline-strong bg-surface px-3 text-[14px] text-ink"
            >
              <option value="all">All topics</option>
              {TOPIC_OPTIONS.map((t) => (
                <option key={t.key} value={t.key}>{t.labelEn}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-caption text-ink-muted">
          Sound
          <select
            value={family ?? ''}
            onChange={(e) => setFamily((e.target.value || null) as SoundFamilyId | null)}
            className="h-11 rounded-control border border-hairline-strong bg-surface px-3 text-[14px] text-ink"
          >
            <option value="">Any sound</option>
            {SOUND_FAMILIES.map((f) => (
              <option key={f} value={f}>{SOUND_TIPS[f].name}</option>
            ))}
          </select>
        </label>
      </div>

      {source === 'notebook' && <p className="text-caption text-ink-muted">{NOTEBOOK_PRACTISE_NOTE}</p>}

      {sentences.length === 0 ? (
        <p className="rounded-card border border-hairline bg-surface-recessed p-4 text-body-s text-ink-muted">{PRACTISE_EMPTY}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {sentences.map((sentence) => (
              <li key={sentence}>
                <button
                  type="button"
                  onClick={() => onPick(sentence)}
                  className="flex w-full items-center gap-3 rounded-card border border-hairline bg-surface p-4 text-left text-ink
                    transition-colors duration-state ease-smooth hover:border-hairline-strong active:bg-surface-recessed"
                >
                  <span className="min-w-0 flex-1 text-[16px] leading-[1.45]" lang="fr">{sentence}</span>
                  <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <Button variant="quiet" className="w-fit" onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))}>
            <RefreshCw size={16} aria-hidden="true" /> Show different ones
          </Button>
        </>
      )}
    </motion.section>
  );
}
