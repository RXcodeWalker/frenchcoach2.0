import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

export function StatTile({ icon, value, label, className = '' }: Props) {
  return (
    <div className={`rounded-xl glass p-3.5 ${className}`}>
      <div className="mb-1.5">{icon}</div>
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] text-slate-600 font-medium">{label}</p>
    </div>
  );
}
