import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
  size?: 'default' | 'small';
}

export function Button({ variant = 'default', size = 'default', className = '', children, ...props }: ButtonProps) {
  const classes = [
    'btn',
    variant !== 'default' ? `btn--${variant}` : '',
    size === 'small' ? 'btn--small' : '',
    className,
  ].filter(Boolean).join(' ');

  return <button className={classes} {...props}>{children}</button>;
}
