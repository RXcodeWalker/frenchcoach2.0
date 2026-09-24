import { describe, it, expect } from 'vitest';
import { toSpeakingTranscript } from '../project/toSpeakingTranscript';
import { assembleSession } from '../assemble/assembleSession';
import type { AssembleSessionMeta } from '../assemble/assembleSession';
import type { RawAsrResult, SessionPart, SessionQuestionSet, SessionTranscript, Utterance } from '../types';
import { buildSessionTranscript } from '../../session/buildSessionTranscript';
import type { ConductLog, ConductLogEntry, ExaminerActionKind } from '../../session/types';

import structGolden from './fixtures/structurally-complete.golden.json';
import structRaw from './fixtures/structurally-complete-raw-asr.json';
import structQuestions from './fixtures/structurally-complete-questions.json';

const meta: AssembleSessionMeta = {
  sessionId: 'structurally-complete-001',
  contentProvenance: 'confidential-internal',
  recordedAt: '2026-05-01T09:00:00.000Z',
  audio: {
    sha256: 'struct-audio-00000000000000000000000000000000000000000000001',
    durationS: (structRaw as RawAsrResult).words[(structRaw as RawAsrResult).words.length - 1].endS,
    sampleRateHz: 16000,
    channels: 1,
  },
  questionSetHash: 'struct-qsh-000000000000000000000000000000000000000000001',
  annotationSource: 'asr-annotation',
};

