import { describe, it, expect } from 'vitest';
import {
  parseAndGroundExaminerFeedback,
  collectExaminerQuotes,
  type ExaminerParseInput,
  type RailRolePlayExaminerFeedback,
  type RailTopicExaminerFeedback,
} from '../examinerFeedback';

describe('rail profile — topic turn', () => {
  const transcript = "Hier j'ai mange une pizza et je suis alle au cinema avec mes amis, c'etait super.";
  const input: ExaminerParseInput = { transcript, turnKind: 'topic', inputMode: 'text' };
  const e1 = { quote: "j'ai mange une pizza", correction: "j'ai mangé une pizza", category: 'verb_form' };
  const e2 = { quote: 'je suis alle au cinema', correction: 'je suis allé au cinéma', category: 'agreement' };
  const e3 = { quote: 'avec mes amis', correction: 'avec mes amies', category: 'gender' };

  it('returns errors only (no strengths), at most two', () => {
    const r = parseAndGroundExaminerFeedback({ errors: [e1, e2, e3] }, 'rail', input) as RailTopicExaminerFeedback;
    expect(r.profile).toBe('rail');
    expect(r.turnKind).toBe('topic');
    expect(r.errors).toHaveLength(2);
    expect(r).not.toHaveProperty('strengths');
    expect(r).not.toHaveProperty('nextStep');
  });

  it('ignores any strengths or next step the model volunteers', () => {
    const r = parseAndGroundExaminerFeedback(
      { errors: [e1], strengths: [{ claim: 'x', quote: 'avec mes amis' }], nextStep: { claim: 'y' } },
      'rail',
      input,
    ) as RailTopicExaminerFeedback;
    expect(Object.keys(r).sort()).toEqual(['errors', 'profile', 'turnKind']);
  });

  it('nothing to fix is a valid empty result', () => {
    expect(parseAndGroundExaminerFeedback({ errors: [] }, 'rail', input)).toEqual({
      profile: 'rail',
      turnKind: 'topic',
      errors: [],
    });
  });

  it('retries (null) when every proposed error is ungrounded, or the reply has no errors array', () => {
    expect(
      parseAndGroundExaminerFeedback({ errors: [{ quote: 'rien de tel ici', correction: 'x', category: 'other' }] }, 'rail', input),
    ).toBeNull();
    expect(parseAndGroundExaminerFeedback({ nope: true }, 'rail', input)).toBeNull();
  });

  it('spoken turns drop inaudible spelling errors', () => {
    const t = { transcript: 'Je prefere le sport et le cinema avec mes amis.', turnKind: 'topic' as const };
    const raw = { errors: [{ quote: 'Je prefere le sport', correction: 'Je préfère le sport', category: 'verb_form' }] };
    expect((parseAndGroundExaminerFeedback(raw, 'rail', { ...t, inputMode: 'speech' }) as RailTopicExaminerFeedback).errors).toHaveLength(0);
    expect((parseAndGroundExaminerFeedback(raw, 'rail', { ...t, inputMode: 'text' }) as RailTopicExaminerFeedback).errors).toHaveLength(1);
  });
});

describe('rail profile — role-play turn (no 2/1/0 under another name)', () => {
  const transcript = "Bonjour, je voudrais reserver une table pour quatre personnes a huit heures s'il vous plait.";
  const input: ExaminerParseInput = { transcript, turnKind: 'rolePlay', inputMode: 'text' };
  const TASK = { claim: 'You asked for a table and gave the number of people and the time.', quote: 'une table pour quatre personnes' };
  const CLARITY = { claim: 'The request is easy to follow.', quote: "je voudrais reserver une table" };
  const ERR = { quote: 'a huit heures', correction: 'à huit heures', category: 'preposition' };

  function rp(raw: unknown, i = input): RailRolePlayExaminerFeedback {
    const r = parseAndGroundExaminerFeedback(raw, 'rail', i);
    expect(r).not.toBeNull();
    return r as RailRolePlayExaminerFeedback;
  }

  it('parses task, clarity and an error', () => {
    const r = rp({ task: TASK, clarity: CLARITY, error: ERR });
    expect(r.turnKind).toBe('rolePlay');
    expect(r.task).toEqual(TASK);
    expect(r.clarity).toEqual(CLARITY);
    expect(r.error).toEqual(ERR);
  });

  it('has no achieved / partly / not field and no numeric field', () => {
    const r = rp({ task: TASK, clarity: null, error: null });
    expect(Object.keys(r).sort()).toEqual(['clarity', 'error', 'profile', 'task', 'turnKind']);
  });

  it('filters "would get 2 marks" claims instead of showing them', () => {
    const r = rp({ task: { claim: 'This would get 2 marks for the task.', quote: 'une table pour quatre personnes' }, clarity: CLARITY, error: null });
    expect(r.task).toBeNull();
    expect(r.clarity).toEqual(CLARITY);
  });

  it('filters a claim that copies a Table A bullet', () => {
    const r = rp({ task: { claim: 'The information is communicated.', quote: 'une table pour quatre personnes' }, clarity: null, error: null });
    expect(r.task).toBeNull();
  });

  it('clarity may be null', () => {
    expect(rp({ task: TASK, clarity: null, error: null }).clarity).toBeNull();
  });

  it('drops a clarity note that praises the phrase the error flags', () => {
    const r = rp({
      task: TASK,
      clarity: { claim: 'The time is stated clearly.', quote: 'pour quatre personnes a huit heures' },
      error: ERR,
    });
    expect(r.clarity).toBeNull();
    expect(r.error).toEqual(ERR);
  });

  it('enforces the 160-character claim cap and the 400 total by dropping, never cutting', () => {
    const long = `${'You said it in a full sentence. '.repeat(6)}`.trim(); // > 160
    expect(long.length).toBeGreaterThan(160);
    const r = rp({ task: { claim: long, quote: 'une table pour quatre personnes' }, clarity: CLARITY, error: null });
    expect(r.task).toBeNull();
    expect(r.clarity).toEqual(CLARITY);

    const c150 = 'a'.repeat(5).concat(' ', 'word '.repeat(28)).trim().slice(0, 150);
    const r2 = rp({ task: { claim: c150, quote: 'une table pour quatre personnes' }, clarity: { claim: c150, quote: CLARITY.quote }, error: null });
    expect(r2.task?.claim).toBe(c150);
    expect(r2.clarity?.claim).toBe(c150); // 300 ≤ 400, both kept
  });

  it('requires a task object; a missing task is retried', () => {
    expect(parseAndGroundExaminerFeedback({ clarity: CLARITY }, 'rail', input)).toBeNull();
    expect(parseAndGroundExaminerFeedback({ task: { claim: 'x', quote: 'pas dans la réponse du tout' } }, 'rail', input)).toBeNull();
  });

  it('spoken: a sound-alike-only role-play error is dropped', () => {
    const spoken: ExaminerParseInput = { ...input, inputMode: 'speech' };
    const r = rp({ task: TASK, clarity: null, error: { quote: 'quatre personnes', correction: 'quatre personne', category: 'agreement' } }, spoken);
    expect(r.error).toBeNull();
  });

  it('collectExaminerQuotes gathers every verbatim quote', () => {
    const r = rp({ task: TASK, clarity: CLARITY, error: ERR });
    expect(collectExaminerQuotes(r)).toEqual([TASK.quote, CLARITY.quote, ERR.quote]);
  });
});
