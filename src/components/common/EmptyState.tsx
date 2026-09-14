import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ title = '这里还空着', hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* 去渐变：装饰圈改为实色主题色（candle=日间柔粉 / 夜间玫瑰木）微透 */}
      <div
        className="w-16 h-16 mb-4 rounded-full flex items-center justify-center"
        style={{
          background: 'rgb(var(--candle-rgb) / 0.12)',
          border: '1px solid rgb(var(--candle-rgb) / 0.25)',
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: 'var(--candle)',
            boxShadow: '0 0 12px var(--candle)',
            opacity: 0.7,
          }}
        />
      </div>
      <p className="font-serif text-paper text-lg mb-1 tracking-wide">{title}</p>
      {hint && <p className="font-sans text-bronze text-sm max-w-xs">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
