import { useState } from 'react';
import { useUI, useModal, useDrawer, useNotification, useAsync } from '@prismui/react';

export function InteractionScenarios() {
  const ui = useUI();
  const { modalStack } = useModal();
  const { drawerStack } = useDrawer();
  const { notifications, dismiss } = useNotification();
  const async_ = useAsync();
  const [confirmResult, setConfirmResult] = useState<string>('—');
  const [scenarioLog, setScenarioLog] = useState<string[]>([]);

  const log = (msg: string) => setScenarioLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));

  // ── Scenario 1: Modal → Confirm → Notification ──
  const runConfirmFlow = async () => {
    log('Starting confirm flow...');
    setConfirmResult('waiting...');
    const result = await ui.confirm('confirm');
    if (result) {
      log('User confirmed ✓');
      setConfirmResult('Confirmed ✓');
      ui.notify.success('Action confirmed successfully!');
    } else {
      log('User cancelled ✗');
      setConfirmResult('Cancelled ✗');
      ui.notify.info('Action was cancelled');
    }
  };

  // ── Scenario 2: Full business action chain ──
  const runBusinessAction = async () => {
    log('=== Business Action Started ===');

    // Step 1: Open confirm dialog
    log('Step 1: Opening confirmation...');
    const confirmed = await ui.confirm('confirm');
    if (!confirmed) {
      log('Action cancelled by user');
      ui.notify.warning('Operation cancelled');
      return;
    }

    // Step 2: Start async operation
    log('Step 2: Starting async operation...');
    async_.start('businessAction');
    ui.notify.info('Processing your request...');

    // Step 3: Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Step 4: Randomly succeed or fail
    const success = Math.random() > 0.3;
    if (success) {
      async_.success('businessAction', { result: 'ok' });
      log('Step 3: Operation succeeded ✓');
      ui.notify.success('Operation completed successfully!');
    } else {
      async_.error('businessAction', 'Server error 500');
      log('Step 3: Operation failed ✗');
      ui.notify.error('Operation failed: Server error 500');
    }

    log('=== Business Action Complete ===');
  };

  // ── Scenario 3: Multi-modal + drawer orchestration ──
  const runOrchestration = () => {
    log('Opening drawer (left)...');
    ui.drawer.open('details', 'left');

    setTimeout(() => {
      log('Opening drawer (right)...');
      ui.drawer.open('settings', 'right');
    }, 300);

    setTimeout(() => {
      log('Sending notification...');
      ui.notify.info('Multiple UI elements open simultaneously');
    }, 600);

    setTimeout(() => {
      log('Opening modal...');
      ui.modal.open('confirm');
    }, 900);
  };

  // ── Scenario 4: Notification burst ──
  const runNotificationBurst = () => {
    log('Sending notification burst...');
    ui.notify.info('Info: System status normal');
    setTimeout(() => ui.notify.success('Success: Data saved'), 200);
    setTimeout(() => ui.notify.warning('Warning: Rate limit approaching'), 400);
    setTimeout(() => ui.notify.error('Error: Connection timeout'), 600);
    log('4 notifications sent');
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Interaction Scenarios</h2>
        <p className="page-header__desc">
          Real-world interaction patterns using <code className="code-inline">ui.*</code> DSL — modal, drawer, notification, and async chaining.
        </p>
      </div>

      <div className="info-card info-card--green">
        Every button below uses the <b>Interaction DSL</b> (<code className="code-inline">useUI()</code>).
        All dispatched events flow through the same runtime pipeline — Policy → Audit → Reducer → Commit.
        Watch the status bar and Runtime Playground for live state changes.
      </div>

      <div className="grid-2">
        {/* ── Scenario 1: Confirm Flow ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Scenario 1: Confirm Flow</span>
          </div>
          <div className="card__body">
            <p className="section__desc">
              <code className="code-inline">ui.confirm()</code> opens a modal and returns a <code className="code-inline">Promise&lt;boolean&gt;</code>.
            </p>
            <div className="btn-group">
              <button className="btn btn--primary" onClick={runConfirmFlow}>Run Confirm Flow</button>
            </div>
            <div className="result-display">Result: <b>{confirmResult}</b></div>
          </div>
        </div>

        {/* ── Scenario 2: Business Action ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Scenario 2: Full Business Action</span>
          </div>
          <div className="card__body">
            <p className="section__desc">
              Confirm → Async start → API call → Success/Fail notification. 70% success rate.
            </p>
            <div className="btn-group">
              <button className="btn btn--primary" onClick={runBusinessAction}>
                Run Business Action
              </button>
              <button className="btn btn--small" onClick={() => async_.reset('businessAction')}>
                Reset Async
              </button>
            </div>
            {async_.operations['businessAction'] && (
              <div className="result-display">
                Async status: <b className={
                  async_.operations['businessAction'].status === 'success' ? '' :
                  async_.operations['businessAction'].status === 'error' ? '' : ''
                }>
                  {async_.operations['businessAction'].status}
                </b>
                {async_.operations['businessAction'].error && ` — ${async_.operations['businessAction'].error}`}
              </div>
            )}
          </div>
        </div>

        {/* ── Scenario 3: UI Orchestration ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Scenario 3: Multi-Element Orchestration</span>
          </div>
          <div className="card__body">
            <p className="section__desc">
              Opens drawers (left + right), sends a notification, then opens a modal — all timed.
            </p>
            <div className="btn-group">
              <button className="btn" onClick={runOrchestration}>Run Orchestration</button>
              <button className="btn btn--danger" onClick={() => { ui.drawer.closeAll(); ui.modal.closeAll(); }}>
                Close All
              </button>
            </div>
            <div className="result-display">
              Drawers: {drawerStack.length > 0 ? drawerStack.map(d => `${d.drawerId}(${d.anchor})`).join(', ') : '—'}
              {' | '}Modals: {modalStack.length > 0 ? modalStack.join(', ') : '—'}
            </div>
          </div>
        </div>

        {/* ── Scenario 4: Notification Burst ── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Scenario 4: Notification Burst</span>
          </div>
          <div className="card__body">
            <p className="section__desc">
              Sends 4 notifications (info, success, warning, error) in rapid succession.
            </p>
            <div className="btn-group">
              <button className="btn" onClick={runNotificationBurst}>Send Burst</button>
              <button className="btn btn--danger" onClick={() => ui.notify.dismissAll()}>Dismiss All</button>
            </div>
            {notifications.length > 0 && (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {[...notifications].reverse().map((n) => (
                  <div key={n.id} className={`notif-card notif-card--${n.type}`}>
                    <span>{n.message}</span>
                    <button className="btn btn--small" onClick={() => dismiss(n.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Scenario Log ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">Scenario Log</span>
          <button className="btn btn--small" onClick={() => setScenarioLog([])}>Clear</button>
        </div>
        <div className="card__body--compact card__body--scroll">
          {scenarioLog.length === 0 && (
            <div className="result-display">Run a scenario to see the interaction log</div>
          )}
          {scenarioLog.map((msg, i) => (
            <div key={i} className="event-item">
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── DSL Reference ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">DSL API Reference</span>
        </div>
        <div className="card__body">
          <div className="code-block">{`const ui = useUI();

// Modal
ui.modal.open('id');  ui.modal.close('id');  ui.modal.closeAll();

// Confirm (async)
const confirmed = await ui.confirm('id'); // Promise<boolean>

// Drawer
ui.drawer.open('id', 'left');  ui.drawer.close('id');  ui.drawer.closeAll();

// Notifications
ui.notify.info('msg');  ui.notify.success('msg');
ui.notify.warning('msg');  ui.notify.error('msg');
ui.notify.dismissAll();

// Form & Async available via ui.form.* and ui.async.*`}</div>
        </div>
      </div>
    </div>
  );
}
