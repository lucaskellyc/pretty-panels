import { memo, useMemo, useRef, type MouseEvent, type PointerEvent } from 'react';
import { strokePathData, type FontProject, type GlyphData, type Point } from './font/model';
import type { Artboard as ArtboardBox, Sheet } from './font/sheet';
import { trimmedGlyph } from './font/trim';
import type { FitView } from './view';

interface StageProps {
  project: FontProject;
  sheet: Sheet;
  fitView: FitView;
  /** The selected artboard. */
  char: string | null;
  onSelectGlyph: (char: string | null) => void;
  onFrame: (char: string) => void;
}

/** A press that travels less than this is a click, not a pan. */
const CLICK_SLOP = 3;
/** Smallest on-screen artboard height that shows the metric guides. */
const GUIDES_PX = 160;
/** Section labels never shrink below this, in screen pixels. */
const LABEL_MIN_PX = 10;

/** Glyph space (y up, baseline 0) → artboard space (y down, top 0). */
const fillData = (glyph: GlyphData | undefined, ascender: number) =>
  (glyph?.contours ?? [])
    .filter((c) => c.points.length >= 3)
    .map((c) => c.points.map((p: Point, i) => `${i ? 'L' : 'M'}${p.x} ${ascender - p.y}`).join('') + 'Z')
    .join('');

/** One proof on the wall: its frame, any filled contours, and its stroke paths
 *  at the font's weight. Memoised — a pan or zoom moves the group above it, so
 *  the artboards only re-render when their glyph or the parameters change. */
const Artboard = memo(function Artboard({
  box,
  glyph,
  ascender,
  weight,
  selected,
}: {
  box: ArtboardBox;
  glyph: GlyphData | undefined;
  ascender: number;
  weight: number;
  selected: boolean;
}) {
  // Drawing against a lower top edge raises the glyph by its offset.
  const top = ascender - (glyph?.offsetY ?? 0);
  const trimmed = useMemo(() => glyph && trimmedGlyph(glyph), [glyph]);
  return (
    <g transform={`translate(${box.x} ${box.y})`} data-char={box.char}>
      <rect
        className="pt-artboard"
        data-selected={selected || undefined}
        width={box.width}
        height={box.height}
        pointerEvents="all"
      />
      <path className="pt-ink" d={fillData(glyph, top)} fillRule="nonzero" />
      {glyph && trimmed?.strokes?.length ? (
        <path
          className="pt-stroke"
          d={strokePathData(trimmed.strokes, top)}
          strokeWidth={weight}
          strokeLinecap={glyph.cap ?? 'round'}
          strokeLinejoin={glyph.join ?? 'round'}
        />
      ) : null}
    </g>
  );
});

/**
 * The specimen sheet: a full-bleed stage holding every glyph as an artboard.
 * It is for looking, not drawing — the glyphs come from their SVGs and change
 * through the parameters. Empty space pans (drag, or two-finger scroll), pinch
 * or ⌘-scroll zooms, double-click on empty space returns to the fit. Click an
 * artboard to select it; click it again to zoom in.
 */
export function Stage({ project, sheet, fitView, char, onSelectGlyph, onFrame }: StageProps) {
  const pan = useRef<{ x: number; y: number; travel: number } | null>(null);
  const { box, view, scale } = fitView;
  const { ascender } = project;
  const board = char ? sheet.artboards.find((a) => a.char === char) : undefined;
  const showGuides = !!board && board.height * scale >= GUIDES_PX;

  const hitArtboard = (e: { target: EventTarget }) =>
    (e.target as Element).closest('[data-char]')?.getAttribute('data-char') ?? null;

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const hit = hitArtboard(e);
    if (hit) {
      if (hit === char) onFrame(hit);
      else onSelectGlyph(hit);
      return;
    }
    // Empty space: pan, and a press that never travels deselects.
    pan.current = { x: e.clientX, y: e.clientY, travel: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    const g = pan.current;
    if (!g) return;
    if (e.buttons === 0) {
      pan.current = null;
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    g.x = e.clientX;
    g.y = e.clientY;
    g.travel += Math.abs(dx) + Math.abs(dy);
    fitView.pan(dx, dy);
  };

  const onPointerUp = () => {
    const g = pan.current;
    pan.current = null;
    if (g && g.travel < CLICK_SLOP) onSelectGlyph(null);
  };

  const onDoubleClick = (e: MouseEvent) => {
    if (!hitArtboard(e)) fitView.reset();
  };

  const transform =
    `translate(${box.width / 2 + view.x} ${box.height / 2 + view.y}) ` +
    `scale(${scale}) translate(${-sheet.width / 2} ${-sheet.height / 2})`;

  const guides: [string, number][] = [
    ['asc', project.ascender],
    ['cap', project.capHeight],
    ['x', project.xHeight],
    ['base', 0],
    ['desc', project.descender],
  ];

  return (
    <div ref={fitView.ref} className="pt-stage">
      <svg
        className="pt-sheet"
        width={box.width}
        height={box.height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        role="img"
        aria-label="Glyph sheet"
      >
        <g transform={transform}>
          {sheet.labels.map((l) => (
            <text
              key={l.text}
              className="pt-section-label"
              x={l.x}
              y={l.y}
              fontSize={Math.max(sheet.labelSize, LABEL_MIN_PX / scale)}
            >
              {l.text}
            </text>
          ))}

          {sheet.artboards.map((a) => (
            <Artboard
              key={a.char}
              box={a}
              glyph={project.glyphs[a.char]}
              ascender={ascender}
              weight={project.strokeWeight}
              selected={a.char === char}
            />
          ))}

          {board && showGuides && (
            <g transform={`translate(${board.x} ${board.y})`} className="pt-guides">
              {guides.map(([name, y]) => (
                <g key={name}>
                  <line
                    className="pt-guide"
                    x1={-board.height * 0.06}
                    x2={board.width + board.height * 0.06}
                    y1={ascender - y}
                    y2={ascender - y}
                  />
                  <text
                    className="pt-guide-label"
                    x={board.width + board.height * 0.08}
                    y={ascender - y}
                    fontSize={9 / scale}
                    dominantBaseline="middle"
                  >
                    {name}
                  </text>
                </g>
              ))}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
