import { Volume2, VolumeX, Moon, Globe, Bell, Database, Shield, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function Settings() {
  const { state, dispatch } = useApp();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Settings</h2>
        <p className="text-slate-400 mt-1">Customize your learning experience</p>
      </div>

      {/* Account */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-slate-400">Account</h3>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xl font-black text-white">
            {state.profile.username?.[0] ?? 'F'}
          </div>
          <div>
            <p className="font-semibold text-white">{state.profile.username ?? 'French Learner'}</p>
            <p className="text-sm text-slate-400">{state.profile.current_level} • {state.profile.total_xp} XP</p>
          </div>
          <button className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Edit <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-slate-400">Preferences</h3>
        <div className="space-y-1">
          <SettingToggle
            icon={<Volume2 size={18} />}
            label="Sound Effects"
            description="Play sounds for correct/incorrect answers"
            enabled={state.soundEnabled}
            onToggle={() => dispatch({ type: 'TOGGLE_SOUND' })}
          />
          <SettingToggle
            icon={<Moon size={18} />}
            label="Dark Mode"
            description="Always on — optimized for focus"
            enabled={true}
            onToggle={() => {}}
            disabled
          />
          <SettingToggle
            icon={<Bell size={18} />}
            label="Daily Reminders"
            description="Get reminders to maintain your streak"
            enabled={true}
            onToggle={() => {}}
          />
        </div>
      </div>

      {/* AI Feedback Mode */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-slate-400">AI Feedback</h3>
        <div className="space-y-2">
          {[
            { id: 'offline', label: 'Offline (Instant)', desc: 'Fast rule-based feedback, no internet needed', badge: 'Recommended' },
            { id: 'groq', label: 'Groq AI', desc: 'Enhanced feedback via Groq LLM (requires API key)', badge: null },
            { id: 'gemini', label: 'Gemini Flash', desc: 'Google AI feedback (free tier available)', badge: null },
          ].map(mode => (
            <label key={mode.id} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors group">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                mode.id === 'offline' ? 'border-blue-500 bg-blue-500' : 'border-slate-600 group-hover:border-slate-500'
              }`}>
                {mode.id === 'offline' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{mode.label}</span>
                  {mode.badge && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">{mode.badge}</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{mode.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-slate-400">Language</h3>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40">
          <Globe size={18} className="text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Speech Recognition</p>
            <p className="text-xs text-slate-400">French (fr-FR) — IGCSE standard</p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">fr-FR</span>
        </div>
      </div>

      {/* Data */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-slate-400">Data & Privacy</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800/40 transition-colors text-left">
            <Database size={18} className="text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Export My Data</p>
              <p className="text-xs text-slate-400">Download all your sessions and progress</p>
            </div>
            <ChevronRight size={16} className="text-slate-600" />
          </button>
          <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800/40 transition-colors text-left">
            <Shield size={18} className="text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Privacy Policy</p>
              <p className="text-xs text-slate-400">How we handle your data</p>
            </div>
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-600">French Coach v2.0 • Built for IGCSE Excellence</p>
    </div>
  );
}

function SettingToggle({
  icon, label, description, enabled, onToggle, disabled
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${disabled ? 'opacity-50' : 'hover:bg-slate-800/40 cursor-pointer'}`} onClick={disabled ? undefined : onToggle}>
      <div className="text-slate-400">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <div
        className={`relative w-11 h-6 rounded-full transition-all duration-200 ${enabled ? 'bg-blue-500' : 'bg-slate-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </div>
  );
}