describe('toSpeakingTranscript', () => {
  it('produces five role-play tasks in order', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    expect(transcript.rolePlay).toHaveLength(5);
    expect(transcript.rolePlay.map((t) => t.taskId)).toEqual(['rp1', 'rp2', 'rp3', 'rp4', 'rp5']);
  });

  it('produces exactly two topic conversations', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    expect(transcript.topicConversations).toHaveLength(2);
    expect(transcript.topicConversations[0].conversationId).toBe('topic1');
    expect(transcript.topicConversations[1].conversationId).toBe('topic2');
  });

  it('excludes examiner speech from candidate responses', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    for (const task of transcript.rolePlay) {
      expect(task.candidateResponse).not.toContain(task.taskPrompt);
    }
  });

  it('carries expectedTimeFrame and partsExpected across', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    const rp3 = transcript.rolePlay.find((t) => t.taskId === 'rp3');
    expect(rp3?.partsExpected).toBe(2);

    const pastTurn = transcript.topicConversations[0].turns.find((t) => t.turnId === 't1q4');
    expect(pastTurn?.expectedTimeFrame).toBe('past');
  });

  it('joins multi-utterance candidate turns with a single space', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    const turn = transcript.topicConversations[0].turns[0];
    expect(turn.candidateResponse).not.toMatch(/\s{2,}/);
  });

  it('uses the golden fixture unchanged', () => {
    expect(structGolden.utterances.length).toBeGreaterThan(0);
  });

  it('sums candidate utterance durations into candidateResponseDurationS per turn', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);

    for (const conversation of transcript.topicConversations) {
      for (const turn of conversation.turns) {
        const candidateUtterances = session.utterances.filter(
          (u) => u.role === 'candidate' && u.part === conversation.conversationId && u.questionId === turn.turnId,
        );
        const expectedDuration = candidateUtterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);
        expect(turn.candidateResponseDurationS).toBe(expectedDuration);
      }
    }
  });

  it('leaves ConversationTurn.inputMode undefined for ASR-annotated recordings (no dual-input provenance)', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);

    for (const conversation of transcript.topicConversations) {
      for (const turn of conversation.turns) {
        expect(turn.inputMode).toBeUndefined();
      }
    }
  });

  describe('W1: ConversationTurn.inputMode derivation', () => {
    const qs: SessionQuestionSet = {
      questionSetId: 'input-mode-qs',
      questions: [
        { questionId: 'q1', part: 'topic1', mainText: 'Q1?', alternativeTexts: [] },
        { questionId: 'q2', part: 'topic1', mainText: 'Q2?', alternativeTexts: [] },
        { questionId: 'q3', part: 'topic1', mainText: 'Q3?', alternativeTexts: [] },
      ],
      furtherQuestions: { topic1: ['f1', 'f2'], topic2: ['f1', 'f2'] },
    };

    function candidateUtterance(over: Partial<Utterance>): Utterance {
      return {
        utteranceId: 'u',
        role: 'candidate',
        speakerCluster: 'user',
        part: 'topic1',
        questionId: 'q1',
        startS: 0,
        endS: 1,
        text: 'Réponse.',
        words: [],
        ...over,
      };
    }

    function sessionWith(utterances: Utterance[]): SessionTranscript {
      return {
        schemaVersion: 'session-transcript-v1',
        assemblerVersion: 'test',
        sessionId: 'input-mode-session',
        recordedAt: '2026-01-01T00:00:00.000Z',
        contentProvenance: 'original-practice',
        userCorrected: false,
        audio: { sha256: '0'.repeat(64), durationS: 10, sampleRateHz: 16000, channels: 1 },
        stt: {
          model: 'test',
          modelVersion: 'test',
          provider: 'test',
          languageCode: 'fr',
          alignmentModel: null,
          diarizationModel: null,
          decodeParamsHash: '0'.repeat(64),
          confidenceSource: 'faster-whisper-probability',
          promptBiasedRetries: 0,
          transcribedAt: '2026-01-01T00:00:00.000Z',
        },
        annotationSource: 'session-engine-log',
        questionSetId: qs.questionSetId,
        questionSetHash: '1'.repeat(64),
        matchThreshold: 1,
        roleLabelConfidence: 1,
        utterances,
        examinerEvents: [],
      };
    }

    it("is 'text' when every candidate utterance behind the turn was typed", () => {
      const session = sessionWith([candidateUtterance({ questionId: 'q1', inputMode: 'text' })]);
      const transcript = toSpeakingTranscript(session, qs);
      expect(transcript.topicConversations[0].turns.find((t) => t.turnId === 'q1')?.inputMode).toBe('text');
    });

    it("is 'speech' when at least one candidate utterance behind the turn was spoken", () => {
      const session = sessionWith([
        candidateUtterance({ utteranceId: 'u1', questionId: 'q2', inputMode: 'text' }),
        candidateUtterance({ utteranceId: 'u2', questionId: 'q2', inputMode: 'speech' }),
      ]);
      const transcript = toSpeakingTranscript(session, qs);
      expect(transcript.topicConversations[0].turns.find((t) => t.turnId === 'q2')?.inputMode).toBe('speech');
    });

    it('is undefined when no candidate utterance carries inputMode provenance', () => {
      const session = sessionWith([candidateUtterance({ questionId: 'q3', inputMode: undefined })]);
      const transcript = toSpeakingTranscript(session, qs);
      expect(transcript.topicConversations[0].turns.find((t) => t.turnId === 'q3')?.inputMode).toBeUndefined();
    });
  });
});

