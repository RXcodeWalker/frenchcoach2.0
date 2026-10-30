import React from 'react';
import { Volume2 } from 'lucide-react';
import type { VocabEntry } from '../../features/roleplay/types';

interface VocabListViewProps {
  items: VocabEntry[];
}

export const VocabListView: React.FC<VocabListViewProps> = ({ items }) => {
  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => {
        const french = `${item.pos === 'noun' && item.article ? `${item.article} ` : ''}${item.fr}`;
        return (
          <li key={index} className="flex items-center justify-between gap-3 rounded-card surface p-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="flex flex-wrap items-center gap-2 text-section text-ink">
                {french}
                {item.pos === 'noun' && item.gender && (
                  <span className="rounded-pill bg-action-soft px-2 py-0.5 text-caption font-semibold text-action-text">{item.gender}</span>
                )}
              </p>
              <p className="text-body-s text-ink-muted">{item.en}</p>
              {item.literalEn && <p className="text-caption text-ink-subtle">lit. “{item.literalEn}”</p>}
              {item.note && <p className="text-caption text-reward-text">{item.note}</p>}
              <p className="text-caption text-ink-subtle">{item.pos} · {item.register}</p>
            </div>
            <button
              type="button"
              onClick={() => speak(item.fr)}
              aria-label={`Hear ${french}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-hairline-strong text-ink-muted
                transition-[background-color,color,transform] duration-state ease-smooth hover:bg-track hover:text-ink active:scale-[.97]"
            >
              <Volume2 size={18} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
};
