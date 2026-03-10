import { useState, useCallback } from 'react';
import { useNotification } from '@prismui/react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Textarea } from '../../components/ui/Textarea';
import { Tag } from '../../components/ui/Tag';
import { InfoCard } from '../../components/ui/InfoCard';
import { Metric } from '../../components/ui/Metric';
import { validateResource } from '../../runtime/adapter';
import { EXAMPLES } from '../../data/examples';
import type { AdapterValidationResult } from '../../runtime/adapter';

export function ValidatorPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AdapterValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { show } = useNotification();

  const handleValidate = useCallback(async () => {
    if (!input.trim()) {
      show({ type: 'warning', message: 'Please enter a FHIR resource JSON.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await validateResource(input);
      setResult(res);

      if (res.valid) {
        show({ type: 'success', message: 'Resource passed structural validation.' });
      } else {
        const errorCount = res.issues.filter((i) => i.severity === 'error').length;
        show({ type: 'error', message: `Validation failed: ${errorCount} error(s) found.` });
      }
    } catch {
      show({ type: 'error', message: 'Unexpected error during validation.' });
    } finally {
      setLoading(false);
    }
  }, [input, show]);

  const handleLoadExample = useCallback((json: string) => {
    setInput(json);
    setResult(null);
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
    setResult(null);
  }, []);

  const handleLoadFile = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setInput(reader.result as string);
          setResult(null);
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  }, []);

  const errorCount = result?.issues.filter((i) => i.severity === 'error').length ?? 0;
  const warningCount = result?.issues.filter((i) => i.severity === 'warning').length ?? 0;
  const infoCount = result?.issues.filter((i) => i.severity === 'information').length ?? 0;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Resource Validator</h2>
        <p className="page-header__desc">
          Validate FHIR R4 resources against base StructureDefinition profiles.
        </p>
      </div>

      <Card title="Input" badge="FHIR JSON">
        <div className="btn-group">
          {EXAMPLES.map((ex) => (
            <Button key={ex.label} size="small" onClick={() => handleLoadExample(ex.json)}>
              {ex.label}
            </Button>
          ))}
          <Button size="small" onClick={handleLoadFile}>Load File</Button>
          <Button size="small" variant="danger" onClick={handleClear}>Clear</Button>
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Paste FHIR Resource JSON here...'
          rows={12}
        />
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={handleValidate} disabled={loading}>
            {loading ? 'Validating...' : 'Validate'}
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card title="Result" badge={result.valid ? 'VALID' : 'INVALID'}>
            <div className="grid-3" style={{ marginBottom: 12 }}>
              <Metric value={errorCount} label="Errors" />
              <Metric value={warningCount} label="Warnings" />
              <Metric value={infoCount} label="Information" />
            </div>
            {result.valid ? (
              <InfoCard variant="green">Resource is valid against the base profile.</InfoCard>
            ) : (
              <InfoCard variant="red">{errorCount} error(s) found. Resource does not conform to the base profile.</InfoCard>
            )}
          </Card>

          {result.issues.length > 0 && (
            <Card title="Issues" badge={`${result.issues.length} total`}>
              <div className="card__body--scroll" style={{ maxHeight: 400 }}>
                {result.issues.map((issue, idx) => (
                  <div key={idx} className={`issue-item issue-item--${issue.severity}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Tag variant={issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'loading' : 'info'}>
                        {issue.severity}
                      </Tag>
                      {issue.path && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          {issue.path}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{issue.message}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
