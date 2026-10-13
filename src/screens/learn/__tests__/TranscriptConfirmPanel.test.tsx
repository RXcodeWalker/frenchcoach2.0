// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AnswerTranscription } from '../../../features/learn/answerTranscription';
import { TranscriptConfirmPanel } from '../TranscriptConfirmPanel';

afterEach(cleanup);

const whisper = (primaryText: string, secondaryText: string): AnswerTranscription => ({
  primaryText,
  secondaryText,
  source: 'whisper',
  fallbackReason: null,
});

const liveOnly = (primaryText: string, fallbackReason: AnswerTranscription['fallbackReason'] = 'asr-failed'): AnswerTranscription => ({
  primaryText,
  secondaryText: '',
  source: 'live-captions',
  fallbackReason,
});

function setup(transcription: AnswerTranscription | null, checking = false) {
  const onConfirm = vi.fn();
  const onRerecord = vi.fn();
  render(<TranscriptConfirmPanel checking={checking} transcription={transcription} onConfirm={onConfirm} onRerecord={onRerecord} />);
  return { onConfirm, onRerecord };
}

describe('TranscriptConfirmPanel', () => {
  it('shows a status while the recording is being double-checked, with nothing to confirm', () => {
    setup(null, true);
    expect(screen.getByRole('status').textContent).toMatch(/double-checking/i);
    expect(screen.queryByText('Use this')).toBeNull();
  });

  it('underlines the words the two recognisers disagreed on', () => {
    setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    const words = screen.getAllByTestId('uncertain-word');
    expect(words.map((w) => w.textContent)).toEqual(['ont un']);
    expect(screen.getByTestId('heard-text').textContent).toBe('Ils ont un chien.');
  });

  it('underlines nothing when the recognisers agree', () => {
    setup(whisper('Ils ont un chien.', 'ils ont un chien'));
    expect(screen.queryAllByTestId('uncertain-word')).toHaveLength(0);
  });

  it('does not underline spellings that sound the same', () => {
    setup(whisper('Mes frères mangent beaucoup.', 'mes frères mange beaucoup'));
    expect(screen.queryAllByTestId('uncertain-word')).toHaveLength(0);
  });

  it('offers the other reading or a re-record when an underlined word is tapped', () => {
    const { onRerecord } = setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    expect(screen.queryByTestId('word-choice')).toBeNull();
    fireEvent.click(screen.getByTestId('uncertain-word'));
    const choice = screen.getByTestId('word-choice');
    expect(choice.textContent).toMatch(/sound alike/i);
    expect(screen.getByText('Use “sont en”')).toBeTruthy();
    fireEvent.click(screen.getAllByText('Re-record')[0]);
    expect(onRerecord).toHaveBeenCalledTimes(1);
  });

  it('swaps to the other reading, keeps it underlined so it can be undone, and confirms the swapped text as edited', () => {
    const { onConfirm } = setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    fireEvent.click(screen.getByTestId('uncertain-word'));
    fireEvent.click(screen.getByText('Use “sont en”'));
    expect(screen.getByTestId('heard-text').textContent).toBe('Ils sont en chien.');
    expect(screen.getByTestId('uncertain-word').textContent).toBe('sont en');

    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: 'Ils sont en chien.', edited: true, source: 'whisper' });
  });

  it('can undo a swap', () => {
    const { onConfirm } = setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    fireEvent.click(screen.getByTestId('uncertain-word'));
    fireEvent.click(screen.getByText('Use “sont en”'));
    fireEvent.click(screen.getByTestId('uncertain-word'));
    fireEvent.click(screen.getByText('Use “ont un”'));
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: 'Ils ont un chien.', edited: false, source: 'whisper' });
  });

  it('confirms the primary transcript unedited when nothing was tapped', () => {
    const { onConfirm } = setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: 'Ils ont un chien.', edited: false, source: 'whisper' });
  });

  it('shows and confirms the context-consistent spelling, not an edit by the student', () => {
    const { onConfirm } = setup(whisper("J'ai un frère. Ils mange du pain.", "j'ai un frère il mange du pain"));
    expect(screen.getByTestId('heard-text').textContent).toBe("J'ai un frère. Il mange du pain.");
    fireEvent.click(screen.getByText('Use this'));
    expect(onConfirm).toHaveBeenCalledWith({ text: "J'ai un frère. Il mange du pain.", edited: false, source: 'whisper' });
  });

  it('has no free-text field', () => {
    setup(whisper('Ils ont un chien.', 'ils sont en chien'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  describe('when Whisper was not available', () => {
    it('shows the live captions as they were, underlining nothing, with a note', () => {
      const { onConfirm } = setup(liveOnly('ils sont un chien'));
      expect(screen.getByTestId('heard-text').textContent).toBe('ils sont un chien');
      expect(screen.queryAllByTestId('uncertain-word')).toHaveLength(0);
      expect(screen.getByTestId('live-captions-note')).toBeTruthy();
      fireEvent.click(screen.getByText('Use this'));
      expect(onConfirm).toHaveBeenCalledWith({ text: 'ils sont un chien', edited: false, source: 'live-captions' });
    });

    it('shows no note when there was simply no audio to check', () => {
      setup(liveOnly('bonjour', 'no-audio'));
      expect(screen.queryByTestId('live-captions-note')).toBeNull();
    });
  });

  it('says so when nothing was transcribed', () => {
    setup(liveOnly(''));
    expect(screen.getByText('Nothing was transcribed.')).toBeTruthy();
  });
});
