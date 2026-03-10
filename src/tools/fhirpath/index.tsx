import { useState, useCallback } from 'react';
import { useNotification } from '@prismui/react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Textarea } from '../../components/ui/Textarea';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { InfoCard } from '../../components/ui/InfoCard';
import { evaluateFHIRPath } from '../../runtime/adapter';
import { EXAMPLES, FHIRPATH_EXAMPLES } from '../../data/examples';

export function FHIRPathPage() {
  const [input, setInput] = useState('');
  const [expression, setExpression] = useState('');
  const [resultJson, setResultJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { show } = useNotification();

  const handleEvaluate = useCallback(() => {
    if (!input.trim()) {
      show({ type: 'warning', message: 'Please enter a FHIR resource JSON.' });
      return;
    }
    if (!expression.trim()) {
      show({ type: 'warning', message: 'Please enter a FHIRPath expression.' });
      return;
    }

    setError(null);
    setResultJson(null);

    const res = evaluateFHIRPath(input, expression);
    if (res.success) {
      setResultJson(JSON.stringify(res.result, null, 2));
      show({ type: 'success', message: `Returned ${res.result?.length ?? 0} result(s).` });
    } else {
      setError(res.error ?? 'Evaluation failed');
      show({ type: 'error', message: res.error ?? 'Evaluation failed' });
    }
  }, [input, expression, show]);

  const handleLoadResource = useCallback((json: string) => {
    setInput(json);
    setResultJson(null);
    setError(null);
  }, []);

  const handleLoadExpression = useCallback((expr: string) => {
    setExpression(expr);
    setResultJson(null);
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
    setExpression('');
    setResultJson(null);
    setError(null);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">FHIRPath Lab</h2>
        <p className="page-header__desc">
          Evaluate FHIRPath expressions against FHIR resources interactively.
        </p>
      </div>

      <Card title="Resource" badge="FHIR JSON">
        <div className="btn-group">
          {EXAMPLES.filter((e) => e.label !== 'Invalid Patient').map((ex) => (
            <Button key={ex.label} size="small" onClick={() => handleLoadResource(ex.json)}>
              {ex.label}
            </Button>
          ))}
          <Button size="small" variant="danger" onClick={handleClear}>Clear</Button>
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Paste FHIR Resource JSON here...'
          rows={10}
        />
      </Card>

      <Card title="Expression" badge="FHIRPath">
        <div className="btn-group">
          {FHIRPATH_EXAMPLES.map((ex) => (
            <Button key={ex.label} size="small" onClick={() => handleLoadExpression(ex.expression)} title={ex.description}>
              {ex.label}
            </Button>
          ))}
        </div>
        <input
          className="input"
          type="text"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="e.g. Patient.name.given"
          onKeyDown={(e) => { if (e.key === 'Enter') handleEvaluate(); }}
        />
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={handleEvaluate}>
            Evaluate
          </Button>
        </div>
      </Card>

      {error && (
        <Card title="Error">
          <InfoCard variant="red">{error}</InfoCard>
        </Card>
      )}

      {resultJson !== null && (
        <Card title="Result" badge="JSON">
          <CodeBlock>{resultJson}</CodeBlock>
        </Card>
      )}
    </div>
  );
}
