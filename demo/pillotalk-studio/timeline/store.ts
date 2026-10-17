import { useSyncExternalStore } from 'react';

/**
 * Tiny external stores shared by the React chrome and the render loop. The loop
 * reads them imperatively with `get()` each frame (no React involvement); the
 * chrome subscribes through `use()`. Each `set` replaces the state object, so
 * React re-renders only when something actually changed.
 */
export function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  };
  const get = () => state;
  return {
    get,
    subscribe,
    set(patch: Partial<T>) {
      let changed = false;
      for (const k in patch) if (patch[k] !== state[k]) changed = true;
      if (!changed) return;
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    use: () => useSyncExternalStore(subscribe, get, get),
    /** Subscribe to one slice; re-renders only when the selected value changes
     *  (it must be a primitive or a reference that's stable between sets). */
    useSelect: <R,>(pick: (s: T) => R): R =>
      useSyncExternalStore(subscribe, () => pick(state), () => pick(state)),
  };
}
