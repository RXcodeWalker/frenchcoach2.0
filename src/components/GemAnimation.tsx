import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Gem } from 'lucide-react';

export function GemAnimations() {
  const { state, dispatch } = useApp();

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {state.gemAnimations.map(anim => (
        <GemFloat key={anim.id} anim={anim} onDone={() => dispatch({ type: 'REMOVE_GEM_ANIMATION', id: anim.id })} />
      ))}
    </div>
  );
}

function GemFloat({ anim, onDone }: { anim: { id: string; amount: number; x: number; y: number }; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="absolute flex items-center gap-1.5 text-xl font-black text-emerald-400 xp-float pointer-events-none select-none"
      style={{ left: `${Math.min(anim.x, 85)}%`, top: `${Math.min(anim.y, 80)}%` }}
    >
      <Gem size={18} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
      <span className="drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]">+{anim.amount}</span>
    </div>
  );
}
