# STAGE: Upgrade fhir-runtime to v0.8.0 & Release v0.2.0

**Date**: 2026-03-12  
**Scope**: Dependency upgrade + version bump + documentation  
**Breaking Changes**: None (backward compatible)

---

## Overview

Upgrade `fhir-runtime` from `0.7.2` to `0.8.0` in `fhir-runtime-tools`. This is a **minimal upgrade** (Web app, browser-side) — no code refactoring to use `createRuntime()` at this stage, but the new APIs become available for future use.

Release as `fhir-runtime-tools v0.2.0`.

---

## Steps

### Step 1: Update Dependencies
- `package.json`: `fhir-runtime` → `^0.8.0`, `version` → `0.2.0`
- Run `npm install`

### Step 2: Vite Config — Browser Shims
- `fhir-runtime v0.8.0` depends on `fhir-definition@0.4.0`
- `fhir-definition` may use Node.js APIs (`node:fs`, `node:path`)
- Verify existing shims in `src/shims/` cover any new transitive imports
- Update `vite.config.ts` `optimizeDeps.include` if needed

### Step 3: UI Version Strings
- `App.tsx` header badge: `v0.1.0` → `v0.2.0`
- `App.tsx` meta: `fhir-runtime v0.7.2` → `fhir-runtime v0.8.0`

### Step 4: Build & Type Check
- `npx tsc --noEmit` — zero errors
- `npm run build` — success

### Step 5: Dev Server Smoke Test
- `npm run dev` — verify app loads, Validator / Composer / Explorer functional

### Step 6: Documentation
- **README.md**: Update version refs, feature list, tech stack
- **CHANGELOG.md**: Create with v0.2.0 entry
- **devdocs/ARCHITECTURE.md**: Update fhir-runtime version reference
- **devdocs/ROADMAP.md**: Mark upgrade complete

### Step 7: Final Review
- Verify no lingering `v0.7` references in source code
- Confirm all changes are clean

---

## Impact Analysis

| File | Change |
|------|--------|
| `package.json` | version + dependency |
| `src/App.tsx` | version strings in UI |
| `vite.config.ts` | potentially add fhir-definition to optimizeDeps |
| `README.md` | full update for v0.2.0 |
| `CHANGELOG.md` | new file |
| `devdocs/ARCHITECTURE.md` | version ref |

### No Code Changes Required
- `src/runtime/adapter.ts` — all APIs unchanged
- `src/runtime/profiles.ts` — `buildCanonicalProfile`, `CanonicalProfile` unchanged
- All tool components — type imports unchanged
- All shims — already cover `node:fs`, `node:path`, `node:url`

---

## Future Opportunities (Not in This Release)
- Use `createRuntime()` to simplify `adapter.ts` initialization
- Integrate `fhir-definition` for IG package management
- Use `DefinitionProvider` for unified SD/VS/CS/SP access
