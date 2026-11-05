/**
 * Learn answers recorded with no connection ("Saved answers").
 *
 * Offline, the browser's live captions don't work (Chrome sends the audio to
 * Google) and nothing can be marked, but the microphone still records. Learn
 * keeps that recording here, on this device, and moves on. Back online,
 * `processSavedAnswers` uploads each one for transcription (Whisper, Learn's
 * `learn` purpose); the learner then opens it from `/learn/saved` and Learn
 * marks it through the normal path — the same allowance, XP, Session and
 * evidence as an answer given online. Nothing here is marked or scored.
 *
 * Stored in IndexedDB (audio is too big for localStorage), per account scope
 * (`userId` or `guest`), at most MAX_SAVED_ANSWERS per scope. Never synced,
 * never sent anywhere except `/api/transcribe` (via the processor) — the audio
 * is deleted as soon as the answer has been marked or the learner deletes it.
 */

export type SavedAnswerStatus =
  /** Not uploaded yet (offline, or the last upload failed). */
  | 'waiting'
  /** Transcribed: ready for feedback. */
  | 'ready'
  /** Uploaded, but no speech could be read from it. */
  | 'unclear';

export interface SavedAnswer {
  id: string;
  /** Account scope: the Supabase user id, or 'guest'. */
  scope: string;
  questionId: string;
  topicKey: string;
  questionText: string;
  audio: ArrayBuffer;
  mimeType: string;
  durationSec: number;
  recordedAt: string;
  status: SavedAnswerStatus;
  transcript: string | null;
  uploadAttempts: number;
}

export type NewSavedAnswer = Pick<SavedAnswer, 'scope' | 'questionId' | 'topicKey' | 'questionText' | 'durationSec'> & {
  audio: Blob;
};

/** Enough for a bus ride; each is ~50–300 KB of compressed audio. */
export const MAX_SAVED_ANSWERS = 20;

export class SavedAnswersFullError extends Error {
  constructor() {
    super(`At most ${MAX_SAVED_ANSWERS} answers can wait for a connection`);
    this.name = 'SavedAnswersFullError';
  }
}

export interface SavedAnswerBackend {
  put(item: SavedAnswer): Promise<void>;
  get(id: string): Promise<SavedAnswer | undefined>;
  all(): Promise<SavedAnswer[]>;
  delete(id: string): Promise<void>;
}

// ── Backends ──────────────────────────────────────────────────────────────────

const DB_NAME = 'frenchcoach-offline';
const STORE = 'savedAnswers';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function indexedDbBackend(factory: IDBFactory = indexedDB): SavedAnswerBackend {
  let dbPromise: Promise<IDBDatabase> | null = null;
  const db = () => {
    dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const open = factory.open(DB_NAME, 1);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => {
        dbPromise = null;
        reject(open.error);
      };
    });
    return dbPromise;
  };
  const tx = async (mode: IDBTransactionMode) => (await db()).transaction(STORE, mode).objectStore(STORE);
  return {
    async put(item) { await request((await tx('readwrite')).put(item)); },
    async get(id) { return request((await tx('readonly')).get(id)) as Promise<SavedAnswer | undefined>; },
    async all() { return request((await tx('readonly')).getAll()) as Promise<SavedAnswer[]>; },
    async delete(id) { await request((await tx('readwrite')).delete(id)); },
  };
}

export function memoryBackend(): SavedAnswerBackend {
  const items = new Map<string, SavedAnswer>();
  return {
    async put(item) { items.set(item.id, item); },
    async get(id) { return items.get(id); },
    async all() { return [...items.values()]; },
    async delete(id) { items.delete(id); },
  };
}

let backend: SavedAnswerBackend | null = null;
function store(): SavedAnswerBackend {
  backend ??= typeof indexedDB !== 'undefined' ? indexedDbBackend() : memoryBackend();
  return backend;
}

/** Tests only. */
export function setSavedAnswerBackend(next: SavedAnswerBackend | null): void {
  backend = next;
}

// ── Change notifications (the list, the banner and Learn re-read on change) ────

const listeners = new Set<() => void>();
export function subscribeSavedAnswers(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function changed(): void {
  for (const fn of listeners) fn();
}

// ── API ──────────────────────────────────────────────────────────────────────

/** Oldest first. */
export async function listSavedAnswers(scope: string): Promise<SavedAnswer[]> {
  try {
    const all = await store().all();
    return all.filter((a) => a.scope === scope).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  } catch {
    return [];
  }
}

export async function getSavedAnswer(id: string, scope: string): Promise<SavedAnswer | null> {
  try {
    const item = await store().get(id);
    return item && item.scope === scope ? item : null;
  } catch {
    return null;
  }
}

export async function saveAnswer(input: NewSavedAnswer, now: Date = new Date()): Promise<SavedAnswer> {
  const existing = await listSavedAnswers(input.scope);
  if (existing.length >= MAX_SAVED_ANSWERS) throw new SavedAnswersFullError();
  const item: SavedAnswer = {
    id: `saved-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    scope: input.scope,
    questionId: input.questionId,
    topicKey: input.topicKey,
    questionText: input.questionText,
    audio: await input.audio.arrayBuffer(),
    mimeType: input.audio.type || 'audio/webm',
    durationSec: input.durationSec,
    recordedAt: now.toISOString(),
    status: 'waiting',
    transcript: null,
    uploadAttempts: 0,
  };
  await store().put(item);
  changed();
  return item;
}

export async function updateSavedAnswer(id: string, patch: Partial<Pick<SavedAnswer, 'status' | 'transcript' | 'uploadAttempts'>>): Promise<void> {
  const item = await store().get(id);
  if (!item) return;
  await store().put({ ...item, ...patch });
  changed();
}

export async function deleteSavedAnswer(id: string): Promise<void> {
  try {
    await store().delete(id);
  } finally {
    changed();
  }
}

/** Every saved answer of one scope (account deletion). */
export async function deleteSavedAnswersFor(scope: string): Promise<void> {
  for (const item of await listSavedAnswers(scope)) await store().delete(item.id);
  changed();
}

export function savedAnswerBlob(item: SavedAnswer): Blob {
  return new Blob([item.audio], { type: item.mimeType });
}
