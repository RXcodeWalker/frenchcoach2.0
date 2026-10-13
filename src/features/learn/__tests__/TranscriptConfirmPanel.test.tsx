// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TranscriptConfirmPanel } from '../TranscriptConfirmPanel';
import { buildConfirmModel, type Recognition } from '../../../domain/transcription/confirmView';

afterEach(cleanup);

function setup(recognition: Recognition | null) {
  const onUse = vi.fn();
  const onRerecord = vi.fn();
  render(
    <TranscriptConfirmPanel model={recognition ? buildConfirmModel(recognition) : null} onUse={onUse} onRerecord={onRerecord} />,
  );
  return { onUse, onRerecord };
}

describe('TranscriptConfirmPanel', () => {
  it('shows Whisper’s text with the disputed word underlined, and confirms it unedited', () => {
    const { onUse } = setup({ whisperText: 'Ils sont un chien.', chromeText: 'ils ont un chien' });
    expect(screen.getByTestId('transcript-text').textContent).toBe('Ils sont un chien.');
    expect(screen.getByTestId('uncertain-0').textContent).toBe('sont');
    fireEvent.click(screen.getByText('Use this'));
    expect(onUse).toHaveBeenCalledWith('Ils sont un chien.', false);
  });

  it('offers the other recogniser’s word on tap, swaps it in and flags the result edited', () => {
    const { onUse } = setup({ whisperText: 'Ils sont un chien.', chromeText: 'ils ont un chien' });
    expect(screen.queryByTestId('uncertain-options')).toBeNull();
    fireEvent.click(screen.getByTestId('uncertain-0'));
    const options = screen.getByTestId('uncertain-options');
    expect(options.textContent).toMatch(/heard this differently/i);
    fireEvent.click(screen.getByRole('button', { name: 'ont' }));
    expect(screen.getByTestId('transcript-text').textContent).toBe('Ils ont un chien.');
    expect(screen.queryByTestId('uncertain-options')).toBeNull();
    fireEvent.click(screen.getByText('Use this'));
    expect(onUse).toHaveBeenCalledWith('Ils ont un chien.', true);
  });

  it('lets the learner undo a swap with “Keep …”', () => {
    const { onUse } = setup({ whisperText: 'Ils sont un chien.', chromeText: 'ils ont un chien' });
    fireEvent.click(screen.getByTestId('uncertain-0'));
    fireEvent.click(screen.getByRole('button', { name: 'ont' }));
    fireEvent.click(screen.getByTestId('uncertain-0'));
    fireEvent.click(screen.getByRole('button', { name: /Keep “sont”/ }));
    fireEvent.click(screen.getByText('Use this'));
    expect(onUse).toHaveBeenCalledWith('Ils sont un chien.', false);
  });

  it('offers re-record from the options and from the footer', () => {
    const { onRerecord } = setup({ whisperText: 'Ils sont un chien.', chromeText: 'ils ont un chien' });
    fireEvent.click(screen.getByTestId('uncertain-0'));
    const rerecords = screen.getAllByRole('button', { name: 'Re-record' });
    expect(rerecords).toHaveLength(2);
    fireEvent.click(rerecords[0]);
    expect(onRerecord).toHaveBeenCalledTimes(1);
  });

  it('has no free-text editing control', () => {
    setup({ whisperText: 'Ils sont un chien.', chromeText: 'ils ont un chien' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.querySelector('[contenteditable]')).toBeNull();
  });

  it('falls back to Chrome’s text when Whisper failed, says so, and still underlines Category B words', () => {
    const { onUse } = setup({ whisperText: null, chromeText: 'elle veut un chien', fallbackReason: 'asr-timeout' });
    expect(screen.getByTestId('transcript-text').textContent).toBe('elle veut un chien');
    expect(screen.getByTestId('fallback-note')).toBeTruthy();
    fireEvent.click(screen.getByTestId('uncertain-0'));
    expect(screen.getByTestId('uncertain-options').textContent).toMatch(/mix up/i);
    fireEvent.click(screen.getByRole('button', { name: 'en' }));
    fireEvent.click(screen.getByText('Use this'));
    expect(onUse).toHaveBeenCalledWith('elle veut en chien', true);
  });

  it('offers only re-record for a word the other recogniser did not hear', () => {
    setup({ whisperText: 'Hello les clés', chromeText: 'les clés' });
    fireEvent.click(screen.getByTestId('uncertain-0'));
    expect(screen.getByTestId('uncertain-options').textContent).toMatch(/only one of our two listeners/i);
    expect(screen.getAllByRole('button', { name: 'Re-record' })).toHaveLength(2);
  });

  it('while the second opinion is pending, shows a status and cannot be confirmed', () => {
    const { onUse } = setup(null);
    expect(screen.getByRole('status').textContent).toMatch(/checking/i);
    const use = screen.getByText('Use this') as HTMLButtonElement;
    expect(use.disabled).toBe(true);
    fireEvent.click(use);
    expect(onUse).not.toHaveBeenCalled();
  });

  it('says so when nothing was transcribed', () => {
    setup({ whisperText: null, chromeText: '' });
    expect(screen.getByText('Nothing was transcribed.')).toBeTruthy();
  });
});
