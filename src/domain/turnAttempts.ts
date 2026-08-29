/**
 * Tracks async feedback resolution against redo-able turns for Story Mode and
 * Scenario Mode. A turn's identity is its `turnKey`; every submit/redo of
 * that key gets a fresh monotonic `attemptSeq`, and only the resolution whose
 * `attemptSeq` still matches the latest one issued for that key is allowed to
 * mutate state or trigger orchestration — see i-don-t-like-the-witty-owl.md.
 */

export interface AttemptRecord<TQuestion, TLanguage> {
  attemptSeq: number;
  transcript: string;
  question: TQuestion;
  locked: boolean;
  status: 'pending' | 'resolved';
  language: TLanguage | null;
  orchestrated: boolean;
  retryCount: number;
}

export const MAX_REDOS = 2;

export class TurnAttemptTracker<TQuestion, TLanguage> {
  private records = new Map<number, AttemptRecord<TQuestion, TLanguage>>();
  private nextSeq = 1;

  begin(turnKey: number, transcript: string, question: TQuestion, isRedo: boolean): number {
    const attemptSeq = this.nextSeq++;
    const prev = this.records.get(turnKey);
    const retryCount = isRedo ? (prev?.retryCount ?? 0) + 1 : prev?.retryCount ?? 0;
    this.records.set(turnKey, {
      attemptSeq,
      transcript,
      question,
      locked: false,
      status: 'pending',
      language: null,
      orchestrated: false,
      retryCount,
    });
    return attemptSeq;
  }

  canRedo(turnKey: number): boolean {
    const rec = this.records.get(turnKey);
    if (!rec) return false;
    return !rec.locked && rec.retryCount < MAX_REDOS;
  }

  /** null return = stale, caller must discard the result it was about to apply. */
  resolve(turnKey: number, attemptSeq: number, language: TLanguage): AttemptRecord<TQuestion, TLanguage> | null {
    const rec = this.records.get(turnKey);
    if (!rec || rec.attemptSeq !== attemptSeq) return null;
    rec.status = 'resolved';
    rec.language = language;
    return this.tryOrchestrate(rec);
  }

  /** null return = not ready to orchestrate yet (or already locked/orchestrated). */
  lock(turnKey: number): AttemptRecord<TQuestion, TLanguage> | null {
    const rec = this.records.get(turnKey);
    if (!rec || rec.locked) return null;
    rec.locked = true;
    return this.tryOrchestrate(rec);
  }

  get(turnKey: number): Readonly<AttemptRecord<TQuestion, TLanguage>> | undefined {
    return this.records.get(turnKey);
  }

  private tryOrchestrate(rec: AttemptRecord<TQuestion, TLanguage>): AttemptRecord<TQuestion, TLanguage> | null {
    if (!rec.locked || rec.status !== 'resolved' || rec.language === null || rec.orchestrated) return null;
    rec.orchestrated = true;
    return rec;
  }
}
