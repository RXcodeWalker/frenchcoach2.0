import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  Brain,
  Send,
  Loader2,
  Target,
  Book,
  User,
  Play,
  Lightbulb,
  MessageSquare,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { generateScenario } from '../services/api/apiClient';
import type { GeneratedScenario } from '../types';
import {
  DIFFICULTY_OPTIONS,
  GENERATION_STAGES,
  clearDraft,
  defaultDifficulty,
  hasSeenTutorial,
  loadDraft,
  loadFavorites,
  markTutorialSeen,
  persistDifficulty,
  removeFavorite,
  saveDraft,
  saveFavorite,
  type ArchitectDifficulty,
  type ArchitectSessionConfig,
  type FavoriteScenario,
} from '../features/scenarioArchitect';

const SUGGESTIONS = [
  "I'm at a futuristic space-bakery in Paris 2099 trying to buy 'moon-croissants'.",
  "I'm lost in the Louvre and need to ask a guard for directions to the Mona Lisa.",
  "I'm at a fancy French restaurant but I found a tiny robot in my soup.",
  'I need to interview a famous French fashion designer for my school project.',
  "I'm at a train station in Nice and I accidentally boarded a train to Italy.",
];

export function ScenarioArchitect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const draft = loadDraft();
  const [description, setDescription] = useState(draft?.description ?? '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(draft?.scenario ?? null);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<ArchitectDifficulty>(
    draft?.difficulty ?? defaultDifficulty()
  );
  const [favorites, setFavorites] = useState<FavoriteScenario[]>(() => loadFavorites());
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenTutorial());
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get('prompt');
    if (prefill) setDescription(prefill);
  }, [searchParams]);

  useEffect(() => {
    if (!isGenerating) return;
    setStageIndex(0);
    const id = window.setInterval(() => {
      setStageIndex(i => Math.min(i + 1, GENERATION_STAGES.length - 1));
    }, 900);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  useEffect(() => {
    saveDraft({ description, scenario, difficulty });
  }, [description, scenario, difficulty]);

  const handleGenerate = async (overrideDescription?: string) => {
    const text = (overrideDescription ?? description).trim();
    if (!text || isGenerating) return;

    setDescription(text);
    setIsGenerating(true);
    setError(null);
    setUsedFallback(false);
    try {
      const result = await generateScenario(text);
      setScenario(result);
      // Offline Camille stub is usually titled around cafe/Camille — soft signal only
      if (/camille/i.test(result.npc_name) && /café|cafe/i.test(result.title + result.scenario)) {
        setUsedFallback(true);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate scenario. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStart = (skipBriefing = false) => {
    if (!scenario) return;
    persistDifficulty(difficulty);
    const state: ArchitectSessionConfig = {
      customScenario: scenario,
      description,
      difficulty,
      skipBriefing,
    };
    navigate('/scenario-architect/session', { state });
  };

  const handleDiscard = () => {
    setScenario(null);
    setUsedFallback(false);
    saveDraft({ description, scenario: null, difficulty });
  };

  const handleNewScenario = () => {
    clearDraft();
    setScenario(null);
    setDescription('');
    setUsedFallback(false);
    setError(null);
  };

  const handleFavorite = () => {
    if (!scenario) return;
    setFavorites(saveFavorite(description, scenario));
  };

  const handleLoadFavorite = (fav: FavoriteScenario) => {
    setDescription(fav.description);
    setScenario(fav.scenario);
    setUsedFallback(false);
  };

  const isFavorited = scenario
    ? favorites.some(f => f.scenario.title === scenario.title)
    : false;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/explore')}
            className="p-2 -ml-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors"
            aria-label="Back to Explore"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 bg-violet-500/10 px-4 py-1.5 rounded-full border border-violet-500/20">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
              AI Labs
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">
            Scenario Architect
          </h1>
          <p className="text-slate-500 max-w-xl">
            Describe any situation, and our AI will build a custom roleplay mission for you to
            practice.
          </p>
        </div>

        <AnimatePresence>
          {showTutorial && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="relative p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20"
            >
              <button
                onClick={() => {
                  markTutorialSeen();
                  setShowTutorial(false);
                }}
                className="absolute top-3 right-3 text-slate-500 hover:text-white"
                aria-label="Dismiss tutorial"
              >
                <X size={14} />
              </button>
              <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2">
                How it works
              </p>
              <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                <li>Describe a scene (or tap a quick prompt)</li>
                <li>Check objectives & vocab on the preview</li>
                <li>Speak in French until the mission checks fill</li>
              </ol>
            </motion.div>
          )}
        </AnimatePresence>

        {!scenario ? (
          <div className="space-y-6">
            <Card
              variant="elevated"
              className="p-1 border-white/5 bg-slate-900/40 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Brain size={120} />
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your scenario (e.g., I'm ordering a coffee but I've forgotten how to say 'milk'...)"
                className="w-full h-40 bg-transparent p-6 text-lg md:text-xl font-medium text-white placeholder:text-slate-700 focus:outline-none resize-none"
              />
              <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02] gap-3 flex-wrap">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2">
                  {isGenerating
                    ? GENERATION_STAGES[stageIndex]
                    : `${description.length} characters`}
                </span>
                <button
                  onClick={() => handleGenerate()}
                  disabled={!description.trim() || isGenerating}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    description.trim() && !isGenerating
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:scale-105 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Architecting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Generate Scenario
                    </>
                  )}
                </button>
              </div>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Lightbulb size={12} className="text-amber-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Quick Prompts
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setDescription(s)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all text-left max-w-xs truncate"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {favorites.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Star size={12} className="text-amber-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    My Scenes
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favorites.map(fav => (
                    <div
                      key={fav.id}
                      className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/5 pl-3 pr-1 py-1"
                    >
                      <button
                        onClick={() => handleLoadFavorite(fav)}
                        className="text-xs text-slate-300 hover:text-white truncate max-w-[160px]"
                      >
                        {fav.scenario.title}
                      </button>
                      <button
                        onClick={() => setFavorites(removeFavorite(fav.id))}
                        className="p-1.5 text-slate-600 hover:text-red-400"
                        aria-label="Remove favorite"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium"
              >
                {error}
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card
              variant="elevated"
              className="p-8 border-violet-500/20 bg-violet-500/[0.02] space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                      <MessageSquare size={16} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white italic tracking-tight">
                      {scenario.title}
                    </h2>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{scenario.scenario}</p>
                  {usedFallback && (
                    <p className="text-xs text-amber-400/90 font-medium">
                      Offline fallback scene — reconnect for a fully custom build.
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center p-6 rounded-2xl bg-white/5 border border-white/5 min-w-[200px]">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                    <User size={32} className="text-slate-400" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                    NPC Profile
                  </span>
                  <p className="font-black text-white text-lg">{scenario.npc_name}</p>
                  <p className="text-[10px] text-center text-slate-500 mt-2 italic px-4 line-clamp-2">
                    {scenario.npc_personality}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Difficulty
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setDifficulty(opt.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        difficulty === opt.id
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-white/5 bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <p className="text-xs font-black text-white uppercase tracking-wider">
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">{opt.blurb}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-red-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Objectives
                    </span>
                  </div>
                  <div className="space-y-2">
                    {scenario.objectives.map((obj, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                      >
                        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-300">{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Book size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Essential Vocabulary
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {scenario.key_vocab.map((v, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all"
                      >
                        <span className="font-black text-white italic">{v.fr}</span>
                        <span className="text-xs font-medium text-slate-500 group-hover:text-emerald-400">
                          {v.en}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleStart(false)}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 transition-all uppercase italic tracking-widest group"
                >
                  <Play size={20} className="fill-white group-hover:scale-110 transition-transform" />
                  Start Mission
                </button>
                <button
                  onClick={handleFavorite}
                  disabled={isFavorited}
                  className="px-5 py-4 bg-white/5 border border-white/10 text-slate-300 hover:text-amber-300 hover:border-amber-400/30 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest disabled:opacity-40"
                >
                  <span className="inline-flex items-center gap-2">
                    <Star size={14} className={isFavorited ? 'fill-amber-400 text-amber-400' : ''} />
                    {isFavorited ? 'Saved' : 'Save'}
                  </span>
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-5 py-4 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest"
                >
                  Re-Architect
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleGenerate(`${description} Make it funnier.`)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider"
                >
                  Twist: funnier
                </button>
                <button
                  onClick={() => handleGenerate(`${description} Make the tone more formal.`)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider"
                >
                  Twist: formal
                </button>
                <button
                  onClick={handleNewScenario}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider"
                >
                  Fresh prompt
                </button>
              </div>
            </Card>

            <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              Scenario Architect · AI-generated roleplay
              {usedFallback ? ' · offline fallback' : ''}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
