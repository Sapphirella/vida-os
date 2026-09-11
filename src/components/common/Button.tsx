import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { clsx } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'text';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'ghost',
  size = 'md',
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const variantClass = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    text: 'btn-text',
  }[variant];

  const sizeStyle = size === 'sm' ? { padding: '6px 12px', fontSize: '0.8125rem' } : undefined;

  return (
    <button
      className={clsx(variantClass, className)}
      style={sizeStyle}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
