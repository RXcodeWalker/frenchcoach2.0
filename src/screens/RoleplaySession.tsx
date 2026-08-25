import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getScenario, isAuthored } from '../data/scenarios/registry';
import { useRoleplaySession } from '../features/roleplay/useRoleplaySession';
import type { ScenarioDeck, ScenarioGraph, ScenarioMeta } from '../features/roleplay/types';

interface ScenarioEntry {
  meta: ScenarioMeta;
  graph: ScenarioGraph;
  deck: ScenarioDeck;
}

export function RoleplaySession() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();

  const entry = scenarioId ? getScenario(scenarioId) : undefined;
  const authored = scenarioId ? isAuthored(scenarioId) : false;

  // Deep links and stale bookmarks bypass the Explore tree's gate, so this
  // guard is permanent rather than belt-and-braces.
  useEffect(() => {
    if (!entry || !authored) {
      navigate('/explore');
    }
  }, [entry, authored, navigate]);

  if (!entry || !authored || !scenarioId) return null;

  return <RoleplaySessionView scenarioId={scenarioId} entry={entry} />;
}

/**
 * Split from the guard above so the session hook is only ever mounted with a
 * real scenario — no placeholder meta, and no conditional hook call.
 *
 * Stage 4 wires the phase machine onto the reducer, which now owns it, so the
 * shell no longer keeps a duplicate copy in local state. The play-phase UI
 * (NPC bubble, recording, mission checklist) belongs to Stages 5–7.
 */
function RoleplaySessionView({ scenarioId, entry }: { scenarioId: string; entry: ScenarioEntry }) {
  const navigate = useNavigate();
  const { meta } = entry;
  const session = useRoleplaySession(scenarioId, entry.graph, meta);
  const { phase } = session.state;

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
            onClick={() => session.setPhase('prep')}
            className="mt-6 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            Continue
          </button>
        </Card>
      )}

      {phase === 'prep' && (
        <Card className="p-6">
          <button
            onClick={session.start}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors"
          >
            Start Roleplay
          </button>
        </Card>
      )}

      {phase === 'play' && (
        <Card className="p-6">
          <button
            onClick={() => session.setPhase('debrief')}
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
