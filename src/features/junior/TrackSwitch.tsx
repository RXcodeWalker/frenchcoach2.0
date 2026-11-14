/**
 * The learner-track switch (Profile): show or hide the Junior tab
 * (Grades 4–7). Local only — the choice lives in `AppState.learnerTrack` and is
 * never synced. Switching never deletes anything: Junior progress and exam
 * progress are both kept, and a learner can go back and forth.
 */
import { GraduationCap, PawPrint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { LearnerTrack } from '../../domain/junior/state';

const OPTIONS: { track: LearnerTrack; title: string; sub: string; Icon: typeof GraduationCap }[] = [
  { track: 'exam', title: 'Exam practice', sub: 'IGCSE speaking. Hides the Junior tab.', Icon: GraduationCap },
  { track: 'junior', title: 'Show the Junior tab', sub: 'Missions with Léo, for Grades 4–7.', Icon: PawPrint },
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
    <div role="radiogroup" aria-label="Learner track" className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map(({ track, title, sub, Icon }) => {
        const selected = state.learnerTrack === track;
        return (
          <button
            key={track}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`track-${track}`}
            onClick={() => choose(track)}
            className={`flex w-full items-center gap-3 rounded-card border p-3 text-left transition-[background-color,border-color] duration-state ease-smooth ${
              selected ? 'border-action bg-action-soft' : 'border-hairline hover:border-hairline-strong hover:bg-track'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${selected ? 'bg-action text-action-ink' : 'bg-track text-ink-muted'}`}
            >
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-tight text-ink">{title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
