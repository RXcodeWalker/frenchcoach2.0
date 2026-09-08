import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getModeCardClasses } from '../animations';

export interface ModeOption {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

interface ModePickerCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
  titleClassName?: string;
}

export function ModePickerCard({
  icon,
  title,
  description,
  color,
  onClick,
  titleClassName = '',
}: ModePickerCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`glass-elevated p-8 rounded-3xl text-left transition-all border border-white/10 group ${getModeCardClasses(color)}`}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className={`text-xl font-black text-white mb-2 ${titleClassName}`}>{title}</h3>
      <p className="text-ink-muted text-sm leading-relaxed">{description}</p>
    </motion.button>
  );
}

interface ModePickerGridProps {
  title: string;
  subtitle?: string;
  modes: ModeOption[];
  onSelect: (id: string) => void;
  onBack: () => void;
  columns?: 2 | 3;
  titleClassName?: string;
  cardTitleClassName?: string;
}

export function ModePickerGrid({
  title,
  subtitle,
  modes,
  onSelect,
  onBack,
  columns = 2,
  titleClassName = '',
  cardTitleClassName = '',
}: ModePickerGridProps) {
  const gridClass =
    columns === 3
      ? 'grid grid-cols-1 md:grid-cols-3 gap-6'
      : 'grid grid-cols-1 md:grid-cols-2 gap-6';

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-4 mb-12">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-white/5 text-ink-muted"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className={`text-3xl font-black text-white ${titleClassName}`}>{title}</h1>
          {subtitle && <p className="text-ink-muted">{subtitle}</p>}
        </div>
      </div>

      <div className={gridClass}>
        {modes.map((mode) => (
          <ModePickerCard
            key={mode.id}
            icon={mode.icon}
            title={mode.title}
            description={mode.description}
            color={mode.color}
            onClick={() => onSelect(mode.id)}
            titleClassName={cardTitleClassName}
          />
        ))}
      </div>
    </div>
  );
}
