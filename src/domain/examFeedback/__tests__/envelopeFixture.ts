/**
 * A real ScoringEnvelope for the exam-report tests, built through the
 * production buildScoringEnvelope from the judgement fixtures, with:
 *  - role-play t3 credited 1 (the fixture's own mark), the rest 2;
 *  - Communication 8 (band 7-9), Quality of Language 14 (top band 13-15);
 *  - two QoL errors: an audible one on topic1:q1 and a spelling-only one
 *    ("c est" -> "c'est") on topic1:q2, a SPOKEN turn.
 */
import { buildEvidenceProfile } from '../../igcse/evidence/buildEvidence';
import { buildValidAssessment, buildValidMainOutput, buildValidQolOutput, PRACTICE_TRANSCRIPT } from '../../igcse/judgement/__tests__/fixtures';
import { buildScoringEnvelope } from '../../igcse/envelope/buildEnvelope';
import type { ScoringEnvelope } from '../../igcse/envelope/types';
import type { SpeakingTranscript } from '../../igcse/judgement/types';
import { QOL_13_15 } from '../../igcse/canonical';

export const FIXTURE_TRANSCRIPT: SpeakingTranscript = {
  ...PRACTICE_TRANSCRIPT,
  topicConversations: [
    {
      ...PRACTICE_TRANSCRIPT.topicConversations[0],
      turns: PRACTICE_TRANSCRIPT.topicConversations[0].turns.map((t) => ({ ...t, inputMode: 'speech' as const })),
    },
    PRACTICE_TRANSCRIPT.topicConversations[1],
  ],
};

/** A fresh deep copy each call, so a test may mutate it without touching the shared judgement fixtures. */
export function buildFixtureEnvelope(): ScoringEnvelope {
  return structuredClone(buildFixtureEnvelopeShared());
}

function buildFixtureEnvelopeShared(): ScoringEnvelope {
  const baseQol = buildValidQolOutput();
  const assessment = buildValidAssessment(
    buildValidMainOutput(),
    buildValidQolOutput({
      errors: [
        ...baseQol.errors,
        { source: 'topic1', turnId: 'q2', quote: 'c est amusant', kind: 'grammar', correction: "c'est amusant" },
      ],
      mark: 14,
      band: { min: 13, max: 15, label: 'Very good' },
      bestFitPlacement: 'adequately',
      descriptorsApplied: [QOL_13_15[0]],
    }),
    FIXTURE_TRANSCRIPT,
  );
  return buildScoringEnvelope({
    attemptId: 'attempt-feedback-1',
    sessionId: 'session-feedback-1',
    scoredAt: '2026-10-03T00:00:00.000Z',
    transcript: FIXTURE_TRANSCRIPT,
    assessment,
    evidenceProfile: buildEvidenceProfile(FIXTURE_TRANSCRIPT),
    stt: {
      model: 'session-engine',
      modelVersion: 'n/a',
      provider: 'session-engine',
      languageCode: 'fr' as const,
      alignmentModel: 'none',
      diarizationModel: 'none',
      decodeParamsHash: 'none',
      confidenceSource: 'whisperx-align-score' as const,
      promptBiasedRetries: 0,
      transcribedAt: '2026-10-03T00:00:00.000Z',
    },
    transcriptVersion: { schemaVersion: 'session-transcript-v1', assemblerVersion: 'stt-assembler-v1' },
    transcriptQuality: { meanWordConfidence: 1, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0 },
    userCorrected: false,
    llm: { provider: 'gemini' as const, model: 'fake', selfConsistencyRuns: 1 as const },
    qualityOfLanguageLlm: { provider: 'gemini' as const, model: 'fake', selfConsistencyRuns: 1 as const },
    versions: {
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'engine-test',
      evidenceDetectorVersion: 'detectors-test',
      scoringPromptVersion: 'scoring-prompt-test',
      guardrailsVersion: 'guardrails-test',
    },
    guardrailTriggers: [],
  });
}

/** A fully valid model reply for buildFixtureEnvelope(). Tests mutate copies of it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a deliberately loose model reply that each test mutates
export function validReply(): Record<string, any> {
  return {
    rolePlay: {
      tasks: [
        { taskId: 't1', reason: 'You greeted the assistant politely, which is exactly what was asked.', quote: 'Bonjour madame', error: null },
        { taskId: 't2', reason: 'You asked for the right item and quantity.', quote: 'Je voudrais deux croissants', error: null },
        {
          taskId: 't3',
          reason: 'The question about the price came across, but the verb form makes it less clear.',
          quote: 'C est combien',
          error: { quote: 'C est combien', correction: "C'est combien ?", category: 'verb_form' },
        },
        { taskId: 't4', reason: 'You said how you would pay, clearly.', quote: 'Je paie par carte', error: null },
        { taskId: 't5', reason: 'A clear thank-you and goodbye ended the exchange.', quote: 'Merci, au revoir', error: null },
      ],
      strengths: [{ claim: 'Your requests were short and to the point.', quote: 'Je voudrais deux croissants', ref: 't2' }],
      nextStep: { claim: 'Check that each answer is a full, correct sentence.', quote: null, ref: null, targetDescriptorId: 'R2' },
    },
    communication: {
      strengths: [{ claim: 'You gave a reason for your preference.', quote: 'parce que c est amusant', ref: 'topic1:q2' }],
      nextStep: {
        claim: 'Add a second reason or an example when you give an opinion.',
        quote: 'Je préfère le sport',
        ref: 'topic1:q2',
        targetDescriptorId: 'C4',
      },
    },
    qualityOfLanguage: {
      strengths: [{ claim: 'You used a past tense to talk about the weekend.', quote: 'joué au football avec mes amis', ref: 'topic1:q1' }],
      errorCategories: [
        { errorIndex: 0, category: 'tense' },
        { errorIndex: 1, category: 'other' },
      ],
      nextStep: { claim: 'Use a wider range of linking words between ideas.', quote: null, ref: null, targetDescriptorId: 'Q2' },
    },
  };
}
