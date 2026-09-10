import { clsx } from '@/lib/utils';
import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  variant?: 'default' | 'wine' | 'candle';
  className?: string;
  onClick?: () => void;
}

export function Tag({ children, variant = 'default', className, onClick }: TagProps) {
  return (
    <span
      onClick={onClick}
      className={clsx(
        'tag',
        variant === 'wine' && 'tag-wine',
        variant === 'candle' && 'tag-candle',
        onClick && 'cursor-pointer hover:brightness-110 transition',
        className,
      )}
    >
      {children}
    </span>
  );
}
