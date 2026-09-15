import { type FC, type ReactNode, useState } from 'react';
import {
  IconButton,
  Gauge,
  GaugeRow,
  Panel,
  Platter,
  RadioGroup,
  Section,
  Select,
  Slider,
  Stepper,
  Tabs,
  TextButton,
  TextField,
  Toggle,
  Vector,
} from '../src';

/** Atomic level a component sits at — drives the sidebar grouping. */
export type Group = 'atoms' | 'molecules' | 'organisms';

/** Sub-heading within a tier. Atoms outnumber every other tier, so they file by
 *  what the part actually does rather than sitting in one long list. Alphabetical,
 *  like the components inside them. */
export const FAMILIES = ['Buttons', 'Choices', 'Readouts', 'Values'] as const;
export type Family = (typeof FAMILIES)[number];

/** One row of a component's props table. */
export interface PropRow {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  description: string;
}

/** A single documentation page: one component, one route. */
export interface DocPage {
  slug: string;
  name: string;
  group: Group;
  /** Sub-heading to file this page under within its tier. Tiers whose pages have
   *  no family render as one flat list. */
  family?: Family;
  summary: string;
  /** A self-contained, interactive demo of the component. Omit to hide the
   *  Example section on that page. */
  Example?: FC;
  props: PropRow[];
}

// ---- Shared render helpers ------------------------------------------------

/** Renders a component's props as a table. */
export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="props-scroll">
      <table className="props">
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                <code>{r.name}</code>
                {r.required && (
                  <span className="req" title="required" aria-label="required">
                    *
                  </span>
                )}
              </td>
              <td>
                <code className="type">{r.type}</code>
              </td>
              <td>{r.default ? <code>{r.default}</code> : <span className="muted">—</span>}</td>
              <td>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A labelled control row used inside the molecule-style examples. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="doc-row">
      <span className="doc-row-label">{label}</span>
      {children}
    </div>
  );
}

// ---- Icons (for the IconButton example) -----------------------------------

const PLAY = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4.5l13 7.5-13 7.5z" fill="currentColor" />
  </svg>
);
const PAUSE = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" />
    <rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" />
  </svg>
);
const DOT = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </svg>
);
const STOP = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
  </svg>
);
const MOVE = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
  </svg>
);
const ROTATE = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" />
  </svg>
);
const SCALE = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 15v5h5M20 9V4h-5M9 4H4v5M15 20h5v-5" />
  </svg>
);
const CHECK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M4 12.5l5 5 11-11" />
  </svg>
);
const PLUS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// ---- Live examples --------------------------------------------------------

function SliderExample() {
  const [focus, setFocus] = useState(42);
  const [aperture, setAperture] = useState(2.8);
  const [gain, setGain] = useState(0.6);
  return (
    <Panel title="Camera">
      <Slider label="focus" value={focus} min={0} max={100} step={1} onChange={setFocus} />
      <Slider
        label="aperture"
        value={aperture}
        min={1.4}
        max={16}
        step={0.1}
        onChange={setAperture}
        format={(v) => `f/${v.toFixed(1)}`}
      />
      <Slider
        label="gain"
        value={gain}
        min={0}
        max={1}
        step={0.01}
        onChange={setGain}
        format={(v) => `${Math.round(v * 100)}%`}
      />
    </Panel>
  );
}

function ToggleExample() {
  const [grid, setGrid] = useState(true);
  const [ambient, setAmbient] = useState(false);
  const [snap, setSnap] = useState(true);
  return (
    <Panel title="Scene">
      <Toggle checked={grid} onChange={setGrid} label="Grid" hint="Reference floor grid" />
      <Toggle checked={ambient} onChange={setAmbient} label="Ambient light" hint="Fill the scene" />
      <Toggle checked={snap} onChange={setSnap} label="Snap to grid" />
    </Panel>
  );
}

