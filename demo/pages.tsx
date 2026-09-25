import { type ReactNode, useState } from 'react';
import {
  IconButton,
  Gauge,
  GaugeRow,
  List,
  type ListItem,
  Panel,
  Platter,
  RadioGroup,
  Readout,
  Section,
  Select,
  Slider,
  Stepper,
  Table,
  type TableSort,
  Tabs,
  TextButton,
  TextField,
  Toggle,
  Toolbar,
  Tree,
  type TreeMove,
  type TreeNode,
  Vector,
} from '../src';
import { AppShell, TitleBar, WindowControls } from '../src/window';
import type { PropRow } from './catalog';

// ---- Shared render helpers ------------------------------------------------

/** Renders a component's props as a table. */
export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="props-scroll">
      <table className="props">
        <thead>
          <tr>
            <th>Property</th>
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

export function SliderExample() {
  const [focus, setFocus] = useState(42);
  const [aperture, setAperture] = useState(2.8);
  const [gain, setGain] = useState(0.6);
  return (
    <Panel title="Camera">
      <Slider label="Focus" value={focus} min={0} max={100} step={1} onChange={setFocus} />
      <Slider
        label="Aperture"
        value={aperture}
        min={1.4}
        max={16}
        step={0.1}
        onChange={setAperture}
        format={(v) => `f/${v.toFixed(1)}`}
      />
      <Slider
        label="Gain"
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

export function ToggleExample() {
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

export function TabsExample() {
  const [tab, setTab] = useState('lens');
  const [fov, setFov] = useState(90);
  const [vsync, setVsync] = useState(true);
  const [second, setSecond] = useState(false);
  return (
    <Panel
      title={
        <Tabs
          label="Panel sections"
          items={[
            { id: 'lens', label: 'Lens' },
            { id: 'display', label: 'Display' },
            { id: 'output', label: 'Output', disabled: true },
          ]}
          value={tab}
          onChange={setTab}
        />
      }
    >
      {tab === 'lens' ? (
        <>
          <Slider
            label="Field of view"
            value={fov}
            min={30}
            max={140}
            step={1}
            onChange={setFov}
            format={(v) => `${v}°`}
          />
          <Toggle checked={vsync} onChange={setVsync} label="VSync" hint="Sync to display refresh" />
        </>
      ) : (
        <Toggle
          checked={second}
          onChange={setSecond}
          label="Color management"
          hint="Lives on the second tab"
        />
      )}
    </Panel>
  );
}

const oneDecimal = (v: number) => v.toFixed(1);

export function GaugeExample() {
  const [load, setLoad] = useState(60);
  return (
    <Panel title="Telemetry">
      <GaugeRow>
        <Gauge label="CPU" value={load} format={(v) => String(Math.round(v))} />
        <Gauge label="Latency" value={3.4} min={0} max={10} format={oneDecimal} />
        <Gauge label="Queue" value={8.2} min={0} max={10} format={oneDecimal} accent />
      </GaugeRow>
      <Slider
        label="CPU load"
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

export function GaugeRowExample() {
  return (
    <Panel style={{ borderRadius: 75 }}>
      <GaugeRow>
        <Gauge label="Throughput" value={60} />
        <Gauge label="Latency" value={3.4} min={0} max={10} format={oneDecimal} />
        <Gauge label="Queue" value={8.2} min={0} max={10} format={oneDecimal} accent />
      </GaugeRow>
    </Panel>
  );
}

export function StepperExample() {
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

export function SelectExample() {
  const [shading, setShading] = useState('rendered');
  const [format, setFormat] = useState('png');
  return (
    <Panel title="Viewport">
      <Select
        label="Shading"
        hint="How the viewport draws"
        value={shading}
        options={[
          { value: 'wireframe', label: 'Wireframe' },
          { value: 'solid', label: 'Solid' },
          { value: 'material', label: 'Material' },
          { value: 'rendered', label: 'Rendered' },
        ]}
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

export function RadioGroupExample() {
  const [axis, setAxis] = useState('y');
  const [quality, setQuality] = useState('med');
  return (
    <Panel title="Transform">
      <RadioGroup
        label="Up axis"
        hint="Exclusive choice"
        value={axis}
        options={[
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
          { value: 'z', label: 'Z' },
        ]}
        onChange={setAxis}
      />
      <RadioGroup
        label="Preview"
        hint="One is disabled"
        value={quality}
        options={[
          { value: 'low', label: 'Low' },
          { value: 'med', label: 'Medium' },
          { value: 'high', label: 'High', disabled: true },
        ]}
        onChange={setQuality}
      />
    </Panel>
  );
}

export function TextFieldExample() {
  const [name, setName] = useState('Untitled 01');
  const [tag, setTag] = useState('');
  return (
    <Panel title="Document">
      <TextField label="Name" hint="Free-form entry" value={name} onChange={setName} />
      <TextField label="Tag" hint="Placeholder when empty" value={tag} placeholder="None" onChange={setTag} />
    </Panel>
  );
}

export function IconButtonExample() {
  const [playing, setPlaying] = useState(false);
  const [rec, setRec] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {/* Toggles: `active` is the state and the press comes back through
          `onChange`, so neither one has to flip the flag by hand. */}
      <IconButton
        mode="toggle"
        active={playing}
        onChange={setPlaying}
        label={playing ? 'Pause' : 'Play'}
      >
        {playing ? PAUSE : PLAY}
      </IconButton>
      <IconButton mode="toggle" active={rec} onChange={setRec} label="Record">
        {DOT}
      </IconButton>
      {/* A plain action — the quiet default tier. */}
      <IconButton onClick={() => {}} label="Stop">
        {STOP}
      </IconButton>
      {/* An accented action: the same paint the whole set used to wear at rest,
          now reserved for the one button in a cluster worth pressing. */}
      <IconButton active onClick={() => {}} label="Apply">
        {CHECK}
      </IconButton>
      <IconButton disabled label="Unavailable">
        {DOT}
      </IconButton>
    </div>
  );
}

export function TextButtonExample() {
  const [snap, setSnap] = useState(true);
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      <TextButton onClick={() => {}}>Cancel</TextButton>
      <TextButton icon={PLUS} onClick={() => {}}>
        Add layer
      </TextButton>
      {/* Accent on an action marks the primary one — it is not a state, and
          nothing is announced as pressed. */}
      <TextButton active onClick={() => {}}>
        Apply
      </TextButton>
      {/* Accent on a toggle *is* the state. Same paint, different meaning. */}
      <TextButton mode="toggle" icon={CHECK} active={snap} onChange={setSnap}>
        Snap
      </TextButton>
      <TextButton disabled>Unavailable</TextButton>
    </div>
  );
}

export function PlatterExample() {
  const [transport, setTransport] = useState('stop');
  const [tool, setTool] = useState('move');
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(false);
  return (
    <div className="doc-stack" style={{ alignItems: 'center' }}>
      {/* One choice out of several — exactly one segment is ever lit, and the
          tray reports which through `onChange`. */}
      <Platter
        mode="select"
        label="Transport"
        value={transport}
        onChange={setTransport}
        items={[
          { value: 'play', icon: PLAY, label: 'Play' },
          { value: 'pause', icon: PAUSE, label: 'Pause' },
          { value: 'stop', icon: STOP, label: 'Stop' },
          { value: 'record', icon: DOT, label: 'Record', disabled: true },
        ]}
      />
      {/* Independent toggles: both can be on at once, and each carries its own
          handler. Same tray, different job. */}
      <Platter
        label="Snapping"
        items={[
          { icon: CHECK, text: 'Snap', active: snap, onClick: () => setSnap((s) => !s) },
          { icon: PLUS, text: 'Grid', active: grid, onClick: () => setGrid((g) => !g) },
          { icon: DOT, text: 'Magnet', disabled: true },
        ]}
      />
      <Platter
        mode="select"
        orientation="vertical"
        label="Transform tool"
        value={tool}
        onChange={setTool}
        items={[
          { value: 'move', icon: MOVE, text: 'Move' },
          { value: 'rotate', icon: ROTATE, text: 'Rotate' },
          { value: 'scale', icon: SCALE, text: 'Scale' },
        ]}
      />
    </div>
  );
}

export function ToolbarExample() {
  const [tool, setTool] = useState('move');
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(false);
  return (
    <Toolbar
      label="Viewport"
      /* Status goes in `end` — it is what the bar reports, not what it
         offers, and it wants the far edge. */
      end={
        <>
          <Readout label="FPS" value="60" />
          <Readout value="1920×1080" />
        </>
      }
    >
      <Platter
        mode="select"
        label="Transform tool"
        value={tool}
        onChange={setTool}
        items={[
          { value: 'move', icon: MOVE, label: 'Move' },
          { value: 'rotate', icon: ROTATE, label: 'Rotate' },
          { value: 'scale', icon: SCALE, label: 'Scale' },
        ]}
      />
      <Platter
        label="Snapping"
        items={[
          { icon: CHECK, text: 'Snap', active: snap, onClick: () => setSnap((v) => !v) },
          { icon: PLUS, text: 'Grid', active: grid, onClick: () => setGrid((v) => !v) },
        ]}
      />
    </Toolbar>
  );
}

export function ReadoutExample() {
  const [fps, setFps] = useState(60);
  return (
    <Panel title="Viewport">
      <Row label="Target">
        <Stepper value={fps} onChange={setFps} min={24} max={120} step={12} />
      </Row>
      {/* Accent is the value someone set; the plain capsules below are what the
          panel reports back off it. */}
      <Row label="Set to">
        <Readout label="FPS" value={fps.toFixed(0)} accent />
      </Row>
      <Row label="Frame budget">
        {/* `ms` stays lower case: it is the SI symbol for a millisecond, and
            "MS" would be a different thing entirely. */}
        <Readout label="ms" value={(1000 / fps).toFixed(2)} />
      </Row>
      <Row label="Resolution">
        <Readout value="1920×1080" />
      </Row>
    </Panel>
  );
}

/** Immutably move one entry of a list to another index — what `onReorder`
 *  expects you to do with the pair of indices it hands you. */
function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

export function ListExample() {
  const [stack, setStack] = useState<ListItem[]>([
    { id: 'bloom', label: 'Bloom', meta: '0.42' },
    { id: 'grade', label: 'Color grade', meta: 'ACES' },
    { id: 'grain', label: 'Film grain', meta: '0.08' },
    { id: 'vignette', label: 'Vignette', meta: '0.25' },
    { id: 'output', label: 'Output', meta: 'sRGB', disabled: true },
  ]);
  return (
    <Panel title="Render stack">
      <List
        label="Render stack"
        items={stack}
        reorderable
        onReorder={(from, to) => setStack((s) => move(s, from, to))}
      />
    </Panel>
  );
}

/* A render queue: the columns a desktop app actually shows, with the numbers in
   their own mono columns so they stay on the decimal point as they change. */
const SHOTS = [
  { id: 'sh010', shot: 'sh010_bloom', frames: 248, size: '1.4 GB', status: 'Done' },
  { id: 'sh020', shot: 'sh020_grade', frames: 1024, size: '6.2 GB', status: 'Rendering' },
  { id: 'sh030', shot: 'sh030_grain', frames: 96, size: '0.4 GB', status: 'Queued' },
  { id: 'sh040', shot: 'sh040_vignette', frames: 512, size: '2.8 GB', status: 'Queued' },
];

export function TableExample() {
  const [sort, setSort] = useState<TableSort | null>({ key: 'frames', direction: 'desc' });

  // The table reports the sort it wants and nothing else — ordering the rows is
  // the caller's, exactly as applying a List's onReorder is.
  const rows = [...SHOTS].sort((a, b) => {
    if (!sort) return 0;
    const [x, y] = sort.direction === 'asc' ? [a, b] : [b, a];
    const key = sort.key as keyof typeof a;
    return typeof x[key] === 'number' && typeof y[key] === 'number'
      ? (x[key] as number) - (y[key] as number)
      : String(x[key]).localeCompare(String(y[key]));
  });

  return (
    /* Four columns want more plate than the 340px the examples default to; the
       min() still lets it give way on a narrow viewport. */
    <Panel title="Render queue" width="min(460px, 100%)">
      <Table
        label="Render queue"
        sort={sort}
        onSortChange={setSort}
        columns={[
          { key: 'shot', header: 'Shot', sortable: true },
          { key: 'frames', header: 'Frames', numeric: true, sortable: true, width: '88px' },
          { key: 'size', header: 'Size', numeric: true, width: '88px' },
          { key: 'status', header: 'Status', sortable: true, width: '104px' },
        ]}
        rows={rows}
        empty="Nothing queued"
      />
    </Panel>
  );
}

const insertAt = (list: TreeNode[], index: number, node: TreeNode) => {
  const out = list.slice();
  out.splice(index, 0, node);
  return out;
};

/** Apply what `onMove` describes: lift the node out of wherever it was, then
 *  drop it back in under its new parent. The two halves are why `index` counts
 *  siblings with the node already removed. */
function applyMove(nodes: TreeNode[], { id, parentId, index }: TreeMove): TreeNode[] {
  let moved: TreeNode | undefined;
  const lift = (list: TreeNode[]): TreeNode[] =>
    list.flatMap((n) => {
      if (n.id === id) {
        moved = n;
        return [];
      }
      return [n.children ? { ...n, children: lift(n.children) } : n];
    });
  const drop = (list: TreeNode[], under: string | null): TreeNode[] => {
    if (under === null) return insertAt(list, index, moved!);
    return list.map((n) => {
      if (n.id === under) return { ...n, children: insertAt(n.children ?? [], index, moved!) };
      return n.children ? { ...n, children: drop(n.children, under) } : n;
    });
  };
  const rest = lift(nodes);
  return moved ? drop(rest, parentId) : nodes;
}

const SCENE: TreeNode[] = [
  { id: 'camera', label: 'Camera', meta: '35mm' },
  {
    id: 'rig',
    label: 'Character rig',
    children: [
      {
        id: 'spine',
        label: 'Spine',
        children: [
          { id: 'head', label: 'Head', meta: 'mesh' },
          { id: 'arm-l', label: 'Arm.L', meta: 'mesh' },
        ],
      },
      { id: 'ik', label: 'IK targets', meta: '4' },
    ],
  },
  {
    id: 'lights',
    label: 'Lights',
    children: [
      { id: 'key', label: 'Key', meta: '900W' },
      { id: 'fill', label: 'Fill', meta: '200W' },
    ],
  },
  { id: 'world', label: 'World', meta: 'HDRI', disabled: true },
];

/** Flip one node's `disabled` flag wherever it sits in the tree. */
const toggleLock = (nodes: TreeNode[], id: string): TreeNode[] =>
  nodes.map((n) => {
    if (n.id === id) return { ...n, disabled: !n.disabled };
    return n.children ? { ...n, children: toggleLock(n.children, id) } : n;
  });

export function TreeExample() {
  const [scene, setScene] = useState<TreeNode[]>(SCENE);
  return (
    <Panel title="Outliner">
      <Tree
        label="Scene"
        items={scene}
        defaultExpanded={['rig', 'spine', 'lights']}
        reorderable
        onMove={(m) => setScene((s) => applyMove(s, m))}
        // A real outliner would open a menu here; this one locks the node, so
        // the button has something visible to do.
        onMore={(id) => setScene((s) => toggleLock(s, id))}
      />
    </Panel>
  );
}

/** Immutably set one field of a numeric vector. */
const withAxis = (v: number[], axis: number, next: number) =>
  v.map((n, i) => (i === axis ? next : n));

export function VectorExample() {
  const [uv, setUv] = useState<number[]>([0.5, 0.5]);
  const [color, setColor] = useState<number[]>([80, 200, 120]);
  const [rot, setRot] = useState<number[]>([0, 0, 0, 1]);
  return (
    <Panel title="Vectors">
      {/* The GLSL type names stay lower case — `vec3` is how the language
          spells it — and only the English half takes a capital. */}
      <Row label="vec2 · UV">
        <Vector
          value={uv}
          min={0}
          max={1}
          step={0.01}
          onChange={(axis, v) => setUv((p) => withAxis(p, axis, v))}
        />
      </Row>
      <Row label="vec3 · Color">
        <Vector
          value={color}
          colorMode
          step={1}
          min={0}
          max={255}
          onChange={(axis, v) => setColor((c) => withAxis(c, axis, v))}
        />
      </Row>
      <Row label="vec4 · Rotation">
        <Vector
          value={rot}
          step={0.01}
          onChange={(axis, v) => setRot((r) => withAxis(r, axis, v))}
        />
      </Row>
    </Panel>
  );
}

export function SectionExample() {
  const [focus, setFocus] = useState(42);
  const [gain, setGain] = useState(0.6);
  const [snap, setSnap] = useState(true);
  return (
    <Panel title="Inspector">
      <Section title="Camera">
        <Slider label="Focus" value={focus} min={0} max={100} step={1} onChange={setFocus} />
        <Toggle checked={snap} onChange={setSnap} label="Snap" />
      </Section>
      <Section title="Advanced" defaultOpen={false}>
        <Slider label="Gain" value={gain} min={0} max={1} step={0.01} onChange={setGain} />
      </Section>
    </Panel>
  );
}

// ---- Window chrome examples -----------------------------------------------

/* The desktop components are wired to a real window in an Electron app (see the
   TitleBar page's setup notes). On the web there is no window to act on, so
   these demos hold the state themselves — which is also exactly what the
   components see: they are as controlled as every other part of the kit.

   Each one sits in a `.doc-chrome` box: a scrap of stage with the shell's own
   ground and dotted backdrop. The capsules are glass, so a demo of them on the
   page's flat ground would show the one thing the material never does. */

export function TitleBarExample() {
  const [maximized, setMaximized] = useState(false);
  const [dirty, setDirty] = useState(true);
  const [inactive, setInactive] = useState(false);
  // Narrowing the box narrows the strip inside it, which is the only thing the
  // collapse measures — so this slider is a window edge being dragged.
  const [width, setWidth] = useState(100);
  const toggle = () => setMaximized((m) => !m);

  const bar = (platform: 'mac' | 'win') => (
    <TitleBar
      title="Untitled composition"
      platform={platform}
      maximized={maximized}
      dirty={dirty}
      inactive={inactive}
      onMinimize={() => {}}
      onMaximize={toggle}
      onClose={() => {}}
      onTitleDoubleClick={toggle}
      right={
        <>
          <Readout label="FPS" value="60" />
          <Readout label="Size" value="1920×1080" />
        </>
      }
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
      <div className="doc-chrome" style={{ height: 170, width: `${width}%` }}>
        {bar('mac')}
        <StageFill />
      </div>
      <div className="doc-chrome" style={{ height: 170, width: `${width}%` }}>
        {bar('win')}
        <StageFill />
      </div>
      {/* Unwrapped, unlike the toggles below: a Slider draws its own label and
          value, so a Row around it would print the word twice. */}
      <Slider
        label="Window width"
        value={width}
        min={28}
        max={100}
        step={1}
        onChange={setWidth}
        format={(v) => `${v}%`}
      />
      <Row label="Unsaved">
        <Toggle checked={dirty} onChange={setDirty} />
      </Row>
      <Row label="Unfocused">
        <Toggle checked={inactive} onChange={setInactive} />
      </Row>
    </div>
  );
}

/** Something under the glass. The capsules blur what is behind them, so every
 *  demo here needs content passing beneath — otherwise the frosting has nothing
 *  to be frosting *of*. */
function StageFill() {
  return (
    <div style={{ padding: 'var(--space-4)', paddingTop: 'calc(var(--titlebar-h) + var(--space-2))' }}>

    </div>
  );
}

export function WindowControlsExample() {
  const [maximized, setMaximized] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [graphite, setGraphite] = useState(false);
  const [inactive, setInactive] = useState(false);

  const cluster = (platform: 'mac' | 'win') => (
    <WindowControls
      platform={platform}
      maximized={maximized}
      dirty={dirty}
      graphite={graphite}
      inactive={inactive}
      onMinimize={() => {}}
      onMaximize={() => setMaximized((m) => !m)}
      onClose={() => {}}
    />
  );

  return (
    <div
      className="doc-chrome"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}
    >
      <Row label="macOS style">{cluster('mac')}</Row>
      <Row label="Windows style">{cluster('win')}</Row>
      <Row label="Dirty">
        <Toggle checked={dirty} onChange={setDirty} />
      </Row>
      {/* Only the macOS row answers this one — the Windows cluster has no
          lights to stand down — which is the point worth showing. */}
      <Row label="Graphite">
        <Toggle checked={graphite} onChange={setGraphite} />
      </Row>
      {/* Standalone here. In a TitleBar the strip owns this state and forwards
          it, along with the opacity step the rest of the chrome takes. */}
      <Row label="Unfocused">
        <Toggle checked={inactive} onChange={setInactive} />
      </Row>
    </div>
  );
}

export function AppShellExample() {
  const [focus, setFocus] = useState(42);
  const [grid, setGrid] = useState(true);

  return (
    <div className="doc-chrome">
      {/* An inline height beats the stylesheet's 100dvh, which is what the
          shell is for in a real window. */}
      <AppShell
        style={{ height: 340 }}
        titleBar={
          <TitleBar
            title="Workbench"
            platform="mac"
            onMinimize={() => {}}
            onMaximize={() => {}}
            onClose={() => {}}
            /* Where a status bar's line would have gone. Up here it sits beside
               the title instead of at the far corner of the window, and folds
               into the strip's overflow sheet when the room runs out. */
            right={
              <>
                <Readout label="State" value="Ready" />
                <Readout label="FPS" value="60" />
              </>
            }
          />
        }
      >
        {/* The stage runs under the chrome, so content that must be read from
            its first line starts below it. A navigator is just one more plate
            on the stage — the shell has no opinion about where it sits. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-4)',
            padding: 'var(--space-4)',
            paddingTop: 'calc(var(--titlebar-h) + var(--space-2))',
          }}
        >
          <Panel title="Scene" width={200}>
            <List
              label="Scene"
              items={[
                { id: 'camera', label: 'Camera', meta: '35mm' },
                { id: 'key', label: 'Key light', meta: '900W' },
                { id: 'floor', label: 'Floor', meta: 'mesh' },
              ]}
            />
          </Panel>
          <Panel title="Camera" width={280}>
            <Slider label="Focus" value={focus} min={0} max={100} step={1} onChange={setFocus} />
            <Toggle checked={grid} onChange={setGrid} label="Grid" />
          </Panel>
        </div>
      </AppShell>
    </div>
  );
}

/** The Electron wiring, on the TitleBar page because that is the part that
 *  needs it. Three files, none of them long. */
export function TitleBarGuide() {
  return (
    <>
      <section className="doc-section">
        <h2>Electron setup</h2>
        <p className="doc-prose">
          The strip is presentational: it draws the chrome and reports presses.
          Three small pieces connect it to a real window — window options that
          drop the OS frame, a preload that exposes a fixed five-verb bridge, and
          a hook that reads it. Outside Electron the hook returns inert defaults,
          so the same tree still renders (this page is proof).
        </p>
        <pre className="code">
          <code>{`// main.cjs
const { app, BrowserWindow } = require('electron');
const { attachWindowBridge, panelWindowOptions } = require('pretty-panels/main');

app.whenReady().then(() => {
  const win = new BrowserWindow(panelWindowOptions({
    webPreferences: { preload: require.resolve('pretty-panels/preload') },
  }));
  attachWindowBridge(win);
  win.loadFile('dist/index.html');
});`}</code>
        </pre>
        <pre className="code">
          <code>{`// renderer
import { AppShell, TitleBar } from 'pretty-panels/window';
import { useWindowState } from 'pretty-panels/electron';

function Chrome() {
  const win = useWindowState();
  return (
    <TitleBar
      title="Workbench"
      platform={win.platform}
      maximized={win.maximized}
      fullscreen={win.fullscreen}
      inactive={!win.focused}
      onMinimize={win.minimize}
      onMaximize={win.toggleMaximize}
      onClose={win.close}
      onTitleDoubleClick={win.titleDoubleClick}
    />
  );
}`}</code>
        </pre>
        <p className="doc-prose">
          A runnable version of exactly this is in <code>examples/electron/</code>.
        </p>
      </section>
      <section className="doc-section">
        <h2>Platform notes</h2>
        <p className="doc-prose">
          Drawing your own controls on macOS means <code>frame: false</code>, which
          also removes the traffic lights, the double-click-to-zoom gesture and the
          green fullscreen button. <code>attachWindowBridge</code> restores the
          first two (the double-click honours the user&rsquo;s
          <code> AppleActionOnDoubleClick</code> setting). To keep the native
          lights instead, create the window with{' '}
          <code>{`{ frame: true, titleBarStyle: 'hidden' }`}</code> and render{' '}
          <code>controls=&quot;native&quot;</code>, which reserves their space
          rather than drawing buttons.
        </p>
        <p className="doc-prose">
          Anything interactive on a drag region needs{' '}
          <code>-webkit-app-region: no-drag</code> or it never receives its click.
          The stylesheet does that for the kit&rsquo;s own capsules and for any{' '}
          <code>button</code>, <code>input</code>, <code>select</code> or{' '}
          <code>a</code> inside the strip. The title pill is the exception, and
          deliberately: it stays part of the drag region, because the title is the
          window&rsquo;s handle.
        </p>
      </section>
      <section className="doc-section">
        <h2>Narrow windows</h2>
        <p className="doc-prose">
          The strip never spills. A <code>ResizeObserver</code> watches it, and
          the moment the row stops fitting, <code>left</code> and{' '}
          <code>right</code> fold into a single ellipsis button at the trailing
          end that opens them as a sheet underneath. Nothing is squeezed on the
          way &mdash; a readout narrowed to <code>19&hellip;</code> reports
          nothing, so the slots hold their width until they go away entirely. The
          width the row wanted is remembered, and is the only number that brings
          them back, so dragging the window edge across the threshold can&rsquo;t
          set the two states flickering.
        </p>
        <p className="doc-prose">
          The window controls are pointedly not part of this. They keep their
          platform side &mdash; left on macOS, right on Windows and Linux &mdash;
          and are the one thing that never collapses, because a window you
          can&rsquo;t close is worse than a readout you can&rsquo;t see. That puts
          the ellipsis at the end of the strip on macOS and just inboard of the
          cluster on Windows: at either end, the spot the platform already puts
          one. Below the threshold the title ellipsizes and a{' '}
          <code>children</code> strip crushes, since they are then the only parts
          left that can give.
        </p>
        <p className="doc-prose">
          This is also why there is no status bar on <code>AppShell</code>. A
          strip along the bottom of the window is the furthest point from the
          work, and it spent that distance repeating what these two slots say
          beside the title &mdash; where they also get the overflow behaviour for
          free.
        </p>
      </section>
    </>
  );
}
