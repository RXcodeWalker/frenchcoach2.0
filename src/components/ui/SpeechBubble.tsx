import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { enter, enterReduced } from '../motion/variants';

interface SpeechBubbleProps {
  text: string;
  sender: 'ai' | 'user';
  name?: string;
}

/**
 * One line of dialogue (Design System v2): the character's line is a plain
 * surface card, the learner's is action-soft. The line itself is 18px.
 */
export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, sender, name }) => {
  const isAI = sender === 'ai';
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className={`flex w-full flex-col gap-1.5 rounded-card border p-5 ${
        isAI ? 'border-hairline bg-surface' : 'border-transparent bg-action-soft'
      }`}
    >
      {name && <span className="text-eyebrow uppercase text-ink-subtle">{name}</span>}
      <p className={`text-subtitle !font-normal leading-relaxed ${isAI ? 'text-ink' : 'text-action-text'}`}>
        {isAI ? text : `“${text}”`}
      </p>
    </motion.div>
  );
};
