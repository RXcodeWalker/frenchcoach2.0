import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, Shield, Zap, Target, BookOpen, Mic2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getReport } from '../services/coaching/diagnosticEngine';
import { getCoachProfile } from '../services/coach/coachProfileService';
import { CONFIDENCE_BAND_HIDDEN_BELOW } from '../domain/learn/ability/thresholds';
import { PageShell } from '../components/layout/PageShell';
import { fadeUp } from '../components/motion/variants';

const CEFR_LEVELS = [
  { id: 'A1', name: 'Beginner', desc: 'Can understand and use familiar everyday expressions.' },
  { id: 'A2', name: 'Elementary', desc: 'Can communicate in simple and routine tasks.' },
  { id: 'B1', name: 'Intermediate', desc: 'Can deal with most situations while traveling.' },
  { id: 'B2', name: 'Upper Intermediate', desc: 'Can interact with a degree of fluency.' },
  { id: 'C1', name: 'Advanced', desc: 'Can express ideas fluently and spontaneously.' },
];

export function MasteryJourney() {
  const navigate = useNavigate();
  const { state } = useApp();
  const report = getReport();

  // docs §14 "Deliberately not shown" — the old XP->CEFR ladder asserted a
  // band nobody measured (any learner reaching 7000 XP was "C1" regardless of
  // what they could actually do). CEFR now comes from deriveAbility via
  // coachProfileService.deriveCEFREstimate (docs §10 "Profile" row), which
  // reads snapshot.demands only, and is confidence-gated the same way
  // SessionStartScreen's measured-level display is (docs §6.3).
  const coachProfile = getCoachProfile();
  const cefrKnown = coachProfile.cefr.confidence >= CONFIDENCE_BAND_HIDDEN_BELOW;
  const currentCEFRIndex = cefrKnown ? CEFR_LEVELS.findIndex(l => l.id === coachProfile.cefr.estimate) : -1;
  const currentCEFR = currentCEFRIndex >= 0 ? CEFR_LEVELS[currentCEFRIndex] : null;
  const nextCEFR = currentCEFRIndex >= 0 ? CEFR_LEVELS[currentCEFRIndex + 1] : null;

  const categories = [
    { id: 'grammar', name: 'Grammar', icon: <Shield size={16} />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'vocabulary', name: 'Vocabulary', icon: <BookOpen size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'fluency', name: 'Fluency', icon: <Mic2 size={16} />, color: 'text-violet-400', bg: 'bg-violet-400/10' },
  ];

  const getCategoryMastery = (cat: string) => {
    if (!report?.allSkills) return 0;
    const skills = report.allSkills.filter((s) => s.category === cat);
    if (skills.length === 0) return 0;
    return Math.round(skills.reduce((acc, s) => acc + (s.mastery ?? 0), 0) / skills.length);
  };

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div variants={fadeUp} className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/explore')}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white">Mastery Journey</h1>
            <p className="text-sm text-slate-500">Your roadmap to French fluency</p>
          </div>
        </motion.div>

        {/* CEFR Progress Path */}
        <motion.div variants={fadeUp} className="glass-elevated p-6 rounded-3xl space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Current Standing</span>
              <h2 className="text-2xl font-black text-white">
                {currentCEFR ? `${currentCEFR.id} - ${currentCEFR.name}` : 'Still getting to know your level'}
              </h2>
            </div>
            <Trophy size={32} className="text-yellow-400" />
          </div>

          <div className="relative pt-8 pb-12">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 rounded-full" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 -translate-y-1/2 rounded-full transition-all duration-1000"
              style={{ width: currentCEFRIndex >= 0 ? `${(currentCEFRIndex / (CEFR_LEVELS.length - 1)) * 100}%` : '0%' }}
            />

            <div className="flex justify-between relative">
              {CEFR_LEVELS.map((level, i) => {
                const isReached = currentCEFRIndex >= 0 && i <= currentCEFRIndex;
                const isCurrent = currentCEFRIndex === i;

                return (
                  <div key={level.id} className="flex flex-col items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${
                      isReached ? 'bg-white border-violet-500 scale-125' : 'bg-navy-400 border-white/10'
                    } ${isCurrent ? 'ring-4 ring-violet-500/20' : ''}`} />
                    <span className={`text-[10px] font-black ${isReached ? 'text-white' : 'text-slate-600'}`}>
                      {level.id}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!cefrKnown && (
            <p className="text-xs text-slate-500 text-center">Answer a few more questions to reveal your level.</p>
          )}

          {nextCEFR && (
            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                <Zap size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Next Goal</p>
                <p className="text-sm font-bold text-white">Reach {nextCEFR.id} level</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Mastery Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const mastery = getCategoryMastery(cat.id);
            return (
              <motion.div 
                key={cat.id}
                variants={fadeUp}
                className="glass-elevated p-5 rounded-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${cat.bg} ${cat.color} rounded-lg`}>
                    {cat.icon}
                  </div>
                  <h3 className="font-bold text-white text-sm">{cat.name}</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-black text-white">{mastery}%</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Mastery</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${cat.bg.replace('/10', '')}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${mastery}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Growth Insights */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-elevated p-6 rounded-3xl border-emerald-500/10">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-emerald-400" />
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Top Skills</h3>
            </div>
            <div className="space-y-3">
              {report?.topStrengths?.slice(0, 3)?.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-xs font-bold text-white">{s.name}</span>
                  </div>
                  <span className="text-xs font-black text-emerald-400">{s.mastery}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-elevated p-6 rounded-3xl border-violet-500/10">
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-violet-400" />
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Milestones</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                  🔥
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{state.profile?.streak_days ?? 0} Day Streak</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Consistency is key</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 opacity-50">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  🎓
                </div>
                <div>
                  <p className="text-xs font-bold text-white">First Exam Passed</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Unlock at B1 level</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}
