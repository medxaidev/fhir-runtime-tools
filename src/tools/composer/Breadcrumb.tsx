interface BreadcrumbProps {
  path: string;
}

export function Breadcrumb({ path }: BreadcrumbProps) {
  const parts = path.split('.');

  return (
    <div className="composer-breadcrumb">
      {parts.map((part, idx) => (
        <span key={idx} className="composer-breadcrumb__item">
          {idx > 0 && <span className="composer-breadcrumb__sep">›</span>}
          <span className={idx === parts.length - 1 ? 'composer-breadcrumb__current' : ''}>{part}</span>
        </span>
      ))}
    </div>
  );
}
