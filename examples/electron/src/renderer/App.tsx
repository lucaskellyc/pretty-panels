import { useState } from 'react';
import {
  Gauge,
  GaugeRow,
  List,
  Panel,
  RadioGroup,
  Readout,
  Section,
  Slider,
  Tabs,
  TextButton,
  Toggle,
} from 'pretty-panels';
import { AppShell, TitleBar } from 'pretty-panels/window';
import { useNativeTheme, useWindowState } from 'pretty-panels/electron';

/**
 * A frameless Electron window whose entire chrome is pretty-panels.
 *
 * The desktop-specific part is small and all of it is in `Chrome` below: one
 * hook for the window's state, one `TitleBar` wired to it. Everything under the
 * bar is the ordinary component kit, used exactly as it is on the web.
 */
export function App() {
  // Unsaved work is the app's business, not the chrome's — the titlebar only
  // shows it. Here a slider move is "work", which is enough to see the dot in
  // the close button appear and give way to the glyph on hover.
  const [dirty, setDirty] = useState(false);

  return (
    <AppShell titleBar={<Chrome dirty={dirty} />}>
      <Workbench onEdit={() => setDirty(true)} />
    </AppShell>
  );
}

function Chrome({ dirty }: { dirty: boolean }) {
  // Live window state + the actions its buttons invoke. Outside Electron (say,
  // `npm run dev` in a browser tab) the bridge is absent and every one of these
  // is an inert default — the bar still renders.
  const win = useWindowState();

  return (
    <TitleBar
      title="Pretty Panels · Workbench"
      platform={win.platform}
      maximized={win.maximized}
      fullscreen={win.fullscreen}
      inactive={!win.focused}
      dirty={dirty}
      onMinimize={win.minimize}
      onMaximize={win.toggleMaximize}
      onClose={win.close}
      onTitleDoubleClick={win.titleDoubleClick}
      // What a status bar along the bottom used to carry, said up here instead —
      // beside the title rather than in the corner of the window furthest from
      // the work. Narrow the window and all four fold into the strip's ellipsis
      // sheet, which a bottom strip would have had no answer for.
      left={
        <>
          <Readout label="Host" value={win.available ? `Electron · ${win.platform}` : 'Browser'} />
          <Readout label="Window" value={win.maximized ? 'Maximized' : 'Windowed'} />
        </>
      }
      right={
        <>
          <Readout label="FPS" value="60" />
          <Readout label="Size" value="1920×1080" />
        </>
      }
    />
  );
}

const LAYERS = [
  { id: 'key', label: 'Key light', meta: '900W' },
  { id: 'fill', label: 'Fill', meta: '200W' },
  { id: 'rim', label: 'Rim', meta: '150W' },
  { id: 'bounce', label: 'Bounce', meta: 'card' },
  { id: 'practical', label: 'Practicals', meta: 'off', disabled: true },
];

/** The navigator, as an ordinary plate on the stage. The shell has no sidebar
 *  slot — a column beside the work is just panels you place there, and doing it
 *  yourself is what lets it be this one: draggable rows, its own width, folded
 *  away when you don't want it. */
function Rig() {
  const [order, setOrder] = useState(LAYERS);

  return (
    <Panel title="Lighting rig" width={240} collapsible>
      <List
        items={order}
        label="Lighting rig"
        reorderable
        onReorder={(from, to) => {
          setOrder((rows) => {
            const next = rows.slice();
            next.splice(to, 0, ...next.splice(from, 1));
            return next;
          });
        }}
      />
    </Panel>
  );
}

function Workbench({ onEdit }: { onEdit: () => void }) {
  const [tab, setTab] = useState('camera');
  const [focus, setFocus] = useState(42);
  const [aperture, setAperture] = useState(2.8);
  const [grid, setGrid] = useState(true);
  const [denoise, setDenoise] = useState(false);

  // The one place an app has to reach the main process for theming: the OS
  // preference is already followed on its own, but a Light/Dark/System control
  // has to set `nativeTheme.themeSource` to stick.
  const theme = useNativeTheme();
  const [source, setSource] = useState('system');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        alignItems: 'flex-start',
        padding: 'var(--space-4)',
        // The stage runs full-bleed under the floating capsules — that is what
        // gives the glass something to blur. Content that has to be read from
        // its first line starts below them, by the strip's own measurement.
        paddingTop: 'calc(var(--titlebar-h) + var(--space-3))',
      }}
    >
      <Rig />

      <Panel
        title={
          <Tabs
            items={[
              { id: 'camera', label: 'Camera' },
              { id: 'render', label: 'Render' },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
        width={340}
      >
        {tab === 'camera' ? (
          <>
            <Slider label="Focus" value={focus} min={0} max={100} step={1} onChange={(v) => { setFocus(v); onEdit(); }} />
            <Slider
              label="Aperture"
              value={aperture}
              min={1.4}
              max={22}
              step={0.1}
              onChange={(v) => { setAperture(v); onEdit(); }}
              format={(v) => `f/${v.toFixed(1)}`}
            />
            <Toggle checked={grid} onChange={setGrid} label="Grid" hint="Reference floor grid" />
          </>
        ) : (
          <>
            <Toggle checked={denoise} onChange={setDenoise} label="Denoise" hint="Post-process the result" />
            <Section title="Advanced" defaultOpen={false}>
              <Slider label="Samples" value={128} min={16} max={512} step={16} onChange={() => {}} />
            </Section>
          </>
        )}
      </Panel>

      <Panel title="Monitors" width={340}>
        <GaugeRow>
          <Gauge value={focus} label="Focus" />
          <Gauge value={aperture} min={1.4} max={22} label="F-stop" accent />
          <Gauge value={72} label="Temp" />
        </GaugeRow>
      </Panel>

      <Panel title="Appearance" width={340}>
        <RadioGroup
          label="Theme"
          hint={`Following: ${theme.colorScheme}`}
          value={source}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(next) => {
            setSource(next);
            // Reaches the main process, so it outlives this window.
            theme.setThemeSource(next as 'system' | 'light' | 'dark');
          }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
          <TextButton onClick={() => setSource('system')}>Reset</TextButton>
        </div>
      </Panel>
    </div>
  );
}

