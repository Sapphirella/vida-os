import { clsx } from '@/lib/utils';
import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  variant?: 'default' | 'wine';
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
        onClick && 'cursor-pointer hover:brightness-110 transition',
        className,
      )}
    >
      {children}
    </span>
  );
}
