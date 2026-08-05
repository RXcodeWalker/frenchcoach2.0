import { Mic2, Volume2 } from 'lucide-react';
import { CollapsibleCard } from '../../../components/ui/CollapsibleCard';
import { PronunciationSourceBadge } from '../../../screens/learn/PronunciationSourceBadge';
import { PronunciationHeatMap } from './PronunciationHeatMap';
import { TTS } from '../../../services/tts/ttsService';
import type { PronunciationAssessment } from '../../../domain/pronunciation/types';

interface Props {
  result: PronunciationAssessment;
  correctedSentence?: string;
}

const SEVERITY_DOT: Record<string, string> = {
  low:    'bg-yellow-400',
  medium: 'bg-amber-400',
  high:   'bg-red-400',
};

// 0-100 scale — deliberately not domain/scoring's scoreColor (0-10 domain).
function azureScoreColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  return '#f87171';
}

export function AzurePronunciationCard({ result, correctedSentence }: Props) {
  const circumference = 94.2;

  if (result.couldNotAssess || result.score === null) {
    return (
      <CollapsibleCard
        title="Pronunciation Analysis"
        icon={<Mic2 size={13} className="text-cyan-400" />}
        defaultOpen={true}
        className="border border-cyan-500/15"
      >
        <div className="px-1 py-2">
          <p className="text-[10px] font-semibold text-slate-300">We couldn't assess this recording.</p>
          <p className="text-[9px] text-slate-500 mt-1">
            {result.couldNotAssessReason === 'silence' || result.couldNotAssessReason === 'no_speech_recognized'
              ? "We didn't hear any speech — try recording again."
              : "The recording was too unclear to analyse. Try again in a quieter spot."}
          </p>
        </div>
      </CollapsibleCard>
    );
  }

  const score = result.score;
  const color = azureScoreColor(score);

  return (
    <CollapsibleCard
      title="Pronunciation Analysis"
      icon={<Mic2 size={13} className="text-cyan-400" />}
      badgeCount={result.issues.length}
      defaultOpen={true}
      className="border border-cyan-500/15"
    >
      <div className="flex items-center gap-3 mb-1 px-1">
        <div className="relative w-10 h-10 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-700" />
            <circle
              cx="18" cy="18" r="15" fill="none" strokeWidth="3"
              stroke={color}
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color }}>
            {Math.round(score)}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-300">Pronunciation score</p>
          <p className="text-[9px] text-slate-500">Based on acoustic analysis of your recording.</p>
        </div>
      </div>

      <div className="px-1 mb-2 flex items-center gap-2">
        <PronunciationSourceBadge provider={result.provider} />
        {correctedSentence && (
          <button
            type="button"
            onClick={() => TTS.speak(correctedSentence)}
            className="flex items-center gap-1 text-[9px] text-cyan-300 hover:text-cyan-200 font-medium ml-auto"
          >
            <Volume2 size={11} /> Hear corrected sentence
          </button>
        )}
      </div>

      {result.subScores && (
        <div className="grid grid-cols-3 gap-2 px-1 mb-3">
          {([
            ['Accuracy', result.subScores.accuracy],
            ['Fluency', result.subScores.fluency],
            ['Completeness', result.subScores.completeness],
          ] as const).map(([label, value]) => (
            <div key={label} className="text-center p-2 rounded-lg bg-slate-800/50 border border-slate-700/40">
              <p className="text-[11px] font-bold text-slate-200">{value === null ? '—' : Math.round(value)}</p>
              <p className="text-[8px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <PronunciationHeatMap assessment={result} onSpeakWord={(word) => TTS.speak(word)} />

      {result.issues.length > 0 && (
        <div className="space-y-2">
          {result.issues.map((issue, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[issue.severity] ?? 'bg-slate-500'}`} />
                <span className="text-[10px] font-bold text-slate-200">{issue.word}</span>
                {issue.ipaExpected && (
                  <span className="text-[9px] text-slate-500 font-mono ml-auto">/{issue.ipaExpected}/</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mb-1.5">{issue.problem}</p>
              {issue.drill.repeatPhrase && (
                <div className="flex items-center gap-1.5">
                  <Mic2 size={9} className="text-cyan-400 shrink-0" />
                  <p className="text-[9px] text-cyan-300 font-medium">
                    Drill: "{issue.drill.repeatPhrase}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
