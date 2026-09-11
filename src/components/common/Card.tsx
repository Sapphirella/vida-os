import type { ReactNode, CSSProperties } from 'react';
import { clsx } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({ children, className, elevated, style, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass-card',
        elevated && 'glass-card-elevated',
        onClick && 'cursor-pointer transition-transform active:scale-[0.99]',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
