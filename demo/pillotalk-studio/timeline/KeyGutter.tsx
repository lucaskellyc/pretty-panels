import type { ReactNode } from 'react';
import type { Keyframe } from './anim';
import { groupOf, type AnimProp, type GroupId } from './channels';
import { frameAt, timecode } from './timecode';

/** What a keyable row needs to know about the timeline, wherever it is drawn. */
export interface KeyContext {
  tracks: Partial<Record<AnimProp, Keyframe[]>>;
  locked: readonly GroupId[];
  fps: number;
  time: number;
  onArm: (prop: AnimProp) => void;
  onKey: (prop: AnimProp) => void;
  onUnkey: (prop: AnimProp) => void;
}

/**
 * A channel's keyframe gutter, after open-action's (itself motion-studio's
 * inspector): a circle that decides whether the setting is animated at all
 * and, once it is, a diamond for the frame under the playhead — filled when a
 * key sits on it (click to remove), hollow when one could go there (click to
 * add). The diamond is drawn as the timeline draws a key, so it reads as one
 * idiom across both, and stays (inert) on a static setting so arming doesn't
 * shift the row.
 */
function KeyGutter({ prop, ctx }: { prop: AnimProp; ctx: KeyContext }) {
  const keys = ctx.tracks[prop];
  const armed = !!keys;
  const locked = ctx.locked.includes(groupOf(prop));
  const frame = frameAt(ctx.time, ctx.fps);
  const keyed = !!keys?.some((k) => frameAt(k.t, ctx.fps) === frame);
  const stamp = timecode(ctx.time, ctx.fps);
  return (
    <div className="insp-keys">
      <button
        className="insp-arm"
        aria-pressed={armed}
        disabled={locked}
        title={locked ? 'Locked in the timeline' : armed ? 'Stop animating (keeps the current value)' : 'Animate this setting'}
        onClick={() => ctx.onArm(prop)}
      />
      <button
        className="insp-diamond"
        aria-pressed={keyed}
        disabled={!armed || locked}
        title={!armed ? 'Animate this setting to place keyframes' : keyed ? `Remove keyframe at ${stamp}` : `Add keyframe at ${stamp}`}
        onClick={() => (keyed ? ctx.onUnkey(prop) : ctx.onKey(prop))}
      />
    </div>
  );
}

/** One keyable control: its gutter beside it. Without a context (nothing to
 *  key against yet) the control stands alone. */
export function KeyRow({ prop, ctx, children }: { prop: AnimProp; ctx?: KeyContext; children: ReactNode }) {
  if (!ctx) return <>{children}</>;
  const locked = ctx.locked.includes(groupOf(prop));
  return (
    <div className={`insp-prop${locked ? ' is-locked' : ''}`}>
      <KeyGutter prop={prop} ctx={ctx} />
      <div className="insp-ctl">{children}</div>
    </div>
  );
}
