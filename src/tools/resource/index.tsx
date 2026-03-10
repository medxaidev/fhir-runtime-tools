export function ResourcePage() {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Resource Lab</h2>
        <p className="page-header__desc">
          Format, normalize, and inspect FHIR resources.
        </p>
      </div>
      <div className="placeholder">
        <div className="placeholder__icon">▣</div>
        <div className="placeholder__title">Coming in STAGE-3</div>
        <div className="placeholder__desc">
          Paste any FHIR Resource JSON to format it and view its element structure.
        </div>
      </div>
    </div>
  );
}
