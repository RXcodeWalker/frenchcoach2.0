import { Mic, RefreshCw } from 'lucide-react';
import type { SessionPart } from '../../../domain/igcse/stt/types';
import { GuardianConsentNotice } from '../../../components/GuardianConsentNotice';
import {
  ANALYSE_BUTTON_LABEL,
  PART_NAME,
  PART_NO_AUDIO,
  PART_NOTHING_ANALYSED,
  PART_NOTHING_STOOD_OUT,
  PRONUNCIATION_STATE_MESSAGE,
  RETRY_BUTTON_LABEL,
} from './messages';
import type { UseExamPronunciation } from './useExamPronunciation';

/**
 * The Coached rail's end-of-part card (exam-pronunciation plan §2): one card
 * per finished part — "Role play done — Analyse my pronunciation" — that shows
 * up to 2 words and 1 pattern once tapped. Never a number (ADR 0005), never
 * shown per answer, and nothing runs until the candidate taps the button. The
 * results report reuses what a card stored; nothing is analysed twice.
 *
 * Coached only: the rail renders no card in Exam Sim, where pronunciation is
 * offered once, on the report.
 */
export function ExamPronunciationPartCard({ part, pronunciation }: { part: SessionPart; pronunciation: UseExamPronunciation }) {
  const status = pronunciation.status[part];
  const { withAudio } = pronunciation.partAudio(part);
  const card = status === 'done' ? pronunciation.cardFor(part) : null;
  const nothingAnalysed = status === 'done' && pronunciation.analysedTurns[part] === 0;

  let body: React.ReactNode;
  if (pronunciation.notEnabledByBackend) {
    body = <p className="text-body-s text-ink-muted">{PRONUNCIATION_STATE_MESSAGE.not_enabled}</p>;
  } else if (status === 'consent_required') {
    body = <GuardianConsentNotice />;
  } else if (status === 'running') {
    body = (
      <p role="status" aria-live="polite" className="text-body-s text-ink-muted">
        {PRONUNCIATION_STATE_MESSAGE.running}
      </p>
    );
  } else if (status === 'done') {
    body = nothingAnalysed ? (
      <p className="text-body-s text-ink-muted">{PART_NOTHING_ANALYSED}</p>
    ) : card && card.words.length > 0 ? (
      <div className="space-y-1.5">
        <p className="text-body-s text-ink">
          Worth another listen: <span className="font-semibold">{card.words.join(', ')}</span>
        </p>
        {card.pattern && (
          <p className="text-body-s text-ink-muted">
            <span className="font-semibold text-ink">{card.pattern.label}.</span> {card.pattern.explanation}
          </p>
        )}
      </div>
    ) : (
      <p className="text-body-s text-ink-muted">{PART_NOTHING_STOOD_OUT}</p>
    );
  } else if (status === 'idle') {
    body =
      withAudio === 0 ? (
        <div className="space-y-2">
          <p className="text-body-s text-ink-muted">{PART_NO_AUDIO}</p>
          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2 h-8 px-3 rounded-control border border-hairline-strong text-body-s text-ink-muted opacity-50"
          >
            <Mic size={12} /> {ANALYSE_BUTTON_LABEL}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void pronunciation.analyse(part)}
          className="w-full flex items-center justify-center gap-2 h-8 px-3 rounded-control border border-hairline-strong text-body-s text-ink hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] transition-colors duration-state ease-smooth"
        >
          <Mic size={12} /> {ANALYSE_BUTTON_LABEL}
        </button>
      );
  } else {
    body = (
      <div className="space-y-2">
        <p className="text-body-s text-ink-muted">
          {PRONUNCIATION_STATE_MESSAGE[status as keyof typeof PRONUNCIATION_STATE_MESSAGE]}
        </p>
        {status === 'failed' && (
          <button
            type="button"
            onClick={() => void pronunciation.analyse(part)}
            className="w-full flex items-center justify-center gap-2 h-8 px-3 rounded-control border border-hairline-strong text-body-s text-ink-muted hover:text-ink transition-colors duration-state ease-smooth"
          >
            <RefreshCw size={12} /> {RETRY_BUTTON_LABEL}
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-testid={`pronunciation-card-${part}`} className="rounded-card surface p-4 space-y-2">
      <p className="text-eyebrow uppercase text-ink-subtle">{PART_NAME[part]} done</p>
      {body}
    </div>
  );
}
