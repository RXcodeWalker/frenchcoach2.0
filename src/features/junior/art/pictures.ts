/**
 * Every picture the Junior bank uses, and how it is drawn. The bank (`src/data/junior`)
 * keeps its emoji as the stable KEY of a picture; the UI never prints that emoji — it
 * looks the picture up here and draws it (an icon on a hued plate, a colour drop, a
 * numeral) or shows an illustration dropped into `src/assets/junior/<id>.png|webp|svg`,
 * which always wins over the drawn fallback.
 *
 * `pictures.coverage.test.ts` fails when the bank uses a picture this file does not know.
 */
import {
  Apple, Banana, Bird, Building2, Cake, CalendarDays, Cat, Cloud, Dog, Flower2, Fish, Frame, Gamepad2, Glasses,
  Guitar, Heart, Home, Leaf, Music, Paintbrush, Palette, PawPrint, Pencil, PersonStanding, Pizza, Puzzle, Rainbow,
  Rocket, ShieldCheck, Snowflake, Star, Sun, Trophy, Turtle, Utensils, UserRound,
} from 'lucide-react';
import {
  BalloonIcon, ButterflyIcon, CheeseIcon, ChocolateIcon, FootballIcon, SkylineIcon, StrawberryIcon, VillageIcon,
  type ArtIcon,
} from './customIcons';

type Drawn =
  | { kind: 'icon'; Icon: ArtIcon | typeof Apple; hue: number }
  | { kind: 'pair'; Icons: readonly [ArtIcon | typeof Apple, ArtIcon | typeof Apple]; hue: number }
  /** A drop of paint in a real colour: colour words are taught by the colour itself. */
  | { kind: 'drop'; color: string; hue: number }
  /** Big lettering on the plate: the numbers, and « ou ». */
  | { kind: 'text'; text: string; hue: number };

export type Picture = { id: string } & Drawn;

const P = (id: string, d: Drawn): Picture => ({ id, ...d });
const icon = (id: string, Icon: ArtIcon | typeof Apple, hue: number) => P(id, { kind: 'icon', Icon, hue });
const drop = (id: string, color: string, hue: number) => P(id, { kind: 'drop', color, hue });
const text = (id: string, t: string, hue: number) => P(id, { kind: 'text', text: t, hue });

/** Keyed by the emoji the bank stores. */
export const PICTURES: Readonly<Record<string, Picture>> = {
  // numbers
  '8️⃣': text('n8', '8', 285),
  '9️⃣': text('n9', '9', 285),
  '🔟': text('n10', '10', 285),
  '1️⃣1️⃣': text('n11', '11', 285),
  '1️⃣2️⃣': text('n12', '12', 285),
  '1️⃣3️⃣': text('n13', '13', 285),
  // food
  '🍫': icon('chocolate', ChocolateIcon, 45),
  '🍕': icon('pizza', Pizza, 50),
  '🍎': icon('apples', Apple, 22),
  '🧀': icon('cheese', CheeseIcon, 85),
  // likes
  '⚽': icon('football', FootballIcon, 145),
  '💃': icon('dance', PersonStanding, 345),
  '✏️': icon('drawing', Pencil, 60),
  '🎵': icon('music', Music, 300),
  '🎮': icon('games', Gamepad2, 255),
  // homes
  '🏠': icon('house', Home, 30),
  '🏢': icon('flat', Building2, 220),
  '🏙️': icon('city', SkylineIcon, 245),
  '🏘️': icon('village', VillageIcon, 140),
  // pets
  '🐱': icon('cat', Cat, 55),
  '🐶': icon('dog', Dog, 30),
  '🐟': icon('fish', Fish, 215),
  '🐦': icon('bird', Bird, 235),
  '🐢': icon('turtle', Turtle, 150),
  // seasons
  '☀️': icon('summer', Sun, 85),
  '❄️': icon('winter', Snowflake, 225),
  '🌸': icon('spring', Flower2, 350),
  '🍂': icon('autumn', Leaf, 50),
  // colours: nouns and adjectives share the drop
  '🔵': drop('blue', '#2F6FE4', 255),
  '🔴': drop('red', '#E5484D', 20),
  '🟢': drop('green', '#2FA865', 150),
  '🟡': drop('yellow', '#F5C518', 90),
  '⚫': drop('black', '#23252B', 270),
  '⚪': drop('white', '#FFFFFF', 270),
  '🟤': drop('brown', '#8B5E3C', 50),
  '🟣': drop('purple', '#8E4EC6', 305),
  '🟠': drop('orange', '#F76B15', 55),
  '🎀': drop('pink', '#F472B6', 350),
  // question pictures
  '🌈': icon('rainbow', Rainbow, 300),
  '🎨': icon('palette', Palette, 25),
  '🍌': icon('banana', Banana, 95),
  '☁️': icon('cloud', Cloud, 230),
  '🍓': icon('strawberry', StrawberryIcon, 15),
  '🍓☁️': P('strawberry-cloud', { kind: 'pair', Icons: [StrawberryIcon, Cloud], hue: 15 }),
  '🆚': text('or', 'ou', 20),
  '🖍️': icon('crayon', Paintbrush, 140),
  '🎂': icon('cake', Cake, 335),
  '🍽️': icon('meal', Utensils, 65),
  '💛': icon('heart', Heart, 350),
  '🏡': icon('home', Home, 40),
  '🐾': icon('paws', PawPrint, 75),
  '🗓️': icon('calendar', CalendarDays, 205),
  '🙋': icon('me', UserRound, 285),
  '🌟': icon('star', Star, 88),
  // stickers and unlocks
  '🚀': icon('rocket', Rocket, 262),
  '🎸': icon('guitar', Guitar, 22),
  '🏆': icon('trophy', Trophy, 80),
  '🧩': icon('puzzle', Puzzle, 165),
  '🦸': icon('hero', ShieldCheck, 250),
  '🦜': icon('parrot', Bird, 150),
  '🦋': icon('butterfly', ButterflyIcon, 305),
  '🎈': icon('balloon', BalloonIcon, 8),
  '😎': icon('shades', Glasses, 270),
  '🖼️': icon('studio', Frame, 285),
};

const FALLBACK: Picture = icon('unknown', Star, 270);

/** The picture for a bank emoji; an unknown one becomes a star rather than printing the emoji. */
export function pictureFor(key: string): Picture {
  return PICTURES[key] ?? FALLBACK;
}

/** The hue a theme's banner is washed in. */
export const THEME_HUE: Readonly<Record<string, number>> = { moi: 285, couleurs: 25 };
export const themeHue = (themeId: string): number => THEME_HUE[themeId] ?? 270;

/** What each theme's banner shows: three of its pictures. */
export const THEME_SCENE: Readonly<Record<string, readonly [string, string, string]>> = {
  moi: ['🎂', '💛', '🐾'],
  couleurs: ['🔴', '🟡', '🔵'],
};
