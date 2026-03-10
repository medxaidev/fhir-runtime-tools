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

    return {
      valid: result.valid,
      issues: result.issues.map((i) => ({
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
