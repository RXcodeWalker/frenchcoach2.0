import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { TTS } from '../../services/tts/ttsService';
import type { Question } from '../../types/index';

interface Props {
  question: Question;
  showHint: boolean;
  onToggleHint: () => void;
}

export function QuestionCard({ question, showHint, onToggleHint }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);

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
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
              question.difficulty === 1 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
              question.difficulty === 2 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' :
              'bg-red-500/10 text-red-400 border border-red-500/15'
            }`}>
              {question.difficulty === 1 ? 'Foundation' : question.difficulty === 2 ? 'Core' : 'Extended'}
            </span>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSpeak}
              className={`w-10 h-10 rounded-xl glass border-white/10 flex items-center justify-center transition-colors ${isSpeaking ? 'text-primary border-primary/30' : 'text-slate-400 hover:text-white'}`}
            >
              {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </motion.button>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-4">{question.text}</h2>

          <div className="flex flex-wrap gap-2 mb-6">
            {question.keyVocab.map(word => (
              <motion.span 
                key={word.fr} 
                className="text-[10px] px-3 py-1 rounded-lg bg-primary/10 text-primary-variant border border-primary/20 font-bold uppercase tracking-wider cursor-help group relative"
              >
                {word.fr}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-navy-200 border border-white/10 text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

