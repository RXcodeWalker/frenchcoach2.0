import { describe, expect, it } from 'vitest';
import { LOSS_MIN_MARKS, lossAction, lossChip, lossSentence, pickTopLoss, routeForLoss } from '../lossCoaching';
import { ERROR_CATEGORIES } from '../../examFeedback/shared/errorCategories';
import { EMPTY_LOSS_STORE, MAX_LOSS_RECORDS, parseExamLossStore, upsertLossRecord } from '../store';
import type { ExamLossRecord, LossReason, LossReasonCode } from '../types';

const reason = (over: Partial<LossReason> & { code: LossReasonCode }): LossReason => ({
  area: over.code.startsWith('rp_') ? 'rolePlay' : over.code.startsWith('comm_') ? 'communication' : 'qualityOfLanguage',
  marksBelowMax: 4, mark: 6, max: 10, count: 2, ...over,
});

describe('routes', () => {
  it('sends every role-play reason to the role-play drill', () => {
    for (const code of ['rp_silent', 'rp_errors_impede', 'rp_partly_communicated', 'rp_below_full'] as const) {
      expect(routeForLoss(reason({ code }))).toEqual({ kind: 'role_play' });
    }
  });

  it('sends opinion / reason shortfalls to Learn with the opinions focus, other Communication ones to plain Learn', () => {
    expect(routeForLoss(reason({ code: 'comm_develop' }))).toEqual({ kind: 'develop_answers', focus: 'opinion' });
    expect(routeForLoss(reason({ code: 'comm_justify' }))).toEqual({ kind: 'develop_answers', focus: 'opinion' });
    expect(routeForLoss(reason({ code: 'comm_relevant' }))).toEqual({ kind: 'develop_answers' });
  });

  it('routes a recurring error category to the skill that practises it, and leaves the unrouted ones alone', () => {
    expect(routeForLoss(reason({ code: 'qol_errors', category: 'tense' }))).toMatchObject({ kind: 'weak_skill', skillId: 'tense_past', focus: 'past' });
    expect(routeForLoss(reason({ code: 'qol_errors', category: 'gender' }))).toMatchObject({ skillId: 'gender' });
    expect(routeForLoss(reason({ code: 'qol_errors', category: 'word_order' }))).toBeNull();
    expect(routeForLoss(reason({ code: 'qol_errors' }))).toBeNull();
    expect(routeForLoss(reason({ code: 'qol_fluency' }))).toBeNull();
    // every category is either routed to a real skill id or deliberately not
    for (const category of ERROR_CATEGORIES) {
      const route = routeForLoss(reason({ code: 'qol_errors', category }));
      if (route) expect(route.skillId).toBeTruthy();
    }
  });
});

describe('pickTopLoss', () => {
  it('takes the biggest routable gap and skips the unroutable and the trivial', () => {
    const top = pickTopLoss([
      reason({ code: 'qol_fluency', marksBelowMax: 9 }),
      reason({ code: 'comm_develop', marksBelowMax: 5 }),
      reason({ code: 'rp_silent', marksBelowMax: 4 }),
      reason({ code: 'rp_below_full', marksBelowMax: LOSS_MIN_MARKS - 1 }),
    ]);
    expect(top?.code).toBe('comm_develop');
  });

  it('is null when nothing is routable', () => {
    expect(pickTopLoss([reason({ code: 'qol_below_top', marksBelowMax: 6 })])).toBeNull();
    expect(pickTopLoss([])).toBeNull();
  });
});

describe('wording', () => {
  it('restates only the numbers the reason carries', () => {
    expect(lossSentence(reason({ code: 'rp_silent', count: 2 }))).toBe('In your last Exam Sim you said nothing on 2 role-play tasks, so they earned no marks.');
    expect(lossSentence(reason({ code: 'rp_partly_communicated', count: 1, mark: 1, max: 2 }))).toContain('1 role-play task in your last Exam Sim only partly got the information across, earning 1 of 2 marks');
    expect(lossSentence(reason({ code: 'qol_errors', category: 'tense', mark: 8, max: 15, count: 4, total: 6 })))
      .toBe('Quality of language was 8/15 in your last Exam Sim, and 4 of the 6 mistakes marked were tense mistakes.');
    expect(lossSentence(reason({ code: 'comm_develop', mark: 8, max: 15 }))).toContain('Communication was 8/15');
    expect(lossSentence(reason({ code: 'comm_develop', mark: 8, max: 15 }))).toContain('to develop your ideas and opinions');
  });

  it('never promises a grade or a mark gain', () => {
    const all: LossReasonCode[] = ['rp_silent', 'rp_errors_impede', 'rp_partly_communicated', 'rp_below_full', 'comm_responds', 'comm_relevant', 'comm_develop', 'comm_justify', 'comm_below_top', 'qol_errors', 'qol_structures', 'qol_vocabulary', 'qol_fluency', 'qol_below_top'];
    for (const code of all) {
      const text = `${lossSentence(reason({ code, category: 'tense' }))} ${lossAction(reason({ code }))} ${lossChip(reason({ code }))}`;
      expect(text, code).not.toMatch(/grade|will (earn|gain|score)|predict/i);
    }
  });
});

describe('the device store', () => {
  const rec = (sessionId: string, hasReport: boolean, reasons: LossReason[] = []): ExamLossRecord => ({ sessionId, scoredAt: '2026-11-10T10:00:00Z', hasReport, reasons });

  it('reads garbage, another version and malformed rows as empty or drops them', () => {
    expect(parseExamLossStore(null)).toEqual(EMPTY_LOSS_STORE);
    expect(parseExamLossStore({ version: 99, records: [] })).toEqual(EMPTY_LOSS_STORE);
    const parsed = parseExamLossStore({
      version: 1,
      records: [
        rec('ok', true, [reason({ code: 'rp_silent' })]),
        { sessionId: '', scoredAt: 'x', hasReport: true, reasons: [] },
        rec('badreason', false, [{ code: 'invented' } as unknown as LossReason]),
      ],
    });
    expect(parsed.records.map((r) => r.sessionId)).toEqual(['ok', 'badreason']);
    expect(parsed.records[1].reasons).toEqual([]);
  });

  it('never replaces a report-backed record with an envelope-only one, and caps the list', () => {
    const withReport = upsertLossRecord(EMPTY_LOSS_STORE, rec('s1', true, [reason({ code: 'rp_silent' })]));
    expect(upsertLossRecord(withReport, rec('s1', false))).toBe(withReport);
    const refined = upsertLossRecord(upsertLossRecord(EMPTY_LOSS_STORE, rec('s2', false)), rec('s2', true, [reason({ code: 'comm_develop' })]));
    expect(refined.records).toHaveLength(1);
    expect(refined.records[0].hasReport).toBe(true);
    let s = EMPTY_LOSS_STORE;
    for (let i = 0; i < MAX_LOSS_RECORDS + 3; i++) s = upsertLossRecord(s, rec(`s${i}`, false));
    expect(s.records).toHaveLength(MAX_LOSS_RECORDS);
    expect(s.records[0].sessionId).toBe(`s${MAX_LOSS_RECORDS + 2}`);
  });
});
