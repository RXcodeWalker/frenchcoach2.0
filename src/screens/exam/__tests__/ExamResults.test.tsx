// @vitest-environment jsdom
/**
 * W6 smoke test: ExamResults.tsx was substantially rewritten to surface
 * evidenceGroups/typedTurnCount/confidence/transcriptConfidence/llm
 * provenance and the accumulated coached-mode rail — this drives a real
 * simulated session through the unchanged scoring pipeline (same pattern as
 * scoreEndToEnd.test.ts) to a real EnvelopeView, then asserts the screen
 * renders every new section without throwing.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  initConductEngineState,
  startConduct,
  step,
  examinerActionToLogEntry,
  candidateTurnToLogEntry,
} from '../../../domain/igcse/session/conductEngine';
import { buildSessionTranscript } from '../../../domain/igcse/session/buildSessionTranscript';
import { ORIGINAL_QUESTION_SET_1 } from '../../../data/exam/originalQuestionSets';
import { createFixtureTranscriptStore } from '../../../domain/igcse/stt/providers/fixtureTranscriptStore';
import { toSpeakingTranscript } from '../../../domain/igcse/stt/project/toSpeakingTranscript';
import { scoreAttempt } from '../../../../scripts/scoring/scoreAttempt';
import { createGenericFakeJudge } from '../../../../scripts/scoring/__tests__/fixtures';
import { buildEnvelopeView } from '../../../domain/igcse/envelope/envelopeView';
import { ExamResults } from '../ExamResults';
import type { CandidateTurnResult, ConductLog, ConductLogEntry, SessionQuestionSet } from '../../../domain/igcse/session/types';
import type { SessionTranscript } from '../../../domain/igcse/stt/types';
import type { RailEntry } from '../../../services/exam/turnFeedback';

afterEach(() => cleanup());

const qs: SessionQuestionSet = ORIGINAL_QUESTION_SET_1;
const SESSION_ID = 'w6-exam-results-smoke';

function respond(text: string, wordCount: number, durationS: number): CandidateTurnResult {
  return { didRespond: true, relevant: wordCount >= 3, transcript: text, wordCount, responseDurationS: durationS, requestedRepeat: false };
}

/** Same drive pattern as scoreEndToEnd.test.ts — long enough answers to clear the duration floor deterministically. */
function driveFullSession(): ConductLog {
  const entries: ConductLogEntry[] = [];
  let clock = 0;
  let seq = 1;
  let state = initConductEngineState(qs);
  let result = startConduct(qs, state);
  state = result.state;

  const logActions = () => {
    for (const action of result.actions) {
      entries.push(examinerActionToLogEntry(action, seq, clock));
      seq += 1;
      clock += 2;
    }
  };
  logActions();

  let guard = 0;
  while (state.phase.kind !== 'complete' && guard < 300) {
    guard += 1;
    const lastAction = result.actions[result.actions.length - 1];
    const turn = respond(`Réponse numéro ${guard} avec plusieurs mots pour dépasser le seuil de pertinence.`, 12, 65);
    entries.push(candidateTurnToLogEntry(turn, seq, clock, lastAction.part, lastAction.questionId, true));
    seq += 1;
    clock += turn.responseDurationS;
    result = step(qs, state, { kind: 'candidateTurn', result: turn });
    state = result.state;
    logActions();
  }

  expect(state.phase.kind).toBe('complete');
  return { sessionId: SESSION_ID, questionSetId: qs.questionSetId, entries };
}

async function buildFixtures(): Promise<{ transcript: SessionTranscript; envelopeView: ReturnType<typeof buildEnvelopeView> }> {
  const log = driveFullSession();
  const transcript = buildSessionTranscript(log, qs, {
    sessionId: SESSION_ID,
    recordedAt: '2026-01-01T00:00:00.000Z',
    contentProvenance: 'original-practice',
    audio: { sha256: '0'.repeat(64), durationS: log.entries.length * 10, sampleRateHz: 16000, channels: 1 },
    questionSetHash: '1'.repeat(64),
  });

  const transcriptStore = createFixtureTranscriptStore({ [SESSION_ID]: transcript });
  const judge = createGenericFakeJudge(() => toSpeakingTranscript(transcript, qs));
  const createJudge = () => ({
    judge,
    getLastCallMetadata: () => ({ provider: 'gemini' as const, model: 'stub-judge', responseId: 'resp-w6' }),
  });

  const envelope = await scoreAttempt({ transcriptStore, createJudge }, { sessionId: SESSION_ID, questionSet: qs });
  return { transcript, envelopeView: buildEnvelopeView(envelope) };
}

