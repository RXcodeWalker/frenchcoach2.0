import type { FeedbackV2, SkillProfile, MistakeLog, SkillContext, AvoidanceSignal, Question, DifficultyEvalExpectations } from '../../types';
import { DEFAULT_DIFFICULTY, DIFFICULTY_CONFIG } from '../../utils/difficultyConfig';
import { STORAGE_KEYS } from '../persistence/storage';
import { nodeForGrammarTheme } from '../../domain/igcse/evidence/framework/nodeMap';
import { LANGUAGE_SUCCESS_SCORE } from '../../domain/scoring';

const STORAGE_KEY = STORAGE_KEYS.diagnosticSDE;
const HALF_LIFE_DAYS = 14;
const LAMBDA = Math.log(2) / HALF_LIFE_DAYS;

export const SKILL_DEFS: Record<string, { name: string; desc: string; category: string; icon: string }> = {
  elision:       { name: "Elision",              desc: "j'aime not je aime",           category: "grammar",    icon: "📎" },
  etre_avoir:    { name: "Être vs Avoir",         desc: "auxiliary verb selection",      category: "grammar",    icon: "⚙️" },
  contraction:   { name: "Contractions",          desc: "au, du, aux required",          category: "grammar",    icon: "🔗" },
  negation:      { name: "Negation",              desc: "ne … pas both parts",           category: "grammar",    icon: "🚫" },
  tense_past:    { name: "Past Tense",            desc: "passé composé / imparfait",     category: "grammar",    icon: "⏮" },
  tense_future:  { name: "Future / Conditional",  desc: "futur simple / conditionnel",   category: "grammar",    icon: "⏭" },
  preposition:   { name: "Prepositions",          desc: "beaucoup de, pour + infinitif", category: "grammar",    icon: "📐" },
  gender:        { name: "Gender Agreement",      desc: "masculine vs feminine",         category: "grammar",    icon: "🚻" },
  subjunctive:   { name: "Subjunctive",           desc: "il faut que + subjunctive",     category: "grammar",    icon: "✨" },
  hypothetical:  { name: "Hypotheticals",         desc: "si + imparfait + conditionnel", category: "grammar",    icon: "🔮" },
  relative_pron: { name: "Relative Pronouns",     desc: "qui, que, dont, où",            category: "grammar",    icon: "🔀" },
  comparative:   { name: "Comparatives",          desc: "plus que, moins que, mieux",    category: "grammar",    icon: "⚖️" },
  demonstrative: { name: "Demonstratives",        desc: "ce, cette, celui-ci",           category: "grammar",    icon: "👈" },
  confusions:    { name: "Common Confusions",     desc: "mieux/meilleur, bien/bon",      category: "grammar",    icon: "🤔" },
  word_count:    { name: "Response Length",       desc: "aim for 40+ words",             category: "structure",  icon: "📏" },
  connectors:    { name: "Connective Words",      desc: "d'abord, ensuite, enfin…",      category: "structure",  icon: "🔄" },
  opinion:       { name: "Opinion Phrases",       desc: "à mon avis, selon moi…",        category: "structure",  icon: "💭" },
  contrast:      { name: "Contrast Words",        desc: "cependant, en revanche…",       category: "structure",  icon: "↔️" },
  vocab_range:   { name: "Vocabulary Range",      desc: "upgrade beyond basic words",    category: "vocabulary", icon: "📚" },
  repetition:    { name: "Word Repetition",       desc: "avoid repeating same words",    category: "vocabulary", icon: "🔁" },
  fluency_score: { name: "Overall Fluency",       desc: "smoothness and flow",           category: "fluency",    icon: "🎙" },
  pronunciation: { name: "Pronunciation",         desc: "clarity of speech sounds",      category: "fluency",    icon: "🗣" },
};

// ── Internal helpers ────────────────────────────────────────────────────────
// Theme classification now delegates to the canonical nodeMap (domain/igcse/
// evidence/framework/nodeMap.ts) instead of a private copy — see
// i-am-building-an-cosmic-cascade.md Phase 2 / Resolved Decisions.

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { skills: {} as Record<string, unknown>, sessionsAnalyzed: 0 };
    return JSON.parse(raw);
  } catch { return { skills: {} as Record<string, unknown>, sessionsAnalyzed: 0 }; }
}

function _save(data: unknown) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota exceeded — degrade silently */ }
}

