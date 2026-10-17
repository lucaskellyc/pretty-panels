/** lucide-style glyphs (24×24, round caps), inlined so the app ships no icon dep. */

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

type IconProps = { size?: number };

export const PlayIcon = ({ size = 16 }: IconProps) => (
  <svg {...stroke} width={size} height={size} fill="currentColor">
    <path d="M7 4.5v15l12-7.5z" />
  </svg>
);

export const PauseIcon = ({ size = 16 }: IconProps) => (
  <svg {...stroke} width={size} height={size} fill="currentColor" strokeWidth={1}>
    <rect x="6.5" y="5" width="4" height="14" rx="1" />
    <rect x="13.5" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const SkipStartIcon = ({ size = 15 }: IconProps) => (
  <svg {...stroke} width={size} height={size}>
    <path d="M19 5v14L8 12z" fill="currentColor" stroke="none" />
    <path d="M5 5v14" />
  </svg>
);

export const SkipEndIcon = ({ size = 15 }: IconProps) => (
  <svg {...stroke} width={size} height={size}>
    <path d="M5 5v14l11-7z" fill="currentColor" stroke="none" />
    <path d="M19 5v14" />
  </svg>
);

export const LoopIcon = ({ size = 15 }: IconProps) => (
  <svg {...stroke} width={size} height={size}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

export const ChevronDownIcon = ({ size = 15 }: IconProps) => (
  <svg {...stroke} width={size} height={size}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/** A padlock with a moving shackle — lucide's `lock` / `lock-open` as one glyph. */
export const LockIcon = ({ size = 11, open = false }: IconProps & { open?: boolean }) => (
  <svg {...stroke} width={size} height={size} strokeWidth={2.2}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    {open ? <path d="M8 11V7a4 4 0 0 1 7.5-2" /> : <path d="M8 11V7a4 4 0 0 1 8 0v4" />}
  </svg>
);

/** lucide `timer` — the stopwatch that arms a channel for keyframing. */
export const StopwatchIcon = ({ size = 13 }: IconProps) => (
  <svg {...stroke} width={size} height={size} strokeWidth={2.2}>
    <path d="M10 2h4" />
    <path d="M12 14l3-3" />
    <circle cx="12" cy="14" r="8" />
  </svg>
);
