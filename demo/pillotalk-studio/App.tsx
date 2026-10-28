import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs } from '../../src';
import { exportOtf } from './font/export';
import { CHARSET, createProject, isDrawn, shiftGlyph, toLineCap, type FontProject, type GlyphData, type LineCap } from './font/model';
import { inkBounds } from './font/outline';
import { importSvgs } from './font/svgImport';
import { layoutSheet } from './font/sheet';
import { CanvasControls, CanvasStage, useCanvasSettings } from './Canvas';
import { DOCK_W, Dock, DockPanel } from './Dock';
import type { EditMessage } from './types';
import { Outliner } from './Outliner';
import { Stage } from './Stage';
import { glyphProp, groupOf, resolveProject } from './timeline/channels';
import type { KeyContext } from './timeline/KeyGutter';
import { anim, bindProject, FPS, keyAtPlayhead, setValue, toggle, toggleArmed, transport, unkeyAtPlayhead } from './timeline/state';
import { TimelineDock } from './timeline/Timeline';
import { useFitView } from './view';

const STORAGE_KEY = 'pillotalk-studio:project';
/** Whether the glyphs plate is rolled up, remembered with the project. */
const SIDEBAR_KEY = 'pillotalk-studio:sidebar-collapsed';
/** Whether the inspector plate is rolled up. */
const DOCK_KEY = 'pillotalk-studio:dock-collapsed';
/** Which of the left plate's tabs is open: the glyph sheet or the canvas. */
const VIEW_KEY = 'pillotalk-studio:view';

type StudioView = 'glyphs' | 'canvas';
const VIEW_TABS = [
  { id: 'glyphs', label: 'Glyphs' },
  { id: 'canvas', label: 'Canvas' },
];

/** The glyphs plate's width, docked over the stage's left edge. */
const SIDEBAR_W = 264;
const GUTTER = 16;

/** The last session's project, if local storage kept it. */
function loadProject(): FontProject {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p: FontProject = { ...createProject(), ...JSON.parse(saved) };
      // Older saves may hold caps the editor no longer offers.
      for (const g of Object.values(p.glyphs)) if (g.cap) g.cap = toLineCap(g.cap);
      return p;
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return createProject();
}

/**
 * Pillotalk Studio's browser variant: a full-bleed stage — the specimen sheet,
 * or the canvas — with the glyphs plate docked in its top-left corner and the
 * inspector in its top-right, over the timeline dock. Every plate rolls up to
 * its header, and the timeline folds down to its transport bar.
 */
