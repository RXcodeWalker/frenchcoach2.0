import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  ArrowLeft,
  RotateCcw,
  Info,
  Volume2,
  ChevronRight,
  Trophy,
  Target,
  Star
} from 'lucide-react';
import { useAudioBlobRecorder } from '../features/recording/useAudioBlobRecorder';
import { Waveform } from '../features/recording/Waveform';
import { assessPronunciation } from '../services/pronunciation/pronunciationClient';
import { PronunciationSourceBadge } from './learn/PronunciationSourceBadge';
import type { PronunciationAssessment } from '../domain/pronunciation/types';

interface AccentDrill {
  id: string;
  french: string;
  english: string;
  focus: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tips: string[];
}

const DRILLS: AccentDrill[] = [
  {
    id: 'nasal_1',
    french: "Un bon vin blanc.",
    english: "A good white wine.",
    focus: "Nasal Vowels",
    difficulty: 'Easy',
    tips: ["Try to let the air escape through your nose.", "Don't pronounce the 'n' or 'm' fully."]
  },
  {
    id: 'r_1',
    french: "Rarement, René regarde la rue.",
    english: "Rarely, René looks at the street.",
    focus: "The French 'R'",
    difficulty: 'Medium',
    tips: ["The French 'R' is gargled in the throat.", "Keep the tip of your tongue down."]
  },
  {
    id: 'u_1',
    french: "Tu as vu le mur ?",
    english: "Have you seen the wall?",
    focus: "The 'U' vs 'OU' sound",
    difficulty: 'Medium',
    tips: ["For 'U', shape your lips like 'OU' but say 'EE'.", "Don't confuse it with the English 'U'."]
  },
  {
    id: 'elision_1',
    french: "L'écureuil cueillait des noisettes.",
    english: "The squirrel was picking hazelnuts.",
    focus: "Elision & Fluidity",
    difficulty: 'Hard',
    tips: ["Merge the words smoothly.", "Watch out for the 'euil' sound."]
  },
  {
    id: 'tongue_1',
    french: "Ces six saucissons-ci sont si secs qu'on ne sait si c'en sont.",
    english: "These six sausages here are so dry that one doesn't know if they are sausages.",
    focus: "Sibilance & Speed",
    difficulty: 'Hard',
    tips: ["Start slowly and focus on clarity.", "Don't rush the 's' sounds."]
  }
];

interface AccentResults {
  score: number;
  accuracy: number;
  fluency: number;
  feedback: string;
  matches: { word: string; status: 'perfect' | 'good' | 'missed' }[];
  provider: PronunciationAssessment['provider'];
}

function feedbackForScore(score: number): string {
  if (score > 90) return "Excellent! You said all the key words clearly.";
  if (score > 75) return "Great job! Most words came through — focus on the tricky parts.";
  if (score > 50) return "Good effort! Try to emphasize the nasal sounds more.";
  return "Keep practicing! Listen to the native audio and try to mimic the rhythm.";
}

function statusForAccuracy(accuracyScore: number | null): 'perfect' | 'good' | 'missed' {
  if (accuracyScore === null) return 'good';
  if (accuracyScore >= 90) return 'perfect';
  if (accuracyScore >= 60) return 'good';
  return 'missed';
}

// Real pass-through mapping, not a rescale: score/subScores are already 0-100
// end to end in the new contract, so no `* 10` unit conversion is needed here.
function mapAssessmentToAccentResults(assessment: PronunciationAssessment): AccentResults {
  return {
    score: assessment.score,
    accuracy: Math.round(assessment.subScores?.accuracy ?? assessment.score),
    fluency: Math.round(assessment.subScores?.fluency ?? assessment.score),
    feedback: feedbackForScore(assessment.score),
    matches: assessment.words.map(w => ({
      word: w.word,
      status: statusForAccuracy(w.accuracyScore),
    })),
    provider: assessment.provider,
  };
}

