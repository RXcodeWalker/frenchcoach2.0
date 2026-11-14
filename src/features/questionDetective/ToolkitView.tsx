import { QUESTION_WORDS } from '../../data/questionWords/words';
import { PageShell } from '../../components/layout/PageShell';
import { lemma } from './copy';
import { HearPrompt } from './HearPrompt';
import { PromptLine } from './PromptLine';
import { WORD_ICONS } from './wordIcons';

export function ToolkitView() {
  return (
    <PageShell maxWidth="md">
      <p className="text-label text-ink-muted">Each word finds one kind of thing. Tap Hear it to listen.</p>
      <ul className="flex flex-col gap-4">
        {QUESTION_WORDS.map(word => {
          const Icon = WORD_ICONS[word.id];
          return (
            <li key={word.id} className="rounded-card border border-hairline surface p-4">
              <p className="flex items-center gap-2 text-subtitle text-ink">
                <Icon size={20} aria-hidden="true" />
                <span lang="fr">{lemma(word.id)}</span>
              </p>
              <p className="mt-1 text-label text-action-text">Finds {word.finds}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {word.examples.map(ex => (
                  <li key={ex.prompt} className="flex flex-wrap items-center gap-2">
                    <PromptLine prompt={ex.prompt} wordId={word.id} />
                    <HearPrompt text={ex.prompt} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
