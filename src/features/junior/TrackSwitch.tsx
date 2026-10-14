/**
 * The learner-track switch (Profile): the exam experience or the Junior track
 * (Grades 4–7). Local only — the choice lives in `AppState.learnerTrack` and is
 * never synced. Switching never deletes anything: Junior progress and exam
 * progress are both kept, and a learner can go back and forth.
 */
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { LearnerTrack } from '../../domain/junior/state';

const OPTIONS: { track: LearnerTrack; title: string; sub: string; emoji: string }[] = [
  { track: 'exam', title: 'Exam practice', sub: 'IGCSE and A-Level speaking', emoji: '🎓' },
  { track: 'junior', title: 'Junior (Grades 4–7)', sub: 'Short missions with Léo', emoji: '🦊' },
];

export function TrackSwitch() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const choose = (track: LearnerTrack) => {
    if (track === state.learnerTrack) return;
    dispatch({ type: 'SET_LEARNER_TRACK', track });
    if (track === 'junior') navigate('/junior');
  };

  return (
    <div role="radiogroup" aria-label="Learner track" className="space-y-2">
      {OPTIONS.map((o) => {
        const selected = state.learnerTrack === o.track;
        return (
          <button
            key={o.track}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`track-${o.track}`}
            onClick={() => choose(o.track)}
            className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left ${selected ? 'border-action bg-action-soft' : 'border-hairline'}`}
          >
            <span aria-hidden="true" className="text-xl">{o.emoji}</span>
            <span className="flex-1">
              <span className="block text-[10px] font-semibold text-ink">{o.title}</span>
              <span className="block text-[9px] text-ink-subtle">{o.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
