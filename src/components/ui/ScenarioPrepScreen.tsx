import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Layers,
  Zap,
  ArrowRight,
  Info,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { VocabListView } from './VocabListView';
import { FlashcardDeck } from './FlashcardDeck';
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

export const ScenarioPrepScreen: React.FC<ScenarioPrepScreenProps> = ({
  meta,
  deck,
  missions,
  sttSupported,
  hasFrenchVoice,
  onReady,
  onCancel,
}) => {
  const [viewMode, setViewMode] = useState<'briefing' | 'list' | 'flashcards'>('briefing');

  const coreEntries = deck.filter((e) => e.rank === 'core');
  const extendEntries = deck.filter((e) => e.rank === 'extend');
  const allEntries = [...coreEntries, ...extendEntries];

  return (
    <div className="flex flex-col h-full bg-navy/60 backdrop-blur-xl rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 pb-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <Info size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Preparation Phase</h2>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Master the keywords before you speak</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-xs font-black text-ink-muted hover:text-white transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>

        <div className="flex gap-2 p-1 bg-black/20 rounded-2xl border border-white/5 w-fit">
          <button
            onClick={() => setViewMode('briefing')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'briefing' ? 'bg-violet-600 text-white shadow-lg' : 'text-ink-muted hover:text-white'
            }`}
          >
            <Info size={14} /> Briefing
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'list' ? 'bg-violet-600 text-white shadow-lg' : 'text-ink-muted hover:text-white'
            }`}
          >
            <BookOpen size={14} /> Study List
          </button>
          <button
            onClick={() => setViewMode('flashcards')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'flashcards' ? 'bg-violet-600 text-white shadow-lg' : 'text-ink-muted hover:text-white'
            }`}
          >
            <Layers size={14} /> Flashcards
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {viewMode === 'briefing' ? (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Info size={14} className="text-violet-400" />
                  <h4 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em]">The Setting</h4>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed bg-white/5 border border-white/10 rounded-2xl p-4">
                  {meta.briefingEn}
                </p>
                <p className="text-xs text-ink-muted mt-2">
                  You'll be speaking with <span className="text-ink-muted font-bold">{meta.npc.nameFr}</span>, the {meta.npc.roleEn}.
                </p>
              </div>

              {missions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={14} className="text-amber-400 fill-amber-400" />
                    <h4 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em]">Possible Missions</h4>
                  </div>
                  <ul className="space-y-2">
                    {missions.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-ink-muted"
                      >
                        <span className="text-violet-400 mt-0.5">•</span>
                        <span>{m.en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <h4 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em]">Capability Check</h4>
                </div>
                <div className="space-y-2">
                  {sttSupported ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <CheckCircle2 size={14} className="shrink-0" /> Speech recognition is available in this browser.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <AlertTriangle size={14} className="shrink-0" /> This browser doesn't support live speech transcription. Try Chrome or Edge to speak your answers.
                    </div>
                  )}
                  {hasFrenchVoice ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <CheckCircle2 size={14} className="shrink-0" /> A French voice is installed — the NPC will speak aloud.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <AlertTriangle size={14} className="shrink-0" /> No French voice installed — the NPC's lines will be text-only.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {coreEntries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={14} className="text-amber-400 fill-amber-400" />
                    <h4 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em]">Essential Vocabulary</h4>
                  </div>
                  <VocabListView items={coreEntries} />
                </div>
              )}
              {extendEntries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={14} className="text-violet-400 fill-violet-400" />
                    <h4 className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em]">Extend Your Vocabulary</h4>
                  </div>
                  <VocabListView items={extendEntries} />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FlashcardDeck items={allEntries} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-8 pt-0">
        <button
          onClick={onReady}
          className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-violet-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase italic tracking-wider group"
        >
          Start Roleplay
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
