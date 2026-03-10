import { useState, useCallback } from 'react';
import { useUI, useForm, useAsync } from '@prismui/react';

type WorkflowStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

interface WorkflowRecord {
  id: string;
  patientName: string;
  diagnosis: string;
  department: string;
  status: WorkflowStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewer?: string;
  rejectReason?: string;
}

const STEPS: { key: WorkflowStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
];

// ── Persistent state (survives component unmount) ──
let _record: WorkflowRecord = {
  id: 'WF-2026-001',
  patientName: '',
  diagnosis: '',
  department: '',
  status: 'draft',
};
let _auditLog: string[] = [];

export function WorkflowPage() {
  const ui = useUI();
  const form = useForm();
  const async_ = useAsync();

  // Force re-render when persistent state changes
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const record = _record;
  const setRecord = (updater: (r: WorkflowRecord) => WorkflowRecord) => {
    _record = updater(_record);
    rerender();
  };

  const auditLog = _auditLog;

  const log = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    _auditLog = [`[${ts}] ${msg}`, ..._auditLog].slice(0, 30);
    rerender();
  };

  // ── Init form ──
  const initForm = () => {
    form.registerField('patientName', '');
    form.registerField('diagnosis', '');
    form.registerField('department', '');
    log('Form initialized — fields registered');
  };

  // ── Fill form ──
  const fillForm = () => {
    form.setValue('patientName', 'Li Ming');
    form.setValue('diagnosis', 'Hypertension Stage 2');
    form.setValue('department', 'Cardiology');
    form.setTouched('patientName');
    form.setTouched('diagnosis');
    form.setTouched('department');

    setRecord((r) => ({
      ...r,
      patientName: 'Li Ming',
      diagnosis: 'Hypertension Stage 2',
      department: 'Cardiology',
    }));
    log('Form filled with patient data');
  };

  // ── Submit ──
  const handleSubmit = async () => {
    // Validate
    form.validate((fields) => ({
      patientName: fields.patientName?.value === '' ? 'Required' : null,
      diagnosis: fields.diagnosis?.value === '' ? 'Required' : null,
      department: fields.department?.value === '' ? 'Required' : null,
    }));

    if (!form.isValid()) {
      ui.notify.error('Validation failed — fill all fields');
      log('Submit blocked: validation failed');
      return;
    }

    form.submitStart();
    async_.start('workflow-submit');
    ui.notify.info('Submitting for review...');
    log('Submitting record...');

    await new Promise((r) => setTimeout(r, 800));

    form.submitSuccess();
    async_.success('workflow-submit', { ok: true });
    setRecord((r) => ({
      ...r,
      status: 'submitted',
      submittedAt: new Date().toLocaleTimeString(),
    }));
    ui.notify.success('Record submitted for review!');
    log(`Status: draft → submitted`);
  };

  // ── Start Review ──
  const handleStartReview = async () => {
    async_.start('workflow-review');
    setRecord((r) => ({ ...r, status: 'under_review' }));
    ui.notify.info('Review started by Dr. Wang...');
    log('Status: submitted → under_review (Reviewer: Dr. Wang)');

    await new Promise((r) => setTimeout(r, 1500));
    async_.success('workflow-review', { reviewer: 'Dr. Wang' });
    setRecord((r) => ({ ...r, reviewer: 'Dr. Wang' }));
    log('Review complete — awaiting decision');
  };

  // ── Approve ──
  const handleApprove = async () => {
    log('Opening approval confirmation...');
    const confirmed = await ui.confirm('confirm');
    if (!confirmed) {
      log('Approval cancelled');
      ui.notify.info('Approval cancelled');
      return;
    }

    setRecord((r) => ({
      ...r,
      status: 'approved',
      reviewedAt: new Date().toLocaleTimeString(),
    }));
    ui.notify.success('Record APPROVED by Dr. Wang');
    log('Status: under_review → approved ✓');

    // Open drawer with approval details
    ui.drawer.open('approval-details', 'right');
  };

  // ── Reject ──
  const handleReject = async () => {
    log('Opening rejection confirmation...');
    const confirmed = await ui.confirm('confirm');
    if (!confirmed) {
      log('Rejection cancelled');
      return;
    }

    const reason = 'Incomplete patient history — requires additional documentation';
    setRecord((r) => ({
      ...r,
      status: 'rejected',
      reviewedAt: new Date().toLocaleTimeString(),
      rejectReason: reason,
    }));
    ui.notify.error(`Record REJECTED: ${reason}`);
    log(`Status: under_review → rejected ✗ (${reason})`);
  };

  // ── Reset ──
  const handleReset = () => {
    form.reset();
    async_.reset('workflow-submit');
    async_.reset('workflow-review');
    ui.drawer.closeAll();
    _record = {
      id: 'WF-2026-001',
      patientName: '',
      diagnosis: '',
      department: '',
      status: 'draft',
    };
    _auditLog = [];
    rerender();
    log('Workflow reset to draft');
  };

  const getStepClass = (stepKey: WorkflowStatus) => {
    const steps = STEPS.map((s) => s.key);
    const currentIdx = steps.indexOf(record.status === 'rejected' ? 'under_review' : record.status);
    const stepIdx = steps.indexOf(stepKey);

    if (record.status === 'rejected' && stepKey === 'approved') return 'workflow-step--rejected';
    if (stepIdx < currentIdx) return 'workflow-step--done';
    if (stepIdx === currentIdx) return 'workflow-step--active';
    return '';
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Approval Workflow</h2>
        <p className="page-header__desc">
          A real-world medical record approval flow — Draft → Submit → Review → Approve/Reject.
          Demonstrates runtime modules, DSL, form, async, notifications, and governance working together.
        </p>
      </div>

      <div className="info-card info-card--yellow">
        This workflow combines <b>6 PrismUI runtime capabilities</b> in a single page:
        Form Module, Async Module, Interaction DSL, Modal (confirm), Drawer (details),
        Notification (status updates), and the Audit Trail records every step.
      </div>

      {/* ── Workflow Progress ── */}
      <div className="workflow-steps">
        {STEPS.map((step) => (
          <div key={step.key} className={`workflow-step ${getStepClass(step.key)}`}>
            {step.label}
            {record.status === 'rejected' && step.key === 'approved' && ' (Rejected)'}
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* ── Left: Record & Actions ── */}
        <div>
          {/* Record card */}
          <div className="card">
            <div className="card__header">
              <span className="card__title">Patient Record: {record.id}</span>
              <span className={`tag ${record.status === 'approved' ? 'tag--active' :
                  record.status === 'rejected' ? 'tag--error' :
                    record.status === 'under_review' ? 'tag--loading' :
                      record.status === 'submitted' ? 'tag--info' :
                        'tag--idle'
                }`}>
                {record.status.replace('_', ' ')}
              </span>
            </div>
            <div className="card__body">
              <div className="data-row"><span className="data-row__label">Patient</span><span>{record.patientName || '—'}</span></div>
              <div className="data-row"><span className="data-row__label">Diagnosis</span><span>{record.diagnosis || '—'}</span></div>
              <div className="data-row"><span className="data-row__label">Department</span><span>{record.department || '—'}</span></div>
              {record.submittedAt && <div className="data-row"><span className="data-row__label">Submitted</span><span>{record.submittedAt}</span></div>}
              {record.reviewer && <div className="data-row"><span className="data-row__label">Reviewer</span><span>{record.reviewer}</span></div>}
              {record.reviewedAt && <div className="data-row"><span className="data-row__label">Reviewed</span><span>{record.reviewedAt}</span></div>}
              {record.rejectReason && (
                <div className="info-card info-card--red" style={{ marginTop: 8 }}>
                  Rejection reason: {record.rejectReason}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="card__header">
              <span className="card__title">Workflow Actions</span>
            </div>
            <div className="card__body">
              {record.status === 'draft' && (
                <div className="btn-group">
                  <button className="btn" onClick={initForm}>1. Init Form</button>
                  <button className="btn" onClick={fillForm}>2. Fill Data</button>
                  <button className="btn btn--primary" onClick={handleSubmit} disabled={form.isSubmitting}>
                    {form.isSubmitting ? 'Submitting...' : '3. Submit for Review'}
                  </button>
                </div>
              )}
              {record.status === 'submitted' && (
                <div className="btn-group">
                  <button className="btn btn--primary" onClick={handleStartReview}>
                    Start Review (Dr. Wang)
                  </button>
                </div>
              )}
              {record.status === 'under_review' && (
                <div className="btn-group">
                  <button className="btn btn--success" onClick={handleApprove}>
                    Approve
                  </button>
                  <button className="btn btn--danger" onClick={handleReject}>
                    Reject
                  </button>
                </div>
              )}
              {(record.status === 'approved' || record.status === 'rejected') && (
                <div className="btn-group">
                  <button className="btn" onClick={handleReset}>
                    Reset Workflow
                  </button>
                </div>
              )}

              {/* Form state (visible in draft) */}
              {record.status === 'draft' && Object.keys(form.fields).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 className="section__title">Form Fields</h4>
                  {Object.entries(form.fields).map(([name, f]) => (
                    <div key={name} className={`field-card ${f.error ? 'field-card--error' : f.dirty ? 'field-card--dirty' : 'field-card--clean'}`}>
                      <b>{name}</b>: {String(f.value)}
                      {f.error && <span style={{ color: 'var(--color-error)' }}> — {f.error}</span>}
                      {f.dirty && <span style={{ color: 'var(--color-success)' }}> (dirty)</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Async ops */}
              {Object.keys(async_.operations).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 className="section__title">Async Operations</h4>
                  {Object.entries(async_.operations).map(([id, op]) => (
                    <div key={id} className="data-row">
                      <span className="data-row__label">{id}</span>
                      <span className={`tag ${op.status === 'loading' ? 'tag--loading' :
                          op.status === 'success' ? 'tag--active' :
                            op.status === 'error' ? 'tag--error' : 'tag--idle'
                        }`}>{op.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Workflow Audit Log ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Workflow Audit Log</span>
            <span className="card__badge">{auditLog.length} entries</span>
          </div>
          <div className="card__body--compact card__body--scroll">
            {auditLog.length === 0 && (
              <div className="result-display">Start the workflow to see the audit log</div>
            )}
            {auditLog.map((msg, i) => (
              <div key={i} className="event-item">
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Architecture Note ── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__header">
          <span className="card__title">Architecture: How This Page Works</span>
        </div>
        <div className="card__body">
          <div className="code-block">{`// This single workflow page combines:
const ui = useUI();         // Interaction DSL (modal, drawer, notify)
const form = useForm();     // Form Module (register, validate, submit)
const async_ = useAsync();  // Async Module (loading, success, error)

// Flow:
// 1. form.registerField() → FORM_REGISTER_FIELD event
// 2. form.setValue()       → FORM_SET_VALUE event
// 3. form.validate()       → FORM_VALIDATE event
// 4. form.submitStart()    → FORM_SUBMIT_START event
// 5. async_.start()        → ASYNC_START event
// 6. ui.confirm()          → MODAL_OPEN + Promise<boolean>
// 7. ui.notify.success()   → NOTIFICATION_SHOW event
// 8. ui.drawer.open()      → DRAWER_OPEN event
//
// Every event → Policy → Audit → Reducer → Commit → Render
// All steps are auditable, replayable, and governed by policy.`}</div>
        </div>
      </div>
    </div>
  );
}
