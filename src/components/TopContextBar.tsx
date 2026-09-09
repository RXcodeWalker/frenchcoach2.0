import { motion } from 'framer-motion';
import { ChevronLeft, Flame, Zap, Gem, Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CosmeticPreview } from './ui/CosmeticPreview';
import { useCatalogue } from '../services/shop/useCatalogue';
import { Stat } from './ui/Stat';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export function TopContextBar({ title, subtitle, showBack, onBack, actions }: Props) {
  const navigate = useNavigate();
  const { state } = useApp();
  const { profile } = state;
  const catalogue = useCatalogue();

  return (
    <div className="sticky top-0 z-[80] w-full px-4 py-3 md:px-8">
      <div className="surface-raised rounded-card flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-4">
          {showBack && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack || (() => navigate(-1))}
              className="w-10 h-10 rounded-xl surface border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </motion.button>
          )}
          
          <div>
            <h1 className="text-label text-ink leading-tight">{title}</h1>
            {subtitle && <p className="text-body-s text-ink-subtle">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats — max three outlined pills, colour by role (Component Kit §04) */}
          <div className="hidden md:flex items-center gap-2">
            <button type="button" onClick={() => navigate('/shop')}>
              <Stat role="reward" icon={<Gem size={14} />}>{profile.gems.toLocaleString()}</Stat>
            </button>
            <Stat role="streak" icon={<Flame size={14} />}>{profile.streak_days.toString()}</Stat>
            <Stat role="reward" icon={<Zap size={14} />}>{profile.total_xp.toLocaleString()}</Stat>
          </div>

          <div className="h-6 w-px bg-hairline mx-1 hidden md:block" />

          {actions || (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-xl surface border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-colors relative"
              >
                <Bell size={18} />
                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-action rounded-full ring-2 ring-[var(--surface)]" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/profile')}
                className="rounded-xl surface border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-colors p-1"
              >
                <CosmeticPreview
                  avatarEmoji={profile.equipped.avatar}
                  frameItemId={profile.equipped.frame}
                  nameplateItemId={null}
                  catalogue={catalogue}
                  size={32}
                />
              </motion.button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="md:hidden w-10 h-10 rounded-xl surface border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-colors"
          >
            <Menu size={18} />
          </motion.button>
        </div>
      </div>

      {/* Mobile stats bar — just below the top bar */}
      <div className="flex md:hidden items-center justify-center gap-2 mt-2">
        <button type="button" onClick={() => navigate('/shop')}>
          <Stat role="reward" icon={<Gem size={12} />}>{profile.gems.toLocaleString()}</Stat>
        </button>
        <Stat role="streak" icon={<Flame size={12} />}>{profile.streak_days.toString()}</Stat>
        <Stat role="reward" icon={<Zap size={12} />}>{profile.total_xp.toLocaleString()}</Stat>
      </div>
    </div>
  );
}
