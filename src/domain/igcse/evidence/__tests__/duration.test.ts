import { describe, expect, it } from 'vitest';
import type { SpeakingTranscript } from '../../judgement/types';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from './fixtures';
import { topicConversationDurationByConversation } from '../duration';

describe('topicConversationDurationByConversation', () => {
  it('is zero when no turn carries candidateResponseDurationS (hand-authored transcript)', () => {
    const rows = topicConversationDurationByConversation(EVIDENCE_GOLDEN_TRANSCRIPT);
    expect(rows).toEqual([
      { conversationId: 'topic1', candidateSpeakingDurationS: 0, candidateWordCount: 11 },
      { conversationId: 'topic2', candidateSpeakingDurationS: 0, candidateWordCount: 17 },
    ]);
  });

  it('sums candidateResponseDurationS across turns in a conversation', () => {
    const transcript: SpeakingTranscript = {
      ...EVIDENCE_GOLDEN_TRANSCRIPT,
      topicConversations: [
        {
          ...EVIDENCE_GOLDEN_TRANSCRIPT.topicConversations[0],
          turns: EVIDENCE_GOLDEN_TRANSCRIPT.topicConversations[0].turns.map((turn, i) => ({
            ...turn,
            candidateResponseDurationS: i === 0 ? 12.5 : 8,
          })),
        },
        EVIDENCE_GOLDEN_TRANSCRIPT.topicConversations[1],
      ],
    };

    const rows = topicConversationDurationByConversation(transcript);
    const topic1 = rows.find((row) => row.conversationId === 'topic1');
    const topic2 = rows.find((row) => row.conversationId === 'topic2');

    expect(topic1?.candidateSpeakingDurationS).toBe(20.5);
    expect(topic2?.candidateSpeakingDurationS).toBe(0);
  });
});
