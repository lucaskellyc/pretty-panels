import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * Fitting content into a box, and the view gestures on top of it — trackpad
 * pan, pinch zoom about the pointer, and a way back to the fit.
 *
 * Ported from motion-studio's `studio/view.ts`, with `fit` and `setView`
 * exposed so the stage can frame a single artboard.
 */

/** Fraction of the free area the content fills, leaving a margin around it. */
const FIT_MARGIN = 0.92;
/** e-folds of zoom per pixel of pinch. */
const ZOOM_SPEED = 0.01;
/** Wheel delta honoured in one event, so a mouse notch can't jump an order of
 *  magnitude at a time. */
const ZOOM_STEP_CAP = 24;
/** Zoom bounds, in multiples of the fit zoom. */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 64;
/** deltaMode 1 is lines, not pixels — mice in some configurations. */
const LINE_PX = 16;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The user's view on top of the fit: a zoom multiplier and a pan in screen
 *  pixels. Zoom is relative to the fit, so a window resize re-fits underneath
 *  the gesture instead of fighting it. */
export interface View {
  zoom: number;
  x: number;
  y: number;
}

const FIT_VIEW: View = { zoom: 1, x: 0, y: 0 };

export interface FitView {
  ref: RefObject<HTMLDivElement>;
  /** Screen pixels per content unit at the fit. */
  fit: number;
  /** Screen pixels per content unit: the fit, times the user's zoom. */
  scale: number;
  box: { width: number; height: number };
  view: View;
  offFit: boolean;
  reset: () => void;
  pan: (dx: number, dy: number) => void;
  setView: (view: View) => void;
}

export function useFitView(width: number, height: number): FitView {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [view, setViewState] = useState<View>(FIT_VIEW);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || width <= 0 || height <= 0) return;
    const measure = () => {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      setFit(Math.min(b.width / width, b.height / height) * FIT_MARGIN);
      setBox((prev) =>
        prev.width === b.width && prev.height === b.height ? prev : { width: b.width, height: b.height },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Native and non-passive: React's onWheel is passive, and without
    // preventDefault Chromium runs page zoom and swipe navigation underneath.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const unit = e.deltaMode === 1 ? LINE_PX : 1;
      // macOS synthesises a ctrl-wheel for a trackpad pinch; ⌘ is the mouse
      // equivalent. Everything else is a two-finger pan.
      const zooming = e.ctrlKey || e.metaKey;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      const { clientX, clientY } = e;

      setViewState((v) => {
        if (!dx && !dy) return v;
        if (!zooming) return { ...v, x: v.x - dx, y: v.y - dy };
        const step = clamp(dy, -ZOOM_STEP_CAP, ZOOM_STEP_CAP);
        const zoom = clamp(v.zoom * Math.exp(-step * ZOOM_SPEED), MIN_ZOOM, MAX_ZOOM);
        // Pin the point under the pointer.
        const ratio = zoom / v.zoom;
        const ox = clientX - cx - v.x;
        const oy = clientY - cy - v.y;
        return { zoom, x: v.x + ox * (1 - ratio), y: v.y + oy * (1 - ratio) };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const reset = useCallback(() => setViewState(FIT_VIEW), []);
  const pan = useCallback(
    (dx: number, dy: number) => setViewState((v) => (dx || dy ? { ...v, x: v.x + dx, y: v.y + dy } : v)),
    [],
  );
  const setView = useCallback(
    (next: View) => setViewState({ ...next, zoom: clamp(next.zoom, MIN_ZOOM, MAX_ZOOM) }),
    [],
  );

  return {
    ref,
    fit,
    scale: fit * view.zoom,
    box,
    view,
    offFit: view.zoom !== 1 || view.x !== 0 || view.y !== 0,
    reset,
    pan,
    setView,
  };
}
