import { motion } from 'framer-motion';
import { Brain, Quote, Sparkles } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';

interface Props {
  quote: { text: string; translation: string };
  weakestTopic: string | null;
  onLearn: () => void;
}

export function DailyCards({ quote, weakestTopic, onLearn }: Props) {
  return (
    <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="relative overflow-hidden rounded-xl glass border-cyan-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center flex-shrink-0">
            <Brain size={15} className="text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">AI Suggests</span>
              <Sparkles size={10} className="text-cyan-400" />
            </div>
            <p className="text-white font-semibold text-sm">Focus on <span className="text-cyan-300">{weakestTopic ?? 'General Practice'}</span></p>
            <p className="text-[10px] text-slate-600 mt-0.5">Target this topic to raise your overall score.</p>
          </div>
          <motion.button
            onClick={onLearn}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500/8 border border-cyan-500/15 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/15 transition-all"
            whileTap={{ scale: 0.95 }}
          >
            Go
          </motion.button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl glass border-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/8 border border-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Quote size={15} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Daily Motivation</span>
            <p className="text-white font-bold text-sm mt-0.5 italic leading-snug">{quote.text}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{quote.translation}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
