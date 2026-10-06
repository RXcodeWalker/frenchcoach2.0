// ── Learn overhaul Batch 1e — the hidden tier no longer shapes avoidance ─────
// With adaptive Learn live the tier grid is hidden, yet Learn.tsx still read
// DIFFICULTY_CONFIG[selectedDifficulty].expectations, so a stored 'expert' tier
// silently demanded the subjunctive and multiple perspectives.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IGCSE_EXPECTATIONS, DIFFICULTY_CONFIG } from '../difficultyConfig';
import { detectAvoidance } from '../../services/coaching/diagnosticEngine';
import type { Question } from '../../types';

const QUESTION: Question = {
  id: 'sch_02', topicKey: 'school', text: 'Quelle est ta matière préférée ?', hint: 'say which subject and why',
  difficulty: 1, followUps: [], modelAnswer: '', keyVocab: [],
};
const ANSWER = "Ma matière préférée c'est l'histoire parce que le prof est sympa et j'aime apprendre des choses sur le passé, c'est très intéressant pour moi et mes amis aussi";

describe('Learn avoidance uses one fixed IGCSE expectation set', () => {
  it('Learn.tsx never indexes DIFFICULTY_CONFIG by the stored tier', () => {
    const src = readFileSync(resolve(__dirname, '../../screens/Learn.tsx'), 'utf8');
    expect(src).not.toMatch(/DIFFICULTY_CONFIG\[selectedDifficulty\]/);
    expect(src).toMatch(/detectAvoidance\([^)]*IGCSE_EXPECTATIONS\)/);
  });

  it('a stored expert tier would have demanded subjunctive; the IGCSE set never does', () => {
    const expert = detectAvoidance(ANSWER, QUESTION, DIFFICULTY_CONFIG.expert.expectations).map((s) => s.skillId);
    expect(expert).toContain('subjunctive');
    const igcse = detectAvoidance(ANSWER, QUESTION, IGCSE_EXPECTATIONS).map((s) => s.skillId);
    expect(igcse).not.toContain('subjunctive');
  });

  it('IGCSE expectations are A2 with elements of B1 (TN p.11), never the B2-register flags', () => {
    expect(IGCSE_EXPECTATIONS.requireSubjunctive).toBe(false);
    expect(IGCSE_EXPECTATIONS.requireMultiplePerspectives).toBe(false);
    expect(IGCSE_EXPECTATIONS.wordCountTier1).toBe(DIFFICULTY_CONFIG.intermediate.expectations.wordCountTier1);
  });

  it('the setup screen has no tier grid', () => {
    const src = readFileSync(resolve(__dirname, '../../screens/learn/SessionStartScreen.tsx'), 'utf8');
    expect(src).not.toMatch(/TIER_COLORS|DIFFICULTY_TIERS/);
  });
});
