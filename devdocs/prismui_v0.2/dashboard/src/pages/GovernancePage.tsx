import { useState, useEffect } from 'react';
import { usePage, useRuntimeState, useUI } from '@prismui/react';
import { audit, policy } from '../setup';
import type { AuditEntry } from '@prismui/core';

export function GovernancePage() {
  const state = useRuntimeState();
  const { isLocked, lock, unlock, transition, mount } = usePage();
  const ui = useUI();
  const [auditEntries, setAuditEntries] = useState<readonly AuditEntry[]>([]);
  const [policyDemo, setPolicyDemo] = useState<string>('—');

  useEffect(() => {
    setAuditEntries(audit.getLatest(30));
  }, [state.version]);

  // ── Demo: trigger a policy denial ──
  const handleTriggerDeny = () => {
    lock();
    setTimeout(() => {
      mount('GovernanceTarget');
      transition('GovernanceTarget');
      setPolicyDemo('PAGE_TRANSITION was DENIED because page is locked');
      ui.notify.error('Policy denied: page transition blocked while locked');
    }, 100);
  };

  // ── Demo: trigger allowed event ──
  const handleTriggerAllow = () => {
    if (isLocked) unlock();
    setTimeout(() => {
      mount('GovernanceTarget');
      transition('GovernanceTarget');
      setPolicyDemo('PAGE_TRANSITION was ALLOWED');
      ui.notify.success('Policy allowed: page transition succeeded');
      // Navigate back
      setTimeout(() => {
        mount('Governance');
        transition('Governance');
      }, 300);
    }, 100);
  };

  // ── Demo: add a custom policy rule ──
  const [customRuleAdded, setCustomRuleAdded] = useState(false);
  const handleAddCustomRule = () => {
    if (customRuleAdded) return;
    policy.addRule({
      name: 'block-drawer-when-modal-open',
      eventTypes: ['DRAWER_OPEN'],
      evaluate: (_event, runtimeState) => {
        const modalStack = runtimeState.modalStack as string[] | undefined;
        if (modalStack && modalStack.length > 0) {
          return { verdict: 'deny', reason: 'Cannot open drawer while modal is active' };
        }
        return { verdict: 'allow' };
      },
    });
    setCustomRuleAdded(true);
    ui.notify.info('Custom policy rule added: block drawer when modal is open');
  };

  // ── Demo: test custom rule ──
  const handleTestCustomRule = () => {
    ui.modal.open('confirm');
    setTimeout(() => {
      ui.drawer.open('test-drawer', 'left');
      ui.notify.warning('Attempted to open drawer while modal is active — check audit trail');
    }, 300);
  };

  const allowCount = auditEntries.filter(e => e.policyResult?.verdict !== 'deny').length;
  const denyCount = auditEntries.filter(e => e.policyResult?.verdict === 'deny').length;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Governance / Policy</h2>
        <p className="page-header__desc">
          Policy Engine, Audit Trail, and Replay — built-in governance for enterprise compliance and deterministic runtime behavior.
        </p>
      </div>

      <div className="info-card info-card--red">
        The Governance Layer intercepts <b>every event</b> before it reaches the Reducer.
        The Policy Engine can <b>allow</b>, <b>deny</b>, or <b>transform</b> events.
        The Audit Trail records every event with before/after state snapshots.
      </div>

      {/* ── Metrics ── */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="metric">
          <div className="metric__value">{audit.size()}</div>
          <div className="metric__label">Total Audit Entries</div>
        </div>
        <div className="metric">
          <div className="metric__value" style={{ color: 'var(--color-success)' }}>{allowCount}</div>
          <div className="metric__label">Allowed (recent 30)</div>
        </div>
        <div className="metric">
          <div className="metric__value" style={{ color: 'var(--color-error)' }}>{denyCount}</div>
          <div className="metric__label">Denied (recent 30)</div>
        </div>
      </div>

      <div className="grid-2">
        {/* ── Policy Engine ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Policy Engine</span>
          </div>
          <div className="card__body">
            <div className="section">
              <h4 className="section__title">Default Rule: Block Transition When Locked</h4>
              <div className="code-block">{`policy.addRule({
  name: 'block-transition-when-locked',
  eventTypes: ['PAGE_TRANSITION'],
  evaluate: (_event, state) => {
    if (state.locked) {
      return { verdict: 'deny', reason: 'Page is locked' };
    }
    return { verdict: 'allow' };
  },
});`}</div>
            </div>

            <div className="section">
              <h4 className="section__title">Try: Policy Denial</h4>
              <p className="section__desc">
                Lock the page, then attempt a transition — it will be <b>denied</b>.
              </p>
              <div className="btn-group">
                <button className="btn btn--danger" onClick={handleTriggerDeny}>
                  Lock + Navigate (denied)
                </button>
                <button className="btn btn--success" onClick={handleTriggerAllow}>
                  Unlock + Navigate (allowed)
                </button>
                {isLocked && (
                  <button className="btn" onClick={unlock}>Unlock</button>
                )}
              </div>
              {isLocked && (
                <div className="info-card info-card--red">Page is <b>LOCKED</b>. PAGE_TRANSITION events will be denied.</div>
              )}
              {policyDemo !== '—' && (
                <div className="result-display">Last result: {policyDemo}</div>
              )}
            </div>

            <div className="section">
              <h4 className="section__title">Dynamic Policy: Block Drawer When Modal Open</h4>
              <p className="section__desc">
                Add a policy rule at runtime, then test it.
              </p>
              <div className="btn-group">
                <button className="btn" onClick={handleAddCustomRule} disabled={customRuleAdded}>
                  {customRuleAdded ? 'Rule Added ✓' : 'Add Custom Rule'}
                </button>
                {customRuleAdded && (
                  <button className="btn btn--warning" onClick={handleTestCustomRule}>
                    Test: Modal + Drawer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Audit Trail ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Audit Trail</span>
            <span className="card__badge">{audit.size()} entries</span>
          </div>
          <div className="card__body--compact card__body--scroll">
            {auditEntries.length === 0 && (
              <div className="result-display">No audit entries yet — interact with the dashboard</div>
            )}
            {[...auditEntries].reverse().map((entry) => (
              <div
                key={entry.id}
                className={`audit-entry ${entry.policyResult?.verdict === 'deny' ? 'audit-entry--deny' : 'audit-entry--allow'}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{entry.event.type}</span>
                  {entry.policyResult?.verdict === 'deny' ? (
                    <span className="tag tag--error">DENIED</span>
                  ) : (
                    <span className="tag tag--active">ALLOW</span>
                  )}
                </div>
                <div className="event-item__meta">
                  v{entry.prevState.version} → {entry.nextState ? `v${entry.nextState.version}` : 'null (denied)'}
                  {entry.policyResult?.reason && (
                    <span style={{ marginLeft: 8, color: 'var(--color-error)' }}>{entry.policyResult.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {audit.size() > 0 && (
            <div style={{ padding: '8px 16px' }}>
              <button
                className="btn btn--small btn--danger"
                onClick={() => { audit.clear(); setAuditEntries([]); }}
              >
                Clear Audit Trail
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Middleware Pipeline ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">Middleware Pipeline</span>
        </div>
        <div className="card__body">
          <div className="code-block">{`Event dispatched
  → Policy Middleware (evaluate rules → allow/deny/transform)
  → Audit Middleware (record event + before/after state)
  → Reducer (pure state transition)
  → Store commit
  → Subscribers notified

// Replay: deterministic because reducers are pure
const replay = createReplaySystem(runtime);
replay.replayFrom(audit.getLatest(100));`}</div>
        </div>
      </div>
    </div>
  );
}
