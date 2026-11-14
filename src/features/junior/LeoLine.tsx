/**
 * One of Léo's French lines (junior-track §7, §8): the French text, a speaker button only
 * when Léo can actually say it (a recorded file or a French voice — never an
 * English voice), and a hidden English helper behind a "?" button.
 */
import { useState } from 'react';
import { Languages, Volume2 } from 'lucide-react';
import type { JuniorLine } from '../../data/junior/types';
import type { LeoVoice } from './leoVoice';

interface Props {
  line: JuniorLine;
  voice: LeoVoice;
  /** Larger text for the question itself. */
  emphasis?: boolean;
}

const roundButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-state ease-smooth active:scale-[.97] active:duration-press';

export function LeoLine({ line, voice, emphasis = false }: Props) {
  const [showEn, setShowEn] = useState(false);
  const speakable = voice.canSpeak(line);
  return (
    <div data-testid="leo-line" className="text-center">
      <div className="flex items-center justify-center gap-2">
        <p lang="fr" className={`${emphasis ? 'text-title' : 'text-body-l font-semibold'} text-ink`}>
          {line.fr}
        </p>
        {speakable && (
          <button
            type="button"
            aria-label="Hear Léo say it"
            data-testid="leo-line-sound"
            onClick={() => void voice.speak(line)}
            className={`${roundButton} bg-action-soft text-action-text hover:bg-track`}
          >
            <Volume2 size={20} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-label={showEn ? 'Hide English' : 'Show English'}
          aria-expanded={showEn}
          data-testid="leo-line-help"
          onClick={() => setShowEn((v) => !v)}
          className={`${roundButton} border ${showEn ? 'border-action bg-action-soft text-action-text' : 'border-hairline-strong text-ink-muted hover:bg-track hover:text-ink'}`}
        >
          <Languages size={18} aria-hidden="true" />
        </button>
      </div>
      {showEn && (
        <p data-testid="leo-line-en" className="mt-1 text-body-s text-ink-muted">
          {line.en}
        </p>
      )}
    </div>
  );
}
