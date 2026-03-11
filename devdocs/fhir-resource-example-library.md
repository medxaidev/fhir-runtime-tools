# FHIR Resource Example Library

Implementation v1 — Updated 2025-03

---

## Overview

The Example Library provides structured, reusable FHIR resource examples for validation, testing, and learning within the Resource Validator tool.

**Source file:** `src/data/example-library.ts`

---

## Architecture

### Storage

All examples are stored as typed constants in a single TypeScript file (`src/data/example-library.ts`). Each example is a fully-formed JSON string with metadata. This approach ensures:

- Type safety via `ExampleEntry` interface
- Zero network overhead (bundled with app)
- Easy to add/modify examples

### ExampleEntry Interface

```ts
interface ExampleEntry {
  id: string; // Unique identifier (e.g. "patient-valid-basic")
  resourceType: string; // FHIR resource type (e.g. "Patient")
  title: string; // Display title (e.g. "Patient – Basic")
  description: string; // Short description for tooltips / UI
  category: "valid" | "error"; // Category for filtering
  tags: string[]; // Tags for search (e.g. ["vital-signs"])
  json: string; // Full resource JSON string
}
```

### Query Helpers

| Function                     | Description                            |
| ---------------------------- | -------------------------------------- |
| `getExamplesForType(type)`   | Filter examples by resourceType        |
| `getExampleResourceTypes()`  | List resource types that have examples |
| `getExamplesByCategory(cat)` | Filter by valid/error                  |
| `searchExamples(query)`      | Search title, description, tags        |
| `getExampleById(id)`         | Lookup by unique id                    |

---

## Current Examples (v1)

**Total: 23 examples** across 7 resource types.

| Resource Type     | Valid | Error | Total |
| ----------------- | ----- | ----- | ----- |
| Patient           | 5     | 2     | 7     |
| Observation       | 5     | 2     | 7     |
| Encounter         | 2     | 1     | 3     |
| Condition         | 1     | 1     | 2     |
| Procedure         | 1     | 0     | 1     |
| MedicationRequest | 1     | 1     | 2     |
| Bundle            | 1     | 0     | 1     |

### Patient Examples

- `patient-valid-basic` — Full demographics with name, gender, birthDate, address, telecom
- `patient-valid-minimal` — Minimal valid with only resourceType and id
- `patient-valid-contact` — Emergency contact information
- `patient-valid-multi-id` — SSN and MRN identifiers
- `patient-valid-deceased` — Deceased with dateTime
- `patient-error-invalid-gender` — Invalid gender and wrong data types
- `patient-error-wrong-type` — Wrong data types for active, birthDate, name

### Observation Examples

- `observation-heart-rate` — Heart rate vital sign with valueQuantity
- `observation-blood-pressure` — BP panel with systolic/diastolic components
- `observation-temperature` — Body temperature
- `observation-lab-result` — Glucose lab with referenceRange
- `observation-bmi` — Body mass index
- `observation-error-missing-status` — Missing required "status"
- `observation-error-wrong-value` — Wrong type for valueQuantity

### Other Resource Examples

- Encounter: ambulatory, inpatient, missing-status-error
- Condition: diabetes type 2, missing-code-error
- Procedure: appendectomy
- MedicationRequest: metformin, missing-intent-error
- Bundle: transaction with Patient + Observation

---

## UI Integration

### ExampleLoader Component

Located at `src/tools/validator/ExampleLoader.tsx`.

- **Dropdown** filtered by currently selected resource type
- **Grouped** into "✓ Valid Examples" and "✗ Error Examples" optgroups
- Falls back to showing all examples when no resource is selected

### Auto-sync Behavior

When a resource type is selected in the Resource List:

1. The example loader filters to show only examples for that resource
2. The first valid example is automatically loaded into the JSON editor
3. The schema viewer updates to show the resource's structure

### Error Example Warning

When an error example is loaded, a notification warns the user that the example contains intentional validation errors.

### Resource Type Mismatch Detection

If the user manually edits the JSON and the `resourceType` in JSON differs from the selected schema resource, a yellow warning bar appears below the editor toolbar.

---

## Resource Validator — Full Feature List (v1.1)

### Layout: Three-Column Schema Explorer

The schema explorer layer uses a 3-column layout:

| Column          | Width | Content                                                         |
| --------------- | ----- | --------------------------------------------------------------- |
| FHIR Resources  | 200px | Searchable list of 148 R4 resources                             |
| Schema Tree     | flex  | Expandable element tree with cardinality and type info          |
| Element Details | 280px | Selected element details, binding, constraints, + Insert button |

### Package Support

| Package | Version | Profiles                                        | Status |
| ------- | ------- | ----------------------------------------------- | ------ |
| FHIR R4 | 4.0.1   | 148 resources + 41 complex + 20 primitive = 210 | Active |
| US Core | 7.0.0   | 52 resource profiles + 11 extensions = 63       | Active |

Switching packages in the dropdown reloads the resource list and clears the workspace.

**Source files:**

- `src/data/r4-profiles.json` (~29 MB, rebuild: `node scripts/extract-r4-definitions.mjs`)
- `src/data/us-core-profiles.json` (~6.7 MB, rebuild: `node scripts/extract-us-core.mjs`)

### fhir-runtime Version

Updated to **v0.7.2**.

### Auto Generate Resource Skeleton

Button: **Skeleton** in the editor toolbar.

Generates a minimal valid resource from the selected StructureDefinition by including only required elements (min > 0) with type-appropriate default values.

Example for Observation:

```json
{
  "resourceType": "Observation",
  "status": "",
  "code": { "text": "" }
}
```

Implementation: `generateSkeleton()` in `ValidatorWorkspace.tsx`, `generateElementDefault()` in `SchemaViewer.tsx`.

### JSON ↔ Element Tree Bidirectional Sync

**Tree → JSON:** Clicking an element in the schema tree scrolls the Monaco editor to the matching JSON key and positions the cursor there.

**JSON → Tree:** When the cursor lands on a JSON key in the editor, the corresponding element is highlighted in the schema tree and its details shown in the Element Details panel.

Implementation uses Monaco's `onDidChangeCursorPosition` event and regex matching of JSON keys.

### Required Elements Highlight

Required elements (min > 0) in the schema tree are highlighted with:

- Red text for the element name
- A red asterisk `*` suffix (via CSS `::after`)
- A gold star `★` indicator

### Quick Insert Element

The Element Details panel includes an **+ Insert** button. Clicking it:

1. Parses the current JSON
2. Adds the element with a type-appropriate default value
3. Reformats the JSON
4. Scrolls the editor to the inserted key

If the element already exists, a warning is shown instead.

### Validation Rule Explanation

Each validation issue now includes a **Rule Source** line showing:

- StructureDefinition name
- Element cardinality (e.g. `1..1`)
- Expected type(s)

Example: `StructureDefinition: Observation | Cardinality: 1..1 | Type: code`

### Resource Stats

Displayed in the Validation Result panel (both before and after validation):

| Stat             | Description                                            |
| ---------------- | ------------------------------------------------------ |
| Elements Used    | Count of top-level elements present in the JSON        |
| Total Elements   | Count of all top-level elements defined in the profile |
| Missing Required | Count of required elements not present in the JSON     |

After validation, also shows error/warning counts from the validation metrics.

### Tree Arrow Size

Schema tree expand/collapse arrows increased from 10px to 14px, width from 12px to 18px for better clickability.

---

## Future Enhancements (v2)

- URL-based example loading (`?example=observation-heart-rate`)
- Schema ↔ Example element highlighting (highlight which elements the example uses)
- Community-contributed examples
- Example search across all resource types
- US Core examples
