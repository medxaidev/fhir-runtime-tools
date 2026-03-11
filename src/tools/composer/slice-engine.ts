import type { CanonicalElement, CanonicalProfile } from 'fhir-runtime';

// ── Types ────────────────────────────────────

export interface SlicingDiscriminator {
  type: 'value' | 'pattern' | 'type' | 'profile' | 'exists';
  path: string;
}

export interface SlicingInfo {
  discriminator: SlicingDiscriminator[];
  rules: 'open' | 'closed' | 'openAtEnd';
  ordered: boolean;
  description?: string;
}

export interface SliceDefinition {
  /** e.g. "Observation.category:VSCat" */
  id: string;
  /** e.g. "VSCat" */
  sliceName: string;
  /** The base element path, e.g. "Observation.category" */
  basePath: string;
  /** Cardinality */
  min: number;
  max: string; // "1" | "*"
  /** Fixed/pattern values from the SD that define this slice's discriminator match */
  fixedValues: Record<string, unknown>;
  /** Child element definitions for this slice (from raw SD) */
  children: RawSliceChild[];
  /** Whether this slice is mustSupport */
  mustSupport: boolean;
}

export interface RawSliceChild {
  /** e.g. "Observation.category:VSCat.coding.system" */
  id: string;
  /** e.g. "system" — relative to the slice root */
  relativePath: string;
  min: number;
  max: string;
  fixedValue?: unknown;
  patternValue?: unknown;
  types: Array<{ code: string }>;
}

export interface SlicedElementInfo {
  /** The base element (e.g. "Observation.category") */
  basePath: string;
  /** Slicing metadata */
  slicing: SlicingInfo;
  /** All named slices */
  slices: SliceDefinition[];
}

// ── Raw SD Element shape ─────────────────────

interface RawSDElement {
  id: string;
  path: string;
  sliceName?: string;
  slicing?: {
    discriminator?: Array<{ type: string; path: string }>;
    rules?: string;
    ordered?: boolean;
    description?: string;
  };
  min?: number;
  max?: string;
  mustSupport?: boolean;
  type?: Array<{ code: string; profile?: string[]; targetProfile?: string[] }>;
  // Fixed/pattern values — FHIR uses "fixed[Type]" and "pattern[Type]"
  fixedUri?: string;
  fixedCode?: string;
  fixedString?: string;
  fixedBoolean?: boolean;
  fixedInteger?: number;
  fixedCoding?: unknown;
  fixedCodeableConcept?: unknown;
  fixedIdentifier?: unknown;
  patternUri?: string;
  patternCode?: string;
  patternString?: string;
  patternCoding?: unknown;
  patternCodeableConcept?: unknown;
  patternIdentifier?: unknown;
  [key: string]: unknown;
}

// ── Extract fixed/pattern values from a raw element ──

function extractFixedValues(rawEl: RawSDElement): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const prefixes = ['fixed', 'pattern'];
  for (const key of Object.keys(rawEl)) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix) && key.length > prefix.length) {
        const typeKey = key.slice(prefix.length);
        // Convert to JSON key: first char lowercase
        const jsonKey = typeKey.charAt(0).toLowerCase() + typeKey.slice(1);
        result[jsonKey] = rawEl[key];
      }
    }
  }
  return result;
}

// ── Parse slicing from raw StructureDefinition ──

/**
 * Extract all sliced elements from a raw StructureDefinition.
 * Returns a map: basePath → SlicedElementInfo
 */
