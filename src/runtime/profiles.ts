import { buildCanonicalProfile } from 'fhir-runtime';
import type { CanonicalProfile } from 'fhir-runtime';

// ── Profile Registry ──────────────────────────
// Lazy-loaded from src/data/r4-profiles.json and us-core-profiles.json

const profileCache = new Map<string, CanonicalProfile>();
const rawSDCache = new Map<string, Record<string, unknown>>();
const resourceTypes = new Set<string>();
const complexTypes = new Set<string>();
const primitiveTypes = new Set<string>();
let loaded = false;
let loadPromise: Promise<void> | null = null;

// ── US Core ──────────────────────────────────
const usCoreProfileCache = new Map<string, CanonicalProfile>();
const rawUsCoreSDCache = new Map<string, Record<string, unknown>>();
const usCoreProfileNames: string[] = [];
let usCoreLoaded = false;
let usCoreLoadPromise: Promise<void> | null = null;

async function loadProfiles(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const mod = await import('../data/r4-profiles.json');
      const sdMap = (mod.default ?? mod) as Record<string, unknown>;
      for (const [type, sd] of Object.entries(sdMap)) {
        try {
          const sdObj = sd as Record<string, unknown>;
          rawSDCache.set(type, sdObj);
          const canonical = buildCanonicalProfile(sdObj as unknown as Parameters<typeof buildCanonicalProfile>[0]);
          profileCache.set(type, canonical);

          // Categorize by kind
          const kind = sdObj.kind as string;
          if (kind === 'resource') resourceTypes.add(type);
          else if (kind === 'complex-type') complexTypes.add(type);
          else if (kind === 'primitive-type') primitiveTypes.add(type);
        } catch {
          // Skip profiles that fail to build
        }
      }
      loaded = true;
    } catch (e) {
      console.warn('[profiles] Failed to load R4 profiles:', e);
    }
  })();

  return loadPromise;
}

async function loadUSCoreProfiles(): Promise<void> {
  if (usCoreLoaded) return;
  if (usCoreLoadPromise) return usCoreLoadPromise;

  // US Core depends on base R4 definitions being loaded first
  await loadProfiles();

  usCoreLoadPromise = (async () => {
    try {
      const mod = await import('../data/us-core-profiles.json');
      const sdMap = (mod.default ?? mod) as Record<string, unknown>;
      for (const [name, sd] of Object.entries(sdMap)) {
        try {
          const sdObj = sd as Record<string, unknown>;
          rawUsCoreSDCache.set(name, sdObj);
          const canonical = buildCanonicalProfile(sdObj as unknown as Parameters<typeof buildCanonicalProfile>[0]);
          usCoreProfileCache.set(name, canonical);
          usCoreProfileNames.push(name);
        } catch {
          // Skip profiles that fail to build (e.g. Extensions)
        }
      }
      usCoreProfileNames.sort();
      usCoreLoaded = true;
    } catch (e) {
      console.warn('[profiles] Failed to load US Core profiles:', e);
    }
  })();

  return usCoreLoadPromise;
}

export async function getProfile(name: string): Promise<CanonicalProfile | undefined> {
  await loadProfiles();
  return profileCache.get(name);
}

/** Returns only resource-kind type names (e.g. Patient, Observation — ~148 types). */
export async function getResourceTypeNames(): Promise<string[]> {
  await loadProfiles();
  return Array.from(resourceTypes).sort();
}

/** Returns all type names (resources + complex + primitive — ~210 types). */
export async function getAvailableProfileTypes(): Promise<string[]> {
  await loadProfiles();
  return Array.from(profileCache.keys()).sort();
}

export async function getAllProfiles(): Promise<Map<string, CanonicalProfile>> {
  await loadProfiles();
  return profileCache;
}

export async function getRawStructureDefinition(name: string): Promise<Record<string, unknown> | undefined> {
  await loadProfiles();
  return rawSDCache.get(name);
}

export function getProfileSync(name: string): CanonicalProfile | undefined {
  return profileCache.get(name);
}

export function isProfilesLoaded(): boolean {
  return loaded;
}

export function isResourceType(name: string): boolean {
  return resourceTypes.has(name);
}

export function isComplexType(name: string): boolean {
  return complexTypes.has(name);
}

// ── US Core exports ─────────────────────────
export async function getUSCoreProfileNames(): Promise<string[]> {
  await loadUSCoreProfiles();
  return [...usCoreProfileNames];
}

export async function getUSCoreProfile(name: string): Promise<CanonicalProfile | undefined> {
  await loadUSCoreProfiles();
  return usCoreProfileCache.get(name);
}

export async function getRawUSCoreSD(name: string): Promise<Record<string, unknown> | undefined> {
  await loadUSCoreProfiles();
  return rawUsCoreSDCache.get(name);
}
