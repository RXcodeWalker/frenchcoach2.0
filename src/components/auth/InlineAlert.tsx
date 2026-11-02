import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

type Tone = 'error' | 'success';

/** A form-level message: correction for a problem, progress for a confirmation. */
export function InlineAlert({ tone = 'error', children }: { tone?: Tone; children: ReactNode }) {
  const error = tone === 'error';
  const Icon = error ? AlertCircle : CheckCircle;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-control border p-3 ${
        error
          ? 'border-correction bg-correction-soft text-correction-text'
          : 'border-progress bg-progress-soft text-progress-text'
      }`}
    >
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <p className="text-body-s">{children}</p>
    </div>
  );
}
