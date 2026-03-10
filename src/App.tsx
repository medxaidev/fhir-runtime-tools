import { useEffect } from 'react';
import { PrismUIProvider } from '@prismui/react';
import { usePage, useRuntimeState, useNotification } from '@prismui/react';
import { runtime } from './setup';
import './styles.css';

import { ValidatorPage } from './tools/validator';
import { FHIRPathPage } from './tools/fhirpath';
import { ProfilePage } from './tools/profile';
import { ResourcePage } from './tools/resource';
import { DiffPage } from './tools/diff';
import { GeneratorPage } from './tools/generator';

// ── Route definitions ──────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: string;
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'Validator',  label: 'Resource Validator', icon: '◎', section: 'Tools' },
  { id: 'FHIRPath',   label: 'FHIRPath Lab',       icon: '⟡', section: 'Tools' },
  { id: 'Profile',    label: 'Profile Explorer',   icon: '◈', section: 'Tools' },
  { id: 'Resource',   label: 'Resource Lab',        icon: '▣', section: 'Tools' },
  { id: 'Diff',       label: 'Resource Diff',       icon: '⊟', section: 'Tools' },
  { id: 'Generator',  label: 'Resource Generator',  icon: '⊞', section: 'Tools' },
];

const PAGE_MAP: Record<string, React.ComponentType> = {
  Validator: ValidatorPage,
  FHIRPath: FHIRPathPage,
  Profile: ProfilePage,
  Resource: ResourcePage,
  Diff: DiffPage,
  Generator: GeneratorPage,
};

// ── Content Router ─────────────────────────────
function ContentRouter() {
  const { currentPage } = usePage();
  const Component = PAGE_MAP[currentPage ?? 'Validator'] ?? ValidatorPage;
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

  return (
    <header className="shell-header">
      <span className="shell-header__logo">FHIR Runtime Tools</span>
      <span className="shell-header__badge">v0.1.0</span>
      <span className="shell-header__spacer" />
      <div className="shell-header__meta">
        <span className="shell-header__meta-item">fhir-runtime v0.7</span>
        <span className="shell-header__meta-item">state v{state.version}</span>
      </div>
    </header>
  );
}

// ── Status Bar ─────────────────────────────────
function StatusBar() {
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
        <span className="shell-statusbar__item">
          <span className="shell-statusbar__dot shell-statusbar__dot--warning" /> {notifCount} notifications
        </span>
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
    </PrismUIProvider>
  );
}
