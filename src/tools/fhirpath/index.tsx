export function FHIRPathPage() {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">FHIRPath Lab</h2>
        <p className="page-header__desc">
          Interactively test FHIRPath expressions against FHIR resources.
        </p>
      </div>
      <div className="placeholder">
        <div className="placeholder__icon">⟡</div>
        <div className="placeholder__title">Coming in STAGE-2</div>
        <div className="placeholder__desc">
          Enter a FHIR Resource and a FHIRPath expression, then evaluate to see the result.
        </div>
      </div>
    </div>
  );
}
