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
  { id: 'speaking', title: 'Speaking Arena', description: 'Timed speaking challenges', icon: '🎤', category: 'Speak & Listen', color: '#EF4444', locked: false, screen: 'speaking-arena' },
  { id: 'speed', title: 'Speed Speaking', description: 'Race against the clock', icon: '⏱', category: 'Speak & Listen', color: '#06B6D4', locked: false, screen: 'speed-speaking' },
  { id: 'scenario_arch', title: 'Scenario Architect', description: 'Build custom AI roleplays on the fly', icon: '🏗️', category: 'Speak & Listen', color: '#7C3AED', locked: false, screen: 'scenario-architect', badge: 'AI' },
  { id: 'daily_news', title: 'Daily News Flash', description: 'Listen to news and report back', icon: '📻', category: 'Speak & Listen', color: '#7C3AED', locked: false, badge: 'New', screen: 'daily-news' },
  { id: 'listening', title: 'Listening Mode', description: 'Train your ear with native audio', icon: '🎧', category: 'Speak & Listen', color: '#EC4899', locked: false, screen: 'listening-mode' },
  { id: 'accent', title: 'Accent Analyzer', description: 'AI-powered accent scoring', icon: '🎯', category: 'Speak & Listen', color: '#06B6D4', locked: false, screen: 'accent-analyzer' },
  { id: 'story_mode', title: 'Story Mode', description: 'Learn through interactive stories', icon: '📖', category: 'Speak & Listen', color: '#10B981', locked: false, screen: 'story-mode' },
  { id: 'ai_chat', title: 'AI Conversations', description: 'Chat with an AI tutor in French', icon: '🤖', category: 'Speak & Listen', color: '#06B6D4', locked: true, badge: 'New' },
  { id: 'sentence_rebuild', title: 'Sentence Rebuilder', description: 'Reconstruct sentences from fragments', icon: '🧩', category: 'Words & Grammar', color: '#10B981', locked: false, screen: 'sentence-rebuilder' },
  { id: 'rapid_fire', title: 'Rapid Fire', description: 'Translate as fast as you can', icon: '⚡', category: 'Words & Grammar', color: '#F59E0B', locked: false, screen: 'rapid-fire' },
  { id: 'word_drop', title: 'Word Drop', description: 'Type translations before words hit the ground!', icon: '☄️', category: 'Words & Grammar', color: '#10B981', locked: false, screen: 'word-drop', badge: 'New' },
  { id: 'emoji_master', title: 'Emoji Master', description: 'Decode French from emojis — Arena, Blitz, and more', icon: '🎨', category: 'Words & Grammar', color: '#FACC15', locked: false, screen: 'emoji-master', badge: 'New' },
  { id: 'boss_battle', title: 'Boss Battles', description: 'Defeat grammar bosses', icon: '👾', category: 'Words & Grammar', color: '#EF4444', locked: false, screen: 'boss-battle' },
  { id: 'grammar_repair', title: 'Grammar Repair', description: 'Fix errors in your writing instantly', icon: '🔧', category: 'Words & Grammar', color: '#7C3AED', locked: true },
  { id: 'weakness', title: 'Weakness Analysis', description: 'AI identifies your weak spots', icon: '🔍', category: 'Insights & Plan', color: '#EF4444', locked: false, screen: 'weakness-analysis' },
  { id: 'fluency_heat', title: 'Fluency Heatmap', description: 'Visualize your speaking patterns', icon: '🌡', category: 'Insights & Plan', color: '#F59E0B', locked: false, screen: 'fluency-heatmap' },
  { id: 'roadmap', title: 'French Roadmap', description: 'Your personalized learning path', icon: '🗺', category: 'Insights & Plan', color: '#7C3AED', locked: false, screen: 'roadmap' },
  { id: 'mastery', title: 'Mastery Journey', description: 'Track your path to fluency', icon: '🚀', category: 'Insights & Plan', color: '#F59E0B', locked: false, screen: 'mastery' },
  { id: 'challenges', title: 'Challenges', description: 'Weekly competitive events', icon: '⚔', category: 'Compete & Rewards', color: '#EF4444', locked: false, screen: 'challenges' },
  { id: 'friends', title: 'Friend Challenges', description: 'Challenge friends to duels', icon: '🤝', category: 'Compete & Rewards', color: '#7C3AED', locked: false, screen: 'friend-challenges' },
  { id: 'rankings', title: 'Rankings', description: 'See where you stand', icon: '🥇', category: 'Compete & Rewards', color: '#F59E0B', locked: false, screen: 'rankings' },
  { id: 'xp_shop', title: 'XP Shop', description: 'Spend XP on themes and power-ups', icon: '🛍', category: 'Compete & Rewards', color: '#F59E0B', locked: false, screen: 'shop' },
  { id: 'mystery_box', title: 'Mystery Box', description: 'Open a daily box for rewards', icon: '🎁', category: 'Compete & Rewards', color: '#EC4899', locked: false, screen: 'mystery-box' },
  { id: 'survival', title: 'Survival Mode', description: 'How long can you keep going?', icon: '🏝', category: 'Compete & Rewards', color: '#F97316', locked: false, screen: 'survival' },
  { id: 'missions', title: 'Daily Missions', description: 'Complete 3 challenges for bonus XP', icon: '🎯', category: 'Compete & Rewards', color: '#7C3AED', locked: true },
  { id: 'seasonal', title: 'Seasonal Events', description: 'Limited-time themed challenges', icon: '🎄', category: 'Compete & Rewards', color: '#EC4899', locked: true },
  { id: 'groups', title: 'Study Groups', description: 'Learn together in groups', icon: '👥', category: 'Compete & Rewards', color: '#10B981', locked: true },
];

export const CATEGORIES = ['Speak & Listen', 'Words & Grammar', 'Insights & Plan', 'Compete & Rewards'];
