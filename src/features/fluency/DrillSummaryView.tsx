import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { fadeUp, stagger } from '../../components/motion/variants';
import { summarizeDrill, type DrillRecord } from '../../domain/fluency/drill432';
import { ChangeList } from './ChangeList';
import { HonestyNote } from './FluencyView';
import {
  BACK_TO_FLUENCY,
  DRILL_AGAIN,
  DRILL_HEADLINE,
  NEW_QUESTION,
  compareCaption,
  saidMuchLessLine,
  wordsLine,
} from './fluencyCopy';

/** The end of a drill (fluency-trainer §3.3): what changed from the first round to the last, in flow terms only. */
export function DrillSummaryView({
  record,
  onAgain,
  onNewQuestion,
  onBack,
}: {
  record: DrillRecord;
  onAgain: () => void;
  onNewQuestion: () => void;
  onBack: () => void;
}) {
  const s = summarizeDrill(record.rounds);
  return (
    <motion.div className="flex flex-col gap-6" variants={stagger} initial="hidden" animate="show" data-testid="drill-summary" data-headline={s.headline}>
      <motion.h1 variants={fadeUp} className="text-title text-ink">{DRILL_HEADLINE[s.headline]}</motion.h1>
      {s.from !== null && s.to !== null && s.changes.length > 0 && (
        <motion.section variants={fadeUp} className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-[clamp(16px,3cqw,24px)]">
          <p className="text-caption text-ink-muted">{compareCaption(record.rounds[s.from].limitS, record.rounds[s.to].limitS)}</p>
          <ChangeList changes={s.changes} testId="drill-summary-changes" />
          {s.words && (
            <p className="text-body-s text-ink-muted" data-testid="drill-words">
              {s.saidMuchLess ? saidMuchLessLine(s.words.before, s.words.after) : wordsLine(s.words.before, s.words.after)}
            </p>
          )}
        </motion.section>
      )}
      <motion.div variants={fadeUp}><HonestyNote /></motion.div>
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onAgain} data-testid="drill-again">{DRILL_AGAIN}</Button>
        <Button variant="secondary" onClick={onNewQuestion}>{NEW_QUESTION}</Button>
        <Button variant="quiet" onClick={onBack}>{BACK_TO_FLUENCY}</Button>
      </motion.div>
    </motion.div>
  );
}
