/** Theme metadata for the pilot: sticker sets, the unlock a complete set gives, and the « Et toi ? » turns. */
import { line } from './build';
import type { JuniorTheme } from './types';

export const JUNIOR_THEMES: readonly JuniorTheme[] = [
  {
    id: 'moi',
    title: line('theme.moi', 'Moi', 'Me'),
    emoji: '🙋',
    stickers: [
      { id: 'moi-rocket', emoji: '🚀', name: 'Rocket' },
      { id: 'moi-guitar', emoji: '🎸', name: 'Guitar' },
      { id: 'moi-trophy', emoji: '🏆', name: 'Trophy' },
      { id: 'moi-puzzle', emoji: '🧩', name: 'Puzzle' },
      { id: 'moi-hero', emoji: '🦸', name: 'Superhero' },
      { id: 'moi-cake', emoji: '🎂', name: 'Birthday cake' },
    ],
    unlock: { id: 'outfit-shades', kind: 'outfit', emoji: '😎', name: 'Cool shades' },
    etToi: [
      {
        id: 'moi-age',
        ask: line('moi.etoi1.ask', 'Et toi, tu as quel âge ?', 'And you, how old are you?'),
        reply: line('moi.etoi1.reply', "Moi ? J'ai mille ans… presque !", "Me? I'm a thousand years old… almost!"),
      },
      {
        id: 'moi-likes',
        ask: line('moi.etoi2.ask', 'Et toi, tu aimes quoi ?', 'And you, what do you like?'),
        reply: line('moi.etoi2.reply', "J'aime la pizza… avec du chocolat !", 'I like pizza… with chocolate!'),
      },
    ],
  },
  {
    id: 'couleurs',
    title: line('theme.couleurs', 'Les couleurs', 'Colours'),
    emoji: '🌈',
    stickers: [
      { id: 'col-palette', emoji: '🎨', name: 'Palette' },
      { id: 'col-rainbow', emoji: '🌈', name: 'Rainbow' },
      { id: 'col-crayon', emoji: '🖍️', name: 'Crayon' },
      { id: 'col-parrot', emoji: '🦜', name: 'Parrot' },
      { id: 'col-butterfly', emoji: '🦋', name: 'Butterfly' },
      { id: 'col-balloon', emoji: '🎈', name: 'Balloon' },
    ],
    unlock: { id: 'bg-rainbow-studio', kind: 'background', emoji: '🖼️', name: 'Rainbow studio' },
    etToi: [
      {
        id: 'col-favourite',
        ask: line('couleurs.etoi1.ask', 'Et toi, ta couleur préférée ?', 'And you, your favourite colour?'),
        reply: line(
          'couleurs.etoi1.reply',
          'Ma couleur préférée ? Le rose… à pois verts !',
          'My favourite colour? Pink… with green spots!',
        ),
      },
      {
        id: 'col-red',
        ask: line('couleurs.etoi2.ask', 'Et toi, tu aimes le rouge ?', 'And you, do you like red?'),
        reply: line('couleurs.etoi2.reply', 'Oui ! Même mes chaussettes sont rouges !', 'Yes! Even my socks are red!'),
      },
    ],
  },
];
