import type { Screen } from '../types/index';

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  locked: boolean;
  badge?: string;
  screen?: Screen;
  tab?: string;
}

export const FEATURES: FeatureCard[] = [
  { id: 'practice', title: 'Practice Speaking', description: '450+ IGCSE questions with AI feedback', icon: '📚', category: 'Core Learning', color: '#7C3AED', locked: false, screen: 'learn' },
  { id: 'ai_chat', title: 'AI Conversations', description: 'Chat with an AI tutor in French', icon: '🤖', category: 'Core Learning', color: '#06B6D4', locked: false, badge: 'New' },
  { id: 'exam_sim', title: 'Exam Simulation', description: 'Full IGCSE oral exam with timer', icon: '🎓', category: 'Core Learning', color: '#F59E0B', locked: false, screen: 'exam' },
  { id: 'pronunciation', title: 'Accent Analyzer', description: 'Perfect your accent with phonetic drills', icon: '🎙', category: 'Core Learning', color: '#10B981', locked: false, screen: 'accent-analyzer' },
  { id: 'listening', title: 'Listening Mode', description: 'Train your ear with native audio', icon: '🎧', category: 'Core Learning', color: '#EC4899', locked: false, screen: 'listening-mode' },
  { id: 'speaking', title: 'Speaking Arena', description: 'Timed speaking challenges', icon: '🎤', category: 'Core Learning', color: '#EF4444', locked: false, screen: 'speaking-arena' },
  { id: 'daily_news', title: 'Daily News Flash', description: 'Listen to news and report back', icon: '📻', category: 'Core Learning', color: '#7C3AED', locked: false, badge: 'New', screen: 'daily-news' },
  { id: 'grammar_repair', title: 'Grammar Repair', description: 'Fix errors in your writing instantly', icon: '🔧', category: 'AI Tools', color: '#7C3AED', locked: false },

  { id: 'accent', title: 'Accent Analyzer', description: 'AI-powered accent scoring', icon: '🎯', category: 'AI Tools', color: '#06B6D4', locked: false, screen: 'accent-analyzer' },
  { id: 'scenario_arch', title: 'Scenario Architect', description: 'Build custom AI roleplays on the fly', icon: '🏗️', category: 'AI Tools', color: '#7C3AED', locked: false, screen: 'scenario-architect', badge: 'AI' },
  { id: 'fluency_heat', title: 'Fluency Heatmap', description: 'Visualize your speaking patterns', icon: '🌡', category: 'AI Tools', color: '#F59E0B', locked: false, screen: 'fluency-heatmap' },
  { id: 'sentence_rebuild', title: 'Sentence Rebuilder', description: 'Reconstruct sentences from fragments', icon: '🧩', category: 'AI Tools', color: '#10B981', locked: false, screen: 'sentence-rebuilder' },
  { id: 'weakness', title: 'Weakness Analysis', description: 'AI identifies your weak spots', icon: '🔍', category: 'AI Tools', color: '#EF4444', locked: false, screen: 'weakness-analysis' },
  { id: 'missions', title: 'Daily Missions', description: 'Complete 3 challenges for bonus XP', icon: '🎯', category: 'Gamification', color: '#7C3AED', locked: false },
  { id: 'xp_shop', title: 'XP Shop', description: 'Spend XP on themes and power-ups', icon: '🛍', category: 'Gamification', color: '#F59E0B', locked: false, screen: 'shop' },
  { id: 'achievements', title: 'Achievements', description: '12 milestones to unlock', icon: '🏆', category: 'Gamification', color: '#F59E0B', locked: false, screen: 'progress' },
  { id: 'challenges', title: 'Challenges', description: 'Weekly competitive events', icon: '⚔', category: 'Gamification', color: '#EF4444', locked: false, screen: 'challenges' },
  { id: 'leaderboard', title: 'Leaderboards', description: 'Compete with learners worldwide', icon: '📊', category: 'Gamification', color: '#10B981', locked: false, screen: 'rankings' },
  { id: 'seasonal', title: 'Seasonal Events', description: 'Limited-time themed challenges', icon: '🎄', category: 'Gamification', color: '#EC4899', locked: true },
  { id: 'skill_tree', title: 'Skill Tree', description: 'Unlock branches as you master topics', icon: '🌳', category: 'Progression', color: '#10B981', locked: false, screen: 'progress', tab: 'tree' },
  { id: 'roadmap', title: 'French Roadmap', description: 'Your personalized learning path', icon: '🗺', category: 'Progression', color: '#7C3AED', locked: false, screen: 'roadmap' },
  { id: 'mastery', title: 'Mastery Journey', description: 'Track your path to fluency', icon: '🚀', category: 'Progression', color: '#F59E0B', locked: false, screen: 'mastery' },
  { id: 'analytics', title: 'Analytics', description: 'Deep dive into your performance', icon: '📈', category: 'Progression', color: '#06B6D4', locked: false, screen: 'progress' },
  { id: 'timeline', title: 'Performance Timeline', description: 'See your growth over time', icon: '📅', category: 'Progression', color: '#EC4899', locked: false, screen: 'progress', tab: 'timeline' },
  { id: 'rapid_fire', title: 'Rapid Fire', description: 'Translate as fast as you can', icon: '⚡', category: 'Fun Modes', color: '#F59E0B', locked: false, screen: 'rapid-fire' },
  { id: 'boss_battle', title: 'Boss Battles', description: 'Defeat grammar bosses', icon: '👾', category: 'Fun Modes', color: '#EF4444', locked: false, screen: 'boss-battle' },
  { id: 'story_mode', title: 'Story Mode', description: 'Learn through interactive stories', icon: '📖', category: 'Fun Modes', color: '#10B981', locked: false, screen: 'story-mode' },
  { id: 'emoji_master', title: 'Emoji Master', description: 'Decode French words from emojis', icon: '🎨', category: 'Fun Modes', color: '#FACC15', locked: false, screen: 'emoji-master' },
  { id: 'mystery_box', title: 'Mystery Box', description: 'Open a daily box for rewards', icon: '🎁', category: 'Fun Modes', color: '#EC4899', locked: false, screen: 'mystery-box' },
  { id: 'survival', title: 'Survival Mode', description: 'How long can you keep going?', icon: '🏝', category: 'Fun Modes', color: '#F97316', locked: false, screen: 'survival' },
  { id: 'speed', title: 'Speed Speaking', description: 'Race against the clock', icon: '⏱', category: 'Fun Modes', color: '#06B6D4', locked: false, screen: 'speed-speaking' },
  { id: 'word_drop', title: 'Word Drop', description: 'Type translations before words hit the ground!', icon: '☄️', category: 'Fun Modes', color: '#10B981', locked: false, screen: 'word-drop', badge: 'New' },
  { id: 'friends', title: 'Friend Challenges', description: 'Challenge friends to duels', icon: '🤝', category: 'Community', color: '#7C3AED', locked: false, screen: 'friend-challenges' },
  { id: 'groups', title: 'Study Groups', description: 'Learn together in groups', icon: '👥', category: 'Community', color: '#10B981', locked: true },
  { id: 'rankings', title: 'Rankings', description: 'See where you stand', icon: '🥇', category: 'Community', color: '#F59E0B', locked: false, screen: 'rankings' },
  { id: 'shared', title: 'Shared Progress', description: 'Compare progress with friends', icon: '🔄', category: 'Community', color: '#EC4899', locked: false, screen: 'friend-challenges' },
];

export const CATEGORIES = ['Core Learning', 'AI Tools', 'Gamification', 'Progression', 'Fun Modes', 'Community'];
