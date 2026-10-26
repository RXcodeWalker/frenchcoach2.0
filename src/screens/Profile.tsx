import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  AtSign, Bell, BellRing, Check, ChevronDown, ChevronRight, ChevronUp, Copy, Download, Flame, Globe, Loader2, LogIn, LogOut,
  Mic, Minus, Moon, Plus, Shield, ShieldCheck, SlidersHorizontal, Trash2, TrendingUp, UserX, Users, Volume2, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { getSessionHistory, getStats } from '../services/analytics/analyticsService';
import { track } from '../services/telemetry/telemetryService';
import { useApp, DAILY_GOAL_MIN, DAILY_GOAL_MAX } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { levelProgress } from '../services/progression/progressionService';
import { ACHIEVEMENT_DEFINITIONS } from '../data/gameData';
import { enter, fadeUp, fill, slide } from '../components/motion/variants';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { SettingGroup, SettingRow, SettingToggle, Toggle } from '../components/ui/SettingToggle';
import { UserAvatar } from '../components/ui/UserAvatar';
import { CountUp } from '../components/motion/CountUp';
import { useGuestMode } from '../hooks/useGuestMode';
import { renameUsername, isValidUsername } from '../services/social/usernameService';
import {
  getPrivacySettings, setDiscoverable, setLeaderboardVisibility, setFriendRequestsFrom,
  type PrivacySettings, type LeaderboardVisibility,
} from '../services/social/privacyService';
import { listBlockedUsers, unblockUser, type BlockedUserEntry } from '../services/social/blockService';
import { useCatalogue } from '../services/shop/useCatalogue';
import { rarityOf, RARITY_COLOR } from '../services/shop/rarity';
import { exportMyData, deleteMyAccount, AccountError } from '../services/account/accountService';
import {
  correctAgeBand, requestGuardianConsent, sendGuardianConsentEmail, buildGuardianConsentLink, ConsentError,
} from '../services/account/consentService';
import {
  getNotifyStreakPreference, setNotifyStreakPreference,
  getNotifyDailyGoalPreference, setNotifyDailyGoalPreference,
} from '../services/notifications/notificationPreferences';
import { requestAndSubscribe, unsubscribe, isPushSupported } from '../services/notifications/pushService';
import { pushProfileSettingsToCloud } from '../services/sync/profileSettingsSync';
import { getActiveGoal, getCoachProfile, daysUntilExam } from '../services/coach/coachProfileService';
import { achievementTiles, type AchievementCounts } from '../features/profile/achievementDisplay';
import { TrackSwitch } from '../features/junior/TrackSwitch';
import { CORE_ONLY, JUNIOR_TRACK_SELECTABLE } from '../config/launchScope';
import { ReplayTourButton } from '../features/tour/ReplayTourButton';
import type { AIEngine } from '../types';

const RENAME_REASON_COPY: Record<string, string> = {
  invalid_format: 'Start with a letter, 3–20 characters, letters/numbers/underscore only.',
  reserved_client_side: 'That name is reserved. Try another.',
  already_set: 'You already have a username.',
  taken: 'That username is already taken.',
  throttled: 'You can only change your username once every 30 days.',
  offline: 'You need to be signed in to rename your username.',
  unknown: 'Something went wrong. Try again.',
};

const ACHIEVEMENTS_COLLAPSED = 8;

const AI_ENGINES: { id: AIEngine; label: string; desc: string }[] = [
  { id: 'offline', label: 'Offline · instant', desc: 'Fast rule-based feedback, works without a connection' },
  { id: 'groq', label: 'Groq AI', desc: 'Richer explanations from a language model' },
  { id: 'gemini', label: 'Gemini Flash', desc: 'Google’s model, similar depth to Groq' },
];

const EXAM_BOARD_LABEL: Record<string, string> = {
  igcse: 'Cambridge IGCSE French · 0520',
  gcse: 'GCSE French',
  delf: 'DELF / DALF',
};

const INPUT = 'h-11 min-w-0 rounded-control border border-hairline-strong bg-surface px-3 text-[15px] font-normal text-ink placeholder:text-ink-subtle '
  + 'transition-[border-color,box-shadow] duration-state ease-smooth focus:border-focus focus:shadow-[0_0_0_3px_var(--action-soft)] focus:outline-none';

/**
 * Profile (Design System v2, frame 3b): identity, stats, achievements and
 * learning goals on the left; grouped settings on the right. Every existing
 * behaviour is kept — rename, privacy, age band and guardian flow,
 * notifications, export, delete, admin, guest mode.
 */