export function extractSlicing(rawSD: Record<string, unknown>): Map<string, SlicedElementInfo> {
  const snapshot = rawSD.snapshot as { element?: RawSDElement[] } | undefined;
  const elements = snapshot?.element ?? [];
  const result = new Map<string, SlicedElementInfo>();

  // 1. Find base elements that have slicing defined
  const slicingBases = new Map<string, { element: RawSDElement; slicing: SlicingInfo }>();
  for (const el of elements) {
    if (el.slicing?.discriminator) {
      // Skip extension slicing (handled separately by FHIR infrastructure)
      if (el.path.endsWith('.extension') || el.path.endsWith('.modifierExtension')) continue;
      slicingBases.set(el.path, {
        element: el,
        slicing: {
          discriminator: (el.slicing.discriminator || []).map((d) => ({
            type: d.type as SlicingDiscriminator['type'],
            path: d.path,
          })),
          rules: (el.slicing.rules as SlicingInfo['rules']) || 'open',
          ordered: el.slicing.ordered ?? false,
          description: el.slicing.description,
        },
      });
    }
  }

  // 2. For each slicing base, collect slice definitions
  for (const [basePath, { slicing }] of slicingBases) {
    const slices: SliceDefinition[] = [];

    // Find all direct slice elements (e.g. "Observation.category:VSCat")
    for (const el of elements) {
      if (!el.sliceName) continue;
      if (el.path !== basePath) continue;
      // This is a slice root: id like "Observation.category:VSCat"
      const slicePrefix = `${basePath}:${el.sliceName}`;

      // Extract fixed/pattern values for discriminator matching
      const fixedValues = extractFixedValues(el);

      // Collect children of this slice
      const children: RawSliceChild[] = [];
      for (const child of elements) {
        if (!child.id.startsWith(slicePrefix + '.')) continue;
        const relPath = child.id.slice(slicePrefix.length + 1);
        // Skip id, extension, modifierExtension sub-elements
        const firstName = relPath.split('.')[0];
        if (['id', 'extension', 'modifierExtension'].includes(firstName)) continue;

        // Extract any fixed values from child elements too (for discriminator)
        const childFixed = extractFixedValues(child);

        children.push({
          id: child.id,
          relativePath: relPath,
          min: child.min ?? 0,
          max: child.max ?? '*',
          fixedValue: Object.keys(childFixed).length > 0 ? childFixed : undefined,
          patternValue: child.patternCodeableConcept ?? child.patternCoding ?? undefined,
          types: (child.type || []).map((t) => ({ code: t.code })),
        });
      }

      // Also check children for fixed values that match discriminator
      // e.g. discriminator path "code" → look at slice's ".code" child
      for (const disc of slicing.discriminator) {
        const discChild = elements.find(
          (c) => c.id === `${slicePrefix}.${disc.path}`,
        );
        if (discChild) {
          const discFixed = extractFixedValues(discChild);
          for (const [k, v] of Object.entries(discFixed)) {
            fixedValues[`${disc.path}.${k}`] = v;
          }
          // Also check for pattern on the child itself
          if (discChild.patternCodeableConcept) {
            fixedValues[disc.path] = discChild.patternCodeableConcept;
          }
          if (discChild.patternCoding) {
            fixedValues[disc.path] = discChild.patternCoding;
          }
        }
      }

      slices.push({
        id: el.id,
        sliceName: el.sliceName,
        basePath,
        min: el.min ?? 0,
        max: el.max ?? '*',
        fixedValues,
        children,
        mustSupport: el.mustSupport ?? false,
      });
    }

    if (slices.length > 0) {
      result.set(basePath, { basePath, slicing, slices });
    }
  }

  return result;
}

/**
 * Check if a basePath has slicing in the given slicing map.
 */
export function isSlicedElement(basePath: string, slicingMap: Map<string, SlicedElementInfo>): boolean {
  return slicingMap.has(basePath);
}

/**
 * Get slices for a given basePath.
 */
export function getSlices(basePath: string, slicingMap: Map<string, SlicedElementInfo>): SliceDefinition[] {
  return slicingMap.get(basePath)?.slices ?? [];
}

/**
 * Get the slicing info (discriminator, rules) for a base element.
 */
export function getSlicingInfo(basePath: string, slicingMap: Map<string, SlicedElementInfo>): SlicingInfo | null {
  return slicingMap.get(basePath)?.slicing ?? null;
}

