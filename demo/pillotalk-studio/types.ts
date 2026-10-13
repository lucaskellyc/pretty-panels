import type { LineCap } from './font/model';

/** The preview plate's sample, set from the inspector. */
export interface PreviewSettings {
  text: string;
  size: number;
}

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
  | { type: 'preview'; value: Partial<PreviewSettings> };
