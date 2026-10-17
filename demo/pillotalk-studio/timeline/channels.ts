/**
 * Which font parameters the timeline can key, how they're named and ranged,
 * and how they group into the timeline's rows.
 *
 * The font's weight is one channel; every glyph has its own advance width,
 * vertical offset and trim paths — named `width:A`, `offsetY:A`,
 * `trimEnd:A` and so on. The
 * timeline treats each group the way motion-studio treats a layer: one merged
 * lane, with the group's keyed channels folded underneath it. The font's
 * group is always listed; a glyph's only once it is animated or selected, so
 * the dock doesn't carry a row for every character.
 */
import { CHARSET, type FontProject, type GlyphData } from '../font/model';
import { sampleTrack, type Keyframe } from './anim';

export type GlyphField = 'width' | 'offsetY' | 'trimStart' | 'trimEnd' | 'trimOffset';
export type TrimField = 'trimStart' | 'trimEnd' | 'trimOffset';
export type AnimProp = 'weight' | `${GlyphField}:${string}`;

export interface Channel {
  label: string;
  min: number;
  max: number;
  step: number;
  /** Decimals shown in the readout. */
  digits: number;
}

const FIELD_CHANNELS: Record<GlyphField, Channel> = {
  width: { label: 'width', min: 1, max: 2000, step: 5, digits: 0 },
  offsetY: { label: 'vertical offset', min: -1000, max: 1000, step: 5, digits: 0 },
  trimStart: { label: 'trim start', min: 0, max: 100, step: 0.1, digits: 1 },
  trimEnd: { label: 'trim end', min: 0, max: 100, step: 0.1, digits: 1 },
  trimOffset: { label: 'trim offset', min: -100, max: 100, step: 0.1, digits: 1 },
};

/** What an unset field reads as. */
const FIELD_DEFAULT: Record<GlyphField, number> = { width: 0, offsetY: 0, trimStart: 0, trimEnd: 100, trimOffset: 0 };
const GLYPH_FIELDS = Object.keys(FIELD_CHANNELS) as GlyphField[];
const WEIGHT: Channel = { label: 'weight', min: 10, max: 300, step: 1, digits: 0 };

/** A glyph channel's field and character, or null for the font's own. */
export function parseProp(prop: AnimProp): { field: GlyphField; char: string } | null {
  if (prop === 'weight') return null;
  const at = prop.indexOf(':');
  return { field: prop.slice(0, at) as GlyphField, char: prop.slice(at + 1) };
}

export const glyphProp = (field: GlyphField, char: string): AnimProp => `${field}:${char}`;

export const channelOf = (prop: AnimProp): Channel => {
  const g = parseProp(prop);
  return g ? FIELD_CHANNELS[g.field] : WEIGHT;
};

/* ---- Groups ------------------------------------------------------------------ */

export type GroupId = string;

export interface Group {
  id: GroupId;
  name: string;
  props: readonly AnimProp[];
}

export const FONT_GROUP: Group = { id: 'font', name: 'Font', props: ['weight'] };

const glyphGroup = (char: string): Group => ({
  id: `glyph:${char}`,
  name: char,
  props: GLYPH_FIELDS.map((f) => glyphProp(f, char)),
});

export const groupOf = (prop: AnimProp): GroupId => {
  const g = parseProp(prop);
  return g ? `glyph:${g.char}` : FONT_GROUP.id;
};

/** The rows the timeline lists: the font, then — in charset order — every
 *  glyph with a track, and the selected one so it can be keyed from here. */
export function groupsFor(tracks: Partial<Record<AnimProp, Keyframe[]>>, selected: string | null): Group[] {
  const animated = new Set<string>();
  for (const prop of Object.keys(tracks) as AnimProp[]) {
    const g = parseProp(prop);
    if (g) animated.add(g.char);
  }
  if (selected) animated.add(selected);
  return [FONT_GROUP, ...CHARSET.filter((c) => animated.has(c)).map(glyphGroup)];
}

export const findGroup = (id: GroupId): Group | undefined =>
  id === FONT_GROUP.id ? FONT_GROUP : id.startsWith('glyph:') ? glyphGroup(id.slice(6)) : undefined;

/** The label the timeline shows: title case, like the rest of its chrome. */
export const laneLabel = (prop: AnimProp): string => channelOf(prop).label.replace(/\b\w/g, (c) => c.toUpperCase());

/* ---- Base values -------------------------------------------------------------- */

/** A channel's static value, read off the project. */
export function baseOf(project: FontProject, prop: AnimProp): number {
  const g = parseProp(prop);
  if (!g) return project.strokeWeight;
  const glyph = project.glyphs[g.char];
  if (!glyph) return 0;
  return g.field === 'width' ? glyph.advanceWidth : (glyph[g.field] ?? FIELD_DEFAULT[g.field]);
}

/** A glyph field holding `v`: the advance at least a unit, the offset whole
 *  units, a trim to a tenth of a percent — and a default left unset. */
function fieldValue(field: GlyphField, v: number, round: boolean): number | undefined {
  if (field === 'width') return Math.max(1, round ? Math.round(v) : v);
  const r = !round ? v : field === 'offsetY' ? Math.round(v) : Math.round(v * 10) / 10;
  const c = field === 'trimStart' || field === 'trimEnd' ? Math.min(100, Math.max(0, r)) : r;
  return c === FIELD_DEFAULT[field] ? undefined : c;
}

const setField = (glyph: GlyphData, field: GlyphField, v: number, round: boolean): GlyphData =>
  field === 'width'
    ? { ...glyph, advanceWidth: fieldValue(field, v, round)! }
    : { ...glyph, [field]: fieldValue(field, v, round) };

/** The project with a channel's static value set. Values are whole font units,
 *  as the inspector's own edits are. */
export function withBase(project: FontProject, prop: AnimProp, v: number): FontProject {
  const g = parseProp(prop);
  if (!g) return { ...project, strokeWeight: v };
  const glyph = project.glyphs[g.char];
  if (!glyph) return project;
  return { ...project, glyphs: { ...project.glyphs, [g.char]: setField(glyph, g.field, v, true) } };
}

/** What the timeline holds beside the project, as far as resolving it goes. */
export interface AnimView {
  tracks: Partial<Record<AnimProp, Keyframe[]>>;
  muted: readonly GroupId[];
}

/** A channel's value at `t`: its track if armed (and its group isn't muted),
 *  otherwise the static value. */
export function valueIn(project: FontProject, anim: AnimView, prop: AnimProp, t: number): number {
  const base = baseOf(project, prop);
  const keys = anim.tracks[prop];
  if (!keys || anim.muted.includes(groupOf(prop))) return base;
  return sampleTrack(keys, t, base);
}

/**
 * The project with every animated channel sampled at `t` — what the stage,
 * the preview and the inspector show. Pure, so the palette windows resolve it
 * the same way the studio does. Returns `project` itself when nothing is
 * animated, so memoised views downstream keep their identity.
 */
export function resolveProject(project: FontProject, anim: AnimView, t: number): FontProject {
  let out = project;
  for (const prop of Object.keys(anim.tracks) as AnimProp[]) {
    if (anim.muted.includes(groupOf(prop))) continue;
    const g = parseProp(prop);
    if (g && !out.glyphs[g.char]) continue;
    const v = valueIn(project, anim, prop, t);
    if (!g) out = { ...out, strokeWeight: v };
    else {
      // Sampled values stay fractional between keys, so motion is smooth;
      // export rounds the advance itself.
      out = { ...out, glyphs: { ...out.glyphs, [g.char]: setField(out.glyphs[g.char], g.field, v, false) } };
    }
  }
  return out;
}
