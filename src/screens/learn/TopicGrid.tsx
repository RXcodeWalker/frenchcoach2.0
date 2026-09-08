import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, AlertTriangle, ArrowRight } from 'lucide-react';
import { TOPICS } from '../../data/gameData';
import type { Topic, DifficultyTier } from '../../types/index';

interface Props {
  onSelect: (topic: Topic) => void;
  title?: string;
  subtitle?: string;
  selectedDifficulty?: DifficultyTier;
}

export function TopicGrid({ onSelect, title = "Learn", subtitle = "Choose a topic and start practicing", selectedDifficulty }: Props) {
  const [selectedAdvanced, setSelectedAdvanced] = useState<Topic | null>(null);
  const visibleTopics = TOPICS.filter(t => !(t.isAdvanced && selectedDifficulty === 'beginner'));

  const handleTopicClick = (topic: Topic) => {
    if (topic.isAdvanced) {
      setSelectedAdvanced(topic);
    } else {
      onSelect(topic);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">{title}</h1>
          <p className="text-sm text-ink-muted mt-1">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {visibleTopics.map((topic, idx) => (
            <motion.button
              key={topic.key}
              onClick={() => handleTopicClick(topic)}
              className="group relative overflow-hidden rounded-xl glass p-5 text-left hover:border-white/10 transition-all duration-300 perspective"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              whileHover={{ scale: 1.03, y: -3, rotateX: 5, rotateY: -5 }}
              whileTap={{ scale: 0.97 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle at top left, ${topic.color}12, transparent 70%)` }}
              />
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${topic.color}18, ${topic.color}08)`,
                    border: `1px solid ${topic.color}20`,
                    boxShadow: `0 0 12px ${topic.color}10`,
                  }}
                >
                  {topic.icon}
                </div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="font-bold text-white text-sm">{topic.label}</h3>
                  {topic.isAdvanced && (
                    <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded-sm uppercase tracking-wider font-bold border border-amber-500/20">
                      ADV
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-ink-subtle">{topic.labelEn}</p>
                <p className="text-[9px] text-ink-subtle mt-2">{topic.questionsCount} questions</p>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.button
          onClick={() => onSelect(TOPICS[Math.floor(Math.random() * TOPICS.length)])}
          className="w-full group relative overflow-hidden rounded-xl glass-subtle border-dashed border-white/8 p-4 text-left hover:bg-white/[0.02] transition-all duration-300"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-electric/8 border border-violet-electric/15 flex items-center justify-center">
              <span className="text-base">🎲</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">Random Question</p>
              <p className="text-[10px] text-ink-subtle">Get a random question from any topic</p>
            </div>
            <ChevronRight size={14} className="text-ink-subtle group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </motion.button>
      </motion.div>

      {/* Advanced Topic Confirmation Modal */}
      <AnimatePresence>
        {selectedAdvanced && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md glass border-amber-500/30 overflow-hidden rounded-2xl"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                  <AlertTriangle className="text-amber-500" size={32} />
                </div>
                
                <h2 className="text-xl font-black text-white mb-2">Advanced Content!</h2>
                <p className="text-ink-muted text-sm mb-6">
                  Are you sure you want to continue? This section contains <span className="text-amber-400 font-bold">advanced content</span>, complex grammar, and specialized vocabulary.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      onSelect(selectedAdvanced);
                      setSelectedAdvanced(null);
                    }}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl transition-all flex items-center justify-center gap-2 group"
                  >
                    CONTINUE ANYWAY
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <button
                    onClick={() => setSelectedAdvanced(null)}
                    className="w-full py-3 text-ink-muted hover:text-white font-bold transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
