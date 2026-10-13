import { useEffect, useMemo, useRef, useState } from 'react';
import { Slider, TextField } from '../../src';
import { fontBytes } from './font/export';
import type { FontProject } from './font/model';
import type { PreviewSettings } from './types';

let generation = 0;

/** The face a preview is set in. */
export interface PreviewFace {
  family: string | null;
  error: string | null;
}

/**
 * The font being drawn, as a face the page can set type in. The project is
 * compiled to OTF bytes and registered as a FontFace under a fresh name each
 * time, so the browser never serves a stale cached face — the same bytes
 * Export writes.
 *
 * Two rules keep the type from flashing to the fallback face:
 * - Rebuild only when the project's *content* changes. Every state message
 *   arrives as a fresh copy, including the ones that only change the sample
 *   text, so identity alone would recompile on every keystroke.
 * - Retire a face only once its successor is on screen. Deleting it from the
 *   effect's cleanup let a burst of changes — a weight being dragged — pull the
 *   face out from under the text while the next one was still loading.
 */
export function usePreviewFace(project: FontProject | null): PreviewFace {
  const [family, setFamily] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => (project ? JSON.stringify(project) : null), [project]);
  const latest = useRef(project);
  latest.current = project;
  /** The face the text is set in now. */
  const live = useRef<FontFace | null>(null);
  /** The project waiting to be built, and whether a build is running. Live,
   *  with no debounce: one build at a time, and whatever arrived meanwhile is
   *  built the moment it finishes — so a dragged slider is followed as fast as
   *  the font compiles, and only its latest value is ever built. */
  const pending = useRef<FontProject | null>(null);
  const building = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    if (!key || !latest.current) return;
    pending.current = latest.current;
    if (building.current) return;
    building.current = true;
    (async () => {
      while (pending.current && mounted.current) {
        const p = pending.current;
        pending.current = null;
        try {
          const name = `PillotalkPreview${++generation}`;
          // Named inside the file too, not just in the page: every build would
          // otherwise carry the same PostScript name, and with several loaded at
          // once — a crossfade, a drag — macOS can resolve that name to a face
          // that has just been deleted, and the text drops to the fallback.
          const face = new FontFace(name, fontBytes({ ...p, familyName: name, styleName: 'Standard' }));
          await face.load();
          if (!mounted.current) return;
          document.fonts.add(face);
          const previous = live.current;
          live.current = face;
          setFamily(name);
          setError(null);
          // Gone only after the switch — and the crossfade from it — is done.
          if (previous) setTimeout(() => document.fonts.delete(previous), 1000);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
      building.current = false;
    })();
  }, [key]);

  // The last face goes with the preview.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (live.current) document.fonts.delete(live.current);
    };
  }, []);

  return { family, error };
}

/** Sample text set in a preview face. */
export function PreviewLine({ family, error, text, size }: PreviewFace & PreviewSettings) {
  return (
    <p
      className="preview-text"
      style={{ fontFamily: family ? `"${family}", var(--font-sans)` : undefined, fontSize: size }}
    >
      {error ? `Preview failed: ${error}` : text}
    </p>
  );
}

/** What the preview plate sets and how big — its controls live in the
 *  inspector, so the preview itself is only the type. */
export function PreviewControls({
  text,
  size,
  onChange,
}: PreviewSettings & { onChange: (next: Partial<PreviewSettings>) => void }) {
  return (
    <>
      <TextField label="Sample" value={text} onChange={(text) => onChange({ text })} spellCheck={false} />
      <Slider
        label="Size"
        value={size}
        min={12}
        max={160}
        step={1}
        onChange={(size) => onChange({ size })}
        format={(v) => `${v}px`}
      />
    </>
  );
}