function TabsExample() {
  const [tab, setTab] = useState('tab_a');
  const [fov, setFov] = useState(90);
  const [vsync, setVsync] = useState(true);
  const [second, setSecond] = useState(false);
  return (
    <Panel
      title={
        <Tabs
          label="Panel sections"
          items={['tab_a', 'tab_b', { id: 'tab_c', disabled: true }]}
          value={tab}
          onChange={setTab}
        />
      }
    >
      {tab === 'tab_a' ? (
        <>
          <Slider
            label="field_of_view"
            value={fov}
            min={30}
            max={140}
            step={1}
            onChange={setFov}
            format={(v) => `${v}°`}
          />
          <Toggle checked={vsync} onChange={setVsync} label="vsync" hint="sync to display refresh" />
        </>
      ) : (
        <Toggle
          checked={second}
          onChange={setSecond}
          label="second_option"
          hint="lives on the second tab"
        />
      )}
    </Panel>
  );
}

const oneDecimal = (v: number) => v.toFixed(1);

function GaugeExample() {
  const [load, setLoad] = useState(60);
  return (
    <Panel title="Telemetry">
      <GaugeRow>
        <Gauge label="cpu" value={load} format={(v) => String(Math.round(v))} />
        <Gauge label="latency" value={3.4} min={0} max={10} format={oneDecimal} />
        <Gauge label="queue" value={8.2} min={0} max={10} format={oneDecimal} accent />
      </GaugeRow>
      <Slider
        label="cpu_load"
        value={load}
        min={0}
        max={100}
        step={1}
        onChange={setLoad}
        format={(v) => `${v}%`}
      />
    </Panel>
  );
}

function GaugeRowExample() {
  return (
    <Panel style={{ borderRadius: 75 }}>
      <GaugeRow>
        <Gauge label="metric_one" value={60} />
        <Gauge label="metric_two" value={3.4} min={0} max={10} format={oneDecimal} />
        <Gauge label="metric_three" value={8.2} min={0} max={10} format={oneDecimal} accent />
      </GaugeRow>
    </Panel>
  );
}

function StepperExample() {
  const [size, setSize] = useState(256);
  const [samples, setSamples] = useState(8);
  const [bias, setBias] = useState(0);
  return (
    <Panel title="Render">
      <Stepper
        label="Texture size"
        hint="Power-of-two increments"
        value={size}
        min={64}
        max={512}
        step={64}
        onChange={setSize}
        format={(v) => `${v}px`}
      />
      <Stepper label="Samples" hint="Rays per pixel" value={samples} min={1} max={16} onChange={setSamples} />
      <Stepper label="Bias" hint="No bounds — steps forever" value={bias} step={0.25} onChange={setBias} />
    </Panel>
  );
}

function SelectExample() {
  const [shading, setShading] = useState('rendered');
  const [format, setFormat] = useState('png');
  return (
    <Panel title="Viewport">
      <Select
        label="Shading"
        hint="How the viewport draws"
        value={shading}
        options={['wireframe', 'solid', 'material', 'rendered']}
        onChange={setShading}
      />
      <Select
        label="Still format"
        hint="Objects add their own label"
        value={format}
        options={[
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPEG' },
          { value: 'exr', label: 'OpenEXR' },
          { value: 'tiff', label: 'TIFF (soon)', disabled: true },
        ]}
        onChange={setFormat}
      />
    </Panel>
  );
}

function RadioGroupExample() {
  const [axis, setAxis] = useState('y');
  const [quality, setQuality] = useState('med');
  return (
    <Panel title="Transform">
      <RadioGroup
        label="Up axis"
        hint="Exclusive choice"
        value={axis}
        options={['x', 'y', 'z']}
        onChange={setAxis}
      />
      <RadioGroup
        label="Preview"
        hint="One option is disabled"
        value={quality}
        options={[
          { value: 'low', label: 'lo' },
          { value: 'med', label: 'md' },
          { value: 'high', label: 'hi', disabled: true },
        ]}
        onChange={setQuality}
      />
    </Panel>
  );
}

function TextFieldExample() {
  const [name, setName] = useState('untitled_01');
  const [tag, setTag] = useState('');
  return (
    <Panel title="Document">
      <TextField label="Name" hint="Free-form entry" value={name} onChange={setName} />
      <TextField label="Tag" hint="Placeholder when empty" value={tag} placeholder="none" onChange={setTag} />
    </Panel>
  );
}

