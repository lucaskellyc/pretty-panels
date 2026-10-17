import type { FontProject } from '../font/model';
import {
  armProp,
  disarmProp,
  keyTimes,
  moveKeyTo as moveKeyToDoc,
  propsKeyedAt,
  removeKeyAt,
  setKey,
  setKeyCurve,
  type AnimDoc,
  type Curve,
} from './anim';
import { baseOf, findGroup, groupOf, valueIn, withBase, type AnimProp, type GroupId } from './channels';
import { Clock } from './clock';
import { createStore } from './store';
import { snapToFrame } from './timecode';

/**
 * The timeline's state and every action on it, after open-action's.
 *
 * Two stores, split by how often they change:
 *  - `transport` — playhead + playing, updated every frame during playback.
 *    Only the playhead, the readouts and what an animated channel draws
 *    subscribe to it.
 *  - `anim` — the keyframe document plus group mute/lock. Changes on edits.
 *
 * The static (base) values aren't here: they are the project's own fields,
 * held by the studio in React state. It binds them in with `bindProject`, so
 * an edit to a static channel lands in the project as before.
 *
 * The clock is the source of truth for time: never write `transport.time`
 * directly, go through `seek` / `toggle`. The playhead snaps to the frame grid
 * on every seek; time is seconds everywhere.
 */

export const FPS = 30;
export const DURATION = 10;

export type WorkRange = { in: number; out: number };

export const transport = createStore({
  time: 0,
  playing: false,
  loop: true,
  work: { in: 0, out: DURATION } as WorkRange,
});

export const clock = new Clock(DURATION, (time, playing) => transport.set({ time, playing }));

export type AnimState = {
  doc: AnimDoc<AnimProp>;
  muted: readonly GroupId[];
  locked: readonly GroupId[];
};

const EMPTY: AnimState = { doc: { fps: FPS, duration: DURATION, tracks: {} }, muted: [], locked: [] };

/** Saved beside the project, as the project is. */
const STORAGE_KEY = 'pillotalk-studio:anim';

function loadAnim(): AnimState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const a = JSON.parse(saved) as Partial<AnimState>;
      return {
        doc: { fps: FPS, duration: DURATION, tracks: a.doc?.tracks ?? {} },
        muted: a.muted ?? [],
        locked: a.locked ?? [],
      };
    }
  } catch {
    /* storage unavailable or corrupt: start empty */
  }
  return EMPTY;
}

export const anim = createStore<AnimState>(loadAnim());

anim.subscribe(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(anim.get()));
  } catch {
    /* ignore */
  }
});

/* ---- The project the base values live in ---------------------------------- */

let project: { get: () => FontProject; update: (fn: (p: FontProject) => FontProject) => void } = {
  get: () => {
    throw new Error('timeline: no project bound');
  },
  update: () => {},
};

/** The studio hands over its project: how to read it, and how to edit it. */
export function bindProject(binding: typeof project) {
  project = binding;
}

/** A channel's value at `t` against the bound project. */
export const valueAt = (prop: AnimProp, t: number) =>
  valueIn(project.get(), { tracks: anim.get().doc.tracks, muted: anim.get().muted }, prop, t);

/* ---- Transport -------------------------------------------------------------- */

export const seek = (t: number) => clock.seek(snapToFrame(t, FPS));
export const step = (frames: number) => seek(clock.time + frames / FPS);
export const toggle = () => clock.toggle();
export const goStart = () => seek(transport.get().work.in);
export const goEnd = () => seek(transport.get().work.out);

export function setLoop(loop: boolean) {
  clock.loop = loop;
  transport.set({ loop });
}

export function setWork(work: WorkRange) {
  clock.rangeIn = work.in;
  clock.rangeOut = work.out;
  transport.set({ work });
}

/** Jump the playhead to the previous/next key on any channel. */
export function jumpKey(dir: -1 | 1) {
  const { tracks } = anim.get().doc;
  const times = keyTimes(anim.get().doc, Object.keys(tracks) as AnimProp[]);
  const now = snapToFrame(clock.time, FPS);
  const eps = 0.5 / FPS;
  const t = dir > 0 ? times.find((k) => k > now + eps) : [...times].reverse().find((k) => k < now - eps);
  if (t !== undefined) seek(t);
}

/* ---- Undo ------------------------------------------------------------------- */

