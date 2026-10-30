import { useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { EMOJI_QUESTIONS, type EmojiQuestion } from '../../../data/emojiQuestions';
import { Button } from '../../../components/ui/Button';
import { FEEDBACK_DWELL_MS } from '../types';
import type { UseEmojiMasterRunResult } from '../useEmojiMasterRun';
import { classicChoices, reverseChoices } from '../choices';
import { useDigitKeys, useLater } from '../useRoundHelpers';
import { AnswerReveal } from '../ui/AnswerReveal';
import { ChoiceGrid } from '../ui/ChoiceGrid';
import { EmojiStage } from '../ui/EmojiStage';
import { ComboChip, HudRow, ProgressCells, ScoreChip } from '../ui/Hud';

interface McqModeProps {
  run: UseEmojiMasterRunResult;
  reverse?: boolean;
}

interface RoundProps extends McqModeProps {
  question: EmojiQuestion;
}

function McqRound({ run, question: q, reverse = false }: RoundProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const lockedRef = useRef(false);
  const later = useLater();

  // Shuffled once per question: the authored options keep the answer in a fixed slot.
  const choices = useMemo(
    () => (reverse ? reverseChoices(q, EMOJI_QUESTIONS) : classicChoices(q)),
    [q, reverse]
  );
  const correctAnswer = reverse ? q.emojis : q.french;
  const answered = selected !== null;
  const isCorrect = selected === correctAnswer;
  const isLast = run.questionIndex >= run.deckLength - 1;

  const next = () => {
    if (!run.advanceQuestion()) run.endRun('completed');
  };

  const pick = (choice: string) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setSelected(choice);
    const right = choice === correctAnswer;
    run.recordAnswer({
      userAnswer: choice,
      correctAnswer,
      isCorrect: right,
      promptKind: reverse ? 'french' : 'emoji',
      scoreDelta: right ? 1 : 0,
    });
    // A right answer moves on by itself; a miss waits so the fix can be read and heard.
    if (right) later(next, FEEDBACK_DWELL_MS.correct);
  };

  useDigitKeys(!answered, choices.length, (i) => pick(choices[i]));

  return (
    <>
      <EmojiStage
        questionKey={q.id}
        prompt={reverse ? q.french : q.emojis}
        promptKind={reverse ? 'french' : 'emoji'}
        small={q.category === 'sentences'}
        caption={reverse ? 'Which emoji matches?' : 'What is this in French?'}
        outcome={!answered ? null : isCorrect ? 'correct' : 'incorrect'}
        reveal={
          answered ? (
            <AnswerReveal
              kind={isCorrect ? 'correct' : 'miss'}
              question={q}
              userAnswer={isCorrect ? undefined : selected ?? undefined}
              showEmojiWithFix={reverse}
            />
          ) : undefined
        }
      />
      <ChoiceGrid
        choices={choices}
        correct={correctAnswer}
        selected={selected}
        emoji={reverse}
        small={reverse && q.category === 'sentences'}
        onPick={pick}
      />
      {answered && !isCorrect && (
        <Button size="lg" onClick={next} autoFocus className="w-full">
          {isLast ? 'See results' : 'Next'}
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
      )}
    </>
  );
}

export function ClassicMode({ run, reverse = false }: McqModeProps) {
  const q = run.currentQuestion;
  if (!q) return null;

  return (
    <div className="flex flex-col gap-4">
      <HudRow
        left={
          <>
            Question {run.questionIndex + 1} of {run.deckLength}
          </>
        }
        right={
          <>
            <ComboChip streak={run.streak} />
            <ScoreChip label="Score" value={run.score} />
          </>
        }
      />
      <ProgressCells total={run.deckLength} index={run.questionIndex} history={run.history} />
      <McqRound key={`${run.questionIndex}-${q.id}`} run={run} question={q} reverse={reverse} />
    </div>
  );
}

export function ReverseMode(props: Omit<McqModeProps, 'reverse'>) {
  return <ClassicMode {...props} reverse />;
}
