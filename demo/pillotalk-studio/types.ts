import type { LineCap } from './font/model';
import type { AnimProp, TrimField } from './timeline/channels';

/** What the inspector asks of the studio. The studio owns the project, so
 *  these are requests it applies — never a project to replace its own with. */
export type EditMessage =
  | { type: 'weight'; value: number }
  | { type: 'cap'; cap: LineCap }
  /** One glyph's spacing, as side bearings measured from its ink. */
  | { type: 'lsb' | 'rsb'; char: string; value: number }
  | { type: 'offsetY'; char: string; value: number }
  /** One glyph's advance width; the ink stays put and the right bearing takes
   *  up the difference. */
  | { type: 'width'; char: string; value: number }
  /** One glyph's trim-paths percentage. */
  | { type: 'trim'; char: string; field: TrimField; value: number }
  /** The keyframe gutter: the circle, and the diamond's add / remove. */
  | { type: 'arm' | 'key' | 'unkey'; prop: AnimProp };
