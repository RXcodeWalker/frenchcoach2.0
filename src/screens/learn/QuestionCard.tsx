import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronDown, Volume2, VolumeX, Info } from 'lucide-react';
import { TTS } from '../../services/tts/ttsService';
import type { Question } from '../../types/index';
import { deriveDemandLevel } from '../../domain/learn/demand/deriveDemandLevel';
import type { SelectionReason } from '../../domain/learn/selection/types';

interface Props {
  question: Question;
  showHint: boolean;
  onToggleHint: () => void;
  isReview?: boolean;
  /** docs §14 UX #2/#3 — present only on the adaptive path (learnAdaptiveDifficulty live). */
  selectionReason?: SelectionReason | null;
}

const COGNITIVE_DEMAND_LABEL: Record<string, string> = {
  describe: 'Describe',
  explain: 'Explain',
  justify: 'Justify an opinion',
  compare: 'Compare',
  hypothesize: 'Hypothesize',
};

const TIME_FRAME_LABEL: Record<string, string> = {
  present: 'present',
  past: 'past',
  future: 'future',
  conditional: 'conditional',
};

export function QuestionCard({ question, showHint, onToggleHint, isReview, selectionReason }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [revealedVocab, setRevealedVocab] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const handleSpeak = async () => {
    if (isSpeaking) {
      TTS.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    try {
      await TTS.speak(question.text);
    } catch (error) {
      console.error('TTS failed:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        className="relative overflow-hidden rounded-2xl glass-elevated p-6 md:p-8 border-white/5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {question.demands ? (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest bg-violet-500/10 text-violet-300 border border-violet-500/15">
                  {COGNITIVE_DEMAND_LABEL[question.demands.cognitiveDemand] ?? question.demands.cognitiveDemand}
                  {' · '}
                  {question.demands.timeFrames.map(tf => TIME_FRAME_LABEL[tf] ?? tf).join(' + ')}
                  {' · '}
                  {deriveDemandLevel(question.demands)}
                </span>
              ) : (
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                  question.difficulty === 1 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                  question.difficulty === 2 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' :
                  'bg-red-500/10 text-red-400 border border-red-500/15'
                }`}>
                  {question.difficulty === 1 ? 'Foundation' : question.difficulty === 2 ? 'Core' : 'Extended'}
                </span>
              )}
              {isReview && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest bg-cyan-500/10 text-cyan-300 border border-cyan-500/15">
                  Seen before — let's retry it
                </span>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSpeak}
              className={`w-10 h-10 rounded-xl glass border-white/10 flex items-center justify-center transition-colors ${isSpeaking ? 'text-violet-400 border-violet-400/30' : 'text-slate-400 hover:text-white'}`}
            >
              {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </motion.button>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-4">{question.text}</h2>

          <div className="flex flex-wrap gap-2 mb-6">
            {question.keyVocab.map(word => (
              <motion.span
                key={word.fr}
                onClick={() => setRevealedVocab(revealedVocab === word.fr ? null : word.fr)}
                className="text-[10px] px-3 py-1 rounded-lg bg-violet-electric/10 text-violet-300 border border-violet-electric/20 font-bold uppercase tracking-wider cursor-help group relative"
              >
                {word.fr}
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-navy-200 border border-white/10 text-white text-[9px] transition-opacity pointer-events-none whitespace-nowrap ${revealedVocab === word.fr ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {word.en}
                </div>
              </motion.span>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              onClick={onToggleHint}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Lightbulb size={14} />
              {showHint ? 'Hide Hint' : 'Get Hint'}
              <ChevronDown size={12} className={`transition-transform duration-300 ${showHint ? 'rotate-180' : ''}`} />
            </motion.button>
            {selectionReason && (
              <motion.button
                onClick={() => setShowWhy(!showWhy)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Info size={14} />
                Why this question
                <ChevronDown size={12} className={`transition-transform duration-300 ${showWhy ? 'rotate-180' : ''}`} />
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {showHint && (
              <motion.div
                className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-200 leading-relaxed italic"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
              >
                "{question.hint}"
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showWhy && selectionReason && (
              <motion.div
                className="mt-2 p-4 rounded-xl bg-slate-500/5 border border-slate-500/15 text-xs text-slate-300 leading-relaxed"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
              >
                {selectionReason.explanation}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

