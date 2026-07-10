import { describe, it, expect } from 'vitest';
import { parseSessionTranscript, SessionTranscriptValidationError } from '../schema';
import appConducted from './fixtures/app-conducted.json';

describe('parseSessionTranscript', () => {
  it('round-trips the app-conducted fixture', () => {
    const parsed = parseSessionTranscript(appConducted);
    expect(parsed.annotationSource).toBe('session-engine-log');
    expect(parsed.stt.diarizationModel).toBeNull();
    expect(parsed.roleLabelConfidence).toBe(1);
  });

  it('rejects a bad schemaVersion', () => {
    const bad = { ...appConducted, schemaVersion: 'session-transcript-v2' };
    expect(() => parseSessionTranscript(bad)).toThrow(SessionTranscriptValidationError);
  });

  it('rejects a missing schemaVersion', () => {
    const rest: Record<string, unknown> = { ...(appConducted as Record<string, unknown>) };
    delete rest.schemaVersion;
    expect(() => parseSessionTranscript(rest)).toThrow(SessionTranscriptValidationError);
  });

  it('rejects a word with confidence > 1', () => {
    const bad = JSON.parse(JSON.stringify(appConducted));
    bad.utterances[0].words[0].confidence = 1.5;
    expect(() => parseSessionTranscript(bad)).toThrow(SessionTranscriptValidationError);
  });

  it('rejects languageCode "en"', () => {
    const bad = JSON.parse(JSON.stringify(appConducted));
    bad.stt.languageCode = 'en';
    expect(() => parseSessionTranscript(bad)).toThrow(SessionTranscriptValidationError);
  });
});
