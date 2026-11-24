import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Platter } from '../../src';
import { exportOtf } from './font/export';
import { CHARSET, createProject, isDrawn, shiftGlyph, toLineCap, type FontProject, type GlyphData, type LineCap } from './font/model';
import { inkBounds } from './font/outline';
import { importSvgs, type ImportFile } from './font/svgImport';
import { layoutSheet } from './font/sheet';
import { CanvasControls, CanvasStage, useCanvasSettings, type CanvasSettings } from './Canvas';
import { DOCK_W, Dock, DockIcon, DockPanel } from './Dock';
import type { EditMessage, PreviewSettings } from './types';
import { DOCUMENT_EXTENSION, parseDocument, saveDocument } from './document';
import { exportGif } from './gif';
import { exportLottie } from './lottie';
import { Outliner } from './Outliner';
import { Splash } from './Splash';
import { Stage } from './Stage';
import { glyphProp, groupOf, resolveProject } from './timeline/channels';
import type { KeyContext } from './timeline/KeyGutter';
import {
  anim,
  bindProject,
  FPS,
  keyAtPlayhead,
  replaceAnim,
  seek,
  setDuration,
  setValue,
  setWork,
  toggle,
  toggleArmed,
  transport,
  unkeyAtPlayhead,
} from './timeline/state';
import { TimelineDock } from './timeline/Timeline';
import { useFitView } from './view';

const STORAGE_KEY = 'pillotalk-studio:project';
/** Which of the left plate's tabs is open: the glyph sheet or the canvas. */
const VIEW_KEY = 'pillotalk-studio:view';

type StudioView = 'glyphs' | 'canvas';
const VIEW_ITEMS = [
  { text: 'Glyphs', value: 'glyphs' },
  { text: 'Canvas', value: 'canvas' },
];

/** The glyphs plate's width, docked over the stage's left edge. */
const SIDEBAR_W = 264;
const GUTTER = 16;
/** A stage without room for both columns and this much sheet between them is
 *  compact: the plates take turns instead of sitting side by side. */
const MIN_ROOM = 320;
/** A stage narrower than this is a phone's: an open plate spans it, less the
 *  plates' inset (--space-3) each side. */
const PHONE_W = 600;
const PLATE_INSET = 12;
/** On a phone the plates and the timeline are drawn this much larger (CSS
 *  `zoom`, via --pt-zoom), for reading and for fingers. 1.15 is as far as a
 *  393px phone goes with the transport still on the timeline's bar. */
