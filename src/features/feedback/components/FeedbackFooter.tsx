import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, ChevronRight } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface Props {
  onRetry: () => void;
  onComplete: () => void;
  /** Shown as "Show model answer" — the Full report passes it, the Coach view does not (one place only). */
  modelAnswer?: string;
  /**
   * What "Get new feedback" costs, said in the confirm dialog. It is marked by
   * the same AI coach again, so it spends one of the day's Learn answers.
   */
  retryNote?: string;
}

export const DEFAULT_RETRY_NOTE =
  'Your answer is marked again by the same AI coach, so this uses one of your daily Learn answers.';

export function FeedbackFooter({ onRetry, onComplete, modelAnswer, retryNote = DEFAULT_RETRY_NOTE }: Props) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="space-y-2">
      {modelAnswer && (
        <details className="rounded-xl surface p-4">
          <summary className="text-sm font-semibold text-ink-muted cursor-pointer select-none hover:text-ink-muted transition-colors">
            Show model answer
          </summary>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed italic">"{modelAnswer}"</p>
        </details>
      )}

      <div className="flex gap-2">
        <motion.button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl surface-recessed text-ink font-semibold text-sm"
          whileTap={{ scale: 0.97 }}
        >
          <RotateCcw size={12} /> Get new feedback
        </motion.button>

        <motion.button
          onClick={onComplete}
          data-shortcut="continue"
          title="Next question (N)"
          className="flex-1 btn-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          Next question <ChevronRight size={13} />
        </motion.button>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Get new feedback?"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep this feedback
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                onRetry();
              }}
            >
              Yes, use an answer
            </Button>
          </div>
        }
      >
        <p className="text-body-s text-ink-muted" data-testid="retry-confirm-note">
          {retryNote}
        </p>
      </Modal>
    </div>
  );
}
