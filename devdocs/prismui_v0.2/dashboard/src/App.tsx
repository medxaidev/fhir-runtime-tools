import { useEffect } from 'react';
import { PrismUIProvider } from '@prismui/react';
import { usePage, useModal, useRuntimeState, useNotification, useDrawer } from '@prismui/react';
import { runtime } from './setup';
import './styles.css';

// Pages
import { RuntimePlayground } from './pages/RuntimePlayground';
import { InteractionScenarios } from './pages/InteractionScenarios';
import { FormAsyncPage } from './pages/FormAsyncPage';
import { GovernancePage } from './pages/GovernancePage';
import { DevToolsPage } from './pages/DevToolsPage';
import { WorkflowPage } from './pages/WorkflowPage';

// Shared
import { ConfirmModal } from './components/ConfirmModal';

// ── Route definitions ──────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: string;
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'RuntimePlayground', label: 'Runtime Playground', icon: '◎', section: 'Core' },
  { id: 'Interactions', label: 'Interaction Scenarios', icon: '⟡', section: 'Core' },
  { id: 'FormAsync', label: 'Form & Async', icon: '◈', section: 'Modules' },
  { id: 'Governance', label: 'Governance / Policy', icon: '⛊', section: 'Modules' },
  { id: 'DevTools', label: 'DevTools & Automation', icon: '⚙', section: 'Platform' },
  { id: 'Workflow', label: 'Approval Workflow', icon: '▤', section: 'Scenarios' },
];

const PAGE_MAP: Record<string, React.ComponentType> = {
  RuntimePlayground,
  Interactions: InteractionScenarios,
  FormAsync: FormAsyncPage,
  Governance: GovernancePage,
  DevTools: DevToolsPage,
  Workflow: WorkflowPage,
};

// ── Content Router ─────────────────────────────
function ContentRouter() {
  const { currentPage } = usePage();
  const Component = PAGE_MAP[currentPage ?? 'RuntimePlayground'] ?? RuntimePlayground;
  return <Component />;
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
  const moduleStatus = runtime.getModuleStatus();
  const activeCount = Object.values(moduleStatus).filter(s => s === 'active').length;

  return (
    <header className="shell-header">
      <span className="shell-header__logo">PrismUI Dashboard</span>
      <span className="shell-header__badge">v0.2.0</span>
      <span className="shell-header__spacer" />
      <div className="shell-header__meta">
        <span className="shell-header__meta-item">state v{state.version}</span>
        <span className="shell-header__meta-item">{activeCount} modules</span>
      </div>
    </header>
  );
}

// ── Status Bar ─────────────────────────────────
function StatusBar() {
  const state = useRuntimeState();
  const { currentPage, isLocked } = usePage();
  const { count: notifCount } = useNotification();
  const { drawerStack } = useDrawer();
  const { modalStack } = useModal();

  return (
    <div className="shell-statusbar">
      <span className="shell-statusbar__item">
        <span className="shell-statusbar__dot" /> Runtime ready
      </span>
      <span className="shell-statusbar__item">Page: {currentPage ?? '—'}</span>
      {isLocked && (
        <span className="shell-statusbar__item">
          <span className="shell-statusbar__dot shell-statusbar__dot--error" /> LOCKED
        </span>
      )}
      {modalStack.length > 0 && (
        <span className="shell-statusbar__item">Modals: {modalStack.length}</span>
      )}
      {drawerStack.length > 0 && (
        <span className="shell-statusbar__item">Drawers: {drawerStack.length}</span>
      )}
      {notifCount > 0 && (
        <span className="shell-statusbar__item">
          <span className="shell-statusbar__dot shell-statusbar__dot--warning" /> {notifCount} notifications
        </span>
      )}
      <span className="shell-statusbar__spacer" />
      <span className="shell-statusbar__item">v{state.version}</span>
    </div>
  );
}

// ── Modal Layer ────────────────────────────────
function ModalLayer() {
  const { isOpen } = useModal();
  return <>{isOpen('confirm') && <ConfirmModal />}</>;
}

// ── Init ───────────────────────────────────────
function InitPage() {
  const { mount, transition, currentPage } = usePage();

  useEffect(() => {
    if (!currentPage) {
      mount('RuntimePlayground');
      transition('RuntimePlayground');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── App ────────────────────────────────────────
export function App() {
  return (
    <PrismUIProvider runtime={runtime}>
      <InitPage />
      <div className="shell">
        <Header />
        <Sidebar />
        <main className="shell-main">
          <ContentRouter />
        </main>
        <StatusBar />
      </div>
      <ModalLayer />
    </PrismUIProvider>
  );
}
