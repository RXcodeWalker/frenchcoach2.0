import { useMemo, useState } from 'react';
import { FeedbackExperience } from '../features/feedback/FeedbackExperience';
import type { CoachingIssue, FeedbackV2 } from '../types';

/**
 * DEV-ONLY (`/debug/feedback`): the Learn feedback screen with hand-written
 * sample feedback, so its design can be reviewed without spending a daily
 * answer. Never routed in production (see `routing/screens.ts`).
 */

const TRANSCRIPT =
  "Le week-end dernier je suis allé au cinéma avec mes amis parce que c'est très amusant. Mon mère était contente et nous avons mangé des pizza. Ensuite on a regardé un film d'horreur, mais je pense que c'était un peu nul. Le week-end prochain je vais aller au parc.";

function issue(
  id: string,
  quote: string,
  correction: string,
  marksImpact: CoachingIssue['marksImpact'],
  extra: Partial<CoachingIssue> = {},
): CoachingIssue {
  return { id, category: 'grammar', severity: 'major', quote, diagnostic: '', correction, marksImpact, ...extra };
}

const RICH: FeedbackV2 = {
  // eslint-disable-next-line no-restricted-syntax -- dev-only sample feedback for /debug/feedback, never a real assessment
  scores: { overall: 6.8, communication: 7.5, language: 6, fluency: 6.5 },
  grammar: { critical: [], polish: [] },
  vocabulary: [],
  vocabularyV2: [
    {
      basic: 'très amusant',
      tier: 'weak',
      upgrades: [
        { phrase: 'vraiment génial', nuance: 'stronger and more natural', level: 'B1' },
        { phrase: 'super divertissant', nuance: 'precise: entertaining', level: 'B1' },
      ],
    },
    {
      basic: 'un peu nul',
      tier: 'decent',
      upgrades: [{ phrase: 'plutôt décevant', nuance: 'more precise and polite', level: 'B1' }],
    },
  ],
  style: [],
  fillers: [],
  wordCount: 52,
  cefrLevel: 'B1',
  pronunciation: { score: null, issues: [] },
  schemaVersion: 2,
  responseTier: 3,
  effectiveDepth: 'standard',
  encouragement: 'You told a real story here, from « Le week-end dernier » right through to next weekend — that range is exactly what examiners listen for.',
  strengths: [
    { quote: 'Le week-end dernier je suis allé au cinéma', why: 'You set the scene in the past with the passé composé.' },
    { quote: 'je pense que', why: 'You gave your own opinion clearly.' },
    { quote: 'Le week-end prochain je vais aller', why: 'You moved to the future with aller + infinitive.' },
  ],
  best_moment: 'Your « Le week-end prochain je vais aller au parc » adds a future time frame.',
  biggest_opportunity: 'Give a second reason for your opinion of the film, with « parce que » or « car ».',
  expansion_ideas: [
    'Say which film you saw and who was in it.',
    'Add what you would do differently next time, with « Si j’avais le choix, je… ».',
  ],
  improved_answer:
    "Le week-end dernier, je suis allé au cinéma avec mes amis parce que c'est vraiment génial. Ma mère était contente et nous avons mangé des pizzas. Ensuite, nous avons regardé un film d'horreur, mais je pense que c'était plutôt décevant. Le week-end prochain, je vais aller au parc.",
  changes: [
    { quote: 'Mon mère', quoteContext: 'Mon mère était', category: 'grammar', explanation: '« mère » is feminine, so it takes « ma ».' },
    { quote: 'des pizza', quoteContext: 'mangé des pizza', category: 'grammar', explanation: 'After « des » the noun is plural: pizzas.' },
  ] as unknown as FeedbackV2['changes'],
  issues: [
    issue('gender', 'Mon mère', 'Ma mère', 3, {
      diagnostic: '« mère » is feminine, so the possessive is « ma ».',
      themeLabel: 'Gender',
      mini_lesson: {
        title: 'Mon, ma, mes',
        rule: 'The possessive agrees with the noun owned, not the owner.',
        examples: ['ma mère', 'mon père', 'mes parents'],
        common_mistake: 'mon mère',
        practice: 'Say: « ___ sœur est plus âgée que moi. »',
      },
    }),
    issue('plural', 'des pizza', 'des pizzas', 2, {
      diagnostic: 'After « des », the noun is plural.',
      themeLabel: 'Agreement',
      category: 'agreement',
    }),
    issue('on', 'on a regardé', 'nous avons regardé', 1, {
      diagnostic: 'You started with « nous »; keep the same subject.',
      themeLabel: 'Consistency',
      severity: 'minor',
    }),
    issue('comma', 'Le week-end prochain je', 'Le week-end prochain, je', 0, {
      diagnostic: 'A comma after a time phrase that opens the sentence.',
      themeLabel: 'Punctuation',
      severity: 'polish',
    }),
  ],
  topPriorityIssueId: 'gender',
  transcriptAnnotations: [],
  examiner: { predictedBand: 'Core-Secure', oneLiner: 'A clear, developed answer across three time frames.', notebook: '', marksGuidance: '' },
  engineMeta: { actualEngine: 'groq', fallbackUsed: false, latencyMs: 4200, evaluatedAt: new Date().toISOString() } as FeedbackV2['engineMeta'],
} as unknown as FeedbackV2;

