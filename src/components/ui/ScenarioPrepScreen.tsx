import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen,
  Layers,
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { VocabListView } from './VocabListView';
import { FlashcardDeck } from './FlashcardDeck';
import { fetchScenarioVocab, type VocabPrepData } from '../../services/api/apiClient';

interface ScenarioPrepScreenProps {
  topic: string;
  onReady: () => void;
  onCancel: () => void;
}

export const ScenarioPrepScreen: React.FC<ScenarioPrepScreenProps> = ({ topic, onReady, onCancel }) => {
  const [viewMode, setViewMode] = useState<'list' | 'flashcards'>('list');
  const [vocabData, setVocabData] = useState<VocabPrepData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVocab = async () => {
      try {
        setIsLoading(true);
        const data = await fetchScenarioVocab(topic);
        setVocabData(data);
      } catch (err) {
        console.error("Failed to fetch prep vocab:", err);
        setError("Could not generate vocabulary for this topic. You can still proceed to the roleplay.");
      } finally {
        setIsLoading(false);
      }
    };
    loadVocab();
  }, [topic]);

  return (
    <div className="flex flex-col h-full bg-navy/60 backdrop-blur-xl rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 pb-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Preparation Phase</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Master the keywords before you speak</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="text-xs font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>

        <div className="flex gap-2 p-1 bg-black/20 rounded-2xl border border-white/5 w-fit">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'list' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
            }`}
          >
            <BookOpen size={14} /> Study List
          </button>
          <button 
            onClick={() => setViewMode('flashcards')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'flashcards' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
            }`}
          >
            <Layers size={14} /> Flashcards
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center py-12"
            >
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-violet-500 rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-2">Generating Vocab...</h3>
              <p className="text-xs text-slate-500 max-w-xs">Our AI is curating the most useful words and phrases for this scenario.</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center py-12"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20 text-rose-500">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-2">System Offline</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-8">{error}</p>
              <button 
                onClick={onReady}
                className="px-8 py-3 bg-white text-slate-950 font-black rounded-xl hover:scale-105 transition-all uppercase italic tracking-wider text-xs"
              >
                Skip to Roleplay
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-amber-400 fill-amber-400" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Essential Vocabulary</h4>
                </div>
                {viewMode === 'list' ? (
                  <VocabListView items={vocabData?.vocab || []} />
                ) : (
                  <FlashcardDeck items={vocabData?.vocab || []} />
                )}
              </div>

              {vocabData?.phrases && vocabData.phrases.length > 0 && viewMode === 'list' && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={14} className="text-violet-400 fill-violet-400" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Useful Phrases</h4>
                  </div>
                  <VocabListView items={vocabData.phrases} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {!isLoading && !error && (
        <div className="p-8 pt-0">
          <button 
            onClick={onReady}
            className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-violet-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase italic tracking-wider group"
          >
            Start Roleplay
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};
