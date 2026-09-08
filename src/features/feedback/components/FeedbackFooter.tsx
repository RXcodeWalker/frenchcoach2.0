import { motion } from 'framer-motion';
import { RotateCcw, ChevronRight, BookMarked } from 'lucide-react';

interface Props {
  onRetry: () => void;
  onComplete: () => void;
  modelAnswer?: string;
}

export function FeedbackFooter({ onRetry, onComplete, modelAnswer }: Props) {
  return (
    <div className="space-y-2">
      {modelAnswer && (
        <details className="rounded-xl glass p-4">
          <summary className="text-[10px] font-semibold text-ink-muted cursor-pointer select-none hover:text-ink-muted transition-colors">
            Show model answer
          </summary>
          <p className="text-[11px] text-ink-muted mt-2 leading-relaxed italic">"{modelAnswer}"</p>
        </details>
      )}

      <div className="flex gap-2">
        <motion.button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-subtle text-white font-semibold text-xs"
          whileTap={{ scale: 0.97 }}
        >
          <RotateCcw size={12} /> Retry
        </motion.button>

        <motion.button
          disabled
          title="Coming soon"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl glass-subtle text-ink-subtle font-semibold text-xs cursor-not-allowed"
        >
          <BookMarked size={12} />
        </motion.button>

        <motion.button
          onClick={onComplete}
          className="flex-1 btn-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          Next Question <ChevronRight size={13} />
        </motion.button>
      </div>
    </div>
  );
}
