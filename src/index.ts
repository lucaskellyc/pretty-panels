// Bundled stylesheet. Consumers who import a built bundle instead pull in
// `pretty-panels/styles.css` explicitly (the CSS is extracted, not injected).
import './styles/index.css';

export { Panel } from './components/Panel';
export type { PanelProps } from './components/Panel';

export { Section } from './components/Section';
export type { SectionProps } from './components/Section';

export { Slider } from './components/Slider';
export type { SliderProps } from './components/Slider';

export { Vector } from './components/Vector';
export type { VectorProps } from './components/Vector';

export { Toggle } from './components/Toggle';
export type { ToggleProps } from './components/Toggle';

export { IconButton } from './components/IconButton';
export type { IconButtonProps } from './components/IconButton';

export { TextButton } from './components/TextButton';
export type { TextButtonProps } from './components/TextButton';

export { Platter } from './components/Platter';
export type { PlatterProps, PlatterItem } from './components/Platter';
