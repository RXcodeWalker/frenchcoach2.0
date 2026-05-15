import type { ReactNode } from 'react';

interface Props {
  variant?: 'subtle' | 'default' | 'elevated';
  className?: string;
  children: ReactNode;
}

const variantClass = {
  subtle: 'glass-subtle',
  default: 'glass',
  elevated: 'glass-elevated',
};

export function Card({ variant = 'default', className = '', children }: Props) {
  return (
    <div className={`rounded-xl ${variantClass[variant]} p-4 ${className}`}>
      {children}
    </div>
  );
}
