# Changelog

All notable changes to `@prismui/fhir-runtime-tools` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.2.0] - 2026-03-12

### Added

- **Resource Composer** — visual FHIR resource editor with 3 synchronized views (Element Tree, Dynamic Form, Monaco JSON Editor)
  - Choice type support (v1.1): `value[x]` with type switching
  - BackboneElement / InnerType support (v1.2): nested complex elements with array instance management
  - Slicing support (v1.3): discriminator matching, slice-aware tree and form
  - Extension slicing support (v1.4): `*.extension` / `*.modifierExtension` with URL-based discriminators
  - Reference field support (v1.4): structured `reference` + `display` inputs with target type chips
- **Instance Explorer** — read-only FHIR instance tree with element inspector
  - Instance tree builder from Resource JSON + CanonicalProfile + SlicingMap
  - 3-column workspace: Instance Tree | Inspector | JSON Viewer
  - Badges for choice, slice, extension, backbone, reference elements
- **Validator v1.1 Enhancements**
  - 3-column schema layout: FHIR Resources | Schema Tree | Element Details
  - US Core 7.0.0 support (63 profiles)
  - Skeleton Generator for minimal valid resources
  - JSON ↔ Tree bidirectional sync
  - Required elements highlighting (red text + gold star)
  - Quick Insert button in Element Details
  - Validation Rule Explanation (StructureDefinition, cardinality, type)
  - Resource Stats (elements used, total, missing required)

### Changed

- **fhir-runtime** upgraded from `0.7.2` to `0.8.0`
  - New `fhir-definition` integration available (STAGE-6)
  - `createRuntime()` factory function now available for future use
  - `DefinitionProvider` interface for unified SD/VS/CS/SP management
  - Fully backward compatible — no code changes required
- **node-path shim**: added `extname` export for `fhir-definition` compatibility
- **vite.config.ts**: added `fhir-definition` to `optimizeDeps.include`

### Dependencies

- `fhir-runtime`: `^0.7.2` → `^0.8.0`
- `fhir-definition`: `^0.4.0` (transitive via fhir-runtime)

---

## [0.1.0] - 2026-03-10

### Added

- Initial release
- **Resource Validator** — validate FHIR resources against R4 profiles
- **FHIRPath Lab** — interactive FHIRPath expression evaluator
- PrismUI Shell layout (Header, Sidebar, StatusBar)
- Runtime Adapter layer (`src/runtime/adapter.ts`)
- R4 profile data (148 resources, 210 total StructureDefinitions)
- US Core 7.0.0 profile data (63 profiles)
- Browser shims for `node:fs`, `node:path`, `node:url`
- Custom CSS component library (BEM naming, CSS Variables)
