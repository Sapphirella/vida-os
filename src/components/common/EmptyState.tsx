import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ title = '这里还空着', hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-16 h-16 mb-4 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle, rgba(232, 195, 158, 0.12), transparent)',
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: 'var(--candle)',
            boxShadow: '0 0 12px var(--candle)',
            opacity: 0.6,
          }}
        />
      </div>
      <p className="font-serif text-paper text-lg mb-1 tracking-wide">{title}</p>
      {hint && <p className="font-sans text-bronze text-sm max-w-xs">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
