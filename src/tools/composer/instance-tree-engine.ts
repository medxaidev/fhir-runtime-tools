import type { CanonicalElement } from 'fhir-runtime';

// ── Instance Path ────────────────────────────
// Schema path:   "Patient.contact.name"
// Instance path: "Patient.contact[0].name"
// JSON path:     ["contact", 0, "name"]

export type JsonPathSegment = string | number;

/**
 * Check if an element is a backbone (has nested children in SD).
 */
export function isBackboneElement(element: CanonicalElement): boolean {
  return element.types.length === 0 || element.types.some((t) => t.code === 'BackboneElement');
}

/**
 * Check if an element is an array (max > 1 or unbounded).
 */
export function isArrayElement(element: CanonicalElement): boolean {
  return element.max === 'unbounded' || (typeof element.max === 'number' && element.max > 1);
}

/**
 * Get the number of instances for a backbone array element in the resource.
 * e.g. resource.contact.length
 */
export function getArrayLength(resource: Record<string, unknown>, jsonKey: string): number {
  const val = resource[jsonKey];
  if (Array.isArray(val)) return val.length;
  return 0;
}

/**
 * Get the value at a JSON path (supports array indices).
 * e.g. getDeepValue(resource, ["contact", 0, "name"])
 */
export function getDeepValue(obj: unknown, path: JsonPathSegment[]): unknown {
  let current: unknown = obj;
  for (const seg of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof seg === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[seg];
    } else {
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[seg];
    }
  }
  return current;
}

/**
 * Set a value at a JSON path (supports array indices). Returns cloned object.
 */
export function setDeepValue(obj: Record<string, unknown>, path: JsonPathSegment[], value: unknown): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj));
  let current: unknown = clone;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    if (typeof seg === 'number') {
      if (!Array.isArray(current)) return clone;
      current = (current as unknown[])[seg];
    } else {
      if (typeof current !== 'object' || current === null) return clone;
      const rec = current as Record<string, unknown>;
      if (!(seg in rec)) {
        // auto-create intermediate objects/arrays
        const nextSeg = path[i + 1];
        rec[seg] = typeof nextSeg === 'number' ? [] : {};
      }
      current = rec[seg];
    }
  }
  const lastSeg = path[path.length - 1];
  if (typeof lastSeg === 'number') {
    if (Array.isArray(current)) (current as unknown[])[lastSeg] = value;
  } else {
    if (typeof current === 'object' && current !== null) {
      (current as Record<string, unknown>)[lastSeg] = value;
    }
  }
  return clone;
}

/**
 * Add a new empty item to a backbone array.
 * Returns cloned resource.
 */
export function addArrayItem(resource: Record<string, unknown>, jsonKey: string): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(resource));
  if (!Array.isArray(clone[jsonKey])) {
    clone[jsonKey] = [];
  }
  (clone[jsonKey] as unknown[]).push({});
  return clone;
}

/**
 * Remove an item from a backbone array by index.
 * Returns cloned resource.
 */
export function removeArrayItem(resource: Record<string, unknown>, jsonKey: string, index: number): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(resource));
  if (Array.isArray(clone[jsonKey])) {
    (clone[jsonKey] as unknown[]).splice(index, 1);
    // If array is now empty, remove the key entirely
    if ((clone[jsonKey] as unknown[]).length === 0) {
      delete clone[jsonKey];
    }
  }
  return clone;
}

/**
 * Get child elements of a backbone element from the profile.
 * e.g. for "Patient.contact", returns elements like "Patient.contact.name", "Patient.contact.gender"
 * Filters out .id, .extension, .modifierExtension for cleaner UI.
 */
export function getBackboneChildren(
  parentPath: string,
  elements: Map<string, CanonicalElement>,
): CanonicalElement[] {
  const prefix = parentPath + '.';
  const skipSuffixes = new Set(['id', 'extension', 'modifierExtension']);
  const result: CanonicalElement[] = [];
  for (const [path, el] of elements) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (rest.includes('.')) continue; // only direct children
    if (skipSuffixes.has(rest)) continue;
    result.push(el);
  }
  return result;
}

/**
 * Build the JSON path segments for an element, given an optional array index context.
 * e.g. ("Patient.contact.name", {contact: 0}) → ["contact", 0, "name"]
 */
export function buildJsonPath(
  elementPath: string,
  arrayIndices: Record<string, number>,
): JsonPathSegment[] {
  const parts = elementPath.split('.');
  const result: JsonPathSegment[] = [];
  let accumulated = parts[0]; // resource type prefix
  for (let i = 1; i < parts.length; i++) {
    const key = parts[i];
    result.push(key);
    accumulated += '.' + key;
    if (accumulated in arrayIndices) {
      result.push(arrayIndices[accumulated]);
    }
  }
  return result;
}
