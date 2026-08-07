import { useCallback, useRef, useState } from 'react';
import { EMOJI_QUESTIONS, type EmojiQuestion } from '../../data/emojiQuestions';
import {
  useCountdown,
  useStreakMultiplier,
  DEFAULT_STREAK_TIERS,
} from '../../features/minigames';
import {
  buildEligiblePoolForRun,
  drawNextQuestion,
  selectQuestions,
} from './selectQuestions';
import { buildSessionCompletion } from './scoring';
import type {
  EmojiAnswerHistoryEntry,
  EndReason,
  RunConfig,
  RunPhase,
  SessionCompletion,
} from './types';

export interface RecordAnswerInput {
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  promptKind: 'emoji' | 'french';
  scoreDelta: number;
  latencyMs?: number;
}

export interface UseEmojiMasterRunResult {
  phase: RunPhase;
  runConfig: RunConfig | null;
  currentQuestion: EmojiQuestion | null;
  questionIndex: number;
  deckLength: number;
  score: number;
  streak: number;
  maxStreak: number;
  isOverdrive: boolean;
  correctAnswers: number;
  totalAnswered: number;
  history: EmojiAnswerHistoryEntry[];
  endReason: EndReason | null;
  completion: SessionCompletion | null;
  countdown: ReturnType<typeof useCountdown>;
  eligiblePool: EmojiQuestion[];
  startRun: (config: RunConfig) => void;
  recordAnswer: (input: RecordAnswerInput) => {
    nextStreak: number;
    nextScore: number;
    nextCorrect: number;
    nextTotal: number;
  };
  advanceQuestion: (opts?: { bossHpRatio?: number }) => boolean;
  endRun: (reason: EndReason) => SessionCompletion;
  resetToIdle: () => void;
  setModeScore: (value: number) => void;
}

interface RunStatsRef {
  score: number;
  correctAnswers: number;
  totalAnswered: number;
  maxStreak: number;
  history: EmojiAnswerHistoryEntry[];
  mode: RunConfig['mode'] | null;
}

