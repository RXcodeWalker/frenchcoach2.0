import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  /** Renders a top hairline rule separating this section from the previous one. */
  divider?: boolean;
  id?: string;
}

export function Section({ children, className = '', divider = true, id }: Props) {
  return (
    <section
      id={id}
      className={`${divider ? 'border-t mk-hairline' : ''} py-16 md:py-24 ${className}`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">{children}</div>
    </section>
  );
}
