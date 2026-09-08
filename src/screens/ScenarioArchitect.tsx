import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  MessageSquare
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { generateScenario } from '../services/api/apiClient';
import type { GeneratedScenario } from '../types';

const SUGGESTIONS = [
  "I'm at a futuristic space-bakery in Paris 2099 trying to buy 'moon-croissants'.",
  "I'm lost in the Louvre and need to ask a guard for directions to the Mona Lisa.",
  "I'm at a fancy French restaurant but I found a tiny robot in my soup.",
  "I need to interview a famous French fashion designer for my school project.",
  "I'm at a train station in Nice and I accidentally boarded a train to Italy."
];

export function ScenarioArchitect() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateScenario(description);
      setScenario(result);
    } catch (err) {
      console.error(err);
      setError('Failed to generate scenario. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStart = () => {
    if (!scenario) return;
    navigate('/scenario-architect/session', { state: { customScenario: scenario } });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/explore')}
            className="p-2 -ml-2 rounded-full hover:bg-white/5 text-ink-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 bg-violet-500/10 px-4 py-1.5 rounded-full border border-violet-500/20">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">AI Labs</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">Scenario Architect</h1>
          <p className="text-ink-muted max-w-xl">Describe any situation, and our AI will build a custom roleplay environment for you to practice.</p>
        </div>

        {!scenario ? (
          <div className="space-y-6">
            <Card variant="elevated" className="p-1 border-white/5 bg-slate-900/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Brain size={120} />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your scenario (e.g., I'm ordering a coffee but I've forgotten how to say 'milk'...)"
                className="w-full h-40 bg-transparent p-6 text-lg md:text-xl font-medium text-white placeholder:text-ink-subtle focus:outline-none resize-none"
              />
              <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
                <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest px-2">
                  {description.length} characters
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={!description.trim() || isGenerating}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    description.trim() && !isGenerating
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:scale-105 active:scale-95'
                      : 'bg-slate-800 text-ink-muted cursor-not-allowed'
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
                <span className="text-[10px] font-black text-ink-muted uppercase tracking-widest">Quick Prompts</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setDescription(s)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-ink-muted hover:text-white hover:bg-white/10 hover:border-white/10 transition-all text-left max-w-xs truncate"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

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
            <Card variant="elevated" className="p-8 border-violet-500/20 bg-violet-500/[0.02] space-y-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                      <MessageSquare size={16} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white italic tracking-tight">{scenario.title}</h2>
                  </div>
                  <p className="text-ink-muted leading-relaxed">{scenario.scenario}</p>
                </div>
                
                <div className="flex flex-col items-center p-6 rounded-2xl bg-white/5 border border-white/5 min-w-[200px]">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                    <User size={32} className="text-ink-muted" />
                  </div>
                  <span className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] mb-1">NPC Profile</span>
                  <p className="font-black text-white text-lg">{scenario.npc_name}</p>
                  <p className="text-[10px] text-center text-ink-muted mt-2 italic px-4 line-clamp-2">
                    {scenario.npc_personality}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-red-400" />
                    <span className="text-[10px] font-black text-ink-muted uppercase tracking-widest">Objectives</span>
                  </div>
                  <div className="space-y-2">
                    {scenario.objectives.map((obj, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-ink-muted">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-ink-muted">{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Book size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-ink-muted uppercase tracking-widest">Essential Vocabulary</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {scenario.key_vocab.map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all">
                        <span className="font-black text-white italic">{v.fr}</span>
                        <span className="text-xs font-medium text-ink-muted group-hover:text-emerald-400">{v.en}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleStart}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 transition-all uppercase italic tracking-widest group"
                >
                  <Play size={20} className="fill-white group-hover:scale-110 transition-transform" />
                  Start Interaction
                </button>
                <button
                  onClick={() => setScenario(null)}
                  className="px-8 py-4 bg-white/5 border border-white/10 text-ink-muted hover:text-white hover:bg-white/10 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest"
                >
                  Discard & Re-Architect
                </button>
              </div>
            </Card>

            <p className="text-center text-[10px] text-ink-subtle font-bold uppercase tracking-widest">
              Generated by Scenario Architect v1.0 • Gemini 2.0 Flash
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
