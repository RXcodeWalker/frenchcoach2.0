import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, VolumeX } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { isTtsAvailable, hasFrenchVoice, ensureVoiceReady } from '../../services/exam/examinerVoice';

interface Props {
  /** W5: which mode ExamSelect's toggle chose — this screen states what it does/doesn't give before the candidate commits. */
  coached: boolean;
  onStart: () => void;
  onBack: () => void;
}

const PAPER = [
  { n: '01', label: 'Role play — à la boulangerie', meta: '5 prompts · you have the card for 1 min' },
  { n: '02', label: 'Topic conversation — les loisirs', meta: '3 min · your chosen topic' },
  { n: '03', label: 'General conversation', meta: '3 min · unseen questions' },
];

export function ExamIntro({ coached, onStart, onBack }: Props) {
  // W5: surfaced here, before the mic is ever opened — not silently mid-exam.
  // Voice list can still be loading on mount (voiceschanged is async), so
  // re-check once it settles rather than trusting a synchronous read.
  const [voiceUnavailable, setVoiceUnavailable] = useState(isTtsAvailable() && !hasFrenchVoice());
  useEffect(() => {
    if (!isTtsAvailable()) return;
    void ensureVoiceReady().then(() => setVoiceUnavailable(!hasFrenchVoice()));
  }, []);
  return (
    <div data-hatch="immersive" className="min-h-screen bg-bg pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-14 md:pt-16 space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-9 h-9 rounded-control surface flex items-center justify-center
              text-ink-muted hover:text-ink transition-colors duration-state ease-smooth"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-pill bg-action text-action-ink flex items-center justify-center exam-serif text-body-l">
              C
            </div>
            <div>
              <div className="exam-serif text-subtitle text-ink leading-tight">Claire</div>
              <div className="text-body-s text-ink-subtle">your examiner tonight</div>
            </div>
          </div>
          <span className="ml-auto font-numeral text-body-s text-ink-subtle tabular-nums">
            0520 · Paper 4
          </span>
        </div>

        <div className="rounded-card surface p-6">
          <p className="exam-serif text-display-m text-ink leading-snug">
            Bonsoir. On commence par tes loisirs — trois minutes, comme le jour de l&rsquo;examen.
          </p>
          <p className="text-body-l text-ink-muted mt-3 leading-relaxed">
            Good evening. We&rsquo;ll start with your hobbies — three minutes, exactly like exam day.
            I won&rsquo;t interrupt you, and I won&rsquo;t show you a mark until the end.
          </p>
        </div>

        <div className="rounded-card surface-recessed p-4">
          <div className="text-eyebrow uppercase text-ink-subtle mb-1">
            {coached ? 'Coached Practice' : 'Exam Sim'}
          </div>
          <p className="text-body-s text-ink-muted leading-relaxed">
            {coached
              ? "Examiner commentary after each answer; you can type and correct your transcript. You'll still get a /40, but it's a practice mark and doesn't count."
              : "Microphone only, no commentary, no transcript editing — exactly like the real exam. Your /40 counts."}
          </p>
        </div>

        {voiceUnavailable && (
          <div className="rounded-card surface-recessed border border-amber-500/20 p-4 flex items-start gap-3">
            <VolumeX size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-body-s text-ink-muted leading-relaxed">
              No French voice was found on this device, so Claire&rsquo;s questions will be shown as text only,
              not spoken aloud. Everything else works the same.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" onClick={onStart}>
            Je suis prêt · start
          </Button>
          <Button variant="quiet" size="lg" onClick={onStart}>
            Hear the card first
          </Button>
        </div>

        <div className="border-t border-hairline pt-6">
          <div className="text-eyebrow uppercase text-ink-subtle mb-4">Tonight&rsquo;s paper</div>
          <div className="space-y-4">
            {PAPER.map((item) => (
              <div key={item.n} className="flex gap-4">
                <span className="font-numeral text-body-s text-ink-subtle tabular-nums pt-1">{item.n}</span>
                <div>
                  <div className="exam-serif text-subtitle text-ink">{item.label}</div>
                  <div className="text-body-s text-ink-subtle">{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
