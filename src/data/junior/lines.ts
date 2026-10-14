/** Léo's fixed lines that belong to no theme and no question. */
import { line } from './build';

/** The first turn of every mission. Always accepted, whatever the kid says. */
export const WARMUP_PROMPT = line('line.warmup-prompt', 'Dis « Bonjour Léo » pour me réveiller !', 'Say "Bonjour Léo" to wake me up!');

/** Léo wakes up once the warm-up turn is over. */
export const WARMUP_AWAKE = line('line.warmup-awake', 'Bonjour ! Je suis là !', "Hello! I'm here!");

/** After two "none" results on one turn: Léo says the model sentence and the mission moves on. */
export const TOGETHER = line('line.together', 'On le dit ensemble !', "Let's say it together!");
