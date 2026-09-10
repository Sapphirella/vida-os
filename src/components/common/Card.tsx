import type { ReactNode, CSSProperties } from 'react';
import { clsx } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  as?: 'div' | 'button' | 'article' | 'section';
}

export function Card({ children, className, elevated, style, onClick, as = 'div' }: CardProps) {
  const Tag: any = as;
  return (
    <Tag
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
    </Tag>
  );
}
