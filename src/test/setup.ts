/**
 * What jsdom is missing that the components reach for. Each stub is the
 * smallest thing that lets the code run, not a simulation: layout stays zero
 * unless a test gives an element a box.
 */
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// Pointer capture: Slider, Vector, List and Tree take it on pointerdown.
for (const name of ['setPointerCapture', 'releasePointerCapture'] as const) {
  if (!Element.prototype[name]) {
    Object.defineProperty(Element.prototype, name, { value: () => {}, configurable: true });
  }
}
if (!Element.prototype.hasPointerCapture) {
  Object.defineProperty(Element.prototype, 'hasPointerCapture', { value: () => false, configurable: true });
}

// Panel, Table and Toolbar observe their own size.
if (!('ResizeObserver' in globalThis)) {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', { value: RO, configurable: true });
}

// Menu asks about reduced motion before it blinks. Prefer it here: the
// choice then lands at once and a test doesn't wait out the blink.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  });
}
