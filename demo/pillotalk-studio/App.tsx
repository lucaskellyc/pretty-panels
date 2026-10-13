import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exportOtf } from './font/export';
import { CHARSET, createProject, isDrawn, shiftGlyph, toLineCap, type FontProject, type GlyphData, type LineCap } from './font/model';
import { inkBounds } from './font/outline';
import { importSvgs } from './font/svgImport';
import { layoutSheet } from './font/sheet';
import { DOCK_W, Dock, DockPanel, type DockState } from './Dock';
import type { EditMessage, PreviewSettings } from './types';
import { Outliner } from './Outliner';
import { Stage } from './Stage';
import { useFitView } from './view';

const STORAGE_KEY = 'pillotalk-studio:project';
/** Whether the glyphs plate is rolled up, remembered with the project. */
const SIDEBAR_KEY = 'pillotalk-studio:sidebar-collapsed';
/** Which right-hand plates are rolled up. */
const DOCK_KEY = 'pillotalk-studio:dock-collapsed';

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
 * Pillotalk Studio's browser variant: a full-bleed specimen sheet with the
 * glyphs plate docked in its top-left corner, the inspector in its top-right
 * and the preview in its bottom-right. Every plate rolls up to its header.
 */
export function App() {
  const [project, setProject] = useState<FontProject>(loadProject);
  const [char, setChar] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewSettings>({ text: 'Pillotalk', size: 56 });
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

  // ---- dock ---------------------------------------------------------------

  const [dockCollapsed, setDockCollapsed] = useState<DockState>(() => {
    try {
      return { inspector: false, preview: false, ...JSON.parse(localStorage.getItem(DOCK_KEY) ?? '{}') };
    } catch {
      return { inspector: false, preview: false };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DOCK_KEY, JSON.stringify(dockCollapsed));
    } catch {
      /* ignore */
    }
  }, [dockCollapsed]);

  const sheet = useMemo(() => layoutSheet(project), [project]);
  const fitView = useFitView(sheet.width, sheet.height);
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
   *  one; the right one is the advance. */
  const setBearing = (c: string, side: 'lsb' | 'rsb', value: number) =>
    editGlyph(c, (g, p) => {
      const ink = inkBounds(g, p.strokeWeight);
      if (!ink) return g;
      if (side === 'rsb') return { ...g, advanceWidth: Math.max(1, Math.round(ink.xMax + value)) };
      const dx = value - ink.xMin;
      return { ...shiftGlyph(g, dx), advanceWidth: Math.max(1, Math.round(g.advanceWidth + dx)) };
    });

  const onEdit = (edit: EditMessage) => {
    if (edit.type === 'weight') setProject((p) => ({ ...p, strokeWeight: edit.value }));
    else if (edit.type === 'cap') setAllCaps(edit.cap);
    else if (edit.type === 'lsb' || edit.type === 'rsb') setBearing(edit.char, edit.type, edit.value);
    else if (edit.type === 'width')
      editGlyph(edit.char, (g) => ({ ...g, advanceWidth: Math.max(1, Math.round(edit.value)) }));
    else if (edit.type === 'offsetY') editGlyph(edit.char, (g) => ({ ...g, offsetY: edit.value || undefined }));
    else if (edit.type === 'preview') setPreview((p) => ({ ...p, ...edit.value }));
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

  const doExport = () => {
    if (drawnCount > 0) exportOtf(project);
  };

  /** Back to an empty project — every glyph and parameter. The preview's
   *  sample is the reader's, not the font's, so it stays. */
  const reset = () => {
    if (!window.confirm('Reset the font? Every imported glyph and setting will be cleared.')) return;
    setProject(createProject());
    setChar(null);
  };

  const pick = (c: string) => {
    setChar(c);
    frame(c);
  };

  return (
    <div className="pt-app">
      <Stage
        project={project}
        sheet={sheet}
        fitView={fitView}
        char={char}
        onSelectGlyph={setChar}
        onFrame={frame}
      />

      <div className="pt-dock is-left" style={{ width: SIDEBAR_W }}>
        <DockPanel
          className="pt-dock-slot is-scrolling"
          title="Glyphs"
          width={SIDEBAR_W}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        >
          <Outliner project={project} char={char} onPick={pick} />
        </DockPanel>
      </div>

      <Dock
        project={project}
        char={char}
        preview={preview}
        collapsed={dockCollapsed}
        onCollapsedChange={(name, c) => setDockCollapsed((d) => ({ ...d, [name]: c }))}
        onEdit={onEdit}
        onImport={() => fileRef.current?.click()}
        onExport={doExport}
        onReset={reset}
      />

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
