// ── DEV-ONLY: Coach Belief Debug Dashboard ─────────────────────────────────────
// Side-by-side comparison of the two belief systems:
//   • Diagnostic beliefs   — diagnosticEngine.getSkillProfile() (current source of truth)
//   • Evidence beliefs      — beliefReducer projection over the EvidenceEvent log (Phase 2)
//
// This screen is READ-ONLY. It does not change recommendations, session
// generation, or diagnosticEngine. It recomputes the evidence projection live
// from localStorage every time you press Refresh, so you can inspect how a
// completed Learn or Exam session moved each belief.
//
// Route is registered only when import.meta.env.DEV is true (see App.tsx).

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ChevronLeft, Database, FlaskConical } from 'lucide-react';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { getEvidenceEvents } from '../services/coach/coachStorage';
import {
  reduceEvidenceToBeliefState,
  projectEvidenceBeliefSnapshot,
} from '../services/coach/beliefReducer';
import { getCounters } from '../services/telemetry/localCounters';
import type { SkillProfile } from '../types';
import type { EvidenceBeliefSnapshot, EvidenceDerivedSkillBelief } from '../types/beliefs';
import type { EvidenceEvent } from '../types/evidence';

interface DebugSnapshot {
  diagnostic: SkillProfile;
  evidence: EvidenceBeliefSnapshot;
  events: EvidenceEvent[];
  computedAt: string;
}

function computeSnapshot(): DebugSnapshot {
  const diagnostic = getSkillProfile();
  const events = getEvidenceEvents();
  const beliefState = reduceEvidenceToBeliefState(events);
  const evidence = projectEvidenceBeliefSnapshot(beliefState, diagnostic);
  return { diagnostic, evidence, events, computedAt: new Date().toLocaleTimeString() };
}

