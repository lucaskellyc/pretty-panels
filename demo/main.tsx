import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Component styles (the published `pretty-panels/styles.css`) + the demo's own
// page chrome.
import '../src/styles/index.css';
import './demo.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
