import type { ReactNode } from 'react';

interface InfoCardProps {
  variant?: 'blue' | 'green' | 'yellow' | 'red';
  children: ReactNode;
}

export function InfoCard({ variant = 'blue', children }: InfoCardProps) {
  return <div className={`info-card info-card--${variant}`}>{children}</div>;
}
