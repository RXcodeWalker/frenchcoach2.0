/**
 * One of Léo's French lines (junior-track §7, §8): the French text, a 🔊 only
 * when Léo can actually say it (a recorded file or a French voice — never an
 * English voice), and a hidden English helper behind a "?" button.
 */
import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { JuniorLine } from '../../data/junior/types';
import type { LeoVoice } from './leoVoice';

interface Props {
  line: JuniorLine;
  voice: LeoVoice;
  /** Larger text for the question itself. */
  emphasis?: boolean;
}

export function LeoLine({ line, voice, emphasis = false }: Props) {
  const [showEn, setShowEn] = useState(false);
  const speakable = voice.canSpeak(line);
  return (
    <div data-testid="leo-line" className="text-center">
      <div className="flex items-center justify-center gap-2">
        <p lang="fr" className={`${emphasis ? 'text-title' : 'text-body-l'} font-semibold text-ink`}>
          {line.fr}
        </p>
        {speakable && (
          <button
            type="button"
            aria-label="Hear Léo say it"
            data-testid="leo-line-sound"
            onClick={() => void voice.speak(line)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-action-soft text-action-text"
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-label text-ink-muted"
        >
          ?
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
