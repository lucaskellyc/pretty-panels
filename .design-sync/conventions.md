# Building with pretty-panels

A control-panel UI kit: grey plates, capsule tracks, collapsible sections. Sixteen
components, one stylesheet, no runtime theme object.

## Setup — there is no provider

Do **not** wrap anything in a provider. pretty-panels has no `ThemeProvider`, no
context, no init call; the sixteen exports are the entire API. Everything is driven
by CSS custom properties declared on `:root` by `styles.css`. Link that stylesheet
once and every component is styled.

Dark mode is automatic: `styles.css` follows `prefers-color-scheme` by moving a
single number (`--mono-l`, the plate lightness). Don't add your own dark rules.

## Theming — three knobs, then the `--ctl-*` ramp

The whole palette derives from three knobs on `:root`:

    --mono-h   hue         (default 212)
    --mono-s   saturation  (default 24%)
    --mono-l   plate lightness, unitless 0–100 (87 light / 5 dark)

Every surface is that plate lightness minus a fixed offset, so setting `--mono-l`
alone re-polarises the entire ramp (text, recesses and knobs all flip together via
the derived `--mono-sgn`). Re-run the ramp on a subtree by putting **`data-mono`**
on an element — the `--ctl-*` block re-declares there. Plain `--ctl-*` overrides
inherit normally and need no marker.

Resolved surface tokens, for your own markup:

    plates      --ctl-panel  --ctl-bar  --ctl-section  --ctl-edge
    text        --ctl-text  --ctl-hint  --ctl-on-track
    capsules    --ctl-track  --ctl-track-hover  --ctl-deep-hover
    buttons     --ctl-btn  --ctl-btn-hover   (a standalone button at rest)
    accent      --ctl-accent  --ctl-accent-hover
    tabs        --ctl-tab  --ctl-tab-hover  --ctl-tab-active  --ctl-tab-active-text
    switches    --ctl-switch-off  --ctl-knob-off  --ctl-knob-on
    gauges      --ctl-gauge-track  --ctl-gauge-fill
    focus       --focus-ring   (the whole ring, ready to drop in box-shadow)

To re-accent one cluster, re-point `--ctl-accent` in a scope — never restyle a
component's internals.

## The styling idiom — tokens, not classes

**There are no utility classes.** Class names in the compiled CSS (`.panel`,
`.slider-row`, `.pp-platter`, `.arc-gauge`, …) are component internals — never
write them yourself and never target them. Compose the components, and style your
own layout glue with `var(--*)`:

    spacing     --space-px --space-0 --space-1 --space-2 --space-3 --space-4
                --space-5 --space-6 --space-8 --space-10 --space-12
    radii       --radius-0 --radius-sm --radius-md --radius-lg --radius-pill
    heights     --control-sm (26px)  --control-md (32px)
    type        --type-h1 --type-h2 --type-h3 --type-label --type-ui
                --type-code --type-body   (complete font shorthands)
    families    --font-sans --font-mono --font-ui --font-body --font-code
    sizes       --text-2xs --text-xs --text-sm --text-base --text-md
                --text-lg --text-xl --text-2xl --text-3xl
    weights     --fw-regular --fw-medium --fw-bold
    motion      --dur-fast --dur-base --dur-slow  --ease-out

Numbers belong in `--font-mono` (the kit sets `font-variant-numeric: tabular-nums`
on its own readouts — match that in yours so columns line up).

`Panel` takes a `width` prop and publishes it as `--panel-w`; a stylesheet can beat
an inline width by setting that property instead.

## Composition rules

- `Panel` is the surface everything else sits on. `Section` nests **inside** a
  Panel; several Sections stack into an inspector column.
- `Toolbar` lays `Platter`s and `Readout`s out in a row and **paints nothing** —
  no ground, no edge, no shadow. Because it carries no surface it sits anywhere,
  on the stage or inside a Panel, without stacking a plate on an identical
  plate; what it does not do is supply a ground, so its contents recess against
  whatever is behind *it*. It fills the width it is given, which is what `end`
  pins its status against; give it a width of your own if it should hug.
- Hand a `Tabs` element to a Panel's `title` and the strip becomes the plate's
  flush header. Tabs renders only the strip — switching bodies on `value` is yours.
- `Gauge` goes inside a `GaugeRow` so captions hang from a common top edge.
- Icons passed as `icon` / `children` must carry their **own** `width` and
  `height`. The kit places the node and does not size it, so an unsized `<svg>`
  renders at 300 × 150.
- Every control is **fully controlled** — pass `value`/`checked` plus the handler.
- `IconButton`, `TextButton` and `Platter` each come in **two modes**, named the
  same way, and the mode decides which props they accept. `mode="standard"` is
  the default everywhere. Reach for a mode by what the control *is*, not by how
  you want it to look:
  - buttons — `standard` is an action (`onClick`; `active` merely accents the
    primary one, the `Apply` beside a `Cancel`). `mode="toggle"` makes `active` a
    **state**, reported through `onChange`, with `aria-pressed` to match.
  - `Platter` — `standard` holds independent buttons, each with its own
    `onClick` and `active`, any number lit at once. `mode="select"` is one choice
    across the tray: `value` + `onChange` over real radios, exactly one lit.
- Buttons paint **three tiers**, and the props pick between them, never CSS:
  quiet by default (`--ctl-btn`, dark ink on a light plate), the capsule track
  when a `standard` action is `active` (prominent), and the accent when a toggle
  is on. Most buttons should stay quiet — that is what makes one accented button
  in a row mean "press this one". A `Platter` uses the quiet ground and the
  accent but never the track: its segments are peers, with no primary among them.

## Where the truth lives

Read `styles.css` and its `@import` closure for the real token values, and each
component's `<Name>.prompt.md` + `<Name>.d.ts` for its exact props. Those beat this
summary.

## An idiomatic build

    <Panel title="Camera" width={320}>
      <Slider label="focus" value={focus} min={0} max={100} step={1}
              onChange={setFocus} />
      <Slider label="gain" value={gain} min={0} max={1} step={0.01}
              onChange={setGain} format={(v) => `${Math.round(v * 100)}%`} />
      <Section title="Advanced" defaultOpen={false}>
        <Toggle checked={denoise} onChange={setDenoise}
                label="Denoise" hint="Post-process the result" />
      </Section>
      <div style={{ display: 'flex', gap: 'var(--space-3)',
                    padding: 'var(--space-2) 0' }}>
        <TextButton onClick={reset}>Reset</TextButton>
        <TextButton active onClick={apply}>Apply</TextButton>
      </div>
    </Panel>

The controls are library components; the row that holds the buttons is your own
markup, spaced with the kit's tokens. That is the whole idiom.
