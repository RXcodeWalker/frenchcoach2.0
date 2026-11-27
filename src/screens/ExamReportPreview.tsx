import { useState } from 'react';
import { ExamResults } from './exam/ExamResults';
import { ExamMarkingScreen } from './exam/ExamMarkingScreen';
import type { EnvelopeView } from '../domain/igcse/envelope/envelopeView';
import type { SessionTranscript } from '../domain/igcse/stt/types';
import type { ExamFeedbackReport } from '../domain/examFeedback/types';
import { COMM_10_12, QOL_10_12, RP_MARK_1, RP_MARK_2 } from '../domain/igcse/canonical';
import { examFacts } from '../features/exam/report/examReport';

/**
 * DEV-ONLY (`/debug/exam-report`): the exam results screen and the marking
 * wait with hand-written sample marks and a sample report, so the layout can
 * be checked without running a whole exam. Never a real assessment.
 */

const ANSWERS: [string, string, string, string][] = [
  ['rolePlay', 'rp1', 'Bonjour, vous désirez ?', 'Je voudrais un billet pour Paris, s’il vous plaît.'],
  ['rolePlay', 'rp2', 'Pour quand ?', 'Je partir demain matin.'],
  ['rolePlay', 'rp3', 'Aller simple ou aller-retour ?', 'Aller-retour.'],
  ['rolePlay', 'rp4', 'Vous voyagez avec qui ?', 'Avec ma famille, mes parents et mon frère.'],
  ['rolePlay', 'rp5', 'Qu’est-ce que vous allez faire à Paris ?', 'Nous allons visiter la tour Eiffel et manger dans un restaurant.'],
  ['topic1', 'topic1:q1', 'Qu’est-ce que tu fais pendant ton temps libre ?', 'Je faire du sport avec mes amis et j’écoute le musique, parce que c’est relaxant.'],
  ['topic1', 'topic1:q2', 'Qu’est-ce que tu as fait le week-end dernier ?', 'Le week-end dernier, je suis allé au cinéma avec mon frère et nous avons vu un film d’action.'],
  ['topic1', 'topic1:further1', 'Tu préfères le sport ou la musique ?', 'Je préfère le sport parce que je suis plus actif.'],
  ['topic2', 'topic2:q1', 'Décris ton école.', 'Mon école est grande et moderne. Il y a beaucoup de élèves.'],
  ['topic2', 'topic2:q2', 'Qu’est-ce que tu vas faire l’année prochaine ?', 'L’année prochaine, je vais étudier les sciences au lycée.'],
];

const VIEW: EnvelopeView = {
  attemptId: 'preview',
  sessionId: 'preview-session',
  scoredAt: '2026-11-27T10:00:00.000Z',
  contentProvenance: 'original-practice',
  versions: {
    envelopeSchemaVersion: 'envelope-v0.5',
    rubricVersion: 'rubric-v0.1',
    scoringEngineVersion: 'preview',
    evidenceDetectorVersion: 'preview',
    scoringPromptVersion: 'preview',
    guardrailsVersion: 'preview',
    calibrationVersion: 'none',
    gradeBoundarySeries: 'none',
  } as EnvelopeView['versions'],
  llm: { provider: 'gemini', model: 'preview', selfConsistencyRuns: 1 },
  transcriptConfidence: { meanWordConfidence: 0.92, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 1, userCorrected: false },
  total: 27,
  criteria: [
    { criterion: 'rolePlayTask', taskId: 'rp1', mark: 2, confidence: 'unassessed', justification: RP_MARK_2[0], evidenceSpans: [] },
    { criterion: 'rolePlayTask', taskId: 'rp2', mark: 1, confidence: 'unassessed', justification: RP_MARK_1[0], evidenceSpans: [] },
    { criterion: 'rolePlayTask', taskId: 'rp3', mark: 2, confidence: 'unassessed', justification: RP_MARK_2[0], evidenceSpans: [] },
    { criterion: 'rolePlayTask', taskId: 'rp4', mark: 2, confidence: 'unassessed', justification: RP_MARK_2[0], evidenceSpans: [] },
    { criterion: 'rolePlayTask', taskId: 'rp5', mark: 1, confidence: 'unassessed', justification: RP_MARK_1[0], evidenceSpans: [] },
    {
      criterion: 'communication',
      mark: 11,
      band: { min: 10, max: 12, label: 'Good' },
      confidence: 'unassessed',
      justification: COMM_10_12[0],
      evidenceSpans: [{ source: 'topic1', quote: 'parce que c’est relaxant' }],
    },
    {
      criterion: 'qualityOfLanguage',
      mark: 8,
      band: { min: 7, max: 9, label: 'Satisfactory' },
      confidence: 'unassessed',
      justification: QOL_10_12[0],
      evidenceSpans: [],
      errors: [
        { source: 'topic1', turnId: 'q1', quote: 'Je faire', correction: 'Je fais' },
        { source: 'topic1', turnId: 'q1', quote: 'le musique', correction: 'la musique' },
        { source: 'topic2', turnId: 'q1', quote: 'beaucoup de élèves', correction: 'beaucoup d’élèves' },
      ],
    },
  ],
  guardrailTriggers: [],
  evidenceGroups: ANSWERS.map(([part, id, prompt, answer]) => ({
    part: part as 'rolePlay' | 'topic1' | 'topic2',
    questionOrTaskId: id,
    prompt,
    candidateResponse: answer,
    ...(part === 'rolePlay' ? {} : { wordCount: answer.split(/\s+/).length }),
  })),
  typedTurnCount: 0,
};