function masteryColor(value: number | null): string {
  if (value === null) return 'text-slate-600';
  if (value >= 0.8) return 'text-emerald-400';
  if (value >= 0.6) return 'text-lime-400';
  if (value >= 0.3) return 'text-amber-400';
  return 'text-rose-400';
}

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value * 100)}%`;
}

function topSources(belief: EvidenceDerivedSkillBelief | undefined): string {
  if (!belief || Object.keys(belief.sourceBreakdown).length === 0) return '—';
  return Object.entries(belief.sourceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([mode, weight]) => `${mode} ${weight.toFixed(2)}`)
    .join(', ');
}

export function CoachBeliefDebug() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<DebugSnapshot>(() => computeSnapshot());
  const [counters, setCounters] = useState(() => getCounters());

  const refresh = useCallback(() => {
    setSnapshot(computeSnapshot());
    setCounters(getCounters());
  }, []);

  // Union of every skill id known to either system, sorted by evidence mastery.
  const rows = useMemo(() => {
    const ids = new Set<string>([
      ...Object.keys(snapshot.diagnostic),
      ...Object.keys(snapshot.evidence.skills),
    ]);
    return [...ids]
      .map(id => ({
        id,
        diag: snapshot.diagnostic[id] ?? null,
        ev: snapshot.evidence.skills[id],
      }))
      .sort((a, b) => {
        const am = a.ev?.mastery ?? a.diag?.score ?? 1;
        const bm = b.ev?.mastery ?? b.diag?.score ?? 1;
        return am - bm;
      });
  }, [snapshot]);

  const fallbackCount = Object.values(snapshot.evidence.skills).filter(s => s.fallbackUsed).length;
  const evidenceDerivedCount = Object.values(snapshot.evidence.skills).filter(s => !s.fallbackUsed).length;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl glass border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <FlaskConical size={18} className="text-violet-400" />
              Coach Belief Debug
            </h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
              Dev only · diagnostic vs evidence-derived · read-only
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold text-sm hover:bg-violet-600/30 transition-colors"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <SummaryCard label="Evidence events" value={snapshot.events.length.toString()} />
        <SummaryCard label="Evidence-derived" value={evidenceDerivedCount.toString()} tone="emerald" />
        <SummaryCard label="Fallback skills" value={fallbackCount.toString()} tone="amber" />
        <SummaryCard label="Reducer" value={snapshot.evidence.reducerVersion} />
        <SummaryCard label="Computed" value={snapshot.computedAt} />
      </div>

      {/* Tier-1 local product metrics (Phase 2 Slice 5) — this device only, never synced */}
      <div className="glass-elevated border-white/5 rounded-2xl p-4 mb-6">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-3">
          Local counters · this device only
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Practice shown" value={(counters.practice_step_shown ?? 0).toString()} />
          <SummaryCard label="Practice passed" value={(counters.practice_step_completed_pass ?? 0).toString()} tone="emerald" />
          <SummaryCard label="Practice retried" value={(counters.practice_step_completed_retry ?? 0).toString()} tone="amber" />
          <SummaryCard label="Practice no-verdict" value={(counters.practice_step_completed_advance_no_verdict ?? 0).toString()} />
          <SummaryCard label="Transcript confirmed" value={(counters.transcript_confirmed ?? 0).toString()} tone="emerald" />
          <SummaryCard label="Transcript re-recorded" value={(counters.transcript_rerecorded ?? 0).toString()} tone="amber" />
        </div>
      </div>

      {/* Weakest / strongest from evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <ListCard title="Weakest (evidence)" ids={snapshot.evidence.weakestSkillIds} tone="rose" />
        <ListCard title="Strongest (evidence)" ids={snapshot.evidence.strongestSkillIds} tone="emerald" />
      </div>

      {/* Comparison table */}
      {rows.length === 0 ? (
        <div className="glass-elevated border-white/5 rounded-2xl p-10 text-center">
          <Database size={28} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 font-bold">No belief data yet.</p>
          <p className="text-slate-600 text-sm mt-1">
            Complete a Learn or Exam session, then press Refresh.
          </p>
        </div>
      ) : (
        <div className="glass-elevated border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                  <th className="text-left font-black px-4 py-3">Skill</th>
                  <th className="text-right font-black px-3 py-3" title="diagnosticEngine mastery">Diag</th>
                  <th className="text-right font-black px-3 py-3" title="evidence-derived mastery">Evid</th>
                  <th className="text-right font-black px-3 py-3" title="evidence mastery − diagnostic mastery">Δ</th>
                  <th className="text-right font-black px-3 py-3" title="evidence uncertainty">Unc.</th>
                  <th className="text-right font-black px-3 py-3" title="total weighted evidence">W.Ev</th>
                  <th className="text-right font-black px-3 py-3" title="raw evidence count">Cnt</th>
                  <th className="text-center font-black px-3 py-3">Src</th>
                  <th className="text-left font-black px-4 py-3">Top sources</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ id, diag, ev }) => {
                  const diagM = diag?.score ?? null;
                  const evM = ev && !ev.fallbackUsed ? ev.mastery : null;
                  const delta = diagM !== null && evM !== null ? evM - diagM : null;
                  return (
                    <tr key={id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-slate-200">{ev?.label ?? diag?.name ?? id}</span>
                        <span className="block text-[10px] text-slate-600 font-mono">{id}</span>
                      </td>
                      <td className={`text-right px-3 py-2.5 font-bold tabular-nums ${masteryColor(diagM)}`}>{pct(diagM)}</td>
                      <td className={`text-right px-3 py-2.5 font-bold tabular-nums ${masteryColor(evM)}`}>{pct(evM)}</td>
                      <td className={`text-right px-3 py-2.5 font-bold tabular-nums ${
                        delta === null ? 'text-slate-600' : delta > 0.05 ? 'text-emerald-400' : delta < -0.05 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {delta === null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}`}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-slate-400">{ev ? pct(ev.uncertainty) : '—'}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-slate-400">{ev ? ev.weightedEvidence.toFixed(2) : '—'}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-slate-400">{ev ? ev.evidenceCount : '—'}</td>
                      <td className="text-center px-3 py-2.5">
                        {ev?.fallbackUsed ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">diag</span>
                        ) : ev ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">evid</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-700/40 text-slate-500">none</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-500 font-mono whitespace-nowrap">{topSources(ev)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-600 mt-4 leading-relaxed">
        Diag = diagnosticEngine mastery. Evid = evidence-derived mastery (blank when fallback is used).
        Δ = evidence − diagnostic, in mastery points. Unc = uncertainty. W.Ev = total weighted evidence.
        Src = which system produced the row. This screen never writes; Refresh recomputes from localStorage.
      </p>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'amber' }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-400' : tone === 'amber' ? 'text-amber-400' : 'text-white';
  return (
    <div className="glass-elevated border-white/5 rounded-xl px-4 py-3">
      <p className={`text-lg font-black tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ListCard({ title, ids, tone }: { title: string; ids: string[]; tone: 'rose' | 'emerald' }) {
  const toneClass = tone === 'rose' ? 'text-rose-400' : 'text-emerald-400';
  return (
    <div className="glass-elevated border-white/5 rounded-xl px-4 py-3">
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-2">{title}</p>
      {ids.length === 0 ? (
        <p className="text-slate-600 text-sm">— none yet —</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ids.map(id => (
            <span key={id} className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 ${toneClass}`}>{id}</span>
          ))}
        </div>
      )}
    </div>
  );
}
