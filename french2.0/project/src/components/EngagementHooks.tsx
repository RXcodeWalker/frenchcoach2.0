import { X, AlertCircle, CheckCircle, Zap, Flame, Gift, Target } from 'lucide-react';
import { useState } from 'react';

export type HookType = 'streak-risk' | 'daily-goal' | 'achievement' | 'milestone' | 'suggestion' | 'challenge';

interface HookNotificationProps {
  type: HookType;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}

export function HookNotification({ type, title, message, action, onDismiss }: HookNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const configs = {
    'streak-risk': {
      icon: Flame,
      bg: 'from-red-600/20 to-orange-600/20',
      border: 'border-red-500/50',
      text: 'text-red-300',
      button: 'bg-red-500 hover:bg-red-400',
    },
    'daily-goal': {
      icon: Target,
      bg: 'from-blue-600/20 to-cyan-600/20',
      border: 'border-blue-500/50',
      text: 'text-blue-300',
      button: 'bg-blue-500 hover:bg-blue-400',
    },
    achievement: {
      icon: Gift,
      bg: 'from-amber-600/20 to-yellow-600/20',
      border: 'border-amber-500/50',
      text: 'text-amber-300',
      button: 'bg-amber-500 hover:bg-amber-400',
    },
    milestone: {
      icon: Zap,
      bg: 'from-emerald-600/20 to-green-600/20',
      border: 'border-emerald-500/50',
      text: 'text-emerald-300',
      button: 'bg-emerald-500 hover:bg-emerald-400',
    },
    suggestion: {
      icon: AlertCircle,
      bg: 'from-purple-600/20 to-pink-600/20',
      border: 'border-purple-500/50',
      text: 'text-purple-300',
      button: 'bg-purple-500 hover:bg-purple-400',
    },
    challenge: {
      icon: Flame,
      bg: 'from-orange-600/20 to-red-600/20',
      border: 'border-orange-500/50',
      text: 'text-orange-300',
      button: 'bg-orange-500 hover:bg-orange-400',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-gradient-to-r ${config.bg} border ${config.border} rounded-2xl p-5 shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-xl animate-slide-in`}>
      <div className="flex items-start gap-4">
        <Icon size={20} className={config.text} />
        <div className="flex-1">
          <p className={`font-bold ${config.text}`}>{title}</p>
          <p className="text-sm text-slate-300 mt-1">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-3 w-full py-2 rounded-lg ${config.button} text-white font-semibold text-sm transition-all duration-200`}
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export function HookStack({ hooks }: { hooks: HookNotificationProps[] }) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 max-w-sm w-full px-4 space-y-3 z-40">
      {hooks.map((hook, i) => (
        <HookNotification key={i} {...hook} />
      ))}
    </div>
  );
}

// Specific hook builders

export function StreakAtRiskHook({
  hoursLeft,
  onPracticeNow,
}: {
  hoursLeft: number;
  onPracticeNow: () => void;
}): HookNotificationProps {
  return {
    type: 'streak-risk',
    title: `Your streak ends in ${hoursLeft} hours!`,
    message: 'Practice now to keep your momentum alive.',
    action: { label: 'Practice Now', onClick: onPracticeNow },
  };
}

export function DailyGoalHook({
  remaining,
  onContinue,
}: {
  remaining: number;
  onContinue: () => void;
}): HookNotificationProps {
  return {
    type: 'daily-goal',
    title: `${remaining} session${remaining !== 1 ? 's' : ''} to daily goal!`,
    message: "You're almost there. One more push!",
    action: { label: 'Keep Going', onClick: onContinue },
  };
}

export function AchievementUnlockedHook({
  achievementName,
  onView,
}: {
  achievementName: string;
  onView: () => void;
}): HookNotificationProps {
  return {
    type: 'achievement',
    title: `Achievement Unlocked! 🎉`,
    message: `You've earned: ${achievementName}`,
    action: { label: 'View Details', onClick: onView },
  };
}

export function MilestoneReachedHook({
  milestoneName,
  onCelebrate,
}: {
  milestoneName: string;
  onCelebrate: () => void;
}): HookNotificationProps {
  return {
    type: 'milestone',
    title: `Milestone: ${milestoneName}`,
    message: 'You are making amazing progress!',
    action: { label: 'Celebrate', onClick: onCelebrate },
  };
}

export function SuggestionHook({
  suggestion,
  onAccept,
}: {
  suggestion: string;
  onAccept: () => void;
}): HookNotificationProps {
  return {
    type: 'suggestion',
    title: 'Recommendation',
    message: suggestion,
    action: { label: 'Try it', onClick: onAccept },
  };
}
