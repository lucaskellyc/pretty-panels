/** Timeline glyphs, inlined so the app ships no icon dep: the transport, loop and lock are custom (assets/icons), the rest lucide-style (24×24, round caps). */

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

/** The custom transport glyphs (assets/icons: play, pause, skip-end), filled.
 *  Skip-start is skip-end mirrored — there is no separate drawing for it. */
const fill = { fill: 'currentColor', 'aria-hidden': true } as const;
const SKIP = 'M63.6064 49.877V25.8525H79V74.7217H63.6064V50.1045L21 74.7031V25.2783L63.6064 49.877Z';

export const PlayIcon = ({ size = 16 }: IconProps) => (
  <svg {...fill} viewBox="0 0 82 82" width={size} height={size}>
    <path d="M63.125 41L18.125 67L18.125 15L63.125 41Z" />
  </svg>
);

export const PauseIcon = ({ size = 16 }: IconProps) => (
  <svg {...fill} viewBox="0 0 100 100" width={size} height={size}>
    <path d="M44.75 75H29V25H44.75V75Z" />
    <path d="M71 75H55.25V25H71V75Z" />
  </svg>
);

export const SkipStartIcon = ({ size = 15 }: IconProps) => (
  <svg {...fill} viewBox="0 0 100 100" width={size} height={size}>
    <path d={SKIP} transform="matrix(-1 0 0 1 100 0)" />
  </svg>
);

export const SkipEndIcon = ({ size = 15 }: IconProps) => (
  <svg {...fill} viewBox="0 0 100 100" width={size} height={size}>
    <path d={SKIP} />
  </svg>
);

/** The custom loop glyph (assets/icons/loop.svg), filled rather than stroked. */
export const LoopIcon = ({ size = 15 }: IconProps) => (
  <svg viewBox="0 0 82 82" width={size} height={size} fill="currentColor" aria-hidden>
    <path d="M57.3232 19.9336C67.2409 21.9938 74.752 30.7119 74.752 41.2334C74.7519 52.9834 65.3895 62.4801 53.7529 62.9717V72.2803L29.6162 58.7432L53.7529 45.2061V54.4561C60.7816 53.9759 66.2587 48.1977 66.2588 41.2334C66.2588 34.8926 61.7225 29.5331 55.5986 28.2607L54.8643 28.1084L56.5879 19.7812L57.3232 19.9336Z" />
    <path d="M50.7207 23.2568L26.584 36.7939V27.6348C19.9997 28.5296 14.9913 34.1065 14.9912 40.7666C14.9912 47.1175 19.5421 52.4838 25.6807 53.7451L26.415 53.8955L24.708 62.2266L23.9736 62.0752C14.0327 60.0327 6.49805 51.3046 6.49805 40.7666C6.4981 29.3255 15.3743 20.0183 26.584 19.083V9.71973L50.7207 23.2568Z" />
  </svg>
);

/** pretty-panels' `Section` chevron, drawn the same — sharp corners, 12×8 — so
 *  the dock's fold reads as the same control as the sections' folds. */
export const SectionChevronIcon = () => (
  <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden>
    <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const ChevronDownIcon = ({ size = 15 }: IconProps) => (
  <svg {...stroke} width={size} height={size}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/** The custom padlock (assets/icons: lock, unlock) — shut, or with the shackle sprung. */
export const LockIcon = ({ size = 11, open = false }: IconProps & { open?: boolean }) => (
  <svg {...fill} viewBox="0 0 100 100" width={size} height={size}>
    {open ? <path d="M50 14C59.7644 14 67.68 21.838 67.68 31.5067V36.0976H57.28V31.5067C57.28 27.5255 54.0206 24.2981 50 24.2981C45.9794 24.2981 42.72 27.5255 42.72 31.5067V42.7481H76V86H24V42.7481H32.32V31.5067C32.32 21.838 40.2356 14 50 14Z" /> : <path d="M50 14C59.7644 14 67.68 21.838 67.68 31.5067V42.7481H76V86H24V42.7481H32.32V31.5067C32.32 21.838 40.2356 14 50 14ZM50 24.2981C45.9794 24.2981 42.72 27.5255 42.72 31.5067V42.7481H57.28V31.5067C57.28 27.5255 54.0206 24.2981 50 24.2981Z" fillRule="evenodd" />}
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
