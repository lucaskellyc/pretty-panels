import { Section, Select, Slider, Stepper, TextButton } from '../../src';
import { CHARSET, isDrawn, type FontProject, type GlyphData, type LineCap } from './font/model';
import { inkBounds } from './font/outline';
import type { PreviewSettings } from './types';
import { PreviewControls } from './Preview';

interface InspectorProps {
  project: FontProject;
  /** The glyph selected on the stage, or null for the font as a whole. */
  char: string | null;
  preview: PreviewSettings;
  onPreviewChange: (next: Partial<PreviewSettings>) => void;
  onWeightChange: (weight: number) => void;
  /** Set every glyph's caps at once. */
  onCapChange: (cap: LineCap) => void;
  onBearingChange: (side: 'lsb' | 'rsb', value: number) => void;
  /** The glyph's advance width, in font units. */
  onWidthChange: (value: number) => void;
  onOffsetChange: (value: number) => void;
  onImport: () => void;
  onExport: () => void;
  /** Start over from an empty project. */
  onReset: () => void;
}

const units = (v: number) => `${Math.round(v)} u`;

/**
 * One glyph's own placement. Side bearings are read off its ink at the
 * current weight, the way a type designer reads them — so a heavier weight
 * eats into them, and an empty glyph has none to set. The width is the
 * advance itself, so it can be set drawn or not.
 */
function GlyphSections({
  glyph,
  weight,
  onBearingChange,
  onWidthChange,
  onOffsetChange,
}: {
  glyph: GlyphData;
  weight: number;
  onBearingChange: InspectorProps['onBearingChange'];
  onWidthChange: InspectorProps['onWidthChange'];
  onOffsetChange: InspectorProps['onOffsetChange'];
}) {
  const ink = inkBounds(glyph, weight);
  return (
    <>
      <Section title="Spacing">
        <Stepper
          label="Width"
          hint={ink ? `Advance — ink ${Math.round(ink.xMax - ink.xMin)} u wide` : 'Advance'}
          value={Math.round(glyph.advanceWidth)}
          step={5}
          min={1}
          onChange={onWidthChange}
          format={units}
        />
        <Stepper
          label="Left"
          hint={ink ? 'Side bearing — moves the ink' : 'Nothing drawn to space'}
          value={ink ? Math.round(ink.xMin) : 0}
          step={5}
          disabled={!ink}
          onChange={(v) => onBearingChange('lsb', v)}
          format={units}
        />
        <Stepper
          label="Right"
          hint={ink ? 'Side bearing — sets the width' : 'Nothing drawn to space'}
          value={ink ? Math.round(glyph.advanceWidth - ink.xMax) : 0}
          step={5}
          disabled={!ink}
          onChange={(v) => onBearingChange('rsb', v)}
          format={units}
        />
      </Section>

      <Section title="Position">
        <Stepper
          label="Vertical offset"
          hint="Up from the baseline; negative drops it"
          value={glyph.offsetY ?? 0}
          step={5}
          onChange={onOffsetChange}
          format={units}
        />
      </Section>
    </>
  );
}

const CAPS: LineCap[] = ['round', 'square'];

/** The caps the stroked glyphs share, or 'mixed' when they disagree. */
function sharedCap(project: FontProject): LineCap | 'mixed' {
  const caps = new Set(
    Object.values(project.glyphs)
      .filter((g) => g.strokes?.length)
      .map((g) => g.cap ?? 'round'),
  );
  if (caps.size === 0) return 'round';
  return caps.size === 1 ? [...caps][0] : 'mixed';
}

/**
 * With a glyph selected, that glyph's spacing and position; with none, the
 * font-wide parameters — the knobs that re-draw every glyph at once — and the
 * files in and out. The preview's own controls in both, for the preview plate.
 */
export function Inspector({
  project,
  char,
  preview,
  onPreviewChange,
  onWeightChange,
  onCapChange,
  onBearingChange,
  onWidthChange,
  onOffsetChange,
  onImport,
  onExport,
  onReset,
}: InspectorProps) {
  const cap = sharedCap(project);
  const drawn = CHARSET.filter((c) => isDrawn(project.glyphs[c])).length;
  const glyph = char ? project.glyphs[char] : undefined;
  return (
    <>
      {glyph ? (
        <GlyphSections
          glyph={glyph}
          weight={project.strokeWeight}
          onBearingChange={onBearingChange}
          onWidthChange={onWidthChange}
          onOffsetChange={onOffsetChange}
        />
      ) : (
        <Section title="Parameters">
          <Slider
            label="Weight"
            value={project.strokeWeight}
            min={10}
            max={300}
            step={1}
            onChange={onWeightChange}
            format={(v) => `${v} u`}
          />
          <Select
            label="Caps"
            hint={cap === 'mixed' ? 'Glyphs differ — pick one to set them all' : 'All glyphs'}
            value={cap}
            options={[
              ...CAPS.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })),
              ...(cap === 'mixed' ? [{ value: 'mixed', label: 'Mixed', disabled: true }] : []),
            ]}
            onChange={(v) => onCapChange(v as LineCap)}
          />
        </Section>
      )}

      {/* Either way: the preview plate is driven from here. */}
      <Section title="Preview">
        <PreviewControls {...preview} onChange={onPreviewChange} />
      </Section>

      {!glyph && (
        <Section title="Import / Export">
          <div className="pt-actions">
            <TextButton label="Import SVGs" onClick={onImport}>
              Import SVGs…
            </TextButton>
            <TextButton label="Export .otf" disabled={drawn === 0} onClick={onExport}>
              Export .otf
            </TextButton>
            <TextButton label="Reset" onClick={onReset}>
              Reset
            </TextButton>
          </div>
          <p className="pt-empty">
            {drawn === 0
              ? 'Import <letter>u.svg / <letter>l.svg files to start.'
              : `${drawn} of ${CHARSET.length} glyphs drawn.`}
          </p>
        </Section>
      )}
    </>
  );
}
