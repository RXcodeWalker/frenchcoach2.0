import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Moon, Bell, Globe, Database, Shield, ChevronRight, Zap, Trophy, Flame, TrendingUp, BookOpen, LogOut, Target, SlidersHorizontal, AtSign, Loader2, Check, UserX, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getLevelInfo } from '../domain/levels';
import { ACHIEVEMENTS } from '../data/gameData';
import { fadeUp } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { SettingToggle } from '../components/ui/SettingToggle';
import { useGuestMode } from '../hooks/useGuestMode';
import { renameUsername, isValidUsername } from '../services/social/usernameService';
import {
  getPrivacySettings, setDiscoverable, setLeaderboardVisibility, setFriendRequestsFrom,
  type PrivacySettings, type LeaderboardVisibility,
} from '../services/social/privacyService';
import { listBlockedUsers, unblockUser, type BlockedUserEntry } from '../services/social/blockService';
import { CosmeticPreview } from '../components/ui/CosmeticPreview';
import { useCatalogue } from '../services/shop/useCatalogue';
import { rarityOf, RARITY_COLOR } from '../services/shop/rarity';

const RENAME_REASON_COPY: Record<string, string> = {
  invalid_format: 'Start with a letter, 3–20 characters, letters/numbers/underscore only.',
  reserved_client_side: 'That name is reserved. Try another.',
  already_set: 'You already have a username.',
  taken: 'That username is already taken.',
  throttled: 'You can only change your username once every 30 days.',
  offline: 'You need to be signed in to rename your username.',
  unknown: 'Something went wrong. Try again.',
};

