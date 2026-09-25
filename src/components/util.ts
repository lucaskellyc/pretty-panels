// Internal helpers shared across the component set. Deliberately not exported
// from the package entries: these are implementation details, not API, and a
// consumer reaching for a `cx` should bring their own.

/**
 * Join class names, dropping anything falsy.
 *
 * Every component builds its class string the same way — a base name, some
 * `cond && 'is-state'` flags, and the caller's `className` last so it lands at
 * the end of the attribute. Writing that inline meant three different spellings
 * of the same thing across the set (an array with `.filter(Boolean).join(' ')`,
 * a ternary around a template literal, a template literal with an embedded
 * ternary), which is three things to get subtly wrong rather than one.
 *
 * `false` and `undefined` are accepted alongside `''` so a plain `cond &&
 * 'is-x'` works without a trailing `: ''`.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Clamp `v` into `[min, max]`. Either bound may be omitted, which is what lets
 * the one helper serve both callers: `Tree` and `List` always have concrete
 * bounds, while `Stepper` and `Vector` take `min`/`max` as optional props and
 * must leave an absent one unenforced rather than clamping to `undefined`.
 */
export function clamp(v: number, min?: number, max?: number): number {
  if (min != null) v = Math.max(min, v);
  if (max != null) v = Math.min(max, v);
  return v;
}

/**
 * How many decimal places `step` carries.
 *
 * Both numeric controls need it for the same reason: repeatedly adding a
 * fractional step accumulates float error — a `step` of 0.05 walks off into
 * 0.15000000000000002 within a few presses — so a stepped value is put back on
 * the step's own precision with `toFixed` after every move.
 */
export function decimalsOf(step: number): number {
  return (String(step).split('.')[1] || '').length;
}
