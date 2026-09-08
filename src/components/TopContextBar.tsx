import { motion } from 'framer-motion';
import { ChevronLeft, Flame, Zap, Gem, Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CosmeticPreview } from './ui/CosmeticPreview';
import { useCatalogue } from '../services/shop/useCatalogue';

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
      <div className="glass-elevated border-white/5 rounded-2xl flex items-center justify-between px-4 py-2.5 shadow-2xl">
        <div className="flex items-center gap-4">
          {showBack && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack || (() => navigate(-1))}
              className="w-10 h-10 rounded-xl glass border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </motion.button>
          )}
          
          <div>
            <h1 className="text-sm font-black text-white leading-tight uppercase tracking-widest">{title}</h1>
            {subtitle && <p className="text-[10px] text-ink-muted font-bold uppercase tracking-tight">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats - Visible on Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <StatPill 
              icon={<Gem size={14} className="text-emerald-400" />} 
              value={profile.gems.toLocaleString()} 
              color="emerald"
              onClick={() => navigate('/shop')}
            />
            <StatPill 
              icon={<Flame size={14} className="text-orange-400" />} 
              value={profile.streak_days.toString()} 
              color="orange"
            />
            <StatPill 
              icon={<Zap size={14} className="text-violet-400" />} 
              value={profile.total_xp.toLocaleString()} 
              color="violet"
            />
          </div>

          <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

          {actions || (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-xl glass border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-colors relative"
              >
                <Bell size={18} />
                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-pink-500 rounded-full border-2 border-navy" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/profile')}
                className="rounded-xl glass border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-colors p-1"
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
            className="md:hidden w-10 h-10 rounded-xl glass border-white/10 flex items-center justify-center text-ink-muted hover:text-white transition-colors"
          >
            <Menu size={18} />
          </motion.button>
        </div>
      </div>

      {/* Mobile Stats Bar - Just below TopBar */}
      <div className="flex md:hidden items-center justify-center gap-2 mt-2">
        <StatPill icon={<Gem size={12} className="text-emerald-400" />} value={profile.gems.toLocaleString()} color="emerald" small onClick={() => navigate('/shop')} />
        <StatPill icon={<Flame size={12} className="text-orange-400" />} value={profile.streak_days.toString()} color="orange" small />
        <StatPill icon={<Zap size={12} className="text-violet-400" />} value={profile.total_xp.toLocaleString()} color="violet" small />
      </div>
    </div>
  );
}

function StatPill({ icon, value, color, onClick, small }: { icon: React.ReactNode, value: string, color: string, onClick?: () => void, small?: boolean }) {
  const colors: Record<string, string> = {
    emerald: 'border-emerald-500/15 text-emerald-400',
    orange: 'border-orange-500/15 text-orange-400',
    violet: 'border-violet-500/15 text-violet-400',
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05, y: -1 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`flex items-center gap-1.5 ${small ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-xl glass ${colors[color]} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {icon}
      <span className={`${small ? 'text-[10px]' : 'text-xs'} font-black`}>{value}</span>
    </motion.div>
  );
}
