import { memo } from 'react';
import { Section } from '../../src';
import { codepointLabel, isDrawn, strokePathData, type FontProject, type GlyphData } from './font/model';
import { SECTIONS } from './font/sheet';
import { shapedGlyph } from './font/stretch';

interface OutlinerProps {
  project: FontProject;
  char: string | null;
  /** Select the glyph and frame its artboard on the stage. */
  onPick: (char: string) => void;
}

const Thumb = memo(function Thumb({
  glyph,
  ascender,
  height,
  weight,
  stretch,
}: {
  glyph: GlyphData | undefined;
  ascender: number;
  height: number;
  weight: number;
  stretch: number;
}) {
  const top = ascender - (glyph?.offsetY ?? 0);
  const shaped = glyph && shapedGlyph(glyph, stretch);
  const strokes = shaped?.strokes;
  const d = (shaped?.contours ?? [])
    .filter((c) => c.points.length >= 3)
    .map((c) => c.points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${top - p.y}`).join('') + 'Z')
    .join('');
  return (
    <svg className="pt-thumb" viewBox={`0 0 ${glyph?.advanceWidth || 1} ${height}`} aria-hidden>
      <path d={d} />
      {glyph && strokes?.length ? (
        <path
          className="is-stroke"
          d={strokePathData(strokes, top)}
          strokeWidth={weight}
          strokeLinecap={glyph.cap ?? 'round'}
          strokeLinejoin={glyph.join ?? 'round'}
        />
      ) : null}
    </svg>
  );
});

const describe = (g: GlyphData) => {
  const strokes = g.strokes?.length ?? 0;
  const contours = g.contours.length;
  return [strokes && `${strokes} path${strokes > 1 ? 's' : ''}`, contours && `${contours} ctr`].filter(Boolean).join(' · ');
};

/**
 * Every artboard on the sheet, in the sheet's own order: one section per range,
 * capitals then lowercase. A row names the glyph, shows it in miniature and
 * says how much of it exists — the stage is where it is drawn.
 */
export function Outliner({ project, char, onPick }: OutlinerProps) {
  const height = project.ascender - project.descender;
  return (
    <>
      {SECTIONS.map((s) => (
        <Section key={s.label} title={s.label}>
          <div className="pt-outline" role="listbox" aria-label={s.label}>
            {[...s.upper, ...s.lower].map((c) => {
              const g = project.glyphs[c];
              const drawn = isDrawn(g);
              return (
                <button
                  key={c}
                  type="button"
                  role="option"
                  aria-selected={c === char}
                  className="pt-outline-row"
                  data-selected={c === char || undefined}
                  data-empty={!drawn || undefined}
                  onClick={() => onPick(c)}
                  title={codepointLabel(c)}
                >
                  <Thumb glyph={g} ascender={project.ascender - (project.offsetY ?? 0)} height={height} weight={project.strokeWeight} stretch={project.stretch ?? 0} />
                  <span className="pt-outline-name">{c}</span>
                  <span className="pt-outline-meta">
                    {drawn ? describe(g!) : codepointLabel(c)}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      ))}
    </>
  );
}
