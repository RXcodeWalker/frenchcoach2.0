import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { TOPICS } from '../../data/gameData';
import type { Topic } from '../../types/index';

interface Props {
  onSelect: (topic: Topic) => void;
  title?: string;
  subtitle?: string;
}

export function TopicGrid({ onSelect, title = "Learn", subtitle = "Choose a topic and start practicing" }: Props) {
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
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TOPICS.map((topic, idx) => (
            <motion.button
              key={topic.key}
              onClick={() => onSelect(topic)}
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
                <h3 className="font-bold text-white text-sm mb-0.5">{topic.label}</h3>
                <p className="text-[10px] text-slate-600">{topic.labelEn}</p>
                <p className="text-[9px] text-slate-700 mt-2">{topic.questionsCount} questions</p>
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
              <p className="text-[10px] text-slate-600">Get a random question from any topic</p>
            </div>
            <ChevronRight size={14} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}
