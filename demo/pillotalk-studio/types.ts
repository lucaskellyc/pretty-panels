import type { LineCap } from './font/model';
import type { AnimProp, TrimField } from './timeline/channels';

/** A saved document's file extension (document.ts reads and writes them). */
export const DOCUMENT_EXTENSION = 'pillotalk';

/** The desktop studio's preview sample. The demo has no preview, but a
 *  document carries one, so it is kept as opened and saved back out. */
export interface PreviewSettings {
  text: string;
  size: number;
}

/** What the inspector asks of the studio. The studio owns the project, so
 *  these are requests it applies — never a project to replace its own with. */
export type EditMessage =
  | { type: 'weight'; value: number }
  /** The font's tracking, vertical offset or added height, in font units. */
  | { type: 'font'; field: 'tracking' | 'offsetY' | 'stretch'; value: number }
  | { type: 'cap'; cap: LineCap }
  /** The name the exported font installs under. */
  | { type: 'name'; field: 'familyName' | 'styleName'; value: string }
  /** One glyph's spacing, as side bearings measured from its ink. */
  | { type: 'lsb' | 'rsb'; char: string; value: number }
  | { type: 'offsetY'; char: string; value: number }
  /** Where one glyph is cut for the height — null lets the glyph pick. */
  | { type: 'stretchAt'; char: string; value: number | null }
  /** One glyph's advance width; the ink stays put and the right bearing takes
   *  up the difference. */
  | { type: 'width'; char: string; value: number }
  /** One glyph's trim-paths percentage. */
  | { type: 'trim'; char: string; field: TrimField; value: number }
  /** The keyframe gutter: the circle, and the diamond's add / remove. */
  | { type: 'arm' | 'key' | 'unkey'; prop: AnimProp };
