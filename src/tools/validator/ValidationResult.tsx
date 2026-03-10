import { Tag } from '../../components/ui/Tag';
import { Metric } from '../../components/ui/Metric';
import { InfoCard } from '../../components/ui/InfoCard';
import type { AdapterValidationResult } from '../../runtime/adapter';

interface ValidationResultProps {
  result: AdapterValidationResult | null;
  loading?: boolean;
  onIssuePath?: (path: string) => void;
}

export function ValidationResult({ result, loading, onIssuePath }: ValidationResultProps) {
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
          <div className="placeholder" style={{ padding: '40px 20px' }}>
            <div className="placeholder__icon">&#x2714;</div>
            <div className="placeholder__title">No Results Yet</div>
            <div className="placeholder__desc">Enter a FHIR resource and click Validate.</div>
          </div>
        </div>
      </div>
    );
  }

  const errorCount = result.issues.filter((i) => i.severity === 'error').length;
  const warningCount = result.issues.filter((i) => i.severity === 'warning').length;
  const infoCount = result.issues.filter((i) => i.severity === 'information').length;

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

        {result.valid ? (
          <InfoCard variant="green">Resource is valid against the base profile.</InfoCard>
        ) : (
          <InfoCard variant="red">{errorCount} error(s) found.</InfoCard>
        )}

        {result.issues.length > 0 && (
          <div className="validation-result__issues">
            {result.issues.map((issue, idx) => (
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
