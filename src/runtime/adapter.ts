import { parseFhirJson, serializeToFhirJson } from 'fhir-runtime';
import type { ParseResult } from 'fhir-runtime';

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

// ── Validate Resource (stub — STAGE-2) ────────

export function validateResource(_json: string, _profileUrl?: string): AdapterValidationResult {
  return {
    valid: false,
    issues: [],
    error: 'Validation not yet implemented (STAGE-2)',
  };
}

// ── Evaluate FHIRPath (stub — STAGE-2) ────────

export function evaluateFHIRPath(_json: string, _expression: string): AdapterEvalResult {
  return {
    success: false,
    error: 'FHIRPath evaluation not yet implemented (STAGE-2)',
  };
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
