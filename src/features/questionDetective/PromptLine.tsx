import { highlightWord } from './highlight';
import type { WordId } from '../../data/questionWords/types';

export function PromptLine({ prompt, wordId }: { prompt: string; wordId: WordId }) {
  const parts = highlightWord(prompt, wordId);
  return (
    <p lang="fr" className="text-title text-ink">
      {parts.word ? (
        <>
          {parts.before}
          <mark className="rounded-control bg-action-soft px-1 text-action-text">{parts.word}</mark>
          {parts.after}
        </>
      ) : (
        prompt
      )}
    </p>
  );
}
