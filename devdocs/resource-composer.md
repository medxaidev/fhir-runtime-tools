# Resource Composer — Design & Implementation

v1.0 — Updated 2025-03

---

## Overview

The **Resource Composer** is a visual FHIR resource creation and editing tool with three synchronized views: Element Tree, Dynamic Form, and JSON Editor (Monaco). All views share a single source of truth — the resource object — and update in real time.

**Entry point:** `src/tools/composer/ComposerWorkspace.tsx`

---

## Architecture

### Single Source of Truth

```
Resource Object (Record<string, unknown>)
       │
 ┌─────┼────────────┐
 │     │             │
Tree  Form       Monaco Editor
```

Any change from any view updates the resource object, which re-renders all other views. Sync-loop prevention uses `updatingFromJson` and `updatingFromForm` refs.

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Header: Resource Composer                           │
│  [Resource Type ▼]  [Example Template ▼]             │
├──────────────────────────────────────────────────────┤
│  Breadcrumb: Observation > valueQuantity > value     │
├──────────┬──────────────┬────────────────────────────┤
│ Element  │ Dynamic Form │ JSON Editor (Monaco)       │
│ Tree     │ (300px)      │ (flex)                     │
│ (260px)  │              │                            │
│          │              │                            │
├──────────┴──────────────┴────────────────────────────┤
│  [ Validate ]  [ Format JSON ]  [ Reset ]   ✓ Valid  │
└──────────────────────────────────────────────────────┘
```

### Component Tree

```
ComposerWorkspace
 ├── Breadcrumb           — current element path display
 ├── ComposerTree         — data-aware element tree with +/× buttons
 ├── DynamicForm          — type-specific field editors
 └── ComposerJsonEditor   — Monaco wrapper with cursor sync
