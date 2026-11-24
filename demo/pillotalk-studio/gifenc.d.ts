/** The parts of gifenc this app uses; the package ships no types. */
declare module 'gifenc' {
  export type Palette = number[][];
  export interface WriteFrameOptions {
    palette?: Palette;
    /** Milliseconds; GIF stores hundredths of a second. */
    delay?: number;
    /** -1 plays once, 0 loops forever, n loops n more times. Read on the first frame. */
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
  }
  export interface Encoder {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(): Encoder;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: { format?: 'rgb565' | 'rgb444' | 'rgba4444'; oneBitAlpha?: boolean | number },
  ): Palette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): Uint8Array;
}
