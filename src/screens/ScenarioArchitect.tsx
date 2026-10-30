import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Sparkles, User } from 'lucide-react';
import { generateScenario } from '../services/api/apiClient';
import { collapseRepeatedArticle } from '../features/roleplay/vocabDisplay';
import { enter, enterReduced } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import type { GeneratedScenario } from '../types';

const SUGGESTIONS = [
  "I'm at a futuristic space-bakery in Paris 2099 trying to buy 'moon-croissants'.",
  "I'm lost in the Louvre and need to ask a guard for directions to the Mona Lisa.",
  "I'm at a fancy French restaurant but I found a tiny robot in my soup.",
  "I need to interview a famous French fashion designer for my school project.",
  "I'm at a train station in Nice and I accidentally boarded a train to Italy.",
];

/** What the session sends back so "back" returns to the scenario just built. */
interface ArchitectLocationState {
  customScenario?: GeneratedScenario;
  description?: string;
}

/**
 * Scenario Architect (Design System v2): describe a situation, get a custom
 * role play (character, objectives, vocabulary), then start it. Coming back
 * from the session lands here with the scenario still on screen.
 */
export function ScenarioArchitect() {
  const navigate = useNavigate();
  const returned = (useLocation().state ?? {}) as ArchitectLocationState;
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;

  const [description, setDescription] = useState(returned.description ?? '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(returned.customScenario ?? null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    try {
      setScenario(await generateScenario(description));
    } catch (err) {
      console.error(err);
      setError('Failed to generate scenario. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStart = () => {
    if (!scenario) return;
    navigate('/scenario-architect/session', { state: { customScenario: scenario, description } });
  };

  return (
    <>
      <TopContextBar
        title="Scenario Architect"
        subtitle="Describe a situation and practise it"
        showBack
        onBack={() => navigate('/explore')}
        backLabel="Back to Explore"
      />
      <PageShell maxWidth="md" gap={24}>
        {!scenario ? (
          <>
            <motion.section variants={item} aria-labelledby="architect-describe" className="flex flex-col gap-3">
              <h2 id="architect-describe" className="text-section text-ink">What do you want to practise?</h2>
              <div className="rounded-card surface focus-within:border-action">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-labelledby="architect-describe"
                  placeholder="e.g. I'm ordering a coffee but I've forgotten how to say 'milk'…"
                  className="h-40 w-full resize-none bg-transparent p-4 text-body-base text-ink placeholder:text-ink-subtle focus:outline-none"
                />
                <div className="flex items-center justify-between gap-3 border-t border-hairline p-3">
                  <span className="font-numeral text-caption text-ink-subtle">{description.length} characters</span>
                  <Button onClick={handleGenerate} disabled={!description.trim()} loading={isGenerating}>
                    <Sparkles size={16} aria-hidden="true" /> Build scenario
                  </Button>
                </div>
              </div>
              {error && (
                <p role="alert" className="rounded-control bg-correction-soft px-4 py-3 text-body-s text-correction-text">{error}</p>
              )}
            </motion.section>

            <motion.section variants={item} aria-labelledby="architect-ideas" className="flex flex-col gap-3">
              <h2 id="architect-ideas" className="text-section text-ink">Or start from an idea</h2>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDescription(s)}
                    className="rounded-card surface p-4 text-left text-body-s text-ink transition-[background-color,border-color,transform] duration-state ease-smooth
                      hover:border-hairline-strong hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] active:scale-[.97]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.section>
          </>
        ) : (
          <>
            <motion.section variants={item} aria-labelledby="architect-title" className="flex flex-col gap-4 rounded-card surface p-5">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill border border-hairline bg-surface-recessed text-ink-muted">
                  <User size={22} strokeWidth={1.75} />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-eyebrow uppercase text-ink-subtle">Your scenario</p>
                  <h2 id="architect-title" className="text-title text-ink">{scenario.title}</h2>
                  <p className="text-caption text-ink-subtle">
                    <span className="font-semibold text-ink-muted">{scenario.npc_name}</span> · {scenario.npc_personality}
                  </p>
                </div>
              </div>
              <p className="text-body-base text-ink">{scenario.scenario}</p>
            </motion.section>

            <motion.section variants={item} aria-labelledby="architect-objectives" className="flex flex-col gap-3">
              <h2 id="architect-objectives" className="text-section text-ink">Objectives</h2>
              <ol className="flex flex-col gap-2">
                {scenario.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-card surface p-4 text-body-s text-ink">
                    <span aria-hidden="true" className="font-numeral flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-track text-caption text-ink-muted">{i + 1}</span>
                    {obj}
                  </li>
                ))}
              </ol>
            </motion.section>

            <motion.section variants={item} aria-labelledby="architect-vocab" className="flex flex-col gap-3">
              <h2 id="architect-vocab" className="text-section text-ink">Essential vocabulary</h2>
              <ul className="flex flex-col gap-2">
                {scenario.key_vocab.map((v, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 rounded-card surface p-4">
                    <span className="text-section text-ink">{collapseRepeatedArticle(v.fr)}</span>
                    <span className="text-body-s text-ink-muted">{v.en}</span>
                  </li>
                ))}
              </ul>
            </motion.section>

            <motion.div variants={item} className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button size="lg" onClick={handleStart} className="sm:flex-1">
                <Play size={18} aria-hidden="true" /> Start role play
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setScenario(null)}>Build a different one</Button>
            </motion.div>
          </>
        )}
      </PageShell>
    </>
  );
}