const REPORT: ExamFeedbackReport = {
  feedbackVersion: 'exam-feedback-v0.2',
  rolePlay: {
    tasks: [
      { taskId: 'rp1', reason: 'You asked for the ticket clearly and politely.', quote: 'Je voudrais un billet pour Paris', error: null },
      {
        taskId: 'rp2',
        reason: 'The day came across, but the verb made it unclear who was leaving.',
        quote: 'Je partir demain matin',
        error: { quote: 'Je partir', correction: 'Je pars', category: 'verb_form' },
      },
      { taskId: 'rp5', reason: 'You named two plans, but the task asked for one more detail.', quote: 'visiter la tour Eiffel', error: null },
    ],
    strengths: [{ claim: 'Your requests were polite and natural.', quote: 'Je voudrais un billet pour Paris, s’il vous plaît', ref: 'rp1' }],
    nextStep: { claim: 'Check every verb is conjugated, not left in the infinitive.', quote: 'Je partir demain matin', ref: 'rp2', targetDescriptor: RP_MARK_2[0], targetSource: 'TN p.10' },
  },
  communication: {
    strengths: [{ claim: 'You gave a reason for your opinion.', quote: 'parce que c’est relaxant', ref: 'topic1:q1' }],
    nextStep: { claim: 'Add an example after each opinion, then say how you felt.', quote: null, ref: null, targetDescriptor: COMM_10_12[0], targetSource: 'TN p.11' },
  },
  qualityOfLanguage: {
    strengths: [{ claim: 'You used the perfect tense correctly with être.', quote: 'je suis allé au cinéma', ref: 'topic1:q2' }],
    errors: [
      { errorIndex: 0, source: 'topic1', turnId: 'q1', quote: 'Je faire', correction: 'Je fais', category: 'verb_form' },
      { errorIndex: 1, source: 'topic1', turnId: 'q1', quote: 'le musique', correction: 'la musique', category: 'gender' },
      { errorIndex: 2, source: 'topic2', turnId: 'q1', quote: 'beaucoup de élèves', correction: 'beaucoup d’élèves', category: 'other' },
    ],
    soundAlikeNotes: [],
    nextStep: { claim: 'Learn the gender with each new noun: la musique, le sport.', quote: 'le musique', ref: 'topic1:q1', targetDescriptor: QOL_10_12[0], targetSource: 'TN p.12' },
  },
};

const TRANSCRIPT = {
  sessionId: 'preview-session',
  stt: { provider: 'groq-whisper' },
  utterances: ANSWERS.flatMap(([part, , prompt, answer], i) => [
    { utteranceId: `e${i}`, role: 'examiner', part, text: prompt, startS: i * 30, endS: i * 30 + 4 },
    { utteranceId: `c${i}`, role: 'candidate', part, text: answer, startS: i * 30 + 5, endS: i * 30 + 5 + answer.split(/\s+/).length * 0.8 },
  ]),
} as unknown as SessionTranscript;

export function ExamReportPreview() {
  const view = new URLSearchParams(window.location.search).get('view');
  const [n, setN] = useState(0);
  if (view === 'marking') {
    return (
      <ExamMarkingScreen
        title="Scoring your session…"
        detail="This can take up to a minute."
        stage="marking"
        facts={examFacts(TRANSCRIPT)}
        onExit={() => {}}
      />
    );
  }
  return (
    <ExamResults
      key={n}
      transcript={TRANSCRIPT}
      envelopeView={VIEW}
      scoringError={null}
      onRetryScoring={() => {}}
      onRetake={() => setN((k) => k + 1)}
      onHome={() => {}}
      coached={false}
      railEntries={[]}
      requestFeedback={() => new Promise((r) => setTimeout(() => r(REPORT), 1200))}
      previousExam={{ date: '2026-11-13T10:00:00.000Z', marks: { rolePlay: 6, rolePlayMax: 10, communication: 9, qualityOfLanguage: 7, total: 22 } }}
      onPractise={() => {}}
    />
  );
}