function IconButtonExample() {
  const [playing, setPlaying] = useState(false);
  const [rec, setRec] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <IconButton
        active={playing}
        label={playing ? 'Pause' : 'Play'}
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? PAUSE : PLAY}
      </IconButton>
      <IconButton active={rec} label="Record" onClick={() => setRec((r) => !r)}>
        {DOT}
      </IconButton>
      <IconButton disabled label="Unavailable">
        {DOT}
      </IconButton>
    </div>
  );
}

function TextButtonExample() {
  const [snap, setSnap] = useState(true);
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      <TextButton onClick={() => {}}>Cancel</TextButton>
      <TextButton icon={PLUS} onClick={() => {}}>
        Add layer
      </TextButton>
      <TextButton icon={CHECK} active={snap} onClick={() => setSnap((s) => !s)}>
        Snap
      </TextButton>
      <TextButton disabled>Unavailable</TextButton>
    </div>
  );
}

function PlatterExample() {
  const [transport, setTransport] = useState<'play' | 'pause' | 'stop'>('stop');
  const [tool, setTool] = useState<'move' | 'rotate' | 'scale'>('move');
  return (
    <div className="doc-stack" style={{ alignItems: 'center' }}>
      <Platter
        label="Transport"
        items={[
          { icon: PLAY, label: 'Play', active: transport === 'play', onClick: () => setTransport('play') },
          { icon: PAUSE, label: 'Pause', active: transport === 'pause', onClick: () => setTransport('pause') },
          { icon: STOP, label: 'Stop', active: transport === 'stop', onClick: () => setTransport('stop') },
          { icon: DOT, label: 'Record', disabled: true },
        ]}
      />
      <Platter
        orientation="vertical"
        label="Transform tool"
        items={[
          { icon: MOVE, text: 'Move', active: tool === 'move', onClick: () => setTool('move') },
          { icon: ROTATE, text: 'Rotate', active: tool === 'rotate', onClick: () => setTool('rotate') },
          { icon: SCALE, text: 'Scale', active: tool === 'scale', onClick: () => setTool('scale') },
        ]}
      />
    </div>
  );
}

/** Immutably set one field of a numeric vector. */
const withAxis = (v: number[], axis: number, next: number) =>
  v.map((n, i) => (i === axis ? next : n));

function VectorExample() {
  const [uv, setUv] = useState<number[]>([0.5, 0.5]);
  const [color, setColor] = useState<number[]>([80, 200, 120]);
  const [rot, setRot] = useState<number[]>([0, 0, 0, 1]);
  return (
    <Panel title="Vectors">
      <Row label="vec2 · uv">
        <Vector
          value={uv}
          min={0}
          max={1}
          step={0.01}
          onChange={(axis, v) => setUv((p) => withAxis(p, axis, v))}
        />
      </Row>
      <Row label="vec3 · color">
        <Vector
          value={color}
          colorMode
          step={1}
          min={0}
          max={255}
          onChange={(axis, v) => setColor((c) => withAxis(c, axis, v))}
        />
      </Row>
      <Row label="vec4 · rotation">
        <Vector
          value={rot}
          step={0.01}
          onChange={(axis, v) => setRot((r) => withAxis(r, axis, v))}
        />
      </Row>
    </Panel>
  );
}

function SectionExample() {
  const [focus, setFocus] = useState(42);
  const [gain, setGain] = useState(0.6);
  const [snap, setSnap] = useState(true);
  return (
    <Panel title="Inspector">
      <Section title="Camera">
        <Slider label="focus" value={focus} min={0} max={100} step={1} onChange={setFocus} />
        <Toggle checked={snap} onChange={setSnap} label="Snap" />
      </Section>
      <Section title="Advanced" defaultOpen={false}>
        <Slider label="gain" value={gain} min={0} max={1} step={0.01} onChange={setGain} />
      </Section>
    </Panel>
  );
}

// ---- Page registry --------------------------------------------------------

