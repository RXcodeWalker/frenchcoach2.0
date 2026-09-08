import { motion } from 'framer-motion';
import { Microscope } from 'lucide-react';
import { useFeedbackContext } from '../state/feedbackContext';

export function DeepAnalysisToggle() {
  const { state, dispatch } = useFeedbackContext();

  return (
    <div className="flex justify-center">
      <motion.button
        onClick={() => dispatch({ type: 'SET_DEEP_MODE', value: !state.deepMode })}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-semibold border transition-colors ${
          state.deepMode
            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
            : 'surface-recessed text-ink-muted border-slate-700/40 hover:text-ink-muted'
        }`}
        whileTap={{ scale: 0.97 }}
      >
        <Microscope size={12} />
        {state.deepMode ? 'Standard View' : 'Deep Analysis'}
      </motion.button>
    </div>
  );
}
