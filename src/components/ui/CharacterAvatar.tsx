import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type Expression = 'neutral' | 'happy' | 'thinking' | 'confused' | 'excited';

interface CharacterAvatarProps {
  role: string;
  expression?: Expression;
}

const ROLE_EMOJIS: Record<string, string> = {
  'Baker': '🧑‍🍳',
  'Doctor': '👩‍⚕️',
  'Teacher': '👨‍🏫',
  'Pharmacist': '👩‍🔬',
  'Waiter': '🤵',
  'Police Officer': '👮',
  'Receptionist': '👩‍💼',
  'Shop Assistant': '🛍️',
  'Ticket Agent': '🎫',
  'Traveler': '🧳',
  'Friend': '👤',
};

const EXPRESSION_VARIANTS = {
  neutral: { scale: 1, rotate: 0 },
  happy: { scale: 1.1, rotate: [0, 5, -5, 0] },
  thinking: { scale: 0.95, rotate: -5, opacity: 0.8 },
  confused: { scale: 1, x: [0, -2, 2, -2, 2, 0], rotate: 10 },
  excited: { scale: 1.2, y: [0, -10, 0, -10, 0] },
};

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ role, expression = 'neutral' }) => {
  const emoji = ROLE_EMOJIS[role] || '👤';

  return (
    <div className="relative group">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <motion.div
        variants={EXPRESSION_VARIANTS}
        animate={expression}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative z-10 w-48 h-48 md:w-64 md:h-64 flex items-center justify-center text-[8rem] md:text-[10rem] drop-shadow-2xl filter saturate-[1.2]"
      >
        {emoji}
        
        {/* Shadow */}
        <div className="absolute bottom-4 w-32 h-4 bg-black/20 blur-md rounded-full -z-10" />
      </motion.div>

      {/* Role Label */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white text-slate-950 font-black rounded-full shadow-xl uppercase italic tracking-wider text-xs whitespace-nowrap z-20"
      >
        {role}
      </motion.div>
    </div>
  );
};
