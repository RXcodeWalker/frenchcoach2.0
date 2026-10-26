import type { LucideIcon } from 'lucide-react';
import {
  Bike, BookOpen, Briefcase, Compass, Croissant, Drama, Dumbbell, Frame, Heart, Leaf, MessageCircle,
  Newspaper, Palette, Palmtree, PawPrint, Presentation, Scale, School, Shirt, ShoppingBag, Siren, Sofa,
  Sparkles, TrainFront, Users,
} from 'lucide-react';

/**
 * Design System v2 topic identity: a lucide icon and a hue (degrees, OKLCH).
 * The hue is used only inside the topic's icon chip (`TopicChip`) — never for
 * text, borders or fills elsewhere. Replaces the emoji in `Topic.icon` for
 * display; that field stays as data for screens outside the redesign.
 * Hues for the sixteen core topics come from the design system's topic table.
 */
export interface TopicVisual {
  Icon: LucideIcon;
  hue: number;
}

const VISUALS: Record<string, TopicVisual> = {
  school: { Icon: School, hue: 247 },
  hobbies: { Icon: Bike, hue: 22 },
  family: { Icon: Users, hue: 337 },
  holidays: { Icon: Palmtree, hue: 202 },
  home: { Icon: Sofa, hue: 45 },
  future: { Icon: Compass, hue: 270 },
  food: { Icon: Croissant, hue: 67 },
  environment: { Icon: Leaf, hue: 135 },
  clothes: { Icon: Shirt, hue: 315 },
  animals: { Icon: PawPrint, hue: 90 },
  transport: { Icon: TrainFront, hue: 225 },
  jobs: { Icon: Briefcase, hue: 292 },
  sports: { Icon: Dumbbell, hue: 157 },
  emotions: { Icon: Heart, hue: 0 },
  arts: { Icon: Palette, hue: 112 },
  shopping: { Icon: ShoppingBag, hue: 180 },
  // Advanced topics (gated) — not in the design system's table; hues picked to
  // sit between the core ones.
  pro: { Icon: Presentation, hue: 260 },
  culture: { Icon: Drama, hue: 30 },
  lifestyle: { Icon: Sparkles, hue: 325 },
  news: { Icon: Newspaper, hue: 210 },
  slang: { Icon: MessageCircle, hue: 75 },
  survival: { Icon: Siren, hue: 10 },
  debate: { Icon: Scale, hue: 145 },
  art: { Icon: Frame, hue: 190 },
};

const FALLBACK: TopicVisual = { Icon: BookOpen, hue: 270 };

export function topicVisual(key: string | null | undefined): TopicVisual {
  return (key && VISUALS[key]) || FALLBACK;
}
