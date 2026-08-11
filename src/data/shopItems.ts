export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category: 'powerup' | 'streak' | 'cosmetic' | 'unlock';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Protect your streak for one day of inactivity.',
    cost: 200,
    icon: '❄️',
    category: 'streak',
    rarity: 'rare',
  },
];
