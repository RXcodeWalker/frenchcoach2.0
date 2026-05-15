import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Target } from 'lucide-react';

export interface Objective {
  id: string;
  text: string;
  isCompleted: boolean;
}

interface MissionObjectivesListProps {
  objectives: Objective[];
}

export const MissionObjectivesList: React.FC<MissionObjectivesListProps> = ({ objectives }) => {
  return (
    <div className="glass-elevated rounded-3xl p-6 border-violet-500/20 bg-navy/40 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-4">
        <Target size={16} className="text-violet-400" />
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mission Objectives</h3>
      </div>
      
      <div className="space-y-3">
        {objectives.map((obj) => (
          <div key={obj.id} className="flex items-start gap-3 group">
            <div className={`mt-0.5 shrink-0 transition-colors ${obj.isCompleted ? 'text-emerald-500' : 'text-slate-600'}`}>
              {obj.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            </div>
            <p className={`text-xs font-bold transition-colors ${
              obj.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200 group-hover:text-white'
            }`}>
              {obj.text}
            </p>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Completion</span>
          <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">
            {Math.round((objectives.filter(o => o.isCompleted).length / (objectives.length || 1)) * 100)}%
          </span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${(objectives.filter(o => o.isCompleted).length / (objectives.length || 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