// Snapshots of the doc. A drag writes the model on every pointer move, so edits
// carrying the same tag in quick succession coalesce into one undo step.
const COALESCE_MS = 600;
const LIMIT = 200;
let past: AnimDoc<AnimProp>[] = [];
let future: AnimDoc<AnimProp>[] = [];
let lastTag = '';
let lastAt = 0;

function commit(next: AnimDoc<AnimProp>, tag: string) {
  const prev = anim.get().doc;
  if (next === prev) return;
  const now = performance.now();
  if (!(tag === lastTag && now - lastAt < COALESCE_MS)) {
    past.push(prev);
    if (past.length > LIMIT) past.shift();
  }
  future = [];
  lastTag = tag;
  lastAt = now;
  anim.set({ doc: next });
}

export function undo() {
  const prev = past.pop();
  if (!prev) return;
  future.push(anim.get().doc);
  lastTag = '';
  anim.set({ doc: prev });
}

export function redo() {
  const next = future.pop();
  if (!next) return;
  past.push(anim.get().doc);
  lastTag = '';
  anim.set({ doc: next });
}

/* ---- Edits ------------------------------------------------------------------ */

const isLocked = (prop: AnimProp) => anim.get().locked.includes(groupOf(prop));

/** Freeze a channel's base to `v` — where a removed track's last value lands. */
const freeze = (prop: AnimProp, v: number) => project.update((p) => withBase(p, prop, v));

/**
 * An inspector edit. An armed channel keys at the playhead; a static one moves
 * its base value — the stopwatch's distinction.
 */
export function setValue(prop: AnimProp, v: number) {
  if (isLocked(prop)) return;
  const { doc } = anim.get();
  if (doc.tracks[prop]) commit(setKey(doc, prop, clock.time, v), `value:${prop}`);
  else freeze(prop, v);
}

export function toggleArmed(prop: AnimProp) {
  if (isLocked(prop)) return;
  const { doc } = anim.get();
  if (doc.tracks[prop]) {
    freeze(prop, valueAt(prop, clock.time));
    commit(disarmProp(doc, prop), 'arm');
  } else {
    commit(armProp(doc, prop, clock.time, baseOf(project.get(), prop)), 'arm');
  }
}

/** The diamond: key an armed channel at the playhead with its current value. */
export function keyAtPlayhead(prop: AnimProp) {
  if (isLocked(prop) || !anim.get().doc.tracks[prop]) return;
  commit(setKey(anim.get().doc, prop, clock.time, valueAt(prop, clock.time)), 'key');
}

/** The diamond, again: remove the key on the playhead's frame. */
export function unkeyAtPlayhead(prop: AnimProp) {
  if (isLocked(prop)) return;
  commit(removeKeyAt(anim.get().doc, prop, clock.time, freeze), 'key');
}

/** Delete a key. `prop: null` is a merged group mark: every channel keyed there. */
export function removeKey(group: GroupId, prop: AnimProp | null, t: number) {
  const g = findGroup(group);
  if (!g || anim.get().locked.includes(group)) return;
  let doc = anim.get().doc;
  for (const p of prop ? [prop] : propsKeyedAt(doc, g.props, t)) doc = removeKeyAt(doc, p, t, freeze);
  commit(doc, 'remove');
}

/** Retime a key (the lanes' drag). `prop: null` moves a whole merged mark. */
export function moveKey(group: GroupId, prop: AnimProp | null, from: number, to: number) {
  const g = findGroup(group);
  if (!g || anim.get().locked.includes(group)) return;
  let doc = anim.get().doc;
  for (const p of prop ? [prop] : propsKeyedAt(doc, g.props, from)) doc = moveKeyToDoc(doc, p, from, to);
  commit(doc, `move:${group}:${prop}`);
}

/** Retime and revalue a key in one edit (the graph editor's drag). */
export function moveKeyTo(prop: AnimProp, from: number, to: number, v: number) {
  if (isLocked(prop)) return;
  commit(moveKeyToDoc(anim.get().doc, prop, from, to, v), `drag:${prop}`);
}

export function setCurve(prop: AnimProp, t: number, curve: Curve | null) {
  if (isLocked(prop)) return;
  commit(setKeyCurve(anim.get().doc, prop, t, curve), `curve:${prop}:${t}`);
}

const toggleIn = (list: readonly GroupId[], id: GroupId) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export const toggleMuted = (id: GroupId) => anim.set({ muted: toggleIn(anim.get().muted, id) });
export const toggleLocked = (id: GroupId) => anim.set({ locked: toggleIn(anim.get().locked, id) });