export function Profile() {
  const { state, dispatch } = useApp();
  useEffect(() => {
    track({ name: 'profile_viewed', props: {} });
  }, []);
  const stats = useMemo(() => getStats(), []);
  const examsCompleted = useMemo(() => getSessionHistory().filter(s => s.mode === 'exam').length, []);
  const coachProfile = useMemo(() => getCoachProfile(), []);
  const { user, signOut, isAdmin, ageBand, consentStatus, refreshConsentStatus } = useAuth();
  const { isGuest, exitGuestMode } = useGuestMode();
  const navigate = useNavigate();
  const { profile } = state;
  const level = levelProgress(profile.total_xp);
  const catalogue = useCatalogue();
  const equippedNameplateItem = profile.equipped.nameplate
    ? catalogue.find(i => i.id === profile.equipped.nameplate)
    : undefined;
  const nameplateColor = equippedNameplateItem ? RARITY_COLOR[rarityOf(equippedNameplateItem)] : undefined;

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserEntry[]>([]);
  const [showBlockedList, setShowBlockedList] = useState(false);

  const [notifyStreak, setNotifyStreakState] = useState(getNotifyStreakPreference);
  const [notifyDailyGoal, setNotifyDailyGoalState] = useState(getNotifyDailyGoalPreference);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(
    typeof Notification !== 'undefined' ? Notification.permission : null,
  );

  async function handleToggleNotifyPreference(kind: 'streak' | 'dailyGoal') {
    if (!user) return;
    const wasOn = kind === 'streak' ? notifyStreak : notifyDailyGoal;
    let nextStreak = notifyStreak;
    let nextDailyGoal = notifyDailyGoal;

    if (wasOn) {
      // Turning off never revokes actual browser permission — it only
      // clears the preference (and the subscription row, once both
      // preferences are off).
      if (kind === 'streak') nextStreak = false; else nextDailyGoal = false;
      if (!nextStreak && !nextDailyGoal) void unsubscribe(user.id);
    } else {
      // Turning on: the preference is persisted only after a successful
      // subscribe (permission granted + row written) — never shows "on"
      // with nothing actually arriving.
      const subscribed = await requestAndSubscribe(user.id);
      setNotifPermission(typeof Notification !== 'undefined' ? Notification.permission : null);
      if (!subscribed) return;
      if (kind === 'streak') nextStreak = true; else nextDailyGoal = true;
    }

    setNotifyStreakState(nextStreak);
    setNotifyDailyGoalState(nextDailyGoal);
    setNotifyStreakPreference(nextStreak);
    setNotifyDailyGoalPreference(nextDailyGoal);
    void pushProfileSettingsToCloud(user.id, { dailyGoal: state.dailyGoal, notifyStreak: nextStreak, notifyDailyGoal: nextDailyGoal });
  }

  type AgeBandStep = 'idle' | 'guardian-email' | 'guardian-sent';
  const [ageBandStep, setAgeBandStep] = useState<AgeBandStep>('idle');
  const [ageBandSubmitting, setAgeBandSubmitting] = useState(false);
  const [ageBandError, setAgeBandError] = useState<string | null>(null);
  const [guardianEmailInput, setGuardianEmailInput] = useState('');
  const [guardianLink, setGuardianLink] = useState<string | null>(null);
  const [guardianEmailSent, setGuardianEmailSent] = useState(false);
  const [guardianCopied, setGuardianCopied] = useState(false);

  async function handleSwitchTo13Plus() {
    if (ageBandSubmitting) return;
    setAgeBandSubmitting(true);
    setAgeBandError(null);
    try {
      await correctAgeBand('13_plus');
      await refreshConsentStatus();
    } catch {
      setAgeBandError('Something went wrong. Try again.');
    } finally {
      setAgeBandSubmitting(false);
    }
  }

  async function handleSwitchToUnder13(e: React.FormEvent) {
    e.preventDefault();
    if (ageBandSubmitting) return;
    setAgeBandSubmitting(true);
    setAgeBandError(null);
    try {
      await correctAgeBand('under_13');
      await refreshConsentStatus();
      const { token } = await requestGuardianConsent(guardianEmailInput);
      const link = buildGuardianConsentLink(token);
      setGuardianLink(link);
      setGuardianEmailSent(await sendGuardianConsentEmail(guardianEmailInput, token));
      setAgeBandStep('guardian-sent');
    } catch (err) {
      setAgeBandError(
        err instanceof ConsentError && err.code === 'invalid_email'
          ? 'Enter a valid email address.'
          : 'Something went wrong. Try again.',
      );
    } finally {
      setAgeBandSubmitting(false);
    }
  }

  function resetAgeBandFlow() {
    setAgeBandStep('idle');
    setAgeBandError(null);
    setGuardianEmailInput('');
    setGuardianLink(null);
    setGuardianEmailSent(false);
  }

  function copyGuardianLink() {
    if (!guardianLink) return;
    void navigator.clipboard.writeText(guardianLink).then(() => {
      setGuardianCopied(true);
      setTimeout(() => setGuardianCopied(false), 2000);
    });
  }

  const [exportingData, setExportingData] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleExportData() {
    if (exportingData) return;
    setExportingData(true);
    setExportError(null);
    try {
      await exportMyData();
    } catch (err) {
      setExportError(
        err instanceof AccountError && err.code === 'not_authenticated'
          ? 'Sign in to export your data.'
          : 'Export failed. Try again.',
      );
    } finally {
      setExportingData(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount();
      await signOut();
      navigate('/', { replace: true });
    } catch {
      setDeleteError('Deletion failed. Try again, or contact us if this keeps happening.');
      setDeleting(false);
    }
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

  function cancelRename() {
    setRenaming(false);
    setRenameError(null);
    setRenameValue('');
  }

  // ── Derived display ────────────────────────────────────────────────────────
  const counts: AchievementCounts = {
    sessions: profile.sessions_count,
    streak: profile.streak_days,
    xp: profile.total_xp,
    topicsPractised: Object.values(state.topicMastery).filter(m => m.sessionsCompleted > 0).length,
    bestScore: stats.bestScore,
    examsCompleted,
  };
  const hiddenIds = new Set(ACHIEVEMENT_DEFINITIONS.filter(d => d.hidden).map(d => d.id));
  const tiles = achievementTiles(state.achievements, hiddenIds, counts);
  const unlockedCount = state.achievements.filter(a => a.unlocked).length;
  const totalAchievements = ACHIEVEMENT_DEFINITIONS.length;
  const nextUp = tiles.find(t => !t.achievement.unlocked) ?? null;
  const shownTiles = achievementsExpanded ? tiles : tiles.slice(0, ACHIEVEMENTS_COLLAPSED);

  const displayName = profile.username ?? user?.email ?? 'French Learner';
  const since = new Date(coachProfile.createdAt);
  const sinceLabel = Number.isFinite(since.getTime()) ? since.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null;
  const renameValid = isValidUsername(renameValue);
  const renameBad = renameValue.length > 0 && !renameValid;

  const activeGoal = getActiveGoal(coachProfile);
  const examDays = daysUntilExam(coachProfile);
  const goalRows: { k: string; v: string; tag?: string }[] = [];
  if (activeGoal && EXAM_BOARD_LABEL[activeGoal.type]) goalRows.push({ k: 'Exam', v: EXAM_BOARD_LABEL[activeGoal.type] });
  if (coachProfile.examDate) {
    goalRows.push({
      k: 'Speaking exam',
      v: new Date(coachProfile.examDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      tag: examDays !== null && examDays >= 0 ? `${examDays} day${examDays === 1 ? '' : 's'} to go` : undefined,
    });
  }
  if (activeGoal) goalRows.push({ k: 'Goal', v: activeGoal.label });
  if (activeGoal?.weeklyMinutes) goalRows.push({ k: 'Weekly practice', v: `${activeGoal.weeklyMinutes} min` });

  const ageBandDescription = ageBand === 'under_13'
    ? consentStatus === 'granted'
      ? 'Parent/guardian confirmed'
      : consentStatus === 'pending'
        ? 'Waiting on parent/guardian confirmation'
        : 'Requires guardian confirmation for speaking practice'
    : 'No guardian confirmation required';

  const chevron = <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />;
  const stepper = (dis: boolean) =>
    `flex h-11 w-11 items-center justify-center rounded-control border border-hairline-strong bg-surface transition-transform duration-press active:scale-[.97]
     ${dis ? 'cursor-default text-ink-subtle' : 'text-ink hover:bg-track'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <TopContextBar title="Profile" subtitle={profile.username ? `@${profile.username}` : isGuest ? 'Guest' : 'Your account'} />
      <PageShell>
        <div className="flex flex-wrap items-start gap-6">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-[1.45_1_460px] flex-col gap-4">
            <motion.section variants={fadeUp} className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-[clamp(20px,4cqw,28px)]" data-testid="profile-identity">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
                <UserAvatar username={profile.username ?? user?.email ?? null} equipped={profile.equipped} catalogue={catalogue} size={72} tone="soft" />
                <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1
                      className="truncate text-[clamp(26px,4cqw,32px)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink"
                      style={nameplateColor ? { color: nameplateColor } : undefined}
                    >
                      {displayName}
                    </h1>
                    {isGuest && (
                      <span className="inline-flex h-6 items-center rounded-pill bg-reward-soft px-2 text-caption font-semibold text-reward-text">Guest</span>
                    )}
                  </div>
                  <span className="text-[14px] text-ink-subtle">
                    {profile.username ? `@${profile.username}` : 'No username yet'}
                    {sinceLabel && ` · learning since ${sinceLabel}`}
                  </span>
                  {isGuest && <span className="text-[13px] text-reward-text">Your progress is saved on this device only</span>}
                </div>
                {!renaming && (
                  <Button variant="secondary" size="md" onClick={() => setRenaming(true)}>
                    <AtSign size={16} aria-hidden="true" />{profile.username ? 'Change username' : 'Claim a username'}
                  </Button>
                )}
              </div>

              {renaming && (
                <motion.form
                  variants={enter}
                  initial="hidden"
                  animate="show"
                  onSubmit={handleRename}
                  className="flex flex-col gap-2 rounded-control border border-hairline bg-surface-recessed p-4"
                >
                  <label htmlFor="profile-username" className="text-[13px] font-semibold text-ink">New username</label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="profile-username"
                      autoFocus
                      autoComplete="off"
                      value={renameValue}
                      onChange={e => { setRenameValue(e.target.value); setRenameError(null); }}
                      placeholder={profile.username ?? 'marie_92'}
                      maxLength={20}
                      aria-invalid={renameBad || renameError !== null}
                      aria-describedby="profile-username-hint"
                      className={`${INPUT} flex-[1_1_200px]`}
                    />
                    <Button type="submit" size="md" variant={renameValid ? 'primary' : 'secondary'} disabled={!renameValid || renameSubmitting}>
                      {renameSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                      Save
                    </Button>
                    <Button variant="quiet" size="md" onClick={cancelRename}>Cancel</Button>
                  </div>
                  <span id="profile-username-hint" className={`text-[13px] ${renameError || renameBad ? 'text-correction-text' : 'text-ink-subtle'}`}>
                    {renameError ?? (renameBad ? RENAME_REASON_COPY.invalid_format : 'Usernames can be changed once every 30 days.')}
                  </span>
                </motion.form>
              )}

              <div className="flex flex-col gap-2" data-testid="profile-level">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-reward-text">
                    <Zap size={16} aria-hidden="true" />Level {level.n} · {level.name}
                  </span>
                  <span className="font-numeral text-[13px] text-ink-subtle">
                    {level.toNext === null ? 'Top level' : `${level.toNext.toLocaleString('en-GB')} XP to Level ${level.n + 1}`}
                  </span>
                </span>
                <span className="block h-2.5 overflow-hidden rounded-pill bg-track">
                  <motion.span className="block h-full rounded-pill bg-reward" initial={{ width: 0 }} animate={{ width: `${level.fraction * 100}%` }} transition={fill()} />
                </span>
              </div>
            </motion.section>

            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr))]" data-testid="profile-stats">
              {[
                { icon: <Flame size={16} className="text-streak-text" />, value: profile.streak_days, decimals: 0, label: 'Day streak' },
                { icon: <Mic size={16} className="text-ink-muted" />, value: profile.sessions_count, decimals: 0, label: 'Sessions' },
                { icon: <TrendingUp size={16} className="text-progress-text" />, value: stats.avgScore, decimals: 1, label: 'Average /10' },
                { icon: <Zap size={16} className="text-reward-text" />, value: profile.total_xp, decimals: 0, label: 'Total XP' },
              ].map(s => (
                <motion.div key={s.label} variants={fadeUp} className="flex min-w-0 flex-col gap-1 rounded-card border border-hairline bg-surface p-4">
                  <span className="flex" aria-hidden="true">{s.icon}</span>
                  {s.value === null ? (
                    <span className="mt-1.5 font-numeral text-num-m text-ink-subtle">—</span>
                  ) : (
                    <CountUp value={s.value} decimals={s.decimals} grouped className="mt-1.5 font-numeral text-num-m text-ink" />
                  )}
                  <span className="text-[13px] text-ink-subtle">{s.label}</span>
                </motion.div>
              ))}
            </div>

            <motion.section variants={fadeUp} aria-labelledby="profile-achievements" className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="profile-achievements" className="text-section text-ink">Achievements</h2>
                <span className="font-numeral text-[13px] text-ink-subtle">{unlockedCount} of {totalAchievements} unlocked</span>
              </div>
              <span className="block h-1.5 overflow-hidden rounded-pill bg-track">
                <motion.span className="block h-full rounded-pill bg-reward" initial={{ width: 0 }} animate={{ width: `${(unlockedCount / totalAchievements) * 100}%` }} transition={fill()} />
              </span>

              {nextUp && (
                <div className="flex items-center gap-3.5 rounded-control border border-hairline-strong bg-surface-recessed px-4 py-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-reward-soft text-reward-text" aria-hidden="true">
                    <nextUp.Icon size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-eyebrow uppercase text-reward-text">Next up</span>
                      <span className="text-[15px] font-semibold text-ink">{nextUp.achievement.name}</span>
                    </span>
                    <span className="text-[13px] text-ink-muted">{nextUp.achievement.description}</span>
                    {nextUp.progress && (
                      <span className="flex items-center gap-2.5">
                        <span className="block h-1.5 flex-1 overflow-hidden rounded-pill bg-track">
                          <motion.span className="block h-full rounded-pill bg-reward" initial={{ width: 0 }} animate={{ width: `${Math.max(2, nextUp.fraction * 100)}%` }} transition={fill()} />
                        </span>
                        <span className="font-numeral text-caption text-ink-muted">
                          {nextUp.progress.current.toLocaleString('en-GB')}/{nextUp.progress.max.toLocaleString('en-GB')}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
              )}

              <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,140px),1fr))]">
                {shownTiles.map(({ achievement: a, Icon, progress, fraction }) => (
                  <motion.li
                    key={a.id}
                    variants={enter}
                    initial="hidden"
                    animate="show"
                    title={a.description}
                    className={`flex min-w-0 flex-col gap-2.5 rounded-control border border-hairline p-3.5 ${a.unlocked ? 'bg-surface' : 'bg-surface-recessed'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 items-center justify-center rounded-control
                        ${a.unlocked ? 'bg-reward-soft text-reward-text' : 'bg-surface-recessed text-ink-subtle shadow-[inset_0_0_0_1px_var(--hairline)]'}`}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-semibold leading-[1.3] text-ink">{a.name}</span>
                      <span className="text-caption text-ink-subtle">{a.description}</span>
                    </span>
                    {a.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-caption font-medium text-progress-text">
                        <Check size={14} aria-hidden="true" />
                        {a.unlockedAt ? `Unlocked ${new Date(a.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Unlocked'}
                      </span>
                    ) : progress ? (
                      <span className="flex items-center gap-2">
                        <span className="block h-1 flex-1 overflow-hidden rounded-pill bg-track">
                          <span className="block h-full rounded-pill bg-progress" style={{ width: `${Math.max(2, fraction * 100)}%` }} />
                        </span>
                        <span className="font-numeral text-caption text-ink-subtle">
                          {progress.current.toLocaleString('en-GB')}/{progress.max.toLocaleString('en-GB')}
                        </span>
                      </span>
                    ) : (
                      <span className="text-caption text-ink-subtle">Locked</span>
                    )}
                  </motion.li>
                ))}
              </ul>
              {tiles.length > ACHIEVEMENTS_COLLAPSED && (
                <button
                  type="button"
                  onClick={() => setAchievementsExpanded(v => !v)}
                  aria-expanded={achievementsExpanded}
                  className="-ml-3 inline-flex h-10 items-center gap-1.5 self-start rounded-control px-3 text-[14px] font-semibold text-action-text transition-colors duration-state ease-smooth hover:bg-action-soft"
                >
                  {achievementsExpanded ? 'Show fewer' : `Show all ${tiles.length}`}
                  {achievementsExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                </button>
              )}
            </motion.section>

            <motion.section variants={fadeUp} aria-labelledby="profile-goals" className="overflow-hidden rounded-card border border-hairline bg-surface">
              <div className="flex items-center justify-between gap-3 px-[clamp(16px,3cqw,24px)] py-4">
                <h2 id="profile-goals" className="text-section text-ink">Learning goals</h2>
                <Button variant="secondary" size="sm" onClick={() => navigate('/onboarding?from=profile')}>Update goals</Button>
              </div>
              {goalRows.length === 0 ? (
                <p className="border-t border-hairline px-[clamp(16px,3cqw,24px)] py-3 text-[14px] text-ink-muted">
                  No goal set yet. Add your exam board, exam date and goal.
                </p>
              ) : goalRows.map(r => (
                <div key={r.k} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-hairline px-[clamp(16px,3cqw,24px)] py-3">
                  <span className="text-[14px] text-ink-muted">{r.k}</span>
                  <span className="inline-flex items-center gap-2 text-right text-[14px] font-semibold text-ink">
                    {r.v}
                    {r.tag && (
                      <span className="inline-flex h-6 items-center rounded-pill bg-info-soft px-2 font-numeral text-caption text-info-text">{r.tag}</span>
                    )}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 border-t border-hairline bg-surface-recessed px-[clamp(16px,3cqw,24px)] py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] font-semibold text-ink">Daily goal</span>
                  <span className="text-[13px] text-ink-subtle">Sessions a day to keep your streak · drives the ring on Home</span>
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'SET_DAILY_GOAL', goal: state.dailyGoal - 1 })}
                    disabled={state.dailyGoal <= DAILY_GOAL_MIN}
                    aria-label="Decrease daily goal"
                    className={stepper(state.dailyGoal <= DAILY_GOAL_MIN)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-numeral text-[18px] text-ink" aria-live="polite">{state.dailyGoal}</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'SET_DAILY_GOAL', goal: state.dailyGoal + 1 })}
                    disabled={state.dailyGoal >= DAILY_GOAL_MAX}
                    aria-label="Increase daily goal"
                    className={stepper(state.dailyGoal >= DAILY_GOAL_MAX)}
                  >
                    <Plus size={16} />
                  </button>
                </span>
              </div>
            </motion.section>
          </div>

          {/* ── Right column: grouped settings ──────────────────────────── */}
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
            <motion.div variants={fadeUp}>
              <SettingGroup title="Preferences">
                <SettingToggle icon={<Volume2 size={16} />} label="Sound effects" description="Play sounds for answers and rewards" enabled={state.soundEnabled} onToggle={() => dispatch({ type: 'TOGGLE_SOUND' })} />
                <SettingToggle divided icon={<Moon size={16} />} label="Dark mode" description="Same colours by role, darker surfaces" enabled={state.darkMode} onToggle={() => dispatch({ type: 'TOGGLE_DARK_MODE' })} />
                {state.learnerTrack !== 'junior' && <ReplayTourButton divided />}
              </SettingGroup>
            </motion.div>

            {isPushSupported() && (
              <motion.div variants={fadeUp}>
                <SettingGroup title="Notifications">
                  {([
                    { kind: 'streak' as const, on: notifyStreak, label: 'Streak reminders', description: 'A nudge before your streak resets', Icon: Bell },
                    { kind: 'dailyGoal' as const, on: notifyDailyGoal, label: 'Daily goal reminders', description: "If you haven't hit today's goal", Icon: BellRing },
                  ]).map(({ kind, on, label, description, Icon }, i) => {
                    const blocked = on && notifPermission === 'denied';
                    const enabled = on && notifPermission === 'granted';
                    return (
                      <SettingRow
                        key={kind}
                        role="switch"
                        checked={enabled}
                        divided={i > 0}
                        icon={<Icon size={16} />}
                        label={label}
                        description={blocked ? 'Blocked — enable notifications in your browser settings' : description}
                        onClick={() => void handleToggleNotifyPreference(kind)}
                        trailing={<Toggle on={enabled} />}
                      />
                    );
                  })}
                </SettingGroup>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <SettingGroup title="AI feedback">
                <div role="radiogroup" aria-label="AI feedback engine" aria-describedby="profile-engine-note">
                  {AI_ENGINES.map((e, i) => {
                    const on = state.preferredEngine === e.id;
                    return (
                      <div
                        key={e.id}
                        role="radio"
                        aria-checked={on}
                        aria-disabled="true"
                        className={`flex min-h-[60px] items-center gap-3 px-4 py-2.5 ${i ? 'border-t border-hairline' : ''}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`mx-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 ${on ? 'border-action' : 'border-hairline-strong'}`}
                        >
                          <motion.span className="h-2 w-2 rounded-pill bg-action" animate={{ scale: on ? 1 : 0 }} transition={slide} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-semibold leading-[1.35] text-ink">
                            {e.label}
                            {on && (
                              <span className="inline-flex h-[22px] items-center rounded-pill bg-progress-soft px-2 text-caption font-semibold text-progress-text">In use</span>
                            )}
                          </span>
                          <span className="text-[13px] leading-[1.4] text-ink-subtle">{e.desc}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p id="profile-engine-note" className="border-t border-hairline px-4 py-2.5 text-[13px] text-ink-subtle">
                  The app picks the engine for you and falls back automatically if one is unavailable.
                </p>
                <SettingRow
                  divided
                  icon={<Globe size={16} />}
                  label="Speech recognition"
                  description="French · IGCSE standard"
                  trailing={
                    <span className="inline-flex h-6 items-center rounded-[6px] border border-hairline bg-surface-recessed px-2 font-numeral text-caption text-ink-muted">fr-FR</span>
                  }
                />
              </SettingGroup>
            </motion.div>

            {privacy && !CORE_ONLY && (
              <motion.div variants={fadeUp}>
                <SettingGroup title="Social privacy">
                  <SettingToggle
                    icon={<Globe size={16} />}
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
                    divided
                    icon={<Users size={16} />}
                    label="Accept friend requests"
                    description="Allow other learners to send you requests"
                    enabled={privacy.friendRequestsFrom === 'anyone'}
                    onToggle={() => {
                      const next = privacy.friendRequestsFrom === 'anyone' ? 'nobody' : 'anyone';
                      setPrivacy({ ...privacy, friendRequestsFrom: next });
                      void setFriendRequestsFrom(profile.id, next);
                    }}
                  />
                  <div className="flex flex-col gap-2 border-t border-hairline px-4 py-3">
                    <span className="text-[14px] font-semibold text-ink">Leaderboard visibility</span>
                    <Segmented
                      label="Leaderboard visibility"
                      value={privacy.leaderboardVisibility}
                      height={36}
                      onChange={(v: LeaderboardVisibility) => {
                        setPrivacy({ ...privacy, leaderboardVisibility: v });
                        void setLeaderboardVisibility(profile.id, v);
                      }}
                      options={[{ id: 'global', label: 'Global' }, { id: 'friends', label: 'Friends' }, { id: 'hidden', label: 'Hidden' }]}
                    />
                  </div>
                </SettingGroup>
              </motion.div>
            )}

            {/* Learner track — shown only while Junior is selectable, or so a learner already on it can switch back */}
            {(JUNIOR_TRACK_SELECTABLE || state.learnerTrack === 'junior') && (
              <motion.div variants={fadeUp}>
                <SettingGroup title="Learner track">
                  <div className="p-3"><TrackSwitch /></div>
                </SettingGroup>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <SettingGroup title="Account & data" testId="profile-account">
                {ageBand && (
                  <>
                    <SettingRow
                      icon={<ShieldCheck size={16} />}
                      label={`Age band · ${ageBand === 'under_13' ? 'Under 13' : '13 or older'}`}
                      description={ageBandDescription}
                    />
                    <div className="flex flex-col gap-2.5 px-4 pb-3 pl-[60px]">
                      {ageBandStep === 'idle' && (
                        <>
                          {ageBandError && <p className="text-[13px] text-correction-text">{ageBandError}</p>}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="self-start"
                            disabled={ageBandSubmitting}
                            onClick={() => (ageBand === 'under_13' ? void handleSwitchTo13Plus() : setAgeBandStep('guardian-email'))}
                          >
                            {ageBand === 'under_13'
                              ? ageBandSubmitting ? 'Updating…' : "Actually, I'm 13 or older"
                              : "Actually, I'm under 13"}
                          </Button>
                        </>
                      )}

                      {ageBandStep === 'guardian-email' && (
                        <form onSubmit={(e) => void handleSwitchToUnder13(e)} className="flex flex-col gap-2 rounded-control border border-hairline bg-surface-recessed p-3">
                          <label htmlFor="guardian-email" className="text-[13px] text-ink-muted">
                            A parent or guardian will need to confirm by email before speaking practice turns back on.
                          </label>
                          <input
                            id="guardian-email"
                            type="email"
                            required
                            placeholder="parent@example.com"
                            value={guardianEmailInput}
                            onChange={(e) => setGuardianEmailInput(e.target.value)}
                            className={INPUT}
                          />
                          {ageBandError && <p className="text-[13px] text-correction-text">{ageBandError}</p>}
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={ageBandSubmitting}>
                              {ageBandSubmitting ? 'Sending…' : 'Send request'}
                            </Button>
                            <Button variant="quiet" size="sm" onClick={resetAgeBandFlow}>Cancel</Button>
                          </div>
                        </form>
                      )}

                      {ageBandStep === 'guardian-sent' && (
                        <div className="flex flex-col gap-2 rounded-control border border-hairline bg-surface-recessed p-3">
                          {guardianEmailSent ? (
                            <p className="text-[13px] text-ink-muted">
                              We emailed <strong className="font-semibold text-ink">{guardianEmailInput}</strong>. Speaking
                              practice turns off until they confirm.
                            </p>
                          ) : (
                            <>
                              <p className="text-[13px] text-ink-muted">
                                We couldn't send the email automatically. Copy this link and send it yourself:
                              </p>
                              {guardianLink && (
                                <Button variant="secondary" size="sm" onClick={copyGuardianLink} className="max-w-full">
                                  {guardianCopied ? <Check size={14} className="shrink-0 text-progress-text" /> : <Copy size={14} className="shrink-0" />}
                                  <span className="truncate">{guardianCopied ? 'Copied!' : guardianLink}</span>
                                </Button>
                              )}
                            </>
                          )}
                          <Button variant="quiet" size="sm" className="self-start" onClick={resetAgeBandFlow}>Done</Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <SettingRow
                  divided={!!ageBand}
                  icon={exportingData ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  label="Export my data"
                  description={exportingData ? 'Preparing your file…' : exportError ?? 'Download sessions, transcripts and progress'}
                  onClick={() => void handleExportData()}
                  disabled={exportingData}
                  trailing={chevron}
                />
                <SettingRow
                  divided
                  icon={<Shield size={16} />}
                  label="Privacy policy"
                  description="How we handle your recordings and data"
                  onClick={() => navigate('/privacy')}
                  trailing={chevron}
                />
                <SettingRow
                  divided
                  icon={<UserX size={16} />}
                  label="Blocked learners"
                  description={blockedUsers.length > 0 ? `${blockedUsers.length} blocked` : 'Manage who can’t find or message you'}
                  onClick={() => setShowBlockedList(v => !v)}
                  ariaExpanded={showBlockedList}
                  trailing={
                    <motion.span className="flex shrink-0 text-ink-subtle" animate={{ rotate: showBlockedList ? 180 : 0 }} transition={slide} aria-hidden="true">
                      <ChevronDown size={16} />
                    </motion.span>
                  }
                />
                {showBlockedList && (
                  <motion.div variants={enter} initial="hidden" animate="show" className="flex flex-col gap-1 pb-3 pl-[60px] pr-4">
                    {blockedUsers.length === 0 ? (
                      <p className="text-[13px] text-ink-subtle">No one blocked. You can block a learner from their profile.</p>
                    ) : (
                      blockedUsers.map(u => (
                        <div key={u.userId} className="flex items-center gap-2.5 rounded-control bg-surface-recessed px-3 py-1.5">
                          <UserAvatar username={u.username} size={28} />
                          <p className="flex-1 truncate text-[14px] text-ink-muted">{u.username}</p>
                          <Button variant="quiet" size="sm" onClick={() => void handleUnblock(u.userId)}>Unblock</Button>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
                {isAdmin && (
                  <SettingRow
                    divided
                    icon={<SlidersHorizontal size={16} />}
                    label="Content Admin"
                    description="Manage questions & scenarios"
                    onClick={() => navigate('/admin')}
                    trailing={chevron}
                  />
                )}
                {isGuest && (
                  <SettingRow
                    divided
                    icon={<LogIn size={16} />}
                    label="Log in / Create account"
                    description="Creating a new account backs up this device's data. Logging into an existing account may not preserve it."
                    onClick={() => navigate('/login')}
                    trailing={chevron}
                  />
                )}
                <SettingRow
                  divided
                  icon={<LogOut size={16} />}
                  label={isGuest ? 'Exit guest mode' : 'Sign out'}
                  description={isGuest ? 'Clears the local guest session' : 'Your progress on this device is kept'}
                  onClick={() => {
                    if (isGuest) {
                      exitGuestMode();
                      navigate('/', { replace: true });
                    } else {
                      exitGuestMode();
                      signOut();
                    }
                  }}
                />
                <SettingRow
                  divided
                  tone="correction"
                  icon={<Trash2 size={16} />}
                  label="Delete my account"
                  description="Permanently erase your account and data"
                  onClick={() => setShowDeleteConfirm(true)}
                />
              </SettingGroup>
            </motion.div>

            <p className="text-center text-caption text-ink-subtle">Français AI · v3.0</p>
          </div>
        </div>
      </PageShell>

      {showDeleteConfirm && (
        <DeleteDialog
          deleting={deleting}
          error={deleteError}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => void handleDeleteAccount()}
        />
      )}
    </div>
  );
}

/** The delete confirmation: a scrim, a 400px raised card, Cancel and a correction-filled confirm. */
function DeleteDialog({ deleting, error, onCancel, onConfirm }: { deleting: boolean; error: string | null; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deleting) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, onCancel]);

  // Portalled to <body>: the route wrapper is its own stacking context, so a
  // dialog inside it could not cover the rail or the dock.
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-scrim p-6"
      onClick={() => { if (!deleting) onCancel(); }}
    >
      <motion.div
        variants={enter}
        initial="hidden"
        animate="show"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-body"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[400px] flex-col gap-4 rounded-card border border-hairline-strong bg-surface-raised p-6 shadow-overlay"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-control bg-correction-soft text-correction-text" aria-hidden="true">
          <Trash2 size={20} />
        </span>
        <span className="flex flex-col gap-1.5">
          <span id="delete-title" className="text-subtitle text-ink">Delete your account?</span>
          <span id="delete-body" className="text-body-s text-ink-muted [text-wrap:pretty]">
            This permanently erases your sessions, transcripts, scores, XP and progress. It can’t be undone.
          </span>
        </span>
        {error && <p role="alert" className="text-[13px] text-correction-text">{error}</p>}
        <div className="flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-12 flex-1 rounded-control border border-hairline-strong text-[15px] font-semibold text-ink transition-[background-color,transform] duration-state ease-smooth hover:bg-track active:scale-[.97] disabled:text-ink-subtle"
          >
            Cancel
          </button>
          <Button variant="danger" size="lg" className="flex-[1.4] whitespace-nowrap px-3" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
