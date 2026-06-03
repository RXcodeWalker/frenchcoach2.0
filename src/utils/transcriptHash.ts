// djb2 hash — fast, collision-resistant enough for cache keys
export function hashTranscript(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
    hash = hash >>> 0; // keep as unsigned 32-bit
  }
  return hash.toString(16);
}

export function engineCacheKey(questionId: string, transcript: string, engine: string): string {
  return `${questionId}_${hashTranscript(transcript)}_${engine}`;
}
