import { Font, Glyph, Path } from 'opentype.js';
import { type FontProject, type GlyphData, isDrawn } from './model';
import { glyphOutlines } from './outline';
import { trimmedGlyph } from './trim';

/** PostScript glyph name: the letter or digit itself, `uniXXXX` otherwise. */
function glyphName(char: string): string {
  if (/^[A-Za-z0-9]$/.test(char)) return char;
  return `uni${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** Filled outlines only: strokes are expanded at the font's weight here, and
 *  the glyph's trim and vertical offset applied. */
function outline(glyph: GlyphData, weight: number): Path {
  const path = new Path();
  const dy = glyph.offsetY ?? 0;
  for (const points of glyphOutlines(trimmedGlyph(glyph), weight)) {
    path.moveTo(Math.round(points[0].x), Math.round(points[0].y + dy));
    for (const p of points.slice(1)) path.lineTo(Math.round(p.x), Math.round(p.y + dy));
    path.close();
  }
  return path;
}

/** The fallback box every font must carry at glyph index 0. */
function notdef(project: FontProject): Glyph {
  const w = Math.round(project.unitsPerEm / 2);
  const h = project.capHeight;
  const t = 50;
  const path = new Path();
  path.moveTo(t, 0); path.lineTo(w - t, 0); path.lineTo(w - t, h); path.lineTo(t, h); path.close();
  path.moveTo(t * 2, t); path.lineTo(t * 2, h - t); path.lineTo(w - t * 2, h - t); path.lineTo(w - t * 2, t); path.close();
  return new Glyph({ name: '.notdef', advanceWidth: w, path });
}

/**
 * Build an OpenType font from the project. opentype.js writes CFF outlines,
 * so the result is a true `.otf`. Only drawn glyphs are included — an empty
 * mapping would shadow the fallback font for that character.
 */
export function buildFont(project: FontProject): Font {
  const glyphs: Glyph[] = [
    notdef(project),
    new Glyph({ name: 'space', unicode: 32, advanceWidth: Math.round(project.unitsPerEm / 4), path: new Path() }),
  ];

  for (const glyph of Object.values(project.glyphs)) {
    if (!isDrawn(glyph)) continue;
    glyphs.push(
      new Glyph({
        name: glyphName(glyph.char),
        unicode: glyph.char.codePointAt(0)!,
        advanceWidth: Math.round(glyph.advanceWidth),
        path: outline(glyph, project.strokeWeight),
      }),
    );
  }

  return new Font({
    familyName: project.familyName.trim() || 'Untitled',
    styleName: project.styleName.trim() || 'Standard',
    unitsPerEm: project.unitsPerEm,
    ascender: project.ascender,
    descender: project.descender,
    glyphs,
  });
}

export function fontBytes(project: FontProject): ArrayBuffer {
  return buildFont(project).toArrayBuffer();
}

export function fontFileName(project: FontProject): string {
  const part = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '') || 'Untitled';
  return `${part(project.familyName)}-${part(project.styleName)}.otf`;
}

/** Hand the bytes to the browser as a download. */
export function exportOtf(project: FontProject): void {
  const blob = new Blob([fontBytes(project)], { type: 'font/otf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fontFileName(project);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
