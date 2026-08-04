import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { statusForAccuracy } from '../../../domain/pronunciation/wordStatus';
import type { PronunciationAssessment, PronunciationWordResult } from '../../../domain/pronunciation/types';

interface Props {
  assessment: PronunciationAssessment;
  onSpeakWord?: (word: string) => void;
}

const STATUS_CLASS: Record<'perfect' | 'good' | 'missed', string> = {
  perfect: 'text-emerald-300',
  good: 'text-amber-300',
  missed: 'text-red-300',
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
  return 'text-red-300';
}

function WordSpan({ word, onSpeakWord }: { word: PronunciationWordResult; onSpeakWord?: (word: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasPhonemes = !!word.phonemes && word.phonemes.length > 0;
  const statusClass = STATUS_CLASS[statusForAccuracy(word.accuracyScore)];
  const errorClass = word.errorType ? ERROR_TYPE_CLASS[word.errorType] ?? '' : '';

  return (
    <span className="inline-block">
      <button
        type="button"
        disabled={!hasPhonemes}
        onClick={() => setExpanded(e => !e)}
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
    <div className="px-1 mb-3 leading-loose">
      {assessment.words.map((word, i) => (
        <WordSpan key={i} word={word} onSpeakWord={onSpeakWord} />
      ))}
    </div>
  );
}
