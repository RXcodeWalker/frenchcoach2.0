import { describe, it, expect } from 'vitest';
import { diffWords, reconstructAfter, attachChangeAnnotations, type ChangeAnnotation } from '../buildChanges';

describe('diffWords', () => {
  it('produces no ops for identical strings beyond a single equal run', () => {
    const ops = diffWords('Je vais au parc.', 'Je vais au parc.');
    expect(ops.every((op) => op.type === 'equal')).toBe(true);
  });

  it('merges a single-word correction into one replace op, not delete+insert', () => {
    const ops = diffWords('Je va au parc.', 'Je vais au parc.');
    const nonEqual = ops.filter((op) => op.type !== 'equal');
    expect(nonEqual).toHaveLength(1);
    expect(nonEqual[0].type).toBe('replace');
    expect(nonEqual[0].beforeText).toBe('va');
    expect(nonEqual[0].afterText).toBe('vais');
  });

  it('reconstructs improved_answer exactly from the ops (round-trip)', () => {
    const after = "J'ai mangé une pomme rouge hier.";
    const ops = diffWords('Je mange pomme rouge hier.', after);
    expect(reconstructAfter(ops)).toBe(after);
  });

  it('detects a pure insertion', () => {
    const ops = diffWords('Je vais parc.', 'Je vais au parc.');
    const nonEqual = ops.filter((op) => op.type !== 'equal');
    expect(nonEqual).toHaveLength(1);
    expect(nonEqual[0].type).toBe('insert');
    expect(nonEqual[0].afterText).toBe('au ');
  });

  it('detects a pure deletion', () => {
    const ops = diffWords('Je vais très au parc.', 'Je vais au parc.');
    const nonEqual = ops.filter((op) => op.type !== 'equal');
    expect(nonEqual).toHaveLength(1);
    expect(nonEqual[0].type).toBe('delete');
    expect(nonEqual[0].beforeText).toBe('très ');
  });

  it('assigns beforeStart/beforeEnd as word indices into the transcript', () => {
    const ops = diffWords('Je va au parc.', 'Je vais au parc.');
    const replaceOp = ops.find((op) => op.type === 'replace')!;
    // "Je" is word 0, "va" is word 1 -> beforeStart=1, beforeEnd=2
    expect(replaceOp.beforeStart).toBe(1);
    expect(replaceOp.beforeEnd).toBe(2);
  });
});

function annotation(overrides: Partial<ChangeAnnotation>): ChangeAnnotation {
  return { quote: '', category: 'grammar', explanation: 'because', ...overrides };
}

describe('attachChangeAnnotations — unique quote', () => {
  it('attaches to the correct diff op when the quote is unique across ops', () => {
    const ops = diffWords('Je va au magasin et je va au parc.', 'Je vais au magasin et je vais au parc.');
    // both replace ops have beforeText "va " — not unique by itself, so use a
    // distinguishing case: a single unique replacement elsewhere.
    const opsSingle = diffWords('Je va au parc.', 'Je vais au parc.');
    const result = attachChangeAnnotations(opsSingle, [annotation({ quote: 'va', explanation: 'present tense of aller' })]);
    const annotated = result.find((op) => op.annotation);
    expect(annotated?.beforeText).toBe('va');
    expect(annotated?.annotation?.explanation).toBe('present tense of aller');
    void ops;
  });
});

describe('attachChangeAnnotations — repeated identical changed phrase', () => {
  it('no context -> annotation dropped; diff still renders unlabelled in full', () => {
    const ops = diffWords('Je va au magasin et je va au parc.', 'Je vais au magasin et je vais au parc.');
    const result = attachChangeAnnotations(ops, [annotation({ quote: 'va' })]);
    expect(result.every((op) => !op.annotation)).toBe(true);
    // The diff itself is untouched — same ops, same text, nothing dropped from the diff.
    expect(reconstructAfter(result)).toBe('Je vais au magasin et je vais au parc.');
  });

  it('distinguishing quoteContext -> attaches to the occurrence the context identifies', () => {
    const before = 'Je va au magasin le lundi matin avec ma mère et je va au parc le vendredi soir avec mon père.';
    const after = 'Je vais au magasin le lundi matin avec ma mère et je vais au parc le vendredi soir avec mon père.';
    const ops = diffWords(before, after);
    const result = attachChangeAnnotations(ops, [
      annotation({ quote: 'va', quoteContext: 'magasin', explanation: 'first one' }),
    ]);
    const annotated = result.filter((op) => op.annotation);
    expect(annotated).toHaveLength(1);
    expect(annotated[0].beforeText).toBe('va');
    // Confirm it's the occurrence near "magasin", not "parc".
    const idx = result.indexOf(annotated[0]);
    const nearbyText = result.slice(Math.max(0, idx - 6), idx + 7).map((op) => op.beforeText).join('');
    expect(nearbyText).toContain('magasin');
  });

  it('ambiguous repeated phrase with non-discriminating context -> annotation dropped, diff still renders in full', () => {
    const ops = diffWords('Je va au magasin et je va au magasin.', 'Je vais au magasin et je vais au magasin.');
    const result = attachChangeAnnotations(ops, [
      annotation({ quote: 'va', quoteContext: 'magasin' }), // "magasin" appears near both occurrences
    ]);
    expect(result.every((op) => !op.annotation)).toBe(true);
    expect(reconstructAfter(result)).toBe('Je vais au magasin et je vais au magasin.');
  });
});

describe('attachChangeAnnotations — targeting resolves against diff operations, not string occurrences', () => {
  it('a quote appearing in improved_answer but not in any diff op beforeText never attaches', () => {
    const ops = diffWords('Je va au parc.', 'Je vais au parc.');
    // "parc" is present in both before and after (an 'equal' op) — never a
    // valid annotation target since it names no change.
    const result = attachChangeAnnotations(ops, [annotation({ quote: 'parc' })]);
    expect(result.every((op) => !op.annotation)).toBe(true);
  });
});
