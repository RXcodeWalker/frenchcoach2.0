function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
}

/** Sørensen–Dice coefficient on character bigrams (SpeakingArena canonical). */
export function diceCoefficient(str1: string, str2: string): number {
  if (str1.length < 2 || str2.length < 2) return str1 === str2 ? 1 : 0;
  const bg1 = getBigrams(str1);
  const bg2 = getBigrams(str2);
  let intersection = 0;
  for (const bg of bg1) {
    if (bg2.has(bg)) intersection++;
  }
  return (2.0 * intersection) / (bg1.size + bg2.size);
}
