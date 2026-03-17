# Changelog

All notable changes to `@prismui/fhir-runtime-tools` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.3.0] - 2026-03-18

### Changed

- **fhir-runtime** upgraded from `0.8.0` to `0.10.0`
  - `buildCanonicalProfile()` now preserves slicing elements — `CanonicalProfile.slicing` field available
  - `inferComplexType()` bug fixed — ContactPoint/Identifier no longer misidentified
  - New Slicing APIs: `matchSlice()`, `countSliceInstances()`, `generateSliceSkeleton()`, `isExtensionSlicing()`
  - New Choice Type APIs: `isChoiceType()`, `getChoiceBaseName()`, `buildChoiceJsonKey()`, `parseChoiceJsonKey()`, `resolveActiveChoiceType()`, `resolveChoiceFromJsonKey()`
  - New BackboneElement APIs: `isBackboneElement()`, `isArrayElement()`, `getBackboneChildren()`
- **PrismUI** upgraded from `0.2.0` to `0.3.0`
  - Modal management module
  - Drawer management module
  - Enhanced notification system

### Refactored

- **slice-engine.ts**: Rewritten as thin adapter over fhir-runtime Slicing APIs (~420 → ~105 lines)
  - Removed self-implemented `extractSlicing()`, discriminator matching, deep-equal/pattern-match algorithms
  - Delegates to `fhir-runtime`: `matchSlice()`, `countSliceInstances()`, `generateSliceSkeleton()`, `isExtensionSlicing()`
  - New `getSlicingMap(profile)` replaces `extractSlicing(rawSD)` — slicing data comes from `profile.slicing` directly
- **choice-type-engine.ts**: Rewritten as thin adapter over fhir-runtime Choice Type APIs (~186 → ~115 lines)
  - Detection and resolution functions delegate to fhir-runtime
  - App-layer functions retained: `switchChoiceType()`, `generateChoiceSkeleton()`
- **instance-tree-engine.ts**: `isBackboneElement()` and `isArrayElement()` now delegate to fhir-runtime
  - App-layer utilities retained: `getDeepValue()`, `setDeepValue()`, `addArrayItem()`, `removeArrayItem()`, `buildJsonPath()`
- **adapter.ts**: Removed `TYPE_INFERENCE_FIXES` workaround and `isTypeMismatchFalsePositive()` (~100 lines removed)
  - `validateResource()` simplified — no longer filters false-positive TYPE_MISMATCH issues
- **profiles.ts**: Removed `rawSDCache`, `rawUsCoreSDCache`, `getRawStructureDefinition()`, `getRawUSCoreSD()`
  - Raw StructureDefinition caches no longer needed since slicing is built into CanonicalProfile
- **ComposerWorkspace.tsx**: Profile loading simplified — single `loadProfileFn()` call instead of `Promise.all([profile, rawSD])`
- **ExplorerWorkspace.tsx**: Same simplification — slicing loaded from `getSlicingMap(profile)` instead of `extractSlicing(rawSD)`
- **ComposerTree.tsx**: Updated `SlicedElement` API usage (`rules` at top level, not nested)
- **DynamicForm.tsx**: Updated `SlicedElement` API usage (`discriminators` plural)

### Removed

- ~520 lines of self-implemented code replaced by fhir-runtime APIs
- Raw StructureDefinition caching layer (no longer needed)
- TYPE_MISMATCH false-positive workaround (bug fixed in fhir-runtime)

### Dependencies

- `fhir-runtime`: `^0.8.0` → `^0.10.0`
- `@prismui/core`: `0.2.0` → `0.3.0`
- `@prismui/react`: `0.2.0` → `0.3.0`

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
