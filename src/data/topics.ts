import type { Topic } from '../types';
import { QUESTION_COUNT_BY_TOPIC } from './questionIds';

// Keys match the old repo, so question topicKeys are consistent.
/**
 * The Learn topics. Kept apart from the question bank (`questions.ts`, ~1 MB,
 * which re-exports this) so a screen that only shows topic names — Home,
 * Progress, the saved-answers list — doesn't have to download the bank.
 * `questionsCount` is filled from the generated `questionIds.ts`.
 */
export const TOPICS: Topic[] = [
  { key: 'school',      label: "L'école",          labelEn: 'School & Education',         icon: '🎓', color: '#3b82f6', description: "Parle de l'école, tes matières et ta routine.",         questionsCount: 0 },
  { key: 'hobbies',     label: 'Les loisirs',       labelEn: 'Hobbies & Free Time',        icon: '⚽', color: '#10b981', description: 'Tes activités préférées et comment tu passes ton temps.', questionsCount: 0 },
  { key: 'family',      label: 'La famille',        labelEn: 'Family & Friends',           icon: '👨‍👩‍👧‍👦', color: '#f59e0b', description: 'Décris ta famille et tes amis proches.',               questionsCount: 0 },
  { key: 'holidays',    label: 'Les vacances',      labelEn: 'Holidays & Travel',          icon: '✈️', color: '#8b5cf6', description: 'Tes voyages, destinations et vacances idéales.',        questionsCount: 0 },
  { key: 'home',        label: 'La maison',         labelEn: 'Home & Town',                icon: '🏠', color: '#ec4899', description: 'Parle de chez toi et de ta ville ou région.',           questionsCount: 0 },
  { key: 'future',      label: "L'avenir",          labelEn: 'Future Plans',               icon: '🚀', color: '#0ea5e9', description: 'Tes projets pour le futur et ta carrière.',             questionsCount: 0 },
  { key: 'food',        label: 'La nourriture',     labelEn: 'Food & Health',              icon: '🥐', color: '#f97316', description: 'Ce que tu manges, ta santé et tes habitudes.',          questionsCount: 0 },
  { key: 'environment', label: "L'environnement",   labelEn: 'Environment & Technology',   icon: '🌍', color: '#14b8a6', description: "L'environnement, la technologie et la société.",        questionsCount: 0 },
  { key: 'clothes',     label: 'Les vêtements',     labelEn: 'Clothing & Fashion',         icon: '👕', color: '#d946ef', description: 'La mode, les vêtements et le style personnel.',         questionsCount: 0 },
  { key: 'animals',     label: 'Les animaux',       labelEn: 'Animals & Nature',           icon: '🐾', color: '#84cc16', description: 'Les animaux domestiques, sauvages et la nature.',       questionsCount: 0 },
  { key: 'transport',   label: 'Les transports',    labelEn: 'Transport & Getting Around', icon: '🚆', color: '#6366f1', description: 'Les moyens de transport et les déplacements.',         questionsCount: 0 },
  { key: 'jobs',        label: 'Les métiers',       labelEn: 'Jobs & Professions',         icon: '👔', color: '#0891b2', description: 'Les métiers, le monde du travail et les ambitions.',    questionsCount: 0 },
  { key: 'sports',      label: 'Les sports',        labelEn: 'Sports & Fitness',           icon: '🏅', color: '#22c55e', description: 'Le sport, la forme physique et la compétition.',       questionsCount: 0 },
  { key: 'emotions',    label: 'Les émotions',      labelEn: 'Emotions & Feelings',        icon: '💛', color: '#eab308', description: 'Exprimer tes sentiments et ton état d\'esprit.',       questionsCount: 0 },
  { key: 'arts',        label: 'Les arts',          labelEn: 'Arts & Entertainment',       icon: '🎨', color: '#e11d48', description: 'La musique, le cinéma, la lecture et la créativité.',  questionsCount: 0 },
  { key: 'shopping',    label: 'Les achats',        labelEn: 'Shopping & Money',           icon: '🛍️', color: '#7c3aed', description: 'Faire des courses, l\'argent et la consommation.',     questionsCount: 0 },

  // Advanced Topics
  { key: 'pro',         label: "L'Espace Pro",      labelEn: 'Professional French',        icon: '💼', color: '#64748b', description: 'Le monde du travail, les entretiens et la carrière.', isAdvanced: true, questionsCount: 0 },
  { key: 'culture',     label: 'Francophonie',      labelEn: 'Culture & Traditions',       icon: '🎭', color: '#a855f7', description: 'Les traditions, les festivals et la culture francophone.', isAdvanced: true, questionsCount: 0 },
  { key: 'lifestyle',   label: 'Mode de Vie',       labelEn: 'Lifestyle & Trends',         icon: '👗', color: '#ec4899', description: 'La mode, les tendances et le style de vie moderne.', isAdvanced: true, questionsCount: 0 },
  { key: 'news',        label: 'Actualités',        labelEn: 'Current Affairs',            icon: '🗞️', color: '#f59e0b', description: 'Les infos, les débats et les enjeux de société.', isAdvanced: true, questionsCount: 0 },
  { key: 'slang',       label: "L'Argot",           labelEn: 'Slang & Idioms',             icon: '💬', color: '#ef4444', description: 'Apprends le français familier et les expressions.', isAdvanced: true, questionsCount: 0 },
  { key: 'survival',    label: 'Survie',            labelEn: 'Survival French',            icon: '🚨', color: '#f43f5e', description: 'Gère les situations urgentes et imprévues.', isAdvanced: true, questionsCount: 0 },
  { key: 'debate',      label: 'Le Grand Débat',    labelEn: 'Rhetoric & Debate',          icon: '⚖️', color: '#10b981', description: 'Apprends à argumenter et à convaincre.', isAdvanced: true, questionsCount: 0 },
  { key: 'art',         label: 'Art & Tableaux',    labelEn: 'Visual Storytelling',        icon: '🖼️', color: '#06b6d4', description: 'Décris des œuvres d\'art et des scènes visuelles.', isAdvanced: true, questionsCount: 0 },
];

for (const topic of TOPICS) topic.questionsCount = QUESTION_COUNT_BY_TOPIC[topic.key] ?? 0;
