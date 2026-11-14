import type { LucideIcon } from 'lucide-react';
import { Clock, Hash, HelpCircle, ListFilter, MapPin, Package, Route, User } from 'lucide-react';
import type { WordId } from '../../data/questionWords/types';

export const WORD_ICONS: Record<WordId, LucideIcon> = {
  qui: User,
  ou: MapPin,
  quand: Clock,
  combien: Hash,
  comment: Route,
  pourquoi: HelpCircle,
  quel: ListFilter,
  questce: Package,
};
