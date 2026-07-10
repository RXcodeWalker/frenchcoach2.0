import { describe, expect, it } from 'vitest';
import { toCsv } from '../csv';

describe('toCsv', () => {
  it('produces a simple CSV with header row', () => {
    const csv = toCsv(['a', 'b'], [{ a: '1', b: '2' }]);
    expect(csv).toBe('"a","b"\r\n"1","2"\r\n');
  });

  it('escapes embedded commas', () => {
    const csv = toCsv(['justification'], [{ justification: 'Good, but errors present' }]);
    expect(csv).toBe('"justification"\r\n"Good, but errors present"\r\n');
  });

  it('escapes embedded double quotes by doubling them', () => {
    const csv = toCsv(['justification'], [{ justification: 'The candidate said "bonjour"' }]);
    expect(csv).toBe('"justification"\r\n"The candidate said ""bonjour"""\r\n');
  });

  it('escapes embedded newlines within a field', () => {
    const csv = toCsv(['justification'], [{ justification: 'Line one.\nLine two.' }]);
    expect(csv).toBe('"justification"\r\n"Line one.\nLine two."\r\n');
  });

  it('handles realistic multi-sentence justification text with commas, quotes, and newlines together', () => {
    const justification =
      'Candidate said "je voudrais, s\'il vous plaît" — communication is clear,\nbut structures are simple.';
    const csv = toCsv(['justification'], [{ justification }]);

    expect(csv).toContain('""je voudrais, s\'il vous plaît""');
    expect(csv.split('\r\n')).toHaveLength(3); // header + 1 data row + trailing empty
  });

  it('renders arrays (quoted evidence) joined with a semicolon', () => {
    const csv = toCsv(['quotedEvidence'], [{ quotedEvidence: ['Bonjour madame', 'deux croissants'] }]);
    expect(csv).toBe('"quotedEvidence"\r\n"Bonjour madame; deux croissants"\r\n');
  });

  it('renders null/undefined as an empty field', () => {
    const csv = toCsv(['teacherMark'], [{ teacherMark: null }]);
    expect(csv).toBe('"teacherMark"\r\n""\r\n');
  });

  it('renders multiple rows in order', () => {
    const csv = toCsv(['id'], [{ id: '1' }, { id: '2' }]);
    expect(csv).toBe('"id"\r\n"1"\r\n"2"\r\n');
  });
});
