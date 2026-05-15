import React from 'react';
import { Volume2 } from 'lucide-react';

interface VocabItem {
  fr: string;
  en: string;
  type: string;
}

interface VocabListViewProps {
  items: VocabItem[];
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
          <div>
            <p className="text-lg font-bold text-white mb-0.5">{item.fr}</p>
            <p className="text-xs text-slate-400 font-medium italic">{item.en}</p>
          </div>
          <button 
            onClick={() => speak(item.fr)}
            className="p-3 bg-white/5 rounded-xl text-slate-400 group-hover:text-violet-400 group-hover:bg-violet-500/10 transition-all"
          >
            <Volume2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};
