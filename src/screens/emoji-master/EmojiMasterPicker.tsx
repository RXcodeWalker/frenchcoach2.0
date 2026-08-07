import { motion } from 'framer-motion';
import { ArrowLeft, Keyboard, RefreshCcw, Sparkles, Swords, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ModeBestEntry, EmojiCategory, GameMode, RunConfig } from './types';
import { getModeBest } from './emojiMasterStorage';

const CATEGORIES: { id: EmojiCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'animals', label: 'Animals' },
  { id: 'objects', label: 'Objects' },
  { id: 'nature', label: 'Nature' },
  { id: 'activities', label: 'Activities' },
  { id: 'sentences', label: 'Sentences' },
];

interface ModeCardDef {
  id: GameMode;
  title: string;
  description: string;
  icon: ReactNode;
  accent: string;
  hero?: boolean;
}

const MODES: ModeCardDef[] = [
  {
    id: 'arena',
    title: 'Emoji Arena',
    description: 'Duel an emoji spirit — type French to deal damage. 3 hearts. Overdrive at streak 5.',
    icon: <Swords className="text-yellow-400" size={28} />,
    accent: 'border-yellow-500/40 hover:border-yellow-400/70',
    hero: true,
  },
  {
    id: 'classic',
    title: 'Classic',
    description: 'Emoji → French multiple choice. Ten questions.',
    icon: <Sparkles className="text-yellow-400" size={22} />,
    accent: 'border-yellow-500/20 hover:border-yellow-500/40',
  },
  {
    id: 'reverse',
    title: 'Reverse',
    description: 'French → emoji. Solidify the mapping both ways.',
    icon: <RefreshCcw className="text-blue-400" size={22} />,
    accent: 'border-blue-500/20 hover:border-blue-500/40',
  },
  {
    id: 'hardcore',
    title: 'Hardcore',
    description: 'Type the answer against a per-question timer.',
    icon: <Keyboard className="text-purple-400" size={22} />,
    accent: 'border-purple-500/20 hover:border-purple-500/40',
  },
  {
    id: 'blitz',
    title: 'Speed Blitz',
    description: '60 seconds. How many can you decode?',
    icon: <Timer className="text-red-400" size={22} />,
    accent: 'border-red-500/20 hover:border-red-500/40',
  },
];

function PbPill({ best }: { best?: ModeBestEntry }) {
  if (!best) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
        No best yet
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
      Best {best.modeScore} · {best.bestGrade} · 🔥{best.maxStreak}
    </span>
  );
}

interface EmojiMasterPickerProps {
  category: EmojiCategory;
  onCategoryChange: (c: EmojiCategory) => void;
  onSelect: (config: RunConfig) => void;
  onBack: () => void;
}

export function EmojiMasterPicker({
  category,
  onCategoryChange,
  onSelect,
  onBack,
}: EmojiMasterPickerProps) {
  const hero = MODES.find((m) => m.hero)!;
  const grid = MODES.filter((m) => !m.hero);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-white/5 text-slate-400"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
              Fun Mode
            </span>
          </div>
          <h1 className="text-3xl font-black text-white">Emoji Master</h1>
          <p className="text-sm text-slate-500 mt-1">
            Decode French from emojis — pick a mode and category
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategoryChange(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              category === c.id
                ? 'bg-yellow-400/15 border-yellow-400/50 text-yellow-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <motion.button
        type="button"
        onClick={() => onSelect({ mode: hero.id, category })}
        className={`w-full glass-elevated p-8 rounded-3xl text-left border transition-all ${hero.accent}`}
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block mb-3 text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20">
              Recommended
            </span>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                {hero.icon}
              </div>
              <h2 className="text-2xl font-black text-white">{hero.title}</h2>
            </div>
            <p className="text-slate-400 text-sm max-w-xl">{hero.description}</p>
          </div>
          <PbPill best={getModeBest(hero.id)} />
        </div>
      </motion.button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grid.map((mode) => (
          <motion.button
            key={mode.id}
            type="button"
            onClick={() => onSelect({ mode: mode.id, category })}
            className={`glass-elevated p-6 rounded-3xl text-left border transition-all ${mode.accent}`}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              {mode.icon}
            </div>
            <h3 className="text-lg font-black text-white mb-1">{mode.title}</h3>
            <p className="text-slate-400 text-sm mb-3">{mode.description}</p>
            <PbPill best={getModeBest(mode.id)} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
