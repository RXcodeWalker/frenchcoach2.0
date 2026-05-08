import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ChevronRight, Lock, Sparkles } from 'lucide-react';
import type { Screen } from '../types';

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  locked: boolean;
  badge?: string;
  screen?: Screen;
}

const FEATURES: FeatureCard[] = [
  { id: 'practice', title: 'Practice Speaking', description: '450+ IGCSE questions with AI feedback', icon: '📚', category: 'Core Learning', color: '#7C3AED', locked: false, screen: 'learn' },
  { id: 'ai_chat', title: 'AI Conversations', description: 'Chat with an AI tutor in French', icon: '🤖', category: 'Core Learning', color: '#06B6D4', locked: false, badge: 'New' },
  { id: 'exam_sim', title: 'Exam Simulation', description: 'Full IGCSE oral exam with timer', icon: '🎓', category: 'Core Learning', color: '#F59E0B', locked: false, screen: 'exam' },
  { id: 'pronunciation', title: 'Pronunciation Lab', description: 'Perfect your accent with phonetic drills', icon: '🎙', category: 'Core Learning', color: '#10B981', locked: true },
  { id: 'listening', title: 'Listening Mode', description: 'Train your ear with native audio', icon: '🎧', category: 'Core Learning', color: '#EC4899', locked: true },
  { id: 'speaking', title: 'Speaking Arena', description: 'Timed speaking challenges', icon: '🎤', category: 'Core Learning', color: '#EF4444', locked: true },
  { id: 'grammar_repair', title: 'Grammar Repair', description: 'Fix errors in your writing instantly', icon: '🔧', category: 'AI Tools', color: '#7C3AED', locked: false },
  { id: 'accent', title: 'Accent Analyzer', description: 'AI-powered accent scoring', icon: '🎯', category: 'AI Tools', color: '#06B6D4', locked: true },
  { id: 'fluency_heat', title: 'Fluency Heatmap', description: 'Visualize your speaking patterns', icon: '🌡', category: 'AI Tools', color: '#F59E0B', locked: true },
  { id: 'sentence_rebuild', title: 'Sentence Rebuilder', description: 'Reconstruct sentences from fragments', icon: '🧩', category: 'AI Tools', color: '#10B981', locked: true },
  { id: 'weakness', title: 'Weakness Analysis', description: 'AI identifies your weak spots', icon: '🔍', category: 'AI Tools', color: '#EF4444', locked: true },
  { id: 'missions', title: 'Daily Missions', description: 'Complete 3 challenges for bonus XP', icon: '🎯', category: 'Gamification', color: '#7C3AED', locked: false },
  { id: 'xp_shop', title: 'XP Shop', description: 'Spend XP on themes and power-ups', icon: '🛍', category: 'Gamification', color: '#F59E0B', locked: true },
  { id: 'achievements', title: 'Achievements', description: '12 milestones to unlock', icon: '🏆', category: 'Gamification', color: '#F59E0B', locked: false, screen: 'progress' },
  { id: 'challenges', title: 'Challenges', description: 'Weekly competitive events', icon: '⚔', category: 'Gamification', color: '#EF4444', locked: true },
  { id: 'leaderboard', title: 'Leaderboards', description: 'Compete with learners worldwide', icon: '📊', category: 'Gamification', color: '#10B981', locked: true },
  { id: 'seasonal', title: 'Seasonal Events', description: 'Limited-time themed challenges', icon: '🎄', category: 'Gamification', color: '#EC4899', locked: true },
  { id: 'skill_tree', title: 'Skill Tree', description: 'Unlock branches as you master topics', icon: '🌳', category: 'Progression', color: '#10B981', locked: false, screen: 'progress' },
  { id: 'roadmap', title: 'French Roadmap', description: 'Your personalized learning path', icon: '🗺', category: 'Progression', color: '#7C3AED', locked: true },
  { id: 'mastery', title: 'Mastery Journey', description: 'Track your path to fluency', icon: '🚀', category: 'Progression', color: '#F59E0B', locked: true },
  { id: 'analytics', title: 'Analytics', description: 'Deep dive into your performance', icon: '📈', category: 'Progression', color: '#06B6D4', locked: false, screen: 'progress' },
  { id: 'timeline', title: 'Performance Timeline', description: 'See your growth over time', icon: '📅', category: 'Progression', color: '#EC4899', locked: true },
  { id: 'rapid_fire', title: 'Rapid Fire', description: 'Translate as fast as you can', icon: '⚡', category: 'Fun Modes', color: '#F59E0B', locked: true },
  { id: 'boss_battle', title: 'Boss Battles', description: 'Defeat grammar bosses', icon: '👾', category: 'Fun Modes', color: '#EF4444', locked: true },
  { id: 'story_mode', title: 'Story Mode', description: 'Learn through interactive stories', icon: '📖', category: 'Fun Modes', color: '#10B981', locked: true },
  { id: 'survival', title: 'Survival Mode', description: 'How long can you keep going?', icon: '🏝', category: 'Fun Modes', color: '#F97316', locked: true },
  { id: 'speed', title: 'Speed Speaking', description: 'Race against the clock', icon: '⏱', category: 'Fun Modes', color: '#06B6D4', locked: true },
  { id: 'friends', title: 'Friend Challenges', description: 'Challenge friends to duels', icon: '🤝', category: 'Community', color: '#7C3AED', locked: true },
  { id: 'groups', title: 'Study Groups', description: 'Learn together in groups', icon: '👥', category: 'Community', color: '#10B981', locked: true },
  { id: 'rankings', title: 'Rankings', description: 'See where you stand', icon: '🥇', category: 'Community', color: '#F59E0B', locked: true },
  { id: 'shared', title: 'Shared Progress', description: 'Compare progress with friends', icon: '🔄', category: 'Community', color: '#EC4899', locked: true },
];