export function App() {
  const [project, setProject] = useState<FontProject>(loadProject);
  const [char, setChar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  // The left plate's tabs: the glyph sheet, or the canvas — each brings its
  // own stage with it.
  const [studioView, setStudioView] = useState<StudioView>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'canvas' ? 'canvas' : 'glyphs';
    } catch {
      return 'glyphs';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, studioView);
    } catch {
      /* ignore */
    }
  }, [studioView]);
  const [canvas, setCanvas] = useCanvasSettings();
  const onCanvas = studioView === 'canvas';

  // Space plays and pauses the canvas — the one shortcut the page takes, and
  // only on the tab built for watching. Typing a space in a field is left be.
  useEffect(() => {
    if (!onCanvas) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      if (!e.repeat) toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCanvas]);

  // ---- dock ---------------------------------------------------------------

  const [dockCollapsed, setDockCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem(DOCK_KEY) ?? '{}').inspector === true;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DOCK_KEY, JSON.stringify({ inspector: dockCollapsed }));
    } catch {
      /* ignore */
    }
  }, [dockCollapsed]);

  // ---- timeline ------------------------------------------------------------

  // The project is the timeline's base values: a static channel's edits land
  // in it, and a disarmed or emptied track freezes its last value into it.
  const projectRef = useRef(project);
  projectRef.current = project;
  useEffect(
    () =>
      bindProject({
        get: () => projectRef.current,
        update: (fn) => setProject((p) => (projectRef.current = fn(p))),
      }),
    [],
  );

  const animState = anim.use();
  // The canvas's write-on is animation without keys.
  const animated = Object.keys(animState.doc.tracks).length > 0 || canvas.writeOn;
  // Only an animated project follows the playhead; a static one doesn't
  // re-render as it moves.
  const time = transport.useSelect((s) => (animated ? s.time : 0));
  /** The project at the playhead: what every view draws and Export writes. */
  const shown = useMemo(
    () => resolveProject(project, { tracks: animState.doc.tracks, muted: animState.muted }, time),
    [project, animState, time],
  );

  /** The project at any time, for the canvas's staggered repeats. */
  const resolveAt = useCallback(
    (t: number) => resolveProject(project, { tracks: animState.doc.tracks, muted: animState.muted }, t),
    [project, animState],
  );

  const keys: KeyContext = {
    tracks: animState.doc.tracks,
    locked: animState.locked,
    fps: FPS,
    time,
    onArm: toggleArmed,
    onKey: keyAtPlayhead,
    onUnkey: unkeyAtPlayhead,
  };

  // The sheet is laid out at the playhead, so an animated width moves its
  // neighbours; it is fitted by the static one, so playback doesn't zoom.
  const sheet = useMemo(() => layoutSheet(shown), [shown]);
  const baseSheet = useMemo(() => layoutSheet(project), [project]);
  const fitView = useFitView(baseSheet.width, baseSheet.height);
  const drawnCount = CHARSET.filter((c) => isDrawn(project.glyphs[c])).length;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      /* ignore */
    }
  }, [project]);

  // ---- view ---------------------------------------------------------------

  const { box, fit, setView } = fitView;
  // The glyphs plate covers the stage's left edge and the inspector its
  // right: frame into the room between them.
  const leftRoom = SIDEBAR_W + GUTTER;
  const dockRoom = DOCK_W + GUTTER;
  const gapOffset = (leftRoom - dockRoom) / 2;
  const roomWidth = box.width - GUTTER * 2 - leftRoom - dockRoom;

  /** The sheet read like a page: its width across the gap, its top at the
   *  stage's, scrolled from there. */
  const home = useCallback(() => {
    if (!box.width || !fit) return;
    const s = Math.max(roomWidth, 200) / sheet.width;
    setView({ zoom: s / fit, x: gapOffset, y: GUTTER - box.height / 2 + (sheet.height / 2) * s });
  }, [box, fit, roomWidth, sheet.width, sheet.height, gapOffset, setView]);

  const homed = useRef(false);
  useEffect(() => {
    if (!homed.current && box.width > 0) {
      homed.current = true;
      home();
    }
  }, [box.width, home]);

  /** Fill the gap with one artboard. */
  const frame = useCallback(
    (c: string) => {
      const a = sheet.artboards.find((b) => b.char === c);
      if (!a || !box.width || !fit) return;
      const s = Math.min((roomWidth * 0.7) / a.width, (box.height * 0.7) / a.height);
      const cx = a.x + a.width / 2 - sheet.width / 2;
      const cy = a.y + a.height / 2 - sheet.height / 2;
      setView({ zoom: s / fit, x: gapOffset - cx * s, y: -cy * s });
    },
    [sheet, box, fit, roomWidth, gapOffset, setView],
  );

  // ---- edits --------------------------------------------------------------

  /** Rewrite one glyph, given the project it sits in (for the weight). */
  const editGlyph = (c: string, fn: (g: GlyphData, p: FontProject) => GlyphData) =>
    setProject((p) => {
      const g = p.glyphs[c];
      return g ? { ...p, glyphs: { ...p.glyphs, [c]: fn(g, p) } } : p;
    });

  /** Caps are per glyph in the model (imports bring their own); this sets
   *  every glyph's at once. */
  const setAllCaps = (cap: LineCap) =>
    setProject((p) => ({
      ...p,
      glyphs: Object.fromEntries(Object.entries(p.glyphs).map(([c, g]) => [c, { ...g, cap }])),
    }));

  /** Side bearings are measured from the ink, so they only mean something for
   *  a drawn glyph. Moving the left one carries the ink and keeps the right
   *  one; the right one is the advance. Both are read at the playhead, and
   *  the advance goes through the timeline — keyed there if it is animated. */
  const setBearing = (c: string, side: 'lsb' | 'rsb', value: number) => {
    const g = shown.glyphs[c];
    const ink = g && inkBounds(g, shown.strokeWeight);
    const width = glyphProp('width', c);
    if (!g || !ink || animState.locked.includes(groupOf(width))) return;
    if (side === 'rsb') return setValue(width, Math.max(1, Math.round(ink.xMax + value)));
    const dx = value - ink.xMin;
    editGlyph(c, (glyph) => shiftGlyph(glyph, dx));
    setValue(width, Math.max(1, Math.round(g.advanceWidth + dx)));
  };

  /** The keyable values go through the timeline, which writes the project
   *  itself while a value is static and keys it at the playhead once armed. */
  const onEdit = (edit: EditMessage) => {
    if (edit.type === 'weight') setValue('weight', edit.value);
    else if (edit.type === 'cap') setAllCaps(edit.cap);
    else if (edit.type === 'lsb' || edit.type === 'rsb') setBearing(edit.char, edit.type, edit.value);
    else if (edit.type === 'width') setValue(glyphProp('width', edit.char), Math.max(1, Math.round(edit.value)));
    else if (edit.type === 'offsetY') setValue(glyphProp('offsetY', edit.char), edit.value);
    else if (edit.type === 'trim') setValue(glyphProp(edit.field, edit.char), edit.value);
    else if (edit.type === 'arm') toggleArmed(edit.prop);
    else if (edit.type === 'key') keyAtPlayhead(edit.prop);
    else if (edit.type === 'unkey') unkeyAtPlayhead(edit.prop);
  };

  /** Each file replaces its glyph whole. The weight is taken from the files
   *  only while no glyph has stroke paths yet — after that it is yours. */
  const importFiles = async (files: File[]) => {
    const read = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
    const result = importSvgs(read, project);
    setProject((p) => {
      const hadStrokes = Object.values(p.glyphs).some((g) => g.strokes?.length);
      const glyphs = { ...p.glyphs };
      for (const g of result.glyphs) glyphs[g.char] = g;
      return {
        ...p,
        glyphs,
        strokeWeight: !hadStrokes && result.weight ? result.weight : p.strokeWeight,
      };
    });
    // Only problems are worth a dialog.
    const problems = [
      ...result.errors,
      ...result.skipped.map((n) => `${n}: name isn't <letter>u.svg / <letter>l.svg`),
    ];
    if (problems.length) window.alert(`Imported ${result.glyphs.length} glyphs.\n\n${problems.join('\n')}`);
  };

  /** The font at the playhead, as every view shows it. */
  const doExport = () => {
    if (drawnCount > 0) exportOtf(shown);
  };

  // ---- video ---------------------------------------------------------------

  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  /** The canvas over the work area, written to an .mp4 named for the font. */
  const exportVideo = async () => {
    if (videoProgress !== null) return;
    setVideoProgress(0);
    const name = `${project.familyName || 'Untitled'} ${project.styleName}`.trim().replace(/[^A-Za-z0-9]+/g, '-');
    try {
      // The encoder and muxer load on first use, not with the page.
      const { exportMp4 } = await import('./videoExport');
      await exportMp4({
        resolveAt,
        settings: canvas,
        fps: FPS,
        work: transport.get().work,
        fileName: `${name || 'Untitled'}.mp4`,
        onProgress: setVideoProgress,
      });
    } catch (e) {
      window.alert(`Couldn't export the video.\n\n${e instanceof Error ? e.message : e}`);
    } finally {
      setVideoProgress(null);
    }
  };

  /** Back to an empty project — every glyph, parameter and key. The canvas's
   *  text and frame are the reader's, not the font's, so they stay. */
  const reset = () => {
    if (!window.confirm('Reset the font? Every imported glyph, setting and keyframe will be cleared.')) return;
    setProject(createProject());
    anim.set({ doc: { ...anim.get().doc, tracks: {} }, muted: [], locked: [] });
    setChar(null);
  };

  const pick = (c: string) => {
    setChar(c);
    frame(c);
  };

  return (
    <div className="pt-app">
      <div className="pt-stage-area">
        {/* Both stay mounted, the other one hidden: each keeps its own pan
            and zoom across a switch, and is measured when it reappears. */}
        <div hidden={onCanvas}>
          <Stage
            project={shown}
            sheet={sheet}
            fitView={fitView}
            char={char}
            onSelectGlyph={setChar}
            onFrame={frame}
          />
        </div>
        <div hidden={!onCanvas}>
          <CanvasStage
            project={shown}
            resolveAt={resolveAt}
            time={time}
            settings={canvas}
            char={char}
            onSelectGlyph={setChar}
          />
        </div>

        <div className="pt-dock is-left" style={{ width: SIDEBAR_W }}>
          <DockPanel
            className="pt-dock-slot is-scrolling"
            /* Open, the tabs are the header — the strip and the roll-up share
               one row. Rolled up, the plate hugs a plain title instead: a tab
               strip has no width of its own to draw in to. */
            title={
              sidebarCollapsed ? (
                onCanvas ? 'Canvas' : 'Glyphs'
              ) : (
                <Tabs
                  items={VIEW_TABS}
                  value={studioView}
                  onChange={(id) => setStudioView(id as StudioView)}
                  label="Sidebar"
                />
              )
            }
            width={SIDEBAR_W}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          >
            {onCanvas ? (
              <CanvasControls
                settings={canvas}
                onChange={setCanvas}
                exportProgress={videoProgress}
                onExportVideo={exportVideo}
              />
            ) : (
              <Outliner project={shown} char={char} onPick={pick} />
            )}
          </DockPanel>
        </div>

        <Dock
          project={shown}
          keys={keys}
          char={char}
          collapsed={dockCollapsed}
          onCollapsedChange={setDockCollapsed}
          onEdit={onEdit}
          onImport={() => fileRef.current?.click()}
          onExport={doExport}
          onReset={reset}
        />
      </div>

      <TimelineDock selected={char} />

      {/* Import SVGs… opens this. */}
      <input
        ref={fileRef}
        type="file"
        accept=".svg,image/svg+xml"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) importFiles(files);
        }}
      />
    </div>
  );
}
