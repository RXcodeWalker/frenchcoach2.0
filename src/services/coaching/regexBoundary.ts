/** French letter class — JS \b is ASCII-only and fails silently on accents. */
export const FR_LETTER = 'a-zàâäéèêëïîôöùûüÿœæç';
export const NOT_BEFORE = `(?<![${FR_LETTER}])`;
export const NOT_AFTER = `(?![${FR_LETTER}])`;
