import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Slider, type SliderProps } from './Slider';
import { giveBox } from '../test/box';

/** A Slider that owns its value, the way an app would hold it. */
function Owned(props: Partial<SliderProps> & { onChange?: (v: number) => void }) {
  const [value, setValue] = useState(props.value ?? 42);
  return (
    <Slider
      label="Focus"
      min={0}
      max={100}
      step={1}
      {...props}
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onChange?.(v);
      }}
    />
  );
}

/** The track, with a 200px box so a pixel of drag is half a unit of value. */
function track() {
  const el = screen.getByRole('slider');
  giveBox(el, { left: 0, width: 200 });
  return el;
}
const press = (el: Element, x: number, init: Partial<PointerEventInit> = {}) =>
  fireEvent.pointerDown(el, { button: 0, buttons: 1, pointerId: 1, clientX: x, clientY: 10, ...init });
const move = (el: Element, x: number, init: Partial<PointerEventInit> = {}) =>
  fireEvent.pointerMove(el, { buttons: 1, pointerId: 1, clientX: x, clientY: 10, ...init });
const release = (el: Element) => fireEvent.pointerUp(el, { pointerId: 1 });

describe('Slider', () => {
  it('is an ARIA slider named by its label, with the formatted value as its text', () => {
    render(<Owned value={0.6} min={0} max={1} step={0.1} format={(v) => `${Math.round(v * 100)}%`} />);
    const el = screen.getByRole('slider', { name: 'Focus' });
    expect(el.getAttribute('aria-valuenow')).toBe('0.6');
    expect(el.getAttribute('aria-valuetext')).toBe('60%');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('1');
  });

  it('leaves aria-valuetext off without a format, so the number is read', () => {
    render(<Owned />);
    expect(screen.getByRole('slider').hasAttribute('aria-valuetext')).toBe(false);
  });

  it('steps with the arrows, jumps a tenth with Page keys and goes to the ends with Home and End', () => {
    const onChange = vi.fn();
    render(<Owned onChange={onChange} />);
    const el = screen.getByRole('slider');
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    expect(el.getAttribute('aria-valuenow')).toBe('43');
    fireEvent.keyDown(el, { key: 'ArrowDown' });
    expect(el.getAttribute('aria-valuenow')).toBe('42');
    fireEvent.keyDown(el, { key: 'PageUp' });
    expect(el.getAttribute('aria-valuenow')).toBe('52');
    fireEvent.keyDown(el, { key: 'End' });
    expect(el.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(el, { key: 'End' });
    fireEvent.keyDown(el, { key: 'Home' });
    expect(el.getAttribute('aria-valuenow')).toBe('0');
    // Clamped at the end, so End twice reported once.
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it('opens a field on a press that does not move, and on Enter', () => {
    render(<Owned />);
    const el = track();
    press(el, 50);
    release(el);
    const field = screen.getByRole('textbox') as HTMLInputElement;
    expect(field.value).toBe('42');
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'Enter' });
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('commits a typed value snapped to the step and clamped to the range; ignores non-numbers', () => {
    const onChange = vi.fn();
    render(<Owned onChange={onChange} />);
    const type = (text: string) => {
      fireEvent.keyDown(screen.getByRole('slider'), { key: 'Enter' });
      const field = screen.getByRole('textbox');
      fireEvent.change(field, { target: { value: text } });
      fireEvent.keyDown(field, { key: 'Enter' });
    };
    type('57.6');
    expect(onChange).toHaveBeenLastCalledWith(58);
    type('500');
    expect(onChange).toHaveBeenLastCalledWith(100);
    type('-3');
    expect(onChange).toHaveBeenLastCalledWith(0);
    onChange.mockClear();
    type('abc');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('drags relative to the current value, not to where the press landed', () => {
    const onChange = vi.fn();
    render(<Owned onChange={onChange} />);
    const el = track();
    // 200px for 100 units: 20px of travel is 10 units, from 42 not from the press.
    press(el, 150);
    move(el, 170);
    expect(onChange).toHaveBeenLastCalledWith(52);
    move(el, 130);
    expect(onChange).toHaveBeenLastCalledWith(32);
    release(el);
    // A drag never opens the field.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('moves at a tenth of the rate with Shift held', () => {
    const onChange = vi.fn();
    render(<Owned onChange={onChange} />);
    const el = track();
    press(el, 50);
    move(el, 90, { shiftKey: true }); // 40px: 20 units normally, 2 fine
    expect(onChange).toHaveBeenLastCalledWith(44);
    release(el);
  });

  it('lets a mostly vertical press go, so the page can scroll on touch', () => {
    const onChange = vi.fn();
    render(<Owned onChange={onChange} />);
    const el = track();
    press(el, 50);
    move(el, 52, { clientY: 60 });
    move(el, 80, { clientY: 90 });
    release(el);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('in absolute mode jumps to the press and follows the drag', () => {
    const onChange = vi.fn();
    render(<Owned mode="absolute" onChange={onChange} />);
    const el = track();
    press(el, 50);
    expect(onChange).toHaveBeenLastCalledWith(25);
    move(el, 150);
    expect(onChange).toHaveBeenLastCalledWith(75);
    release(el);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
