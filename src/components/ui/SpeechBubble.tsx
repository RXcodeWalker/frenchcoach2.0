import React from 'react';
import { motion } from 'framer-motion';

interface SpeechBubbleProps {
  text: string;
  sender: 'ai' | 'user';
  name?: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, sender, name }) => {
  const isAI = sender === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`relative w-full max-w-2xl mx-auto mb-6 ${isAI ? 'mr-auto' : 'ml-auto'}`}
    >
      {/* Name Tag */}
      {name && (
        <div className={`absolute -top-3 ${isAI ? 'left-8' : 'right-8'} px-4 py-1 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full z-10 shadow-lg`}>
          {name}
        </div>
      )}

      <div className={`p-6 rounded-[2rem] backdrop-blur-md shadow-2xl border ${
        isAI 
          ? 'bg-white/10 border-white/10 rounded-tl-none' 
          : 'bg-violet-600/20 border-violet-500/30 rounded-tr-none'
      }`}>
        <p className={`text-lg md:text-xl font-medium leading-relaxed ${isAI ? 'text-white' : 'text-violet-100 italic'}`}>
          {isAI ? text : `"${text}"`}
        </p>
      </div>

      {/* Bubble Tail */}
      <div className={`absolute top-0 w-8 h-8 ${isAI ? '-left-2' : '-right-2'} overflow-hidden`}>
        <div className={`w-full h-full transform origin-top-${isAI ? 'left' : 'right'} rotate-45 ${
          isAI ? 'bg-white/10 border-l border-t border-white/10' : 'bg-violet-600/20 border-r border-t border-violet-500/30'
        }`} />
      </div>
    </motion.div>
  );
};
