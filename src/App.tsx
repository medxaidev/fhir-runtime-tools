import { useEffect, useState, useCallback } from 'react';
import { PrismUIProvider } from '@prismui/react';
import { usePage, useRuntimeState, useNotification } from '@prismui/react';
import { runtime } from './setup';
import './styles.css';

import { ValidatorPage } from './tools/validator';
import { ComposerPage } from './tools/composer';
import { ExplorerPage } from './tools/explorer';

// ── Route definitions ──────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: string;
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'Validator', label: 'Resource Validator', icon: '◎', section: 'Tools' },
  { id: 'Composer', label: 'Resource Composer', icon: '✎', section: 'Tools' },
  { id: 'Explorer', label: 'Instance Explorer', icon: '◈', section: 'Tools' },
];

const PAGE_MAP: Record<string, React.ComponentType> = {
  Validator: ValidatorPage,
  Composer: ComposerPage,
  Explorer: ExplorerPage,
};

// ── Pages that need full-bleed (no padding) ────
const FULL_BLEED_PAGES = new Set(['Validator', 'Composer', 'Explorer']);

// ── Content Router ─────────────────────────────
function ContentRouter() {
  const { currentPage } = usePage();
  const page = currentPage ?? 'Validator';
  const Component = PAGE_MAP[page] ?? ValidatorPage;
  const isFullBleed = FULL_BLEED_PAGES.has(page);
  return isFullBleed ? <Component /> : <div className="shell-main--padded"><Component /></div>;
}

// ── Sidebar ────────────────────────────────────
function Sidebar() {
  const { currentPage, mount, transition } = usePage();

  const handleNav = (pageId: string) => {
    mount(pageId);
    transition(pageId);
  };

  const sections = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  return (
    <nav className="shell-sidebar">
      {Object.entries(sections).map(([section, items]) => (
        <div key={section} className="nav-section">
          <div className="nav-section__title">{section}</div>
          {items.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'nav-item--active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <span className="nav-item__icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

// ── Header ─────────────────────────────────────
function Header() {
  const state = useRuntimeState();

  return (
    <header className="shell-header">
      <span className="shell-header__logo">FHIR Runtime Tools</span>
      <span className="shell-header__badge">v0.2.0</span>
      <span className="shell-header__spacer" />
      <div className="shell-header__meta">
        <span className="shell-header__meta-item">fhir-runtime v0.8.0</span>
        <span className="shell-header__meta-item">state v{state.version}</span>
      </div>
    </header>
  );
}

// ── Toast Notifications ─────────────────────────
function NotificationToasts() {
  const { notifications, dismiss } = useNotification();

  // Show only the latest 5 notifications
  const visible = notifications.slice(-5);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (visible.length === 0) return;
    const timers = visible.map((n) => {
      const age = Date.now() - n.timestamp;
      const remaining = Math.max(0, (n.autoDismissMs ?? 4000) - age);
      return setTimeout(() => dismiss(n.id), remaining);
    });
    return () => timers.forEach(clearTimeout);
  }, [visible, dismiss]);

  if (visible.length === 0) return null;

  return (
    <div className="notification-toasts">
      {visible.map((n) => (
        <div key={n.id} className={`notification-toast notification-toast--${n.type}`}>
          <span className="notification-toast__icon">
            {n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : n.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span className="notification-toast__message">{n.message}</span>
          <button className="notification-toast__close" onClick={() => dismiss(n.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

// ── Notification Panel (toggle from status bar) ──
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, dismiss, dismissAll } = useNotification();

  return (
    <div className="notification-panel">
      <div className="notification-panel__header">
        <span className="notification-panel__title">Notifications ({notifications.length})</span>
        <div className="notification-panel__actions">
          {notifications.length > 0 && (
            <button className="btn btn--small" onClick={dismissAll}>Clear All</button>
          )}
          <button className="notification-panel__close" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="notification-panel__body">
        {notifications.length === 0 ? (
          <div className="notification-panel__empty">No notifications</div>
        ) : (
          [...notifications].reverse().map((n) => (
            <div key={n.id} className={`notification-panel__item notification-panel__item--${n.type}`}>
              <span className="notification-panel__item-icon">
                {n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : n.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <div className="notification-panel__item-body">
                <span className="notification-panel__item-msg">{n.message}</span>
                <span className="notification-panel__item-time">
                  {new Date(n.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <button className="notification-panel__item-dismiss" onClick={() => dismiss(n.id)}>×</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Status Bar ─────────────────────────────────
function StatusBar({ onToggleNotifications }: { onToggleNotifications: () => void }) {
  const state = useRuntimeState();
  const { currentPage } = usePage();
  const { count: notifCount } = useNotification();

  return (
    <div className="shell-statusbar">
      <span className="shell-statusbar__item">
        <span className="shell-statusbar__dot" /> Ready
      </span>
      <span className="shell-statusbar__item">Tool: {currentPage ?? '—'}</span>
      {notifCount > 0 && (
        <button className="shell-statusbar__item shell-statusbar__notif-btn" onClick={onToggleNotifications}>
          <span className="shell-statusbar__dot shell-statusbar__dot--warning" /> {notifCount} notification{notifCount !== 1 ? 's' : ''}
        </button>
      )}
      <span className="shell-statusbar__spacer" />
      <span className="shell-statusbar__item">v{state.version}</span>
    </div>
  );
}

// ── Init ───────────────────────────────────────
function InitPage() {
  const { mount, transition, currentPage } = usePage();

  useEffect(() => {
    if (!currentPage) {
      mount('Validator');
      transition('Validator');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── App ────────────────────────────────────────
export function App() {
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const toggleNotifPanel = useCallback(() => setShowNotifPanel((p) => !p), []);
  const closeNotifPanel = useCallback(() => setShowNotifPanel(false), []);

  return (
    <PrismUIProvider runtime={runtime}>
      <InitPage />
      <div className="shell">
        <Header />
        <Sidebar />
        <main className="shell-main">
          <ContentRouter />
        </main>
        <StatusBar onToggleNotifications={toggleNotifPanel} />
      </div>
      <NotificationToasts />
      {showNotifPanel && <NotificationPanel onClose={closeNotifPanel} />}
    </PrismUIProvider>
  );
}
