import { useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';
import { matchTypedAnswer, useGameTimer } from '../../../features/minigames';
import { Stat } from '../../../components/ui/Stat';
import { BLITZ_SECONDS, FEEDBACK_DWELL_MS } from '../types';
import type { UseEmojiMasterRunResult } from '../useEmojiMasterRun';
import { acceptableAnswers } from '../answers';
import { useLater, useTypedRound } from '../useRoundHelpers';
import { AnswerReveal } from '../ui/AnswerReveal';
import { EmojiStage } from '../ui/EmojiStage';
import { ComboChip, HudRow, ScoreChip, TimerBar } from '../ui/Hud';
import { TypedAnswer } from '../ui/TypedAnswer';

export function BlitzMode({ run }: { run: UseEmojiMasterRunResult }) {
  const q = run.currentQuestion;
  const { value, setValue, reveal, setReveal, lockedRef, inputRef } = useTypedRound(q?.id);
  const startedAt = useRef(Date.now());
  const later = useLater();

  const timer = useGameTimer({
    mode: 'global',
    initialSeconds: BLITZ_SECONDS,
    active: run.phase === 'playing',
    onExpire: () => run.endRun('timeout'),
  });

  // Each word times its own answer.
  useEffect(() => {
    startedAt.current = Date.now();
  }, [q?.id]);

  function submit() {
    if (lockedRef.current || !q || !value.trim() || timer.isExpired) return;
    lockedRef.current = true;
    const right = matchTypedAnswer(value, acceptableAnswers(q));
    run.recordAnswer({
      userAnswer: value,
      correctAnswer: q.french,
      isCorrect: right,
      promptKind: 'emoji',
      scoreDelta: right ? 1 : 0,
      latencyMs: Date.now() - startedAt.current,
    });
    setReveal(right ? { kind: 'correct' } : { kind: 'miss', userAnswer: value.trim() });
    // A miss holds the word on screen a little longer: that is the cost of guessing.
    later(() => {
      if (!timer.isExpired) run.advanceQuestion();
    }, right ? FEEDBACK_DWELL_MS.correct : FEEDBACK_DWELL_MS.incorrect);
  }

  if (!q) return null;

  return (
    <div className="flex flex-col gap-4">
      <HudRow
        left={
          <Stat role="neutral" title="Time left" icon={<Timer size={14} aria-hidden="true" />}>
            {Math.ceil(timer.timeLeft)}s
          </Stat>
        }
        right={
          <>
            <ComboChip streak={run.streak} />
            <ScoreChip label="Score" value={run.score} />
          </>
        }
      />
      <TimerBar timeLeft={timer.timeLeft} maxTime={timer.maxTime} critical={timer.isCritical} />
      <EmojiStage
        questionKey={q.id}
        prompt={q.emojis}
        promptKind="emoji"
        small={q.category === 'sentences'}
        caption="Type it fast"
        outcome={!reveal ? null : reveal.kind === 'correct' ? 'correct' : 'incorrect'}
        reveal={reveal ? <AnswerReveal kind={reveal.kind} question={q} userAnswer={reveal.userAnswer} compact /> : undefined}
      />
      <TypedAnswer
        value={value}
        onChange={setValue}
        onSubmit={submit}
        inputRef={inputRef}
        locked={!!reveal || timer.isExpired}
        submitLabel="Go"
        placeholder="Type your answer"
        hint={q.category === 'sentences' ? undefined : "Include le, la, l' or les"}
      />
    </div>
  );
}