export const pages: DocPage[] = [
  {
    slug: 'gauge',
    name: 'Gauge',
    group: 'atoms',
    family: 'Readouts',
    summary: 'A read-only 270° dial with a rounded fill, a tabular readout, and a caption. The range and the displayed number are independent, so 3.4-out-of-10 reads "3.4" on a 34%-full arc.',
    Example: GaugeExample,
    props: [
      { name: 'value', type: 'number', required: true, description: 'Current reading.' },
      { name: 'min', type: 'number', default: '0', description: 'Bottom of the swept range.' },
      { name: 'max', type: 'number', default: '100', description: 'Top of the swept range.' },
      { name: 'label', type: 'ReactNode', description: 'Caption under the dial.' },
      { name: 'format', type: '(v: number) => string', description: 'Format the number in the middle; the arc still fills from value.' },
      { name: 'accent', type: 'boolean', default: 'false', description: 'Paint the fill with the accent instead of the muted gauge fill.' },
    ],
  },
  {
    slug: 'gauge-row',
    name: 'Gauge Row',
    group: 'molecules',
    summary: 'The strip a set of Gauge dials sits in — spaced evenly across the plate and hung from a common top edge so their captions line up.',
    Example: GaugeRowExample,
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The gauges — usually two to four Gauges.' },
      { name: 'className', type: 'string', description: 'Extra class names on the row.' },
    ],
  },
  {
    slug: 'icon-button',
    name: 'Icon Button',
    group: 'atoms',
    family: 'Buttons',
    summary: 'A round icon button on a panel-plate ground. Supply your own icon; the active state paints the accent.',
    Example: IconButtonExample,
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The icon to render (e.g. an inline <svg>).' },
      { name: 'onClick', type: '() => void', description: 'Click handler.' },
      { name: 'active', type: 'boolean', default: 'false', description: 'Render the accent (pressed) state and set aria-pressed.' },
      { name: 'label', type: 'string', description: 'Accessible name + tooltip.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the button and block interaction.' },
      { name: 'className', type: 'string', description: 'Extra class names on the button.' },
    ],
  },
  {
    slug: 'panel',
    name: 'Panel',
    group: 'organisms',
    summary: 'A static control-panel plate: the grey surface with an optional header bar and a padded body. Use it to group controls anywhere. Optionally folds its body away while keeping the plate width.',
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The panel body content.' },
      { name: 'title', type: 'ReactNode', description: 'Optional header bar. A string renders bold; pass a node for custom markup.' },
      { name: 'collapsible', type: 'boolean', default: 'false', description: "Show a header −/+ toggle that folds the plate's body away." },
      { name: 'collapsed', type: 'boolean', description: 'Collapsed state (controlled). Pair with onCollapsedChange; omit to use defaultCollapsed.' },
      { name: 'defaultCollapsed', type: 'boolean', default: 'false', description: 'Start collapsed (uncontrolled). Only meaningful with collapsible.' },
      { name: 'onCollapsedChange', type: '(collapsed: boolean) => void', description: 'Called with the next state when the collapse toggle is clicked.' },
      { name: 'width', type: 'number | string', default: '380px', description: 'Plate width. Unchanged while collapsed — only the body folds away.' },
      { name: 'className', type: 'string', description: 'Extra class names on the plate.' },
      { name: 'style', type: 'CSSProperties', description: 'Inline styles merged onto the plate.' },
    ],
  },
  {
    slug: 'platter',
    name: 'Platter',
    group: 'molecules',
    summary: 'A recessed capsule tray holding a row or column of icon and text buttons. Mix segment types freely; each lights up on hover and paints the accent when active.',
    Example: PlatterExample,
    props: [
      { name: 'items', type: 'PlatterItem[]', required: true, description: 'The segments. Each has an optional icon and/or text, plus onClick, active, disabled, and an a11y label.' },
      { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Lay the segments in a row or a column.' },
      { name: 'label', type: 'string', description: "Accessible name for the group (the toolbar's aria-label)." },
      { name: 'className', type: 'string', description: 'Extra class names on the tray.' },
    ],
  },
  {
    slug: 'radio-group',
    name: 'Radio Group',
    group: 'atoms',
    family: 'Choices',
    summary: 'A row of dot-and-label choices over real radio inputs, so arrow-key roving and form semantics come from the platform. Reach for it over a Select when the options are few and short.',
    Example: RadioGroupExample,
    props: [
      { name: 'value', type: 'string', required: true, description: 'Currently selected value (controlled).' },
      { name: 'onChange', type: '(v: string) => void', required: true, description: 'Called with the newly selected value.' },
      { name: 'options', type: '(string | RadioOption)[]', required: true, description: 'The choices. A bare string is shorthand for { value: theString }; an object adds label and disabled.' },
      { name: 'name', type: 'string', description: 'Shared name for the underlying radios. Generated when omitted — pass one only to join a wider native group.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable every choice in the group.' },
    ],
  },
  {
    slug: 'section',
    name: 'Section',
    group: 'molecules',
    summary: 'A collapsible titled section: a bold header that folds its body with a smooth wipe. Nest these inside a Panel.',
    Example: SectionExample,
    props: [
      { name: 'title', type: 'string', required: true, description: 'Header label.' },
      { name: 'children', type: 'ReactNode', required: true, description: 'The section body content.' },
      { name: 'defaultOpen', type: 'boolean', default: 'true', description: 'Whether the section starts expanded.' },
    ],
  },
  {
    slug: 'select',
    name: 'Select',
    group: 'atoms',
    family: 'Choices',
    summary: 'A native select restyled as a track capsule. The chevron is a real sibling element, so it retints with the rest of the control.',
    Example: SelectExample,
    props: [
      { name: 'value', type: 'string', required: true, description: 'Currently selected value (controlled).' },
      { name: 'onChange', type: '(v: string) => void', required: true, description: 'Called with the newly selected value.' },
      { name: 'options', type: '(string | SelectOption)[]', required: true, description: 'The choices. A bare string is shorthand for { value: theString }; an object adds label and disabled.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the capsule and block interaction.' },
    ],
  },
  {
    slug: 'slider',
    name: 'Slider',
    group: 'atoms',
    family: 'Values',
    summary: 'Label + value + capsule track in one object. Pointer-capture drag, keyboard arrows, optional value formatting.',
    Example: SliderExample,
    props: [
      { name: 'label', type: 'string', required: true, description: 'Text shown on the left of the track.' },
      { name: 'value', type: 'number', required: true, description: 'Current value (fully controlled).' },
      { name: 'min', type: 'number', required: true, description: 'Lowest value.' },
      { name: 'max', type: 'number', required: true, description: 'Highest value.' },
      { name: 'step', type: 'number', required: true, description: 'Increment / snap grid.' },
      { name: 'onChange', type: '(v: number) => void', required: true, description: 'Called with the new value on drag or keypress.' },
      { name: 'format', type: '(v: number) => string', description: 'Format the displayed value; the underlying number is unchanged.' },
    ],
  },
  {
    slug: 'stepper',
    name: 'Stepper',
    group: 'atoms',
    family: 'Values',
    summary: 'A recessed capsule holding −/+ buttons around a tabular readout. For values that move in discrete increments; the buttons disable at the bounds.',
    Example: StepperExample,
    props: [
      { name: 'value', type: 'number', required: true, description: 'Current value (fully controlled).' },
      { name: 'onChange', type: '(v: number) => void', required: true, description: 'Called with the new value on each press.' },
      { name: 'step', type: 'number', default: '1', description: 'Amount one press moves the value.' },
      { name: 'min', type: 'number', description: 'Clamp to this minimum; the − button disables once the value reaches it.' },
      { name: 'max', type: 'number', description: 'Clamp to this maximum; the + button disables once the value reaches it.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'format', type: '(v: number) => string', description: 'Format the displayed value; the underlying number is unchanged.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim both buttons and block interaction.' },
    ],
  },
  {
    slug: 'tabs',
    name: 'Tabs',
    group: 'molecules',
    summary: "A capsule tab strip. Hand it to a Panel's title and it becomes the plate's flush header; drop it anywhere else and it's a self-contained bar. It renders only the strip — which body to show is yours to switch on value.",
    Example: TabsExample,
    props: [
      { name: 'items', type: '(string | TabItem)[]', required: true, description: 'The tabs, left to right. A bare string is shorthand for { id: theString }; an object adds label and disabled.' },
      { name: 'value', type: 'string', required: true, description: 'Active tab id (fully controlled).' },
      { name: 'onChange', type: '(id: string) => void', required: true, description: 'Called with the newly selected tab id, on click or arrow key.' },
      { name: 'label', type: 'string', description: "Accessible name for the strip (the tablist's aria-label)." },
      { name: 'className', type: 'string', description: 'Extra class names on the strip.' },
    ],
  },
  {
    slug: 'text-button',
    name: 'Text Button',
    group: 'atoms',
    family: 'Buttons',
    summary: "IconButton's text-label sibling: a capsule that hugs its label on a panel-plate ground, with an optional leading icon. The active state paints the accent.",
    Example: TextButtonExample,
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The button label.' },
      { name: 'onClick', type: '() => void', description: 'Click handler.' },
      { name: 'icon', type: 'ReactNode', description: 'Optional leading icon (e.g. an inline <svg>), placed before the label.' },
      { name: 'active', type: 'boolean', default: 'false', description: 'Render the accent (pressed) state and set aria-pressed.' },
      { name: 'label', type: 'string', description: 'Tooltip + accessible-name override. Defaults to the visible label.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the button and block interaction.' },
      { name: 'className', type: 'string', description: 'Extra class names on the button.' },
    ],
  },
  {
    slug: 'text-field',
    name: 'Text Field',
    group: 'atoms',
    family: 'Values',
    summary: 'A track capsule for free-form entry, set in the mono face so typed identifiers line up with the numeric readouts around them.',
    Example: TextFieldExample,
    props: [
      { name: 'value', type: 'string', required: true, description: 'Current text (fully controlled).' },
      { name: 'onChange', type: '(v: string) => void', required: true, description: 'Called with the new text on every keystroke.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'placeholder', type: 'string', description: 'Shown while the field is empty.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the capsule and block interaction.' },
      { name: 'spellCheck', type: 'boolean', default: 'false', description: 'Native spellcheck. Off by default — these fields usually hold identifiers rather than prose.' },
    ],
  },
  {
    slug: 'toggle',
    name: 'Toggle',
    group: 'atoms',
    family: 'Choices',
    summary: 'A capsule on/off switch, optionally paired with a bold label and a hint line. The whole row is the click target.',
    Example: ToggleExample,
    props: [
      { name: 'checked', type: 'boolean', required: true, description: 'On/off state (controlled).' },
      { name: 'onChange', type: '(checked: boolean) => void', required: true, description: 'Called with the next state.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the switch and block interaction.' },
    ],
  },
  {
    slug: 'vector',
    name: 'Vector',
    group: 'atoms',
    family: 'Values',
    summary: 'A segmented capsule with 2, 3, or 4 numeric fields. Drag a field vertically to scrub or type a value; color mode paints each field with its live rgb.',
    Example: VectorExample,
    props: [
      { name: 'value', type: 'number[]', required: true, description: 'The field values. The capsule renders one field per entry — use 2, 3, or 4.' },
      { name: 'onChange', type: '(axis: number, v: number) => void', required: true, description: 'Called with the changed field index and its new value.' },
      { name: 'step', type: 'number', default: '0.5', description: 'Scrub / type increment.' },
      { name: 'min', type: 'number', description: 'Clamp values to this minimum.' },
      { name: 'max', type: 'number', description: 'Clamp values to this maximum.' },
      { name: 'colorMode', type: 'boolean', default: 'false', description: 'Paint each field with its live rgb value (expects three 0–255 components).' },
    ],
  },
];

/** The families inside one tier, in display order, each holding its pages.
 *  A tier whose pages carry no family comes back as a single unlabelled section,
 *  so callers can render every tier the same way. */
export function familiesOf(group: Group): { label?: Family; items: DocPage[] }[] {
  const tier = pages.filter((p) => p.group === group);
  const named = FAMILIES.map((label) => ({
    label,
    items: tier.filter((p) => p.family === label),
  })).filter((f) => f.items.length > 0);
  const loose = tier.filter((p) => p.family == null);
  return loose.length > 0 ? [...named, { items: loose }] : named;
}
