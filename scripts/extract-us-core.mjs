/**
 * Extract US Core StructureDefinitions from the FHIR NPM package registry.
 * Uses only Node.js built-in modules (no npm dependencies).
 *
 * Usage: node scripts/extract-us-core.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'src', 'data', 'us-core-profiles.json');

// US Core STU 7.0.0 (FHIR R4 based)
const PACKAGE_URL = 'https://packages.fhir.org/hl7.fhir.us.core/7.0.0';

// ── Minimal tar parser (ustar format) ──────────
function parseTar(buffer) {
  const files = [];
  let offset = 0;
  while (offset < buffer.length - 512) {
    const header = buffer.slice(offset, offset + 512);
    // Check for end-of-archive (two consecutive 512-byte zero blocks)
    if (header.every((b) => b === 0)) break;

    const name = header.slice(0, 100).toString('utf-8').replace(/\0/g, '');
    const sizeOctal = header.slice(124, 136).toString('utf-8').replace(/\0/g, '').trim();
    const size = parseInt(sizeOctal, 8) || 0;

    offset += 512; // move past header
    if (size > 0) {
      const data = buffer.slice(offset, offset + size);
      files.push({ name, data });
      // Tar entries are padded to 512-byte boundaries
      offset += Math.ceil(size / 512) * 512;
    }
  }
  return files;
}

async function main() {
  console.log('[us-core] Downloading US Core package...');

  const res = await fetch(PACKAGE_URL);
  if (!res.ok) {
    console.error('[us-core] Failed to download:', res.status, res.statusText);
    process.exit(1);
  }

  const gzBuffer = Buffer.from(await res.arrayBuffer());
  console.log('[us-core] Downloaded', (gzBuffer.length / 1024).toFixed(0), 'KB, decompressing...');

  const tarBuffer = gunzipSync(gzBuffer);
  const files = parseTar(tarBuffer);

  console.log('[us-core] Found', files.length, 'files in tarball');

  // Filter to StructureDefinition JSON files
  const sdFiles = files.filter((f) =>
    f.name.includes('StructureDefinition-') && f.name.endsWith('.json'),
  );

  console.log('[us-core] Found', sdFiles.length, 'StructureDefinition files');

  const profiles = {};
  let resourceProfiles = 0;
  let extensionProfiles = 0;

  for (const file of sdFiles) {
    try {
      const content = file.data.toString('utf-8');
      const sd = JSON.parse(content);
      if (sd.resourceType !== 'StructureDefinition') continue;
      if (!sd.type || !sd.name) continue;

      profiles[sd.name] = sd;
      if (sd.type === 'Extension') {
        extensionProfiles++;
      } else {
        resourceProfiles++;
      }
    } catch (e) {
      console.warn('[us-core] Skipping', file.name, ':', e.message);
    }
  }

  console.log('[us-core] Resource profiles:', resourceProfiles);
  console.log('[us-core] Extension profiles:', extensionProfiles);
  console.log('[us-core] Total:', Object.keys(profiles).length);

  const json = JSON.stringify(profiles, null, 0);
  writeFileSync(OUTPUT, json);
  console.log('[us-core] Written to', OUTPUT, '(' + (Buffer.byteLength(json) / 1024 / 1024).toFixed(1) + ' MB)');
  console.log('[us-core] Done!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
