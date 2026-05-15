import type { FeedbackV2, SkillProfile, MistakeLog, SkillContext, AvoidanceSignal, Question } from '../../types';

const STORAGE_KEY = "frenchCoach_sde";
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

// ── Internal helpers (copied verbatim from studentDiagnosticEngine.js) ────────

function _classifyGrammarTheme(theme: string): string | null {
  if (theme.includes("ELISION"))     return "elision";
  if (theme.includes("AUXILIARY"))   return "etre_avoir";
  if (theme.includes("NEGATION"))    return "negation";
  if (theme.includes("GENDER") || theme.includes("ADJECTIVE")) return "gender";
  if (theme.includes("PREPOSITION")) return "preposition";
  if (theme.includes("SUBJUNCTIVE")) return "subjunctive";
  if (theme.includes("SI_CLAUSE"))   return "hypothetical";
  if (theme.includes("RELATIVE"))    return "relative_pron";
  if (theme.includes("COMPARATIVE")) return "comparative";
  if (theme.includes("DEMONSTRATIVE")) return "demonstrative";
  if (theme.includes("CONFUSION"))   return "confusions";
  if (theme.includes("PRONOUN"))     return "grammar";
  return null;
}

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { skills: {} as Record<string, unknown>, sessionsAnalyzed: 0 };
    return JSON.parse(raw);
  } catch { return { skills: {} as Record<string, unknown>, sessionsAnalyzed: 0 }; }
}

function _save(data: unknown) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
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
export function detectAvoidance(transcript: string, question: Question): AvoidanceSignal[] {
  const signals: AvoidanceSignal[] = [];
  const t = transcript.toLowerCase();
  const q = (question.text + ' ' + (question.hint ?? '')).toLowerCase();
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  // Hypothetical / conditional: invited by si, imagine, si tu pouvais, if
  const invitesHypothetical = /\bsi\b|\bimagine\b|\ben rêve\b|\bidéal(e|ement)?\b/i.test(q);
  const hasConditional = /\b(ais|ait|aient|ions|iez)\b/.test(t);
  if (invitesHypothetical && !hasConditional) {
    signals.push({
      skillId: 'hypothetical',
      observation: "This question invited a conditional/hypothetical (si + imparfait) but none appeared in your response.",
      nudge: "Try: 'Si j'avais le choix, j'irais…' or 'Si c'était possible, je voudrais…' — this guarantees Language marks.",
    });
  }

  // Subjunctive: invited at difficulty >= 2 if no subjunctive detected
  const hasSubjunctive = /\b(fasse|soit|puisse|sache|aille|veuille|vaille|il faut que|pour que|bien que|à condition que)\b/i.test(t);
  if (question.difficulty >= 2 && !hasSubjunctive) {
    signals.push({
      skillId: 'subjunctive',
      observation: "At this difficulty level, examiners expect at least one subjunctive attempt.",
      nudge: "Add: 'Il faut que je fasse des efforts…' or 'Je veux que ce soit possible…' — even one correct subjunctive boosts your Language score.",
    });
  }

  // Opinion phrases: expected in most speaking questions
  const hasOpinion = /\b(pense|crois|avis|trouve|semble|estime|selon moi|à mon avis|il me semble)\b/i.test(t);
  if (!hasOpinion && wordCount > 20) {
    signals.push({
      skillId: 'opinion',
      observation: "No opinion markers were detected. Cambridge examiners expect you to express and justify your view.",
      nudge: "Add: 'À mon avis…', 'Je pense que…', or 'Selon moi…' to access Communication marks.",
    });
  }

  // Sentence variety: all sentences starting with Je
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const jeCount = sentences.filter(s => /^(je|j')/i.test(s)).length;
  if (sentences.length >= 3 && jeCount === sentences.length) {
    signals.push({
      skillId: 'connectors',
      observation: "Every sentence starts with 'Je' or 'J''. This is a structural monotony examiners penalise.",
      nudge: "Vary your openers: 'En ce qui me concerne…', 'D'une part…', 'Ce qui est certain, c'est que…'",
    });
  }

  // Response length
  if (wordCount < 30) {
    signals.push({
      skillId: 'word_count',
      observation: `Your response was only ${wordCount} words — well below the IGCSE 40-word minimum for Communication marks.`,
      nudge: "Aim for 50–70 words: give an opinion, a reason, and an example for every question.",
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

export function runAfterSession(feedback: FeedbackV2, avoidanceSignals?: AvoidanceSignal[]) {
  const date = new Date().toISOString();
  const data = _load();
  const skills = (data.skills ?? {}) as Record<string, SkillRecord>;

  // Track specific issues from V2 if available
  const seenSkills = new Set<string>();
  if (feedback.issues) {
    feedback.issues.forEach(issue => {
      const id = _classifyGrammarTheme(issue.category.toUpperCase());
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
    const id = _classifyGrammarTheme(err.theme ?? "");
    if (id && !seenSkills.has(id)) {
      seenSkills.add(id);
      _observe(skills, id, true, date, {
        transcript: "",
        corrected: err.correction
      });
    }
  }

  // Grammar success for unflagged skills when score is good
  if (feedback.scores.overall >= 7) {
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
