import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronDown, Volume2, VolumeX, Info } from 'lucide-react';
import { TTS } from '../../services/tts/ttsService';
import type { Question } from '../../types/index';
import { deriveDemandLevel } from '../../domain/learn/demand/deriveDemandLevel';
import { levelLabel } from '../../domain/learn/ability/levelLabel';
import type { SelectionReason } from '../../domain/learn/selection/types';
import { enter, slide } from '../../components/motion/variants';

interface Props {
  question: Question;
  showHint: boolean;
  onToggleHint: () => void;
  isReview?: boolean;
  /** docs §14 UX #2/#3 — present only on the adaptive path (learnAdaptiveDifficulty live). */
  selectionReason?: SelectionReason | null;
  /** Mobile: a centred stage instead of a card; Listen moves in with the other links. */
  compact?: boolean;
}

const COGNITIVE_DEMAND_LABEL: Record<string, string> = {
  describe: 'Describe',
  explain: 'Explain',
  justify: 'Justify an opinion',
  compare: 'Compare',
  hypothesize: 'Hypothesize',
};

const TIME_FRAME_LABEL: Record<string, string> = {
  present: 'present',
  past: 'past',
  future: 'future',
  conditional: 'conditional',
};

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'Foundation', 2: 'Core', 3: 'Extended' };

const CHIP = 'inline-flex h-6 items-center rounded-control px-2 text-caption font-semibold';
const LINK = 'inline-flex h-11 items-center gap-1.5 text-[13px] font-semibold transition-colors duration-state ease-smooth';

/**
 * The question (Design System v2): demand and Review chips, Listen, the
 * question at 30/600, tap-to-translate vocabulary chips, then the hint (ideas
 * and a Libre Baskerville phrase frame, on reward-soft) and "Why this
 * question" (recessed). Compact renders the same content as a centred stage.
 */
