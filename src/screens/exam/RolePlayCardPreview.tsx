import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatTime } from '../../domain/time';
import type { RolePlayScenario } from '../../data/exam/bank/types';

interface Props {
  scenario: RolePlayScenario;
  onBegin: () => void;
}

/** ExamIntro's PAPER copy already promises "you have the card for 1 min" — this is that prep window, made real. Pacing only, never a cutoff: Begin stays available throughout. */
const PREP_SECONDS = 60;

export function RolePlayCardPreview({ scenario, onBegin }: Props) {
  const [remainingS, setRemainingS] = useState(PREP_SECONDS);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingS((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div data-hatch="immersive" className="min-h-screen bg-bg pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-14 md:pt-16 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div className="text-eyebrow uppercase text-ink-subtle">Role play card · preparation</div>
          <div
            className="font-numeral text-body-s tabular-nums text-ink-subtle"
            aria-label="Preparation time remaining"
          >
            {formatTime(remainingS)}
          </div>
        </div>

        <div className="rounded-card surface p-6">
          <h1 className="exam-serif text-display-m text-ink mb-4">{scenario.title}</h1>

          <div className="rounded-card surface-recessed p-4">
            <p className="text-body-l text-ink leading-relaxed">{scenario.setup}</p>
          </div>

          <p className="text-body-s text-ink-muted leading-relaxed mt-5">
            You&rsquo;ll play the role above. The examiner will set the scene, then ask you five
            questions in French — answer each one. You won&rsquo;t see the questions in advance.
          </p>

          <div className="mt-5 border-t border-hairline pt-4">
            <div className="text-eyebrow uppercase text-ink-subtle mb-3">Your 5 tasks</div>
            <div className="grid grid-cols-5 gap-2">
              {scenario.tasks.map((task, i) => (
                <div
                  key={task.questionId}
                  className="rounded-control surface-recessed py-2.5 flex flex-col items-center gap-1"
                >
                  <Lock size={11} className="text-ink-subtle" />
                  <span className="font-numeral text-body-s text-ink-subtle tabular-nums">{i + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-body-s text-ink-subtle leading-relaxed mt-2">
              Each task stays hidden until the examiner asks it — this is the card&rsquo;s real shape,
              not its content.
            </p>
          </div>
        </div>

        <Button variant="primary" size="lg" onClick={onBegin} className="w-full">
          Begin
        </Button>
      </motion.div>
    </div>
  );
}
