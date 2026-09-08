import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';

interface Props {
  name: string;
  description?: string;
  fallbackRoute?: string;
  fallbackLabel?: string;
}

export function ComingSoonScreen({
  name,
  description,
  fallbackRoute = '/',
  fallbackLabel = 'Go Home',
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock size={28} className="text-ink-muted" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-white tracking-tight">{name}</h1>
          {description && (
            <p className="text-sm text-ink-muted leading-relaxed">{description}</p>
          )}
          <p className="text-xs text-ink-muted font-bold uppercase tracking-widest pt-1">Coming Soon</p>
        </div>

        <button
          onClick={() => navigate(fallbackRoute)}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all text-sm uppercase tracking-wider active:scale-95"
        >
          {fallbackLabel}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-ink-muted hover:text-ink-muted transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={12} /> Back
        </button>
      </div>
    </div>
  );
}
