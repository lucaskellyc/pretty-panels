import { useEffect, useState } from 'react';
import { SplashScreen, type SplashAction } from '../../src';
import type { ImportFile } from './font/svgImport';
import logoUrl from './assets/logo.jpg';

/** The Pillotalk glyphs "Start with template" opens: one SVG per character,
 *  named the way Import expects (`au.svg`, `al.svg`, `0.svg`…). Fetched while
 *  the banner is up, so choosing the template is instant. */
const TEMPLATE = import.meta.glob<string>('./template/*.svg', { query: '?raw', import: 'default' });

function loadTemplate(): Promise<ImportFile[]> {
  return Promise.all(
    Object.entries(TEMPLATE).map(async ([path, load]) => ({ name: path.slice(path.lastIndexOf('/') + 1), text: await load() })),
  );
}

/** What the studio is doing while the banner is up, how far along that is, and
 *  the wait behind it. */
const BOOT_STEPS: [string, number][] = [
  ['Restoring project…', 0.3],
  ['Loading template…', 0.65],
  ['Loading typefaces…', 1],
];

/** Long enough that each step reads as a beat rather than a flash. */
const STEP_MS = 450;

export interface SplashProps {
  open: boolean;
  /** The last session left drawn glyphs behind, so offer to pick them up. */
  canResume: boolean;
  onResume: () => void;
  onTemplate: (files: ImportFile[]) => void;
  onScratch: () => void;
  onImport: () => void;
}

/**
 * The studio's loading screen and landing page in one. It walks its boot
 * steps — the template's glyphs and the web fonts are the real waits — then,
 * rather than leaving, offers the ways in, and stays up until one is chosen.
 */
export function Splash({ open, canResume, onResume, onTemplate, onScratch, onImport }: SplashProps) {
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState<ImportFile[] | null>(null);
  const ready = step >= BOOT_STEPS.length;

  useEffect(() => {
    if (ready) return;
    let alive = true;
    const t = setTimeout(async () => {
      if (step === 1) {
        const files = await loadTemplate().catch(() => null);
        if (alive) setTemplate(files);
      }
      if (step === 2) await document.fonts.ready;
      if (alive) setStep(step + 1);
    }, STEP_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [ready, step]);

  const [status, progress] = BOOT_STEPS[Math.min(step, BOOT_STEPS.length - 1)];

  const actions: SplashAction[] = [
    ...(canResume
      ? [{ icon: ICONS.resume, label: 'Continue', description: 'Pick up the last session where you left it.', onClick: onResume }]
      : []),
    {
      icon: ICONS.template,
      label: 'Start with template',
      description: 'The Pillotalk glyphs, A–Z, a–z and 0–9, ready to tweak.',
      onClick: () => template && onTemplate(template),
      disabled: !template,
    },
    { icon: ICONS.scratch, label: 'Start from scratch', description: 'An empty sheet with the default metrics.', onClick: onScratch },
    { icon: ICONS.import, label: 'Import', description: 'Open SVG glyph files named like au.svg and al.svg.', onClick: onImport },
  ];

  return (
    <SplashScreen
      open={open}
      fullscreen
      logo={MARK}
      title="Pillotalk Studio"
      status={status}
      progress={progress}
      progressStyle="bar"
      actions={ready ? actions : undefined}
    />
  );
}

const MARK = <img src={logoUrl} width={48} height={48} alt="" style={{ borderRadius: 14 }} />;

/** lucide glyphs, matching the timeline's icons.tsx. */
const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  resume: icon('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5'),
  template: icon('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'),
  scratch: icon('M12 5v14M5 12h14'),
  import: icon('M12 3v12M7 10l5 5 5-5M5 21h14'),
};
