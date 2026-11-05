import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_RULES, evaluateAchievements, type AchievementContext } from '../achievements';

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  score: null,
  streak: 0,
  totalSessions: 0,
  topicsUsed: [],
  beliefSnapshot: null,
  problems: [],
  interventions: [],
  xp: 0,
  roleplayCount: 0,
  examCompleted: false,
  examType: null,
  daysPractised: 0,
  longestAnswerWords: 0,
  improvedOnRepeat: false,
  examImproved: false,
  selfCorrected: false,
  returnedAfterBreak: false,
  ...over,
});

const TOPICS = ['school', 'hobbies', 'family', 'holidays', 'home', 'future', 'food', 'environment'];

describe('evaluateAchievements', () => {
  it('a first counted Exam Sim unlocks both Examinateur and Grand Oral', () => {
    expect(evaluateAchievements(ctx({ examCompleted: true, examType: 'igcse', totalSessions: 1 }), new Set()))
      .toEqual(expect.arrayContaining(['examinateur', 'grand_oral']));
  });

  it('a practice-only exam unlocks Examinateur but not Grand Oral', () => {
    const ids = evaluateAchievements(ctx({ examCompleted: true, examType: 'practice' }), new Set());
    expect(ids).toContain('examinateur');
    expect(ids).not.toContain('grand_oral');
  });

  it('Remontée needs a counted Exam Sim to beat', () => {
    expect(evaluateAchievements(ctx({ examImproved: true }), new Set())).not.toContain('remontee');
    expect(evaluateAchievements(ctx({ examImproved: true }), new Set(['examinateur', 'grand_oral']))).toContain('remontee');
  });

  it('unlocks a whole answer-count chain in one pass', () => {
    expect(evaluateAchievements(ctx({ totalSessions: 50 }), new Set()))
      .toEqual(expect.arrayContaining(['premier_pas', 'dix_sessions', 'marathonien']));
  });

  it('never returns an achievement that is already unlocked', () => {
    expect(evaluateAchievements(ctx({ totalSessions: 10 }), new Set(['premier_pas']))).toEqual(['dix_sessions']);
  });

  it('topic breadth: 3 topics is Curieux, 8 is Polyglotte', () => {
    expect(evaluateAchievements(ctx({ topicsUsed: TOPICS.slice(0, 2) }), new Set())).toEqual([]);
    expect(evaluateAchievements(ctx({ topicsUsed: TOPICS.slice(0, 3) }), new Set())).toEqual(['curieux']);
    expect(evaluateAchievements(ctx({ topicsUsed: TOPICS }), new Set())).toEqual(['curieux', 'polyglotte']);
  });

  it('day counts survive a broken streak', () => {
    const ids = evaluateAchievements(ctx({ streak: 1, daysPractised: 30 }), new Set());
    expect(ids).toEqual(expect.arrayContaining(['regulier', 'fidele']));
    expect(ids).not.toContain('triple_jour');
  });

  it('a developed answer, a repaired slip, a better repeat and a return each unlock their own', () => {
    expect(evaluateAchievements(ctx({ longestAnswerWords: 39 }), new Set())).not.toContain('developpe');
    expect(evaluateAchievements(ctx({ longestAnswerWords: 40 }), new Set())).toContain('developpe');
    expect(evaluateAchievements(ctx({ selfCorrected: true }), new Set())).toContain('autocorrection');
    expect(evaluateAchievements(ctx({ improvedOnRepeat: true }), new Set())).toContain('en_progres');
    expect(evaluateAchievements(ctx({ returnedAfterBreak: true }), new Set())).toContain('le_retour');
  });

  it('every prerequisite comes earlier in the rule list (one pass is enough)', () => {
    const order = ACHIEVEMENT_RULES.map(r => r.id);
    for (const r of ACHIEVEMENT_RULES) {
      for (const req of r.requires ?? []) expect(order.indexOf(req)).toBeLessThan(order.indexOf(r.id));
    }
  });
});

describe('the achievement list', () => {
  it('has a rule for every current achievement and none for a retired one', () => {
    const ruleIds = new Set(ACHIEVEMENT_RULES.map(r => r.id));
    for (const d of ACHIEVEMENT_DEFINITIONS) expect(ruleIds.has(d.id)).toBe(!d.retired);
    expect(ACHIEVEMENT_RULES.length).toBe(ACHIEVEMENT_DEFINITIONS.filter(d => !d.retired).length);
  });

  it('keeps every id a shop item is gated on (shop_items.requirement, shop-economy §6)', () => {
    const SHOP_GATES = ['triple_jour', 'examinateur', 'causeur', 'grammaire_maitrisee', 'probleme_resolu', 'niveau_b2',
      'bete_de_mode', 'semaine_parfaite', 'expert', 'grand_oral', 'fluent', 'perfectionniste', 'drill_master'];
    const live = new Set(ACHIEVEMENT_DEFINITIONS.filter(d => !d.retired).map(d => d.id));
    for (const id of SHOP_GATES) expect(live.has(id), id).toBe(true);
  });

  it('keeps every id once used, so a badge a learner earned never disappears', () => {
    const EVER = ['premier_pas', 'cinq_sessions', 'dix_sessions', 'marathonien', 'triple_jour', 'semaine_parfaite', 'fluent',
      'perfectionniste', 'polyglotte', 'examinateur', 'grand_oral', 'expert', 'bete_de_mode', 'grammaire_maitrisee',
      'probleme_resolu', 'drill_master', 'curieux', 'explorateur', 'causeur', 'niveau_b2'];
    const ids = new Set(ACHIEVEMENT_DEFINITIONS.map(d => d.id));
    for (const id of EVER) expect(ids.has(id), id).toBe(true);
  });

  it('ids are unique', () => {
    expect(new Set(ACHIEVEMENT_DEFINITIONS.map(d => d.id)).size).toBe(ACHIEVEMENT_DEFINITIONS.length);
  });

  it('descriptions say what to do, and none claims a level or grade the app cannot measure', () => {
    for (const d of ACHIEVEMENT_DEFINITIONS) {
      expect(d.description, d.id).not.toMatch(/\b(A1|A2|B1|B2|C1|grade|band)\b/);
      expect(d.name, d.id).not.toMatch(/\b(A1|A2|B1|B2|C1)\b/);
      expect(d.description, d.id).not.toMatch(/\bsessions?\b/i); // a Session is one answer, not a sitting
    }
  });

  it('surprises are few: most achievements are visible goals', () => {
    const current = ACHIEVEMENT_DEFINITIONS.filter(d => !d.retired);
    const hidden = current.filter(d => d.hidden);
    expect(hidden.length).toBeLessThanOrEqual(Math.ceil(current.length / 5));
  });
});
