import type { FeedbackV2 } from '../../types';

const DISCARD_THRESHOLD = 0.5;

// Topic-aware avoidance entries are only valid if the topic was actually mentioned
const TOPIC_EVIDENCE_MAP: Record<string, RegExp> = {
  school:      /\b(école|lycée|collège|cours|classe|scolaire|professeur|matière|élève)\b/i,
  family:      /\b(famille|parents|mère|père|frère|sœur|maison|chez)\b/i,
  sport:       /\b(sport|football|foot|tennis|natation|jouer|basket|vélo|piscine|course)\b/i,
  holidays:    /\b(vacances|voyage|pays|visite|partir|allé|plage|montagne)\b/i,
  environment: /\b(environnement|planète|réchauffement|écologie|pollution|nature|forêt)\b/i,
  technology:  /\b(technologie|téléphone|internet|réseaux|portable|ordinateur|jeux vidéo)\b/i,
};

export function applyQualityGate(feedback: FeedbackV2, transcript: string): FeedbackV2 {
  if (!transcript.trim()) return feedback;
  const lower = transcript.toLowerCase();

  // Gate avoidance entries: topic-based ones need the topic to actually be in transcript
  const avoidanceReport = (feedback.avoidanceReport ?? []).filter(entry => {
    if (typeof entry.confidence === 'number' && entry.confidence < DISCARD_THRESHOLD) return false;
    const topicPattern = TOPIC_EVIDENCE_MAP[entry.skillId];
    if (topicPattern) return topicPattern.test(transcript);
    if (entry.sourceWords?.length) {
      return entry.sourceWords.every(w => lower.includes(w.toLowerCase()));
    }
    return true;
  });

  // Gate vocabulary entries: basic phrase must appear in transcript
  const vocabularyV2 = (feedback.vocabularyV2 ?? []).filter(entry => {
    if (typeof entry.confidence === 'number' && entry.confidence < DISCARD_THRESHOLD) return false;
    return lower.includes(entry.basic.toLowerCase());
  });

  // Gate correction issues: quote must appear in transcript
  const issues = (feedback.issues ?? []).filter(issue => {
    if (typeof issue.confidence === 'number' && issue.confidence < DISCARD_THRESHOLD) return false;
    if (!issue.quote) return true;
    return lower.includes(issue.quote.toLowerCase());
  });

  return { ...feedback, avoidanceReport, vocabularyV2, issues };
}
