import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// One stylesheet, exactly as a web consumer imports it. The @font-face rules
// and the woff2 files come with it — nothing is fetched at runtime.
import 'pretty-panels/styles.css';
// The window's own reset — see the file. Must come after the kit's stylesheet.
import './app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
