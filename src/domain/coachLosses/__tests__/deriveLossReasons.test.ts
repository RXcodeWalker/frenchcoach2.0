import { describe, expect, it } from 'vitest';
import {
  COMM_1_3, COMM_4_6, COMM_7_9, COMM_10_12, COMM_13_15,
  QOL_1_3, QOL_4_6, QOL_7_9, QOL_10_12, QOL_13_15,
} from '../../igcse/canonical';
import { commReasonForDescriptor, deriveLossReasons, qolReasonForDescriptor } from '../deriveLossReasons';
import { makeReport, makeView } from './fixtures';

describe('the descriptor tables are closed over the frozen TN bullets', () => {
  it('maps every Communication bullet, and no other string', () => {
    for (const band of [COMM_13_15, COMM_10_12, COMM_7_9, COMM_4_6, COMM_1_3]) {
      for (const bullet of band) expect(commReasonForDescriptor(bullet), bullet).not.toBeNull();
    }
    expect(commReasonForDescriptor('No creditable response.')).toBeNull();
    expect(commReasonForDescriptor('made up')).toBeNull();
    expect(commReasonForDescriptor(null)).toBeNull();
  });

  it('maps every Quality-of-language bullet', () => {
    for (const band of [QOL_13_15, QOL_10_12, QOL_7_9, QOL_4_6, QOL_1_3]) {
      for (const bullet of band) expect(qolReasonForDescriptor(bullet), bullet).not.toBeNull();
    }
    expect(qolReasonForDescriptor('No creditable response.')).toBeNull();
  });

  it('reads the bullets as the reasons they describe', () => {
    expect(commReasonForDescriptor(COMM_10_12[2])).toBe('comm_develop');
    expect(commReasonForDescriptor(COMM_13_15[3])).toBe('comm_justify');
    expect(commReasonForDescriptor(COMM_7_9[1])).toBe('comm_relevant');
    expect(qolReasonForDescriptor(QOL_10_12[1])).toBe('qol_vocabulary');
    expect(qolReasonForDescriptor(QOL_4_6[1])).toBe('qol_fluency');
  });
});

describe('role play', () => {
  it('a full-marks attempt has no reasons', () => {
    expect(deriveLossReasons(makeView({ rolePlay: [{ mark: 2 }, { mark: 2 }], communication: 15, qualityOfLanguage: 15 }))).toEqual([]);
  });

  it('a task credited 0 with nothing said is silent', () => {
    const [r] = deriveLossReasons(makeView({ rolePlay: [{ mark: 0, said: '  ' }, { mark: 2 }, { mark: 0, said: '' }] }));
    expect(r).toMatchObject({ code: 'rp_silent', area: 'rolePlay', count: 2, marksBelowMax: 4, mark: 0, max: 4 });
  });

  it('without the report a half-credited task is only "below full"', () => {
    const [r] = deriveLossReasons(makeView({ rolePlay: [{ mark: 1 }, { mark: 2 }] }));
    expect(r).toMatchObject({ code: 'rp_below_full', count: 1, marksBelowMax: 1, mark: 1, max: 2 });
  });

  it('with the report, a half-credited task splits into errors-in-the-way and partly-communicated', () => {
    const view = makeView({ rolePlay: [{ mark: 1 }, { mark: 1 }, { mark: 1 }, { mark: 2 }] });
    const codes = deriveLossReasons(view, makeReport({ rpErrors: ['rp2'] }));
    expect(codes.find((r) => r.code === 'rp_errors_impede')).toMatchObject({ count: 1, marksBelowMax: 1 });
    expect(codes.find((r) => r.code === 'rp_partly_communicated')).toMatchObject({ count: 2, marksBelowMax: 2, mark: 2, max: 4 });
  });

  it('a task credited 0 with something said is not called silent', () => {
    const [r] = deriveLossReasons(makeView({ rolePlay: [{ mark: 0, said: 'euh non' }] }), makeReport());
    expect(r.code).toBe('rp_below_full');
  });
});

describe('communication', () => {
  it('takes the reason from the band-above bullet the report aimed at', () => {
    const view = makeView({ communication: 8 });
    const [r] = deriveLossReasons(view, makeReport({ commTarget: COMM_10_12[2] }));
    expect(r).toMatchObject({ code: 'comm_develop', area: 'communication', mark: 8, max: 15, marksBelowMax: 7 });
  });

  it('is "below top" without a report, or when the target is not a TN bullet', () => {
    expect(deriveLossReasons(makeView({ communication: 8 }))[0].code).toBe('comm_below_top');
    expect(deriveLossReasons(makeView({ communication: 8 }), makeReport({ commTarget: 'invented' }))[0].code).toBe('comm_below_top');
  });
});

describe('quality of language', () => {
  it('names the dominant error category when it recurs', () => {
    const view = makeView({ qualityOfLanguage: 8, qolErrors: 6 });
    const [r] = deriveLossReasons(view, makeReport({ qolCategories: ['tense', 'tense', 'tense', 'gender', 'other', 'tense'] }));
    expect(r).toMatchObject({ code: 'qol_errors', category: 'tense', count: 4, total: 6, marksBelowMax: 7 });
  });

  it('falls back to the report descriptor when no category recurs', () => {
    const view = makeView({ qualityOfLanguage: 8, qolErrors: 3 });
    const [r] = deriveLossReasons(view, makeReport({ qolCategories: ['tense', 'gender', 'other'], qolTarget: QOL_10_12[1] }));
    expect(r.code).toBe('qol_vocabulary');
  });

  it('without a report counts the envelope’s errors but never invents a category', () => {
    const [r] = deriveLossReasons(makeView({ qualityOfLanguage: 8, qolErrors: 5 }));
    expect(r).toMatchObject({ code: 'qol_errors', count: 5 });
    expect(r.category).toBeUndefined();
  });

  it('a single error and no report is just "below top"', () => {
    expect(deriveLossReasons(makeView({ qualityOfLanguage: 12, qolErrors: 1 }))[0].code).toBe('qol_below_top');
  });
});

describe('ranking', () => {
  it('orders reasons by marks below the maximum, ties to role play first', () => {
    const view = makeView({ rolePlay: [{ mark: 0, said: '' }, { mark: 2 }], communication: 8, qualityOfLanguage: 13 });
    expect(deriveLossReasons(view).map((r) => r.area)).toEqual(['communication', 'rolePlay', 'qualityOfLanguage']);
  });

  it('keeps no sentence of the learner’s anywhere in a reason', () => {
    const view = makeView({ rolePlay: [{ mark: 1, said: 'SECRET-ANSWER-TEXT' }], qualityOfLanguage: 9, qolErrors: 3 });
    expect(JSON.stringify(deriveLossReasons(view, makeReport({ rpErrors: ['rp1'], qolCategories: ['tense', 'tense', 'tense'] })))).not.toContain('SECRET');
  });
});
