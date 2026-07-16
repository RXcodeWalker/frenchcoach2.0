/**
 * S11 content hash - the single reproducibility mechanism binding a
 * ScoringEnvelope.questionSetHash to exact question wording (architecture
 * doc §3.5). Standalone pure module depending only on SessionQuestionSet;
 * used by simulationSession.ts (replacing the '0'.repeat(64) stub), golden
 * tests, and re-implemented byte-for-byte in the Python seed script.
 *
 * Canonicalization spec is FROZEN alongside schemaVersion 'question-bank-v1'
 * (§3.5.1) - do not change field order, delimiters, the NFC step, or the
 * optional-slot rule without a new hash-scheme version. No JSON serializer is
 * used (JSON.stringify vs Python json.dumps are not byte-for-byte compatible
 * across ascii-escaping, separators, key collation, and number formatting);
 * instead this is a fixed positional field concatenation using reserved
 * ASCII control delimiters the validator forbids inside any field, so no
 * escaping is ever required.
 *
 * Uses Web Crypto (crypto.subtle) - available in both the browser runtime
 * (simulationSession.ts) and this project's Node/vitest test environment -
 * rather than node:crypto, which is Node-only.
 */

import type { SessionQuestionSet } from '../session/types';

/** U+001F unit separator - between fields within one record. */
const FIELD_SEP = String.fromCharCode(0x1f);
/** U+001E record separator - between questions/records. */
const RECORD_SEP = String.fromCharCode(0x1e);
/** U+001D group separator - between elements of a nested list (e.g. alternativeTexts). */
const GROUP_SEP = String.fromCharCode(0x1d);

function nfc(s: string): string {
  return s.normalize('NFC');
}

/**
 * Fixed literal tag for THIS hash-canonicalization scheme, frozen alongside
 * question-bank-v1 (§3.5.1). Deliberately NOT imported from bank/version.ts —
 * hashQuestionSet operates on the engine-level SessionQuestionSet (which has
 * no schemaVersion field of its own and is not exclusive to bank-authored
 * content), so this module stays standalone per the §7 component-boundary
 * rule. A change to this literal is itself a hash-breaking change.
 */
const CANONICALIZATION_SCHEME_VERSION = 'question-bank-v1';

/**
 * Builds the canonical byte stream for a SessionQuestionSet per the frozen
 * §3.5.1 spec: fixed positional field order (never sorted), NFC-normalized
 * strings, reserved-delimiter joining, UTF-8 encoding, no BOM.
 */
export function canonicalizeQuestionSet(set: SessionQuestionSet): Uint8Array {
  const tokens: string[] = [];

  tokens.push(CANONICALIZATION_SCHEME_VERSION);
  tokens.push(nfc(set.questionSetId));

  const questionRecords = set.questions.map((q) => {
    const fields = [
      nfc(q.questionId),
      nfc(q.part),
      nfc(q.mainText),
      q.alternativeTexts.map(nfc).join(GROUP_SEP),
      String(q.partsExpected ?? 1),
      q.secondPartText !== undefined ? nfc(q.secondPartText) : '',
      q.expectedTimeFrame !== undefined ? nfc(q.expectedTimeFrame) : '',
      q.topicArea !== undefined ? nfc(q.topicArea) : '',
    ];
    return fields.join(FIELD_SEP);
  });
  tokens.push(...questionRecords);

  tokens.push(nfc(set.furtherQuestions.topic1[0]));
  tokens.push(nfc(set.furtherQuestions.topic1[1]));
  tokens.push(nfc(set.furtherQuestions.topic2[0]));
  tokens.push(nfc(set.furtherQuestions.topic2[1]));

  const canonical = tokens.join(RECORD_SEP);
  return new TextEncoder().encode(canonical);
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** sha256 hex of the canonical bytes. */
export async function hashQuestionSet(set: SessionQuestionSet): Promise<string> {
  const bytes = canonicalizeQuestionSet(set);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}
