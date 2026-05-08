import { useState } from 'react';
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
  // Core Learning
  { id: 'practice', title: 'Practice Speaking', description: '450+ IGCSE questions with AI feedback', icon: '📚', category: 'Core Learning', color: '#0ea5e9', locked: false, screen: 'learn' },
  { id: 'ai_chat', title: 'AI Conversations', description: 'Chat with an AI tutor in French', icon: '🤖', category: 'Core Learning', color: '#06b6d4', locked: false, badge: 'New' },
  { id: 'exam_sim', title: 'Exam Simulation', description: 'Full IGCSE oral exam with timer', icon: '🎓', category: 'Core Learning', color: '#f59e0b', locked: false, screen: 'exam' },
  { id: 'pronunciation', title: 'Pronunciation Lab', description: 'Perfect your accent with phonetic drills', icon: '🎙', category: 'Core Learning', color: '#10b981', locked: true },
  { id: 'listening', title: 'Listening Mode', description: 'Train your ear with native audio', icon: '🎧', category: 'Core Learning', color: '#8b5cf6', locked: true },
  { id: 'speaking', title: 'Speaking Arena', description: 'Timed speaking challenges', icon: '🎤', category: 'Core Learning', color: '#ec4899', locked: true },
  // AI Tools
  { id: 'grammar_repair', title: 'Grammar Repair', description: 'Fix errors in your writing instantly', icon: '🔧', category: 'AI Tools', color: '#0ea5e9', locked: false },
  { id: 'accent', title: 'Accent Analyzer', description: 'AI-powered accent scoring', icon: '🎯', category: 'AI Tools', color: '#06b6d4', locked: true },
  { id: 'fluency_heat', title: 'Fluency Heatmap', description: 'Visualize your speaking patterns', icon: '🌡', category: 'AI Tools', color: '#f59e0b', locked: true },
  { id: 'sentence_rebuild', title: 'Sentence Rebuilder', description: 'Reconstruct sentences from fragments', icon: '🧩', category: 'AI Tools', color: '#10b981', locked: true },
  { id: 'weakness', title: 'Weakness Analysis', description: 'AI identifies your weak spots', icon: '🔍', category: 'AI Tools', color: '#ef4444', locked: true },
  // Gamification
  { id: 'missions', title: 'Daily Missions', description: 'Complete 3 challenges for bonus XP', icon: '🎯', category: 'Gamification', color: '#0ea5e9', locked: false },
  { id: 'xp_shop', title: 'XP Shop', description: 'Spend XP on themes and power-ups', icon: '🛍', category: 'Gamification', color: '#f59e0b', locked: true },
  { id: 'achievements', title: 'Achievements', description: '12 milestones to unlock', icon: '🏆', category: 'Gamification', color: '#f59e0b', locked: false, screen: 'progress' },
  { id: 'challenges', title: 'Challenges', description: 'Weekly competitive events', icon: '⚔', category: 'Gamification', color: '#ef4444', locked: true },
  { id: 'leaderboard', title: 'Leaderboards', description: 'Compete with learners worldwide', icon: '📊', category: 'Gamification', color: '#10b981', locked: true },
  { id: 'seasonal', title: 'Seasonal Events', description: 'Limited-time themed challenges', icon: '🎄', category: 'Gamification', color: '#ec4899', locked: true },
  // Progression
  { id: 'skill_tree', title: 'Skill Tree', description: 'Unlock branches as you master topics', icon: '🌳', category: 'Progression', color: '#10b981', locked: false, screen: 'progress' },
  { id: 'roadmap', title: 'French Roadmap', description: 'Your personalized learning path', icon: '🗺', category: 'Progression', color: '#0ea5e9', locked: true },
  { id: 'mastery', title: 'Mastery Journey', description: 'Track your path to fluency', icon: '🚀', category: 'Progression', color: '#f59e0b', locked: true },
  { id: 'analytics', title: 'Analytics', description: 'Deep dive into your performance', icon: '📈', category: 'Progression', color: '#06b6d4', locked: false, screen: 'progress' },
  { id: 'timeline', title: 'Performance Timeline', description: 'See your growth over time', icon: '📅', category: 'Progression', color: '#8b5cf6', locked: true },
  // Fun Modes
  { id: 'rapid_fire', title: 'Rapid Fire', description: 'Translate as fast as you can', icon: '⚡', category: 'Fun Modes', color: '#f59e0b', locked: true },
  { id: 'boss_battle', title: 'Boss Battles', description: 'Defeat grammar bosses', icon: '👾', category: 'Fun Modes', color: '#ef4444', locked: true },
  { id: 'story_mode', title: 'Story Mode', description: 'Learn through interactive stories', icon: '📖', category: 'Fun Modes', color: '#10b981', locked: true },
  { id: 'survival', title: 'Survival Mode', description: 'How long can you keep going?', icon: '🏝', category: 'Fun Modes', color: '#f97316', locked: true },
  { id: 'speed', title: 'Speed Speaking', description: 'Race against the clock', icon: '⏱', category: 'Fun Modes', color: '#06b6d4', locked: true },
  // Community
  { id: 'friends', title: 'Friend Challenges', description: 'Challenge friends to duels', icon: '🤝', category: 'Community', color: '#0ea5e9', locked: true },
  { id: 'groups', title: 'Study Groups', description: 'Learn together in groups', icon: '👥', category: 'Community', color: '#10b981', locked: true },
  { id: 'rankings', title: 'Rankings', description: 'See where you stand', icon: '🥇', category: 'Community', color: '#f59e0b', locked: true },
  { id: 'shared', title: 'Shared Progress', description: 'Compare progress with friends', icon: '🔄', category: 'Community', color: '#ec4899', locked: true },
];

