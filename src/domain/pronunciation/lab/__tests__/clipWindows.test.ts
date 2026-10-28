import { describe, expect, it } from 'vitest';
import { clipWindow } from '../clipWindows';

describe('clipWindow', () => {
  it('pads a word by 0.12 s each side, in original-recording time', () => {
    const clip = clipWindow([{ offsetMs: 1000, durationMs: 400 }]);
    expect(clip?.startS).toBeCloseTo(0.88);
    expect(clip?.endS).toBeCloseTo(1.52);
  });

  it('maps trimmed offsets back through the trim map', () => {
    // Kept 0–1 s and 3–4 s of the original; the second stretch starts at 1 s in the upload.
    const segments = [
      { origStartS: 0, origEndS: 1, trimmedStartS: 0 },
      { origStartS: 3, origEndS: 4, trimmedStartS: 1 },
    ];
    const clip = clipWindow([{ offsetMs: 1200, durationMs: 300 }], { segments });
    expect(clip?.startS).toBeCloseTo(3.08);
    expect(clip?.endS).toBeCloseTo(3.62);
  });

  it('covers a two-word liaison group', () => {
    const clip = clipWindow([{ offsetMs: 500, durationMs: 200 }, { offsetMs: 700, durationMs: 500 }]);
    expect(clip?.startS).toBeCloseTo(0.38);
    expect(clip?.endS).toBeCloseTo(1.32);
  });

  it('widens a very short word to the minimum, moving it right at the very start', () => {
    const clip = clipWindow([{ offsetMs: 0, durationMs: 20 }]);
    expect(clip?.startS).toBe(0);
    expect(clip?.endS).toBeCloseTo(0.3);
  });

  it('clamps to the end of the recording', () => {
    expect(clipWindow([{ offsetMs: 0, durationMs: 20 }], { recordingDurationS: 0.2 })).toEqual({ startS: 0, endS: 0.2 });
    expect(clipWindow([{ offsetMs: 5000, durationMs: 200 }], { recordingDurationS: 2 })).toBeNull();
  });

  it('gives no clip without timing or near a chunk seam', () => {
    expect(clipWindow([{ offsetMs: null, durationMs: 200 }])).toBeNull();
    expect(clipWindow([{ offsetMs: 100, durationMs: undefined }])).toBeNull();
    expect(clipWindow([{ offsetMs: 100, durationMs: 200, nearChunkBoundary: true }])).toBeNull();
    expect(clipWindow([])).toBeNull();
  });
});
