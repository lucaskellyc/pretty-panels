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
   setter; `tsc --noEmit` is clean. `.github/workflows/ci.yml` now runs `typecheck`
   + build on every push and PR, so a regression won't be silent.

## Incomplete / dead code (_WIP_)

3. ✅ **Resolved (v0.1.0-alpha).** The install command *does* appear on the site —
   in the "Get started" section (`demo/App.tsx`, `<code>{INSTALL_CMD}</code>`). Only
   the hero copy-to-clipboard CTA (`CopyInstall`) was dead; it's been removed. If the
   fancy copy-button belongs back in the hero, re-add it and its `.hero-cta` CSS.

4. ✅ **Fixed (v0.1.0-alpha).** ~~Hero highlight rim is permanently on.~~ Restored
   the `Highlight` toggle in the hero Inspector (it drives `setHighlight` again) and
   corrected the stale doc comment.

5. ✅ **Resolved (v0.2.0-alpha).** ~~Dead committed assets.~~ `demo/hero_bg.jpg`
   is gone and `demo/logo.svg` now has a use — it's the README banner.

6. ✅ **Resolved (v0.2.0-alpha).** ~~Stray empty markup in the spec strip.~~ The
   `.hero-specs` markup carries a component count and the version, both real.

## Consistency / drift

7. ✅ **Fixed (v0.1.0-alpha).** ~~Hardcoded version strings.~~ The brand badge and
   hero spec strip now read `version` from `package.json`, matching the Footer.

8. **`Section` has no controlled API.** `Panel` supports both controlled and
   uncontrolled collapse, but `Section` (`src/components/Section.tsx:11`) is
   uncontrolled-only. Inconsistent component API.

## Accessibility

9. ✅ **Fixed (unreleased).** ~~Slider range input has no accessible name.~~ The
   range input is now `aria-labelledby` its visible `.control-name`, so it is
   announced as "Focus, slider". With `format`, the formatted readout goes out as
   `aria-valuetext` ("60%" rather than "0.6"); Chrome ignores `aria-valuetext` on
   a native range and still reads the raw number.

10. ✅ **Fixed (unreleased).** ~~Vector number fields have no labels.~~ Each field
    is named X / Y / Z / W (R / G / B / A in `colorMode`), overridable with
    `fieldLabels`, and the capsule is a `role="group"` named by the new `label`
    prop.

11. ✅ **Fixed (unreleased).** ~~Section toggle not linked to its body.~~
    `.collapse-head` now carries `aria-controls` pointing at the collapsible
    region's id.

## Edge cases / robustness

12. ✅ **Fixed (unreleased).** ~~Vector `colorMode` assumes 3 components.~~ The
    colour is built from exactly the first three entries, and a missing one reads
    as 0, so a 2-field value paints `rgb(r,g,0)` instead of nothing.

13. ✅ **Fixed (unreleased).** ~~Vector field can't be cleared while typing.~~ The
    fields are text inputs that hold their in-progress text while focused, so an
    empty field, `-` or `1.` survive to the next keystroke; Enter or blur clamps
    and commits.

14. ✅ **Resolved (v0.2.0-alpha).** ~~Panel collapsed-width can go stale.~~ The
    collapsed hug width was dropped along with `--panel-collapsed-w`; the plate
    now keeps its full width while collapsed, so there is nothing to re-measure.

## Notes

15. **`prepare` builds on every `npm install`.** Needed so `npm install github:...`
    produces `dist/`, but it also runs for contributors installing dev deps, making
    installs slower. Acceptable trade-off.
