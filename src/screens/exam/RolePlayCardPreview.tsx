import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import type { RolePlayScenario } from '../../data/exam/bank/types';

interface Props {
  scenario: RolePlayScenario;
  onBegin: () => void;
}

export function RolePlayCardPreview({ scenario, onBegin }: Props) {
  return (
    <div data-hatch="immersive" className="min-h-screen bg-bg pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-14 md:pt-16 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-eyebrow uppercase text-ink-subtle">Role play card · preparation</div>

        <div className="rounded-card surface p-6">
          <h1 className="exam-serif text-display-m text-ink mb-4">{scenario.title}</h1>

          <div className="rounded-card surface-recessed p-4">
            <p className="text-body-l text-ink leading-relaxed">{scenario.setup}</p>
          </div>

          <p className="text-body-s text-ink-muted leading-relaxed mt-5">
            You&rsquo;ll play the role above. The examiner will set the scene, then ask you five
            questions in French — answer each one. You won&rsquo;t see the questions in advance.
          </p>
        </div>

        <Button variant="primary" size="lg" onClick={onBegin} className="w-full">
          Begin
        </Button>
      </motion.div>
    </div>
  );
}
