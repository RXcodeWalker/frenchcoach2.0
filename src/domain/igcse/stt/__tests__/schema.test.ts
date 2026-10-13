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

  it('rejects an unknown schemaVersion', () => {
    const bad = { ...appConducted, schemaVersion: 'session-transcript-v3' };
    expect(() => parseSessionTranscript(bad)).toThrow(SessionTranscriptValidationError);
  });

  it('upcasts a stored v1 transcript to v2 without inventing turnKey or recognition', () => {
    expect((appConducted as { schemaVersion: string }).schemaVersion).toBe('session-transcript-v1');
    const parsed = parseSessionTranscript(appConducted);
    expect(parsed.schemaVersion).toBe('session-transcript-v2');
    expect(parsed.utterances.length).toBe(appConducted.utterances.length);
    for (const u of parsed.utterances) {
      expect(u.turnKey).toBeUndefined();
      expect(u.recognition).toBeUndefined();
    }
    // Everything else is carried across untouched.
    expect({ ...parsed, schemaVersion: 'session-transcript-v1' }).toEqual(appConducted);
  });

  it('still validates a v1 transcript strictly (a bad word confidence is rejected)', () => {
    const bad = JSON.parse(JSON.stringify(appConducted));
    bad.utterances[0].words[0].confidence = 2;
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

  describe('session-transcript-v2 recognition', () => {
    const SEGMENT = { startS: 0, endS: 2, text: 'Ils ont un chien', avgLogprob: -0.2, noSpeechProb: 0.01, compressionRatio: 1.1 };

    function withRecognition(recognition: unknown, text: string) {
      const doc = JSON.parse(JSON.stringify(appConducted));
      doc.schemaVersion = 'session-transcript-v2';
      const idx = doc.utterances.findIndex((u: { role: string }) => u.role === 'candidate');
      doc.utterances[idx] = { ...doc.utterances[idx], text, turnKey: 3, recognition };
      return doc;
    }

    const primaryOk = {
      primary: { text: 'Ils ont un chien', model: 'whisper-large-v3', promptHash: 'a'.repeat(64), segments: [SEGMENT] },
      secondary: { source: 'web-speech-live', text: 'Ils sont en chien' },
      selected: 'primary',
      fallbackReason: null,
    };

    it('accepts a primary-selected recognition whose text matches the utterance', () => {
      const parsed = parseSessionTranscript(withRecognition(primaryOk, 'Ils ont un chien'));
      const u = parsed.utterances.find((x) => x.recognition);
      expect(u?.turnKey).toBe(3);
      expect(u?.recognition?.selected).toBe('primary');
    });

    it('accepts a secondary-selected recognition with a fallback reason and no primary', () => {
      const rec = { secondary: { source: 'web-speech-live', text: 'Ils sont en chien' }, selected: 'secondary', fallbackReason: 'asr-timeout' };
      expect(() => parseSessionTranscript(withRecognition(rec, 'Ils sont en chien'))).not.toThrow();
    });

    it('rejects an utterance whose text is not the selected reading', () => {
      expect(() => parseSessionTranscript(withRecognition(primaryOk, 'Ils sont en chien'))).toThrow(SessionTranscriptValidationError);
    });

    it('rejects primary selected with a fallback reason, or without a primary reading', () => {
      expect(() => parseSessionTranscript(withRecognition({ ...primaryOk, fallbackReason: 'quota' }, 'Ils ont un chien'))).toThrow(
        SessionTranscriptValidationError,
      );
      const { primary: _unused, ...noPrimary } = primaryOk;
      void _unused;
      expect(() => parseSessionTranscript(withRecognition(noPrimary, 'Ils sont en chien'))).toThrow(SessionTranscriptValidationError);
    });

    it('rejects secondary selected without a reason, and an unknown reason', () => {
      const secondary = { secondary: primaryOk.secondary, selected: 'secondary', fallbackReason: null };
      expect(() => parseSessionTranscript(withRecognition(secondary, 'Ils sont en chien'))).toThrow(SessionTranscriptValidationError);
      expect(() =>
        parseSessionTranscript(withRecognition({ ...secondary, fallbackReason: 'because' }, 'Ils sont en chien')),
      ).toThrow(SessionTranscriptValidationError);
    });

    it('a v1 document carrying recognition is not accepted as v1 data (the field is dropped, never trusted)', () => {
      const doc = withRecognition(primaryOk, 'Ils ont un chien');
      doc.schemaVersion = 'session-transcript-v1';
      const parsed = parseSessionTranscript(doc);
      expect(parsed.utterances.every((u) => u.recognition === undefined && u.turnKey === undefined)).toBe(true);
    });
  });
});