describe('P0 step 2: further-question turns and examiner support (engine-conducted session)', () => {
  const qs: SessionQuestionSet = {
    questionSetId: 'support-qs',
    questions: [
      {
        questionId: 'rp1',
        part: 'rolePlay',
        mainText: 'Bonjour, vous désirez ?',
        alternativeTexts: [],
        partsExpected: 2,
        secondPartText: 'Et pour combien de personnes ?',
      },
      { questionId: 'rp2', part: 'rolePlay', mainText: 'À quelle heure ?', alternativeTexts: [] },
      { questionId: 't1q1', part: 'topic1', mainText: 'Quelle saison préfères-tu ?', alternativeTexts: [] },
      {
        questionId: 't1q2',
        part: 'topic1',
        mainText: 'Où iras-tu en vacances ?',
        alternativeTexts: ['Où voudrais-tu aller en vacances ?'],
        expectedTimeFrame: 'future',
      },
      {
        questionId: 't1q3',
        part: 'topic1',
        mainText: 'Aimes-tu ta ville ?',
        alternativeTexts: [],
        secondPartText: 'Pourquoi ?',
      },
      { questionId: 't2q1', part: 'topic2', mainText: 'Parle-moi de ton école.', alternativeTexts: [] },
    ],
    furtherQuestions: {
      topic1: ['Que fais-tu le week-end ?', 'Et ta famille ?'],
      topic2: ['f1', 'f2'],
    },
  };

  type Step =
    | { kind: 'examiner'; action: ExaminerActionKind; part: SessionPart; questionId: string | null; text: string }
    | { kind: 'candidate'; part: SessionPart; questionId: string | null; text: string; durationS?: number };

  function log(steps: Step[]): ConductLog {
    let clock = 0;
    const entries: ConductLogEntry[] = steps.map((s, i) => {
      if (s.kind === 'examiner') {
        const entry: ConductLogEntry = {
          kind: 'examiner',
          seq: i + 1,
          atS: clock,
          part: s.part,
          action: s.action,
          questionId: s.questionId,
          variant: s.action === 'READ_ALTERNATIVE' ? 'alternative' : null,
          text: s.text,
          trigger: 'scripted',
        };
        clock += 3;
        return entry;
      }
      const duration = s.durationS ?? 4;
      const entry: ConductLogEntry = {
        kind: 'candidate',
        seq: i + 1,
        startS: clock,
        endS: clock + duration,
        part: s.part,
        questionId: s.questionId,
        transcript: s.text,
        wordCount: s.text.split(/\s+/).length,
        requestedRepeat: false,
        relevant: true,
        inputMode: 'speech',
      };
      clock += duration;
      return entry;
    });
    return { sessionId: 'support-session', questionSetId: qs.questionSetId, entries };
  }

  const E = (action: ExaminerActionKind, part: SessionPart, questionId: string | null, text: string): Step => ({
    kind: 'examiner',
    action,
    part,
    questionId,
    text,
  });
  const C = (part: SessionPart, questionId: string | null, text: string, durationS?: number): Step => ({
    kind: 'candidate',
    part,
    questionId,
    text,
    durationS,
  });

  const STEPS: Step[] = [
    E('READ_MAIN', 'rolePlay', 'rp1', 'Bonjour, vous désirez ?'),
    C('rolePlay', 'rp1', 'Une table, s’il vous plaît.'),
    E('READ_MAIN', 'rolePlay', 'rp1', 'Et pour combien de personnes ?'),
    C('rolePlay', 'rp1', ''),
    E('REPEAT', 'rolePlay', 'rp1', 'Et pour combien de personnes ?'),
    C('rolePlay', 'rp1', 'Quatre personnes.'),
    E('READ_MAIN', 'rolePlay', 'rp2', 'À quelle heure ?'),
    C('rolePlay', 'rp2', 'À huit heures.'),
    E('READ_MAIN', 'topic1', 't1q1', 'Quelle saison préfères-tu ?'),
    C('topic1', 't1q1', 'L’été.'),
    E('EXTENSION_PROMPT', 'topic1', 't1q1', 'Pourquoi ?'),
    C('topic1', 't1q1', 'Parce qu’il fait chaud.'),
    E('TRANSITION', 'topic1', null, 'D’accord.'),
    E('READ_MAIN', 'topic1', 't1q2', 'Où iras-tu en vacances ?'),
    C('topic1', 't1q2', ''),
    E('REPEAT', 'topic1', 't1q2', 'Où iras-tu en vacances ?'),
    C('topic1', 't1q2', ''),
    E('READ_ALTERNATIVE', 'topic1', 't1q2', 'Où voudrais-tu aller en vacances ?'),
    C('topic1', 't1q2', 'Je voudrais aller en Espagne.'),
    E('READ_MAIN', 'topic1', 't1q3', 'Aimes-tu ta ville ?'),
    C('topic1', 't1q3', 'Oui, j’aime ma ville.'),
    E('READ_MAIN', 'topic1', 't1q3', 'Pourquoi ?'),
    C('topic1', 't1q3', 'Il y a un grand parc.'),
    E('FURTHER_QUESTION', 'topic1', null, 'Tu as mentionné « un grand parc ». Pourquoi ?'),
    C('topic1', null, 'Parce que je joue au foot là-bas.', 6),
    E('TRANSITION', 'topic1', null, 'Merci.'),
    E('FURTHER_QUESTION', 'topic1', null, 'Que fais-tu le week-end ?'),
    C('topic1', null, 'Je vais au cinéma avec mes amis.', 7),
    E('READ_MAIN', 'topic2', 't2q1', 'Parle-moi de ton école.'),
    C('topic2', 't2q1', 'Mon école est grande.'),
  ];

  function project() {
    const session = buildSessionTranscript(log(STEPS), qs, {
      sessionId: 'support-session',
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice',
      audio: { sha256: '0'.repeat(64), durationS: 200, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    });
    return toSpeakingTranscript(session, qs);
  }

  it('turns further-question answers into further1/further2 turns after Q5, with the examiner prompt', () => {
    const topic1 = project().topicConversations[0];
    expect(topic1.turns.map((t) => t.turnId)).toEqual(['t1q1', 't1q2', 't1q3', 'further1', 'further2']);

    const [further1, further2] = topic1.turns.slice(3);
    expect(further1.questionPrompt).toBe('Tu as mentionné « un grand parc ». Pourquoi ?');
    expect(further1.candidateResponse).toBe('Parce que je joue au foot là-bas.');
    expect(further1.candidateResponseDurationS).toBe(6);
    expect(further1.inputMode).toBe('speech');
    expect(further1.examinerSupport).toBeUndefined();
    expect(further2.questionPrompt).toBe('Que fais-tu le week-end ?');
    expect(further2.candidateResponse).toBe('Je vais au cinéma avec mes amis.');
    expect(further2.candidateResponseDurationS).toBe(7);
  });

  it('emits no further turns for a part where none was asked', () => {
    const topic2 = project().topicConversations[1];
    expect(topic2.turns.map((t) => t.turnId)).toEqual(['t2q1']);
  });

  it('lands repeat, alternative, second-part and extension events on the right turn', () => {
    const turns = project().topicConversations[0].turns;
    const byId = (id: string) => turns.find((t) => t.turnId === id)?.examinerSupport;

    expect(byId('t1q1')).toEqual({
      repetitions: 0,
      alternativeAsked: null,
      secondPartAsked: null,
      extensionPrompts: 1,
    });
    expect(byId('t1q2')).toEqual({
      repetitions: 1,
      alternativeAsked: 'Où voudrais-tu aller en vacances ?',
      secondPartAsked: null,
      extensionPrompts: 0,
    });
    expect(byId('t1q3')).toEqual({
      repetitions: 0,
      alternativeAsked: null,
      secondPartAsked: 'Pourquoi ?',
      extensionPrompts: 0,
    });
  });

  it('does not count a further question as an extension prompt on the last scripted turn', () => {
    const t1q3 = project().topicConversations[0].turns.find((t) => t.turnId === 't1q3');
    expect(t1q3?.examinerSupport?.extensionPrompts).toBe(0);
  });

  it('gives role-play tasks secondPartPrompt and repetitions', () => {
    const [rp1, rp2] = project().rolePlay;
    expect(rp1.secondPartPrompt).toBe('Et pour combien de personnes ?');
    expect(rp1.repetitions).toBe(1);
    expect(rp2.secondPartPrompt).toBeUndefined();
    expect(rp2.repetitions).toBe(0);
  });
});
