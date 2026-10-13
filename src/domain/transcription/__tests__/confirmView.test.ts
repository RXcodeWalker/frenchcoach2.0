import { describe, it, expect } from 'vitest';
import { applyChoices, buildConfirmModel, buildLearnPrompt, isPromptEcho } from '../confirmView';

describe('buildLearnPrompt', () => {
  it('puts the question first and earlier answers after it, oldest first', () => {
    expect(buildLearnPrompt(' Que fais-tu ? ', ['Je joue au foot.', 'Je lis.'])).toBe('Que fais-tu ?\nJe joue au foot.\nJe lis.');
  });
  it('keeps the question and the newest answers when space runs out, and stays within 1200 characters', () => {
    const old = 'a'.repeat(700);
    const mid = 'b'.repeat(400);
    const recent = 'c'.repeat(300);
    const p = buildLearnPrompt('Question ?', [old, mid, recent]);
    expect(p.length).toBeLessThanOrEqual(1200);
    expect(p.startsWith('Question ?\n')).toBe(true);
    expect(p).toContain(recent);
    expect(p).not.toContain(old);
  });
  it('never carries an answer to the current question: only what the caller passes is included', () => {
    expect(buildLearnPrompt('Q ?', [])).toBe('Q ?');
  });
});

describe('isPromptEcho', () => {
  it('matches the question regardless of case and punctuation, and nothing else', () => {
    expect(isPromptEcho('avez-vous des animaux', 'Avez-vous des animaux ?')).toBe(true);
    expect(isPromptEcho("J'ai un chien.", 'Avez-vous des animaux ?')).toBe(false);
    expect(isPromptEcho('', '')).toBe(false);
  });
});

describe('buildConfirmModel', () => {
  it('uses Whisper as primary with Chrome as the second opinion, and underlines a Category B disagreement', () => {
    const m = buildConfirmModel({ whisperText: 'Ils sont un chien.', chromeText: 'ils ont un chien' });
    expect(m.source).toBe('whisper');
    expect(m.singleRecogniser).toBe(false);
    expect(m.spans).toHaveLength(1);
    expect(m.spans[0]).toMatchObject({ kind: 'nearHomophone', start: 1, end: 2, shownWords: ['sont'], alternatives: ['ont'] });
    expect(m.pieces.map((p) => p.spanId)).toEqual([null, 0, null, null]);
  });

  it('shows Category A words in their context-consistent spelling without calling it a disagreement', () => {
    const m = buildConfirmModel({ whisperText: 'Ils mange à midi', chromeText: 'ils mangent à midi' });
    expect(m.displayText).toBe('Ils mangent à midi');
    expect(m.spans).toEqual([]);
    expect(m.primaryText).toBe('Ils mange à midi');
  });

  it('falls back to Chrome as the only recogniser, underlining Category B words with their partners', () => {
    const m = buildConfirmModel({ whisperText: null, chromeText: 'elle veut un chien', fallbackReason: 'asr-failed' });
    expect(m.source).toBe('chrome');
    expect(m.fallbackReason).toBe('asr-failed');
    expect(m.singleRecogniser).toBe(true);
    expect(m.spans.map((s) => [s.shownWords[0], s.alternatives, s.origin])).toEqual([['un', ['en'], 'single-recogniser']]);
  });

  it('treats blank Whisper text as a fallback, and gives nothing to underline for an empty answer', () => {
    const m = buildConfirmModel({ whisperText: '  ', chromeText: '' });
    expect(m.source).toBe('chrome');
    expect(m.displayText).toBe('');
    expect(m.spans).toEqual([]);
  });

  it('does not underline a word only the other recogniser heard', () => {
    const m = buildConfirmModel({ whisperText: 'Je mange le matin', chromeText: 'je mange du pain le matin' });
    expect(m.spans).toEqual([]);
    expect(m.alignment.spans).toHaveLength(1);
  });

  it('keeps stand-alone punctuation as a piece', () => {
    const m = buildConfirmModel({ whisperText: 'Vous aimez le chocolat ?', chromeText: 'vous aimez le chocolat' });
    expect(m.pieces.map((p) => p.text)).toEqual(['Vous', 'aimez', 'le', 'chocolat', '?']);
  });
});

describe('applyChoices', () => {
  const model = buildConfirmModel({ whisperText: 'Ils sont en chien.', chromeText: 'ils ont un chien' });

  it('returns the display text unchanged and not edited when nothing is swapped', () => {
    expect(applyChoices(model, {})).toEqual({ text: 'Ils sont en chien.', edited: false });
  });

  it('swaps one span for the other recogniser’s word, keeps the rest, and flags edited', () => {
    expect(applyChoices(model, { 0: 'ont' })).toEqual({ text: 'Ils ont en chien.', edited: true });
    expect(applyChoices(model, { 0: 'ont', 1: 'un' })).toEqual({ text: 'Ils ont un chien.', edited: true });
  });

  it('keeps capitalisation and edge punctuation of the swapped word', () => {
    const m = buildConfirmModel({ whisperText: 'En chien, je veux.', chromeText: 'un chien je veux' });
    expect(applyChoices(m, { 0: 'un' }).text).toBe('Un chien, je veux.');
  });

  it('is not edited when the chosen word is the one already shown', () => {
    expect(applyChoices(model, { 0: 'sont' })).toEqual({ text: 'Ils sont en chien.', edited: false });
  });

  it('replaces a multi-word span as a whole', () => {
    const m = buildConfirmModel({ whisperText: "J'ai douche.", chromeText: "j'ai deux chats" });
    expect(m.spans[0]).toMatchObject({ kind: 'different', start: 1, end: 2 });
    expect(applyChoices(m, { 0: 'deux chats' })).toEqual({ text: "J'ai deux chats.", edited: true });
  });
});
