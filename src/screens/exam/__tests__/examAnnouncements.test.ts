/**
 * exam-conduct §5 (TN p.7 #12, p.8 #17): the examiner names each topic when its
 * conversation starts, from the set's unhashed `AuthoredTopic.title`.
 */
import { describe, expect, it } from 'vitest';
import { topicAnnouncementText, TOPIC1_ANNOUNCEMENT_TEXT, TOPIC2_ANNOUNCEMENT_TEXT } from '../examAnnouncements';
import { OFFLINE_FIXTURES } from '../../../data/exam/bank/fixtures';

describe('topicAnnouncementText', () => {
  it('names topic 1 by its title', () => {
    expect(topicAnnouncementText('topic1', 'Les transports')).toBe(`${TOPIC1_ANNOUNCEMENT_TEXT} Le thème : Les transports.`);
  });

  it('names topic 2 by its title', () => {
    expect(topicAnnouncementText('topic2', 'La ville')).toBe(`${TOPIC2_ANNOUNCEMENT_TEXT} Le thème : La ville.`);
  });

  it('falls back to the unnamed line when there is no title', () => {
    expect(topicAnnouncementText('topic1', undefined)).toBe(TOPIC1_ANNOUNCEMENT_TEXT);
    expect(topicAnnouncementText('topic2', '  ')).toBe(TOPIC2_ANNOUNCEMENT_TEXT);
  });

  it('every bundled set has a title for both conversations', () => {
    for (const set of Object.values(OFFLINE_FIXTURES)) {
      expect(set.content.topic1.title.trim()).not.toBe('');
      expect(set.content.topic2.title.trim()).not.toBe('');
    }
  });
});
