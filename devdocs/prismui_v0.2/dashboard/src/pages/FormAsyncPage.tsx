import { useState } from 'react';
import { useForm, useAsync, useUI } from '@prismui/react';

export function FormAsyncPage() {
  const form = useForm();
  const async_ = useAsync();
  const ui = useUI();
  const [submitCount, setSubmitCount] = useState(0);

  // ── Register patient form fields ──
  const handleRegister = () => {
    form.registerField('patientName', '');
    form.registerField('patientId', '');
    form.registerField('diagnosis', '');
    form.registerField('department', '');
  };

  // ── Fill with sample data ──
  const handleFill = () => {
    form.setValue('patientName', 'Zhang Wei');
    form.setValue('patientId', 'P-2026-0042');
    form.setValue('diagnosis', 'Type 2 Diabetes');
    form.setValue('department', 'Endocrinology');
    form.setTouched('patientName');
    form.setTouched('patientId');
    form.setTouched('diagnosis');
    form.setTouched('department');
  };

  // ── Validate ──
  const handleValidate = () => {
    form.validate((fields) => ({
      patientName: fields.patientName?.value === '' ? 'Patient name is required' : null,
      patientId: fields.patientId?.value === '' ? 'Patient ID is required' : null,
      diagnosis: fields.diagnosis?.value === '' ? 'Diagnosis is required' : null,
      department: fields.department?.value === '' ? 'Department is required' : null,
    }));
  };

  // ── Submit (simulated) ──
  const handleSubmit = async () => {
    handleValidate();
    if (!form.isValid()) {
      ui.notify.error('Validation failed — please fill all required fields');
      return;
    }

    form.submitStart();
    async_.start('patientSubmit');
    ui.notify.info('Submitting patient record...');

    await new Promise((r) => setTimeout(r, 1200));

    const success = Math.random() > 0.2;
    if (success) {
      form.submitSuccess();
      async_.success('patientSubmit', { recordId: `REC-${Date.now()}` });
      ui.notify.success('Patient record saved successfully!');
      setSubmitCount((c) => c + 1);
    } else {
      form.setSubmitError('Server error: database connection lost');
      async_.error('patientSubmit', 'Database connection lost');
      ui.notify.error('Submission failed: database connection lost');
    }
  };

  // ── Simulate fetch error ──
  const handleFetchError = () => {
    async_.start('fetchRecords');
    ui.notify.info('Loading patient records...');
    setTimeout(() => {
      async_.error('fetchRecords', 'Network timeout after 30s');
      ui.notify.error('Failed to load records: network timeout');
    }, 800);
  };

  // ── Reset ──
  const handleReset = () => {
    form.reset();
    async_.reset('patientSubmit');
    async_.reset('fetchRecords');
  };

  const fieldNames = Object.keys(form.fields);
  const opEntries = Object.entries(async_.operations);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Form & Async Runtime</h2>
        <p className="page-header__desc">
          Runtime-managed form state and async operation tracking — every field change, validation, and submission is a dispatched event.
        </p>
      </div>

      <div className="info-card info-card--blue">
        This simulates a <b>patient record submission</b> workflow.
        Form fields and async operations are part of <code className="code-inline">RuntimeState</code> —
        fully auditable, replayable, and governed by policy.
      </div>

      <div className="grid-2">
        {/* ── Form Lifecycle ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Patient Record Form</span>
            <span className="card__badge">{submitCount} submitted</span>
          </div>
          <div className="card__body">
            <div className="btn-group">
              <button className="btn" onClick={handleRegister}>1. Register Fields</button>
              <button className="btn" onClick={handleFill}>2. Fill Data</button>
              <button className="btn" onClick={handleValidate}>3. Validate</button>
              <button className="btn btn--primary" onClick={handleSubmit} disabled={form.isSubmitting}>
                {form.isSubmitting ? 'Submitting...' : '4. Submit'}
              </button>
              <button className="btn btn--danger" onClick={handleFetchError}>Fetch Error</button>
              <button className="btn" onClick={handleReset}>Reset</button>
            </div>

            <div className="result-display">
              submitting: <b>{String(form.isSubmitting)}</b> |
              submitCount: <b>{form.submitCount}</b> |
              dirty: <b>{String(form.isDirty())}</b> |
              valid: <b>{String(form.isValid())}</b>
            </div>

            {form.formSubmitError && (
              <div className="info-card info-card--red" style={{ marginTop: 8 }}>
                Submit error: <b>{form.formSubmitError}</b>
              </div>
            )}

            {fieldNames.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {fieldNames.map((name) => {
                  const f = form.fields[name];
                  return (
                    <div key={name} className={`field-card ${f.error ? 'field-card--error' : f.dirty ? 'field-card--dirty' : 'field-card--clean'}`}>
                      <b>{name}</b>: {String(f.value)}
                      {f.error && <span style={{ color: 'var(--color-error)' }}> — {f.error}</span>}
                      {f.touched && <span style={{ color: 'var(--color-accent)' }}> (touched)</span>}
                      {f.dirty && <span style={{ color: 'var(--color-success)' }}> (dirty)</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Async Operations ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Async Operations</span>
            <span className="card__badge">{opEntries.length} tracked</span>
          </div>
          <div className="card__body">
            {opEntries.length === 0 && (
              <div className="result-display">No async operations — submit the form or trigger a fetch</div>
            )}
            {opEntries.map(([id, op]) => (
              <div key={id} className="data-row" style={{ marginBottom: 4 }}>
                <span className="data-row__label">{id}</span>
                <span className={`tag ${
                  op.status === 'loading' ? 'tag--loading'
                    : op.status === 'success' ? 'tag--active'
                    : op.status === 'error' ? 'tag--error'
                    : 'tag--idle'
                }`}>
                  {op.status}
                  {op.error && ` — ${op.error}`}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <h4 className="section__title">API Reference</h4>
              <div className="code-block">{`const form = useForm();
form.registerField('name', '');
form.setValue('name', 'value');
form.validate(validatorFn);
form.submitStart();
form.submitSuccess();
form.reset();

const async_ = useAsync();
async_.start('fetchData');
async_.success('fetchData', data);
async_.error('fetchData', 'msg');
async_.isLoading('fetchData');
async_.isAnyLoading();`}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
