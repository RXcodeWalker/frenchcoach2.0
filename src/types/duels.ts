// Friend Duels Phase 2 — kept separate from FriendChallenge (src/types/index.ts),
// which models a different, unbuilt multi-day progress-race concept
// (xp_race/co_op_xp/boss_raid). Forcing Duel data into it or vice versa would
// be a bad fit for both.

export interface DuelChallenge {
  duelId: string;
  challengerId: string;
  challengerUsername: string;
  challengerAvatarEmoji: string | null;
  opponentId: string;
  opponentUsername: string;
  opponentAvatarEmoji: string | null;
  questionSetId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed' | 'expired';
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  winnerUserId: string | null;
  isTie: boolean;
  myAttempt: { scoreTotal: number; xpAwarded: number; outcome: string } | null;
  opponentAttempt: { scoreTotal: number; xpAwarded: number; outcome: string } | null;
}
