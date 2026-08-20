import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { statusForAccuracy } from '../../../domain/pronunciation/wordStatus';
import type { PronunciationAssessment, PronunciationWordResult } from '../../../domain/pronunciation/types';

interface Props {
  assessment: PronunciationAssessment;
  onSpeakWord?: (word: string) => void;
}

const STATUS_CLASS: Record<'perfect' | 'good' | 'missed' | 'unknown', string> = {
  perfect: 'text-emerald-300',
  good: 'text-amber-300',
  missed: 'text-red-300',
  unknown: 'text-slate-400',
};

const ERROR_TYPE_CLASS: Record<string, string> = {
  mispronounced: 'underline decoration-red-400 decoration-wavy',
  skipped: 'opacity-50 line-through',
  extra: 'italic',
};

function phonemeColor(accuracyScore: number | null): string {
  const status = statusForAccuracy(accuracyScore);
  if (status === 'perfect') return 'text-emerald-300';
  if (status === 'good') return 'text-amber-300';
  if (status === 'unknown') return 'text-slate-400';
  return 'text-red-300';
}

function WordSpan({ word, onSpeakWord }: { word: PronunciationWordResult; onSpeakWord?: (word: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasPhonemes = !!word.phonemes && word.phonemes.length > 0;
  const status = statusForAccuracy(word.accuracyScore);
  const statusClass = STATUS_CLASS[status];
  const errorClass = word.errorType ? ERROR_TYPE_CLASS[word.errorType] ?? '' : '';

  return (
    <span className="inline-block">
      <button
        type="button"
        disabled={!hasPhonemes}
        onClick={() => setExpanded(e => !e)}
        title={status === 'unknown' ? 'Not assessed' : undefined}
        className={`text-sm font-medium ${statusClass} ${errorClass} ${hasPhonemes ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {word.word}
      </button>{' '}
      {expanded && hasPhonemes && (
        <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-slate-800/70 border border-slate-700/40 align-middle">
          {word.phonemes!.map((p, i) => (
            <span key={i} className={`text-[10px] font-mono ${phonemeColor(p.accuracyScore)}`}>
              {p.phoneme}
            </span>
          ))}
          {onSpeakWord && (
            <button
              type="button"
              onClick={() => onSpeakWord(word.word)}
              className="text-cyan-400 hover:text-cyan-300"
              aria-label={`Hear "${word.word}"`}
            >
              <Volume2 size={10} />
            </button>
          )}
        </span>
      )}
    </span>
  );
}

export function PronunciationHeatMap({ assessment, onSpeakWord }: Props) {
  if (assessment.provider !== 'azure') return null;

  return (
    // flex-wrap supplies the inter-word gap: the words are mapped adjacent
    // inline-block spans, and JSX drops the whitespace between mapped
    // elements, so without it the whole answer renders as one run-on string.
    <div className="px-1 mb-3 leading-loose flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {assessment.words.map((word, i) => (
        <WordSpan key={i} word={word} onSpeakWord={onSpeakWord} />
      ))}
    </div>
  );
}
