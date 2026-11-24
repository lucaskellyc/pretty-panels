import { useEffect, useState } from 'react';
import { SplashScreen, type SplashAction } from '../../src';
import logoUrl from './assets/logo.jpg';

/** The saved document "Start with template" opens — glyphs, settings,
 *  timeline, canvas and preview, as Save wrote them. Fetched while the banner
 *  is up, so choosing the template is instant. */
function loadTemplate(): Promise<string> {
  return import('./template.pillotalk?raw').then((m) => m.default);
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
  /** Open the template, handed over as the document's text. */
  onTemplate: (text: string) => void;
  onScratch: () => void;
  /** Open a saved .pillotalk document. */
  onOpen: () => void;
}

/**
 * The studio's loading screen and landing page in one. It walks its boot
 * steps — the template document and the web fonts are the real waits — then,
 * rather than leaving, offers the ways in, and stays up until one is chosen.
 */
export function Splash({ open, canResume, onResume, onTemplate, onScratch, onOpen }: SplashProps) {
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState<string | null>(null);
  const ready = step >= BOOT_STEPS.length;

  useEffect(() => {
    if (ready) return;
    let alive = true;
    const t = setTimeout(async () => {
      if (step === 1) {
        const text = await loadTemplate().catch(() => null);
        if (alive) setTemplate(text);
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
      description: 'The Pillotalk glyphs with punctuation, plus a write-on animation.',
      onClick: () => template && onTemplate(template),
      disabled: !template,
    },
    { icon: ICONS.scratch, label: 'Start from scratch', description: 'An empty sheet with the default metrics.', onClick: onScratch },
    { icon: ICONS.open, label: 'Open document', description: 'A .pillotalk file saved here or in the desktop studio.', onClick: onOpen },
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
      actionStyle="capsule"
      centered
    />
  );
}

/** Wrapped so studio.css can lay the edge highlight over the image. */
const MARK = (
  <span className="pt-splash-mark">
    <img src={logoUrl} width={88} height={88} alt="" />
  </span>
);

/** The custom glyphs (~/Developer/assets/icons), on their 82-unit Figma
 *  frame, filled with the capsule's ink. */
const glyph = (...paths: (string | [string, 'evenodd'])[]) => (
  <svg viewBox="0 0 82 82" fill="currentColor">
    {paths.map((p, i) =>
      typeof p === 'string' ? <path key={i} d={p} /> : <path key={i} d={p[0]} fillRule="evenodd" clipRule="evenodd" />,
    )}
  </svg>
);
const ICONS = {
  // play.svg
  resume: glyph('M63.125 41L18.125 67L18.125 15L63.125 41Z'),
  // diamonds.svg: four diamonds, a sheet of glyphs
  template: glyph(
    'M55.108 61.5178L40.625 76L26.142 61.5178L40.625 47.0347L55.108 61.5178Z',
    'M34.5903 41L20.1072 55.483L5.625 41L20.1072 26.517L34.5903 41Z',
    'M75.625 41L61.1428 55.483L46.6597 41L61.1428 26.517L75.625 41Z',
    'M55.108 20.4822L40.625 34.9653L26.142 20.4822L40.625 6L55.108 20.4822Z',
  ),
  // A plain plus, drawn on the same frame at the set's weight: a blank sheet
  scratch: glyph('M35 13h12v22h22v12H47v22H35V47H13V35h22z'),
  // export.svg: open out of a box
  open: glyph(
    'M32.9221 24.7619H16.7272V63.948H56.1579V48.2918H64.2601V72H8.625V16.71H32.9221V24.7619Z',
    'M66.9978 41.1342L56.9354 31.1343L33.016 54.9064L26.9056 48.8339L50.825 25.0618L41.2965 15.5923L72.625 10L66.9978 41.1342Z',
  ),
};
