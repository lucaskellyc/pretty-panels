import { useEffect, useState } from 'react';
import { Panel } from '../../src';

/** Below this the three plates and the timeline can't share the window. */
const MIN_WIDTH_PX = 720;
const QUERY = `(max-width: ${MIN_WIDTH_PX - 1}px)`;

/** True while the window is too narrow for the studio's layout. */
export function useTooNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

/**
 * What a phone sees in place of the studio: one plate saying why. The app
 * itself is not mounted, so nothing overflows behind it.
 */
export function NarrowScreen() {
  return (
    <main className="pt-narrow">
      <Panel width={320}>
        <p className="pt-narrow-copy">
          The studio needs a wider window — at least {MIN_WIDTH_PX}px — for its
          glyph sheet, inspector and timeline to fit side by side. Open it on a
          laptop or desktop, or turn a tablet sideways.
        </p>
      </Panel>
    </main>
  );
}
