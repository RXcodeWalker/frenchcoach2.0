// `/exam?mode=coached` opens the exam chooser with Coached Practice selected
// (Home's coach uses it). It only preselects the toggle: the candidate still
// starts the exam, and homework stays forced to Exam Sim (ExamSelect).

export const EXAM_MODE_PARAM = 'mode';
export const COACHED_EXAM_PATH = `/exam?${EXAM_MODE_PARAM}=coached`;

export function examModeFromSearch(search: string): 'coached' | 'sim' {
  return new URLSearchParams(search).get(EXAM_MODE_PARAM) === 'coached' ? 'coached' : 'sim';
}
