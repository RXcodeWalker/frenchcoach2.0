// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TranscriptReview } from '../TranscriptReview';
import type { SessionTranscript, Utterance } from '../../../domain/igcse/stt/types';

afterEach(() => cleanup());

function candidateUtterance(overrides: Partial<Utterance> = {}): Utterance {
  return {
    utteranceId: 'u1',
    role: 'candidate',
    speakerCluster: 'spk1',
    part: 'topic1',
    questionId: 'topic1:t1q1',
    startS: 0,
    endS: 1,
    text: 'Bonjour, ça va bien.',
    words: [],
    inputMode: 'speech',
    ...overrides,
  };
}

function baseTranscript(utterances: Utterance[]): SessionTranscript {
  return {
    schemaVersion: 'session-transcript-v1',
    assemblerVersion: 'session-engine-v2',
    sessionId: 'sess-1',
    recordedAt: '2026-01-01T00:00:00.000Z',
    contentProvenance: 'original-practice',
    userCorrected: false,
    audio: { sha256: '0'.repeat(64), durationS: 10, sampleRateHz: 16000, channels: 1 },
    stt: {
      model: 'session-engine',
      modelVersion: 'v1',
      provider: 'session-engine',
      languageCode: 'fr',
      alignmentModel: null,
      diarizationModel: null,
      decodeParamsHash: 'abc123',
      confidenceSource: 'faster-whisper-probability',
      promptBiasedRetries: 0,
      transcribedAt: '2026-01-01T00:00:00.000Z',
    },
    annotationSource: 'session-engine-log',
    questionSetId: 'qs-1',
    questionSetHash: '1'.repeat(64),
    matchThreshold: 0.6,
    roleLabelConfidence: 1,
    utterances,
    examinerEvents: [],
  };
}

describe('TranscriptReview', () => {
  it('Coached: editable textarea per answer, and confirming an edit sets userCorrected', () => {
    const transcript = baseTranscript([candidateUtterance()]);
    const onConfirm = vi.fn();
    render(<TranscriptReview transcript={transcript} onConfirm={onConfirm} onExit={vi.fn()} coached={true} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Bonjour, ça va très bien.' } });
    fireEvent.click(screen.getByText(/Confirm & Finish/));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const finalTranscript = onConfirm.mock.calls[0][0] as SessionTranscript;
    expect(finalTranscript.userCorrected).toBe(true);
    expect(finalTranscript.utterances[0].text).toBe('Bonjour, ça va très bien.');
  });

  it('Exam Sim: read-only — no textarea, plain text, "Submit for marking" button', () => {
    const transcript = baseTranscript([candidateUtterance()]);
    const onConfirm = vi.fn();
    render(<TranscriptReview transcript={transcript} onConfirm={onConfirm} onExit={vi.fn()} coached={false} />);

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Bonjour, ça va bien.')).not.toBeNull();
    expect(screen.getByText(/In Exam Sim your answers are marked exactly as recorded/)).not.toBeNull();

    fireEvent.click(screen.getByText(/Submit for marking/));
    expect(onConfirm).toHaveBeenCalledWith(transcript);
  });
});
