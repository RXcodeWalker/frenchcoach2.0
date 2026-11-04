import { TOPICS } from '../../data/gameData';
import { STORY_CARDS } from '../../data/storyCards';

export const EYEBROW = 'text-eyebrow uppercase text-ink-subtle';

/** How far back the class view reads (the RPCs also never go before a student's join date). */
export const CLASS_WINDOW_DAYS = 180;

export function topicName(key: string | null): string {
  if (!key) return 'Other';
  const t = TOPICS.find((x) => x.key === key);
  return t ? t.labelEn || t.label : key;
}

export function cardTitle(id: string | null): string {
  if (!id) return 'Role play';
  return STORY_CARDS.find((c) => c.id === id)?.title ?? id;
}

export function relativeDay(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Never';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '—';
  const days = Math.floor((now.getTime() - t.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function shortDate(iso: string): string {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function joinLink(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/join/${code}`;
}
