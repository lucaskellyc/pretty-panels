import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * Fitting content into a box, and the view gestures on top of it — trackpad
 * pan, pinch zoom about the pointer, touch pan and pinch, and a way back to
 * the fit.
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

  // Touch: one finger pans, two pinch about their midpoint and pan with it.
  // Anywhere on the stage, artboards included — the stages themselves only
  // turn a touch that never travels into a tap.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const touches = new Map<number, { x: number; y: number }>();
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch') touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const move = (e: PointerEvent) => {
      const t = touches.get(e.pointerId);
      if (!t) return;
      if (touches.size === 1) {
        const dx = e.clientX - t.x;
        const dy = e.clientY - t.y;
        t.x = e.clientX;
        t.y = e.clientY;
        setViewState((v) => (dx || dy ? { ...v, x: v.x + dx, y: v.y + dy } : v));
        return;
      }
      const [a, b] = touches.values();
      const mid0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      t.x = e.clientX;
      t.y = e.clientY;
      const mid1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const d1 = Math.hypot(a.x - b.x, a.y - b.y);
      if (!d0) return;
      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      setViewState((v) => {
        const zoom = clamp(v.zoom * (d1 / d0), MIN_ZOOM, MAX_ZOOM);
        // Pin the point under the fingers, then follow them.
        const ratio = zoom / v.zoom;
        const ox = mid0.x - cx - v.x;
        const oy = mid0.y - cy - v.y;
        return {
          zoom,
          x: v.x + ox * (1 - ratio) + (mid1.x - mid0.x),
          y: v.y + oy * (1 - ratio) + (mid1.y - mid0.y),
        };
      });
    };
    const up = (e: PointerEvent) => touches.delete(e.pointerId);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
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

/** Travel under which a touch is a tap rather than the start of a pan. */
const TAP_SLOP = 8;

interface TouchLike {
  type: string;
  pointerType: string;
  pointerId: number;
  clientX: number;
  clientY: number;
  target: EventTarget;
}

/**
 * A stage's taps. Touch pans and pinches belong to useFitView, so a stage
 * hands its touches here instead of acting on the press: `onTap` runs on the
 * lift, for a touch that never travelled and had no second finger join it.
 * Each handler returns whether the event was a touch, and so taken.
 */
export function useTouchTap(onTap: (target: Element) => void) {
  const tap = useRef<{ id: number; x: number; y: number; target: Element; live: boolean } | null>(null);
  const handle = useRef(onTap);
  handle.current = onTap;
  return {
    down(e: TouchLike) {
      if (e.pointerType !== 'touch') return false;
      if (tap.current) tap.current.live = false;
      else tap.current = { id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target as Element, live: true };
      return true;
    },
    move(e: TouchLike) {
      const t = tap.current;
      if (e.pointerType !== 'touch') return false;
      if (t && t.id === e.pointerId && Math.hypot(e.clientX - t.x, e.clientY - t.y) > TAP_SLOP) t.live = false;
      return true;
    },
    up(e: TouchLike) {
      if (e.pointerType !== 'touch') return false;
      const t = tap.current;
      if (t && t.id === e.pointerId) {
        tap.current = null;
        // A cancelled touch (the browser took it) is never a tap.
        if (t.live && e.type !== 'pointercancel') handle.current(t.target);
      }
      return true;
    },
  };
}
