import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  badge?: string;
  children: ReactNode;
  compact?: boolean;
  scroll?: boolean;
}

export function Card({ title, badge, children, compact, scroll }: CardProps) {
  const bodyClass = [
    compact ? 'card__body--compact' : 'card__body',
    scroll ? 'card__body--scroll' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="card">
      {title && (
        <div className="card__header">
          <span className="card__title">{title}</span>
          {badge && <span className="card__badge">{badge}</span>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}
