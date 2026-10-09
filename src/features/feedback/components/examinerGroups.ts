import {
  findExaminerDescriptor,
  type ExaminerCitedClaim,
  type ExaminerErrorItem,
  type ExaminerFeedback,
} from '../../../services/coaching/examinerFeedback';
import { ERROR_CATEGORY_LABELS } from '../../../domain/examFeedback/shared/errorCategories';
import type { FeedbackPoint, FeedbackPointGroup } from './FeedbackPointList';

function claim(item: ExaminerCitedClaim): FeedbackPoint {
  return { kind: 'claim', claim: item.claim, quote: item.quote };
}

function fix(item: ExaminerErrorItem): FeedbackPoint {
  return { kind: 'fix', quote: item.quote, correction: item.correction, tag: ERROR_CATEGORY_LABELS[item.category] };
}

/** Maps each examiner reply profile to the shared point list's groups, in display order. */
export function examinerGroups(result: ExaminerFeedback, compact: boolean): FeedbackPointGroup[] {
  if (result.profile === 'learn') {
    const descriptor = result.nextStep ? findExaminerDescriptor(result.nextStep.descriptorId) : undefined;
    const note =
      !compact && descriptor
        ? `Descriptor to aim for: “${descriptor.text}” (Teacher/Examiner Notes p.${descriptor.page})`
        : undefined;
    return [
      { heading: 'What worked', tone: 'good', points: result.strengths.map(claim) },
      { heading: 'Mistakes to fix', tone: 'bad', points: result.errors.map(fix) },
      {
        heading: 'Your next step',
        tone: 'good',
        points: result.nextStep
          ? [{ kind: 'claim', claim: result.nextStep.claim, quote: result.nextStep.quote, ...(note ? { note } : {}) }]
          : [],
      },
    ];
  }

  if (result.turnKind === 'topic') {
    if (result.errors.length > 0) return [{ heading: 'Mistakes to fix', tone: 'bad', points: result.errors.map(fix) }];
    return [{ heading: 'What you did well', tone: 'good', points: result.strength ? [claim(result.strength)] : [] }];
  }

  return [
    {
      heading: 'No problem — correct',
      tone: 'good',
      points: [result.task, result.clarity].filter((c): c is ExaminerCitedClaim => !!c).map(claim),
    },
    { heading: 'Mistakes to fix', tone: 'bad', points: result.error ? [fix(result.error)] : [] },
  ];
}
