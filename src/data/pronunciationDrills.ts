export interface PronunciationDrill {
  id: string;
  french: string;
  ipa: string;
  difficulty: 'easy' | 'medium' | 'hard';
  focus: string;
  tip: string;
}

export const PRONUNCIATION_DRILLS: PronunciationDrill[] = [
  {
    id: 'r_sound_1',
    french: 'Bonjour',
    ipa: 'bɔ̃.ʒuʁ',
    difficulty: 'easy',
    focus: 'The French R',
    tip: 'The French R is guttural. Try to make a sound like you are gargling water at the back of your throat.'
  },
  {
    id: 'u_vs_ou_1',
    french: 'Tu vs Tout',
    ipa: 'ty vs tu',
    difficulty: 'medium',
    focus: 'U vs OU contrast',
    tip: "For 'U', shape your lips for 'O' but say 'EE'. For 'OU', it's like the 'oo' in 'boot'."
  },
  {
    id: 'nasal_1',
    french: 'Enfant',
    ipa: 'ɑ̃.fɑ̃',
    difficulty: 'medium',
    focus: 'Nasal Vowels',
    tip: 'Let some air escape through your nose. Do not pronounce the N at the end.'
  },
  {
    id: 'e_accent_1',
    french: 'Été',
    ipa: 'e.te',
    difficulty: 'easy',
    focus: 'Accent Aigu (é)',
    tip: "The 'é' sounds like the 'a' in 'date' but shorter and cleaner."
  },
  {
    id: 'liaison_1',
    french: 'Les amis',
    ipa: 'le.z‿a.mi',
    difficulty: 'medium',
    focus: 'Liaison',
    tip: "The silent 's' in 'les' becomes a 'z' sound when followed by a vowel."
  },
  {
    id: 'r_sound_2',
    french: 'Très bien',
    ipa: 'tʁɛ bjɛ̃',
    difficulty: 'medium',
    focus: 'R after T',
    tip: 'The R after a T can be tricky. Keep it soft and in the back.'
  },
  {
    id: 'gn_sound_1',
    french: 'Montagne',
    ipa: 'mɔ̃.taɲ',
    difficulty: 'hard',
    focus: 'The GN sound',
    tip: "It's like the 'ny' in 'onion' or 'canyon'."
  },
  {
    id: 'ill_sound_1',
    french: 'Fille',
    ipa: 'fij',
    difficulty: 'medium',
    focus: 'The ILL sound',
    tip: "The 'ill' usually makes a 'y' sound, like in 'yes'."
  },
  {
    id: 'silent_h_1',
    french: 'Hôtel',
    ipa: 'o.tɛl',
    difficulty: 'easy',
    focus: 'Silent H',
    tip: "In French, the letter 'H' is always silent. Start the word directly with the vowel sound."
  },
  {
    id: 'oi_sound_1',
    french: 'Le Roi',
    ipa: 'lə ʁwa',
    difficulty: 'medium',
    focus: 'The OI sound',
    tip: "The 'oi' combination sounds like 'wa' in 'water'."
  },
  {
    id: 'eu_sound_1',
    french: 'Heureux',
    ipa: 'ø.ʁø',
    difficulty: 'hard',
    focus: 'The EU sound',
    tip: "Shape your mouth for 'O' but try to say 'AY'. It's a closed sound."
  },
  {
    id: 'eau_sound_1',
    french: 'Beaucoup',
    ipa: 'bo.ku',
    difficulty: 'easy',
    focus: 'AU / EAU sound',
    tip: "Both 'au' and 'eau' simply sound like a long, clean 'O'."
  },
  {
    id: 'cedilla_1',
    french: 'Garçon',
    ipa: 'ɡaʁ.sɔ̃',
    difficulty: 'easy',
    focus: 'The Cedilla (ç)',
    tip: "The 'ç' always makes an 'S' sound, even before A, O, or U."
  },
  {
    id: 's_vowel_1',
    french: 'Maison',
    ipa: 'mɛ.zɔ̃',
    difficulty: 'medium',
    focus: 'S between vowels',
    tip: "A single 's' between two vowels is pronounced like a 'Z'."
  },
  {
    id: 'ou_sound_1',
    french: 'Rouge',
    ipa: 'ʁuʒ',
    difficulty: 'easy',
    focus: 'The OU sound',
    tip: "The 'ou' is like the 'oo' in 'soup'. Keep it short and tight."
  },
  {
    id: 'an_in_un_1',
    french: 'Vin blanc',
    ipa: 'vɛ̃ blɑ̃',
    difficulty: 'hard',
    focus: 'Nasal Contrast (IN vs AN)',
    tip: " 'In' (vin) is like the 'a' in 'bat', while 'an' (blanc) is deeper in the throat."
  },
  {
    id: 'tongue_twister_1',
    french: "Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches ?",
    ipa: 'le ʃo.sɛt də laʁ.ʃi.dy.ʃɛs sɔ̃.t‿ɛl sɛʃ aʁ.ʃi.sɛʃ',
    difficulty: 'hard',
    focus: 'CH vs S contrast',
    tip: "A classic! Focus on the rapid alternating between 'CH' (sh) and 'S' sounds."
  },
  {
    id: 'tongue_twister_2',
    french: "Un chasseur sachant chasser doit savoir chasser sans son chien.",
    ipa: 'œ̃ ʃa.sœʁ sa.ʃɑ̃ ʃa.se dwa sa.vwaʁ ʃa.se sɑ̃ sɔ̃ ʃjɛ̃',
    difficulty: 'hard',
    focus: 'S vs CH and Nasals',
    tip: "Watch the 'CH' and 'S' again, plus the 'IN' (chien) vs 'AN' (sachant/sans) nasal contrast."
  },
  {
    id: 'tongue_twister_3',
    french: "Didon dîna, dit-on, du dos d'un dodu dindon.",
    ipa: 'di.dɔ̃ di.na di.tɔ̃ dy do d‿œ̃ do.dy dɛ̃.dɔ̃',
    difficulty: 'hard',
    focus: 'D vs T and Nasals',
    tip: "Keep the 'D' sounds crisp and pay attention to the varying nasals 'ON', 'UN', 'IN'."
  },
  {
    id: 'multi_word_1',
    french: "Il est indispensable d'étudier régulièrement.",
    ipa: 'i.l‿ɛ.t‿ɛ̃.dis.pɑ̃.sabl d‿e.ty.dje ʁe.ɡy.ljɛʁ.mɑ̃',
    difficulty: 'hard',
    focus: 'Elision and Liaisons',
    tip: "Practice the smooth flow between words. Note the liaison in 'est indispensable'."
  }
];