// Spans over the transcript for the marked-up script.
function withSpans(fb: FeedbackV2, transcript: string): FeedbackV2 {
  const spans = (fb.issues ?? []).flatMap((i) => {
    const start = transcript.indexOf(i.quote);
    return start < 0 ? [] : [{ start, end: start + i.quote.length, severity: i.severity, category: i.category, issueId: i.id }];
  });
  return { ...fb, gradedTranscript: transcript, transcriptAnnotations: spans };
}

const CLEAN_TRANSCRIPT =
  "Je joue au football tous les samedis avec mon frère parce que c'est bon pour la santé. L'année dernière, nous avons gagné un tournoi, et à l'avenir j'aimerais jouer dans une équipe plus grande.";

const CLEAN: FeedbackV2 = {
  ...RICH,
  // eslint-disable-next-line no-restricted-syntax -- dev-only sample feedback for /debug/feedback, never a real assessment
  scores: { overall: 8.6, communication: 9, language: 8.5, fluency: 8 },
  wordCount: 36,
  issues: [],
  vocabularyV2: [],
  changes: [],
  encouragement: 'That was confident: « L’année dernière, nous avons gagné un tournoi » is a strong past-tense detail.',
  strengths: [
    { quote: 'parce que c’est bon pour la santé', why: 'You justified your choice.' },
    { quote: 'j’aimerais jouer', why: 'You used the conditional for an ambition.' },
  ],
  improved_answer: CLEAN_TRANSCRIPT,
  biggest_opportunity: 'Add a comparison, for example « plus… que » about your old team.',
} as unknown as FeedbackV2;

const SCENARIOS = {
  rich: { label: 'Several fixes', feedback: withSpans(RICH, TRANSCRIPT), transcript: TRANSCRIPT },
  clean: { label: 'No mistakes', feedback: withSpans(CLEAN, CLEAN_TRANSCRIPT), transcript: CLEAN_TRANSCRIPT },
} as const;

export function FeedbackPreview() {
  const [key, setKey] = useState<keyof typeof SCENARIOS>('rich');
  const [loading, setLoading] = useState(false);
  const [n, setN] = useState(0);
  const s = SCENARIOS[key];
  // A fresh object per run so the reveal plays again.
  const feedback = useMemo(() => (loading ? null : { ...s.feedback }), [s, loading, n]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]).map((k) => (
          <button key={k} type="button" onClick={() => { setKey(k); setN((x) => x + 1); }} className="rounded-full surface-recessed px-3 py-1">
            {SCENARIOS[k].label}
          </button>
        ))}
        <button type="button" onClick={() => setLoading((l) => !l)} className="rounded-full surface-recessed px-3 py-1">
          {loading ? 'Show feedback' : 'Show the wait'}
        </button>
      </div>
      <FeedbackExperience
        feedback={feedback}
        streamPhase={loading ? 'generating' : 'complete'}
        transcript={s.transcript}
        modelAnswer="Le week-end dernier, je suis allé voir un film d'action avec mes cousins. À mon avis, c'était passionnant parce que les effets spéciaux étaient incroyables."
        onRetry={() => setN((x) => x + 1)}
        onComplete={() => setN((x) => x + 1)}
        demands={{ cognitiveDemand: 'describe', timeFrames: ['past'] } as never}
        learnerName="Alex"
        nextQuestion="Qu'est-ce que tu vas faire le week-end prochain ?"
        firsts={[]}
      />
    </div>
  );
}
