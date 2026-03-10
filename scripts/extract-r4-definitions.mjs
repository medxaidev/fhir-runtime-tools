/**
 * Extract all FHIR R4 StructureDefinitions from the official spec bundles.
 * 
 * Downloads profiles-resources.json and profiles-types.json from hl7.org,
 * extracts all StructureDefinition entries, and writes them to src/data/r4-profiles.json.
 * 
 * Usage: node scripts/extract-r4-definitions.mjs
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'src', 'data', 'r4-profiles.json');

const FHIR_R4_BASE = 'https://hl7.org/fhir/R4';
const BUNDLE_FILES = [
  `${FHIR_R4_BASE}/profiles-resources.json`,
  `${FHIR_R4_BASE}/profiles-types.json`,
];

async function fetchJson(url) {
  console.log(`  Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function extractStructureDefinitions(bundle) {
  const sds = {};
  if (!bundle?.entry) return sds;
  
  for (const entry of bundle.entry) {
    const resource = entry?.resource;
    if (resource?.resourceType !== 'StructureDefinition') continue;
    
    // Use the type or name as key
    const key = resource.type || resource.name;
    if (!key) continue;
    
    // Only include definitions with snapshots
    if (!resource.snapshot?.element?.length) continue;
    
    sds[key] = resource;
  }
  
  return sds;
}

async function main() {
  console.log('Extracting FHIR R4 StructureDefinitions...\n');
  
  const allSDs = {};
  let resourceCount = 0;
  let typeCount = 0;
  
  for (const url of BUNDLE_FILES) {
    const bundle = await fetchJson(url);
    const sds = extractStructureDefinitions(bundle);
    const count = Object.keys(sds).length;
    
    if (url.includes('profiles-resources')) {
      resourceCount = count;
      console.log(`  → ${count} resource definitions`);
    } else {
      typeCount = count;
      console.log(`  → ${count} type definitions`);
    }
    
    Object.assign(allSDs, sds);
  }
  
  const total = Object.keys(allSDs).length;
  console.log(`\nTotal: ${total} definitions (${resourceCount} resources + ${typeCount} types)`);
  
  // Categorize
  const resources = [];
  const complexTypes = [];
  const primitiveTypes = [];
  
  for (const [key, sd] of Object.entries(allSDs)) {
    if (sd.kind === 'resource') resources.push(key);
    else if (sd.kind === 'complex-type') complexTypes.push(key);
    else if (sd.kind === 'primitive-type') primitiveTypes.push(key);
  }
  
  console.log(`  Resources: ${resources.length}`);
  console.log(`  Complex types: ${complexTypes.length}`);
  console.log(`  Primitive types: ${primitiveTypes.length}`);
  
  // Write output
  const dir = dirname(OUTPUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  
  writeFileSync(OUTPUT, JSON.stringify(allSDs, null, 0));
  
  const sizeMB = (Buffer.byteLength(JSON.stringify(allSDs)) / 1024 / 1024).toFixed(1);
  console.log(`\nWritten to: ${OUTPUT}`);
  console.log(`File size: ~${sizeMB} MB`);
  
  // Print some resource names for verification
  console.log(`\nSample resources: ${resources.sort().slice(0, 20).join(', ')} ...`);
  console.log(`Sample complex types: ${complexTypes.sort().slice(0, 10).join(', ')} ...`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
