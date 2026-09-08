import { motion } from 'framer-motion';
import { fadeUp } from '../../components/motion/variants';
import { useApp } from '../../context/AppContext';
import { SKILL_DEFS } from '../../services/coaching/diagnosticEngine';

const TIERS = [
  {
    name: "Foundations",
    skills: ['gender', 'elision', 'contraction']
  },
  {
    name: "Verbs & Time",
    skills: ['etre_avoir', 'tense_past', 'tense_future', 'subjunctive', 'hypothetical']
  },
  {
    name: "Sentence Structure",
    skills: ['negation', 'preposition', 'relative_pron', 'demonstrative', 'word_count']
  },
  {
    name: "Expression",
    skills: ['connectors', 'opinion', 'contrast', 'comparative', 'confusions']
  },
  {
    name: "Fluency & Vocab",
    skills: ['vocab_range', 'repetition', 'fluency_score', 'pronunciation']
  }
];

export function SkillTreeTab() {
  const { state } = useApp();
  const { skillProfile } = state;

  return (
    <div className="space-y-4">
      {TIERS.map((tier, tIdx) => (
        <motion.div
          key={tier.name}
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: tIdx * 0.1 }}
          className="rounded-xl surface-raised p-5"
        >
          <h3 className="font-bold text-white text-[10px] uppercase tracking-wider mb-4 opacity-50">
            Tier {tIdx + 1}: {tier.name}
          </h3>
          <div className="space-y-4">
            {tier.skills.map(skillId => {
              const def = SKILL_DEFS[skillId];
              const entry = skillProfile[skillId];
              const mastery = entry ? Math.round(entry.score * 100) : 0;
              const isUnlocked = entry !== undefined || tIdx === 0;

              return (
                <motion.div
                  key={skillId}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all duration-500 ${
                    isUnlocked 
                      ? mastery >= 80 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'bg-violet-electric/10 border-violet-electric/20 text-violet-400'
                      : 'bg-navy-300 border-white/[0.03] opacity-35 grayscale'
                  }`}>
                    {def?.icon ?? '❓'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <p className={`text-xs font-bold ${isUnlocked ? 'text-white' : 'text-slate-200'}`}>
                        {def?.name ?? skillId}
                      </p>
                      {isUnlocked && (
                        <span className={`text-[10px] font-black ${
                          mastery >= 80 ? 'text-emerald-400' : 'text-violet-400'
                        }`}>
                          {mastery}%
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-navy-300/50 rounded-full overflow-hidden w-full">
                      <motion.div
                        className={`h-full rounded-full ${
                          mastery >= 80 ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-electric to-indigo-400'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${mastery}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    {isUnlocked && def?.desc && (
                      <p className="text-[9px] text-ink-muted mt-1 italic leading-tight">
                        {def.desc}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
