import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { VocabListView } from './VocabListView';
import { FlashcardDeck } from './FlashcardDeck';
import { Button } from './Button';
import { Segmented } from './Segmented';
import { enter, enterReduced } from '../motion/variants';
import type { Mission, ScenarioMeta, VocabEntry } from '../../features/roleplay/types';

interface ScenarioPrepScreenProps {
  meta: ScenarioMeta;
  deck: VocabEntry[];
  /** Every mission across every branch — the branch isn't chosen until the
   *  opening line, so the briefing lists what could be achieved, not a
   *  specific branch's list. */
  missions: Mission[];
  sttSupported: boolean;
  hasFrenchVoice: boolean;
  onReady: () => void;
  onCancel: () => void;
}

type ViewMode = 'briefing' | 'list' | 'flashcards';

/**
 * Scenario preparation (Design System v2): a Briefing / Study list /
 * Flashcards switch, the content for the chosen view, and one primary
 * "Start role play" button that stays reachable at the bottom.
 */
export const ScenarioPrepScreen: React.FC<ScenarioPrepScreenProps> = ({
  meta,
  deck,
  missions,
  sttSupported,
  hasFrenchVoice,
  onReady,
  onCancel,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('briefing');
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;

  const coreEntries = deck.filter((e) => e.rank === 'core');
  const extendEntries = deck.filter((e) => e.rank === 'extend');
  const allEntries = [...coreEntries, ...extendEntries];

  return (
    <>
      <motion.div variants={item}>
        <Segmented<ViewMode>
          label="Preparation view"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { id: 'briefing', label: 'Briefing' },
            { id: 'list', label: 'Study list' },
            { id: 'flashcards', label: 'Flashcards' },
          ]}
        />
      </motion.div>

      <motion.div key={viewMode} variants={item} initial="hidden" animate="show" className="flex flex-col gap-6">
        {viewMode === 'briefing' && (
          <>
            <section aria-labelledby="prep-setting" className="flex flex-col gap-3">
              <h2 id="prep-setting" className="text-section text-ink">The setting</h2>
              <div className="flex flex-col gap-2 rounded-card surface p-5">
                <p className="text-body-base text-ink">{meta.briefingEn}</p>
                <p className="text-body-s text-ink-muted">
                  You’ll be speaking with <span className="font-semibold text-ink">{meta.npc.nameFr}</span>, the {meta.npc.roleEn}.
                </p>
              </div>
            </section>

            {missions.length > 0 && (
              <section aria-labelledby="prep-missions" className="flex flex-col gap-3">
                <h2 id="prep-missions" className="text-section text-ink">Possible missions</h2>
                <ul className="flex flex-col gap-2">
                  {missions.map((m) => (
                    <li key={m.id} className="flex items-start gap-3 rounded-card surface p-4 text-body-s text-ink">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-action" />
                      <span>{m.en}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="prep-check" className="flex flex-col gap-3">
              <h2 id="prep-check" className="text-section text-ink">Before you start</h2>
              <div className="flex flex-col gap-2">
                <Check ok={sttSupported}>
                  {sttSupported
                    ? 'Speech recognition is available in this browser.'
                    : 'This browser doesn’t support live speech transcription. Try Chrome or Edge to speak your answers.'}
                </Check>
                <Check ok={hasFrenchVoice}>
                  {hasFrenchVoice
                    ? 'A French voice is installed — the character will speak aloud.'
                    : 'No French voice installed — the character’s lines will be text-only.'}
                </Check>
              </div>
            </section>
          </>
        )}

        {viewMode === 'list' && (
          <>
            {coreEntries.length > 0 && (
              <section aria-labelledby="prep-core" className="flex flex-col gap-3">
                <h2 id="prep-core" className="text-section text-ink">Essential vocabulary</h2>
                <VocabListView items={coreEntries} />
              </section>
            )}
            {extendEntries.length > 0 && (
              <section aria-labelledby="prep-extend" className="flex flex-col gap-3">
                <h2 id="prep-extend" className="text-section text-ink">Extend your vocabulary</h2>
                <VocabListView items={extendEntries} />
              </section>
            )}
          </>
        )}

        {viewMode === 'flashcards' && <FlashcardDeck items={allEntries} />}
      </motion.div>

      <motion.div variants={item} className="sticky bottom-[88px] z-10 -mx-4 flex flex-col gap-1 bg-bg px-4 py-2 md:static md:mx-0 md:bg-transparent md:p-0">
        <Button size="lg" onClick={onReady} className="w-full shadow-card">
          Start role play <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <Button variant="quiet" onClick={onCancel} className="w-full">Not now</Button>
      </motion.div>
    </>
  );
};

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <p className={`flex items-start gap-2.5 rounded-control px-3.5 py-3 text-[13px] ${ok ? 'bg-progress-soft text-progress-text' : 'bg-reward-soft text-reward-text'}`}>
      <Icon size={16} className="mt-px shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
