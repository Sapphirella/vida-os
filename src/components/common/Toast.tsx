import { useUIStore } from '@/stores/useUIStore';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { clsx } from '@/lib/utils';

export function Toast() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div className="fixed top-20 left-0 right-0 z-50 pointer-events-none flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'glass-card glass-card-elevated px-4 py-2.5 flex items-center gap-2 text-sm font-sans pointer-events-auto',
            'animate-slide-up',
          )}
          style={{ minWidth: 200, maxWidth: 320 }}
        >
          {t.kind === 'success' && <CheckCircle2 size={16} className="text-olive" />}
          {t.kind === 'error' && <XCircle size={16} className="text-wine-bright" />}
          {t.kind === 'info' && <Info size={16} className="text-sapphire" />}
          <span className="text-paper">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