function _weight(dateISO: string) {
  const daysSince = (Date.now() - new Date(dateISO).getTime()) / 86400000;
  return Math.exp(-LAMBDA * Math.max(0, daysSince));
}

function _computeMastery(wErrors: number, wObs: number) {
  if (wObs < 0.001) return 50;
  return Math.round((1 - Math.min(1, wErrors / wObs)) * 100);
}

function _computeTrend(recentScores: number[]): string {
  if (recentScores.length < 4) return "new";
  const mid = Math.floor(recentScores.length / 2);
  const oldAvg = recentScores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const newAvg = recentScores.slice(mid).reduce((a, b) => a + b, 0) / (recentScores.length - mid);
  if (newAvg - oldAvg > 0.1) return "improving";
  if (oldAvg - newAvg > 0.1) return "declining";
  return "stagnating";
}

function _computeConfidence(n: number) {
  return 1 - 1 / (1 + n * 0.25);
}

interface SkillRecord {
  observations: number; errors: number; wErrors: number; wObs: number;
  recentScores: number[]; lastSeen: string; mastery: number; trend: string; confidence: number;
  mistakes?: MistakeLog[];
}

function _observe(skills: Record<string, SkillRecord>, skillId: string, hadError: boolean, dateISO: string, mistake?: Omit<MistakeLog, 'timestamp' | 'skillId'>) {
  const w = _weight(dateISO);
  if (!skills[skillId]) {
    skills[skillId] = { observations: 0, errors: 0, wErrors: 0, wObs: 0, recentScores: [], lastSeen: dateISO, mastery: 50, trend: "new", confidence: 0, mistakes: [] };
  }
  const s = skills[skillId];
  s.observations++;
  if (hadError) s.errors++;
  s.wErrors += hadError ? w : 0;
  s.wObs    += w;
  s.recentScores.push(hadError ? 0 : 1);
  if (s.recentScores.length > 12) s.recentScores.shift();
  
  if (hadError && mistake) {
    if (!s.mistakes) s.mistakes = [];
    s.mistakes.push({ ...mistake, skillId, timestamp: dateISO });
    if (s.mistakes.length > 5) s.mistakes.shift();
  }

  s.lastSeen   = dateISO;
  s.mastery    = _computeMastery(s.wErrors, s.wObs);
  s.trend      = _computeTrend(s.recentScores);
  s.confidence = _computeConfidence(s.observations);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Serialize the current skill profile into the context shape sent to the backend AI.
 * Top 4 weaknesses by priority + top 3 strengths by mastery.
 */
export function buildSkillContext(): SkillContext {
  const data = _load();
  const rawSkills = (data.skills ?? {}) as Record<string, SkillRecord>;

  const ranked = Object.entries(rawSkills)
    .filter(([id]) => SKILL_DEFS[id])
    .map(([id, s]) => ({
      id,
      ...SKILL_DEFS[id],
      ...s,
      priority: s.confidence * (1 - s.mastery / 100),
    }));

  const weaknesses: SkillContext['weaknesses'] = ranked
    .filter(s => s.mastery < 60 && s.observations >= 2)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
    .map(s => ({
      skillId: s.id,
      name: SKILL_DEFS[s.id].name,
      mastery: s.mastery,
      trend: s.trend as SkillContext['weaknesses'][0]['trend'],
      recurrenceCount: s.errors,
      recentMistake: s.mistakes?.[s.mistakes.length - 1]?.transcript !== '[AVOIDED]'
        ? s.mistakes?.[s.mistakes.length - 1]?.transcript
        : undefined,
    }));

  const strengths: SkillContext['strengths'] = ranked
    .filter(s => s.mastery >= 85 && s.confidence > 0.4)
    .sort((a, b) => (b.mastery * b.confidence) - (a.mastery * a.confidence))
    .slice(0, 3)
    .map(s => ({ skillId: s.id, name: SKILL_DEFS[s.id].name }));

  return {
    weaknesses,
    strengths,
    sessionsAnalyzed: data.sessionsAnalyzed ?? 0,
    avoidanceFlags: [],
  };
}

/**
 * Detect what structures the student did NOT attempt, given what the question invited.
 * Returns AvoidanceSignal[] describing the gap.
 */
// Topic-aware nudges: check question keywords and flag missing content
interface TopicNudge {
  keywords: RegExp;
  missingCheck: (t: string) => boolean;
  observation: string;
  nudge: string;
}

const TOPIC_NUDGES: TopicNudge[] = [
  {
    keywords: /\b(école|lycée|collège|cours|classe|scolaire)\b/i,
    missingCheck: (t) => !/\b(matière|prof|camarade|devoir|récré|emploi du temps|note|classe|cours)\b/i.test(t),
    observation: "You described your school but didn't mention subjects, teachers, or classmates.",
    nudge: "Add: 'Ma matière préférée est… parce que le professeur est…' — specific details earn Communication marks.",
  },
  {
    keywords: /\b(famille|parents|frères?|sœurs?|chez moi|maison)\b/i,
    missingCheck: (t) => !/\b(entends|relation|proche|ensemble|vivre|habite|maison|appartement|sympa)\b/i.test(t),
    observation: "You mentioned your family but didn't describe your relationships or home life.",
    nudge: "Try: 'Je m'entends bien avec… parce que nous…' — describing relationships adds real depth.",
  },
  {
    keywords: /\b(sport|hobby|loisir|activité|temps libre|passe-temps)\b/i,
    missingCheck: (t) => !/\b(souvent|fois|semaine|parce que|car|depuis|raison|aime|adore|déteste)\b/i.test(t),
    observation: "You named an activity but didn't say how often you do it or why you enjoy it.",
    nudge: "Add frequency and reason: 'Je joue… deux fois par semaine parce que ça me détend.'",
  },
  {
    keywords: /\b(vacances|voyage|pays|visite|partir|aller|destination)\b/i,
    missingCheck: (t) => !/\b(avec|famille|ami|activité|souvenir|mangé|visité|logé|hébergé|météo)\b/i.test(t),
    observation: "You described where you went but didn't mention who you went with or what you did there.",
    nudge: "Try: 'J'y suis allé(e) avec… et nous avons…' — activities and companions unlock Communication marks.",
  },
  {
    keywords: /\b(environnement|planète|réchauffement|écologie|nature|pollution)\b/i,
    missingCheck: (t) => !/\b(solution|geste|peut|faut|devrait|pourrait|recycler|réduire|économiser)\b/i.test(t),
    observation: "You identified an environmental issue but didn't suggest solutions or personal actions.",
    nudge: "Add: 'On pourrait… / Il faudrait que les gens…' — solutions are highly rewarded in this topic.",
  },
  {
    keywords: /\b(technologie|téléphone|internet|réseaux sociaux|portable|ordinateur)\b/i,
    missingCheck: (t) => !/\b(avantage|inconvénient|problème|danger|bénéfice|utile|inutile|trop|dépend)\b/i.test(t),
    observation: "You mentioned technology but didn't weigh its advantages or disadvantages.",
    nudge: "Try: 'D'un côté… mais d'un autre côté…' — balanced opinions push you towards Extended band.",
  },
];

export function detectAvoidance(
  transcript: string,
  question: Question,
  expectations: DifficultyEvalExpectations = DIFFICULTY_CONFIG[DEFAULT_DIFFICULTY].expectations,
): AvoidanceSignal[] {
  const signals: AvoidanceSignal[] = [];
  const t = transcript.toLowerCase();
  const q = (question.text + ' ' + (question.hint ?? '')).toLowerCase();
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  // No avoidance analysis possible on very short responses
  if (wordCount < 5) return [];

  // Topic-aware content suggestions (check question keywords)
  for (const nudge of TOPIC_NUDGES) {
    if (nudge.keywords.test(q) && nudge.missingCheck(t)) {
      signals.push({ skillId: 'connectors', observation: nudge.observation, nudge: nudge.nudge });
      break; // one topic nudge per response
    }
  }

  // Hypothetical / conditional: invited by si, imagine, en rêve, idéal
  const invitesHypothetical = /\bsi\b|\bimagine\b|\ben rêve\b|\bidéal(e|ement)?\b/i.test(q);
  const hasConditional = /\b(ais|ait|aient|ions|iez)\b/.test(t);
  if (invitesHypothetical && !hasConditional) {
    signals.push({
      skillId: 'hypothetical',
      observation: "This question invited a conditional/hypothetical response but you answered in the present tense only.",
      nudge: "Try: 'Si j'avais le choix, j'irais…' or 'Si c'était possible, je voudrais…' — this guarantees Language marks.",
    });
  }

  // Subjunctive: only expected at levels where requireSubjunctive is true
  const hasSubjunctive = /\b(fasse|soit|puisse|sache|aille|veuille|vaille|il faut que|pour que|bien que|à condition que)\b/i.test(t);
  if (expectations.requireSubjunctive && !hasSubjunctive) {
    signals.push({
      skillId: 'subjunctive',
      observation: "At this level, examiners look for at least one subjunctive attempt.",
      nudge: "Add: 'Il faut que je fasse…' or 'Je veux que ce soit possible…' — even one correct subjunctive boosts your Language score.",
    });
  }

  // Connectors: expected at advanced/expert levels for longer answers
  const hasConnectors = /\b(cependant|néanmoins|toutefois|par contre|en revanche|d'ailleurs|en outre|ainsi|de plus|pourtant|en effet|c'est pourquoi)\b/i.test(t);
  if (expectations.requireConnectors && wordCount > 30 && !hasConnectors) {
    signals.push({
      skillId: 'connectors',
      observation: "Your response lacks discourse connectors — examiners expect these at this level.",
      nudge: "Use: 'Cependant…', 'En revanche…', 'De plus…', or 'C'est pourquoi…' to link your ideas and access Language marks.",
    });
  }

  // Tense variety: at least one non-present tense expected
  const hasPastOrFuture = /\b(ai|as|a|avons|avez|ont)\s+\w+é\b|\b(étais|était|avais|avait)\b|\b(ira|irai|ferai|serai|pourrai|voudrai)\b/i.test(t);
  if (expectations.requirePastTense && !hasPastOrFuture) {
    signals.push({
      skillId: 'tense_past',
      observation: "Your answer uses only the present tense — examiners expect tense variety at this level.",
      nudge: "Add a past reference ('Quand j'étais jeune…' / 'L'année dernière…') or a future one ('Dans l'avenir…') to access Language marks.",
    });
  }

  // Multiple perspectives: expected at expert level
  const hasPerspective = /\b(d'un côté|d'autre part|certes|en revanche|il est vrai que|certains pensent|d'autres estiment|cependant|toutefois)\b/i.test(t);
  if (expectations.requireMultiplePerspectives && !hasPerspective) {
    signals.push({
      skillId: 'opinion',
      observation: "At this level, examiners expect you to consider more than one perspective or counterargument.",
      nudge: "Use: 'D'un côté… mais d'un autre côté…', 'Certes… cependant…', or 'Il est vrai que… néanmoins…'",
    });
  }

  // Justification depth: expected at advanced/expert levels
  const hasJustification = /\b(parce que|car|puisque|étant donné|vu que|grâce à|en raison de|c'est pourquoi)\b/i.test(t);
  if (expectations.requireDetailedJustification && !hasJustification && wordCount > 15) {
    signals.push({
      skillId: 'opinion',
      observation: "You gave an opinion but didn't justify it — examiners expect a reason at this level.",
      nudge: "Add 'parce que…' or 'car…' followed by a specific reason or example to access Communication marks.",
    });
  }

  // Opinion: expected in most questions — quote what they DID say in the observation
  const hasOpinion = /\b(pense|crois|avis|trouve|semble|estime|selon moi|à mon avis|il me semble)\b/i.test(t);
  if (!hasOpinion && wordCount > 20) {
    const firstClause = transcript.split(/[.!?,]+/)[0]?.trim() ?? '';
    const preview = firstClause.length > 45 ? firstClause.slice(0, 45) + '…' : firstClause;
    signals.push({
      skillId: 'opinion',
      observation: preview
        ? `You stated '${preview}' but didn't give a personal opinion on the topic.`
        : "No opinion markers were detected. Cambridge examiners expect you to express and justify your view.",
      nudge: "Add: 'À mon avis…', 'Je pense que…', or 'Selon moi…' followed by a reason to access Communication marks.",
    });
  }

  // Sentence variety: all sentences starting with Je/J' (only if 3+ sentences)
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const jeCount = sentences.filter(s => /^(je|j')/i.test(s)).length;
  if (sentences.length >= 3 && jeCount === sentences.length) {
    signals.push({
      skillId: 'connectors',
      observation: "Every sentence starts with 'Je' or 'J'' — examiners penalise structural monotony.",
      nudge: "Vary your openers: 'En ce qui me concerne…', 'Ce qui est certain, c'est que…', or 'D'une part…'",
    });
  }

  // Word count: fire when below the tier's first threshold
  if (wordCount < expectations.wordCountTier1) {
    signals.push({
      skillId: 'word_count',
      observation: `Your response was only ${wordCount} words — too short for Communication marks at this level (minimum ~${expectations.wordCountTier2} words).`,
      nudge: "Aim to state an opinion, give a reason, and add an example for every question.",
    });
  }

  return signals;
}

/**
 * Returns a 1-2 sentence coaching narrative based on top weakness and strength.
 * Used by PersonalizedContextBanner.
 */
export function generateCoachingNarrative(): string {
  const data = _load();
  const rawSkills = (data.skills ?? {}) as Record<string, SkillRecord>;

  const ranked = Object.entries(rawSkills)
    .filter(([id]) => SKILL_DEFS[id])
    .map(([id, s]) => ({ id, ...s }));

  const topWeakness = ranked
    .filter(s => s.mastery < 60 && s.observations >= 3)
    .sort((a, b) => (b.confidence * (1 - b.mastery / 100)) - (a.confidence * (1 - a.mastery / 100)))[0];

  const topStrength = ranked
    .filter(s => s.mastery >= 80 && s.confidence > 0.3)
    .sort((a, b) => b.mastery - a.mastery)[0];

  const weakPart = topWeakness
    ? `Your persistent challenge is ${SKILL_DEFS[topWeakness.id]?.name ?? topWeakness.id} (flagged ${topWeakness.errors} times).`
    : "Keep building accuracy across all skill areas.";

  const strongPart = topStrength
    ? ` Strong progress on ${SKILL_DEFS[topStrength.id]?.name ?? topStrength.id} — keep it up.`
    : "";

  return weakPart + strongPart;
}

/**
 * B2: the replacement writer for frenchCoach_sde.
 *
 * Phase 2 removed the only caller of runAfterSession, leaving this store with
 * no writer at all — frozen and empty for every new user, while five screens
 * still dispatch UPDATE_SKILL_PROFILE with an unchanging value. The coach's
 * evidence-derived belief snapshot is now the source (see
 * coach/skillProfileProjection.ts); this function persists that projection in
 * the store's existing on-disk shape so getSkillProfile(), getReport() and
 * buildSkillContext() keep reading it unchanged.
 *
 * Overwrites rather than appends: the profile is a derived cache, always
 * rebuildable from the evidence log (invariant I9), and is bounded by the
 * ~22 SKILL_DEFS ids so it cannot grow without limit.
 *
 * Fields the SkillProfile shape does not carry (errors, wErrors/wObs,
 * recentScores, mistakes) are preserved from the existing record where one
 * exists, so historical mistake examples survive the write.
 */
export function writeSkillProfile(profile: SkillProfile): void {
  const date = new Date().toISOString();
  const data = _load();
  const skills = (data.skills ?? {}) as Record<string, SkillRecord>;

  for (const [id, entry] of Object.entries(profile)) {
    if (!SKILL_DEFS[id]) continue;
    const prev = skills[id];
    skills[id] = {
      // Carry forward the fields the projection cannot reconstruct.
      errors:       prev?.errors ?? 0,
      wErrors:      prev?.wErrors ?? 0,
      wObs:         prev?.wObs ?? 0,
      recentScores: entry.recentScores ?? prev?.recentScores ?? [],
      mistakes:     prev?.mistakes ?? [],
      trend:        prev?.trend ?? 'new',
      // Evidence-derived values.
      observations: entry.feedbackCount,
      mastery:      Math.round(entry.score * 100),
      lastSeen:     entry.lastSeen > 0 ? new Date(entry.lastSeen).toISOString() : (prev?.lastSeen ?? date),
      confidence:   _computeConfidence(entry.feedbackCount),
    };
  }

  data.skills = skills;
  data.lastUpdated = date;
  _save(data);
}

/**
 * @deprecated Dead since Phase 2 — zero callers in src/. The dual-write from
 * the coach layer to this engine was removed when beliefs became
 * evidence-derived; writeSkillProfile above is the live path. Kept (not
 * deleted) so the observation model stays available if a future subphase needs
 * it. Do not re-wire it: doing so would resurrect the dual-write.
 */
export function runAfterSession(feedback: FeedbackV2, avoidanceSignals?: AvoidanceSignal[]) {
  const date = new Date().toISOString();
  const data = _load();
  const skills = (data.skills ?? {}) as Record<string, SkillRecord>;

  // Track specific issues from V2 if available
  const seenSkills = new Set<string>();
  if (feedback.issues) {
    feedback.issues.forEach(issue => {
      const id = nodeForGrammarTheme(issue.category.toUpperCase());
      if (id) {
        seenSkills.add(id);
        _observe(skills, id, true, date, {
          transcript: issue.quote || (feedback.wordCount > 0 ? "..." : ""),
          corrected: issue.correction
        });
      }
    });
  }

  // Grammar errors (legacy check for safety)
  const grammarErrors = [...(feedback.grammar.critical ?? []), ...(feedback.grammar.polish ?? [])];
  for (const err of grammarErrors) {
    const id = nodeForGrammarTheme(err.theme ?? "");
    if (id && !seenSkills.has(id)) {
      seenSkills.add(id);
      _observe(skills, id, true, date, {
        transcript: "",
        corrected: err.correction
      });
    }
  }

  // Grammar success for unflagged skills when score is good
  if (feedback.scores.overall >= LANGUAGE_SUCCESS_SCORE) {
    ["elision", "etre_avoir", "contraction", "negation", "gender"].forEach(id => {
      if (!seenSkills.has(id)) _observe(skills, id, false, date);
    });
  }

  // Word count
  _observe(skills, "word_count", feedback.wordCount < 40, date);

  // Fluency
  _observe(skills, "fluency_score", feedback.scores.overall < 6, date);

  // Vocabulary
  if (feedback.vocabulary && feedback.vocabulary.length >= 2) {
    _observe(skills, "vocab_range", true, date);
  } else if (feedback.scores.overall >= 8) {
    _observe(skills, "vocab_range", false, date);
    _observe(skills, "repetition", false, date);
  }

  // Avoidance signals: treat avoided structures as errors to prevent false mastery
  if (avoidanceSignals) {
    for (const signal of avoidanceSignals) {
      if (!seenSkills.has(signal.skillId)) {
        _observe(skills, signal.skillId, true, date, {
          transcript: '[AVOIDED]',
          corrected: signal.nudge,
        });
      }
    }
  }

  data.skills = skills;
  data.sessionsAnalyzed = (data.sessionsAnalyzed ?? 0) + 1;
  data.lastUpdated = date;
  _save(data);
}

export function getSkillProfile(): SkillProfile {
  const data = _load();
  const rawSkills = (data.skills ?? {}) as Record<string, SkillRecord>;
  const profile: SkillProfile = {};

  for (const [id, s] of Object.entries(rawSkills)) {
    if (!SKILL_DEFS[id]) continue;
    const score = s.mastery / 100;
    const mastery = score >= 0.85 ? "mastered" : score >= 0.6 ? "practiced" : score >= 0.3 ? "learning" : "unknown";
    profile[id] = {
      name:          SKILL_DEFS[id].name,
      score,
      lastSeen:      new Date(s.lastSeen).getTime(),
      feedbackCount: s.observations,
      mastery,
      recentScores:  s.recentScores,
      mistakes:      s.mistakes,
    };
  }

  return profile;
}

export function getReport() {
  const data = _load();
  const rawSkills = (data.skills ?? {}) as Record<string, SkillRecord & { id?: string; priority?: number }>;

  if (Object.keys(rawSkills).length === 0) return { hasData: false, sessionsAnalyzed: data.sessionsAnalyzed ?? 0 };

  const skillList = Object.entries(rawSkills)
    .filter(([id]) => SKILL_DEFS[id])
    .map(([id, s]) => ({ 
      id, 
      ...SKILL_DEFS[id], 
      ...s, 
      priority: s.confidence * (1 - s.mastery / 100) 
    }));

  const avgMastery = skillList.length > 0
    ? skillList.reduce((a, b) => a + b.mastery, 0) / skillList.length
    : 50;

  return {
    hasData: true,
    sessionsAnalyzed: data.sessionsAnalyzed ?? 0,
    topWeaknesses: skillList.filter(s => s.mastery < 75 && s.observations >= 2).sort((a, b) => b.priority - a.priority).slice(0, 3),
    topStrengths:  skillList.filter(s => s.mastery >= 85 && s.confidence > 0.4).sort((a, b) => b.mastery * b.confidence - a.mastery * a.confidence).slice(0, 3),
    avgMastery:    Math.round(avgMastery),
    allSkills:     skillList,
  };
}