const PHONE_ZOOM = 1.15;

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
  /** The Open dialog's input, for a saved document. */
  const docRef = useRef<HTMLInputElement>(null);
  /** The desktop studio's preview sample: no preview here, but a document
   *  opened from there keeps it when saved again. */
  const preview = useRef<PreviewSettings>({ text: 'Pillotalk', size: 56 });
  // The splash is the landing page: up on every load until a way in is chosen.
  const [landing, setLanding] = useState(true);
  /** Whether the session being restored has anything worth continuing. */
  const [canResume] = useState(() => CHARSET.some((c) => isDrawn(project.glyphs[c])));
  // Every plate opens rolled up, leaving the stage clear until one is wanted.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

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
  // Tracking was a canvas setting before it became a keyable font channel:
  // carry a remembered value over to the project once.
  useEffect(() => {
    const legacy = (canvas as { tracking?: number }).tracking;
    if (legacy === undefined) return;
    if (legacy) setProject((p) => ({ ...p, tracking: p.tracking ?? legacy }));
    setCanvas({ tracking: undefined } as Partial<CanvasSettings>);
  }, []);
  /** How far a GIF export has got, while one renders. */
  const [gifProgress, setGifProgress] = useState<number | null>(null);
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

  const [dockCollapsed, setDockCollapsed] = useState(true);
  /** Compact, the one plate open: the glyphs, the inspector, or neither. */
  const [compactOpen, setCompactOpen] = useState<'glyphs' | 'inspector' | null>(null);

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
  // Measured on the stage area, not the sheet's stage: that one is hidden,
  // and measures nothing, while the canvas is up.
  const stageAreaRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  useLayoutEffect(() => {
    const el = stageAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = stageWidth > 0 && stageWidth < SIDEBAR_W + DOCK_W + GUTTER * 4 + MIN_ROOM;
  const glyphsCollapsed = compact ? compactOpen !== 'glyphs' : sidebarCollapsed;
  const phone = compact && stageWidth < PHONE_W;
  // In the zoomed column's own pixels, which the zoom then scales back out to
  // the stage's width less the inset.
  const phoneW = (stageWidth - PLATE_INSET * 2 * PHONE_ZOOM) / PHONE_ZOOM;
  const columnClass = phone ? ' is-compact is-phone' : compact ? ' is-compact' : '';
  // The glyphs plate covers the stage's left edge and the inspector its
  // right: frame into the room between them. Compact, they are mostly rolled
  // up, so the sheet takes the whole width.
  const leftRoom = compact ? 0 : SIDEBAR_W + GUTTER;
  const dockRoom = compact ? 0 : DOCK_W + GUTTER;
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
    else if (edit.type === 'font') setValue(edit.field, edit.value);
    else if (edit.type === 'cap') setAllCaps(edit.cap);
    else if (edit.type === 'name') setProject((p) => ({ ...p, [edit.field]: edit.value }));
    else if (edit.type === 'lsb' || edit.type === 'rsb') setBearing(edit.char, edit.type, edit.value);
    else if (edit.type === 'width') setValue(glyphProp('width', edit.char), Math.max(1, Math.round(edit.value)));
    else if (edit.type === 'offsetY') setValue(glyphProp('offsetY', edit.char), edit.value);
    else if (edit.type === 'stretchAt')
      editGlyph(edit.char, (g) => ({ ...g, stretchAt: edit.value === null ? undefined : Math.round(edit.value) }));
    else if (edit.type === 'trim') setValue(glyphProp(edit.field, edit.char), edit.value);
    else if (edit.type === 'arm') toggleArmed(edit.prop);
    else if (edit.type === 'key') keyAtPlayhead(edit.prop);
    else if (edit.type === 'unkey') unkeyAtPlayhead(edit.prop);
  };

  /** Replaces the project whole — glyphs, parameters and keys — and leaves the
   *  landing page. The canvas's text and frame are the reader's, so they stay. */
  const startWith = (next: FontProject) => {
    setProject(next);
    anim.set({ doc: { ...anim.get().doc, tracks: {} }, muted: [], locked: [] });
    setChar(null);
    setLanding(false);
  };

  /** Each file replaces its glyph whole. The weight is taken from the files
   *  only while no glyph has stroke paths yet — after that it is yours.
   *  `fresh` lays them over an empty project instead, as a new start. */
  const applyImport = (read: ImportFile[], fresh: boolean) => {
    const base = fresh ? createProject() : project;
    const result = importSvgs(read, base);
    const merge = (p: FontProject): FontProject => {
      const hadStrokes = Object.values(p.glyphs).some((g) => g.strokes?.length);
      const glyphs = { ...p.glyphs };
      for (const g of result.glyphs) glyphs[g.char] = g;
      return {
        ...p,
        glyphs,
        strokeWeight: !hadStrokes && result.weight ? result.weight : p.strokeWeight,
      };
    };
    if (fresh) startWith(merge(base));
    else setProject(merge);
    // Only problems are worth a dialog.
    const problems = [
      ...result.errors,
      ...result.skipped.map((n) => `${n}: name isn't <letter>u.svg / <letter>l.svg / <digit>.svg`),
    ];
    if (problems.length) window.alert(`Imported ${result.glyphs.length} glyphs.\n\n${problems.join('\n')}`);
  };

  const importFiles = async (files: File[], fresh = false) => {
    const read = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
    applyImport(read, fresh);
  };

  /** The font at the playhead, as every view shows it. */
  const doExport = () => {
    if (drawnCount > 0) exportOtf(shown);
  };

  // ---- documents -------------------------------------------------------------

  /** Everything the studio keeps, written out as one document. */
  const doSave = () => {
    const { doc, muted, locked } = anim.get();
    saveDocument({
      project,
      anim: { tracks: doc.tracks, muted: [...muted], locked: [...locked], duration: doc.duration },
      canvas,
      preview: preview.current,
      work: transport.get().work,
    });
  };

  /** Replace the work with a saved document's — after asking, if there are
   *  drawn glyphs it would throw away — and leave the landing page. The
   *  playhead lands at the work area's start, or its end for `'end'`. */
  const openDocument = (text: string, at: 'start' | 'end' = 'start') => {
    let doc;
    try {
      doc = parseDocument(text);
    } catch (err) {
      window.alert((err as Error).message);
      return;
    }
    if (!landing && drawnCount > 0 && !window.confirm('Open this document? The font you have now will be replaced.'))
      return;
    setProject((projectRef.current = doc.project));
    replaceAnim(doc.anim);
    setCanvas(doc.canvas);
    preview.current = doc.preview;
    setWork(doc.work);
    seek(at === 'end' ? doc.work.out : doc.work.in);
    setChar(null);
    setLanding(false);
  };

  // ---- canvas exports ------------------------------------------------------

  /** The work area, as playback loops it. */
  const workRange = () => {
    const { work } = transport.get();
    return { fps: FPS, start: work.in, end: work.out };
  };

  const doExportLottie = () => exportLottie(resolveAt, canvas, workRange(), project);

  const doExportGif = () => {
    setGifProgress(0);
    exportGif(resolveAt, canvas, workRange(), project, { loop: canvas.gifLoop, onProgress: setGifProgress })
      .catch((e) => window.alert(`Couldn't export the GIF.\n\n${e instanceof Error ? e.message : e}`))
      .finally(() => setGifProgress(null));
  };


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
    startWith(createProject());
  };

  const pick = (c: string) => {
    setChar(c);
    frame(c);
  };

  return (
    <div className="pt-app" style={phone ? ({ '--pt-zoom': PHONE_ZOOM } as CSSProperties) : undefined}>
      <div ref={stageAreaRef} className="pt-stage-area">
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

        <div className={`pt-dock is-left${columnClass}`} style={{ width: phone ? phoneW : SIDEBAR_W }}>
          <DockPanel
            className="pt-dock-slot is-scrolling"
            reserve={0}
            sheet={phone}
            title={onCanvas ? 'Canvas' : 'Glyphs'}
            icon={<DockIcon name={onCanvas ? 'marquee' : 'pen'} />}
            width={phone ? phoneW : SIDEBAR_W}
            collapsed={glyphsCollapsed}
            onCollapsedChange={(c) => (compact ? setCompactOpen(c ? null : 'glyphs') : setSidebarCollapsed(c))}
          >
            {onCanvas ? (
              <CanvasControls
                settings={canvas}
                onChange={setCanvas}
                duration={animState.doc.duration}
                onDurationChange={setDuration}
                onExportLottie={drawnCount > 0 ? doExportLottie : undefined}
                onExportGif={drawnCount > 0 && gifProgress == null ? doExportGif : undefined}
                gifProgress={gifProgress}
                onExportVideo={drawnCount > 0 ? exportVideo : undefined}
                videoProgress={videoProgress}
              />
            ) : (
              <Outliner project={shown} char={char} onPick={pick} />
            )}
          </DockPanel>
        </div>

        {/* The view switcher, a plate of its own in the row the rolled-up
            circles sit in: centred between the two columns, or compact (when
            they open one at a time) on the stage. */}
        <div
          className="pt-views"
          style={compact ? undefined : ({ '--views-offset': `${(SIDEBAR_W - DOCK_W) / 2}px` } as CSSProperties)}
        >
          <Platter
            mode="single"
            label="View"
            items={VIEW_ITEMS}
            value={studioView}
            onChange={(v) => setStudioView(v as StudioView)}
          />
        </div>

        <Dock
          project={shown}
          keys={keys}
          char={char}
          columnClass={columnClass}
          reserve={0}
          sheet={phone}
          width={phone ? phoneW : DOCK_W}
          collapsed={compact ? compactOpen !== 'inspector' : dockCollapsed}
          onCollapsedChange={(c) => (compact ? setCompactOpen(c ? null : 'inspector') : setDockCollapsed(c))}
          onEdit={onEdit}
          onImport={() => fileRef.current?.click()}
          onExport={doExport}
          onOpen={() => docRef.current?.click()}
          onSave={doSave}
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
          // From the landing page an import is a new start; cancelling the
          // picker leaves the landing page up.
          if (files.length) importFiles(files, landing);
        }}
      />

      {/* Open… opens this; Save… writes one. */}
      <input
        ref={docRef}
        type="file"
        accept={`.${DOCUMENT_EXTENSION}`}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) openDocument(await file.text());
        }}
      />

      <Splash
        open={landing}
        canResume={canResume}
        onResume={() => setLanding(false)}
        onTemplate={(text) => openDocument(text, 'end')}
        onScratch={() => startWith(createProject())}
        onOpen={() => docRef.current?.click()}
      />
    </div>
  );
}
