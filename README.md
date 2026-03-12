# FHIR Runtime Tools

A browser-based developer toolkit for [fhir-runtime](https://github.com/nicefhir/fhir-runtime) — the TypeScript FHIR R4 execution engine. Validate resources, compose FHIR data visually, and explore instance structures, all running 100% in the browser with no backend.

**Version:** 0.2.0 | **FHIR:** R4 (4.0.1) | **License:** MIT

---

## Features

### Resource Validator

Validate FHIR resources against R4 base profiles and US Core 7.0.0 profiles.

- 3-column layout: Resource list | Schema tree | Element details
- Skeleton generator for minimal valid resources
- JSON ↔ Tree bidirectional sync
- Required element highlighting, quick insert, validation rule explanation
- Resource stats (elements used / total / missing required)

### Resource Composer

Visual FHIR resource editor with three synchronized views.

- **Element Tree** — profile-aware element tree with presence indicators
- **Dynamic Form** — type-specific form fields with auto-generation
- **JSON Editor** — Monaco editor with cursor sync
- Choice type (`value[x]`) switching, BackboneElement arrays, slicing, extension slicing, reference fields

### Instance Explorer

Read-only FHIR instance inspector with element-level detail.

- Instance tree built from Resource JSON + CanonicalProfile
- Element inspector (path, type, cardinality, binding, constraints, value)
- Badges for choice, slice, extension, backbone, and reference elements

---

## Tech Stack

| Layer            | Technology     | Version |
| ---------------- | -------------- | ------- |
| FHIR Engine      | fhir-runtime   | 0.8.0   |
| UI Framework     | React          | 19.2    |
| State Management | @prismui/core  | 0.2.0   |
| React Bindings   | @prismui/react | 0.2.0   |
| Build            | Vite           | 7.3     |
| Language         | TypeScript     | 5.x     |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
git clone https://github.com/nicefhir/fhir-runtime-tools.git
cd fhir-runtime-tools

npm install
npm run dev
```

Open `http://localhost:3000`.

### Build

```bash
npm run build
```

Output in `dist/`.

---

## Project Structure

```
src/
├── App.tsx                     # PrismUI Shell + routing
├── setup.ts                    # Interaction Runtime init
├── components/ui/              # Base UI components (Button, Card, Tree, etc.)
├── tools/
│   ├── validator/              # Resource Validator (workspace, schema, validation)
│   ├── composer/               # Resource Composer (tree, form, JSON editor, engines)
│   └── explorer/               # Instance Explorer (tree builder, inspector)
├── runtime/
│   ├── adapter.ts              # fhir-runtime adapter (parse, validate, FHIRPath)
│   └── profiles.ts             # Profile registry (R4 + US Core lazy loading)
├── shims/                      # Browser shims for node:fs, node:path, node:url
├── data/                       # R4 profiles JSON, US Core profiles JSON
└── styles.css                  # Global CSS (BEM + CSS Variables)
```

---

## FHIR Data

| Package       | Profiles | Source                 |
| ------------- | -------- | ---------------------- |
| FHIR R4       | 210 SDs  | hl7.fhir.r4.core@4.0.1 |
| US Core 7.0.0 | 63       | hl7.fhir.us.core@7.0.0 |

Profiles are pre-extracted to JSON and lazy-loaded at runtime. See `scripts/extract-r4-definitions.mjs` and `scripts/extract-us-core.mjs`.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

---

## License

MIT — see [LICENSE](./LICENSE).

## Author

**Fangjun** — [fangjun20208@gmail.com](mailto:fangjun20208@gmail.com)

## Links

- [Homepage](https://medxai.dev)
- [fhir-runtime](https://github.com/nicefhir/fhir-runtime)
- [Architecture](./devdocs/ARCHITECTURE.md)
- [Roadmap](./devdocs/ROADMAP.md)
