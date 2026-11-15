import { QUESTION_WORDS } from '../../data/questionWords/words';
import { PageShell } from '../../components/layout/PageShell';
import { Stat } from '../../components/ui/Stat';
import { lemma } from './copy';
import { HearPrompt } from './HearPrompt';
import { IconChip, Rise } from './parts';
import { PromptLine } from './PromptLine';
import { WORD_ICONS } from './wordIcons';

const POSITION_LABEL = { end: 'At the end', front: 'At the front', estCeQue: 'With est-ce que' } as const;

export function ToolkitView() {
  return (
    <PageShell maxWidth="md" gap={16}>
      <Rise>
        <p className="max-w-[56ch] text-body-base text-ink-muted">
          Each word finds one kind of thing. The word can sit at the end, at the front, or after est-ce que, so look for it wherever it is.
        </p>
      </Rise>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUESTION_WORDS.map(word => {
          const Icon = WORD_ICONS[word.id];
          return (
            <li key={word.id}>
              <Rise className="flex h-full flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <IconChip icon={<Icon size={18} />} size={40} />
                    <p lang="fr" className="text-subtitle text-ink">{lemma(word.id)}</p>
                  </div>
                  <Stat role="progress" soft>Finds {word.finds}</Stat>
                </div>
                <ul className="flex flex-col gap-3">
                  {word.examples.map(ex => (
                    <li key={ex.prompt} className="flex flex-col gap-1 rounded-control bg-surface-recessed p-3">
                      <p className="text-caption text-ink-subtle">{POSITION_LABEL[ex.position]}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <PromptLine prompt={ex.prompt} wordId={word.id} />
                        <HearPrompt text={ex.prompt} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Rise>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
