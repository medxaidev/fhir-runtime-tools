import { parseFhirJson, serializeToFhirJson, StructureValidator, evalFhirPath } from 'fhir-runtime';
import type { ParseResult, Resource } from 'fhir-runtime';
import { getProfile } from './profiles';

// ── Types ─────────────────────────────────────

export interface AdapterParseResult {
  success: boolean;
  data?: unknown;
  formatted?: string;
  error?: string;
}

export interface AdapterValidationResult {
  valid: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'information';
    code: string;
    message: string;
    path: string;
  }>;
  error?: string;
}

export interface AdapterEvalResult {
  success: boolean;
  result?: unknown[];
  error?: string;
}

export interface AdapterDiffResult {
  success: boolean;
  diffs: Array<{
    path: string;
    type: 'added' | 'removed' | 'changed';
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  error?: string;
}

// ── Parse Resource ────────────────────────────

export function parseResource(json: string): AdapterParseResult {
  try {
    const parsed = JSON.parse(json);
    const result: ParseResult<unknown> = parseFhirJson(json);
    if (result.success) {
      return {
        success: true,
        data: result.data,
        formatted: serializeToFhirJson(parsed),
      };
    }
    return {
      success: false,
      error: result.issues?.map((i) => i.message).join('; ') ?? 'Parse failed',
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    };
  }
}

// ── Validate Resource ─────────────────────────

// Workaround for fhir-runtime v0.7.1 inferComplexType bug:
// The type inference heuristic misidentifies ContactPoint as Identifier,
// HumanName/Address patterns can also be confused. We suppress false-positive
// TYPE_MISMATCH errors by checking if the inferred vs expected types are
// in a known-ambiguous set and the data shape matches the expected type.
const TYPE_INFERENCE_FIXES: Record<string, (obj: unknown) => boolean> = {
  ContactPoint: (obj) => {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return ('system' in o || 'value' in o || 'use' in o) && !('type' in o && 'period' in o && 'assigner' in o);
  },
  Identifier: (obj) => {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return 'system' in o && 'value' in o && !('use' in o && ['home', 'work', 'temp', 'old', 'mobile'].includes(String(o.use)));
  },
};

function isTypeMismatchFalsePositive(
  issue: { code: string; path: string; message: string },
  parsed: Record<string, unknown>,
  expectedTypeCodes: string[],
): boolean {
  if (issue.code !== 'TYPE_MISMATCH') return false;

  // Extract value at the path from the resource
  const pathParts = issue.path.split('.');
  let current: unknown = parsed;
  for (let i = 1; i < pathParts.length; i++) {
    if (current === null || current === undefined) return false;
    if (Array.isArray(current)) {
      // Check first element for type checking
      current = current[0];
      if (current === null || current === undefined) return false;
    }
    current = (current as Record<string, unknown>)[pathParts[i]];
  }

  // If value is an array, check the first element
  const items = Array.isArray(current) ? current : [current];

  for (const item of items) {
    for (const expectedType of expectedTypeCodes) {
      const checker = TYPE_INFERENCE_FIXES[expectedType];
      if (checker && checker(item)) {
        return true;
      }
    }
  }
  return false;
}

export async function validateResource(json: string): Promise<AdapterValidationResult> {
  try {
    const parsed = JSON.parse(json);
    const resourceType = parsed?.resourceType;
    if (!resourceType) {
      return { valid: false, issues: [{ severity: 'error', code: 'invalid', message: 'Missing resourceType field', path: '' }] };
    }

    const profile = await getProfile(resourceType);
    if (!profile) {
      return { valid: false, issues: [{ severity: 'error', code: 'not-supported', message: `No profile found for resource type: ${resourceType}`, path: '' }] };
    }

    const validator = new StructureValidator();
    const result = validator.validate(parsed as Resource, profile);

    // Filter out false-positive TYPE_MISMATCH issues caused by fhir-runtime inference bug
    const filteredIssues = result.issues.filter((i) => {
      if (String(i.code) === 'TYPE_MISMATCH' && i.path) {
        const element = profile.elements.get(i.path);
        if (element) {
          const expectedCodes = element.types.map((t) => t.code);
          if (isTypeMismatchFalsePositive({ code: String(i.code), path: i.path, message: i.message }, parsed, expectedCodes)) {
            return false; // suppress false positive
          }
        }
      }
      return true;
    });

    const hasErrors = filteredIssues.some((i) => i.severity === 'error');

    return {
      valid: !hasErrors,
      issues: filteredIssues.map((i) => ({
        severity: i.severity,
        code: String(i.code),
        message: i.message,
        path: i.path ?? '',
      })),
    };
  } catch (e) {
    return {
      valid: false,
      issues: [{ severity: 'error', code: 'exception', message: e instanceof Error ? e.message : 'Validation failed', path: '' }],
    };
  }
}

// ── Evaluate FHIRPath ─────────────────────────

export function evaluateFHIRPath(json: string, expression: string): AdapterEvalResult {
  try {
    if (!expression.trim()) {
      return { success: false, error: 'Expression is empty' };
    }
    const parsed = JSON.parse(json);
    const result = evalFhirPath(expression, parsed);
    return { success: true, result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'FHIRPath evaluation failed',
    };
  }
}

// ── Inspect Profile (stub — STAGE-3) ──────────

export function inspectProfile(_sd: unknown): { success: boolean; error?: string } {
  return {
    success: false,
    error: 'Profile inspection not yet implemented (STAGE-3)',
  };
}

// ── Diff Resources (stub — STAGE-4) ───────────

export function diffResources(_a: string, _b: string): AdapterDiffResult {
  return {
    success: false,
    diffs: [],
    error: 'Resource diff not yet implemented (STAGE-4)',
  };
}

// ── Generate Resource (stub — STAGE-4) ────────

export function generateResource(_type: string): string {
  return JSON.stringify({ resourceType: _type, id: 'generated-placeholder' }, null, 2);
}
