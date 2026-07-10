/**
 * In-memory TranscriptionProvider returning a canned RawAsrResult. Lets S4's
 * batch harness (and any test) run end-to-end with zero audio and zero Python.
 */

import type { TranscriptionProvider } from '../ports';
import type { RawAsrResult } from '../types';

export function createFixtureProvider(result: RawAsrResult): TranscriptionProvider {
  return {
    id: 'fixture',
    modelVersion: result.modelVersion,
    async transcribe(): Promise<RawAsrResult> {
      return result;
    },
  };
}
