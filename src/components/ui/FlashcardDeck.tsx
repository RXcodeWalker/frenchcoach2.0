import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { TTS } from '../../services/tts/ttsService';
import type { VocabEntry } from '../../features/roleplay/types';

interface FlashcardDeckProps {
  items: VocabEntry[];
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentItem = items[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }, 150);
  };

  const speak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    TTS.speak(text);
  };

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="relative w-full max-w-[300px] h-[350px] perspective-1000">
        <motion.div
          className="w-full h-full relative cursor-pointer"
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' } as React.CSSProperties}
        >
          {/* Front Side */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center shadow-2xl backface-hidden"
            style={{ transform: 'rotateY(0deg)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200 mb-4 opacity-60">French</span>
            <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">
              {currentItem?.pos === 'noun' && currentItem?.article ? `${currentItem.article} ` : ''}
              {currentItem?.fr}
            </h2>
            {currentItem?.pos === 'noun' && currentItem?.gender && (
              <span className="text-[10px] font-black text-violet-100 bg-white/10 rounded-md px-2 py-0.5 uppercase mb-2">
                {currentItem.gender}
              </span>
            )}
            <button
              onClick={(e) => speak(e, currentItem?.fr ?? '')}
              className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
            >
              <Volume2 size={24} />
            </button>
            <p className="absolute bottom-8 text-[10px] font-bold text-violet-300 uppercase tracking-widest opacity-40">Click to reveal translation</p>
          </div>

          {/* Back Side */}
          <div
            className="absolute inset-0 bg-slate-900 border-2 border-violet-500/30 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center shadow-2xl backface-hidden"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-muted mb-4 opacity-60">English</span>
            <h2 className="text-3xl font-black text-white italic tracking-tighter">{currentItem?.en}</h2>
            {currentItem?.literalEn && (
              <p className="text-xs text-ink-muted italic mt-2">lit. "{currentItem.literalEn}"</p>
            )}
            {(currentItem?.note || currentItem?.register) && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {currentItem?.register && (
                  <span className="text-[9px] font-black text-ink-muted uppercase tracking-widest">{currentItem.register}</span>
                )}
              </div>
            )}
            {currentItem?.note && (
              <p className="text-[10px] text-amber-300/80 mt-2 max-w-[220px]">{currentItem.note}</p>
            )}
            <p className="absolute bottom-8 text-[10px] font-bold text-ink-subtle uppercase tracking-widest opacity-40">Click to flip back</p>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={prevCard}
          className="p-4 bg-white/5 rounded-2xl text-ink-muted hover:text-white hover:bg-white/10 transition-all border border-white/5"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <p className="text-xs font-black text-white italic tracking-tight">{currentIndex + 1} / {items.length}</p>
          <div className="flex gap-1 mt-1 justify-center">
            {items.map((_, i) => (
              <div 
                key={i} 
                className={`w-1 h-1 rounded-full transition-all ${i === currentIndex ? 'bg-violet-500 w-3' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        </div>
        <button 
          onClick={nextCard}
          className="p-4 bg-white/5 rounded-2xl text-ink-muted hover:text-white hover:bg-white/10 transition-all border border-white/5"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
