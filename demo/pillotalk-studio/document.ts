import { createProject, toLineCap, type FontProject } from './font/model';
import { CANVAS_DEFAULTS, type CanvasSettings } from './Canvas';
import { DOCUMENT_EXTENSION, type PreviewSettings } from './types';
import type { Keyframe } from './timeline/anim';
import { isAnimProp, type AnimProp, type GroupId } from './timeline/channels';
import { clampDuration, DURATION, type WorkRange } from './timeline/state';

/**
 * A saved piece of work, as a `.pillotalk` file: the glyphs and font settings,
 * the timeline, the canvas and the preview's sample — everything autosave
 * keeps, in one file that can be opened again on any machine.
 */

export { DOCUMENT_EXTENSION };
const FORMAT = 'pillotalk-studio';
const VERSION = 1;

export interface StudioDocument {
  project: FontProject;
  anim: { tracks: Partial<Record<AnimProp, Keyframe[]>>; muted: GroupId[]; locked: GroupId[]; duration: number };
  canvas: CanvasSettings;
  preview: PreviewSettings;
  work: WorkRange;
}

export function documentFileName(project: FontProject): string {
  const part = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '') || 'Untitled';
  return `${part(project.familyName)}-${part(project.styleName)}.${DOCUMENT_EXTENSION}`;
}

/** Hand the file to the browser as a download. */
export function saveDocument(doc: StudioDocument): void {
  const json = JSON.stringify({ format: FORMAT, version: VERSION, ...doc }, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = documentFileName(doc.project);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A saved file read back, with anything it lacks taken from the defaults —
 *  so a file from an older version opens with the newer settings at rest.
 *  Throws, with a message fit for a dialog, when it isn't one of ours. */
export function parseDocument(text: string): StudioDocument {
  let raw: Record<string, any>;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Pillotalk document.");
  }
  if (raw?.format !== FORMAT || typeof raw.project !== 'object') throw new Error("This file isn't a Pillotalk document.");
  if (typeof raw.version !== 'number' || raw.version > VERSION)
    throw new Error('This document was saved by a newer version of Pillotalk Studio.');

  const project: FontProject = { ...createProject(), ...raw.project };
  // Older files kept tracking with the canvas, before it could be keyed.
  if (project.tracking === undefined && raw.canvas?.tracking) project.tracking = raw.canvas.tracking;
  const { tracking: _legacy, ...canvas } = raw.canvas ?? {};
  for (const g of Object.values(project.glyphs)) if (g.cap) g.cap = toLineCap(g.cap);
  const work = raw.work;
  const duration = clampDuration(raw.anim?.duration ?? DURATION);
  return {
    project,
    anim: {
      // A track an older build left behind is dropped rather than break the timeline.
      tracks: Object.fromEntries(Object.entries<Keyframe[]>(raw.anim?.tracks ?? {}).filter(([p]) => isAnimProp(p))),
      muted: raw.anim?.muted ?? [],
      locked: raw.anim?.locked ?? [],
      duration,
    },
    canvas: { ...CANVAS_DEFAULTS, ...canvas },
    preview: { text: 'Pillotalk', size: 56, ...raw.preview },
    work:
      typeof work?.in === 'number' && typeof work?.out === 'number' && 0 <= work.in && work.in < Math.min(work.out, duration)
        ? { in: work.in, out: Math.min(work.out, duration) }
        : { in: 0, out: duration },
  };
}
