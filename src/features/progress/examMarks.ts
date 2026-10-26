import type { EnvelopeView } from '../../domain/igcse/envelope/envelopeView';
import type { ExamAreaMarks } from '../../types';

const ROLE_PLAY_TASK_MAX = 2;

/** Copies a marked attempt's three area marks off its envelope view. Reads marks only; never recomputes one. */
export function examMarksFromView(view: EnvelopeView): ExamAreaMarks {
  const rolePlayTasks = view.criteria.filter(c => c.criterion === 'rolePlayTask');
  const markOf = (criterion: 'communication' | 'qualityOfLanguage') =>
    view.criteria.find(c => c.criterion === criterion)?.mark ?? 0;
  return {
    rolePlay: rolePlayTasks.reduce((sum, c) => sum + c.mark, 0),
    rolePlayMax: rolePlayTasks.length * ROLE_PLAY_TASK_MAX,
    communication: markOf('communication'),
    qualityOfLanguage: markOf('qualityOfLanguage'),
    total: view.total,
  };
}