export function Profile() {
  const { state, dispatch } = useApp();
  const { user, signOut, isAdmin } = useAuth();
  const { isGuest, exitGuestMode } = useGuestMode();
  const navigate = useNavigate();
  const { profile } = state;
  const { current, progress } = getLevelInfo(profile.total_xp);
  const catalogue = useCatalogue();
  const equippedNameplateItem = profile.equipped.nameplate
    ? catalogue.find(i => i.id === profile.equipped.nameplate)
    : undefined;
  const nameplateColor = equippedNameplateItem ? RARITY_COLOR[rarityOf(equippedNameplateItem)] : undefined;
  const unlockedCount = state.achievements.filter(a => a.unlocked).length;

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserEntry[]>([]);
  const [showBlockedList, setShowBlockedList] = useState(false);

  useEffect(() => {
    if (!profile.id) return;
    void getPrivacySettings(profile.id).then(setPrivacy);
  }, [profile.id]);

  useEffect(() => {
    if (showBlockedList) void listBlockedUsers().then(setBlockedUsers);
  }, [showBlockedList]);

  async function handleUnblock(userId: string) {
    const result = await unblockUser(userId);
    if (result.ok) setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUsername(renameValue) || renameSubmitting) return;
    setRenameSubmitting(true);
    setRenameError(null);
    const result = await renameUsername(renameValue);
    setRenameSubmitting(false);
    if (result.ok) {
      dispatch({ type: 'SET_PROFILE', profile: { ...state.profile, username: renameValue } });
      setRenaming(false);
      setRenameValue('');
    } else {
      setRenameError(RENAME_REASON_COPY[result.reason]);
    }
  }

  return (
    <PageShell maxWidth="sm">
      {/* Profile Header */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl surface-raised border-violet-electric/12 p-6">
        <div className="relative flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }}>
            <CosmeticPreview
              avatarEmoji={profile.equipped.avatar}
              frameItemId={profile.equipped.frame}
              nameplateItemId={null}
              catalogue={catalogue}
              size={56}
            />
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white" style={nameplateColor ? { color: nameplateColor } : undefined}>
                {profile.username ?? user?.email ?? 'French Learner'}
              </h2>
              {isGuest && (
                <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/15">Guest</span>
              )}
            </div>
            <p className="text-xs text-ink-muted">{current.icon} {current.level}</p>
            {isGuest && (
              <p className="text-[9px] text-amber-400/80 mt-0.5">Your progress is saved on this device only</p>
            )}
            <div className="mt-2 h-1 bg-navy-300 rounded-full overflow-hidden w-44">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-electric to-indigo-400"
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
            <p className="text-[9px] text-ink-subtle mt-1">Total XP</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
        {[
          { icon: <Flame size={13} className="text-orange-400" />, value: profile.streak_days, label: 'Streak' },
          { icon: <BookOpen size={13} className="text-violet-400" />, value: profile.sessions_count, label: 'Sessions' },
          { icon: <TrendingUp size={13} className="text-emerald-400" />, value: '7.8', label: 'Avg' },
          { icon: <Trophy size={13} className="text-amber-400" />, value: unlockedCount, label: 'Unlocked' },
        ].map(s => (
          <div key={s.label} className="rounded-lg surface p-2.5 text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-base font-black text-white">{s.value}</p>
            <p className="text-[8px] text-ink-subtle">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Achievements */}
      <motion.div variants={fadeUp} className="rounded-xl surface p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm">Achievements</h3>
          <span className="text-[9px] text-ink-subtle">{unlockedCount}/{ACHIEVEMENTS.length}</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {state.achievements.slice(0, 12).map(achievement => (
            <motion.div
              key={achievement.id}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all ${achievement.unlocked ? 'hover:scale-110 cursor-pointer' : 'opacity-25'}`}
              whileTap={{ scale: 0.9 }}
            >
              <span className="text-lg">{achievement.unlocked ? achievement.icon : '🔒'}</span>
              <span className="text-[7px] text-ink-subtle text-center leading-tight truncate w-full">{achievement.name.split(' ')[0]}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-2.5 h-1 bg-navy-300 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </motion.div>

      {/* Username */}
      <motion.div variants={fadeUp} className="rounded-xl surface p-4">
        <h3 className="font-bold text-ink-subtle text-[10px] uppercase tracking-wider mb-2.5">Username</h3>
        {renaming ? (
          <form onSubmit={handleRename} className="space-y-2.5">
            <input
              autoFocus
              value={renameValue}
              onChange={e => { setRenameValue(e.target.value); setRenameError(null); }}
              placeholder={profile.username ?? 'marie_92'}
              maxLength={20}
              className="w-full bg-navy-300/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-ink-subtle focus:outline-none focus:border-violet-electric/50 transition-colors"
            />
            {renameError && <p className="text-[10px] text-rose-400">{renameError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!isValidUsername(renameValue) || renameSubmitting}
                className="flex-1 py-2 rounded-lg bg-violet-electric text-white text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {renameSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save
              </button>
              <button
                type="button"
                onClick={() => { setRenaming(false); setRenameError(null); setRenameValue(''); }}
                className="px-3 py-2 rounded-lg text-[10px] font-semibold text-ink-muted hover:text-ink-muted transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-[9px] text-ink-subtle">Usernames can be changed once every 30 days.</p>
          </form>
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors text-left"
          >
            <AtSign size={14} className="text-violet-400" />
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-white">{profile.username ?? 'Claim a username'}</p>
              <p className="text-[9px] text-ink-subtle">{profile.username ? 'Change your username' : 'Pick a name others will see on the leaderboard'}</p>
            </div>
            <ChevronRight size={12} className="text-ink-subtle" />
          </button>
        )}
      </motion.div>

      {/* Social Privacy */}
      {privacy && (
        <motion.div variants={fadeUp} className="rounded-xl surface p-4">
          <h3 className="font-bold text-ink-subtle text-[10px] uppercase tracking-wider mb-2.5">Social Privacy</h3>
          <div className="space-y-0.5">
            <SettingToggle
              icon={<Globe size={14} />}
              label="Discoverable"
              description="Let others find you by username search"
              enabled={privacy.discoverable}
              onToggle={() => {
                const next = !privacy.discoverable;
                setPrivacy({ ...privacy, discoverable: next });
                void setDiscoverable(profile.id, next);
              }}
            />
            <SettingToggle
              icon={<Users size={14} />}
              label="Accept Friend Requests"
              description="Allow other learners to send you requests"
              enabled={privacy.friendRequestsFrom === 'anyone'}
              onToggle={() => {
                const next = privacy.friendRequestsFrom === 'anyone' ? 'nobody' : 'anyone';
                setPrivacy({ ...privacy, friendRequestsFrom: next });
                void setFriendRequestsFrom(profile.id, next);
              }}
            />
            <div className="p-2.5">
              <p className="text-[10px] font-semibold text-white mb-2">Leaderboard visibility</p>
              <div className="flex p-1 bg-navy-300/30 rounded-lg">
                {(['global', 'friends', 'hidden'] as LeaderboardVisibility[]).map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      setPrivacy({ ...privacy, leaderboardVisibility: v });
                      void setLeaderboardVisibility(profile.id, v);
                    }}
                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold capitalize transition-all ${
                      privacy.leaderboardVisibility === v
                        ? 'bg-white/10 text-white'
                        : 'text-ink-subtle hover:text-ink-muted'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Learning Goals */}
      <motion.div variants={fadeUp} className="rounded-xl surface p-4">
        <h3 className="font-bold text-ink-subtle text-[10px] uppercase tracking-wider mb-2.5">Learning Goals</h3>
        <button
          onClick={() => navigate('/onboarding?from=profile')}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors text-left"
        >
          <Target size={14} className="text-violet-400" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-white">Update learning goals</p>
            <p className="text-[9px] text-ink-subtle">Change exam board, target date, or goal type</p>
          </div>
          <ChevronRight size={12} className="text-ink-subtle" />
        </button>
      </motion.div>

      {/* Preferences */}
      <motion.div variants={fadeUp} className="rounded-xl surface p-4">
        <h3 className="font-bold text-ink-subtle text-[10px] uppercase tracking-wider mb-2.5">Preferences</h3>
        <div className="space-y-0.5">
          <SettingToggle icon={<Volume2 size={14} />} label="Sound Effects" description="Play sounds for answers" enabled={state.soundEnabled} onToggle={() => dispatch({ type: 'TOGGLE_SOUND' })} />
          <SettingToggle icon={<Moon size={14} />} label="Dark Mode" description="Toggle dark or light theme" enabled={state.darkMode} onToggle={() => dispatch({ type: 'TOGGLE_DARK_MODE' })} />
          <SettingToggle icon={<Bell size={14} />} label="Daily Reminders" description="Streak notifications" enabled={true} onToggle={() => {}} />
        </div>
      </motion.div>

      {/* AI Feedback Mode */}
      <motion.div variants={fadeUp} className="rounded-xl surface p-4">
        <h3 className="font-bold text-ink-subtle text-[10px] uppercase tracking-wider mb-2.5">AI Feedback</h3>
        <div className="space-y-1">
          {[
            { id: 'offline', label: 'Offline (Instant)', desc: 'Fast rule-based feedback', badge: 'Recommended' },
            { id: 'groq', label: 'Groq AI', desc: 'Enhanced LLM feedback', badge: null },
            { id: 'gemini', label: 'Gemini Flash', desc: 'Google AI feedback', badge: null },
          ].map(mode => (
            <label key={mode.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-white/[0.02] transition-colors group">
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${mode.id === 'offline' ? 'border-violet-electric bg-violet-electric' : 'border-slate-700 group-hover:border-slate-500'}`}>
                {mode.id === 'offline' && <div className="w-1 h-1 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-white">{mode.label}</span>
                  {mode.badge && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/15">{mode.badge}</span>}
                </div>
                <p className="text-[9px] text-ink-subtle mt-0.5">{mode.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </motion.div>

      {/* Language */}
      <motion.div variants={fadeUp} className="rounded-xl surface p-4">
        <h3 className="font-bold text-ink-subtle text-[10px] uppercase tracking-wider mb-2.5">Language</h3>
        <div className="flex items-center gap-3 p-2.5 rounded-lg surface-recessed">
          <Globe size={14} className="text-violet-400" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-white">Speech Recognition</p>
            <p className="text-[9px] text-ink-subtle">French (fr-FR) — IGCSE standard</p>
          </div>
          <span className="text-[9px] text-ink-subtle bg-navy-300 px-1.5 py-0.5 rounded">fr-FR</span>
        </div>
      </motion.div>

      {/* Data */}
      <motion.div variants={fadeUp} className="rounded-xl surface p-4">
        <h3 className="font-bold text-ink-subtle text-[10px] uppercase tracking-wider mb-2.5">Data & Privacy</h3>
        <div className="space-y-0.5">
          <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors text-left">
            <Database size={14} className="text-ink-subtle" />
            <div className="flex-1"><p className="text-[10px] font-semibold text-white">Export My Data</p><p className="text-[9px] text-ink-subtle">Download sessions and progress</p></div>
            <ChevronRight size={12} className="text-ink-subtle" />
          </button>
          <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors text-left">
            <Shield size={14} className="text-ink-subtle" />
            <div className="flex-1"><p className="text-[10px] font-semibold text-white">Privacy Policy</p><p className="text-[9px] text-ink-subtle">How we handle your data</p></div>
            <ChevronRight size={12} className="text-ink-subtle" />
          </button>
          <button
            onClick={() => setShowBlockedList(v => !v)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors text-left"
          >
            <UserX size={14} className="text-ink-subtle" />
            <div className="flex-1"><p className="text-[10px] font-semibold text-white">Blocked Users</p><p className="text-[9px] text-ink-subtle">{blockedUsers.length > 0 ? `${blockedUsers.length} blocked` : 'Manage blocked learners'}</p></div>
            <ChevronRight size={12} className={`text-ink-subtle transition-transform ${showBlockedList ? 'rotate-90' : ''}`} />
          </button>
          {showBlockedList && (
            <div className="pl-2.5 space-y-1 pb-1">
              {blockedUsers.length === 0 ? (
                <p className="text-[9px] text-ink-subtle py-2">No blocked users.</p>
              ) : (
                blockedUsers.map(u => (
                  <div key={u.userId} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02]">
                    <span className="text-sm">{u.avatar ?? '👤'}</span>
                    <p className="flex-1 text-[10px] text-ink-muted">{u.username}</p>
                    <button
                      onClick={() => handleUnblock(u.userId)}
                      className="text-[9px] font-bold text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-violet-500/[0.06] transition-colors text-left group"
            >
              <SlidersHorizontal size={14} className="text-violet-400/70 group-hover:text-violet-400 transition-colors" />
              <div className="flex-1"><p className="text-[10px] font-semibold text-violet-300">Content Admin</p><p className="text-[9px] text-ink-subtle">Manage questions & scenarios</p></div>
              <ChevronRight size={12} className="text-ink-subtle" />
            </button>
          )}
          {isGuest && (
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-violet-500/[0.06] transition-colors text-left group"
            >
              <LogOut size={14} className="text-violet-400/70 group-hover:text-violet-400 transition-colors rotate-180" />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-violet-300">Log In / Create Account</p>
                <p className="text-[9px] text-ink-subtle">Creating a new account backs up this device's data. Logging into an existing account may not preserve it.</p>
              </div>
              <ChevronRight size={12} className="text-ink-subtle" />
            </button>
          )}
          <button
            onClick={() => {
              if (isGuest) {
                exitGuestMode();
                navigate('/', { replace: true });
              } else {
                exitGuestMode();
                signOut();
              }
            }}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-500/[0.06] transition-colors text-left group"
          >
            <LogOut size={14} className="text-red-400/70 group-hover:text-red-400 transition-colors" />
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-red-400/80 group-hover:text-red-400 transition-colors">{isGuest ? 'Exit Guest Mode' : 'Sign Out'}</p>
              <p className="text-[9px] text-ink-subtle">{isGuest ? 'Clears local guest session' : 'Your local progress is preserved'}</p>
            </div>
          </button>
        </div>
      </motion.div>

      <p className="text-center text-[9px] text-slate-800 pb-4">FrenchCoach v3.0</p>
    </PageShell>
  );
}
