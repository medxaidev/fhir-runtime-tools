import { buildCanonicalProfile } from 'fhir-runtime';
import type { CanonicalProfile } from 'fhir-runtime';

// ── Profile Registry ──────────────────────────
// Lazy-loaded from src/data/r4-profiles.json (extracted from spec/fhir/r4/)

const profileCache = new Map<string, CanonicalProfile>();
let loaded = false;
let loadPromise: Promise<void> | null = null;

async function loadProfiles(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const mod = await import('../data/r4-profiles.json');
      const sdMap = (mod.default ?? mod) as Record<string, unknown>;
      for (const [type, sd] of Object.entries(sdMap)) {
        try {
          const canonical = buildCanonicalProfile(sd as Parameters<typeof buildCanonicalProfile>[0]);
          profileCache.set(type, canonical);
        } catch {
          // Skip profiles that fail to build
        }
      }
      loaded = true;
    } catch (e) {
      console.warn('[profiles] Failed to load profiles:', e);
    }
  })();

  return loadPromise;
}

export async function getProfile(resourceType: string): Promise<CanonicalProfile | undefined> {
  await loadProfiles();
  return profileCache.get(resourceType);
}

export async function getAvailableProfileTypes(): Promise<string[]> {
  await loadProfiles();
  return Array.from(profileCache.keys()).sort();
}

export function getProfileSync(resourceType: string): CanonicalProfile | undefined {
  return profileCache.get(resourceType);
}

export function isProfilesLoaded(): boolean {
  return loaded;
}
