import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BattleView } from '../features/bossBattle/BattleView';
import { BossSelect } from '../features/bossBattle/BossSelect';
import type { Boss } from '../features/bossBattle/bosses';
import { readBossRecords } from '../features/bossBattle/bossStore';

/**
 * Boss Battles (Design System v2): choose a grammar boss, then fight it round
 * by round. Behind the `bossBattle` flag.
 *
 * A fight earns no XP, gems, Session, mastery or evidence — that is deliberate
 * for now (`features/bossBattle/__tests__/noAppStateWrites.test.ts` pins it).
 * Its only write is the learner's own star record (`bossStore`). When XP is
 * added, the place to hook it is the moment `BattleView` records the finished
 * fight.
 */
export function BossBattle() {
  const navigate = useNavigate();
  const [fight, setFight] = useState<{ boss: Boss; attempt: number } | null>(null);
  const [records, setRecords] = useState(readBossRecords);

  if (fight) {
    return (
      <BattleView
        key={fight.attempt}
        boss={fight.boss}
        onRematch={() => setFight({ boss: fight.boss, attempt: fight.attempt + 1 })}
        onExit={() => {
          setRecords(readBossRecords());
          setFight(null);
        }}
      />
    );
  }

  return <BossSelect records={records} onPick={(boss) => setFight({ boss, attempt: 0 })} onBack={() => navigate('/explore')} />;
}