const CATEGORIES = ['Core Learning', 'AI Tools', 'Gamification', 'Progression', 'Fun Modes', 'Community'];

export function Explore() {
  const { dispatch } = useApp();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? FEATURES
    : FEATURES.filter(f => f.category === activeCategory);

  const navigate = (screen: Screen) => dispatch({ type: 'SET_SCREEN', screen });

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Training Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Explore</h1>
          <p className="text-sm text-slate-500 mt-1">Discover all learning modes, AI tools, and challenges</p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                : 'text-slate-500 hover:text-white border border-white/5 hover:border-white/10'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                  : 'text-slate-500 hover:text-white border border-white/5 hover:border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Feature Grid */}
        {CATEGORIES.filter(c => activeCategory === 'all' || c === activeCategory).map(category => {
          const categoryFeatures = filtered.filter(f => f.category === category);
          if (categoryFeatures.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{category}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryFeatures.map(feature => (
                  <button
                    key={feature.id}
                    onClick={() => feature.screen && !feature.locked ? navigate(feature.screen) : undefined}
                    className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                      feature.locked
                        ? 'border-white/[0.04] bg-slate-900/30 opacity-60 cursor-not-allowed'
                        : 'border-white/[0.06] bg-slate-900/60 hover:border-white/15 hover:shadow-lg hover:scale-[1.02] cursor-pointer'
                    }`}
                  >
                    {/* Hover glow */}
                    {!feature.locked && (
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `radial-gradient(circle at top left, ${feature.color}10, transparent 70%)` }}
                      />
                    )}

                    <div className="relative">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{
                            background: feature.locked ? 'rgba(255,255,255,0.03)' : `${feature.color}15`,
                            border: `1px solid ${feature.locked ? 'rgba(255,255,255,0.05)' : `${feature.color}25`}`,
                          }}
                        >
                          {feature.locked ? <Lock size={16} className="text-slate-600" /> : feature.icon}
                        </div>
                        {feature.badge && !feature.locked && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                            {feature.badge}
                          </span>
                        )}
                      </div>

                      <h3 className={`font-bold text-sm mb-1 ${feature.locked ? 'text-slate-600' : 'text-white'}`}>
                        {feature.title}
                      </h3>
                      <p className={`text-xs leading-relaxed ${feature.locked ? 'text-slate-700' : 'text-slate-500'}`}>
                        {feature.description}
                      </p>

                      {!feature.locked && (
                        <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: feature.color }}>
                          <span>Open</span>
                          <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
