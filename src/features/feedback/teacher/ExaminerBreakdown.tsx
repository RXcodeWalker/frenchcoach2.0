import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Highlighter, Target } from 'lucide-react';
import { correct, stagger } from '../../../components/motion/variants';
import { ERROR_CATEGORY_LABELS } from '../../../domain/examFeedback/shared/errorCategories';
import { findExaminerDescriptor, type LearnExaminerFeedback } from '../../../services/coaching/examinerFeedback';
import { AnswerFeaturesCard } from '../components/AnswerFeaturesCard';
import { BreakdownCard } from '../components/BreakdownCard';
import { descriptorArea, placeErrors, type PlacedError } from './examinerAnswer';

/**
 * The Examiner style's Breakdown tab: the evidence, not the talk. The
 * conversation (the other tab) says what worked, each mistake and the next
 * step; this tab never repeats those lines. It holds what the examiner's
 * standard is (the descriptor the next step aims at, cited by page), your
 * predictions, the answer with each mistake corrected in place, and the exam
 * moves the answer makes. No mark, band or grade (ADR 0005).
 */

interface Props {
  result: LearnExaminerFeedback;
  transcript: string;
  predictions?: ReactNode;
}

function Mark({ placed, text, order, reduced }: { placed: PlacedError; text: string; order: number; reduced: boolean }) {
  const d = 0.3 + order * 0.22;
  const [struck, setStruck] = useState(reduced);
  useEffect(() => {
    if (reduced) return setStruck(true);
    const t = setTimeout(() => setStruck(true), (d + 0.1) * 1000);
    return () => clearTimeout(t);
  }, [reduced, d]);
  return (
    <span title={ERROR_CATEGORY_LABELS[placed.error.category]}>
      <span
        className="text-ink-muted line-through decoration-2"
        style={{
          textDecorationColor: struck ? 'var(--correction)' : 'transparent',
          transition: reduced ? undefined : 'text-decoration-color 240ms var(--ease)',
        }}
      >
        {text}
      </span>
      <motion.span
        className="inline-block font-semibold text-progress-text"
        initial={reduced ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : correct.fix(d)}
      >
        {' '}
        {placed.error.correction}
      </motion.span>
    </span>
  );
}

function MarkedAnswer({ transcript, result }: { transcript: string; result: LearnExaminerFeedback }) {
  const reduced = useReducedMotion() ?? false;
  const text = transcript.normalize('NFC');
  if (!text.trim()) return null;
  const placed = placeErrors(text, result.errors);
  const parts: ReactNode[] = [];
  let cursor = 0;
  placed.forEach((p, i) => {
    if (p.start > cursor) parts.push(text.slice(cursor, p.start));
    parts.push(<Mark key={i} placed={p} text={text.slice(p.start, p.end)} order={i} reduced={reduced} />);
    cursor = p.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return (
    <BreakdownCard
      title="Your answer, corrected"
      icon={Highlighter}
      tone="correction"
      count={placed.length}
      subtitle={placed.length > 0 ? 'Each mistake struck through, the right French beside it' : 'Nothing in it needed correcting'}
      testId="examiner-marked-answer"
    >
      <p lang="fr" className="text-body-base leading-loose text-ink">
        {parts}
      </p>
    </BreakdownCard>
  );
}

function LookFor({ result }: { result: LearnExaminerFeedback }) {
  const step = result.nextStep;
  const descriptor = step ? findExaminerDescriptor(step.descriptorId) : undefined;
  if (!step || !descriptor) return null;
  return (
    <BreakdownCard
      title="What examiners look for"
      icon={Target}
      tone="action"
      emphasis
      subtitle={descriptorArea(descriptor.id)}
      section="look-for"
      testId="examiner-look-for"
    >
      <blockquote className="border-l-2 border-action pl-3 text-body-base text-ink">“{descriptor.text}”</blockquote>
      <p className="mt-2 text-caption text-ink-subtle">Teacher/Examiner Notes, p.{descriptor.page}</p>
      {step.quote && (
        <div className="mt-3 rounded-control surface-recessed p-3">
          <p className="text-caption text-ink-muted">Build on your own words</p>
          <p lang="fr" className="mt-0.5 font-semibold text-progress-text">
            « {step.quote} »
          </p>
        </div>
      )}
    </BreakdownCard>
  );
}

export function ExaminerBreakdown({ result, transcript, predictions }: Props) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3" data-testid="examiner-breakdown">
      <LookFor result={result} />
      {predictions}
      <MarkedAnswer transcript={transcript} result={result} />
      <AnswerFeaturesCard transcript={transcript} />
    </motion.div>
  );
}
