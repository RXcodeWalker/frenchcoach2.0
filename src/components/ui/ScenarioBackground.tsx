import React from 'react';
import { motion } from 'framer-motion';

interface ScenarioBackgroundProps {
  topic: string;
}

const TOPIC_THEMES: Record<string, { from: string, via: string, to: string, elements: string[] }> = {
  'Bakery': { from: '#f59e0b', via: '#d97706', to: '#78350f', elements: ['🥖', '🥐', '🥯'] },
  'Doctor': { from: '#0ea5e9', via: '#0284c7', to: '#0c4a6e', elements: ['🏥', '💊', '🩺'] },
  'Airport': { from: '#6366f1', via: '#4f46e5', to: '#312e81', elements: ['✈️', '☁️', '🛂'] },
  'Restaurant': { from: '#ef4444', via: '#dc2626', to: '#7f1d1d', elements: ['🍷', '🍽️', '🍝'] },
  'Store': { from: '#10b981', via: '#059669', to: '#064e3b', elements: ['🛍️', '📦', '💳'] },
  'Default': { from: '#6366f1', via: '#4f46e5', to: '#312e81', elements: ['✨', '🌟', '💫'] },
};

export const ScenarioBackground: React.FC<ScenarioBackgroundProps> = ({ topic }) => {
  // Find match or fallback
  const theme = Object.entries(TOPIC_THEMES).find(([k]) => topic.toLowerCase().includes(k.toLowerCase()))?.[1] || TOPIC_THEMES.Default;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Base Gradient */}
      <div 
        className="absolute inset-0 transition-colors duration-1000"
        style={{ background: `linear-gradient(to bottom right, ${theme.from}, ${theme.via}, ${theme.to})` }}
      />
      
      {/* Animated Mesh/Noise */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Floating Elements */}
      {theme.elements.map((emoji, i) => (
        <motion.div
          key={`${emoji}-${i}`}
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: Math.random() * 100 + '%',
            opacity: 0,
            scale: 0.5 
          }}
          animate={{ 
            y: ['0%', '10%', '-10%', '0%'],
            rotate: [0, 15, -15, 0],
            opacity: [0.1, 0.3, 0.1],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{ 
            duration: 10 + Math.random() * 10, 
            repeat: Infinity,
            delay: i * 2
          }}
          className="absolute text-4xl filter blur-[1px] select-none"
        >
          {emoji}
        </motion.div>
      ))}

      {/* Ground Shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
};