export function QuestionCard({ question, showHint, onToggleHint, isReview, selectionReason, compact = false }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [revealedVocab, setRevealedVocab] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const handleSpeak = async () => {
    if (isSpeaking) {
      TTS.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    try {
      await TTS.speak(question.text, { recorded: true });
    } catch (error) {
      console.error('TTS failed:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const chips = (
    <span className={`flex flex-wrap gap-2 ${compact ? 'justify-center' : ''}`}>
      {question.demands ? (
        <span className={`${CHIP} bg-action-soft text-action-text`}>
          {COGNITIVE_DEMAND_LABEL[question.demands.cognitiveDemand] ?? question.demands.cognitiveDemand}
          {' · '}
          {question.demands.timeFrames.map(tf => TIME_FRAME_LABEL[tf] ?? tf).join(' + ')}
          {' · '}
          {levelLabel(deriveDemandLevel(question.demands))}
        </span>
      ) : (
        <span className={`${CHIP} bg-action-soft text-action-text`}>{DIFFICULTY_LABEL[question.difficulty] ?? 'Core'}</span>
      )}
      {isReview && <span className={`${CHIP} bg-info-soft text-info-text`}>Review</span>}
    </span>
  );

  const vocab = question.keyVocab.length > 0 && (
    <div className={`flex flex-wrap gap-x-2 pt-5 ${compact ? 'justify-center' : ''}`}>
      {question.keyVocab.map(word => {
        const open = revealedVocab === word.fr;
        return (
          <button
            key={word.fr}
            type="button"
            onClick={() => setRevealedVocab(open ? null : word.fr)}
            aria-label={`${word.fr}: ${word.en}`}
            aria-expanded={open}
            className="flex h-11 items-center"
          >
            <span
              lang="fr"
              className={`relative inline-flex h-8 items-center rounded-control border px-3 text-[13px] font-medium transition-colors duration-state ease-smooth
                ${open ? 'border-action bg-action-soft text-action-text' : 'border-hairline bg-surface-recessed text-ink hover:border-hairline-strong'}`}
            >
              {word.fr}
              {open && (
                <span
                  lang="en"
                  className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-control bg-ink px-2 py-1 text-caption font-medium text-surface"
                >
                  {word.en}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );

  const listenButton = compact ? (
    <button type="button" onClick={handleSpeak} className={`${LINK} ${isSpeaking ? 'text-action-text' : 'text-ink-muted hover:text-ink'}`}>
      {isSpeaking ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
      {isSpeaking ? 'Stop' : 'Listen'}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleSpeak}
      aria-label={isSpeaking ? 'Stop listening' : 'Listen'}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-hairline-strong
        transition-[background-color,color,transform] duration-state ease-smooth hover:bg-track active:scale-[.97]
        ${isSpeaking ? 'text-action-text' : 'text-ink-muted hover:text-ink'}`}
    >
      {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
  );

  const toggles = (
    <div className={`flex flex-wrap gap-x-5 gap-y-1 ${compact ? 'justify-center' : ''}`}>
      {compact && listenButton}
      <button type="button" onClick={onToggleHint} aria-expanded={showHint} className={`${LINK} text-reward-text`}>
        <Lightbulb size={14} aria-hidden="true" />
        {showHint ? 'Hide hint' : 'Get hint'}
        {!compact && (
          <motion.span className="inline-flex" animate={{ rotate: showHint ? 180 : 0 }} transition={slide}>
            <ChevronDown size={14} aria-hidden="true" />
          </motion.span>
        )}
      </button>
      {selectionReason && (
        <button type="button" onClick={() => setShowWhy(!showWhy)} aria-expanded={showWhy} className={`${LINK} text-ink-muted hover:text-ink`}>
          <Info size={14} aria-hidden="true" />
          Why this question
          {!compact && (
            <motion.span className="inline-flex" animate={{ rotate: showWhy ? 180 : 0 }} transition={slide}>
              <ChevronDown size={14} aria-hidden="true" />
            </motion.span>
          )}
        </button>
      )}
    </div>
  );

  const panels = (
    <>
      <AnimatePresence initial={false}>
        {showHint && (
          <motion.div
            variants={enter}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className={`flex flex-col gap-2.5 rounded-control bg-reward-soft px-5 py-4 text-left text-ink ${compact ? 'w-full max-w-[520px]' : ''}`}
          >
            {question.coachHint ? (
              <div className="flex flex-col gap-2.5" data-testid="coach-hint">
                <ul className="flex list-disc flex-col gap-1 pl-[18px] text-body-s">
                  {question.coachHint.ideas.map((idea) => (
                    <li key={idea}>{idea}</li>
                  ))}
                </ul>
                <span lang="fr" className="font-exam text-[20px] italic leading-[1.35]">« {question.coachHint.phrase.fr} »</span>
                <span className="text-[13px] text-ink-muted">{question.coachHint.phrase.en}</span>
              </div>
            ) : (
              <p className="text-body-s">{question.hint}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showWhy && selectionReason && (
          <motion.div
            variants={enter}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className={`rounded-control border border-hairline bg-surface-recessed px-4 py-3.5 text-left text-body-s text-ink-muted ${compact ? 'w-full max-w-[520px]' : ''}`}
          >
            {selectionReason.explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (compact) {
    return (
      <motion.div
        key={question.id}
        variants={enter}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center justify-center gap-4 py-[clamp(8px,4cqw,40px)] text-center"
      >
        {chips}
        <h2 lang="fr" className="max-w-[600px] text-h2 text-ink [text-wrap:balance]">{question.text}</h2>
        {vocab}
        {toggles}
        {panels}
      </motion.div>
    );
  }

  return (
    <motion.div
      key={question.id}
      variants={enter}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(20px,4cqw,32px)]"
    >
      <div className="flex items-center justify-between gap-3">
        {chips}
        {listenButton}
      </div>
      <h2 lang="fr" className="text-h2 text-ink [text-wrap:pretty]">{question.text}</h2>
      {vocab}
      {toggles}
      {panels}
    </motion.div>
  );
}
