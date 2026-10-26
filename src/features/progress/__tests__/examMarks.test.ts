import { describe, it, expect } from 'vitest';
import { examMarksFromView } from '../examMarks';
import type { EnvelopeView, CriterionView } from '../../../domain/igcse/envelope/envelopeView';

function criterion(c: Partial<CriterionView> & Pick<CriterionView, 'criterion' | 'mark'>): CriterionView {
  return { confidence: 'high', justification: '', evidenceSpans: [], ...c };
}

function view(criteria: CriterionView[], total: number): EnvelopeView {
  return { criteria, total } as unknown as EnvelopeView;
}

describe('examMarksFromView', () => {
  it('sums role-play tasks and copies communication, quality of language and the total', () => {
    const marks = examMarksFromView(view([
      criterion({ criterion: 'rolePlayTask', taskId: 'rp1', mark: 2 }),
      criterion({ criterion: 'rolePlayTask', taskId: 'rp2', mark: 1 }),
      criterion({ criterion: 'rolePlayTask', taskId: 'rp3', mark: 2 }),
      criterion({ criterion: 'rolePlayTask', taskId: 'rp4', mark: 0 }),
      criterion({ criterion: 'rolePlayTask', taskId: 'rp5', mark: 2 }),
      criterion({ criterion: 'communication', mark: 11 }),
      criterion({ criterion: 'qualityOfLanguage', mark: 9 }),
    ], 27));
    expect(marks).toEqual({ rolePlay: 7, rolePlayMax: 10, communication: 11, qualityOfLanguage: 9, total: 27 });
  });
});
