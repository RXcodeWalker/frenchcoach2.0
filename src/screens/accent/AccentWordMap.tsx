import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { statusForAccuracy } from '../../domain/pronunciation/wordStatus';
import type { PronunciationAssessment, PronunciationWordResult } from '../../domain/pronunciation/types';

type Status = 'perfect' | 'good' | 'missed' | 'unknown';

// Role tokens only (Design System v2): progress / reward / correction / ink.
const STATUS_CLASS: Record<Status, string> = {
  perfect: 'text-progress-text',
  good: 'text-reward-text',
  missed: 'text-correction-text',
  unknown: 'text-ink-muted',
};

const ERROR_TYPE_CLASS: Record<string, string> = {
  mispronounced: 'underline decoration-correction decoration-wavy underline-offset-4',
  skipped: 'line-through',
  extra: 'italic',
};

function Word({ word, onSpeakWord }: { word: PronunciationWordResult; onSpeakWord?: (word: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const phonemes = word.phonemes ?? [];
  const hasPhonemes = phonemes.length > 0;
  const status = statusForAccuracy(word.accuracyScore);
  const errorClass = word.errorType ? ERROR_TYPE_CLASS[word.errorType] ?? '' : '';

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={!hasPhonemes}
        aria-expanded={hasPhonemes ? expanded : undefined}
        onClick={() => setExpanded(e => !e)}
        title={status === 'unknown' ? 'Not assessed' : undefined}
        lang="fr"
        className={`rounded-control px-1 text-[17px] font-semibold transition-colors duration-state ease-smooth
          ${STATUS_CLASS[status]} ${errorClass} ${hasPhonemes ? 'cursor-pointer hover:bg-track' : 'cursor-default'}`}
      >
        {word.word}
      </button>
      {expanded && hasPhonemes && (
        <span className="inline-flex items-center gap-1.5 rounded-control bg-surface-recessed px-2 py-1">
          {phonemes.map((p, i) => (
            <span key={i} className={`font-numeral text-caption ${STATUS_CLASS[statusForAccuracy(p.accuracyScore)]}`}>
              {p.phoneme}
            </span>
          ))}
          {onSpeakWord && (
            <button
              type="button"
              onClick={() => onSpeakWord(word.word)}
              className="flex h-6 w-6 items-center justify-center rounded-control text-action-text transition-colors duration-state ease-smooth hover:bg-action-soft"
              aria-label={`Hear "${word.word}"`}
            >
              <Volume2 size={14} aria-hidden="true" />
            </button>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * The Accent Analyzer's word-by-word read-out, on role tokens so it is legible
 * on the light theme. Only a real Azure result colours words (an estimate has
 * no per-word signal). Colour is never the only cue: a wrong word is also
 * wavy-underlined, a skipped one struck through, an extra one italic.
 */
export function AccentWordMap({ assessment, onSpeakWord }: { assessment: PronunciationAssessment; onSpeakWord?: (word: string) => void }) {
  if (assessment.provider !== 'azure') return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-left">
      {assessment.words.map((word, i) => (
        <Word key={i} word={word} onSpeakWord={onSpeakWord} />
      ))}
    </div>
  );
}
