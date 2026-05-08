import { Volume2, Moon, Bell, Globe, Database, Shield, ChevronRight, Zap, Trophy, Flame, TrendingUp, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLevelInfo, ACHIEVEMENTS } from '../data/gameData';

export function Profile() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const { current, progress } = getLevelInfo(profile.total_xp);
  const unlockedCount = state.achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
        {/* Profile Header */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 via-slate-900/90 to-slate-950 p-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-2xl font-black text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              {profile.username?.[0] ?? 'F'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-white">{profile.username ?? 'French Learner'}</h2>
              <p className="text-sm text-slate-400">{current.icon} {current.level}</p>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden w-48">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_6px_rgba(59,130,246,0.4)]" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Zap size={12} className="text-amber-400" />
                <span className="text-sm font-bold text-amber-400">{profile.total_xp.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-1">Total XP</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl border border-orange-500/15 bg-slate-900/60 p-3 text-center">
            <Flame size={14} className="text-orange-400 mx-auto mb-1" />
            <p className="text-lg font-black text-white">{profile.streak_days}</p>
            <p className="text-[9px] text-slate-500">Streak</p>
          </div>
          <div className="rounded-xl border border-blue-500/15 bg-slate-900/60 p-3 text-center">
            <BookOpen size={14} className="text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-black text-white">{profile.sessions_count}</p>
            <p className="text-[9px] text-slate-500">Sessions</p>
          </div>
          <div className="rounded-xl border border-emerald-500/15 bg-slate-900/60 p-3 text-center">
            <TrendingUp size={14} className="text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-black text-white">7.8</p>
            <p className="text-[9px] text-slate-500">Avg Score</p>
          </div>
          <div className="rounded-xl border border-amber-500/15 bg-slate-900/60 p-3 text-center">
            <Trophy size={14} className="text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-black text-white">{unlockedCount}</p>
            <p className="text-[9px] text-slate-500">Unlocked</p>
          </div>
        </div>

        {/* Achievements */}
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Achievements</h3>
            <span className="text-[10px] text-slate-500">{unlockedCount}/{ACHIEVEMENTS.length}</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {state.achievements.slice(0, 12).map(achievement => (
              <div key={achievement.id} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${achievement.unlocked ? 'hover:scale-110 cursor-pointer' : 'opacity-30'}`}>
                <span className="text-xl">{achievement.unlocked ? achievement.icon : '🔒'}</span>
                <span className="text-[8px] text-slate-500 text-center leading-tight truncate w-full">{achievement.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }} />
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5">
          <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Preferences</h3>
          <div className="space-y-0.5">
            <SettingToggle icon={<Volume2 size={16} />} label="Sound Effects" description="Play sounds for answers" enabled={state.soundEnabled} onToggle={() => dispatch({ type: 'TOGGLE_SOUND' })} />
            <SettingToggle icon={<Moon size={16} />} label="Dark Mode" description="Always on" enabled={true} onToggle={() => {}} disabled />
            <SettingToggle icon={<Bell size={16} />} label="Daily Reminders" description="Streak notifications" enabled={true} onToggle={() => {}} />
          </div>
        </div>

        {/* AI Feedback Mode */}
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5">
          <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">AI Feedback</h3>
          <div className="space-y-1.5">
            {[
              { id: 'offline', label: 'Offline (Instant)', desc: 'Fast rule-based feedback', badge: 'Recommended' },
              { id: 'groq', label: 'Groq AI', desc: 'Enhanced LLM feedback', badge: null },
              { id: 'gemini', label: 'Gemini Flash', desc: 'Google AI feedback', badge: null },
            ].map(mode => (
              <label key={mode.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors group">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${mode.id === 'offline' ? 'border-blue-500 bg-blue-500' : 'border-slate-600 group-hover:border-slate-500'}`}>
                  {mode.id === 'offline' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{mode.label}</span>
                    {mode.badge && <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">{mode.badge}</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{mode.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5">
          <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Language</h3>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30">
            <Globe size={16} className="text-blue-400" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-white">Speech Recognition</p>
              <p className="text-[10px] text-slate-500">French (fr-FR) — IGCSE standard</p>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">fr-FR</span>
          </div>
        </div>

        {/* Data */}
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-5">
          <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Data & Privacy</h3>
          <div className="space-y-0.5">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/40 transition-colors text-left">
              <Database size={16} className="text-slate-500" />
              <div className="flex-1"><p className="text-xs font-semibold text-white">Export My Data</p><p className="text-[10px] text-slate-500">Download sessions and progress</p></div>
              <ChevronRight size={14} className="text-slate-700" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/40 transition-colors text-left">
              <Shield size={16} className="text-slate-500" />
              <div className="flex-1"><p className="text-xs font-semibold text-white">Privacy Policy</p><p className="text-[10px] text-slate-500">How we handle your data</p></div>
              <ChevronRight size={14} className="text-slate-700" />
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-700 pb-4">FrenchCoach v3.0</p>
      </div>
    </div>
  );
}

function SettingToggle({ icon, label, description, enabled, onToggle, disabled }: { icon: React.ReactNode; label: string; description: string; enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${disabled ? 'opacity-40' : 'hover:bg-slate-800/40 cursor-pointer'}`} onClick={disabled ? undefined : onToggle}>
      <div className="text-slate-500">{icon}</div>
      <div className="flex-1"><p className="text-xs font-semibold text-white">{label}</p><p className="text-[10px] text-slate-500">{description}</p></div>
      <div className={`relative w-9 h-5 rounded-full transition-all duration-200 ${enabled ? 'bg-blue-500' : 'bg-slate-700'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-4.5 left-0.5' : 'left-0.5'}`} />
      </div>
    </div>
  );
}
