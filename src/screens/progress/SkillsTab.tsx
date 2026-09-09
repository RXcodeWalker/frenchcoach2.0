import { motion } from 'framer-motion';
import { fadeUp } from '../../components/motion/variants';
import { useApp } from '../../context/AppContext';
import { SKILL_DEFS } from '../../services/coaching/diagnosticEngine';

const CATEGORY_MAP: Record<string, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  fluency: 'Fluency',
  structure: 'Structure',
};

function masteryPct(score: number): number {
  return Math.min(100, Math.round(score * 100));
}

export function SkillsTab() {
  const { state } = useApp();
  const { skillProfile } = state;

  const hasData = Object.keys(skillProfile).length > 0;

  if (!hasData) {
    return (
      <motion.div variants={fadeUp} className="rounded-xl surface p-8 text-center">
        <p className="text-ink-muted text-sm">Complete a practice session to see your skill breakdown.</p>
      </motion.div>
    );
  }

  const categories = Array.from(new Set(Object.values(SKILL_DEFS).map(d => d.category)));

  return (
    <motion.div variants={fadeUp} className="space-y-3">
      {categories.map(cat => {
        const catSkills = Object.entries(SKILL_DEFS)
          .filter(([, def]) => def.category === cat)
          .map(([id, def]) => ({ id, def, entry: skillProfile[id] }))
          .filter(({ entry }) => entry !== undefined);

        if (catSkills.length === 0) return null;

        return (
          <div key={cat} className="rounded-xl surface p-4">
            <h3 className="font-bold text-white text-[10px] uppercase tracking-wider mb-3">
              {CATEGORY_MAP[cat] ?? cat}
            </h3>
            <div className="space-y-2.5">
              {catSkills.map(({ id, def, entry }) => {
                const pct = masteryPct(entry!.score);
                return (
                  <div key={id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-ink-muted">{def.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-white">{pct}%</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                          pct >= 70 ? 'bg-emerald-500/10 text-emerald-400' : pct >= 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {pct >= 70 ? 'Strong' : pct >= 50 ? 'Improving' : 'Focus'}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-navy-300 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: pct >= 70
                            ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.6) 50%, rgba(16, 185, 129, 0.3) 100%)'
                            : pct >= 50
                            ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.6) 50%, rgba(245, 158, 11, 0.3) 100%)'
                            : 'linear-gradient(90deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.6) 50%, rgba(239, 68, 68, 0.3) 100%)',
                          backgroundSize: '200% 100%',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] as const }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
