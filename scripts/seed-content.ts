/**
 * One-time migration of the TypeScript content bundles into Supabase.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/seed-content.ts
 *
 * - Reads TOPICS, QUESTIONS, EXAM_SETS, OFFLINE_SCENARIOS from src/data.
 * - Validates each entry against the Zod schemas (fails fast on invalid data).
 * - Upserts via the service key with status='published'.
 * - Idempotent (onConflict: 'id' / 'key').
 */
import { createClient } from '@supabase/supabase-js';
import { TOPICS, QUESTIONS, EXAM_SETS } from '../src/data/questions';
import { OFFLINE_SCENARIOS } from '../src/data/scenarios/offlineScenarios';
import { questionSchema, scenarioSchema } from '../src/schemas/content';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function seedTopics() {
  const rows = TOPICS.map((t, i) => ({
    key: t.key, label: t.label, label_en: t.labelEn, icon: t.icon, color: t.color,
    description: t.description, locked: t.locked ?? false, is_advanced: t.isAdvanced ?? false,
    sort_order: i, status: 'published' as const,
  }));
  const { error } = await db.from('topics').upsert(rows, { onConflict: 'key' });
  if (error) throw new Error(`topics: ${error.message}`);
  console.log(`✓ ${rows.length} topics`);
}

async function seedQuestions() {
  const rows = QUESTIONS.map(q => {
    const candidate = {
      id: q.id, topic_key: q.topicKey, text: q.text, hint: q.hint,
      difficulty: q.difficulty, follow_ups: q.followUps, model_answer: q.modelAnswer,
      key_vocab: q.keyVocab, is_past_paper: q.isPastPaper ?? false,
      year: q.year, paper_code: q.paperCode, status: 'published' as const,
    };
    const parsed = questionSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(`question ${q.id} invalid: ${parsed.error.issues.map(i => i.message).join('; ')}`);
    }
    return parsed.data;
  });
  // Upsert in chunks to stay well under payload limits.
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('questions').upsert(rows.slice(i, i + 200), { onConflict: 'id' });
    if (error) throw new Error(`questions: ${error.message}`);
  }
  console.log(`✓ ${rows.length} questions`);
}

async function seedScenarios() {
  const rows = OFFLINE_SCENARIOS.map(s => {
    const candidate = {
      id: s.id, emoji: s.emoji, title: s.title, description: s.description,
      turns: s.turns, data: s.data, status: 'published' as const,
    };
    const parsed = scenarioSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(`scenario ${s.id} invalid: ${parsed.error.issues.map(i => i.message).join('; ')}`);
    }
    return parsed.data;
  });
  const { error } = await db.from('scenarios').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`scenarios: ${error.message}`);
  console.log(`✓ ${rows.length} scenarios`);
}

async function seedExamSets() {
  const rows = EXAM_SETS.map(e => ({
    id: e.id, label: e.label, question_ids: e.questions, status: 'published' as const,
  }));
  const { error } = await db.from('exam_sets').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`exam_sets: ${error.message}`);
  console.log(`✓ ${rows.length} exam sets`);
}

async function main() {
  console.log('Seeding content → Supabase…');
  await seedTopics();
  await seedQuestions();
  await seedScenarios();
  await seedExamSets();
  console.log('Done.');
}

main().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
