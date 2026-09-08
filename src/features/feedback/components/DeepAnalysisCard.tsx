import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, stagger } from '../../../components/motion/variants';
import { useFeedbackContext } from '../state/feedbackContext';
import type { FeedbackV2 } from '../../../types';

const COMPLEXITY_COLOR: Record<string, string> = {
  simple:        'text-ink-muted',
  compound:      'text-amber-400',
  complex:       'text-violet-400',
  sophisticated: 'text-emerald-400',
};

interface Props {
  feedback: FeedbackV2;
}

export function DeepAnalysisCard({ feedback }: Props) {
  const { state } = useFeedbackContext();
  const deep = feedback.deepAnalysis;

  return (
    <AnimatePresence>
      {state.deepMode && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 overflow-hidden"
        >
          {deep ? (
            <>
              {/* Sentence-by-sentence */}
              {deep.sentences.length > 0 && (
                <motion.div variants={fadeUp} className="rounded-xl glass p-4">
                  <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider mb-3">Sentence Analysis</p>
                  <div className="space-y-2">
                    {deep.sentences.map((s, i) => (
                      <div key={i} className="p-2.5 rounded-lg glass-subtle">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold uppercase ${COMPLEXITY_COLOR[s.complexity] ?? 'text-ink-muted'}`}>
                            {s.complexity}
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-muted italic mb-1">"{s.text}"</p>
                        <p className="text-[10px] text-ink-muted">{s.critique}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Model answer */}
              {deep.modelAnswer && (
                <motion.div variants={fadeUp} className="rounded-xl glass p-4">
                  <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider mb-2.5">Model Answer</p>
                  <p className="text-[11px] text-emerald-300 leading-relaxed italic mb-2">
                    "{deep.modelAnswer.text}"
                  </p>
                  <p className="text-[10px] text-ink-muted">{deep.modelAnswer.whyItScores}</p>
                </motion.div>
              )}

              {/* Push to top marks */}
              {deep.pushToTopMarks.length > 0 && (
                <motion.div variants={fadeUp} className="rounded-xl glass p-4">
                  <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider mb-2.5">
                    How to Push to Top Marks
                  </p>
                  <ol className="space-y-1.5">
                    {deep.pushToTopMarks.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-[10px]">
                        <span className="text-violet-400 font-bold flex-shrink-0">{i + 1}.</span>
                        <span className="text-ink-muted">{tip}</span>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              )}

              {/* Rhythm */}
              {deep.rhythm && (
                <motion.div variants={fadeUp} className="rounded-xl glass p-4">
                  <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider mb-2">Rhythm & Pacing</p>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black" style={{ color: deep.rhythm.score >= 7 ? '#10B981' : deep.rhythm.score >= 5 ? '#F59E0B' : '#EF4444' }}>
                      {deep.rhythm.score}/10
                    </span>
                    <p className="text-[10px] text-ink-muted">{deep.rhythm.comment}</p>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div variants={fadeUp} className="rounded-xl glass p-4 text-center">
              <p className="text-[10px] text-ink-muted">
                Deep analysis is not available for this response. Connect to the backend to enable sentence-by-sentence coaching.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