export function useEmojiMasterRun(): UseEmojiMasterRunResult {
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [runConfig, setRunConfig] = useState<RunConfig | null>(null);
  const [deck, setDeck] = useState<EmojiQuestion[]>([]);
  const [remaining, setRemaining] = useState<EmojiQuestion[]>([]);
  const [eligiblePool, setEligiblePool] = useState<EmojiQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [history, setHistory] = useState<EmojiAnswerHistoryEntry[]>([]);
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const [completion, setCompletion] = useState<SessionCompletion | null>(null);
  const recentIdsRef = useRef<string[]>([]);
  const awardedRef = useRef(false);
  const statsRef = useRef<RunStatsRef>({
    score: 0,
    correctAnswers: 0,
    totalAnswered: 0,
    maxStreak: 0,
    history: [],
    mode: null,
  });

  const {
    streak,
    maxStreak,
    isOverdrive,
    onCorrect: onStreakCorrect,
    onIncorrect: onStreakIncorrect,
    reset: resetStreak,
  } = useStreakMultiplier({ tiers: DEFAULT_STREAK_TIERS, overdriveThreshold: 5 });

  const countdown = useCountdown({
    onComplete: () => setPhase('playing'),
  });

  const currentQuestion =
    phase === 'playing' || phase === 'countdown'
      ? deck[questionIndex] ?? null
      : null;

  const startRun = useCallback(
    (config: RunConfig) => {
      awardedRef.current = false;
      resetStreak();
      setRunConfig(config);
      setScore(0);
      setCorrectAnswers(0);
      setTotalAnswered(0);
      setHistory([]);
      setEndReason(null);
      setCompletion(null);
      setQuestionIndex(0);
      recentIdsRef.current = [];
      statsRef.current = {
        score: 0,
        correctAnswers: 0,
        totalAnswered: 0,
        maxStreak: 0,
        history: [],
        mode: config.mode,
      };

      const eligible = buildEligiblePoolForRun(
        EMOJI_QUESTIONS,
        config.category
      );
      setEligiblePool(eligible);

      if (
        config.mode === 'classic' ||
        config.mode === 'reverse' ||
        config.mode === 'hardcore'
      ) {
        const selected = selectQuestions(EMOJI_QUESTIONS, {
          category: config.category,
          mode: config.mode,
        });
        setDeck(selected);
        setRemaining([]);
      } else {
        const { question, remaining: rest } = drawNextQuestion(
          eligible,
          [],
          [],
          Math.random,
          config.mode === 'arena' ? 1 : undefined
        );
        setDeck([question]);
        setRemaining(rest);
        recentIdsRef.current = [question.id];
      }

      setPhase('countdown');
      countdown.start();
    },
    [countdown, resetStreak]
  );

  const recordAnswer = useCallback(
    (input: RecordAnswerInput) => {
      const q = deck[questionIndex];
      if (!q) {
        return {
          nextStreak: streak,
          nextScore: score,
          nextCorrect: correctAnswers,
          nextTotal: totalAnswered,
        };
      }

      const entry: EmojiAnswerHistoryEntry = {
        questionId: q.id,
        emojis: q.emojis,
        french: q.french,
        english: q.english,
        promptKind: input.promptKind,
        userAnswer: input.userAnswer,
        correctAnswer: input.correctAnswer,
        isCorrect: input.isCorrect,
        latencyMs: input.latencyMs,
      };

      const nextHistory = [...statsRef.current.history, entry];
      const nextTotal = statsRef.current.totalAnswered + 1;
      let nextCorrect = statsRef.current.correctAnswers;
      let nextStreak = streak;
      let nextMaxStreak = statsRef.current.maxStreak;

      if (input.isCorrect) {
        nextStreak = streak + 1;
        nextCorrect += 1;
        nextMaxStreak = Math.max(nextMaxStreak, nextStreak);
        onStreakCorrect();
      } else {
        nextStreak = 0;
        onStreakIncorrect();
      }

      const nextScore = statsRef.current.score + input.scoreDelta;

      statsRef.current = {
        ...statsRef.current,
        score: nextScore,
        correctAnswers: nextCorrect,
        totalAnswered: nextTotal,
        maxStreak: nextMaxStreak,
        history: nextHistory,
      };

      setHistory(nextHistory);
      setTotalAnswered(nextTotal);
      setCorrectAnswers(nextCorrect);
      setScore(nextScore);

      return { nextStreak, nextScore, nextCorrect, nextTotal };
    },
    [
      deck,
      questionIndex,
      score,
      streak,
      correctAnswers,
      totalAnswered,
      onStreakCorrect,
      onStreakIncorrect,
    ]
  );

  const advanceQuestion = useCallback(
    (opts?: { bossHpRatio?: number }): boolean => {
      if (!runConfig) return false;

      if (
        runConfig.mode === 'classic' ||
        runConfig.mode === 'reverse' ||
        runConfig.mode === 'hardcore'
      ) {
        if (questionIndex >= deck.length - 1) {
          return false;
        }
        setQuestionIndex((i) => i + 1);
        return true;
      }

      const { question, remaining: rest } = drawNextQuestion(
        eligiblePool,
        remaining,
        recentIdsRef.current,
        Math.random,
        opts?.bossHpRatio
      );
      recentIdsRef.current = [...recentIdsRef.current, question.id].slice(-10);
      setDeck((d) => [...d, question]);
      setRemaining(rest);
      setQuestionIndex((i) => i + 1);
      return true;
    },
    [runConfig, questionIndex, deck.length, eligiblePool, remaining]
  );

  const endRun = useCallback((reason: EndReason): SessionCompletion => {
    if (awardedRef.current && completion) {
      return completion;
    }
    awardedRef.current = true;
    const s = statsRef.current;
    const session = buildSessionCompletion({
      mode: s.mode ?? 'classic',
      endReason: reason,
      modeScore: s.score,
      correctAnswers: s.correctAnswers,
      totalAnswered: s.totalAnswered,
      maxStreak: Math.max(s.maxStreak, maxStreak),
      history: s.history,
    });
    setEndReason(reason);
    setCompletion(session);
    setPhase('finished');
    return session;
  }, [completion, maxStreak]);

  const resetToIdle = useCallback(() => {
    awardedRef.current = false;
    resetStreak();
    setPhase('idle');
    setRunConfig(null);
    setDeck([]);
    setRemaining([]);
    setEligiblePool([]);
    setQuestionIndex(0);
    setScore(0);
    setCorrectAnswers(0);
    setTotalAnswered(0);
    setHistory([]);
    setEndReason(null);
    setCompletion(null);
    statsRef.current = {
      score: 0,
      correctAnswers: 0,
      totalAnswered: 0,
      maxStreak: 0,
      history: [],
      mode: null,
    };
    countdown.reset();
  }, [countdown, resetStreak]);

  const setModeScore = useCallback((value: number) => {
    statsRef.current = { ...statsRef.current, score: value };
    setScore(value);
  }, []);

  return {
    phase,
    runConfig,
    currentQuestion,
    questionIndex,
    deckLength: deck.length,
    score,
    streak,
    maxStreak: Math.max(maxStreak, statsRef.current.maxStreak),
    isOverdrive,
    correctAnswers,
    totalAnswered,
    history,
    endReason,
    completion,
    countdown,
    eligiblePool,
    startRun,
    recordAnswer,
    advanceQuestion,
    endRun,
    resetToIdle,
    setModeScore,
  };
}
