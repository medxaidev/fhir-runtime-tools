import type { ReactNode } from 'react';

interface DataRowProps {
  label: string;
  children: ReactNode;
}

export function DataRow({ label, children }: DataRowProps) {
  return (
    <div className="data-row">
      <span className="data-row__label">{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{children}</span>
    </div>
  );
}
