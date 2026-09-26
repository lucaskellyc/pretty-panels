/* The docs catalog: the taxonomy, the page registry, and the grouping helper.

   Split out of `pages.tsx` on purpose. vite-plugin-react can only Fast Refresh a
   module whose runtime exports are *all* components; mixing this data in with
   the example components made `pages.tsx` unrefreshable, so every edit to it
   invalidated and fast-refreshed `App.tsx` instead. That preserves component
   state and does not re-run mount-time effects, which left `useHashSlug`'s
   `hashchange` listener closed over whichever `sidebarOrder` existed when the
   tab first loaded — so a page added mid-session read as index -1 and navigated
   with the home transition. Data here, components there, and the module that
   holds the examples can refresh in place. */

import type { FC } from 'react';
import {
  AppShellExample,
  GaugeExample,
  GaugeRowExample,
  IconButtonExample,
  ListExample,
  MenuExample,
  MenuGuide,
  PlatterExample,
  PopoverExample,
  PopoverGuide,
  RadioGroupExample,
  ReadoutExample,
  SectionExample,
  SelectExample,
  SliderExample,
  StepperExample,
  TableExample,
  TabsExample,
  TextButtonExample,
  TextFieldExample,
  TitleBarExample,
  TitleBarGuide,
  ToggleExample,
  ToolbarExample,
  TreeExample,
  VectorExample,
  WindowControlsExample,
} from './pages';

/** Atomic level a component sits at — drives the sidebar grouping. */
export type Group = 'atoms' | 'molecules' | 'organisms';

/** Sub-heading within a tier. Every part files by what it actually does rather
 *  than sitting in one long list under its tier — the catalog and the sidebar
 *  both label by family alone, so a tier with no families would print a
 *  captionless bucket next to the named ones. Alphabetical, like the components
 *  inside them; a family belongs to exactly one tier, so no two cells collide.
 *  This order is what numbers the part codes (A1 / M2 / O1) down each tier. */
export const FAMILIES = [
  'Buttons',
  'Choices',
  'Groups',
  'Layout',
  'Monitors',
  'Structures',
  'Surfaces',
  'Values',
  'Window',
] as const;
export type Family = (typeof FAMILIES)[number];

/** One row of a component's props table. */
export interface PropRow {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  description: string;
}

/** A single documentation page: one component, one route. */
export interface DocPage {
  slug: string;
  name: string;
  group: Group;
  /** Sub-heading to file this page under within its tier. Required: the catalog
   *  and sidebar label by family alone, so a page without one would have nowhere
   *  to sit. */
  family: Family;
  summary: string;
  /** A self-contained, interactive demo of the component. Omit to hide the
   *  Example section on that page. */
  Example?: FC;
  /** Prose that belongs to this component and nowhere else — a setup recipe,
   *  a platform caveat. Rendered above the props table, and responsible for
   *  its own `.doc-section` wrappers so it can carry several headings. */
  Guide?: FC;
  /** Where the component is imported from, for the Import block. Defaults to
   *  the root export; the desktop chrome lives on a subpath. */
  importFrom?: string;
  props: PropRow[];
}

// ---- Page registry --------------------------------------------------------

