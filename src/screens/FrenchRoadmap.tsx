import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Map, Lock, CheckCircle2, ChevronRight, Info, Target, Sparkles, AlertTriangle, Play } from 'lucide-react';
import { ROADMAP_LEVELS, SKILL_INFO, evaluateRoadmap } from '../services/progression/roadmapService';
import { getReport } from '../services/coaching/diagnosticEngine';
import { RoadmapData } from '../types';

export function FrenchRoadmap() {
  const navigate = useNavigate();
  const [data, setData] = useState<RoadmapData | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [report, setReport] = useState<ReturnType<typeof getReport> | null>(null);

  useEffect(() => {
    setData(evaluateRoadmap());
    setReport(getReport());
  }, []);

  if (!data) return null;

  const currentLevel = ROADMAP_LEVELS[data.levelIndex];


  // Identify the first incomplete node as the "Next Step"
  const nextStepNode = ROADMAP_LEVELS.flatMap(l => l.nodes).find(n => !data.completedNodes.includes(n.id));

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Map size={14} className="text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Growth Path</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">French Roadmap</h1>
            <p className="text-sm text-ink-muted mt-1">Your data-driven path to French mastery</p>
          </div>

          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[8px] font-bold text-ink-muted uppercase">Current Level</p>
                <div className="flex items-center gap-1.5">
                   <span className="text-lg">{currentLevel.icon}</span>
                   <span className="font-black text-white italic">{currentLevel.name.toUpperCase()}</span>
                </div>
             </div>
          </div>
        </div>

        {/* AI Recommendations Banner */}
        {report?.hasData && (report.topWeaknesses?.length ?? 0) > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface rounded-3xl p-6 border-violet-500/20 bg-gradient-to-r from-violet-600/10 via-transparent to-transparent flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">AI Recovery Recommendation</h3>
                <p className="text-xs text-ink-muted max-w-lg mt-1">
                  We've detected a trend in your <span className="text-white font-bold">{report.topWeaknesses?.[0]?.name}</span> mistakes.
                  Diverting to <span className="text-violet-400 font-bold">Weakness Analysis</span> is recommended before proceeding to the next node.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/weakness-analysis')}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl text-[10px] uppercase italic tracking-wider transition-all whitespace-nowrap shadow-lg shadow-violet-600/20"
            >
              Start Recovery
            </button>
          </motion.div>
        )}

        {/* Skill Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {(Object.keys(data.skills) as Array<keyof typeof data.skills>).map((key) => {
            const info = SKILL_INFO[key];
            const score = data.skills[key];
            const isWeak = report?.hasData && report.topWeaknesses?.some((w) => w.id === key);

            return (
              <motion.div 
                key={key}
                className={`surface-raised p-4 rounded-2xl border flex flex-col items-center text-center space-y-2 relative transition-colors ${
                  isWeak ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/5'
                }`}
                whileHover={{ y: -4 }}
              >
                {isWeak && (
                  <div className="absolute top-2 right-2 text-rose-500">
                    <AlertTriangle size={12} />
                  </div>
                )}
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <p className="text-[9px] font-bold text-ink-muted uppercase tracking-tighter">{info.label}</p>
                  <p className="text-xl font-black text-white">{score.toFixed(1)}</p>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                    className={`h-full shadow-[0_0_8px_rgba(59,130,246,0.5)] ${isWeak ? 'bg-rose-500' : 'bg-blue-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / 10) * 100}%` }}
                   />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* The Path */}
        <div className="space-y-12 relative">
          {/* Vertical Line Connector */}
          <div className="absolute left-6 md:left-1/2 top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-500 via-blue-500 to-purple-500 opacity-20 hidden md:block" />

          {ROADMAP_LEVELS.map((level, lIdx) => {
            const isCompleted = lIdx < data.levelIndex;
            const isCurrent = lIdx === data.levelIndex;
            const isNext = lIdx === data.levelIndex + 1;
            const isLocked = lIdx > data.levelIndex + 1;

            return (
              <div key={level.id} className="relative">
                <div className="flex flex-col md:items-center mb-8 relative z-10">
                  <motion.div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-2 shadow-lg transition-all duration-500 ${
                      isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' :
                      isCurrent ? 'bg-blue-600 border-blue-400 text-white animate-pulse' :
                      'bg-slate-900 border-white/10 text-ink-subtle'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={24} /> : level.icon}
                  </motion.div>
                  <h2 className={`mt-3 font-black italic text-xl tracking-tighter ${isLocked ? 'text-ink-subtle' : 'text-white'}`}>
                    {level.name.toUpperCase()}
                  </h2>
                  <p className="text-xs text-ink-muted max-w-xs text-center mt-1 hidden md:block">{level.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                  {level.nodes.map((node, nIdx) => {
                    const isNodeDone = data.completedNodes.includes(node.id);
                    const isNextNode = nextStepNode?.id === node.id;

                    return (
                      <motion.div
                        key={node.id}
                        onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                        className={`surface-raised p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                          isNodeDone ? 'border-emerald-500/30 bg-emerald-500/5' : 
                          isLocked ? 'border-white/[0.02] opacity-40' : 
                          isNextNode ? 'border-blue-500/40 ring-1 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' :
                          'border-white/10 hover:border-blue-500/30'
                        }`}
                        initial={{ opacity: 0, x: nIdx % 2 === 0 ? -20 : 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                      >
                        {isNextNode && (
                           <div className="absolute top-0 right-0 p-2">
                              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping absolute" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                           </div>
                        )}

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold text-sm ${isNodeDone ? 'text-emerald-400' : isLocked ? 'text-ink-subtle' : 'text-white'}`}>
                                {node.title}
                              </h3>
                              {node.isGate && <Lock size={12} className="text-amber-500" />}
                              {isNextNode && <Sparkles size={10} className="text-blue-400" />}
                            </div>
                            <p className="text-[10px] text-ink-muted leading-relaxed pr-8">{node.desc}</p>
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isNodeDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-ink-subtle'}`}>
                            {isNodeDone ? <CheckCircle2 size={16} /> : isNextNode ? <Play size={16} className="text-blue-400 fill-current" /> : <Target size={16} />}
                          </div>
                        </div>

                        {/* Progress indicator (mini) */}
                        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className={`h-full ${isNodeDone ? 'bg-emerald-500' : isNextNode ? 'bg-blue-500' : 'bg-blue-500 opacity-30'}`}
                            initial={{ width: 0 }}
                            animate={{ width: isNodeDone ? '100%' : '15%' }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Level Gate Overlay/Requirement */}
                {isNext && level.gate && (
                  <div className="mt-8 surface-raised p-6 rounded-2xl border-amber-500/20 bg-amber-500/5 max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Lock size={18} className="text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase italic">Level Gate Requirements</h4>
                        <p className="text-[10px] text-ink-muted">Master these metrics to unlock {level.name}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold text-ink-muted uppercase">Avg Skill</p>
                        <p className="text-sm font-black text-white">{data.skills.pronunciation > 0 ? (Object.values(data.skills).reduce((a,b)=>a+b,0)/5).toFixed(1) : 0} <span className="text-ink-muted">/ {level.gate.avgSkill}</span></p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold text-ink-muted uppercase">Sessions</p>
                        <p className="text-sm font-black text-white">0 <span className="text-ink-muted">/ {level.gate.minSessions}</span></p>
                      </div>
                      {level.gate.fluency && (
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-ink-muted uppercase">Fluency</p>
                          <p className="text-sm font-black text-white">{data.skills.fluency} <span className="text-ink-muted">/ {level.gate.fluency}</span></p>
                        </div>
                      )}
                      {level.gate.grammar && (
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-ink-muted uppercase">Grammar</p>
                          <p className="text-sm font-black text-white">{data.skills.grammar} <span className="text-ink-muted">/ {level.gate.grammar}</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="surface-raised p-6 rounded-2xl border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                <Info size={24} />
              </div>
              <div>
                <p className="font-bold text-sm text-white">How it works</p>
                <p className="text-[10px] text-ink-muted max-w-md">Your roadmap is updated after every AI-evaluated session. We use Exponential Moving Averages (EMA) to ensure your scores reflect your current ability fairly.</p>
              </div>
           </div>
           <button 
            onClick={() => navigate('/learn')}
            className="px-8 py-3 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 italic tracking-tighter text-sm"
           >
             CONTINUE JOURNEY <ChevronRight size={18} />
           </button>
        </div>
      </motion.div>
    </div>
  );
}
