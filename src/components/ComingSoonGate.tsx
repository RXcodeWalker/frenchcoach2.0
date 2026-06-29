import { useEffect, type ReactNode } from 'react';
import type { FeatureStatus } from '../config/featureFlags';
import type { EntryPoint } from '../services/persistence/featureInterest';
import { recordFeatureInterest } from '../services/persistence/featureInterest';
import { ComingSoonScreen } from './ComingSoonScreen';

interface Props {
  status: FeatureStatus;
  featureId: string;
  name: string;
  description?: string;
  fallbackRoute?: string;
  fallbackLabel?: string;
  entryPoint?: EntryPoint;
  children: ReactNode;
}

export function ComingSoonGate({
  status,
  featureId,
  name,
  description,
  fallbackRoute,
  fallbackLabel,
  entryPoint,
  children,
}: Props) {
  useEffect(() => {
    if (status === 'coming-soon') {
      recordFeatureInterest(featureId, entryPoint);
    }
  }, [status, featureId, entryPoint]);

  if (status === 'live') return <>{children}</>;
  return (
    <ComingSoonScreen
      name={name}
      description={description}
      fallbackRoute={fallbackRoute}
      fallbackLabel={fallbackLabel}
    />
  );
}
