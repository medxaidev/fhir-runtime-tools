# Resource Validator — Design & Implementation

v1.1 — Updated 2025-03

---

## Overview

The **Resource Validator** is the primary tool in FHIR Runtime Tools. It validates FHIR R4 (and US Core) resources against base StructureDefinition profiles, providing structural validation with detailed feedback.

**Entry point:** `src/tools/validator/ValidatorWorkspace.tsx`

---

## Architecture

### Two-Layer Layout

```
┌──────────────────────────────────────────────────────┐
│  Header: Resource Validator  |  Package Selector     │
├──────────────────────────────────────────────────────┤
│  Layer 1: FHIR Schema Explorer                       │
│  ┌──────────┬─────────────────┬──────────────┐       │
│  │ Resources│  Schema Tree    │ Element      │       │
│  │ (200px)  │  (flex)         │ Details      │       │
│  │          │                 │ (280px)      │       │
│  └──────────┴─────────────────┴──────────────┘       │
├──────────────────────────────────────────────────────┤
│  Layer 2: Validation Workspace                       │
│  ┌─────────────────────────┬─────────────────┐       │
│  │ JSON Editor (Monaco)    │ Validation      │       │
│  │ + ExampleLoader         │ Result + Stats  │       │
│  │ + Skeleton / Format     │ (360px)         │       │
│  └─────────────────────────┴─────────────────┘       │
└──────────────────────────────────────────────────────┘
```

### Component Tree

```
ValidatorWorkspace
 ├── PackageSelector           — FHIR R4 / US Core toggle
 ├── ResourceList              — 148 R4 resources (or 63 US Core profiles)
 ├── SchemaViewer              — element tree with expand/collapse
 ├── ElementDetail             — selected element info + Insert button
 ├── JsonEditorInner (Monaco)  — inline JSON editor with cursor sync
 ├── ExampleLoader             — dropdown to load example resources
 └── ValidationResult          — issues list, metrics, stats, rule explanation
```

### State Flow

```
Resource Object (JSON string)
       │
 ┌─────┼────────────┐
 │     │             │
Tree  Form       Monaco Editor
 │     │             │
 └─────┴─────────────┘
       │
   Validator (fhir-runtime)
       │
   ValidationResult
```

Single source of truth: the `input` state (JSON string) in `ValidatorWorkspace`.

---

## Features

### Package Support

| Package | Version | Profiles | Status |
| --- | --- | --- | --- |
| FHIR R4 | 4.0.1 | 148 resources + 41 complex + 20 primitive = 210 | Active |
| US Core | 7.0.0 | 52 resource profiles + 11 extensions = 63 | Active |

Switching packages reloads the resource list and clears the workspace.

**Source files:**
- `src/data/r4-profiles.json` (~29 MB, rebuild: `node scripts/extract-r4-definitions.mjs`)
- `src/data/us-core-profiles.json` (~6.7 MB, rebuild: `node scripts/extract-us-core.mjs`)
- `src/runtime/profiles.ts` — lazy-loads and caches both profile sets

### Three-Column Schema Explorer (Layer 1)

| Column | Width | Content |
| --- | --- | --- |
| FHIR Resources | 200px | Searchable/filterable list |
| Schema Tree | flex | Expandable element tree with cardinality, type, required star ★ |
| Element Details | 280px | Path, type badges, cardinality, binding, constraints, + Insert button |

- **Bigger arrows**: 14px font, 18px width for expand/collapse
- **Required highlight**: red text + gold ★ star for min > 0 elements

### Auto Generate Resource Skeleton

Button: **Skeleton** in the editor toolbar.

Generates minimal valid JSON from StructureDefinition required elements (min > 0) with type-appropriate defaults.

Implementation: `generateSkeleton()` in `ValidatorWorkspace.tsx`, `generateElementDefault()` in `SchemaViewer.tsx`.

### JSON ↔ Element Tree Bidirectional Sync

- **Tree → JSON**: Click element → Monaco scrolls to matching key, positions cursor
- **JSON → Tree**: Cursor on JSON key → element highlighted in tree, details shown

Uses Monaco `onDidChangeCursorPosition` + regex key matching.

### Quick Insert Element

Element Details panel **+ Insert** button:
1. Parses current JSON
2. Adds element with type-appropriate default
3. Reformats JSON
4. Scrolls editor to inserted key

### Validation

Uses `fhir-runtime` v0.7.2 `StructureValidator.validate()`.

Includes workaround for `inferComplexType` bug (ContactPoint misidentified as Identifier) via `TYPE_INFERENCE_FIXES` in `src/runtime/adapter.ts`.

### Validation Rule Explanation

Each issue shows: `StructureDefinition: {type} | Cardinality: {min}..{max} | Type: {types}`

### Resource Stats

| Stat | Description |
| --- | --- |
| Elements Used | Top-level elements present in JSON |
| Total Elements | All top-level elements in profile |
| Missing Required | Required elements not in JSON |

### Resource Type Mismatch Detection

Yellow warning bar when JSON `resourceType` differs from selected schema resource.

### Example Library

23 examples across 7 resource types (Patient, Observation, Encounter, Condition, Procedure, MedicationRequest, Bundle). Auto-loads first valid example when resource is selected.

See `src/data/example-library.ts` for data, `src/tools/validator/ExampleLoader.tsx` for UI.

---

## File Index

| File | Purpose |
| --- | --- |
| `src/tools/validator/ValidatorWorkspace.tsx` | Main workspace, state, skeleton, sync |
| `src/tools/validator/SchemaViewer.tsx` | Element tree, ElementDetail, generateElementDefault |
| `src/tools/validator/ValidationResult.tsx` | Issues, metrics, stats, rule explanation |
| `src/tools/validator/ResourceList.tsx` | Filterable resource type list |
| `src/tools/validator/PackageSelector.tsx` | FHIR R4 / US Core dropdown |
| `src/tools/validator/ExampleLoader.tsx` | Example dropdown loader |
| `src/tools/validator/JsonEditor.tsx` | (legacy, now inline in Workspace) |
| `src/tools/validator/index.tsx` | Page entry point |
| `src/runtime/adapter.ts` | validateResource, TYPE_INFERENCE_FIXES |
| `src/runtime/profiles.ts` | Profile loading (R4 + US Core) |
| `src/data/example-library.ts` | Example entries and query helpers |
| `src/styles.css` | All validator CSS styles |

---

## Dependencies

- `fhir-runtime` ^0.7.2 — parsing, validation, profile building
- `@monaco-editor/react` ^4.7.0 — JSON editor
- `@prismui/react` 0.2.0 — UI primitives (Tag, Metric, InfoCard, notifications)
