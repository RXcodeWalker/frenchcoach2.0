import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';

interface VocabItem {
  fr: string;
  en: string;
  type: string;
}

interface FlashcardDeckProps {
  items: VocabItem[];
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="relative w-full max-w-[300px] h-[350px] perspective-1000">
        <motion.div
          className="w-full h-full relative cursor-pointer"
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Side */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center shadow-2xl backface-hidden"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200 mb-4 opacity-60">French</span>
            <h2 className="text-3xl font-black text-white italic tracking-tighter mb-4">{currentItem?.fr}</h2>
            <button 
              onClick={(e) => speak(e, currentItem?.fr)}
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 opacity-60">English</span>
            <h2 className="text-3xl font-black text-white italic tracking-tighter">{currentItem?.en}</h2>
            <p className="absolute bottom-8 text-[10px] font-bold text-slate-600 uppercase tracking-widest opacity-40">Click to flip back</p>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={prevCard}
          className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
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
          className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
