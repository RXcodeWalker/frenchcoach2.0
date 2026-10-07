import type { Severity } from '../../../types';

/**
 * Severity → role token. Every value resolves through the design-token layer
 * (src/index.css), so it carries both themes at AA contrast — never a raw hex
 * or a dark-tuned Tailwind colour (guarded by screens/learn/__tests__/lightContrast).
 * major = correction, minor = reward (amber), polish/anglicism = action,
 * strong = progress.
 */
export const SEVERITY_COLOR: Record<Severity, string> = {
  major:     'var(--correction-text)',
  minor:     'var(--reward-text)',
  polish:    'var(--action-text)',
  anglicism: 'var(--action-text)',
  strong:    'var(--progress-text)',
};

/** Text-colour class for the same roles (use instead of `style={{ color }}`). */
export const SEVERITY_TEXT: Record<Severity, string> = {
  major:     'text-correction-text',
  minor:     'text-reward-text',
  polish:    'text-action-text',
  anglicism: 'text-action-text',
  strong:    'text-progress-text',
};

/** Soft tinted surface for an inline quote chip. */
export const SEVERITY_SOFT: Record<Severity, string> = {
  major:     'bg-correction-soft',
  minor:     'bg-reward-soft',
  polish:    'bg-action-soft',
  anglicism: 'bg-action-soft',
  strong:    'bg-progress-soft',
};

export const SEVERITY_UNDERLINE: Record<Severity, string> = {
  major:     'underline decoration-correction decoration-wavy underline-offset-2',
  minor:     'underline decoration-reward decoration-wavy underline-offset-2',
  polish:    'underline decoration-action decoration-dotted underline-offset-2',
  anglicism: 'underline decoration-action-text decoration-dotted underline-offset-2',
  strong:    'underline decoration-progress decoration-solid underline-offset-2',
};

export const SEVERITY_BG: Record<Severity, string> = {
  major:     'bg-correction-soft border-hairline',
  minor:     'bg-reward-soft border-hairline',
  polish:    'bg-action-soft border-hairline',
  anglicism: 'bg-action-soft border-hairline',
  strong:    'bg-progress-soft border-hairline',
};
