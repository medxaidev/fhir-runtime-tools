export function DiffPage() {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Resource Diff</h2>
        <p className="page-header__desc">
          Compare two FHIR resources and view field-level differences.
        </p>
      </div>
      <div className="placeholder">
        <div className="placeholder__icon">⊟</div>
        <div className="placeholder__title">Coming in STAGE-4</div>
        <div className="placeholder__desc">
          Paste two FHIR Resources side by side to see added, removed, and changed fields.
        </div>
      </div>
    </div>
  );
}
