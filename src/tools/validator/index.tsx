export function ValidatorPage() {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Resource Validator</h2>
        <p className="page-header__desc">
          Validate FHIR R4 resources against the specification or custom profiles.
        </p>
      </div>
      <div className="placeholder">
        <div className="placeholder__icon">◎</div>
        <div className="placeholder__title">Coming in STAGE-2</div>
        <div className="placeholder__desc">
          Paste a FHIR Resource JSON, select a profile, and validate against structural rules.
        </div>
      </div>
    </div>
  );
}
