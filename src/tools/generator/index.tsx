export function GeneratorPage() {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Resource Generator</h2>
        <p className="page-header__desc">
          Generate test FHIR resources for development and testing.
        </p>
      </div>
      <div className="placeholder">
        <div className="placeholder__icon">⊞</div>
        <div className="placeholder__title">Coming in STAGE-4</div>
        <div className="placeholder__desc">
          Select a resource type to generate valid mock FHIR data.
        </div>
      </div>
    </div>
  );
}
