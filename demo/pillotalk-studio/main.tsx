import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// The kit's styles, as the docs site loads them (faces separately — see the
// note atop index.css), then the studio's own. Must come after the kit's.
import '../../src/styles/fonts.css';
import '../../src/styles/index.css';
import './studio.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
