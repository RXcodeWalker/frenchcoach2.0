import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function XPAnimations() {
  const { state, dispatch } = useApp();

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {state.xpAnimations.map(anim => (
        <XPFloat key={anim.id} anim={anim} onDone={() => dispatch({ type: 'REMOVE_XP_ANIMATION', id: anim.id })} />
      ))}
    </div>
  );
}

function XPFloat({ anim, onDone }: { anim: { id: string; amount: number; x: number; y: number }; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="absolute text-2xl font-black text-emerald-400 xp-float pointer-events-none select-none"
      style={{ left: `${Math.min(anim.x, 85)}%`, top: `${Math.min(anim.y, 80)}%` }}
    >
      <span className="drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]">+{anim.amount} XP</span>
    </div>
  );
}
