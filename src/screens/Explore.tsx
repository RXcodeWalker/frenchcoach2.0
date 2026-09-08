import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, Sparkles, LayoutGrid, GitBranch } from 'lucide-react';
import { FEATURES, CATEGORIES } from '../data/features';
import { ExploreSkillTree } from './explore/ExploreSkillTree';

export function Explore() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');

  const filtered = activeCategory === 'all' ? FEATURES : FEATURES.filter(f => f.category === activeCategory);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-violet-400" />
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Training Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Explore</h1>
            <p className="text-sm text-ink-muted mt-1">Discover all learning modes, AI tools, and challenges</p>
          </div>

          <div className="flex bg-navy-200 p-1 rounded-xl border border-white/5 self-start">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                viewMode === 'grid' ? 'bg-violet-electric/10 text-violet-400' : 'text-ink-muted hover:text-ink-muted'
              }`}
            >
              <LayoutGrid size={12} /> FEATURES
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                viewMode === 'tree' ? 'bg-violet-electric/10 text-violet-400' : 'text-ink-muted hover:text-ink-muted'
              }`}
            >
              <GitBranch size={12} /> SCENARIOS
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
                <motion.button
                  onClick={() => setActiveCategory('all')}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                    activeCategory === 'all' ? 'bg-violet-electric/10 text-violet-400 border border-violet-electric/20' : 'text-ink-subtle hover:text-white border border-white/[0.04]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  All
                </motion.button>
                {CATEGORIES.map(cat => (
                  <motion.button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                      activeCategory === cat ? 'bg-violet-electric/10 text-violet-400 border border-violet-electric/20' : 'text-ink-subtle hover:text-white border border-white/[0.04]'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>

              {CATEGORIES.filter(c => activeCategory === 'all' || c === activeCategory).map(category => {
                const categoryFeatures = filtered.filter(f => f.category === category);
                if (categoryFeatures.length === 0) return null;
                return (
                  <div key={category} className="space-y-2.5">
                    <h2 className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider">{category}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {categoryFeatures.map(feature => (
                        <motion.button
                          key={feature.id}
                          onClick={() => {
                            if (feature.screen && !feature.locked) {
                              const path = feature.screen === 'home' ? '/' : `/${feature.screen}`;
                              const search = feature.tab ? `?tab=${feature.tab}` : '';
                              navigate(path + search);
                            }
                          }}
                          className={`group relative overflow-hidden rounded-xl surface p-4 text-left transition-all duration-300 ${
                            feature.locked ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/10 cursor-pointer'
                          }`}
                          whileHover={feature.locked ? {} : { scale: 1.02, y: -2 }}
                          whileTap={feature.locked ? {} : { scale: 0.98 }}
                        >
                          {!feature.locked && (
                            <div
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              style={{ background: `radial-gradient(circle at top left, ${feature.color}08, transparent 70%)` }}
                            />
                          )}
                          <div className="relative">
                            <div className="flex items-start justify-between mb-2.5">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                                style={{
                                  background: feature.locked ? 'rgba(255,255,255,0.02)' : `linear-gradient(135deg, ${feature.color}15, ${feature.color}08)`,
                                  border: `1px solid ${feature.locked ? 'rgba(255,255,255,0.03)' : `${feature.color}18`}`,
                                  boxShadow: feature.locked ? 'none' : `0 0 8px ${feature.color}08`,
                                }}
                              >
                                {feature.locked ? <Lock size={14} className="text-ink-muted" /> : feature.icon}
                              </div>
                              {feature.badge && !feature.locked && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">{feature.badge}</span>
                              )}
                            </div>
                            <h3 className={`font-bold text-xs mb-0.5 ${feature.locked ? 'text-ink-muted' : 'text-white'}`}>{feature.title}</h3>
                            <p className={`text-[10px] leading-relaxed font-bold ${feature.locked ? 'text-ink-subtle' : 'text-ink-muted'}`}>{feature.description}</p>
                            {!feature.locked && (
                              <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold" style={{ color: feature.color }}>
                                <span>Open</span>
                                <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="tree"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ExploreSkillTree />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
