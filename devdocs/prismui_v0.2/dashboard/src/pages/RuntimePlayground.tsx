import { useState, useEffect } from 'react';
import { useRuntimeState, usePage, useModal, useDrawer, useNotification, useForm, useAsync, useSelector, useDevTools } from '@prismui/react';
import { runtime, audit, eventEntries } from '../setup';
import { createSelector } from '@prismui/core';
import type { AuditEntry, DevToolsController } from '@prismui/core';

// Memoized selector: count of total events processed
const selectVersion = createSelector(
  [(s) => s.version as number],
  (version) => version,
);

function getEventTypeClass(type: string): string {
  if (type.startsWith('PAGE_')) return 'event-item__type--page';
  if (type.startsWith('MODAL_')) return 'event-item__type--modal';
  if (type.startsWith('DRAWER_')) return 'event-item__type--drawer';
  if (type.startsWith('NOTIFICATION_')) return 'event-item__type--notification';
  if (type.startsWith('FORM_')) return 'event-item__type--form';
  if (type.startsWith('ASYNC_')) return 'event-item__type--async';
  if (type.startsWith('MODULE_')) return 'event-item__type--governance';
  return '';
}

export function RuntimePlayground() {
  const state = useRuntimeState();
  const version = useSelector(selectVersion);
  const moduleStatus = runtime.getModuleStatus();
  const { currentPage, isLocked } = usePage();
  const { modalStack } = useModal();
  const { drawerStack } = useDrawer();
  const { count: notifCount } = useNotification();
  const form = useForm();
  const async_ = useAsync();
  const { snapshots, controller } = useDevTools();

  const [auditEntries, setAuditEntries] = useState<readonly AuditEntry[]>([]);

  useEffect(() => {
    setAuditEntries(audit.getLatest(20));
  }, [state.version]);

  const dt = controller as DevToolsController | null;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">Runtime Playground</h2>
        <p className="page-header__desc">
          Live view of the PrismUI Interaction Runtime — state, modules, events, snapshots, and replay controls.
        </p>
      </div>

      {/* ── Runtime Overview ──────────── */}
      <div className="section">
        <h3 className="section__title">Runtime Overview</h3>
        <div className="grid-4">
          <div className="metric">
            <div className="metric__value">{version}</div>
            <div className="metric__label">State Version</div>
          </div>
          <div className="metric">
            <div className="metric__value">{Object.keys(moduleStatus).length}</div>
            <div className="metric__label">Modules</div>
          </div>
          <div className="metric">
            <div className="metric__value">{eventEntries.length}</div>
            <div className="metric__label">Events Tracked</div>
          </div>
          <div className="metric">
            <div className="metric__value">{audit.size()}</div>
            <div className="metric__label">Audit Entries</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* ── Module State ──────────── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Module State</span>
            <span className="card__badge">{Object.keys(moduleStatus).length} registered</span>
          </div>
          <div className="card__body--compact">
            {Object.entries(moduleStatus).map(([name, status]) => (
              <div key={name} className="data-row">
                <span className="data-row__label">{name}</span>
                <span className={`tag tag--${status === 'active' ? 'active' : 'idle'}`}>{status}</span>
              </div>
            ))}
            <div className="data-row" style={{ marginTop: 8 }}>
              <span className="data-row__label">Current Page</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{currentPage ?? '(none)'}</span>
            </div>
            <div className="data-row">
              <span className="data-row__label">Page Lock</span>
              <span className={`tag ${isLocked ? 'tag--locked' : 'tag--idle'}`}>{isLocked ? 'Locked' : 'Unlocked'}</span>
            </div>
            <div className="data-row">
              <span className="data-row__label">Modal Stack</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{modalStack.length > 0 ? modalStack.join(', ') : '—'}</span>
            </div>
            <div className="data-row">
              <span className="data-row__label">Drawer Stack</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{drawerStack.length > 0 ? drawerStack.map(d => d.drawerId).join(', ') : '—'}</span>
            </div>
            <div className="data-row">
              <span className="data-row__label">Notifications</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{notifCount}</span>
            </div>
            <div className="data-row">
              <span className="data-row__label">Form Fields</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{Object.keys(form.fields).length}</span>
            </div>
            <div className="data-row">
              <span className="data-row__label">Async Ops</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{Object.keys(async_.operations).length}</span>
            </div>
          </div>
        </div>

        {/* ── Event Timeline ──────────── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Event Timeline</span>
            <span className="card__badge">{eventEntries.length} events</span>
          </div>
          <div className="card__body--compact card__body--scroll">
            {eventEntries.length === 0 && (
              <div className="result-display">No events yet — interact with the dashboard to generate events</div>
            )}
            {[...eventEntries].reverse().slice(0, 30).map((entry, i) => (
              <div key={`${entry.event.type}-${entry.event.timestamp}-${i}`} className="event-item">
                <span className={`event-item__type ${getEventTypeClass(entry.event.type)}`}>
                  {entry.event.type}
                </span>
                <span className="event-item__meta">
                  v{entry.prevVersion}→{entry.nextVersion}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* ── Snapshot & Diff ──────────── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Snapshot Controls</span>
            <span className="card__badge">{snapshots.length} captured</span>
          </div>
          <div className="card__body">
            <div className="btn-group">
              <button className="btn btn--small" onClick={() => dt?.captureSnapshot(`snap-${Date.now()}`)}>
                Capture Snapshot
              </button>
              {snapshots.length >= 2 && (
                <button className="btn btn--small" onClick={() => {
                  const ids = snapshots.map(s => s.id);
                  const diff = dt?.compareSnapshots(ids[ids.length - 2], ids[ids.length - 1]);
                  if (diff) alert(JSON.stringify(diff, null, 2));
                }}>
                  Diff Last 2
                </button>
              )}
              {snapshots.length > 0 && (
                <button className="btn btn--small btn--danger" onClick={() => dt?.clearSnapshots()}>
                  Clear
                </button>
              )}
            </div>
            {snapshots.length === 0 && (
              <div className="result-display">No snapshots — capture one to inspect state</div>
            )}
            {[...snapshots].reverse().map(s => (
              <div key={s.id} className="data-row">
                <span className="data-row__label">{s.label || s.id}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  v{s.state.version} · {s.stateHash.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Replay Controls ──────────── */}
        <div className="card">
          <div className="card__header">
            <span className="card__title">Audit Trail (latest)</span>
            <span className="card__badge">{audit.size()} total</span>
          </div>
          <div className="card__body--compact card__body--scroll">
            {auditEntries.length === 0 && (
              <div className="result-display">No audit entries yet</div>
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
                  v{entry.prevState.version} → {entry.nextState ? `v${entry.nextState.version}` : 'null'}
                  {entry.policyResult?.reason && (
                    <span style={{ marginLeft: 8, color: 'var(--color-error)' }}>{entry.policyResult.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selector Demo ──────────── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">Selector-Derived State</span>
        </div>
        <div className="card__body">
          <div className="info-card info-card--blue">
            <code className="code-inline">useSelector(selectVersion)</code> returns <b>{version}</b> — re-renders only when version changes, not on every state update.
            Selectors use <code className="code-inline">Object.is</code> comparison to skip unnecessary re-renders.
          </div>
          <div className="code-block">{`import { createSelector } from '@prismui/core';
import { useSelector } from '@prismui/react';

const selectVersion = createSelector(
  [(s) => s.version],
  (version) => version,
);

function MyComponent() {
  const version = useSelector(selectVersion);
  // Only re-renders when version changes
}`}</div>
        </div>
      </div>
    </div>
  );
}