/**
 * Generate a skeleton JSON object for a specific slice, pre-filling discriminator values.
 * e.g. for category:VSCat with pattern code discriminator, generates:
 * { coding: [{ system: "...", code: "vital-signs" }] }
 */
export function generateSliceSkeleton(slice: SliceDefinition): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  // Apply fixed/pattern values from discriminator
  for (const [key, value] of Object.entries(slice.fixedValues)) {
    if (key.includes('.')) {
      // Nested path like "code.coding" — skip for top-level, these are applied via children
      continue;
    }
    obj[key] = typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
  }

  return obj;
}

/**
 * Detect which slice definition an existing array item matches, based on discriminator.
 * Returns the matching slice name, or null if unmatched.
 */
export function matchSlice(
  item: Record<string, unknown>,
  slicedInfo: SlicedElementInfo,
): string | null {
  for (const slice of slicedInfo.slices) {
    if (matchesDiscriminator(item, slicedInfo.slicing.discriminator, slice)) {
      return slice.sliceName;
    }
  }
  return null;
}

function matchesDiscriminator(
  item: Record<string, unknown>,
  discriminators: SlicingDiscriminator[],
  slice: SliceDefinition,
): boolean {
  for (const disc of discriminators) {
    const itemValue = getNestedValue(item, disc.path);
    const sliceValue = slice.fixedValues[disc.path];

    if (sliceValue === undefined) continue; // no constraint for this discriminator

    if (disc.type === 'value') {
      if (!deepEqual(itemValue, sliceValue)) return false;
    } else if (disc.type === 'pattern') {
      if (!patternMatch(itemValue, sliceValue)) return false;
    }
    // type, profile, exists — simplified handling
  }
  return true;
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Check if `actual` matches `pattern` (pattern matching — actual may have extra fields).
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    if (arrA.length !== arrB.length) return false;
    return arrA.every((v, i) => deepEqual(v, arrB[i]));
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual(objA[k], objB[k]));
}

function patternMatch(actual: unknown, pattern: unknown): boolean {
  if (pattern === undefined || pattern === null) return true;
  if (actual === undefined || actual === null) return false;
  if (typeof pattern !== 'object') return actual === pattern;
  if (Array.isArray(pattern)) {
    if (!Array.isArray(actual)) return false;
    // Every item in pattern must match some item in actual
    return (pattern as unknown[]).every((pItem) =>
      (actual as unknown[]).some((aItem) => patternMatch(aItem, pItem)),
    );
  }
  if (typeof actual !== 'object') return false;
  const patObj = pattern as Record<string, unknown>;
  const actObj = actual as Record<string, unknown>;
  return Object.keys(patObj).every((k) => patternMatch(actObj[k], patObj[k]));
}

/**
 * Get the CanonicalElement for the base of a slice if available in the profile.
 */
export function getSliceBaseElement(
  basePath: string,
  profile: CanonicalProfile,
): CanonicalElement | undefined {
  return profile.elements.get(basePath);
}

/**
 * Check how many slice instances are present for each slice definition
 * in the resource array.
 */
export function countSliceInstances(
  resource: Record<string, unknown>,
  slicedInfo: SlicedElementInfo,
): Map<string, number> {
  const jsonKey = slicedInfo.basePath.split('.').pop() ?? '';
  const arr = resource[jsonKey];
  const counts = new Map<string, number>();

  for (const slice of slicedInfo.slices) {
    counts.set(slice.sliceName, 0);
  }

  if (!Array.isArray(arr)) return counts;

  for (const item of arr) {
    if (typeof item !== 'object' || item === null) continue;
    const matched = matchSlice(item as Record<string, unknown>, slicedInfo);
    if (matched) {
      counts.set(matched, (counts.get(matched) ?? 0) + 1);
    }
  }

  return counts;
}
