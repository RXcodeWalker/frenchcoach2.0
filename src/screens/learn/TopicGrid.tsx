import { motion } from 'framer-motion';
import { ChevronRight, Lock } from 'lucide-react';
import { TOPICS } from '../../data/gameData';
import { LEARN_TOPIC_DEPENDENCIES } from '../../data/learnTopicDependencies';
import { isLearnTopicUnlocked } from '../../features/learn/topicProgress';
import type { Topic, DifficultyTier } from '../../types/index';

interface Props {
  onSelect: (topic: Topic) => void;
  title?: string;
  subtitle?: string;
  selectedDifficulty?: DifficultyTier;
}

function topicLabel(key: string): string {
  return TOPICS.find(t => t.key === key)?.label ?? key;
}

function lockReason(topic: Topic): string {
  const deps = LEARN_TOPIC_DEPENDENCIES[topic.key] ?? [];
  const depLabels = deps.map(topicLabel).join(', ');
  return `Complete 5 sessions in ${depLabels} averaging 7+/10 to unlock.`;
}

export function TopicGrid({ onSelect, title = "Learn", subtitle = "Choose a topic and start practicing" }: Props) {
  const handleTopicClick = (topic: Topic, unlocked: boolean) => {
    if (!unlocked) return;
    onSelect(topic);
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
          {TOPICS.map((topic, idx) => {
            const unlocked = !topic.isAdvanced || isLearnTopicUnlocked(LEARN_TOPIC_DEPENDENCIES[topic.key] ?? []);
            return (
              <motion.button
                key={topic.key}
                onClick={() => handleTopicClick(topic, unlocked)}
                aria-disabled={!unlocked}
                aria-label={!unlocked ? `${topic.label} — locked. ${lockReason(topic)}` : undefined}
                className={`group relative overflow-hidden rounded-xl surface p-5 text-left transition-all duration-300 perspective ${
                  unlocked ? 'hover:border-white/10' : 'opacity-50 cursor-not-allowed'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: unlocked ? 1 : 0.5, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                whileHover={unlocked ? { scale: 1.03, y: -3, rotateX: 5, rotateY: -5 } : undefined}
                whileTap={unlocked ? { scale: 0.97 } : undefined}
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
                    {unlocked ? topic.icon : <Lock size={20} className="text-ink-subtle" />}
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
                  {unlocked ? (
                    <p className="text-[9px] text-ink-subtle mt-2">{topic.questionsCount} questions</p>
                  ) : (
                    <p className="text-[9px] text-ink-subtle mt-2">{lockReason(topic)}</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.button
          onClick={() => onSelect(TOPICS[Math.floor(Math.random() * TOPICS.length)])}
          className="w-full group relative overflow-hidden rounded-xl surface-recessed border-dashed border-white/8 p-4 text-left hover:bg-white/[0.02] transition-all duration-300"
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
    </div>
  );
}
