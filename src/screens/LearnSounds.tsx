import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { historyStatuses } from '../domain/pronunciation/lab/labHistory';
import { SCORED_FAMILIES, type ScoredFamilyId } from '../domain/pronunciation/lab/soundFamilies';
import { SOUND_TIPS } from '../domain/pronunciation/lab/tips';
import type { SoundFamilyId } from '../domain/pronunciation/lab/types';
import type { LabEntry } from '../services/telemetry/telemetryService';
import { EarTraining } from '../features/pronunciation/EarTraining';
import { LabPractice } from '../features/pronunciation/LabPractice';
import { PracticePicker } from '../features/pronunciation/PracticePicker';
import { SoundGuide } from '../features/pronunciation/SoundGuide';
import { SoundsHome } from '../features/pronunciation/SoundsHome';
import { TrickyWords } from '../features/pronunciation/TrickyWords';
import { useLabHistory } from '../features/pronunciation/labStore';

/**
 * The Pronunciation Lab home, `/learn/sounds` (pronunciation-lab plan §3.3).
 * Reached from Learn's topic grid while `pronunciationLab` is live (App.tsx
 * gates the route on the same flag). Lives inside Learn, so it is not a
 * launch-scope change. One view at a time, held here so the top bar's back
 * button steps out of a view before it leaves the Lab.
 *
 * Nothing here writes XP, a Session, mastery, review or Learn evidence; the
 * Lab's own history (`labStore`) is the only thing it stores.
 */

type View =
  | { kind: 'home' }
  | { kind: 'guide'; family: SoundFamilyId }
  | { kind: 'ear'; family: SoundFamilyId | 'all' }
  | { kind: 'tricky' }
  | { kind: 'practise'; family: SoundFamilyId | null }
  | { kind: 'lab'; sentence: string; entry: LabEntry; back: View; nonce: number };

const HOME: View = { kind: 'home' };

function subtitleOf(view: View): string {
  switch (view.kind) {
    case 'home': return 'Listen, say it, compare';
    case 'guide': return SOUND_TIPS[view.family].name;
    case 'ear': return 'Ear training';
    case 'tricky': return 'Tricky words';
    case 'practise': return 'Practise a sentence';
    case 'lab': return 'Say it again';
  }
}

export function LearnSounds() {
  const navigate = useNavigate();
  const { state } = useApp();
  const history = useLabHistory();
  const [view, setView] = useState<View>(HOME);
  /** Remounts the practice flow when the same sentence is picked twice. */
  const nonce = useRef(0);

  const statuses = historyStatuses(history);
  const notebookAnswers = useMemo(() => state.notebook.map((e) => e.answer), [state.notebook]);

  const openLab = (sentence: string, entry: LabEntry, back: View) =>
    setView({ kind: 'lab', sentence, entry, back, nonce: ++nonce.current });

  const handleBack = () => {
    if (view.kind === 'home') navigate('/learn');
    else if (view.kind === 'lab') setView(view.back);
    else setView(HOME);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar
        title="Pronunciation Lab"
        subtitle={subtitleOf(view)}
        showBack
        backLabel={view.kind === 'home' ? 'Back to Learn' : 'Back'}
        onBack={handleBack}
      />
      <PageShell maxWidth="md">
        {view.kind === 'home' && (
          <SoundsHome
            history={history}
            onOpenGuide={(family) => setView({ kind: 'guide', family })}
            onOpenEar={() => setView({ kind: 'ear', family: 'all' })}
            onOpenTricky={() => setView({ kind: 'tricky' })}
            onOpenPractise={() => setView({ kind: 'practise', family: null })}
          />
        )}
        {view.kind === 'guide' && (
          <SoundGuide
            family={view.family}
            status={(SCORED_FAMILIES as readonly SoundFamilyId[]).includes(view.family) ? statuses[view.family as ScoredFamilyId] : null}
            onSayWord={(word) => openLab(word, 'sound_guide', view)}
            onEarTraining={() => setView({ kind: 'ear', family: view.family })}
            onSentences={() => setView({ kind: 'practise', family: view.family })}
          />
        )}
        {view.kind === 'ear' && <EarTraining key={view.family} initialFamily={view.family} />}
        {view.kind === 'tricky' && <TrickyWords history={history} onPractiseSentence={() => setView({ kind: 'practise', family: null })} />}
        {view.kind === 'practise' && (
          <PracticePicker
            key={view.family ?? 'any'}
            notebookAnswers={notebookAnswers}
            initialFamily={view.family}
            onPick={(sentence) => openLab(sentence, 'lab_home', view)}
          />
        )}
        {view.kind === 'lab' && (
          <LabPractice
            key={view.nonce}
            targetSentence={view.sentence}
            entry={view.entry}
            onDone={() => setView(view.back)}
          />
        )}
      </PageShell>
    </div>
  );
}
