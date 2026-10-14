/**
 * The small fixed French praise set a kid learns over time (plan §8). Léo never
 * says anything outside this set as praise, and none of it is a mark.
 */
import { line } from './build';
import type { JuniorLine } from './types';

export const PRAISE: readonly JuniorLine[] = [
  line('praise.super', 'Super !', 'Great!'),
  line('praise.bravo', 'Bravo !', 'Well done!'),
  line('praise.genial', 'Génial !', 'Awesome!'),
  line('praise.encore', 'Encore ?', 'Again?'),
];
