import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Stepper, type StepperProps } from './Stepper';

function Owned(props: Partial<StepperProps> & { onChange?: (v: number) => void }) {
  const [value, setValue] = useState(props.value ?? 3);
  return (
    <Stepper
      label="Count"
      step={1}
      min={0}
      max={10}
      {...props}
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onChange?.(v);
      }}
    />
  );
}
const readout = () => document.querySelector('.stepper-value') as HTMLElement;
const field = () => document.querySelector('.stepper-input') as HTMLInputElement | null;

describe('Stepper', () => {
  it('nudges by a step and disables the button at a bound', () => {
    const onChange = vi.fn();
    render(<Owned value={9} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('increase'));
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect((screen.getByLabelText('increase') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('decrease'));
    expect(onChange).toHaveBeenLastCalledWith(9);
  });

  it('keeps a step of 0.05 on its own precision', () => {
    const onChange = vi.fn();
    render(<Owned value={0.1} step={0.05} max={1} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('increase'));
    expect(onChange).toHaveBeenLastCalledWith(0.15);
  });

  it('opens a field on a single click of the readout', () => {
    render(<Owned />);
    expect(field()).toBeNull();
    fireEvent.click(readout());
    expect(field()!.value).toBe('3');
  });

  it('Enter commits clamped but not snapped; Escape discards; a non-number is ignored', () => {
    const onChange = vi.fn();
    render(<Owned step={0.1} onChange={onChange} />);
    const type = (text: string, key: 'Enter' | 'Escape') => {
      fireEvent.click(readout());
      fireEvent.change(field()!, { target: { value: text } });
      fireEvent.keyDown(field()!, { key });
      // A real Enter or Escape blurs the field; jsdom's doesn't, so blur it as
      // the browser would.
      if (field()) fireEvent.blur(field()!);
    };
    type('1.25', 'Enter');
    expect(onChange).toHaveBeenLastCalledWith(1.25);
    type('42', 'Enter');
    expect(onChange).toHaveBeenLastCalledWith(10);
    onChange.mockClear();
    type('7', 'Escape');
    expect(onChange).not.toHaveBeenCalled();
    type('x', 'Enter');
    expect(onChange).not.toHaveBeenCalled();
    expect(field()).toBeNull();
  });
});
