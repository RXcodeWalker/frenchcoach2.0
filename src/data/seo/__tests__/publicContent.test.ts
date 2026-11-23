import { describe, expect, it } from 'vitest';
import { TOPIC_PAGES } from '../topics';
import { ROLE_PLAY_EXAMPLES } from '../rolePlays';
import { ANSWER_KINDS } from '../types';
import { AREA_NAMES, conversationFor } from '../syllabus';
import { PUBLIC_CONTENT_HUB_PATHS, PUBLIC_CONTENT_PAGE_PATHS } from '../paths';
import { SUB_TOPICS_BY_AREA } from '../../exam/bank/types';
import { TOPICS } from '../../topics';
import { QUESTIONS } from '../../questions';
import { STORY_CARDS } from '../../storyCards';
import { TOPIC_AREA_NAMES } from '../../../features/examGuide/guideContent';
import { topicFromDeepLink } from '../../../features/learn/topicDeepLink';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('public topic pages (docs/systems/public-seo-pages.md)', () => {
  it('covers every core Learn topic exactly once, and leads each into its own Learn topic', () => {
    const core = TOPICS.filter((t) => !t.isAdvanced).map((t) => t.key).sort();
    expect(TOPIC_PAGES.map((t) => t.learnKey).sort()).toEqual(core);
    for (const t of TOPIC_PAGES) {
      expect(topicFromDeepLink(t.learnKey), `${t.slug} deep link`).not.toBeNull();
      const learn = TOPICS.find((x) => x.key === t.learnKey)!;
      expect(t.frTitle, `${t.slug} French label`).toBe(learn.label);
    }
  });

  it('has unique, URL-safe slugs', () => {
    const slugs = TOPIC_PAGES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it.each(TOPIC_PAGES.map((t) => [t.slug, t] as const))('%s: one answer of every kind, all annotated with verbatim fragments', (_slug, t) => {
    expect(t.answers.map((a) => a.kind).sort()).toEqual([...ANSWER_KINDS].sort());
    for (const a of t.answers) {
      expect(words(a.answer), `${t.slug}/${a.kind} length`).toBeGreaterThanOrEqual(45);
      expect(words(a.answer), `${t.slug}/${a.kind} length`).toBeLessThanOrEqual(100);
      expect(a.highlights.length, `${t.slug}/${a.kind} highlights`).toBeGreaterThanOrEqual(2);
      expect(a.question.endsWith('.') || a.question.endsWith('?'), a.question).toBe(true);
      expect(a.questionEn.length).toBeGreaterThan(10);
      for (const h of a.highlights) {
        expect(a.answer, `${t.slug}/${a.kind}: "${h.fr}" must appear in the answer`).toContain(h.fr);
        expect(h.note.length).toBeGreaterThan(20);
      }
    }
  });

  it.each(TOPIC_PAGES.map((t) => [t.slug, t] as const))('%s: shape, syllabus mapping and links', (_slug, t) => {
    expect(t.tips).toHaveLength(3);
    expect(t.vocab).toHaveLength(8);
    expect(t.moreQuestions.length).toBeGreaterThanOrEqual(4);
    expect(t.related).toHaveLength(3);
    for (const r of t.related) {
      expect(r).not.toBe(t.slug);
      expect(TOPIC_PAGES.some((x) => x.slug === r), `${t.slug} → ${r}`).toBe(true);
    }
    // Every sub-topic is the syllabus's own wording, in one of the page's areas.
    for (const st of t.subTopics) {
      const inArea = t.areas.some((a) => (SUB_TOPICS_BY_AREA[a] as readonly string[]).includes(st));
      expect(inArea, `${t.slug}: "${st}" is not a sub-topic of ${t.areas.join('/')}`).toBe(true);
    }
    // …and every area on the page is backed by at least one of them.
    for (const a of t.areas) {
      const backed = t.subTopics.some((st) => (SUB_TOPICS_BY_AREA[a] as readonly string[]).includes(st));
      expect(backed, `${t.slug}: area ${a} has no sub-topic`).toBe(true);
    }
  });

  it('"more questions" are real Learn questions from the same topic (so "practise in Learn" is true)', () => {
    for (const t of TOPIC_PAGES) {
      for (const q of t.moreQuestions) {
        const found = QUESTIONS.find((x) => x.text === q);
        expect(found, `${t.slug}: "${q}" is not in the Learn bank`).toBeDefined();
        expect(found!.topicKey, `${t.slug}: "${q}"`).toBe(t.learnKey);
      }
    }
  });

  it('keeps the area names and the topic-conversation rule in step with the exam guide', () => {
    expect(AREA_NAMES).toEqual(TOPIC_AREA_NAMES);
    expect(conversationFor(['A', 'B'])).toBe('first');
    expect(conversationFor(['C', 'D', 'E'])).toBe('second');
    expect(conversationFor(['B', 'C'])).toBe('either');
  });
});

describe('public role-play examples', () => {
  it('has unique slugs and reads only exam-style drill cards (never an exam bank set or a past paper)', () => {
    const slugs = ROLE_PLAY_EXAMPLES.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ROLE_PLAY_EXAMPLES.map((r) => r.cardId)).size).toBe(ROLE_PLAY_EXAMPLES.length);
    for (const r of ROLE_PLAY_EXAMPLES) {
      const card = STORY_CARDS.find((c) => c.id === r.cardId);
      expect(card, `${r.slug}: card ${r.cardId}`).toBeDefined();
      expect(card!.guided, `${r.slug}: an exam-style card, not an older task card`).toBe(false);
      expect(card!.paperId, r.slug).toBeNull();
      expect(r.situation.length, r.slug).toBeGreaterThan(20);
    }
  });

  it.each(ROLE_PLAY_EXAMPLES.map((r) => [r.slug, r] as const))('%s: a model reply for exactly the card’s tasks', (_slug, r) => {
    const card = STORY_CARDS.find((c) => c.id === r.cardId)!;
    expect(r.tasks.map((t) => t.taskId)).toEqual(card.tasks.map((t) => t.taskId));
    for (const t of r.tasks) {
      expect(words(t.answer), `${r.slug} task ${t.taskId}`).toBeGreaterThanOrEqual(5);
      // Role-play replies are short and complete: never a monologue.
      expect(words(t.answer), `${r.slug} task ${t.taskId}`).toBeLessThanOrEqual(30);
      expect(t.note.length).toBeGreaterThan(20);
    }
    expect(r.phrases).toHaveLength(5);
    expect(r.related).toHaveLength(2);
    for (const rel of r.related) {
      expect(rel).not.toBe(r.slug);
      expect(ROLE_PLAY_EXAMPLES.some((x) => x.slug === rel)).toBe(true);
    }
  });

  it('addresses staff and strangers as vous: no tu forms in the replies', () => {
    for (const r of ROLE_PLAY_EXAMPLES) {
      expect(r.register).toBe('vous');
      for (const t of r.tasks) expect(t.answer, `${r.slug} task ${t.taskId}`).not.toMatch(/\b(tu|ton|ta|tes|toi)\b/i);
    }
  });
});

describe('public content: paths', () => {
  it('lists one path per page, with no duplicates and none outside /igcse-french-speaking/', () => {
    const all = [...PUBLIC_CONTENT_HUB_PATHS, ...PUBLIC_CONTENT_PAGE_PATHS];
    expect(new Set(all).size).toBe(all.length);
    expect(PUBLIC_CONTENT_PAGE_PATHS).toHaveLength(TOPIC_PAGES.length + ROLE_PLAY_EXAMPLES.length);
    for (const p of all) expect(p.startsWith('/igcse-french-speaking/')).toBe(true);
  });

  it('makes no promises it cannot keep (no guarantee, no past-paper or real-question claims)', () => {
    const text = JSON.stringify([TOPIC_PAGES, ROLE_PLAY_EXAMPLES]);
    expect(text).not.toMatch(/guarantee|past paper|real exam question|official (mark|grade|answer)|will appear/i);
  });
});
