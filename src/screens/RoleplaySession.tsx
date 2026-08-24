import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getScenario, isAuthored } from '../data/scenarios/registry';

type SessionPhase = 'briefing' | 'prep' | 'play' | 'debrief';

export function RoleplaySession() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<SessionPhase>('briefing');

  const entry = scenarioId ? getScenario(scenarioId) : undefined;
  const authored = scenarioId ? isAuthored(scenarioId) : false;

  useEffect(() => {
    if (!entry || !authored) {
      navigate('/explore');
    }
  }, [entry, authored, navigate]);

  if (!entry || !authored) return null;

  const { meta } = entry;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 md:pb-8">
      <button
        onClick={() => navigate('/explore')}
        className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest mb-4"
      >
        <ArrowLeft size={14} /> Back to Explore
      </button>

      <Card variant="subtle" className="p-4 border-white/5 flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 text-lg">
          {meta.emoji}
        </div>
        <div>
          <h1 className="text-sm font-black text-white italic tracking-tight">{meta.title}</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{meta.npc.nameFr} · {meta.npc.roleEn}</p>
        </div>
      </Card>

      {phase === 'briefing' && (
        <Card className="p-6">
          <p className="text-sm text-slate-300">{meta.briefingEn}</p>
          <button
            onClick={() => setPhase('prep')}
            className="mt-6 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            Continue
          </button>
        </Card>
      )}

      {phase === 'prep' && (
        <Card className="p-6">
          <button
            onClick={() => setPhase('play')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            Start Roleplay
          </button>
        </Card>
      )}

      {phase === 'play' && (
        <Card className="p-6">
          <button
            onClick={() => setPhase('debrief')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            End Session
          </button>
        </Card>
      )}

      {phase === 'debrief' && (
        <Card className="p-6">
          <button
            onClick={() => navigate('/explore')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            Back to Explore
          </button>
        </Card>
      )}
    </div>
  );
}
