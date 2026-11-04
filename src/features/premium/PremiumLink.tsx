import { Link } from 'react-router-dom';
import { resolveFeatureStatus } from '../../config/featureFlags';

/**
 * "Get more with Premium" — shown where a free limit has just been reached
 * (docs/systems/payments.md). Renders nothing while the `premium` flag is off,
 * so no screen links to a page that isn't open.
 */
export function PremiumLink({ children = 'Get more with Premium', className = '' }: { children?: string; className?: string }) {
  if (resolveFeatureStatus('premium') !== 'live') return null;
  return (
    <Link
      to="/premium"
      className={`inline-block text-xs font-semibold text-action-text underline underline-offset-2 ${className}`}
      data-testid="premium-link"
    >
      {children}
    </Link>
  );
}
