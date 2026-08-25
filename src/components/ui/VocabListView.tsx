import React from 'react';
import { Volume2 } from 'lucide-react';
import type { VocabEntry } from '../../features/roleplay/types';

interface VocabListViewProps {
  items: VocabEntry[];
}

export const VocabListView: React.FC<VocabListViewProps> = ({ items }) => {
  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/[0.07] transition-all"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-lg font-bold text-white">
                {item.pos === 'noun' && item.article ? `${item.article} ` : ''}
                {item.fr}
              </p>
              {item.pos === 'noun' && item.gender && (
                <span className="text-[10px] font-black text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-md px-1.5 py-0.5 uppercase">
                  {item.gender}
                </span>
              )}
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.pos}</span>
            </div>
            <p className="text-xs text-slate-400 font-medium italic">{item.en}</p>
            {item.literalEn && (
              <p className="text-[10px] text-slate-500 mt-0.5">lit. "{item.literalEn}"</p>
            )}
            {item.note && (
              <p className="text-[10px] text-amber-300/80 mt-1">{item.note}</p>
            )}
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">{item.register}</p>
          </div>
          <button
            onClick={() => speak(item.fr)}
            className="p-3 bg-white/5 rounded-xl text-slate-400 group-hover:text-violet-400 group-hover:bg-violet-500/10 transition-all shrink-0"
          >
            <Volume2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};
