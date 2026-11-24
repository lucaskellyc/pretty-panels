import { Section, Select, Slider, Stepper, TextButton, TextField } from '../../src';
import { CHARSET, isDrawn, type FontProject, type GlyphData, type LineCap } from './font/model';
import { inkBounds } from './font/outline';
import { autoCut } from './font/stretch';
import { glyphProp, type TrimField } from './timeline/channels';
import { KeyRow, type KeyContext } from './timeline/KeyGutter';

interface InspectorProps {
  /** The project as it stands at the playhead — every animated value sampled. */
  project: FontProject;
  /** The timeline, for the keyframe gutters beside the keyable controls. */
  keys?: KeyContext;
  /** The glyph selected on the stage, or null for the font as a whole. */
  char: string | null;
  onWeightChange: (weight: number) => void;
  /** The font's tracking, vertical offset or added height, in font units. */
  onFontChange: (field: 'tracking' | 'offsetY' | 'stretch', value: number) => void;
  /** Set every glyph's caps at once. */
  onCapChange: (cap: LineCap) => void;
  /** The family or style name the exported font installs under. */
  onNameChange: (field: 'familyName' | 'styleName', value: string) => void;
  onBearingChange: (side: 'lsb' | 'rsb', value: number) => void;
  /** The glyph's advance width, in font units. */
  onWidthChange: (value: number) => void;
  onOffsetChange: (value: number) => void;
  /** Where the glyph is cut for its height; null hands it back to the glyph. */
  onStretchAtChange: (value: number | null) => void;
  /** One of the glyph's trim-paths percentages. */
  onTrimChange: (field: TrimField, value: number) => void;
  onImport: () => void;
  onExport: () => void;
  /** Open a saved document, or save the work as one. */
  onOpen: () => void;
  onSave: () => void;
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
  keys,
  onBearingChange,
  onWidthChange,
  onOffsetChange,
  onStretchAtChange,
  onTrimChange,
}: {
  glyph: GlyphData;
  weight: number;
  keys?: KeyContext;
  onTrimChange: InspectorProps['onTrimChange'];
  onBearingChange: InspectorProps['onBearingChange'];
  onWidthChange: InspectorProps['onWidthChange'];
  onOffsetChange: InspectorProps['onOffsetChange'];
  onStretchAtChange: InspectorProps['onStretchAtChange'];
}) {
  const ink = inkBounds(glyph, weight);
  const auto = autoCut(glyph);
  return (
    <>
      <Section title="Spacing">
        <KeyRow prop={glyphProp('width', glyph.char)} ctx={keys}>
          <Stepper
            label="Width"
            hint={ink ? `Advance — ink ${Math.round(ink.xMax - ink.xMin)} u wide` : 'Advance'}
            value={Math.round(glyph.advanceWidth)}
            step={5}
            min={1}
            onChange={onWidthChange}
            format={units}
          />
        </KeyRow>
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
        <KeyRow prop={glyphProp('offsetY', glyph.char)} ctx={keys}>
          <Stepper
            label="Vertical offset"
            hint="Up from the baseline; negative drops it"
            value={Math.round(glyph.offsetY ?? 0)}
            step={5}
            onChange={onOffsetChange}
            format={units}
          />
        </KeyRow>
      </Section>

      <Section title="Height">
        <Stepper
          label="Cut at"
          hint={
            auto === null
              ? 'Nothing drawn to stretch'
              : glyph.stretchAt == null
                ? "Where the font's height parts it — auto, where the paths run most upright"
                : "Where the font's height parts it, up from the baseline"
          }
          value={Math.round(glyph.stretchAt ?? auto ?? 0)}
          step={5}
          disabled={auto === null}
          onChange={onStretchAtChange}
          format={units}
        />
        {glyph.stretchAt != null && (
          <div className="pt-actions">
            <TextButton label="Cut automatically" onClick={() => onStretchAtChange(null)}>
              Auto cut
            </TextButton>
          </div>
        )}
      </Section>

      <Section title="Trim paths">
        {glyph.strokes?.length ? (
          TRIMS.map(({ field, label, min, fallback }) => (
            <KeyRow key={field} prop={glyphProp(field, glyph.char)} ctx={keys}>
              <Slider
                label={label}
                value={glyph[field] ?? fallback}
                min={min}
                max={100}
                step={0.1}
                onChange={(v) => onTrimChange(field, v)}
                format={(v) => `${v.toFixed(1)}%`}
              />
            </KeyRow>
          ))
        ) : (
          <p className="pt-empty">No stroke paths to trim.</p>
        )}
      </Section>
    </>
  );
}