const FAKE_RAIL_ENTRIES: RailEntry[] = [
  {
    turnKey: 1,
    transcript: 'Je voudrais un billet.',
    inputMode: 'speech',
    status: 'done',
    result: {
      currentDescriptorCommentary: [{ claim: 'Uses a simple present-tense request.', quote: 'Je voudrais un billet.' }],
      improvementCommentary: [],
    },
  },
];

describe('ExamResults (W6)', () => {
  it('renders the /40 report — hero, criteria, turn-by-turn breakdown, and "how this was scored" — with a real EnvelopeView, without throwing', async () => {
    const { transcript, envelopeView } = await buildFixtures();

    render(
      <ExamResults
        transcript={transcript}
        envelopeView={envelopeView}
        scoringError={null}
        onRetryScoring={vi.fn()}
        onRetake={vi.fn()}
        onHome={vi.fn()}
        coached={true}
        railEntries={FAKE_RAIL_ENTRIES}
      />,
    );

    expect(screen.getByText('Practice Session Complete')).not.toBeNull();
    expect(screen.getByText(`${envelopeView.total}`)).not.toBeNull();
    expect(screen.getByText('Marks — Unvalidated Estimate')).not.toBeNull();
    expect(screen.getByText('Turn-by-Turn Breakdown')).not.toBeNull();
    expect(screen.getByText('How This Was Scored')).not.toBeNull();
    expect(screen.getByText('Live Corrections From This Session')).not.toBeNull();
    expect(screen.getByText('Coached Practice')).not.toBeNull();
  });

  it('renders the Exam Sim badge and omits the rail section when there are no accumulated rail entries', async () => {
    const { transcript, envelopeView } = await buildFixtures();

    render(
      <ExamResults
        transcript={transcript}
        envelopeView={envelopeView}
        scoringError={null}
        onRetryScoring={vi.fn()}
        onRetake={vi.fn()}
        onHome={vi.fn()}
        coached={false}
        railEntries={[]}
      />,
    );

    expect(screen.getByText('Exam Sim')).not.toBeNull();
    expect(screen.queryByText('Live Corrections From This Session')).toBeNull();
  });

  it('renders the scoring-failed state (no envelope yet) without throwing', () => {
    const transcript: SessionTranscript = {
      schemaVersion: 'session-transcript-v1',
      assemblerVersion: 'session-engine-v2',
      sessionId: SESSION_ID,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice',
      userCorrected: false,
      audio: { sha256: '0'.repeat(64), durationS: 10, sampleRateHz: 16000, channels: 1 },
      stt: {
        model: 'whisperx-large-v3',
        modelVersion: 'v3',
        provider: 'whisperx',
        languageCode: 'fr',
        alignmentModel: 'wav2vec2-fr',
        diarizationModel: 'pyannote/speaker-diarization-3.1',
        decodeParamsHash: 'abc123',
        confidenceSource: 'whisperx-align-score',
        promptBiasedRetries: 0,
        transcribedAt: '2026-01-01T00:00:00.000Z',
      },
      annotationSource: 'session-engine-log',
      questionSetId: qs.questionSetId,
      questionSetHash: '1'.repeat(64),
      matchThreshold: 0.6,
      roleLabelConfidence: 1,
      utterances: [],
      examinerEvents: [],
    };

    render(
      <ExamResults
        transcript={transcript}
        envelopeView={null}
        scoringError="Scoring service is not responding. Please try again later."
        onRetryScoring={vi.fn()}
        onRetake={vi.fn()}
        onHome={vi.fn()}
        coached={true}
        railEntries={[]}
      />,
    );

    expect(screen.getByText('Scoring failed')).not.toBeNull();
    expect(screen.queryByText('Marks — Unvalidated Estimate')).toBeNull();
  });
});
