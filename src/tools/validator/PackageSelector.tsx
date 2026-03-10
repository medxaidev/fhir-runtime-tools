interface PackageSelectorProps {
  currentPackage: string;
  onPackageChange?: (pkg: string) => void;
}

const PACKAGES = [
  { id: 'fhir-r4', label: 'FHIR R4', enabled: true },
  { id: 'us-core', label: 'US Core', enabled: false },
  { id: 'cn-core', label: 'CN Core', enabled: false },
];

export function PackageSelector({ currentPackage, onPackageChange }: PackageSelectorProps) {
  return (
    <div className="package-selector">
      <span className="package-selector__label">FHIR Package</span>
      <select
        className="package-selector__select"
        value={currentPackage}
        onChange={(e) => onPackageChange?.(e.target.value)}
      >
        {PACKAGES.map((pkg) => (
          <option key={pkg.id} value={pkg.id} disabled={!pkg.enabled}>
            {pkg.label}{!pkg.enabled ? ' (coming soon)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
