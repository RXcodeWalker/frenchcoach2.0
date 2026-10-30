import { useEffect } from 'react';
import { matchTypedAnswer, useGameTimer } from '../../../features/minigames';
import { FEEDBACK_DWELL_MS, HARDCORE_SECONDS_BY_DIFFICULTY } from '../types';
import type { UseEmojiMasterRunResult } from '../useEmojiMasterRun';
import { acceptableAnswers } from '../answers';
import { useLater, useTypedRound } from '../useRoundHelpers';
import { AnswerReveal } from '../ui/AnswerReveal';
import { EmojiStage } from '../ui/EmojiStage';
import { ComboChip, HudRow, ProgressCells, ScoreChip, TimerBar } from '../ui/Hud';
import { TypedAnswer } from '../ui/TypedAnswer';

export function HardcoreMode({ run }: { run: UseEmojiMasterRunResult }) {
  const q = run.currentQuestion;
  const round = useTypedRound(q?.id);
  const { value, setValue, reveal, setReveal, lockedRef, inputRef } = round;
  const later = useLater();

  const timer = useGameTimer({
    mode: 'perQuestion',
    initialSeconds: q ? HARDCORE_SECONDS_BY_DIFFICULTY[q.difficulty] : 8,
    criticalThreshold: 3,
    active: run.phase === 'playing' && !reveal,
    onExpire: () => miss('timeout'),
  });

  useEffect(() => {
    if (q) timer.reset(HARDCORE_SECONDS_BY_DIFFICULTY[q.difficulty]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the question changes
  }, [q?.id]);

  const next = () => {
    if (!run.advanceQuestion()) run.endRun('completed');
  };

  function miss(kind: 'miss' | 'timeout') {
    if (lockedRef.current || !q) return;
    lockedRef.current = true;
    const typed = value.trim();
    setReveal({ kind, userAnswer: kind === 'miss' ? typed : undefined });
    run.recordAnswer({
      userAnswer: typed || '(no answer)',
      correctAnswer: q.french,
      isCorrect: false,
      promptKind: 'emoji',
      scoreDelta: 0,
    });
  }

  function submit() {
    if (lockedRef.current || !q || !value.trim()) return;
    if (!matchTypedAnswer(value, acceptableAnswers(q))) {
      miss('miss');
      return;
    }
    lockedRef.current = true;
    setReveal({ kind: 'correct' });
    run.recordAnswer({
      userAnswer: value,
      correctAnswer: q.french,
      isCorrect: true,
      promptKind: 'emoji',
      scoreDelta: 1,
    });
    later(next, FEEDBACK_DWELL_MS.correct);
  }

  if (!q) return null;
  const isLast = run.questionIndex >= run.deckLength - 1;

  return (
    <div className="flex flex-col gap-4">
      <HudRow
        left={<>Question {run.questionIndex + 1} of {run.deckLength}</>}
        right={
          <>
            <ComboChip streak={run.streak} />
            <ScoreChip label="Score" value={run.score} />
          </>
        }
      />
      <ProgressCells total={run.deckLength} index={run.questionIndex} history={run.history} />
      <TimerBar timeLeft={timer.timeLeft} maxTime={timer.maxTime} critical={timer.isCritical} />
      <EmojiStage
        questionKey={q.id}
        prompt={q.emojis}
        promptKind="emoji"
        small={q.category === 'sentences'}
        caption="Type the French word"
        outcome={!reveal ? null : reveal.kind === 'correct' ? 'correct' : 'incorrect'}
        reveal={reveal ? <AnswerReveal kind={reveal.kind} question={q} userAnswer={reveal.userAnswer} /> : undefined}
      />
      <TypedAnswer
        value={value}
        onChange={setValue}
        onSubmit={submit}
        inputRef={inputRef}
        locked={!!reveal}
        onNext={reveal && reveal.kind !== 'correct' ? next : undefined}
        nextLabel={isLast ? 'See results' : 'Next'}
        submitLabel="Check"
        placeholder="Type your answer"
        hint={q.category === 'sentences' ? undefined : "Include le, la, l' or les"}
      />
    </div>
  );
}
