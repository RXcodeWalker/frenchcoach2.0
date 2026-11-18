// ── Getting a rendered card out of the app ───────────────────────────────────
//
// On a phone the native share sheet takes the PNG and the caption together, so
// the post carries the image *and* the link. Where files can't be shared
// (most desktops) the learner saves the picture and copies the caption instead.

export type ShareMethod = 'native' | 'download' | 'copy_link';
export type ShareOutcome = 'done' | 'cancelled' | 'failed';

export interface ShareResult {
  method: ShareMethod;
  outcome: ShareOutcome;
}

function pngFile(blob: Blob, fileName: string): File | null {
  try {
    return new File([blob], fileName, { type: 'image/png' });
  } catch {
    return null; // very old WebViews have no File constructor
  }
}

/** True when this browser's share sheet accepts an image file. */
export function canShareImage(blob: Blob, fileName: string): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  const file = pngFile(blob, fileName);
  if (!file) return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Opens the share sheet with the image and the caption (the link is inside the
 * caption — several apps drop a separate `url` when a file is attached).
 */
export async function shareImageNatively(blob: Blob, fileName: string, caption: string): Promise<ShareResult> {
  const file = pngFile(blob, fileName);
  if (!file) return { method: 'native', outcome: 'failed' };
  try {
    await navigator.share({ files: [file], text: caption });
    return { method: 'native', outcome: 'done' };
  } catch (err) {
    // The learner closed the sheet: not an error.
    if (err instanceof DOMException && err.name === 'AbortError') return { method: 'native', outcome: 'cancelled' };
    return { method: 'native', outcome: 'failed' };
  }
}

/** Saves the PNG through a temporary link (works everywhere, including the Android Chrome shell). */
export function downloadImage(blob: Blob, fileName: string): ShareResult {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { method: 'download', outcome: 'done' };
  } catch {
    return { method: 'download', outcome: 'failed' };
  }
}

/** Copies the caption (text + link) to the clipboard. */
export async function copyCaption(caption: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(caption);
    return { method: 'copy_link', outcome: 'done' };
  } catch {
    return { method: 'copy_link', outcome: 'failed' };
  }
}