export const pages: DocPage[] = [
  {
    slug: 'app-shell',
    name: 'App Shell',
    group: 'organisms',
    family: 'Window',
    importFrom: 'pretty-panels/window',
    summary: 'The window a desktop app fills: a stage under floating chrome, and nothing else. It owns the viewport so exactly one region scrolls, and it is the containing block the titlebar pins to. The stage carries the ground and the dotted backdrop the glass above it blurs. Two slots on purpose — no status bar (the titlebar readouts say it closer to the work) and no sidebar (a column of panels is just panels on the stage).',
    Example: AppShellExample,
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The stage. Scrolls; everything else stays put. Runs full-bleed under the chrome — pad it with --titlebar-h if its content must start clear.' },
      { name: 'titleBar', type: 'ReactNode', description: 'The chrome over the top — normally a TitleBar. An overlay: the shell reserves no room for it.' },
      { name: 'className', type: 'string', description: 'Extra class names on the shell.' },
      { name: 'style', type: 'CSSProperties', description: 'Inline styles merged onto the shell (an explicit height beats the 100dvh default).' },
    ],
  },
  {
    slug: 'gauge',
    name: 'Gauge',
    group: 'atoms',
    family: 'Monitors',
    summary: 'A read-only 270° dial with a rounded fill, a tabular readout, and a caption. The range and the displayed number are independent, so 3.4-out-of-10 reads "3.4" on a 34%-full arc.',
    Example: GaugeExample,
    props: [
      { name: 'value', type: 'number', required: true, description: 'Current reading.' },
      { name: 'min', type: 'number', default: '0', description: 'Bottom of the swept range.' },
      { name: 'max', type: 'number', default: '100', description: 'Top of the swept range.' },
      { name: 'label', type: 'ReactNode', description: 'Caption under the dial.' },
      { name: 'format', type: '(v: number) => string', description: 'Format the number in the middle; the arc still fills from value.' },
      { name: 'accent', type: 'boolean', default: 'false', description: 'Paint the fill with the accent instead of the muted gauge fill.' },
    ],
  },
  {
    slug: 'gauge-row',
    name: 'Gauge Row',
    group: 'molecules',
    family: 'Groups',
    summary: 'The strip a set of Gauge dials sits in — spaced evenly across the plate and hung from a common top edge so their captions line up.',
    Example: GaugeRowExample,
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The gauges — usually two to four Gauges.' },
      { name: 'className', type: 'string', description: 'Extra class names on the row.' },
    ],
  },
  {
    slug: 'icon-button',
    name: 'Icon Button',
    group: 'atoms',
    family: 'Buttons',
    summary: 'A round icon button on a panel-plate ground. Supply your own icon; the accent paints the primary action of a cluster, or — as a toggle — the on state.',
    Example: IconButtonExample,
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The icon to render (e.g. an inline <svg>).' },
      { name: 'mode', type: "'standard' | 'toggle'", default: "'standard'", description: 'What the button is. standard is an action: it has no state, so nothing is announced as pressed, and it wears the quiet tier unless active marks it as the primary one. toggle is an on/off control: active is the state, onChange reports the press, aria-pressed says so, and on paints the accent.' },
      { name: 'onClick', type: '() => void', description: 'Click handler. Button mode only — a toggle reports through onChange.' },
      { name: 'active', type: 'boolean', default: 'false', description: 'Paint the accent. In standard mode that marks the primary action and nothing more; in toggle mode (where it is required) it is the on state.' },
      { name: 'onChange', type: '(active: boolean) => void', description: 'Toggle mode only (required there). Called with the state the press asks for — the opposite of active.' },
      { name: 'label', type: 'string', description: 'Accessible name + tooltip.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the button and block interaction.' },
      { name: 'ref', type: 'Ref<HTMLButtonElement>', description: 'Forwarded to the underlying button — what a Menu or Popover anchors to when this is the control that opens one.' },
      { name: 'aria-haspopup', type: "boolean | 'menu' | 'dialog' | 'listbox' | 'tree' | 'grid'", description: 'Says this button opens a floating surface: menu for a Menu, dialog for a Popover holding a form. The surface cannot set it — it never sees the control that opened it.' },
      { name: 'aria-expanded', type: 'boolean', description: 'Whether the surface this button opens is currently up. Pair it with aria-haspopup; without it a screen reader announces a plain button and never says the menu is open.' },
      { name: 'className', type: 'string', description: 'Extra class names on the button.' },
    ],
  },
  {
    slug: 'list',
    name: 'List',
    group: 'molecules',
    family: 'Structures',
    summary: 'A stack of capsule rows — a leading icon, a label, and a mono readout pinned right. Turn on reorderable and each row grows a grip: drag it, or focus it and use the arrow keys.',
    Example: ListExample,
    props: [
      { name: 'items', type: '(string | ListItem)[]', required: true, description: 'The rows, top to bottom. A bare string is shorthand for { id: theString }; an object adds label, icon, meta and disabled.' },
      { name: 'reorderable', type: 'boolean', default: 'false', description: 'Give every enabled row a drag handle. Pair with onReorder.' },
      { name: 'onReorder', type: '(from: number, to: number) => void', description: 'Called once on drop, or on an arrow keypress, with the indices to move between. Applying it to items is yours.' },
      { name: 'label', type: 'string', description: "Accessible name for the list (the ul's aria-label)." },
      { name: 'className', type: 'string', description: 'Extra class names on the list.' },
    ],
  },
  {
    slug: 'menu',
    name: 'Menu',
    /* A closed set of peer commands, so it files with `Platter` rather than with
       the surface it floats on. `Popover` is the organism of the pair: it hosts
       content of yours, and a menu hosts nothing — it takes items and renders
       them. The same call `WindowControls` makes next to `TitleBar`. */
    group: 'molecules',
    family: 'Groups',
    summary: "A Popover holding commands \u2014 the context menu, and the menu a \u22ef button opens. Capsule rows on a floating sheet, with an optional tick column, mono keystroke hints and the ARIA menu keyboard over them. It brings the surface's whole job with it: anchored to an element or to the point a right-click named, flipped and shifted to stay on screen, and dismissed by Escape, by Tab, or by a press outside it.",
    Example: MenuExample,
    Guide: MenuGuide,
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Whether the menu is up (fully controlled).' },
      { name: 'onClose', type: '() => void', required: true, description: 'Called when the menu asks to close \u2014 Escape, Tab, a press outside it, or a command being chosen.' },
      { name: 'anchor', type: 'RefObject<HTMLElement | null> | HTMLElement | PopoverPoint | null', required: true, description: "What the menu hangs off: an element, by ref or in the hand, or a viewport point \u2014 a right-click's clientX / clientY. A point keeps no gap from its anchor, so a context menu opens with its corner at the cursor. See Popover." },
      { name: 'items', type: 'MenuEntry[]', required: true, description: 'The commands, top to bottom. A bare string is shorthand for { id: theString }; an object adds label, icon, shortcut, checked and disabled, and { separator: true } fences off a run. One checkable command gives the whole menu a tick column; give every command an icon or none, since a mixed menu starts its labels on two different rules.' },
      { name: 'onSelect', type: '(id: string) => void', required: true, description: "Called with the chosen command's id. One handler for the menu rather than one per item: what a menu does is a single switch, and splitting it across the items would hide half of it in the data." },
      { name: 'closeOnSelect', type: 'boolean', default: 'true', description: 'Whether choosing a command dismisses the menu \u2014 which is what a menu is. Turn it off for a menu of checkboxes, where the point is to set several without reopening it each time.' },
      { name: 'side', type: "'top' | 'right' | 'bottom' | 'left'", default: "'bottom'", description: "Preferred edge of the anchor. Flips to the opposite one when the room isn't there." },
      { name: 'align', type: "'start' | 'center' | 'end'", default: "'start'", description: 'Which way the menu lines up along that edge. Shifts along it to stay on screen.' },
      { name: 'label', type: 'string', description: "Accessible name for the menu (the menu's aria-label)." },
      { name: 'className', type: 'string', description: "Extra class names on the column of commands \u2014 not on the surface under it, which is Popover's." },
    ],
  },
  {
    slug: 'panel',
    name: 'Panel',
    group: 'organisms',
    family: 'Surfaces',
    summary: 'A static control-panel plate: the grey surface with an optional header bar and a padded body. Use it to group controls anywhere. Optionally folds its body away while keeping the plate width.',
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The panel body content.' },
      { name: 'title', type: 'ReactNode', description: 'Optional header bar. A string renders bold; pass a node for custom markup.' },
      { name: 'collapsible', type: 'boolean', default: 'false', description: "Show a header −/+ toggle that folds the plate's body away." },
      { name: 'collapsed', type: 'boolean', description: 'Collapsed state (controlled). Pair with onCollapsedChange; omit to use defaultCollapsed.' },
      { name: 'defaultCollapsed', type: 'boolean', default: 'false', description: 'Start collapsed (uncontrolled). Only meaningful with collapsible.' },
      { name: 'onCollapsedChange', type: '(collapsed: boolean) => void', description: 'Called with the next state when the collapse toggle is clicked.' },
      { name: 'width', type: 'number | string', default: '380px', description: 'Plate width. Unchanged while collapsed — only the body folds away.' },
      { name: 'className', type: 'string', description: 'Extra class names on the plate.' },
      { name: 'style', type: 'CSSProperties', description: 'Inline styles merged onto the plate.' },
    ],
  },
  {
    slug: 'platter',
    name: 'Platter',
    group: 'molecules',
    family: 'Groups',
    summary: 'A capsule tray holding a row or column of icon and text buttons. It rests on the same quiet ground a standalone button does — a platter is a tray of buttons — and a segment paints the accent when lit. Two modes share the shape: standard for independent actions and toggles, select for one choice out of several, a radio group wearing the tray’s clothes.',
    Example: PlatterExample,
    props: [
      { name: 'items', type: 'PlatterItem[]', required: true, description: 'The segments. Each has an optional icon and/or text, plus disabled and an a11y label. A select tray identifies a segment by value; a standard tray gives each its own onClick and active.' },
      { name: 'mode', type: "'standard' | 'select'", default: "'standard'", description: 'What the tray is. standard holds independent actions — any number may be active, and the tray is a toolbar. select is a single choice over real radio inputs: exactly one segment is lit, and the tray is a radiogroup.' },
      { name: 'value', type: 'string', description: "Select mode only (required there): the selected segment's value. Fully controlled." },
      { name: 'onChange', type: '(value: string) => void', description: "Select mode only (required there). Called with the newly selected segment's value." },
      { name: 'name', type: 'string', description: 'Select mode only. Shared name for the underlying radios. Generated when omitted — pass one only to join a wider native group.' },
      { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Lay the segments in a row or a column.' },
      { name: 'label', type: 'string', description: 'Accessible name for the group.' },
      { name: 'className', type: 'string', description: 'Extra class names on the tray.' },
    ],
  },
  {
    slug: 'popover',
    name: 'Popover',
    group: 'organisms',
    family: 'Surfaces',
    summary: "A surface that floats over the work, anchored to something in it \u2014 the mechanism Menu is built on, and it will hold anything: a few controls, a colour picker, a form. Three jobs, and pointedly no fourth. It stays on screen, flipping and shifting as the room runs out and capping itself to what is left. It floats clear of everything, in the browser's top layer, so no ancestor's overflow can clip it and no later stacking context can paint over it \u2014 and it gets there without a portal, so your tokens, your presses and the focus order all still reach it. And it dismisses: Escape, or a press outside. Saying what the thing actually is belongs to the content.",
    Example: PopoverExample,
    Guide: PopoverGuide,
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Whether the surface is up (fully controlled, like every other state here).' },
      { name: 'onClose', type: '() => void', required: true, description: "Called when the surface asks to close \u2014 Escape, or a press anywhere outside it. A press on the anchor doesn't count, which is what lets the button that opened a popover be the one that closes it." },
      { name: 'anchor', type: 'RefObject<HTMLElement | null> | HTMLElement | PopoverPoint | null', required: true, description: "What the surface hangs off: an element, by ref or in the hand, or a viewport point \u2014 { x, y } from a right-click. The point is the context-menu case, not a convenience: a right-click has no element to open from, only the place it happened. A point keeps no gap from its anchor; an element is cleared by --pp-popover-gap." },
      { name: 'side', type: "'top' | 'right' | 'bottom' | 'left'", default: "'bottom'", description: "Preferred edge of the anchor. A preference, not an instruction: it flips to the opposite edge when this one cannot hold the surface and the other one has more room. The side actually used lands on the surface as data-side." },
      { name: 'align', type: "'start' | 'center' | 'end'", default: "'start'", description: "Which way the surface lines up along that edge \u2014 with the anchor's leading edge, its middle, or its trailing edge. It then shifts along the edge to stay inside the window, and keeps --pp-popover-inset off it." },
      { name: 'children', type: 'ReactNode', required: true, description: 'What floats. Bring the semantics with it: the surface takes no role and no name of its own, because a menu, a non-modal dialog and a tooltip want three different sets and a guess would be wrong two thirds of the time.' },
      { name: 'className', type: 'string', description: 'Extra class names on the surface. There is no style prop: where the surface sits is the placement\u2019s to write, and an inline left / top would only fight it.' },
    ],
  },
  {
    slug: 'radio-group',
    name: 'Radio Group',
    group: 'atoms',
    family: 'Choices',
    summary: 'A row of dot-and-label choices over real radio inputs, so arrow-key roving and form semantics come from the platform. Reach for it over a Select when the options are few and short.',
    Example: RadioGroupExample,
    props: [
      { name: 'value', type: 'string', required: true, description: 'Currently selected value (controlled).' },
      { name: 'onChange', type: '(v: string) => void', required: true, description: 'Called with the newly selected value.' },
      { name: 'options', type: '(string | RadioOption)[]', required: true, description: 'The choices. A bare string is shorthand for { value: theString }; an object adds label and disabled.' },
      { name: 'name', type: 'string', description: 'Shared name for the underlying radios. Generated when omitted — pass one only to join a wider native group.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable every choice in the group.' },
    ],
  },
  {
    slug: 'readout',
    name: 'Readout',
    group: 'atoms',
    family: 'Monitors',
    summary: 'A capsule that states a value and nothing else \u2014 no handler, no disabled state, nothing to touch. It hugs its content, and rests just off the plate rather than in a track, because a recessed track is the language of controls you aim at.',
    Example: ReadoutExample,
    props: [
      { name: 'value', type: 'ReactNode', required: true, description: 'The value on show. Set in the mono face with tabular figures, so a column of them stays aligned as the digits change.' },
      { name: 'label', type: 'ReactNode', description: 'Optional caption ahead of the value \u2014 "aperture f/2.8".' },
      { name: 'accent', type: 'boolean', default: 'false', description: 'Paint the capsule with the accent, the way Gauge accents its fill: a value someone set rather than one the panel is merely reporting.' },
      { name: 'className', type: 'string', description: 'Extra class names on the capsule.' },
    ],
  },
  {
    slug: 'section',
    name: 'Section',
    group: 'molecules',
    family: 'Layout',
    summary: 'A collapsible titled section: a bold header that folds its body with a smooth wipe. Nest these inside a Panel.',
    Example: SectionExample,
    props: [
      { name: 'title', type: 'string', required: true, description: 'Header label.' },
      { name: 'children', type: 'ReactNode', required: true, description: 'The section body content.' },
      { name: 'defaultOpen', type: 'boolean', default: 'true', description: 'Whether the section starts expanded.' },
    ],
  },
  {
    slug: 'select',
    name: 'Select',
    group: 'atoms',
    family: 'Choices',
    summary: 'A native select restyled as a track capsule. The chevron is a real sibling element, so it retints with the rest of the control.',
    Example: SelectExample,
    props: [
      { name: 'value', type: 'string', required: true, description: 'Currently selected value (controlled).' },
      { name: 'onChange', type: '(v: string) => void', required: true, description: 'Called with the newly selected value.' },
      { name: 'options', type: '(string | SelectOption)[]', required: true, description: 'The choices. A bare string is shorthand for { value: theString }; an object adds label and disabled.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the capsule and block interaction.' },
    ],
  },
  {
    slug: 'slider',
    name: 'Slider',
    group: 'atoms',
    family: 'Values',
    summary: 'Label + value + capsule track in one object. Pointer-capture drag, keyboard arrows, optional value formatting.',
    Example: SliderExample,
    props: [
      { name: 'label', type: 'string', required: true, description: 'Text shown on the left of the track.' },
      { name: 'value', type: 'number', required: true, description: 'Current value (fully controlled).' },
      { name: 'min', type: 'number', required: true, description: 'Lowest value.' },
      { name: 'max', type: 'number', required: true, description: 'Highest value.' },
      { name: 'step', type: 'number', required: true, description: 'Increment / snap grid.' },
      { name: 'onChange', type: '(v: number) => void', required: true, description: 'Called with the new value on drag or keypress.' },
      { name: 'format', type: '(v: number) => string', description: 'Format the displayed value; the underlying number is unchanged.' },
    ],
  },
  {
    slug: 'stepper',
    name: 'Stepper',
    group: 'atoms',
    family: 'Values',
    summary: 'A recessed capsule holding −/+ buttons around a tabular readout. For values that move in discrete increments; the buttons disable at the bounds.',
    Example: StepperExample,
    props: [
      { name: 'value', type: 'number', required: true, description: 'Current value (fully controlled).' },
      { name: 'onChange', type: '(v: number) => void', required: true, description: 'Called with the new value on each press.' },
      { name: 'step', type: 'number', default: '1', description: 'Amount one press moves the value.' },
      { name: 'min', type: 'number', description: 'Clamp to this minimum; the − button disables once the value reaches it.' },
      { name: 'max', type: 'number', description: 'Clamp to this maximum; the + button disables once the value reaches it.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'format', type: '(v: number) => string', description: 'Format the displayed value; the underlying number is unchanged.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim both buttons and block interaction.' },
    ],
  },
  {
    slug: 'table',
    name: 'Table',
    group: 'molecules',
    family: 'Structures',
    summary: "List's capsule rows are arranged by column, ordering rows by field rather than sequence or depth. A row is a plain record, and numeric columns automatically adopt a mono, tabular-figure format.",
    Example: TableExample,
    props: [
      { name: 'columns', type: 'TableColumn[]', required: true, description: 'The columns, left to right. Each has a key (the row field it reads, and the name sort uses) plus optional header, numeric, align, width and sortable.' },
      { name: 'rows', type: 'TableRow[]', required: true, description: 'The rows, top to bottom, already in the order they should appear. Every field beyond id and disabled is a cell, looked up by its column key.' },
      { name: 'sort', type: 'TableSort | null', description: 'Which column the table is sorted by, and which way — { key, direction }. It paints the arrow on that heading; it does not order rows.' },
      { name: 'onSortChange', type: '(sort: TableSort) => void', description: 'Called with the sort a heading press asks for: the same column flips direction, a new one starts ascending. Applying it to rows is yours, like every other control here.' },
      { name: 'empty', type: 'ReactNode', description: 'Shown in place of the body when there are no rows. Without it an empty table is just its headings, which reads as broken rather than as empty.' },
      { name: 'minWidth', type: 'string', default: 'from columns', description: 'The width the rows refuse to fall below; narrower than this the table scrolls sideways inside its plate rather than squeezing every column to an ellipsis, so a row stays a whole capsule. Defaults to a floor built from columns — every width you declared, plus --pp-table-col-min (112px) for each column that left it off. Pass 0 to squeeze instead of scrolling.' },
      { name: 'label', type: 'string', description: "Accessible name for the table (its aria-label). Also names the scroller as a region while it scrolls." },
      { name: 'className', type: 'string', description: 'Extra class names on the table.' },
    ],
  },
  {
    slug: 'tabs',
    name: 'Tabs',
    group: 'molecules',
    family: 'Layout',
    summary: "A capsule tab strip. Hand it to a Panel's title and it becomes the plate's flush header; drop it anywhere else and it's a self-contained bar. It renders only the strip — which body to show is yours to switch on value.",
    Example: TabsExample,
    props: [
      { name: 'items', type: '(string | TabItem)[]', required: true, description: 'The tabs, left to right. A bare string is shorthand for { id: theString }; an object adds label and disabled.' },
      { name: 'value', type: 'string', required: true, description: 'Active tab id (fully controlled).' },
      { name: 'onChange', type: '(id: string) => void', required: true, description: 'Called with the newly selected tab id, on click or arrow key.' },
      { name: 'label', type: 'string', description: "Accessible name for the strip (the tablist's aria-label)." },
      { name: 'className', type: 'string', description: 'Extra class names on the strip.' },
    ],
  },
  {
    slug: 'text-button',
    name: 'Text Button',
    group: 'atoms',
    family: 'Buttons',
    summary: "IconButton's text-label sibling: a capsule that hugs its label on a panel-plate ground, with an optional leading icon. It takes the same two modes — an action whose accent marks it primary, or a toggle whose accent is a state.",
    Example: TextButtonExample,
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The button label.' },
      { name: 'mode', type: "'standard' | 'toggle'", default: "'standard'", description: 'What the button is. standard is an action: it has no state, so nothing is announced as pressed, and it wears the quiet tier unless active marks it as the primary one. toggle is an on/off control: active is the state, onChange reports the press, aria-pressed says so, and on paints the accent.' },
      { name: 'onClick', type: '() => void', description: 'Click handler. Button mode only — a toggle reports through onChange.' },
      { name: 'icon', type: 'ReactNode', description: 'Optional leading icon (e.g. an inline <svg>), placed before the label.' },
      { name: 'active', type: 'boolean', default: 'false', description: 'Paint the accent. In standard mode that marks the primary action — the Apply beside a Cancel — and nothing more; in toggle mode (where it is required) it is the on state.' },
      { name: 'onChange', type: '(active: boolean) => void', description: 'Toggle mode only (required there). Called with the state the press asks for — the opposite of active.' },
      { name: 'label', type: 'string', description: 'Tooltip + accessible-name override. Defaults to the visible label.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the button and block interaction.' },
      { name: 'ref', type: 'Ref<HTMLButtonElement>', description: 'Forwarded to the underlying button — what a Menu or Popover anchors to when this is the control that opens one.' },
      { name: 'aria-haspopup', type: "boolean | 'menu' | 'dialog' | 'listbox' | 'tree' | 'grid'", description: 'Says this button opens a floating surface: menu for a Menu, dialog for a Popover holding a form. The surface cannot set it — it never sees the control that opened it.' },
      { name: 'aria-expanded', type: 'boolean', description: 'Whether the surface this button opens is currently up. Pair it with aria-haspopup; without it a screen reader announces a plain button and never says the menu is open.' },
      { name: 'className', type: 'string', description: 'Extra class names on the button.' },
    ],
  },
  {
    slug: 'text-field',
    name: 'Text Field',
    group: 'atoms',
    family: 'Values',
    summary: 'A track capsule for free-form entry, set in the mono face so typed identifiers line up with the numeric readouts around them.',
    Example: TextFieldExample,
    props: [
      { name: 'value', type: 'string', required: true, description: 'Current text (fully controlled).' },
      { name: 'onChange', type: '(v: string) => void', required: true, description: 'Called with the new text on every keystroke.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'placeholder', type: 'string', description: 'Shown while the field is empty.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the capsule and block interaction.' },
      { name: 'spellCheck', type: 'boolean', default: 'false', description: 'Native spellcheck. Off by default — these fields usually hold identifiers rather than prose.' },
    ],
  },
  {
    slug: 'title-bar',
    name: 'Title Bar',
    group: 'organisms',
    family: 'Window',
    importFrom: 'pretty-panels/window',
    summary: 'The chrome across the top of a frameless desktop window — window controls, a title and slots of your own, as frosted capsules floating over the app. An overlay, not a row: it reserves nothing, so the window runs full-bleed to its top edge and the glass has something to blur. It never spills either: narrow the window and the slots fold into an ellipsis sheet while the controls hold their platform side.',
    Example: TitleBarExample,
    Guide: TitleBarGuide,
    props: [
      { name: 'title', type: 'ReactNode', description: "Window title, in a capsule of its own. Omit it and no capsule is drawn — an empty pill would float there saying nothing. Ignored when children is given." },
      { name: 'children', type: 'ReactNode', description: 'Strip content in place of a title — a Tabs strip, a toolbar. Unglazed, so it brings its own surface; never a drag handle.' },
      { name: 'left', type: 'ReactNode', description: 'Leading capsule, inboard of the window controls. Opts out of the drag region, and folds into the overflow sheet when the window is too narrow to hold it.' },
      { name: 'right', type: 'ReactNode', description: 'Trailing capsule, pushed to the far end. Opts out of the drag region, and folds into the overflow sheet when the window is too narrow to hold it.' },
      { name: 'platform', type: "'mac' | 'win' | 'linux'", default: 'auto-detected', description: 'Control placement and order. Pass what the preload bridge reports rather than trusting the user agent.' },
      { name: 'controls', type: "'custom' | 'native' | 'none'", default: "'custom'", description: "custom draws the kit's own cluster (the only option that works with frame: false everywhere); native draws none and reserves space for the OS buttons; none reserves nothing." },
      { name: 'controlsSide', type: "'left' | 'right'", default: 'platform convention', description: 'Which end the controls sit at — left on macOS, right elsewhere.' },
      { name: 'align', type: "'start' | 'center'", default: "'start'", description: 'Title placement. Centred pins it to the middle of the window, not to the space between the capsules.' },
      { name: 'maximized', type: 'boolean', default: 'false', description: "Turns the zoom triangles inward and relabels the button Restore." },
      { name: 'fullscreen', type: 'boolean', default: 'false', description: 'Stands the controls down: in fullscreen the OS owns the top of the screen.' },
      { name: 'dirty', type: 'boolean', default: 'false', description: 'Unsaved work — a dot in the centre of the close button, given up for the glyph on hover.' },
      { name: 'graphite', type: 'boolean', default: 'false', description: 'Monochrome window controls instead of the macOS traffic lights. controls="custom" only — the OS paints its own under native.' },
      { name: 'inactive', type: 'boolean', default: 'false', description: 'Step the glass back to mark an unfocused window. The contents recede, and the macOS traffic lights lose their colour.' },
      { name: 'overlay', type: 'boolean', default: 'false', description: "Lay the strip out against env(titlebar-area-*) — the Window Controls Overlay geometry. Pair with controls=\"native\"." },
      { name: 'overflowLabel', type: 'string', default: "'More'", description: 'Accessible name and tooltip for the ellipsis button the slots fold into, and for the sheet it opens. Worth setting in a localised app.' },
      { name: 'onMinimize', type: '() => void', description: 'Omit and that button is not rendered.' },
      { name: 'onMaximize', type: '() => void', description: 'Omit and that button is not rendered.' },
      { name: 'onClose', type: '() => void', description: 'Omit and that button is not rendered.' },
      { name: 'onTitleDoubleClick', type: '() => void', description: "The native zoom gesture. Presses inside a capsule don't count; the title pill stays part of the strip, so a double-click on it does." },
      { name: 'className', type: 'string', description: 'Extra class names on the strip.' },
      { name: 'style', type: 'CSSProperties', description: 'Inline styles merged onto the strip.' },
    ],
  },
  {
    slug: 'toolbar',
    name: 'Toolbar',
    group: 'organisms',
    family: 'Surfaces',
    summary: 'Lays a row of controls out the way Panel stacks a column of them, but paints nothing: no ground, no edge, no shadow. Fill it with Platters and Readouts and they float directly on whatever is behind. Being surfaceless is what lets it go anywhere — on the stage or inside a Panel — without stacking one surface on an identical one; the trade is that its contents take their ground, and so their character, from wherever you put it. Set overflow and it never spills either: the items it has run out of room for fold into a \u22ef that opens them as a sheet, one item at a time, which is the same bargain the window strip strikes with its slots.',
    Example: ToolbarExample,
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'The bar\u2019s contents, laid out from the leading edge \u2014 Platters, buttons, a Select, whatever the job needs.' },
      { name: 'end', type: 'ReactNode', description: 'Content pinned to the trailing edge with the slack between: the status a bar reports rather than the controls it offers, usually Readouts.' },
      { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'A strip across the top of a view, or a tool palette down its side.' },
      { name: 'overflow', type: 'boolean', default: 'false', description: 'Fold the items there is no room for into a trailing \u22ef, which opens them as a sheet. Items fold whole and last-first \u2014 a Platter is one item however many segments are on it \u2014 and nothing in the bar shrinks to make room, since a squeezed Platter drops its labels and a squeezed Readout reports 19\u2026. Off by default: a bar that spills, wraps or scrolls is a good answer too, and which one you want is layout. The trade is that folding an item moves it into the sheet, which re-mounts it. A bar folds against the box it is given \u2014 a row always has a width, but a vertical bar wants a height before it can run out of one \u2014 and end never folds, so the \u22ef plus whatever end holds is the floor.' },
      { name: 'overflowLabel', type: 'string', default: "'More tools'", description: 'Accessible name and tooltip for the overflow button, and the name of the sheet it opens. Worth setting in a localised app.' },
      { name: 'label', type: 'string', description: 'Accessible name. With one the bar becomes a labelled group; without, it is chrome, and the things inside carry their own semantics.' },
      { name: 'className', type: 'string', description: 'Extra class names on the bar.' },
      { name: 'style', type: 'CSSProperties', description: 'Inline styles merged onto the bar. It fills the width it is given \u2014 set one here if it should hug its contents instead.' },
    ],
  },
  {
    slug: 'toggle',
    name: 'Toggle',
    group: 'atoms',
    family: 'Choices',
    summary: 'A capsule on/off switch, optionally paired with a bold label and a hint line. The whole row is the click target.',
    Example: ToggleExample,
    props: [
      { name: 'checked', type: 'boolean', required: true, description: 'On/off state (controlled).' },
      { name: 'onChange', type: '(checked: boolean) => void', required: true, description: 'Called with the next state.' },
      { name: 'label', type: 'ReactNode', description: 'Bold row label.' },
      { name: 'hint', type: 'ReactNode', description: 'Secondary hint line under the label.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dim the switch and block interaction.' },
    ],
  },
  {
    slug: 'tree',
    name: 'Tree',
    group: 'molecules',
    family: 'Structures',
    summary: "List's rows arranged by depth — a scene outliner, with a chevron on any node that has children. Dragging a node works in two axes: up and down picks the gap to land in, left and right picks the depth at that gap.",
    Example: TreeExample,
    props: [
      { name: 'items', type: 'TreeNode[]', required: true, description: 'The roots. Each node has the List row fields plus optional children.' },
      { name: 'expanded', type: 'string[]', description: 'Ids of the expanded nodes (controlled). Omit to use defaultExpanded.' },
      { name: 'defaultExpanded', type: 'string[]', default: '[]', description: 'Ids expanded on first render (uncontrolled).' },
      { name: 'onExpandedChange', type: '(ids: string[]) => void', description: 'Called with the next set of expanded ids.' },
      { name: 'reorderable', type: 'boolean', default: 'false', description: 'Give every enabled node a drag handle, and turn on the Alt+arrow moves.' },
      { name: 'onMove', type: '(move: TreeMove) => void', description: 'Called once on drop, or on an Alt+arrow keypress, with { id, parentId, index } — index counts siblings with the node already lifted out. Applying it to items is yours.' },
      { name: 'onMore', type: '(id: string, anchor: HTMLElement) => void', description: 'Give every leaf a \u22ef button on its right edge and call this when it is pressed. Branches get a spacer instead — actions belong to the things a container holds. Omit it and no button renders. The second argument is the element to hang a Menu off: the button under the pointer, or the row itself when the press came from the keyboard, where the \u22ef is not what was aimed at and is not yet on screen. A handler that only wants the id still fits. The example opens a Menu that locks the node.' },
      { name: 'label', type: 'string', description: "Accessible name for the tree (the tree's aria-label)." },
      { name: 'className', type: 'string', description: 'Extra class names on the tree.' },
    ],
  },
  {
    slug: 'vector',
    name: 'Vector',
    group: 'atoms',
    family: 'Values',
    summary: 'A segmented capsule with 2, 3, or 4 numeric fields. Drag a field vertically to scrub or type a value; color mode paints each field with its live rgb.',
    Example: VectorExample,
    props: [
      { name: 'value', type: 'number[]', required: true, description: 'The field values. The capsule renders one field per entry — use 2, 3, or 4.' },
      { name: 'onChange', type: '(axis: number, v: number) => void', required: true, description: 'Called with the changed field index and its new value.' },
      { name: 'step', type: 'number', default: '0.5', description: 'Scrub / type increment.' },
      { name: 'min', type: 'number', description: 'Clamp values to this minimum.' },
      { name: 'max', type: 'number', description: 'Clamp values to this maximum.' },
      { name: 'colorMode', type: 'boolean', default: 'false', description: 'Paint each field with its live rgb value (expects three 0–255 components).' },
    ],
  },
  {
    slug: 'window-controls',
    name: 'Window Controls',
    /* A closed set of peer buttons in one capsule — the same shape as `Platter`,
       and filed with it. The Window organisms are the parts that *host* your
       content (`TitleBar`'s slots, `AppShell`'s stage); this one hosts nothing,
       so the subpath it ships on is the only thing it had in common with them. */
    group: 'molecules',
    family: 'Groups',
    importFrom: 'pretty-panels/window',
    summary: "Minimize, zoom and close as a frosted capsule of rings — the system's own red, amber and green on macOS. At rest they are outlines; hovering the capsule fills all three and fades their glyphs in — the trade the system lights make, and what lets the glyphs be legible without being noise. Button order follows the platform.",
    Example: WindowControlsExample,
    props: [
      { name: 'platform', type: "'mac' | 'win' | 'linux'", default: 'auto-detected', description: 'Button order — close leads on macOS, trails elsewhere.' },
      { name: 'maximized', type: 'boolean', default: 'false', description: 'Turns the zoom triangles inward and relabels the button Restore.' },
      { name: 'dirty', type: 'boolean', default: 'false', description: "Unsaved work, as a dot in the centre of the close button — where macOS puts it. It is the button's resting face, so hovering gives it up for the glyph rather than stacking the two." },
      { name: 'graphite', type: 'boolean', default: 'false', description: "Stand the traffic lights down to monochrome rings, the way macOS' own Graphite appearance does — for chrome over artwork the colours would fight. No effect off macOS, where there are no lights to stand down." },
      { name: 'inactive', type: 'boolean', default: 'false', description: 'Unfocused window: the traffic lights drop to 0% saturation, the way the system greys them out. TitleBar forwards its own inactive here, so this is only worth passing to a cluster you place yourself.' },
      { name: 'onMinimize', type: '() => void', description: 'Omit a handler and that button is not rendered — a window that cannot be maximized simply passes no onMaximize.' },
      { name: 'onMaximize', type: '() => void', description: 'See onMinimize.' },
      { name: 'onClose', type: '() => void', description: 'See onMinimize.' },
      { name: 'className', type: 'string', description: 'Extra class names on the capsule.' },
    ],
  },
];

/** The families inside one tier, in display order, each holding its pages.
 *  A tier whose pages carry no family comes back as a single unlabelled section,
 *  so callers can render every tier the same way. */
export function familiesOf(group: Group): { label: Family; items: DocPage[] }[] {
  const tier = pages.filter((p) => p.group === group);
  return FAMILIES.map((label) => ({
    label,
    items: tier.filter((p) => p.family === label),
  })).filter((f) => f.items.length > 0);
}
