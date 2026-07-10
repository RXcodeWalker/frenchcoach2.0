/**
 * S4 hand-rolled RFC4180-ish CSV writer. No CSV library exists in package.json;
 * at Phase A's volume (10-15 transcripts x ~7 rows) a small writer is
 * proportionate — but justification/comment text is free-form prose that WILL
 * routinely contain commas/quotes/newlines, so every field is escaped
 * unconditionally rather than only when a special character is detected.
 */

function escapeField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(String).join('; ');
  return String(value);
}

/** Pure. rows must be plain objects with primitive/array-of-primitive values. */
export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [headers.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeField(stringifyCell(row[h]))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
