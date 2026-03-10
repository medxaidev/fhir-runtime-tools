import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

console.log('[FHIR Runtime Tools] Initializing application...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[FHIR Runtime Tools] Root element not found!');
    document.body.innerHTML = '<div style="padding: 20px; font-family: system-ui;">Error: Root element not found. Please check the HTML structure.</div>';
  } else {
    console.log('[FHIR Runtime Tools] Root element found, creating React root...');
    const root = createRoot(rootElement);
    console.log('[FHIR Runtime Tools] Rendering application...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('[FHIR Runtime Tools] Application rendered successfully');
  }
} catch (error) {
  console.error('[FHIR Runtime Tools] Failed to initialize:', error);
  document.body.innerHTML = `<div style="padding: 20px; font-family: system-ui; color: red;">
    <h1>Initialization Error</h1>
    <pre>${error instanceof Error ? error.message : String(error)}</pre>
  </div>`;
}
