/**
 * judge:check --feedback measurements (Phase 3 Batch A), offline: a synthetic
 * judge error list on the real split-A fixture, and the report that would be
 * shown from it.
 */
import { describe, expect, it } from 'vitest';
import { loadFixture } from '../fixtures';
import { asSpokenTranscript, measureFeedback } from '../feedbackCheck';
import type { ScoringEnvelope } from '../../../../src/domain/igcse/envelope/types';
import type { QolError } from '../../../../src/domain/igcse/judgement/types';
import type { ExamFeedbackReport } from '../../../../src/domain/examFeedback/types';
import { decideQolErrorDisplay } from '../../../../src/domain/examFeedback/schema';

const fixture = loadFixture('split-a-strong-comm-poor-grammar');

const JUDGE_ERRORS: QolError[] = [
  { source: 'topic1', turnId: 'q1', quote: 'je faire', kind: 'grammar', correction: 'je fais' },
  { source: 'topic1', turnId: 'q1', quote: 'on jouer', kind: 'grammar', correction: 'on jouent' },
  { source: 'topic1', turnId: 'q1', quote: 'beaucoup de chose', kind: 'grammar', correction: 'beaucoup de choses' },
];

function envelopeWith(errors: QolError[]): ScoringEnvelope {
  return {
    qualityOfLanguage: { errors },
    transcriptSnapshot: asSpokenTranscript(fixture.transcript),
  } as unknown as ScoringEnvelope;
}

function reportShowing(envelope: ScoringEnvelope): ExamFeedbackReport {
  const shown = decideQolErrorDisplay(envelope)
    .filter((d) => d.kept)
    .map((d) => ({ ...d.error, errorIndex: d.errorIndex, category: 'verb_form' as const }));
  return { qualityOfLanguage: { errors: shown } } as unknown as ExamFeedbackReport;
}

describe('measureFeedback', () => {
  const envelope = envelopeWith(JUDGE_ERRORS);
  const m = measureFeedback(fixture, envelope, reportShowing(envelope));

  it('feedback recall counts only errors the report shows', () => {
    expect(m.recall.filter((r) => r.caught).map((r) => r.quote)).toEqual(['je faire', 'on jouer']);
    expect(m.recall).toHaveLength(5);
  });

  it('compares each shown correction with the expected one', () => {
    expect(m.corrections).toEqual([
      { quote: 'je faire', expected: 'je fais', shown: 'je fais', matches: true },
      { quote: 'on jouer', expected: 'on joue', shown: 'on jouent', matches: false },
    ]);
  });

  it('reports the spelling-only error the display filter dropped on the spoken transcript', () => {
    expect(m.dropped.map((d) => [d.error.quote, d.dropReason])).toEqual([['beaucoup de chose', 'sound-alike-on-speech']]);
  });

  it('lists a watch-list item the judge counted (and the feedback did not show)', () => {
    expect(m.inaudibleCounted).toEqual([
      { quote: 'beaucoup de chose', note: 'chose/choses: the plural is silent', by: 'judge' },
    ]);
  });

  it('asSpokenTranscript marks only turns that carry no input mode', () => {
    const spoken = asSpokenTranscript(fixture.transcript);
    expect(spoken.topicConversations.flatMap((c) => c.turns.map((t) => t.inputMode))).toEqual(['speech', 'speech', 'speech', 'speech']);
    expect(fixture.transcript.topicConversations[0].turns[0].inputMode).toBeUndefined();
  });
});
