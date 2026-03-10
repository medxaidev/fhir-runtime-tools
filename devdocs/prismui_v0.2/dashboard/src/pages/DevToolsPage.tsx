import { useState } from 'react';
import { useDevTools, useRuntimeState } from '@prismui/react';
import type { DevToolsController } from '@prismui/core';

type Tab = 'timeline' | 'state' | 'metrics' | 'snapshots' | 'agent';

export function DevToolsPage() {
  const { available, stateTree, timeline, metrics, snapshots, controller } = useDevTools();
  useRuntimeState(); // trigger re-render on state changes

  const [activeTab, setActiveTab] = useState<Tab>('timeline');

  if (!available || !controller) {
    return (
      <div>
        <div className="page-header">
          <h2 className="page-header__title">DevTools & Automation</h2>
          <p className="page-header__desc">DevTools module is not registered.</p>
        </div>
        <div className="info-card info-card--red">
          DevTools module not available. Register <code className="code-inline">createDevToolsModule()</code> in your runtime setup.
        </div>
      </div>
    );
  }

  const dt = controller as DevToolsController;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'timeline', label: `Timeline (${timeline.length})` },
    { id: 'state', label: 'State Tree' },
    { id: 'metrics', label: 'Performance' },
    { id: 'snapshots', label: `Snapshots (${snapshots.length})` },
    { id: 'agent', label: 'AI Agent' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header__title">DevTools & Automation</h2>
        <p className="page-header__desc">
          Event timeline, performance monitoring, state inspection, snapshots, and AI Agent dispatch interface.
        </p>
      </div>

      <div className="info-card info-card--green">
        DevTools is an <b>optional runtime module</b> — zero overhead when not registered.
        All instrumentation happens via middleware interception. The Agent interface enables programmatic
        dispatch for testing, automation, and AI-driven UI control.
      </div>

      {/* ── Tab bar ── */}
      <div className="card">
        <div className="card__header" style={{ gap: 0, padding: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`btn btn--small ${activeTab === t.id ? 'btn--primary' : ''}`}
              style={{ borderRadius: 0, border: 'none', borderRight: '1px solid var(--color-border)' }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="card__body">
          {activeTab === 'timeline' && <TimelineTab timeline={timeline} dt={dt} />}
          {activeTab === 'state' && <StateTab stateTree={stateTree} />}
          {activeTab === 'metrics' && <MetricsTab metrics={metrics} dt={dt} />}
          {activeTab === 'snapshots' && <SnapshotsTab snapshots={snapshots} dt={dt} />}
          {activeTab === 'agent' && <AgentTab dt={dt} />}
        </div>
      </div>

      {/* ── API Reference ── */}
      <div className="card">
        <div className="card__header">
          <span className="card__title">DevTools API Reference</span>
        </div>
        <div className="card__body">
          <div className="code-block">{`import { createDevToolsModule } from '@prismui/core';
import { useDevTools } from '@prismui/react';

// Register module
const runtime = createInteractionRuntime({
  modules: [createDevToolsModule({ maxTimelineEntries: 500 })],
});

// Use in React
const { timeline, metrics, snapshots, stateTree, controller } = useDevTools();

// Timeline
controller.getTimeline();
controller.getSlowEvents(10); // events > 10ms
controller.clearTimeline();

// Snapshots
controller.captureSnapshot('label');
controller.compareSnapshots(idA, idB);
controller.exportSnapshot(id);

// Agent
controller.agent.dispatch({ type: 'PAGE_TRANSITION', payload: { pageId: 'x' } });
await controller.agent.executeSequence(events, delayMs);
await controller.agent.waitForState(predicate, timeoutMs);`}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Timeline ───────────────── */
function TimelineTab({ timeline, dt }: { timeline: any[]; dt: DevToolsController }) {
  const slowEvents = dt.getSlowEvents(5);

  return (
    <div>
      <div className="btn-group">
        <button className="btn btn--small" onClick={() => dt.clearTimeline()}>Clear Timeline</button>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: '28px' }}>
          {slowEvents.length} slow events (&gt;5ms)
        </span>
      </div>
      {timeline.length === 0 && (
        <div className="result-display">No events recorded — interact with the dashboard to generate events</div>
      )}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {[...timeline].reverse().map((entry, i) => (
          <div key={`${entry.event.type}-${entry.startTime}-${i}`} className="event-item">
            <span className="event-item__type">{entry.event.type}</span>
            <span className="event-item__meta">
              {entry.duration}ms
              {' · '}v{entry.stateVersionBefore}{entry.reducerHit ? `→v${entry.stateVersionAfter}` : ''}
              {entry.duration > 5 && <span style={{ color: 'var(--color-warning)', marginLeft: 4 }}>SLOW</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: State ──────────────────── */
function StateTab({ stateTree }: { stateTree: any }) {
  if (!stateTree?.children) return <div className="result-display">No state available</div>;
  return (
    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
      {stateTree.children.map((node: any) => (
        <StateNode key={node.key} node={node} depth={0} />
      ))}
    </div>
  );
}

function StateNode({ node, depth }: { node: any; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isExpandable = node.type === 'object' || node.type === 'array';

  return (
    <div className="state-node">
      <div
        className={`state-node__row ${isExpandable ? 'state-node__row--expandable' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => isExpandable && setExpanded(v => !v)}
      >
        {isExpandable && (
          <span className="state-node__arrow">{expanded ? '▾' : '▸'}</span>
        )}
        <span className="state-node__key">{node.key}</span>
        <span className="state-node__value">
          {node.type === 'array'
            ? `Array(${(node.value as unknown[]).length})`
            : node.type === 'object'
              ? `{${node.children?.length || 0}}`
              : node.type === 'string'
                ? `"${String(node.value)}"`
                : String(node.value)}
        </span>
      </div>
      {expanded && hasChildren && node.children.map((child: any) => (
        <StateNode key={child.key} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

/* ── Tab: Metrics ────────────────── */
function MetricsTab({ metrics, dt }: { metrics: any; dt: DevToolsController }) {
  if (!metrics) return <div className="result-display">No metrics available</div>;
  return (
    <div>
      <div className="btn-group">
        <button className="btn btn--small" onClick={() => dt.resetMetrics()}>Reset Metrics</button>
      </div>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="metric">
          <div className="metric__value">{metrics.totalEvents}</div>
          <div className="metric__label">Total Events</div>
        </div>
        <div className="metric">
          <div className="metric__value">{metrics.averageDuration.toFixed(2)}ms</div>
          <div className="metric__label">Avg Duration</div>
        </div>
        <div className="metric">
          <div className="metric__value">{metrics.maxDuration.toFixed(2)}ms</div>
          <div className="metric__label">Max Duration</div>
        </div>
        <div className="metric">
          <div className="metric__value">{metrics.eventsPerSecond.toFixed(1)}</div>
          <div className="metric__label">Events/sec</div>
        </div>
        <div className="metric">
          <div className="metric__value">{(metrics.uptimeMs / 1000).toFixed(1)}s</div>
          <div className="metric__label">Uptime</div>
        </div>
        <div className="metric">
          <div className="metric__value">{Object.keys(metrics.eventsByType).length}</div>
          <div className="metric__label">Event Types</div>
        </div>
      </div>
      {Object.keys(metrics.eventsByType).length > 0 && (
        <div>
          <h4 className="section__title">Events by Type</h4>
          {Object.entries(metrics.eventsByType).map(([type, count]) => (
            <div key={type} className="data-row">
              <span className="data-row__label">{type}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{String(count)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Snapshots ──────────────── */
function SnapshotsTab({ snapshots, dt }: { snapshots: any[]; dt: DevToolsController }) {
  const [diffResult, setDiffResult] = useState<string | null>(null);

  const handleDiff = () => {
    if (snapshots.length < 2) return;
    const ids = snapshots.map(s => s.id);
    const diff = dt.compareSnapshots(ids[ids.length - 2], ids[ids.length - 1]);
    setDiffResult(diff ? JSON.stringify(diff, null, 2) : 'No differences found');
  };

  return (
    <div>
      <div className="btn-group">
        <button className="btn btn--small btn--primary" onClick={() => dt.captureSnapshot(`snap-${snapshots.length + 1}`)}>
          Capture Snapshot
        </button>
        {snapshots.length >= 2 && (
          <button className="btn btn--small" onClick={handleDiff}>Diff Last 2</button>
        )}
        {snapshots.length > 0 && (
          <button className="btn btn--small btn--danger" onClick={() => { dt.clearSnapshots(); setDiffResult(null); }}>
            Clear All
          </button>
        )}
      </div>
      {snapshots.length === 0 && (
        <div className="result-display">No snapshots — capture one to inspect state at a point in time</div>
      )}
      {[...snapshots].reverse().map(s => (
        <div key={s.id} className="data-row" style={{ marginBottom: 4 }}>
          <span className="data-row__label">{s.label || s.id}</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
            v{s.state.version} · {new Date(s.timestamp).toLocaleTimeString()} · {s.stateHash.slice(0, 8)}
          </span>
        </div>
      ))}
      {diffResult && (
        <div style={{ marginTop: 12 }}>
          <h4 className="section__title">Snapshot Diff</h4>
          <div className="code-block">{diffResult}</div>
        </div>
      )}
    </div>
  );
}

/* ── Tab: Agent ──────────────────── */
function AgentTab({ dt }: { dt: DevToolsController }) {
  const [agentLog, setAgentLog] = useState<string[]>([]);

  const log = (msg: string) => setAgentLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));

  const handleDispatch = () => {
    dt.agent.dispatch({ type: 'NOTIFICATION_SHOW', payload: { type: 'info', message: 'Dispatched by AI Agent' } });
    log('Dispatched NOTIFICATION_SHOW');
  };

  const handleSequence = async () => {
    log('Executing sequence...');
    await dt.agent.executeSequence([
      { type: 'PAGE_MOUNT', payload: { pageId: 'agent-target' } },
      { type: 'PAGE_TRANSITION', payload: { pageId: 'agent-target' } },
      { type: 'PAGE_MOUNT', payload: { pageId: 'DevTools' } },
      { type: 'PAGE_TRANSITION', payload: { pageId: 'DevTools' } },
    ], 100);
    log('Sequence complete: navigated to agent-target and back');
  };

  const handleWaitForState = async () => {
    log('Waiting for state version > current...');
    const currentVersion = dt.agent.getState().version as number;
    try {
      const result = await dt.agent.waitForState(
        (s) => (s.version as number) > currentVersion,
        5000,
      );
      log(`State reached version ${result.version} ✓`);
    } catch {
      log('Timeout: state condition not met within 5s');
    }
  };

  return (
    <div>
      <div className="info-card info-card--blue">
        The <b>AI Agent Interface</b> allows external systems to programmatically control the runtime.
        Dispatch events, execute sequences, and wait for state conditions — ideal for testing, automation, and AI-driven UI.
      </div>

      <div className="section">
        <h4 className="section__title">Quick Actions</h4>
        <div className="btn-group">
          <button className="btn" onClick={handleDispatch}>
            agent.dispatch()
          </button>
          <button className="btn" onClick={handleSequence}>
            agent.executeSequence()
          </button>
          <button className="btn" onClick={handleWaitForState}>
            agent.waitForState() (5s timeout)
          </button>
        </div>
      </div>

      <div className="section">
        <h4 className="section__title">Agent Log</h4>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {agentLog.length === 0 && (
            <div className="result-display">Run an agent action to see the log</div>
          )}
          {agentLog.map((msg, i) => (
            <div key={i} className="event-item">
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
