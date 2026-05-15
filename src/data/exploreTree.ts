export interface TreeNode {
  id: string;
  title: string;
  icon: string;
  category: string;
  difficulty: number;
  unlocked: boolean;
  mastery: number;
  dependencies: string[];
}

export const EXPLORE_TREE: Record<string, TreeNode[]> = {
  tier1: [
    { id: 'bakery', title: 'Bakery', icon: '🥖', category: 'Basics', difficulty: 1, unlocked: true, mastery: 85, dependencies: [] },
    { id: 'cafe', title: 'Cafe', icon: '☕', category: 'Basics', difficulty: 1, unlocked: true, mastery: 40, dependencies: [] },
    { id: 'market', title: 'Market', icon: '🛒', category: 'Basics', difficulty: 1, unlocked: true, mastery: 100, dependencies: [] },
    { id: 'store', title: 'Store', icon: '🛍️', category: 'Basics', difficulty: 1, unlocked: true, mastery: 0, dependencies: [] },
  ],
  tier2: [
    { id: 'bank', title: 'Bank', icon: '🏦', category: 'Services', difficulty: 2, unlocked: true, mastery: 25, dependencies: ['bakery', 'cafe'] },
    { id: 'post_office', title: 'Post Office', icon: '📮', category: 'Services', difficulty: 2, unlocked: true, mastery: 0, dependencies: ['market', 'store'] },
    { id: 'pharmacy', title: 'Pharmacy', icon: '💊', category: 'Health', difficulty: 2, unlocked: true, mastery: 10, dependencies: ['market'] },
    { id: 'bookstore', title: 'Bookstore', icon: '📚', category: 'Services', difficulty: 2, unlocked: true, mastery: 0, dependencies: ['store'] },
  ],
  tier3: [
    { id: 'gare', title: 'Train Station', icon: '🚉', category: 'Travel', difficulty: 2, unlocked: false, mastery: 0, dependencies: ['bank'] },
    { id: 'hotel', title: 'Hotel', icon: '🏨', category: 'Travel', difficulty: 2, unlocked: false, mastery: 0, dependencies: ['post_office'] },
    { id: 'cinema', title: 'Cinema', icon: '🎬', category: 'Leisure', difficulty: 2, unlocked: false, mastery: 0, dependencies: ['post_office'] },
    { id: 'gym', title: 'Gym', icon: '💪', category: 'Leisure', difficulty: 2, unlocked: false, mastery: 0, dependencies: ['pharmacy'] },
  ],
  tier4: [
    { id: 'airport', title: 'Airport', icon: '✈️', category: 'Travel', difficulty: 3, unlocked: false, mastery: 0, dependencies: ['gare', 'hotel'] },
    { id: 'museum', title: 'Museum', icon: '🏛️', category: 'Leisure', difficulty: 3, unlocked: false, mastery: 0, dependencies: ['cinema'] },
    { id: 'doctor', title: 'Doctor', icon: '🏥', category: 'Health', difficulty: 3, unlocked: false, mastery: 0, dependencies: ['pharmacy'] },
    { id: 'restaurant', title: 'Restaurant', icon: '🍽️', category: 'Leisure', difficulty: 3, unlocked: false, mastery: 0, dependencies: ['hotel'] },
  ],
  tier5: [
    { id: 'job_interview', title: 'Job Interview', icon: '💼', category: 'Professional', difficulty: 4, unlocked: false, mastery: 0, dependencies: ['airport', 'museum'] },
    { id: 'real_estate', title: 'Real Estate', icon: '🏠', category: 'Professional', difficulty: 4, unlocked: false, mastery: 0, dependencies: ['hotel', 'bank'] },
    { id: 'police_station', title: 'Police Station', icon: '👮', category: 'Safety', difficulty: 4, unlocked: false, mastery: 0, dependencies: ['doctor'] },
  ],
};
