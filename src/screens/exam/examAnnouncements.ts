/**
 * exam-conduct §5/§9 (D13): original French lines the UI speaks at each part
 * boundary, never a conduct-engine action — they stay outside the ConductLog,
 * the hash, and the judge input, the same way `setup` does (Batch 3). Each
 * topic is named from its unhashed `AuthoredTopic.title` (Batch 4/5; TN p.7
 * #12, p.8 #17) — see `topicAnnouncementText`.
 */
export const ROLE_PLAY_FINISHED_TEXT = 'Très bien, merci. Le jeu de rôle est terminé.';
export const TOPIC1_ANNOUNCEMENT_TEXT = 'Passons maintenant à la première conversation.';
export const TOPIC2_ANNOUNCEMENT_TEXT = 'Merci beaucoup. Passons maintenant à la seconde conversation.';

/**
 * The spoken opening of a topic conversation, naming its topic (exam-conduct
 * §5). Falls back to the unnamed line only if the set somehow has no title
 * (every set validated since Batch 4 has one).
 */
export function topicAnnouncementText(part: 'topic1' | 'topic2', title: string | undefined): string {
  const base = part === 'topic1' ? TOPIC1_ANNOUNCEMENT_TEXT : TOPIC2_ANNOUNCEMENT_TEXT;
  const trimmed = title?.trim();
  return trimmed ? `${base} Le thème : ${trimmed}.` : base;
}
