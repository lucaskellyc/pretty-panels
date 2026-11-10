/** Give an element a layout box in jsdom, where every rect is otherwise zero. */
export function giveBox(el: Element, box: { left?: number; top?: number; width: number; height?: number }) {
  const { left = 0, top = 0, width, height = 32 } = box;
  el.getBoundingClientRect = () =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect;
}
