/**
 * Shared drivers for the exam e2e specs (exam.spec.ts, examPronunciation.spec.ts).
 * Lives outside the *.spec.ts files because Playwright refuses to import one
 * spec from another.
 */
import { type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FAKE_SR_SCRIPT = fs.readFileSync(path.join(__dirname, '../fixtures/fakeSpeechRecognition.js'), 'utf-8');

export async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

export async function skipOnboardingIfShown(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip for now' });
  try {
    await skip.first().waitFor({ state: 'visible', timeout: 4000 });
    await skip.first().click({ force: true });
  } catch {
    // already past onboarding
  }
}

export async function clickButton(page: Page, name: string | RegExp, timeout = 8000): Promise<boolean> {
  const loc = page.getByRole('button', { name });
  try {
    await loc.first().waitFor({ state: 'visible', timeout });
  } catch {
    return false;
  }
  await loc.first().click({ force: true });
  return true;
}

/**
 * Sets the fake recognizer's next result, then drives one mic start/stop
 * cycle. The mic button is `disabled` while ExamRunner is mid-transition
 * between turns (turnBusy, plus the examiner-pacing leads in
 * examinerPacing.ts — up to ~900ms per action, more when a turn emits
 * several actions, e.g. TRANSITION + READ_MAIN back to back) — waiting for
 * it to become enabled (rather than a fixed sleep) is what makes this
 * reliable regardless of how many actions the previous turn produced. This
 * may be the exam's LAST turn (advancing straight to the review screen,
 * where the mic button no longer exists at all) — waiting for either
 * outcome after submitting, rather than a fixed sleep, is what lets the
 * caller's loop safely re-check for the review heading on its next
 * iteration instead of racing a still-transitioning UI.
 */
export async function submitSpokenAnswer(page: Page, text: string, holdMs = 250) {
  await page.evaluate((t) => {
    (window as unknown as { __fakeSpeechNextAnswer: string }).__fakeSpeechNextAnswer = t;
  }, text);

  await page.waitForFunction(
    () => {
      const btn = document.querySelector('button[aria-label="Start recording"]') as HTMLButtonElement | null;
      return !!btn && !btn.disabled;
    },
    undefined,
    { timeout: 15000 },
  );
  await page.getByRole('button', { name: 'Start recording' }).click({ force: true });
  await page.getByRole('button', { name: 'Stop and submit' }).waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(holdMs); // let the fake recognizer's onresult land (longer when the recording itself is analysed)
  await page.getByRole('button', { name: 'Stop and submit' }).click({ force: true });

  await page.waitForFunction(
    () => {
      const reviewShown = document.body.innerText.includes('Review Your Transcript');
      const btn = document.querySelector('button[aria-label="Start recording"]') as HTMLButtonElement | null;
      return reviewShown || (!!btn && !btn.disabled);
    },
    undefined,
    { timeout: 15000 },
  );
  await page.waitForTimeout(150);
}

/**
 * D3/D4 (0520 conduct plan, Batch 3): Exam Sim no longer offers set picking
 * (a single "Start Exam Sim" button instead — the set is chosen for the
 * candidate) and the role-play prep card is a real 10:00 countdown, not a
 * Begin button.
 *
 * These full-exam flows use the "Start now" escape hatch rather than
 * fast-forwarding the real countdown — driving 600 fake-clock ticks through
 * the rest of a multi-turn exam (examinerPacing's own real setTimeout waits,
 * TTS, etc.) is a lot of surface to keep synchronized with a faked clock for
 * no assertion gain here, since D3 conduct itself doesn't change. "Start now"
 * makes the attempt practice-only (D3), which the assertions below now
 * expect. The real 10:00 countdown path (page.clock driving the component's
 * own setInterval, then auto-advancing at 0:00 into a COUNTING attempt) is
 * covered on its own, much shorter, in the dedicated test below.
 */
export async function enterExam(page: Page, mode: 'sim' | 'coached') {
  await page.goto('/exam');
  await skipOnboardingIfShown(page);
  await page.waitForSelector('text=Choose an Exam', { timeout: 15000 });

  if (mode === 'coached') {
    await page.getByRole('button', { name: /Coached Practice/ }).click({ force: true });
    await page.locator('.grid button').first().click({ force: true });
  } else {
    await clickButton(page, 'Start Exam Sim');
  }

  await page.waitForTimeout(600);
  await clickButton(page, /Je suis prêt/);
  await page.waitForTimeout(800);
  await clickButton(page, 'Start exam');
  await page.waitForTimeout(800);

  if (mode === 'sim') {
    await clickButton(page, 'Start now');
  } else {
    await clickButton(page, 'Begin');
  }
  await page.waitForTimeout(800);
}