```

---

## Features

### Element Tree (ComposerTree)

- Built from StructureDefinition via `buildElementTree()` (shared with Validator)
- **Data-aware**: nodes show whether element is present in the resource
  - Present elements: full opacity, value preview (e.g. `"final"`, `[2]`, `{3 keys}`)
  - Absent elements: dimmed (opacity 0.55)
- **Required highlight**: red name + gold ★ star for min > 0
- **Inline actions** (appear on hover):
  - **+** button on absent elements → adds with type-appropriate default
  - **×** button on present non-required elements → removes from resource
- Cardinality display per node
- Present/total element counter in header

### Dynamic Form (DynamicForm)

Type-specific field renderers:

| FHIR Type               | Renderer                                |
| ----------------------- | --------------------------------------- |
| string, uri, code, etc. | `<input type="text">`                   |
| integer, decimal        | `<input type="number">`                 |
| boolean                 | `<input type="checkbox">`               |
| code (with binding)     | text input + binding hint               |
| Complex types (object)  | Recursive `ObjectField` with sub-labels |
| Arrays (0..\*)          | `ArrayField` with add/remove per item   |

Form header shows: element name, type badge, Required/Array badges, path, cardinality.

Constraints from StructureDefinition displayed at the bottom.

"Add to resource" button when element is not yet set.

### JSON Editor (ComposerJsonEditor)

- Monaco Editor with JSON syntax highlighting
- `onDidChangeCursorPosition` listener for JSON→Tree sync
- Accepts external ref for programmatic scroll/position

### Bidirectional Sync

| Direction       | Mechanism                                                                            |
| --------------- | ------------------------------------------------------------------------------------ |
| **Tree → JSON** | Click element → `findJsonKeyLine()` → `editor.revealLineInCenter()`                  |
| **JSON → Tree** | Cursor on key → regex match `"key":` → `profile.elements.get()` → highlight          |
| **Form → JSON** | `handleFormChange()` → `setValueAtPath()` → `updateResourceObject()`                 |
| **JSON → Form** | `handleJsonChange()` → `JSON.parse()` → `setResource()` → `selectedValue` recomputes |

Loop prevention: `updatingFromJson.current` and `updatingFromForm.current` refs.

### Skeleton Generation

When a resource type is selected, a minimal skeleton is auto-generated from required elements (min > 0) using `generateSkeleton()`.

### Breadcrumb

Displays current selected element path as `Observation › valueQuantity › value` with the last segment highlighted in accent color.

### Validation

Footer **Validate** button runs `validateResource()` from `adapter.ts`. Result shown as a colored bar: green "✓ Valid" or red "✗ N error(s), M warning(s)".

### Example Templates

Dropdown loads examples from `example-library.ts` filtered by selected resource type.

---

## Path Utilities

Core functions in `ComposerWorkspace.tsx`:

| Function                         | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `elementPathToJsonPath(path)`    | `"Observation.status"` → `["status"]`       |
| `getValueAtPath(obj, path)`      | Traverse object by path array               |
| `setValueAtPath(obj, path, val)` | Deep clone + set value at path              |
| `deleteValueAtPath(obj, path)`   | Deep clone + delete key at path             |
| `findJsonKeyLine(json, key)`     | Find line number of `"key":` in JSON string |

---

## File Index

| File                                         | Purpose                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| `src/tools/composer/index.tsx`               | Page entry point                                        |
| `src/tools/composer/ComposerWorkspace.tsx`   | Main workspace, state, sync engine                      |
| `src/tools/composer/ComposerTree.tsx`        | Data-aware element tree with actions                    |
| `src/tools/composer/DynamicForm.tsx`         | Type-specific form fields                               |
| `src/tools/composer/ComposerJsonEditor.tsx`  | Monaco editor wrapper                                   |
| `src/tools/composer/Breadcrumb.tsx`          | Path breadcrumb                                         |
| `src/tools/composer/choice-type-engine.ts`   | Choice type engine: detect, resolve, switch, skeleton   |
| `src/tools/composer/instance-tree-engine.ts` | BackboneElement engine: detect, array ops, deep get/set |
| `src/tools/composer/slice-engine.ts`         | Slicing engine: extract, match, generate, count         |
| `src/styles.css`                             | All composer CSS (`.composer-*` classes)                |

---

## Choice Type (`[x]`) Support (v1.1)

Full polymorphic element support. See `devdocs/stage/STAGE-Composer-ChoiceType.md` for detailed design.

- **Engine**: `choice-type-engine.ts` — `resolveChoiceType()`, `switchChoiceType()`, `resolveChoiceFromJsonKey()`, `generateChoiceSkeleton()`
- **Tree**: `[x]` badge, expandable choice children with ● active / ○ inactive indicators, click to switch
- **Form**: `ChoiceTypeField` — type selector dropdown + dynamic sub-form for active variant
- **Sync**: JSON cursor on `valueQuantity` → resolves to `Observation.value[x]` → highlights tree + shows form
- **Switch**: atomic delete-old + create-new + three-view refresh

---

## BackboneElement / InnerType Support (v1.2)

Full support for nested BackboneElement arrays. See `devdocs/stage/STAGE-Composer-InnerType.md` for detailed design.

- **Engine**: `instance-tree-engine.ts` — `isBackboneElement()`, `isArrayElement()`, `getArrayLength()`, `addArrayItem()`, `removeArrayItem()`, `getDeepValue()`, `setDeepValue()`, `getBackboneChildren()`
- **Tree**: `⧉` badge for backbone arrays, `BackboneInstanceChildren` renders `contact[0]`, `contact[1]`, `+ Add` dynamically from resource JSON
- **Form**: Backbone instance sub-field editing — click `contact[0]` → form shows child elements (relationship, name, telecom, etc.)
- **Workspace**: `selectedInstanceIndex` state, `handleSelectInstance` / `handleAddArrayItem` / `handleRemoveArrayItem` / `handleInstanceFormChange` callbacks
- **Sync**: Instance selection scrolls Monaco to array key; form edits write via deep JSON path segments

---

## Slicing Support (v1.3)

Full support for FHIR Profile slicing. See `devdocs/stage/STAGE-Composer-Slicing.md` for detailed design.

- **Engine**: `slice-engine.ts` — `extractSlicing()`, `isSlicedElement()`, `getSlices()`, `matchSlice()`, `generateSliceSkeleton()`, `countSliceInstances()`
- **Data source**: Raw StructureDefinition (`getRawStructureDefinition` / `getRawUSCoreSD`) — `buildCanonicalProfile` drops slice elements
- **Tree**: `🧩 sliced` badge, `SliceChildren` renders `:VSCat`, `:systolic` etc. with instance counts, `+` per slice, unmatched items for open slicing
- **Form**: Slice info display — matched slice name, discriminator type/path, slicing rules
- **Workspace**: `slicingMap` state, `handleAddSliceItem` with `generateSliceSkeleton` pre-fill

---

## US Core Package Support (v1.2)

- `PackageSelector` component integrated (reused from Validator)
- `currentPackage` state: `'fhir-r4'` or `'us-core'`
- Resource type list and profile loading are package-aware
- Switching packages resets the resource type selection

---

## Routing

- Added to `App.tsx` as `Composer` page with `ComposerPage` component
- Full-bleed layout (no padding), same as Validator
- Navigation icon: ✎

---

## Future Enhancements

- ~~**value[x] polymorphism**~~: ✅ Implemented in v1.1 — see Choice Type section above
- ~~**Deep element editing**~~: ✅ Implemented in v1.2 — see BackboneElement section above
- ~~**Slicing**~~: ✅ Implemented in v1.3 — see Slicing section above
- **Nested BackboneElement**: recursive instance rendering for `CarePlan.activity.detail` etc.
- **Slice + Choice**: combined handling for `component:systolic.value[x]`
- **Nested slice children editing**: expand slice instance to edit sub-fields
- **Undo/redo**: operation stack for resource changes
- **Export**: download resource as JSON file
- **Import**: paste or upload JSON file
- **Auto-complete**: Monaco IntelliSense for FHIR element names
- **Drag-to-reorder**: array instance drag sorting
