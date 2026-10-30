import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { TTS } from '../../services/tts/ttsService';
import { frenchWithArticle } from '../../features/roleplay/vocabDisplay';
import type { VocabEntry } from '../../features/roleplay/types';

interface FlashcardDeckProps {
  items: VocabEntry[];
}

/**
 * Flashcards (Design System v2): one flat card — the French word, and the
 * English revealed under it on tap. No flip, gradient or 3D.
 */
export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const currentItem = items[currentIndex];
  if (items.length === 0 || !currentItem) return null;

  const go = (delta: number) => {
    setRevealed(false);
    setCurrentIndex((prev) => (prev + delta + items.length) % items.length);
  };

  const french = frenchWithArticle(currentItem);
  const navBtn =
    'flex h-11 w-11 items-center justify-center rounded-control border border-hairline-strong text-ink-muted transition-[background-color,color,transform] duration-state ease-smooth hover:bg-track hover:text-ink active:scale-[.97]';

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-4">
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-card surface p-6 text-center">
        <span className="text-eyebrow uppercase text-ink-subtle">French</span>
        <h3 className="text-title text-ink">{french}</h3>
        {currentItem.pos === 'noun' && currentItem.gender && (
          <span className="rounded-pill bg-action-soft px-2.5 py-0.5 text-caption font-semibold text-action-text">{currentItem.gender}</span>
        )}
        <button
          type="button"
          onClick={() => TTS.speak(currentItem.fr, { recorded: true })}
          aria-label={`Hear ${french}`}
          className={navBtn}
        >
          <Volume2 size={18} aria-hidden="true" />
        </button>

        {revealed ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-hairline pt-4" aria-live="polite">
            <span className="text-eyebrow uppercase text-ink-subtle">English</span>
            <p className="text-subtitle text-ink">{currentItem.en}</p>
            {currentItem.literalEn && <p className="text-caption text-ink-subtle">lit. “{currentItem.literalEn}”</p>}
            {currentItem.note && <p className="text-caption text-reward-text">{currentItem.note}</p>}
            {currentItem.register && <p className="text-caption text-ink-subtle">{currentItem.register}</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-2 h-10 rounded-control border border-hairline-strong px-4 text-label text-ink transition-[background-color,transform] duration-state ease-smooth hover:bg-track active:scale-[.97]"
          >
            Show translation
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => go(-1)} aria-label="Previous card" className={navBtn}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <span className="font-numeral text-label text-ink-muted">{currentIndex + 1} / {items.length}</span>
        <button type="button" onClick={() => go(1)} aria-label="Next card" className={navBtn}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