/** The trim's three percentages, in After Effects' order. Key End from 0 to
 *  100 to write the letter on; Offset slides the drawn part along. */
const TRIMS: { field: TrimField; label: string; min: number; fallback: number }[] = [
  { field: 'trimStart', label: 'Start', min: 0, fallback: 0 },
  { field: 'trimEnd', label: 'End', min: 0, fallback: 100 },
  { field: 'trimOffset', label: 'Offset', min: -100, fallback: 0 },
];

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
 * files in and out.
 */
export function Inspector({
  project,
  keys,
  char,
  onWeightChange,
  onFontChange,
  onCapChange,
  onNameChange,
  onBearingChange,
  onWidthChange,
  onOffsetChange,
  onStretchAtChange,
  onTrimChange,
  onImport,
  onExport,
  onOpen,
  onSave,
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
          keys={keys}
          onBearingChange={onBearingChange}
          onWidthChange={onWidthChange}
          onOffsetChange={onOffsetChange}
          onStretchAtChange={onStretchAtChange}
          onTrimChange={onTrimChange}
        />
      ) : (
        <Section title="Parameters">
          <KeyRow prop="weight" ctx={keys}>
            <Slider
              label="Weight"
              value={project.strokeWeight}
              min={10}
              max={300}
              step={1}
              onChange={onWeightChange}
              format={(v) => `${Math.round(v)} u`}
            />
          </KeyRow>
          <KeyRow prop="tracking" ctx={keys}>
            <Slider
              label="Tracking"
              value={Math.round(project.tracking ?? 0)}
              min={-300}
              max={600}
              step={5}
              onChange={(v) => onFontChange('tracking', v)}
              format={units}
            />
          </KeyRow>
          <KeyRow prop="offsetY" ctx={keys}>
            <Stepper
              label="Vertical offset"
              hint="Every glyph, up from the baseline"
              value={Math.round(project.offsetY ?? 0)}
              step={5}
              onChange={(v) => onFontChange('offsetY', v)}
              format={units}
            />
          </KeyRow>
          <KeyRow prop="stretch" ctx={keys}>
            <Slider
              label="Height"
              value={project.stretch ?? 0}
              min={-300}
              max={800}
              step={5}
              onChange={(v) => onFontChange('stretch', v)}
              format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)} u`}
            />
          </KeyRow>
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

      {!glyph && (
        <Section title="Name">
          <TextField
            label="Family"
            hint="What the font installs as"
            value={project.familyName}
            placeholder="Untitled"
            onChange={(v) => onNameChange('familyName', v)}
          />
          <TextField
            label="Style"
            value={project.styleName}
            placeholder="Standard"
            onChange={(v) => onNameChange('styleName', v)}
          />
        </Section>
      )}

      {!glyph && (
        <Section title="Document">
          <div className="pt-actions">
            <TextButton label="Open document" onClick={onOpen}>
              Open…
            </TextButton>
            <TextButton label="Save document" onClick={onSave}>
              Save…
            </TextButton>
          </div>
          <p className="pt-empty">Glyphs, timeline and canvas, as one .pillotalk file.</p>
        </Section>
      )}

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
              ? 'Import <letter>u.svg / <letter>l.svg / <digit>.svg files to start.'
              : `${drawn} of ${CHARSET.length} glyphs drawn.`}
          </p>
        </Section>
      )}
    </>
  );
}
