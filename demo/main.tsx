import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Component styles (the published `pretty-panels/styles.css`) + the demo's own
// page chrome. The faces come in separately because index.css leaves them out
// — see the note at the top of it.
import '../src/styles/fonts.css';
import '../src/styles/index.css';
import './demo.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
