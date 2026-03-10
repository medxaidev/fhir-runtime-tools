interface TagProps {
  variant?: 'active' | 'idle' | 'loading' | 'error' | 'info';
  children: React.ReactNode;
}

export function Tag({ variant = 'idle', children }: TagProps) {
  return <span className={`tag tag--${variant}`}>{children}</span>;
}