export function AccentAnalyzer() {
  const navigate = useNavigate();
  const { isRecording, start, stop, waveData, micLevel } = useAudioBlobRecorder();

  const [selectedDrill, setSelectedDrill] = useState<AccentDrill>(DRILLS[0]);
  const [results, setResults] = useState<AccentResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const handleStopRecording = async () => {
    const recorded = await stop();
    if (!recorded) return;
    await analyzeAccent(recorded.blob);
  };

  const analyzeAccent = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setEvalError(null);
    try {
      const assessment = await assessPronunciation({
        audioBlob,
        targetText: selectedDrill.french,
        source: 'accent_analyzer',
      });
      setResults(mapAssessmentToAccentResults(assessment));
    } catch (err) {
      console.error("Accent evaluation failed:", err);
      setEvalError(err instanceof Error ? err.message : 'Evaluation failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResults(null);
    setEvalError(null);
  };

  const playReference = () => {
    const utterance = new SpeechSynthesisUtterance(selectedDrill.french);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">Accent Analyzer</h1>
            <p className="text-xs text-slate-500">Fine-tune your French pronunciation</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Target size={20} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drills List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-1">Selected Drills</h2>
            <div className="space-y-2">
              {DRILLS.map(drill => (
                <button
                  key={drill.id}
                  onClick={() => {
                    setSelectedDrill(drill);
                    reset();
                  }}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-300 border ${
                    selectedDrill.id === drill.id 
                      ? 'bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/20' 
                      : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      drill.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                      drill.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {drill.difficulty}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500">{drill.focus}</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-0.5">{drill.french}</p>
                  <p className="text-[10px] text-slate-600 italic">{drill.english}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-3xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Target size={120} className="text-cyan-500" />
              </div>

              <div className="space-y-2 relative">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Target Sentence</h3>
                <p className="text-3xl font-black text-white leading-tight">{selectedDrill.french}</p>
                <button 
                  onClick={playReference}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all group"
                >
                  <Volume2 size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Listen to native</span>
                </button>
              </div>

              {/* Recording State */}
              <div className="w-full max-w-sm py-4">
                <AnimatePresence mode="wait">
                  {evalError ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center space-y-4 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <Info size={28} className="text-rose-400" />
                      </div>
                      <p className="text-rose-400 font-bold text-sm">Evaluation failed</p>
                      <p className="text-slate-500 text-xs max-w-xs">{evalError}</p>
                      <button
                        onClick={reset}
                        className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all"
                      >
                        <RotateCcw size={14} /> Try Again
                      </button>
                    </motion.div>
                  ) : !results && !isAnalyzing ? (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center space-y-6"
                    >
                      {isRecording ? (
                        <div className="w-full space-y-6">
                          <div className="h-16 flex items-center justify-center">
                            <Waveform data={waveData} isRecording={isRecording} source={micLevel} />
                          </div>
                          <p className="text-cyan-400 font-bold animate-pulse text-sm">Recording... Speak now</p>
                          <button
                            onClick={handleStopRecording}
                            className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/40 border-4 border-rose-500/20 group relative"
                          >
                            <div className="absolute inset-0 rounded-full animate-ping bg-rose-500/20" />
                            <div className="w-6 h-6 bg-white rounded-sm" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex gap-3">
                            {selectedDrill.tips.map((tip, i) => (
                              <div key={i} className="flex-1 p-3 rounded-xl bg-slate-900/50 border border-white/5 text-[10px] text-slate-400 text-left flex gap-2">
                                <Info size={12} className="flex-shrink-0 text-cyan-500" />
                                <span>{tip}</span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={start}
                            className="w-24 h-24 rounded-full bg-cyan-500 flex items-center justify-center shadow-xl shadow-cyan-500/30 border-4 border-cyan-500/20 hover:scale-105 active:scale-95 transition-all group"
                          >
                            <Mic size={32} className="text-white group-hover:rotate-12 transition-transform" />
                          </button>
                          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Tap to start analyzing</p>
                        </div>
                      )}
                    </motion.div>
                  ) : isAnalyzing ? (
                    <motion.div 
                      key="analyzing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center space-y-4"
                    >
                      <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10" />
                        <motion.div 
                          className="absolute inset-0 rounded-full border-4 border-t-cyan-500"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                      <p className="text-cyan-400 font-bold text-sm animate-pulse">AI is analyzing your phonemes...</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="results"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full space-y-8"
                    >
                      {/* Score Circle */}
                      <div className="flex justify-center gap-12">
                        <div className="text-center space-y-1">
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="48" cy="48" r="40"
                                className="stroke-white/5 fill-none"
                                strokeWidth="8"
                              />
                              <motion.circle
                                cx="48" cy="48" r="40"
                                className="stroke-cyan-500 fill-none"
                                strokeWidth="8"
                                strokeDasharray={251.2}
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{ strokeDashoffset: 251.2 - (251.2 * results!.score) / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-black text-white">{results!.score}%</span>
                              <span className="text-[8px] font-bold text-cyan-400 uppercase">Match</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center space-y-4">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center w-32">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Accuracy</span>
                              <span className="text-[9px] font-bold text-white">{results!.accuracy}%</span>
                            </div>
                            <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-emerald-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${results!.accuracy}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center w-32">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Fluency</span>
                              <span className="text-[9px] font-bold text-white">{results!.fluency}%</span>
                            </div>
                            <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-amber-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${results!.fluency}%` }}
                                transition={{ duration: 1, delay: 0.7 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <PronunciationSourceBadge provider={results!.provider} />

                      {/* Word Breakdown */}
                      <div className="flex flex-wrap justify-center gap-2">
                        {results!.matches.map((m, i) => (
                          <div 
                            key={i}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
                              m.status === 'perfect' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              m.status === 'good' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                              'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}
                          >
                            {m.word}
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-xs text-slate-300 leading-relaxed italic">"{results!.feedback}"</p>
                      </div>

                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={reset}
                          className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all"
                        >
                          <RotateCcw size={14} /> Try Again
                        </button>
                        <button
                          onClick={() => {
                            const nextIndex = (DRILLS.indexOf(selectedDrill) + 1) % DRILLS.length;
                            setSelectedDrill(DRILLS[nextIndex]);
                            reset();
                          }}
                          className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                        >
                          Next Drill <ChevronRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Achievement / Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Star size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Drills Completed</p>
                  <p className="text-lg font-black text-white">12 / 50</p>
                </div>
              </div>
              <div className="glass rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Global Rank</p>
                  <p className="text-lg font-black text-white">#42</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
