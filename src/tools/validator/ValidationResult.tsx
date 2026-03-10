import { useMemo } from 'react';
import { Tag } from '../../components/ui/Tag';
import { Metric } from '../../components/ui/Metric';
import { InfoCard } from '../../components/ui/InfoCard';
import type { AdapterValidationResult } from '../../runtime/adapter';
import type { CanonicalProfile } from 'fhir-runtime';

interface ResourceStats {
  elementsUsed: number;
  totalElements: number;
  missingRequired: number;
  errors: number;
  warnings: number;
}

interface ValidationResultProps {
  result: AdapterValidationResult | null;
  loading?: boolean;
  onIssuePath?: (path: string) => void;
  stats?: ResourceStats | null;
  profile?: CanonicalProfile | null;
}

function getRuleExplanation(
  issue: { path: string; code: string },
  profile: CanonicalProfile | null,
): string | null {
  if (!profile || !issue.path) return null;
  const el = profile.elements.get(issue.path);
  if (!el) return null;
  const card = `${el.min}..${el.max === 'unbounded' ? '*' : el.max}`;
  const types = el.types.map((t) => t.code).join(' | ') || 'BackboneElement';
  return `StructureDefinition: ${profile.type} | Cardinality: ${card} | Type: ${types}`;
}

export function ValidationResult({ result, loading, onIssuePath, stats, profile }: ValidationResultProps) {
  const errorCount = useMemo(() => result?.issues.filter((i) => i.severity === 'error').length ?? 0, [result]);
  const warningCount = useMemo(() => result?.issues.filter((i) => i.severity === 'warning').length ?? 0, [result]);
  const infoCount = useMemo(() => result?.issues.filter((i) => i.severity === 'information').length ?? 0, [result]);

  if (loading) {
    return (
      <div className="validation-result">
        <div className="validation-result__header">
          <span className="validation-result__title">Validation Result</span>
        </div>
        <div className="validation-result__body">
          <div className="validation-result__loading">Validating...</div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="validation-result">
        <div className="validation-result__header">
          <span className="validation-result__title">Validation Result</span>
        </div>
        <div className="validation-result__body">
          {stats && (
            <div className="validation-result__stats">
              <div className="validation-result__stats-title">Resource Stats</div>
              <div className="validation-result__stats-grid">
                <div className="validation-result__stat">
                  <span className="validation-result__stat-value">{stats.elementsUsed}</span>
                  <span className="validation-result__stat-label">Elements Used</span>
                </div>
                <div className="validation-result__stat">
                  <span className="validation-result__stat-value">{stats.totalElements}</span>
                  <span className="validation-result__stat-label">Total Elements</span>
                </div>
                <div className="validation-result__stat">
                  <span className={`validation-result__stat-value ${stats.missingRequired > 0 ? 'validation-result__stat-value--error' : ''}`}>
                    {stats.missingRequired}
                  </span>
                  <span className="validation-result__stat-label">Missing Required</span>
                </div>
              </div>
            </div>
          )}
          <div className="placeholder" style={{ padding: '30px 20px' }}>
            <div className="placeholder__icon">&#x2714;</div>
            <div className="placeholder__title">No Results Yet</div>
            <div className="placeholder__desc">Enter a FHIR resource and click Validate.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="validation-result">
      <div className="validation-result__header">
        <span className="validation-result__title">Validation Result</span>
        <Tag variant={result.valid ? 'active' : 'error'}>{result.valid ? 'VALID' : 'INVALID'}</Tag>
      </div>
      <div className="validation-result__body">
        <div className="validation-result__metrics">
          <Metric value={errorCount} label="Errors" />
          <Metric value={warningCount} label="Warnings" />
          <Metric value={infoCount} label="Info" />
        </div>

        {stats && (
          <div className="validation-result__stats">
            <div className="validation-result__stats-title">Resource Stats</div>
            <div className="validation-result__stats-grid">
              <div className="validation-result__stat">
                <span className="validation-result__stat-value">{stats.elementsUsed}/{stats.totalElements}</span>
                <span className="validation-result__stat-label">Elements Used</span>
              </div>
              <div className="validation-result__stat">
                <span className={`validation-result__stat-value ${stats.missingRequired > 0 ? 'validation-result__stat-value--error' : ''}`}>
                  {stats.missingRequired}
                </span>
                <span className="validation-result__stat-label">Missing Required</span>
              </div>
            </div>
          </div>
        )}

        {result.valid ? (
          <InfoCard variant="green">Resource is valid against the base profile.</InfoCard>
        ) : (
          <InfoCard variant="red">{errorCount} error(s) found.</InfoCard>
        )}

        {result.issues.length > 0 && (
          <div className="validation-result__issues">
            {result.issues.map((issue, idx) => {
              const ruleExplanation = getRuleExplanation(issue, profile ?? null);
              return (
                <div
                  key={idx}
                  className={`issue-item issue-item--${issue.severity}`}
                  onClick={() => issue.path && onIssuePath?.(issue.path)}
                  style={{ cursor: issue.path ? 'pointer' : 'default' }}
                >
                  <div className="issue-item__header">
                    <Tag variant={issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'loading' : 'info'}>
                      {issue.severity}
                    </Tag>
                    {issue.path && (
                      <span className="issue-item__path">{issue.path}</span>
                    )}
                  </div>
                  <div className="issue-item__message">{issue.message}</div>
                  {ruleExplanation && (
                    <div className="issue-item__rule">{ruleExplanation}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
