# Known issues

A running log of bugs and rough edges found in the codebase. File references are
`path:line`. Not committed to a release — clear items as they're fixed.

> Some entries (marked _WIP_) look like an in-progress refactor of the home page
> rather than long-standing bugs.

## Bugs

1. ✅ **Fixed (v0.1.0-alpha).** ~~Footer repo link points at the wrong org.~~ The
   footer now links to `https://github.com/lucaskellyc/pretty-panels` and the stale
   placeholder comment was removed.

2. ✅ **Fixed (v0.1.0-alpha).** ~~`npm run typecheck` fails.~~ Removed the unused
   `Toggle` import, the dead `CopyInstall` function, and the unused `setHighlight`
   setter; `tsc --noEmit` is clean. (Still worth adding a `typecheck` step to CI —
   nothing runs it automatically, so a future regression would again be silent.)

## Incomplete / dead code (_WIP_)

3. ✅ **Resolved (v0.1.0-alpha).** The install command *does* appear on the site —
   in the "Get started" section (`demo/App.tsx`, `<code>{INSTALL_CMD}</code>`). Only
   the hero copy-to-clipboard CTA (`CopyInstall`) was dead; it's been removed. If the
   fancy copy-button belongs back in the hero, re-add it and its `.hero-cta` CSS.

4. **Hero highlight rim is permanently on.** The unused `setHighlight` setter was
   removed, but the toggle control that used to drive it is still gone, so the mark's
   rim highlight is always on. `HeroPoster`'s doc comment (`demo/App.tsx`) still
   describes a "highlight toggle" — either restore the control or update the comment.

5. **Dead committed assets.** `demo/hero_bg.jpg` and `demo/hero_logo.svg` are not
   referenced anywhere (the hero uses inline SVG paths). They ship for nothing.

6. **Stray empty markup in the spec strip.** `demo/App.tsx:400-402` has blank
   spans / whitespace inside `.hero-specs`.

## Consistency / drift

7. **Hardcoded version strings.** The brand badge `v0.1` (`demo/App.tsx:152`) and
   hero spec `v0.1.0` (`demo/App.tsx:408`) are hardcoded, while `version` is
   imported from `package.json` and used in the Footer. These drift on the next
   version bump.

8. **`Section` has no controlled API.** `Panel` supports both controlled and
   uncontrolled collapse, but `Section` (`src/components/Section.tsx:11`) is
   uncontrolled-only. Inconsistent component API.

## Accessibility

9. **Slider range input has no accessible name.** The `.control-name` label
   (`src/components/Slider.tsx:62`) is a plain span, not associated with the
   `<input type="range">`, so screen readers announce an unlabeled slider.

10. **Vector number fields have no labels.** The `<input type="number">` fields
    (`src/components/Vector.tsx:71`) have no `aria-label`; announced as unlabeled.

11. **Section toggle not linked to its body.** `.collapse-head`
    (`src/components/Section.tsx:15`) has `aria-expanded` but no `aria-controls`
    pointing at the collapsible region.

## Edge cases / robustness

12. **Vector `colorMode` assumes 3 components.** With a 2-entry value plus
    `colorMode`, the blue channel is `undefined` → `rgb(r,g,undefined)` (invalid).
    Only safe for 3-entry rgb values (`src/components/Vector.tsx:62`).

13. **Vector field can't be cleared while typing.** `onChange` ignores non-numeric
    input (`src/components/Vector.tsx:83`), so you can't blank the field to retype;
    intermediate states like `-` or `1.` are rejected mid-entry.

14. **Panel collapsed-width can go stale.** The collapsed hug width is measured
    from the header, but the `ResizeObserver` only watches the body inner
    (`src/components/Panel.tsx:97`). If the title changes width without a window
    resize, `--panel-collapsed-w` won't update until the next resize.

## Notes

15. **`prepare` builds on every `npm install`.** Needed so `npm install github:...`
    produces `dist/`, but it also runs for contributors installing dev deps, making
    installs slower. Acceptable trade-off.
