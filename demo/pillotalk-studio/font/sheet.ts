import type { FontProject } from './model';

/**
 * The specimen sheet: every glyph is an artboard, laid out the way a type
 * designer pins proofs to a wall — alphabet ranges as sections, capitals on
 * one row and their lowercase directly underneath.
 *
 * Sheet space is font units with y **down**, origin at the sheet's top-left.
 * An artboard is exactly one glyph's advance wide and ascender-to-descender
 * tall, so a point at glyph (x, y) sits at sheet (ax + x, ay + ascender − y).
 */

export interface SheetSection {
  label: string;
  /** Upper row, left to right. */
  upper: string;
  /** Lower row; column i sits under `upper[i]`. */
  lower: string;
}

export const SECTIONS: SheetSection[] = [
  { label: 'A – G', upper: 'ABCDEFG', lower: 'abcdefg' },
  { label: 'H – N', upper: 'HIJKLMN', lower: 'hijklmn' },
  { label: 'O – U', upper: 'OPQRSTU', lower: 'opqrstu' },
  { label: 'V – Z', upper: 'VWXYZ', lower: 'vwxyz' },
  { label: '0 – 9', upper: '01234', lower: '56789' },
  { label: 'Punctuation', upper: '.,:;!?\'', lower: '"-()&@#' },
];

export interface Artboard {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetLabel {
  text: string;
  x: number;
  /** Baseline of the label text. */
  y: number;
}

export interface Sheet {
  width: number;
  height: number;
  /** Label type size, in sheet units. */
  labelSize: number;
  artboards: Artboard[];
  labels: SheetLabel[];
}

/** Margins and gaps as fractions of the artboard height, so the sheet keeps its
 *  proportions when the vertical metrics change. */
const MARGIN = 0.3;
const COL_GAP = 0.32;
const ROW_GAP = 0.3;
const SECTION_GAP = 0.42;
const LABEL_SIZE = 0.16;
const LABEL_GAP = 0.08;

export function layoutSheet(project: FontProject): Sheet {
  const h = project.ascender - project.descender;
  const width = (c: string) => Math.max(project.glyphs[c]?.advanceWidth ?? 0, 1);
  const margin = h * MARGIN;
  const labelSize = h * LABEL_SIZE;

  const artboards: Artboard[] = [];
  const labels: SheetLabel[] = [];
  let y = margin;
  let right = 0;

  SECTIONS.forEach((section, si) => {
    if (si > 0) y += h * SECTION_GAP;
    labels.push({ text: section.label, x: margin, y: y + labelSize });
    y += labelSize + h * LABEL_GAP;

    const rows = [section.upper, section.lower];
    const cols = Math.max(section.upper.length, section.lower.length);
    // A column is as wide as the wider of its pair, so a capital and its
    // lowercase share a left edge and wide letters push the columns after them.
    let x = margin;
    for (let i = 0; i < cols; i++) {
      const pair = rows.map((r) => r[i]).filter(Boolean);
      const colW = Math.max(...pair.map(width));
      rows.forEach((row, ri) => {
        const c = row[i];
        if (!c) return;
        artboards.push({ char: c, x, y: y + ri * (h + h * ROW_GAP), width: width(c), height: h });
      });
      x += colW + h * COL_GAP;
    }
    right = Math.max(right, x - h * COL_GAP);
    y += 2 * h + h * ROW_GAP;
  });

  return { width: right + margin, height: y + margin, labelSize, artboards, labels };
}
