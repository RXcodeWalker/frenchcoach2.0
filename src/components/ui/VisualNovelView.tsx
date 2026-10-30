import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageSquareText, Repeat, Volume2, VolumeX } from 'lucide-react';
import { CharacterAvatar, type CharacterNpc, type Expression } from './CharacterAvatar';
import { SpeechBubble } from './SpeechBubble';
import { MissionObjectivesList, type Objective } from './MissionObjectivesList';
import { RecordingPanel } from '../../screens/learn/RecordingPanel';
import { LiveFeedbackPanel, type PanelEntry } from './LiveFeedbackPanel';
import { TopContextBar } from '../TopContextBar';
import { PageShell } from '../layout/PageShell';
import { useHideDock } from '../layout/shellChrome';
import { useIsDesktop } from '../layout/useIsDesktop';
import { enter, enterReduced, slide } from '../motion/variants';
import type { RecordingState } from '../../features/recording/useRecording';
import {
  speakExaminerText,
  getExaminerVoiceGeneration,
  setExaminerVoiceMuted,
  isExaminerVoiceMuted,
  hasFrenchVoice,
} from '../../services/exam/examinerVoice';

interface VisualNovelViewProps {
  topic: string;
  npc: CharacterNpc & { roleEn?: string };
  expression: Expression;
  messages: { text: string; sender: 'ai' | 'user' }[];
  objectives: Objective[];
  currentInstruction?: string;
  isTyping: boolean;
  recording: RecordingState;
  panelEntries: PanelEntry[];
  canRedo: (turnKey: number) => boolean;
  redosLeft: (turnKey: number) => number;
  onStopRecording: () => void;
  onRedo: (turnKey: number) => void;
  onExit: () => void;
}

const iconBtn =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-hairline-strong text-ink-muted transition-[background-color,color,transform] duration-state ease-smooth hover:bg-track hover:text-ink active:scale-[.97]';

/**
 * The role-play screen (Design System v2), shared by scenarios and Story
 * mode. A top bar with back and the voice toggle, then the character, their
 * latest line, the current mission step and the recorder. On desktop the
 * mission list and coaching notes sit in a right column; on mobile the
 * recorder docks to the bottom and the notes open in a sheet.
 */
export const VisualNovelView: React.FC<VisualNovelViewProps> = ({
  topic,
  npc,
  expression,
  messages,
  objectives,
  currentInstruction,
  isTyping,
  recording,
  panelEntries,
  canRedo,
  redosLeft,
  onStopRecording,
  onRedo,
  onExit,
}) => {
  const latestMessage = messages[messages.length - 1];
  const [muted, setMuted] = useState(isExaminerVoiceMuted());
  const [sheetOpen, setSheetOpen] = useState(false);
  const voiceAvailable = hasFrenchVoice();
  const desktop = useIsDesktop();
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  useHideDock(true);

  const toggleMute = () => {
    const next = !muted;
    setExaminerVoiceMuted(next);
    setMuted(next);
  };

  const replay = () => {
    if (!latestMessage || latestMessage.sender !== 'ai' || muted || !voiceAvailable) return;
    void speakExaminerText(latestMessage.text, getExaminerVoiceGeneration());
  };

  const pending = panelEntries.some((e) => e.status === 'pending');

  const notes = (
    <>
      <MissionObjectivesList objectives={objectives} />
      <LiveFeedbackPanel entries={panelEntries} canRedo={canRedo} redosLeft={redosLeft} onRedo={onRedo} />
    </>
  );

  return (
    <>
      <TopContextBar
        title={topic}
        subtitle={npc.roleEn ? `${npc.nameFr} · ${npc.roleEn}` : npc.nameFr}
        showBack
        onBack={onExit}
        backLabel="Leave role play"
        actions={
          voiceAvailable ? (
            <button
              type="button"
              onClick={toggleMute}
              className={iconBtn}
              aria-pressed={muted}
              aria-label={muted ? 'Unmute character voice' : 'Mute character voice'}
            >
              {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
            </button>
          ) : undefined
        }
      />
      <PageShell maxWidth="xl" gap={16}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="mx-auto flex min-h-[calc(100dvh-170px)] w-full max-w-[760px] flex-col gap-4 lg:min-h-0">
            <motion.div variants={item}>
              <CharacterAvatar npc={npc} expression={expression} role={npc.roleEn} />
            </motion.div>

            {!voiceAvailable && (
              <motion.p variants={item} className="text-caption text-ink-subtle">
                No French voice installed — playing text-only.
              </motion.p>
            )}

            <motion.div variants={item} className="min-h-[120px]" aria-live="polite">
              {isTyping ? (
                <p className="rounded-card surface p-5 text-body-s text-ink-muted">{npc.nameFr} is replying…</p>
              ) : latestMessage && latestMessage.sender === 'ai' ? (
                <div className="flex flex-col gap-2">
                  <SpeechBubble key={latestMessage.text} text={latestMessage.text} sender="ai" name={npc.nameFr} />
                  {voiceAvailable && !muted && (
                    <button
                      type="button"
                      onClick={replay}
                      className="inline-flex h-10 items-center gap-2 self-start rounded-control px-3 text-[13px] font-semibold text-ink-muted
                        transition-[background-color,color,transform] duration-state ease-smooth hover:bg-track hover:text-ink active:scale-[.97]"
                      aria-label="Replay the character's line"
                    >
                      <Repeat size={14} aria-hidden="true" /> Hear it again
                    </button>
                  )}
                </div>
              ) : null}
            </motion.div>

            {currentInstruction && !isTyping && (
              <motion.div variants={item} className="flex flex-col gap-1 rounded-card bg-action-soft px-5 py-4">
                <span className="text-eyebrow uppercase text-action-text">Your move</span>
                <p className="text-body-base text-ink">{currentInstruction}</p>
              </motion.div>
            )}

            <motion.div variants={item} className="mt-auto">
              <RecordingPanel isActive recording={recording} onStop={onStopRecording} compact={!desktop} />
            </motion.div>
          </div>

          {desktop && <motion.aside variants={item} aria-label="Mission and coaching notes" className="flex flex-col gap-4 self-start">{notes}</motion.aside>}
        </div>
      </PageShell>

      {!desktop && (
        <>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`${iconBtn} fixed right-4 bottom-52 z-40 h-12 w-12 border-hairline bg-surface text-ink shadow-card`}
            aria-label="Show mission and coaching notes"
          >
            <MessageSquareText size={18} aria-hidden="true" />
            {pending && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-pill bg-reward" aria-hidden="true" />}
          </button>

          <AnimatePresence>
            {sheetOpen && (
              <>
                <motion.div
                  className="fixed inset-0 z-[90] bg-ink/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSheetOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Mission and coaching notes"
                  className="fixed bottom-0 left-0 right-0 z-[95] flex max-h-[75vh] flex-col gap-4 overflow-y-auto rounded-t-card surface-raised p-5 pb-8"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={reduced ? { duration: 0 } : slide}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.5 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 100) setSheetOpen(false);
                  }}
                >
                  <div className="mx-auto h-1.5 w-10 rounded-pill bg-track" aria-hidden="true" />
                  {notes}
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="h-11 rounded-control border border-hairline-strong text-[14px] font-semibold text-ink transition-colors duration-state hover:bg-track"
                  >
                    Close
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
};
