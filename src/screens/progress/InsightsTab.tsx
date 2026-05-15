import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Target, Lightbulb, TrendingDown, TrendingUp, ChevronDown, AlertCircle, PlayCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getReport } from '../../services/coaching/diagnosticEngine';
import { getCoachingTip } from '../../services/coaching/coachService';
import { fadeUp } from '../../components/motion/variants';
import { Sparkline } from '../../components/Sparkline';

export function InsightsTab() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const report = getReport();
  const [expandedMistakes, setExpandedMistakes] = useState<string | null>(null);

  if (!report.hasData) {
    return (
      <motion.div variants={fadeUp} className="rounded-xl glass p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-navy-300 flex items-center justify-center mx-auto mb-3">
          <Target size={20} className="text-slate-600" />
        </div>
        <h3 className="text-white font-bold mb-1">No Insights Yet</h3>
        <p className="text-slate-500 text-xs">Complete 2-3 sessions to unlock deep weakness analysis.</p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeUp} className="space-y-4">
      {/* Weaknesses Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <TrendingDown size={14} className="text-red-400" />
          <h3 className="font-bold text-white text-[10px] uppercase tracking-wider">Top Weaknesses</h3>
        </div>
        
        {report.topWeaknesses?.length ? (
          report.topWeaknesses.map((w: any) => {
            const tip = getCoachingTip(w.id);
            const isExpanded = expandedMistakes === w.id;

            return (
              <motion.div 
                key={w.id} 
                className="rounded-xl glass-elevated border border-red-500/10 overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-center text-lg">
                      {w.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm truncate">{w.name}</h4>
                          {w.recentScores && <Sparkline data={w.recentScores} color="#F87171" width={40} height={12} />}
                        </div>
                        <span className="text-[10px] font-black text-red-400">{w.mastery}%</span>
                      </div>

                      {tip && (
                        <div className="bg-navy-300/50 rounded-lg p-2.5 flex gap-2 items-start border border-white/[0.02]">
                          <Lightbulb size={12} className="text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-slate-300 leading-relaxed">
                            <span className="font-bold text-amber-400/80">Pro Tip:</span> {tip}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <motion.button
                          onClick={() => {
                            dispatch({ type: 'SET_FOCUSED_SKILL', skillId: w.id });
                            navigate('/rapid-fire');
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-black transition-all border border-red-500/20"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <PlayCircle size={12} />
                          PRACTICE THIS
                        </motion.button>

                        {w.mistakes && w.mistakes.length > 0 && (
                          <button 
                            onClick={() => setExpandedMistakes(isExpanded ? null : w.id)}
                            className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 hover:text-white transition-colors"
                          >
                            <ChevronDown size={10} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded ? 'Hide Recent Mistakes' : `View ${w.mistakes.length} Recent Mistakes`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && w.mistakes && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-navy-400/30 border-t border-white/[0.03]"
                    >
                      <div className="p-3 space-y-2">
                        {w.mistakes.map((m: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <AlertCircle size={10} className="text-red-400/50 mt-1 shrink-0" />
                            <div className="flex-1">
                              {m.transcript && (
                                <p className="text-[10px] text-slate-400 italic">"{m.transcript}"</p>
                              )}
                              <p className="text-[10px] text-emerald-400 font-bold mt-0.5">→ {m.corrected}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : (
          <div className="rounded-xl glass p-5 text-center border border-dashed border-white/5">
            <p className="text-slate-500 text-[10px]">No major weaknesses detected yet. Keep it up!</p>
          </div>
        )}
      </div>

      {/* Strengths Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pt-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <h3 className="font-bold text-white text-[10px] uppercase tracking-wider">Top Strengths</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {report.topStrengths?.map((s: any) => (
            <motion.div 
              key={s.id} 
              className="rounded-xl glass border border-emerald-500/10 p-3 flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/5 flex items-center justify-center text-sm">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-white text-[10px] truncate">{s.name}</h4>
                  {s.recentScores && <Sparkline data={s.recentScores} color="#10B981" width={30} height={10} />}
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1 bg-navy-300 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.mastery}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-emerald-400">{s.mastery}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary Stat */}
      <div className="rounded-xl bg-gradient-to-br from-violet-electric/10 to-indigo-500/10 border border-violet-electric/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-violet-400 uppercase font-black tracking-widest mb-0.5">Overall Mastery</p>
          <p className="text-2xl font-black text-white">{report.avgMastery}%</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Sessions Analyzed</p>
          <p className="text-lg font-black text-white">{report.sessionsAnalyzed}</p>
        </div>
      </div>
    </motion.div>
  );
}
