import { useCallback, useEffect, useMemo, useState } from 'react';
import { Segmented } from '../../components/ui/Segmented';
import { PersonRow } from '../rankings/PersonRow';
import { useCatalogue } from '../../services/shop/useCatalogue';
import { rarityOf, RARITY_COLOR } from '../../services/shop/rarity';
import { getDailyChallengeBoard } from '../../services/dailyChallenge/dailyChallengeService';
import { formatDuration } from './format';
import type { BoardScope, DailyChallengeBoard } from './types';

/** Today's board: global or friends, ranked by the server (right answers, then time). */
export function ChallengeBoard({ refreshKey }: { refreshKey: string }) {
  const [scope, setScope] = useState<BoardScope>('global');
  const [board, setBoard] = useState<DailyChallengeBoard | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const catalogue = useCatalogue();
  const nameStyle = useMemo(
    () => (itemId: string | null) => {
      const item = itemId ? catalogue.find(i => i.id === itemId) : undefined;
      return item ? { color: RARITY_COLOR[rarityOf(item)] } : undefined;
    },
    [catalogue],
  );

  const load = useCallback(async () => {
    setState('loading');
    const result = await getDailyChallengeBoard(scope);
    if (result.ok) {
      setBoard(result.board);
      setState('ready');
    } else {
      setState('error');
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className="rounded-card border border-hairline bg-surface" aria-labelledby="dc-board">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <h2 id="dc-board" className="text-section text-ink">Today’s board</h2>
        <Segmented<BoardScope>
          label="Board"
          value={scope}
          onChange={setScope}
          testIdPrefix="dc-scope"
          options={[
            { id: 'global', label: 'Everyone' },
            { id: 'friends', label: 'Friends' },
          ]}
        />
      </div>
      {state === 'loading' ? (
        <p className="px-4 py-10 text-center text-body-s text-ink-muted" aria-busy="true">Loading the board…</p>
      ) : state === 'error' || !board ? (
        <p className="px-4 py-10 text-center text-body-s text-ink-muted">
          Couldn’t load the board.{' '}
          <button type="button" onClick={() => void load()} className="font-semibold text-action-text underline-offset-2 hover:underline">Try again</button>
        </p>
      ) : board.rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-body-s text-ink-muted">
          {scope === 'friends' ? 'None of your friends has finished today’s challenge yet.' : 'No one has finished today’s challenge yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-hairline" data-testid="dc-board-rows">
          {board.rows.map((r, i) => (
            <PersonRow
              key={`${r.rank}-${r.username}-${i}`}
              username={r.username}
              avatar={r.avatarEmoji}
              frame={r.equippedFrame}
              catalogue={catalogue}
              nameStyle={nameStyle(r.equippedNameplate)}
              isYou={r.isMe}
              lead={
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill font-numeral text-label ${
                    r.rank === 1 ? 'bg-reward-soft text-reward-text' : 'bg-track text-ink-muted'
                  }`}
                  aria-label={`Rank ${r.rank}`}
                >
                  {r.rank}
                </span>
              }
              trail={
                <p className="shrink-0 text-right text-label text-ink">
                  <span className="font-numeral">{r.correctCount}/{r.itemCount}</span>
                  <span className="ml-2 font-numeral text-caption font-normal text-ink-subtle">{formatDuration(r.durationMs)}</span>
                </p>
              }
            />
          ))}
        </ul>
      )}
      {board && board.total > 0 && state === 'ready' && (
        <p className="border-t border-hairline px-4 py-3 text-caption text-ink-subtle">
          <span className="font-numeral">{board.total}</span> {board.total === 1 ? 'learner' : 'learners'} on this board. Ties go to the faster time.
        </p>
      )}
    </section>
  );
}
