import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Brain, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  Zap,
  BookOpen,
  History,
  Lightbulb
} from 'lucide-react';
import { getReport } from '../services/coaching/diagnosticEngine';
import { PageShell } from '../components/layout/PageShell';
import { fadeUp } from '../components/motion/variants';
import { MistakeLogViewer } from '../components/ui/MistakeLogViewer';
import { MicroDrillModal } from '../components/ui/MicroDrillModal';

// Smart Mode Suggestions Mapping
const SKILL_TO_MODE: Record<string, { label: string; route: string }> = {
  vocab_range: { label: 'Explore Mode', route: '/explore' },
  pronunciation: { label: 'Accent Analyzer', route: '/accent-analyzer' },
  fluency_score: { label: 'Speed Speaking', route: '/speed-speaking' },
  word_count: { label: 'Story Mode', route: '/story-mode' },
  opinion: { label: 'Speaking Arena', route: '/speaking-arena' },
  connectors: { label: 'Sentence Rebuilder', route: '/sentence-rebuilder' },
};

export function WeaknessAnalysis() {
  const navigate = useNavigate();
  const report = getReport();
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [activeDrillSkillId, setActiveDrillSkillId] = useState<string | null>(null);

  const handlePracticeClick = (skillId: string) => {
    // If there's a specific mode suggestion, maybe show a hint or just route
    // For grammar-heavy skills, show the MicroDrill
    const grammarSkills = ['elision', 'negation', 'preposition', 'subjunctive', 'relative_pron', 'tense_past', 'hypothetical', 'gender', 'demonstrative', 'comparative'];
    
    if (grammarSkills.includes(skillId)) {
      setActiveDrillSkillId(skillId);
    } else if (SKILL_TO_MODE[skillId]) {
      navigate(SKILL_TO_MODE[skillId].route);
    } else {
      navigate('/learn');
    }
  };

  if (!report.hasData) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center border border-white/5">
            <Brain size={40} className="text-ink-subtle" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Not enough data</h1>
            <p className="text-ink-muted text-sm max-w-xs mx-auto">Complete at least 2 speaking sessions to unlock your personalized weakness analysis.</p>
          </div>
          <button
            onClick={() => navigate('/learn')}
            className="px-8 py-3 bg-violet-electric text-white font-black rounded-xl shadow-lg shadow-violet-500/20 hover:scale-105 transition-all uppercase italic tracking-wider"
          >
            Start Practicing
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl surface flex items-center justify-center text-ink-muted hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Search size={14} className="text-rose-500" />
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">AI Diagnostic</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Weakness Analysis</h1>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <p className="text-[10px] font-bold text-ink-subtle uppercase">System Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-tighter italic">Engine Active</span>
          </div>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surface-raised p-6 rounded-3xl border-violet-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Brain size={80} />
          </div>
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Overall Mastery</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-white italic tracking-tighter">{report.avgMastery}%</p>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <TrendingUp size={10} /> +3%
            </div>
          </div>
        </div>
        <div className="surface-raised p-6 rounded-3xl border-rose-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={80} />
          </div>
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Critical Issues</p>
          <p className="text-4xl font-black text-rose-500 italic tracking-tighter">{report.topWeaknesses?.length ?? 0}</p>
        </div>
        <div className="surface-raised p-6 rounded-3xl border-emerald-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle2 size={80} />
          </div>
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Mastered Skills</p>
          <p className="text-4xl font-black text-emerald-400 italic tracking-tighter">{report.topStrengths?.length ?? 0}</p>
        </div>
      </motion.div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Top Weaknesses - THE FOCUS LIST */}
        <motion.div variants={fadeUp} className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-ink-subtle uppercase tracking-[0.2em] flex items-center gap-2">
              <Target size={14} className="text-rose-500" />
              High Priority Focus
            </h2>
          </div>
          <div className="space-y-3">
            {report.topWeaknesses?.map(skill => (
              <div 
                key={skill.id} 
                className={`surface-raised rounded-2xl border-l-4 border-l-rose-500 overflow-hidden transition-all duration-300 ${
                  expandedSkillId === skill.id ? 'bg-white/[0.03] ring-1 ring-white/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div 
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedSkillId(expandedSkillId === skill.id ? null : skill.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-xl shadow-lg shadow-rose-500/5">
                        {skill.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-rose-400 transition-colors">{skill.name}</h3>
                        <p className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">{skill.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-black text-white">{skill.mastery}%</p>
                        <p className="text-[8px] font-bold text-ink-subtle uppercase tracking-widest">Mastery</p>
                      </div>
                      <motion.div
                        animate={{ rotate: expandedSkillId === skill.id ? 180 : 0 }}
                        className="text-ink-subtle"
                      >
                        <ChevronDown size={16} />
                      </motion.div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-ink-muted leading-relaxed mb-4">
                    {skill.desc} You've made mistakes in {Math.round(skill.errors / skill.observations * 100)}% of tracked instances.
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink-subtle">
                      <TrendingDown size={12} className="text-rose-500" />
                      TRENDING DOWN
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        className="flex items-center gap-1 text-[10px] font-bold text-ink-muted hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSkillId(expandedSkillId === skill.id ? null : skill.id);
                        }}
                      >
                        <History size={12} /> {expandedSkillId === skill.id ? 'HIDE' : 'VIEW'} HISTORY
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePracticeClick(skill.id);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-400 transition-colors"
                      >
                        PRACTICE THIS <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>

                  {SKILL_TO_MODE[skill.id] && (
                    <div className="mt-4 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-between group/suggest">
                      <div className="flex items-center gap-2">
                        <Lightbulb size={12} className="text-violet-400" />
                        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-tighter">Recommended: </span>
                        <span className="text-[10px] font-black text-white uppercase italic">{SKILL_TO_MODE[skill.id].label}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(SKILL_TO_MODE[skill.id].route);
                        }}
                        className="text-[10px] font-bold text-violet-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        GO <ChevronRight size={10} />
                      </button>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {expandedSkillId === skill.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="px-5 pb-5 border-t border-white/5 bg-navy/20"
                    >
                      <div className="pt-4">
                        <h4 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          <History size={12} /> Recent Mistakes & Corrections
                        </h4>
                        <MistakeLogViewer mistakes={skill.mistakes || []} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Center & Strengths */}
        <motion.div variants={fadeUp} className="space-y-8">
          {/* AI Recommendation */}
          <div className="surface rounded-3xl p-6 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent border-violet-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                <Sparkles size={16} />
              </div>
              <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">AI Recommendation</h3>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed mb-6">
              Based on your recent performance, your biggest hurdle is <span className="text-white font-bold">{report.topWeaknesses?.[0]?.name || 'Grammar Consistency'}</span>.
              We've generated a specialized <span className="text-violet-400 font-bold">Sentence Rebuilder</span> session focusing on your weak spots.
            </p>
            <button 
              onClick={() => handlePracticeClick(report.topWeaknesses?.[0]?.id || 'connectors')}
              className="w-full py-4 bg-white text-slate-950 font-black rounded-xl shadow-xl shadow-white/5 hover:scale-[1.02] transition-all uppercase italic tracking-wider text-xs flex items-center justify-center gap-2"
            >
              <Zap size={14} className="fill-current" />
              Launch Recovery Session
            </button>
          </div>

          {/* Top Strengths */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-ink-subtle uppercase tracking-[0.2em] flex items-center gap-2 px-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Strong Foundations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.topStrengths?.map(skill => (
                <div key={skill.id} className="surface-raised p-4 rounded-2xl border-emerald-500/10 group">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{skill.icon}</span>
                    <h3 className="font-bold text-white text-xs">{skill.name}</h3>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.mastery}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">{skill.mastery}% Mastered</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Breakdown Link */}
          <button 
            onClick={() => navigate('/progress')}
            className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[10px] font-bold text-ink-subtle hover:text-white hover:border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <BookOpen size={14} />
            VIEW FULL SKILL PROFILE
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {activeDrillSkillId && (
          <MicroDrillModal 
            skillId={activeDrillSkillId} 
            onClose={() => setActiveDrillSkillId(null)} 
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}
