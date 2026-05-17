import { motion } from 'framer-motion';
import { Volume2, Moon, Bell, Globe, Database, Shield, ChevronRight, Zap, Trophy, Flame, TrendingUp, BookOpen, Palette, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLevelInfo } from '../domain/levels';
import { ACHIEVEMENTS } from '../data/gameData';
import { fadeUp } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { SettingToggle } from '../components/ui/SettingToggle';
import type { Theme } from '../types';

const THEMES: { id: Theme; name: string; color: string }[] = [
  { id: 'rose', name: 'Rose', color: 'bg-[#E11D48]' },
  { id: 'orange', name: 'Orange', color: 'bg-[#EA580C]' },
  { id: 'amber', name: 'Amber', color: 'bg-[#D97706]' },
  { id: 'lime', name: 'Lime', color: 'bg-[#65A30D]' },
  { id: 'green', name: 'Green', color: 'bg-[#059669]' },
  { id: 'cyan', name: 'Cyan', color: 'bg-[#0891B2]' },
  { id: 'sky', name: 'Sky', color: 'bg-[#0284C7]' },
  { id: 'blue', name: 'Blue', color: 'bg-[#2563EB]' },
  { id: 'purple', name: 'Purple', color: 'bg-[#7C3AED]' },
  { id: 'fuchsia', name: 'Fuchsia', color: 'bg-[#C026D3]' },
];

export function Profile() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const { current, progress } = getLevelInfo(profile.total_xp);
  const unlockedCount = state.achievements.filter(a => a.unlocked).length;

  return (
    <PageShell maxWidth="sm">
      {/* Profile Header */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl glass-elevated border-primary/12 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/4 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <motion.div
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-variant flex items-center justify-center text-xl font-black text-white shadow-[0_0_16px_rgba(var(--color-primary),0.3)]"
            whileHover={{ scale: 1.05 }}
          >
            {profile.username?.[0] ?? 'F'}
          </motion.div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white">{profile.username ?? 'French Learner'}</h2>
            <p className="text-xs text-slate-500">{current.icon} {current.level}</p>
            <div className="mt-2 h-1 bg-navy-300 rounded-full overflow-hidden w-44">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-variant shimmer-bar"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
              <Zap size={11} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{profile.total_xp.toLocaleString()}</span>
            </div>
            <p className="text-[9px] text-slate-700 mt-1">Total XP</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
        {[
          { icon: <Flame size={13} className="text-orange-400" />, value: profile.streak_days, label: 'Streak' },
          { icon: <BookOpen size={13} className="text-primary/60" />, value: profile.sessions_count, label: 'Sessions' },
          { icon: <TrendingUp size={13} className="text-emerald-400" />, value: '7.8', label: 'Avg' },
          { icon: <Trophy size={13} className="text-amber-400" />, value: unlockedCount, label: 'Unlocked' },
        ].map(s => (
          <div key={s.label} className="rounded-lg glass p-2.5 text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-base font-black text-white">{s.value}</p>
            <p className="text-[8px] text-slate-700">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Achievements */}
      <motion.div variants={fadeUp} className="rounded-xl glass p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm">Achievements</h3>
          <span className="text-[9px] text-slate-700">{unlockedCount}/{ACHIEVEMENTS.length}</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {state.achievements.slice(0, 12).map(achievement => (
            <motion.div
              key={achievement.id}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all ${achievement.unlocked ? 'hover:scale-110 cursor-pointer' : 'opacity-25'}`}
              whileTap={{ scale: 0.9 }}
            >
              <span className="text-lg">{achievement.unlocked ? achievement.icon : '🔒'}</span>
              <span className="text-[7px] text-slate-600 text-center leading-tight truncate w-full">{achievement.name.split(' ')[0]}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-2.5 h-1 bg-navy-300 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 shimmer-bar"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div variants={fadeUp} className="rounded-xl glass p-4">
        <h3 className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-2.5">Preferences</h3>
        <div className="space-y-0.5">
          <SettingToggle icon={<Volume2 size={14} />} label="Sound Effects" description="Play sounds for answers" enabled={state.soundEnabled} onToggle={() => dispatch({ type: 'TOGGLE_SOUND' })} />
          <SettingToggle icon={<Moon size={14} />} label="Dark Mode" description="Toggle dark or light theme" enabled={state.darkMode} onToggle={() => dispatch({ type: 'TOGGLE_DARK_MODE' })} />
          
          <div className="p-2.5">
            <div className="flex items-center gap-3 mb-3">
              <Palette size={14} className="text-slate-600" />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-white">Color Theme</p>
                <p className="text-[9px] text-slate-700">Personalize your interface</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-1">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => dispatch({ type: 'SET_THEME', theme: t.id })}
                  className={`relative w-8 h-8 rounded-full ${t.color} border-2 transition-all ${state.theme === t.id ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                  title={t.name}
                >
                  {state.theme === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <SettingToggle icon={<Bell size={14} />} label="Daily Reminders" description="Streak notifications" enabled={true} onToggle={() => {}} />
        </div>
      </motion.div>

      {/* AI Feedback Mode */}
      <motion.div variants={fadeUp} className="rounded-xl glass p-4">
        <h3 className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-2.5">AI Feedback</h3>
        <div className="space-y-1">
          {[
            { id: 'offline', label: 'Offline (Instant)', desc: 'Fast rule-based feedback', badge: 'Recommended' },
            { id: 'groq', label: 'Groq AI', desc: 'Enhanced LLM feedback', badge: null },
            { id: 'gemini', label: 'Gemini Flash', desc: 'Google AI feedback', badge: null },
          ].map(mode => (
            <label key={mode.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-white/[0.02] transition-colors group">
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${mode.id === 'offline' ? 'border-primary bg-primary' : 'border-slate-700 group-hover:border-slate-500'}`}>
                {mode.id === 'offline' && <div className="w-1 h-1 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-white">{mode.label}</span>
                  {mode.badge && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/15">{mode.badge}</span>}
                </div>
                <p className="text-[9px] text-slate-600 mt-0.5">{mode.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </motion.div>

      {/* Language */}
      <motion.div variants={fadeUp} className="rounded-xl glass p-4">
        <h3 className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-2.5">Language</h3>
        <div className="flex items-center gap-3 p-2.5 rounded-lg glass-subtle">
          <Globe size={14} className="text-primary/60" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-white">Speech Recognition</p>
            <p className="text-[9px] text-slate-600">French (fr-FR) — IGCSE standard</p>
          </div>
          <span className="text-[9px] text-slate-700 bg-navy-300 px-1.5 py-0.5 rounded">fr-FR</span>
        </div>
      </motion.div>

      {/* Data */}
      <motion.div variants={fadeUp} className="rounded-xl glass p-4">
        <h3 className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-2.5">Data & Privacy</h3>
        <div className="space-y-0.5">
          <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors text-left">
            <Database size={14} className="text-slate-600" />
            <div className="flex-1"><p className="text-[10px] font-semibold text-white">Export My Data</p><p className="text-[9px] text-slate-700">Download sessions and progress</p></div>
            <ChevronRight size={12} className="text-slate-700" />
          </button>
          <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors text-left">
            <Shield size={14} className="text-slate-600" />
            <div className="flex-1"><p className="text-[10px] font-semibold text-white">Privacy Policy</p><p className="text-[9px] text-slate-700">How we handle your data</p></div>
            <ChevronRight size={12} className="text-slate-700" />
          </button>
        </div>
      </motion.div>

      <p className="text-center text-[9px] text-slate-800 pb-4">FrenchCoach v3.0</p>
    </PageShell>
  );
}
