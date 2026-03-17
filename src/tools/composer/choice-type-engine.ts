// ── Choice Type Engine ───────────────────────
// Thin adapter over fhir-runtime v0.10.0 Choice Type APIs.
// Re-exports fhir-runtime functions and keeps app-layer UI functions.

import type { CanonicalElement } from 'fhir-runtime';
import {
  isChoiceType as rtIsChoiceType,
  getChoiceBaseName as rtGetChoiceBaseName,
  buildChoiceJsonKey as rtBuildChoiceJsonKey,
  parseChoiceJsonKey as rtParseChoiceJsonKey,
  resolveActiveChoiceType as rtResolveActiveChoiceType,
  resolveChoiceFromJsonKey as rtResolveChoiceFromJsonKey,
} from 'fhir-runtime';

// ── Core types ───────────────────────────────

export interface ChoiceTypeInfo {
  /** Canonical element path, e.g. "Observation.value[x]" */
  canonicalPath: string;
  /** Base name without [x], e.g. "value" */
  baseName: string;
  /** Available type codes, e.g. ["Quantity", "string", "boolean"] */
  availableTypes: string[];
  /** Currently active type code, or null if not set */
  activeType: string | null;
  /** JSON key for the active type, e.g. "valueQuantity" */
  activeJsonKey: string | null;
}

// ── Detection (delegates to fhir-runtime) ────

/** Check if an element is a choice type (path ends with [x]) */
export function isChoiceType(element: CanonicalElement): boolean {
  return rtIsChoiceType(element);
}

/** Get the base name from a choice element path: "value[x]" → "value" */
export function getChoiceBaseName(elementPath: string): string {
  return rtGetChoiceBaseName(elementPath);
}

/** Build JSON key from base name + type code: ("value", "Quantity") → "valueQuantity" */
export function buildChoiceJsonKey(baseName: string, typeCode: string): string {
  return rtBuildChoiceJsonKey(baseName, typeCode);
}

/** Parse a JSON key back to (baseName, typeCode): "valueQuantity" → ("value", "Quantity") */
export function parseChoiceJsonKey(jsonKey: string, baseName: string): string | null {
  return rtParseChoiceJsonKey(jsonKey, baseName);
}

// ── Resolution (delegates to fhir-runtime) ───

/**
 * Resolve choice type info for an element given the current resource.
 * Scans JSON keys to find which concrete variant is active.
 */
export function resolveChoiceType(
  element: CanonicalElement,
  resource: Record<string, unknown>,
): ChoiceTypeInfo {
  const result = rtResolveActiveChoiceType(element, resource);
  return {
    canonicalPath: element.path,
    baseName: result.baseName,
    availableTypes: result.availableTypes,
    activeType: result.activeType,
    activeJsonKey: result.activeJsonKey,
  };
}

/**
 * Resolve choice type from a JSON key found in the resource.
 * Returns the canonical element and detected type, or null.
 */
export function resolveChoiceFromJsonKey(
  jsonKey: string,
  elements: Map<string, CanonicalElement>,
): { element: CanonicalElement; typeCode: string } | null {
  return rtResolveChoiceFromJsonKey(jsonKey, elements);
}

// ── Switching ────────────────────────────────

/**
 * Switch choice type: delete old key, create new key with default value.
 * Returns updated resource clone.
 */
export function switchChoiceType(
  resource: Record<string, unknown>,
  element: CanonicalElement,
  newTypeCode: string,
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(resource));
  const baseName = getChoiceBaseName(element.path);

  // Remove all existing choice variants
  for (const t of element.types) {
    const key = buildChoiceJsonKey(baseName, t.code);
    delete clone[key];
  }

  // Create new key with default skeleton
  const newKey = buildChoiceJsonKey(baseName, newTypeCode);
  clone[newKey] = generateChoiceSkeleton(newTypeCode);

  return clone;
}

// ── Skeleton Generation ──────────────────────

/** Generate minimal skeleton for a FHIR type code */
export function generateChoiceSkeleton(typeCode: string): unknown {
  switch (typeCode) {
    case 'string': case 'uri': case 'url': case 'canonical': case 'id':
    case 'code': case 'markdown':
      return '';
    case 'boolean':
      return false;
    case 'integer': case 'positiveInt': case 'unsignedInt':
      return 0;
    case 'decimal':
      return 0.0;
    case 'instant': case 'dateTime': case 'date': case 'time':
      return '';
    case 'Quantity':
      return { value: 0, unit: '' };
    case 'CodeableConcept':
      return { text: '' };
    case 'Coding':
      return { system: '', code: '' };
    case 'Reference':
      return { reference: '' };
    case 'Period':
      return { start: '', end: '' };
    case 'Range':
      return { low: { value: 0 }, high: { value: 0 } };
    case 'Ratio':
      return { numerator: { value: 0 }, denominator: { value: 0 } };
    case 'SampledData':
      return { origin: { value: 0 }, period: 0, dimensions: 1, data: '' };
    case 'Timing':
      return {};
    case 'Identifier':
      return { system: '', value: '' };
    case 'HumanName':
      return { family: '', given: [''] };
    case 'Address':
      return { line: [''], city: '' };
    case 'Attachment':
      return { contentType: '' };
    default:
      return {};
  }
}

/**
 * Get all choice element paths from a profile as a Set for fast lookup.
 * Returns set of canonical paths like "Observation.value[x]"
 */
export function getChoiceElementPaths(elements: Map<string, CanonicalElement>): Set<string> {
  const result = new Set<string>();
  for (const [path, el] of elements) {
    if (path.endsWith('[x]') && el.types.length > 1) {
      result.add(path);
    }
  }
  return result;
}
