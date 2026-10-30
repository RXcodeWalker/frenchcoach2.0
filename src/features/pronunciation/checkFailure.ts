import { AudioTooShortError } from '../../domain/pronunciation/audioNormalizer';
import { AuthRequiredError } from '../../lib/authToken';
import { isConsentRequiredError } from '../../lib/consentRequired';
import { isLabAllowanceError } from '../../lib/labAllowance';
import type { CheckFailure } from './labPracticeState';

/** Why a pronunciation check threw, as the Lab's never-trap flow names it. */
export function failureOf(err: unknown): CheckFailure {
  if (isLabAllowanceError(err)) return 'allowance';
  if (isConsentRequiredError(err)) return 'consent';
  if (err instanceof AuthRequiredError) return 'sign-in';
  if (err instanceof AudioTooShortError) return 'too-short';
  return 'failed';
}