const CATEGORIES = ['Core Learning', 'AI Tools', 'Gamification', 'Progression', 'Fun Modes', 'Community'];

export function Explore() {
  const { dispatch } = useApp();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all' ? FEATURES : FEATURES.filter(f => f.category === activeCategory);
  const navigate = (screen: Screen) => dispatch({ type: 'SET_SCREEN', screen });

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Training Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Explore</h1>
          <p className="text-sm text-slate-500 mt-1">Discover all learning modes, AI tools, and challenges</p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <motion.button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
              activeCategory === 'all' ? 'bg-violet-electric/10 text-violet-400 border border-violet-electric/20' : 'text-slate-600 hover:text-white border border-white/[0.04]'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            All
          </motion.button>
          {CATEGORIES.map(cat => (
            <motion.button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                activeCategory === cat ? 'bg-violet-electric/10 text-violet-400 border border-violet-electric/20' : 'text-slate-600 hover:text-white border border-white/[0.04]'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {/* Feature Grid */}
        {CATEGORIES.filter(c => activeCategory === 'all' || c === activeCategory).map(category => {
          const categoryFeatures = filtered.filter(f => f.category === category);
          if (categoryFeatures.length === 0) return null;
          return (
            <div key={category} className="space-y-2.5">
              <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{category}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {categoryFeatures.map(feature => (
                  <motion.button
                    key={feature.id}
                    onClick={() => feature.screen && !feature.locked ? navigate(feature.screen) : undefined}
                    className={`group relative overflow-hidden rounded-xl glass p-4 text-left transition-all duration-300 ${
                      feature.locked ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/10 cursor-pointer'
                    }`}
                    whileHover={feature.locked ? {} : { scale: 1.02, y: -2 }}
                    whileTap={feature.locked ? {} : { scale: 0.98 }}
                  >
                    {!feature.locked && (
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `radial-gradient(circle at top left, ${feature.color}08, transparent 70%)` }}
                      />
                    )}
                    <div className="relative">
                      <div className="flex items-start justify-between mb-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                          style={{
                            background: feature.locked ? 'rgba(255,255,255,0.02)' : `linear-gradient(135deg, ${feature.color}15, ${feature.color}08)`,
                            border: `1px solid ${feature.locked ? 'rgba(255,255,255,0.03)' : `${feature.color}18`}`,
                            boxShadow: feature.locked ? 'none' : `0 0 8px ${feature.color}08`,
                          }}
                        >
                          {feature.locked ? <Lock size={14} className="text-slate-700" /> : feature.icon}
                        </div>
                        {feature.badge && !feature.locked && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">{feature.badge}</span>
                        )}
                      </div>
                      <h3 className={`font-bold text-xs mb-0.5 ${feature.locked ? 'text-slate-700' : 'text-white'}`}>{feature.title}</h3>
                      <p className={`text-[10px] leading-relaxed ${feature.locked ? 'text-slate-800' : 'text-slate-600'}`}>{feature.description}</p>
                      {!feature.locked && (
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold" style={{ color: feature.color }}>
                          <span>Open</span>
                          <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
