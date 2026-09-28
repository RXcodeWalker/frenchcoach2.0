import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatTime } from '../../domain/time';
import type { RolePlayScenario } from '../../data/exam/bank/types';

interface Props {
  scenario: RolePlayScenario;
  /**
   * D3 (exam-conduct §2): Exam Sim gets the real 10-minute supervised
   * preparation window, a fixed countdown with no early start (the "Start
   * now" escape hatch is offered anyway, but marks the attempt practice-only
   * — see attemptStatus.ts's `earlyStart`). Coached is untimed.
   */
  coached: boolean;
  /** `earlyStart` is true only for the Exam Sim "Start now" escape hatch. */
  onBegin: (earlyStart: boolean) => void;
}

/** TN p.1/p.5, Syl p.19: 10 minutes of supervised preparation. Exam Sim only. */
const PREP_SECONDS = 10 * 60;

export function RolePlayCardPreview({ scenario, coached, onBegin }: Props) {
  const [remainingS, setRemainingS] = useState(PREP_SECONDS);

  useEffect(() => {
    if (coached) return; // Coached: untimed, start when ready.
    const interval = window.setInterval(() => {
      setRemainingS((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [coached]);

  // Auto-advance to the greeting at 0:00 (D3) — no early start in Exam Sim by
  // default. A separate effect (not folded into the interval above) so it
  // fires exactly once, the instant the countdown reaches zero.
  useEffect(() => {
    if (!coached && remainingS === 0) onBegin(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingS, coached]);

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
          {!coached && (
            <div
              className="font-numeral text-body-s tabular-nums text-ink-subtle"
              aria-label="Preparation time remaining"
            >
              {formatTime(remainingS)}
            </div>
          )}
        </div>

        <div className="rounded-card surface p-6">
          <h1 className="exam-serif text-display-m text-ink mb-4">{scenario.title}</h1>

          <div className="rounded-card surface-recessed p-4">
            <p className="text-body-l text-ink leading-relaxed">{scenario.setup}</p>
          </div>

          <p className="text-body-s text-ink-muted leading-relaxed mt-5">
            You&rsquo;ll play the role above. The examiner will set the scene, then ask you five
            tasks in French — some in two parts. Answer each one; you won&rsquo;t see them in
            advance. Keep this card in view: after the role play, there are two topic
            conversations, and you&rsquo;ll see this card until the whole test ends.
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

        {coached ? (
          <Button variant="primary" size="lg" onClick={() => onBegin(false)} className="w-full">
            Begin
          </Button>
        ) : (
          <div className="space-y-2">
            <Button variant="primary" size="lg" onClick={() => onBegin(true)} className="w-full">
              Start now
            </Button>
            <p className="text-body-s text-ink-subtle text-center leading-relaxed">
              The exam starts on its own at 0:00, exactly like the real preparation time. Starting
              early makes this attempt practice-only — it won&rsquo;t count.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
