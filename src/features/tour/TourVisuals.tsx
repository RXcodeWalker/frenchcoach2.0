import type { ReactNode } from 'react';
import { BarChart3, Check, Compass, Mic, PencilLine, Sparkles, User } from 'lucide-react';
import type { TourVisualId } from './tourSteps';

/**
 * Small illustrations for tour steps: "show, don't tell". Static, no motion,
 * role tokens only (no raw colours), nothing under 12px. The feedback example
 * deliberately carries no mark, band or number — it is the shape of the
 * feedback, not a score.
 */

function Row({ icon, tone, label, children }: { icon: ReactNode; tone: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-control ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="text-body-s text-ink">{children}</p>
      </div>
    </div>
  );
}

function FeedbackExample() {
  return (
    <figure aria-label="Example of feedback on an answer" className="mt-4 rounded-card border border-hairline surface-recessed p-3.5">
      <figcaption className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">You said</figcaption>
      <p lang="fr" className="mt-1 text-body-base text-ink">
        « Hier, j’ai allé au cinéma. »
      </p>
      <div className="mt-3 space-y-3 border-t border-hairline pt-3">
        <Row icon={<Check size={14} aria-hidden="true" />} tone="bg-progress-soft text-progress-text" label="Did well">
          You used the past tense with « hier ».
        </Row>
        <Row icon={<PencilLine size={14} aria-hidden="true" />} tone="bg-correction-soft text-correction-text" label="Fix first">
          <span lang="fr">« j’ai allé » → « je suis allé »</span>. Aller takes être.
        </Row>
        <Row icon={<Sparkles size={14} aria-hidden="true" />} tone="bg-info-soft text-info-text" label="Say it better">
          <span lang="fr">« Hier soir, je suis allé au cinéma avec mes amis. »</span>
        </Row>
      </div>
    </figure>
  );
}

const MORE_ITEMS: { Icon: typeof Compass; name: string; text: string }[] = [
  { Icon: Compass, name: 'Explore', text: 'Games and extra drills for a change of pace.' },
  { Icon: BarChart3, name: 'Progress', text: 'Your streak, your scores and what to work on next.' },
  { Icon: User, name: 'Profile', text: 'Settings, and a way to replay this tour.' },
];

function MoreList() {
  return (
    <ul className="mt-3 space-y-3">
      {MORE_ITEMS.map(({ Icon, name, text }) => (
        <li key={name} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
            <Icon size={16} strokeWidth={1.75} />
          </span>
          <span className="text-body-s text-ink-muted">
            <strong className="font-semibold text-ink">{name}.</strong> {text}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A picture of the browser's prompt, so the real one is familiar when it appears.
 * Inert and hidden from assistive tech (the step body says it all), and kept
 * deliberately neutral so it never competes with the card's one real primary button.
 */
function MicPrompt() {
  return (
    <div aria-hidden="true" className="mt-4 rounded-card border border-hairline surface-recessed p-3.5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">What your browser shows</p>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-action-soft text-action-text">
          <Mic size={18} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1 text-body-s text-ink">Use your microphone?</span>
        <span className="rounded-control border border-hairline-strong px-3 py-1.5 text-[13px] font-semibold text-ink">Allow</span>
      </div>
    </div>
  );
}

export function TourVisual({ id }: { id: TourVisualId }) {
  switch (id) {
    case 'feedback':
      return <FeedbackExample />;
    case 'more':
      return <MoreList />;
    case 'mic':
      return <MicPrompt />;
  }
}
