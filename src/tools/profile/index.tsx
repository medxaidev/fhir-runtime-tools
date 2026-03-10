export function ProfilePage() {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Profile Explorer</h2>
        <p className="page-header__desc">
          Analyze FHIR StructureDefinitions and explore element trees.
        </p>
      </div>
      <div className="placeholder">
        <div className="placeholder__icon">◈</div>
        <div className="placeholder__title">Coming in STAGE-3</div>
        <div className="placeholder__desc">
          Load a StructureDefinition to view its element tree with cardinality, types, and bindings.
        </div>
      </div>
    </div>
  );
}
