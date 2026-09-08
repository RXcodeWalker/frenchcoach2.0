import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { LetterGrade } from '../utils/gradeFromStats';

export interface GameResultsStat {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

interface GameResultsCardProps {
  grade?: LetterGrade;
  gradeColor?: string;
  title: string;
  subtitle?: ReactNode;
  stats: GameResultsStat[];
  showTrophy?: boolean;
  borderClassName?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function GameResultsCard({
  grade,
  gradeColor = 'text-ink-muted',
  title,
  subtitle,
  stats,
  showTrophy = !!grade,
  borderClassName = '',
  children,
  actions,
  className = '',
}: GameResultsCardProps) {
  return (
    <div className={`min-h-[80vh] flex flex-col items-center justify-center p-6 ${className}`}>
      <motion.div
        className={`max-w-md w-full glass-elevated p-8 text-center space-y-6 ${borderClassName}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {grade !== undefined && (
          <div className="relative">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
              <span className={`text-6xl font-black italic ${gradeColor}`}>{grade}</span>
            </div>
            {showTrophy && (
              <motion.div
                className="absolute -top-2 -right-2 bg-slate-900 border border-white/10 p-2 rounded-lg"
                initial={{ rotate: 20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <Trophy size={20} className="text-amber-400" />
              </motion.div>
            )}
          </div>
        )}

        <div>
          <h1 className="text-3xl font-black text-white mb-1 uppercase italic tracking-tighter">
            {title}
          </h1>
          {subtitle && <p className="text-ink-muted text-sm">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 py-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl bg-white/5 border border-white/10 text-center"
            >
              <p className="text-[10px] text-ink-muted font-bold uppercase mb-1">
                {stat.label}
              </p>
              <p className={`text-2xl font-black text-white ${stat.valueClassName ?? ''}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {children}

        {actions && <div className="flex flex-col gap-3 pt-4">{actions}</div>}
      </motion.div>
    </div>
  );
}
