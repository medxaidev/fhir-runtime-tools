// ── Slice Engine ─────────────────────────────
// Thin adapter over fhir-runtime v0.10.0 Slicing APIs.
// Re-exports fhir-runtime types with backward-compatible aliases
// and provides app-layer helper functions for the slicing map.

import type { CanonicalProfile, CanonicalElement } from 'fhir-runtime';
import {
  matchSlice as rtMatchSlice,
  countSliceInstances as rtCountSliceInstances,
  generateSliceSkeleton as rtGenerateSliceSkeleton,
  isExtensionSlicing as rtIsExtensionSlicing,
} from 'fhir-runtime';
import type { SlicedElement, SliceDefinition as RTSliceDefinition } from 'fhir-runtime';

// ── Re-export fhir-runtime types with backward-compatible aliases ──

export type SlicedElementInfo = SlicedElement;
export type SliceDefinition = RTSliceDefinition;

// ── Adapter: profile.slicing is the new source of truth ──

/**
 * Get the slicing map directly from a CanonicalProfile.
 * Replaces the old extractSlicing(rawSD) approach.
 */
export function getSlicingMap(profile: CanonicalProfile): Map<string, SlicedElement> {
  return profile.slicing ?? new Map();
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
 * Get the slicing info for a base element.
 */
export function getSlicingInfo(basePath: string, slicingMap: Map<string, SlicedElementInfo>): SlicedElementInfo | null {
  return slicingMap.get(basePath) ?? null;
}

/**
 * Detect which slice definition an existing array item matches.
 * Delegates to fhir-runtime's matchSlice.
 */
export function matchSlice(
  item: Record<string, unknown>,
  slicedInfo: SlicedElementInfo,
): string | null {
  return rtMatchSlice(item, slicedInfo);
}

/**
 * Generate a skeleton JSON object for a specific slice.
 * Delegates to fhir-runtime's generateSliceSkeleton.
 */
export function generateSliceSkeleton(slice: SliceDefinition): Record<string, unknown> {
  return rtGenerateSliceSkeleton(slice);
}

/**
 * Check if a sliced element is an extension slicing.
 * Delegates to fhir-runtime's isExtensionSlicing.
 */
export function isExtensionSlicing(basePath: string, slicingMap: Map<string, SlicedElementInfo>): boolean {
  if (!slicingMap.has(basePath)) return false;
  return rtIsExtensionSlicing(basePath);
}

/**
 * Count slice instances in a resource array.
 * Delegates to fhir-runtime's countSliceInstances.
 */
export function countSliceInstances(
  resource: Record<string, unknown>,
  slicedInfo: SlicedElementInfo,
): Map<string, number> {
  const jsonKey = slicedInfo.basePath.split('.').pop() ?? '';
  const arr = resource[jsonKey];
  if (!Array.isArray(arr)) {
    const counts = new Map<string, number>();
    for (const slice of slicedInfo.slices) counts.set(slice.sliceName, 0);
    return counts;
  }
  return rtCountSliceInstances(arr as Record<string, unknown>[], slicedInfo);
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
