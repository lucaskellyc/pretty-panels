import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Vector, type VectorProps } from './Vector';

function Owned(props: Partial<VectorProps> & { onChange?: (axis: number, v: number) => void }) {
  const [value, setValue] = useState(props.value ?? [1, 2, 3]);
  return (
    <Vector
      {...props}
      value={value}
      onChange={(axis, v) => {
        setValue((vs) => vs.map((x, i) => (i === axis ? v : x)));
        props.onChange?.(axis, v);
      }}
    />
  );
}

describe('Vector', () => {
  it('names its fields X, Y, Z and the group by its label', () => {
    render(<Owned label="Position" />);
    const group = screen.getByRole('group', { name: 'Position' });
    expect(group).toBeTruthy();
    expect(screen.getByLabelText('X')).toBeTruthy();
    expect(screen.getByLabelText('Z')).toBeTruthy();
  });

  it('holds an empty field, a lone minus and a trailing point while focused', () => {
    render(<Owned />);
    const x = screen.getByLabelText('X') as HTMLInputElement;
    fireEvent.focus(x);
    for (const text of ['', '-', '1.', '-0.']) {
      fireEvent.change(x, { target: { value: text } });
      expect(x.value).toBe(text);
    }
  });

  it('commits on blur, clamped to min and max, and restores the start on Escape', () => {
    const onChange = vi.fn();
    render(<Owned min={0} max={10} step={1} onChange={onChange} />);
    const y = screen.getByLabelText('Y') as HTMLInputElement;
    fireEvent.focus(y);
    fireEvent.change(y, { target: { value: '25' } });
    fireEvent.blur(y);
    expect(onChange).toHaveBeenLastCalledWith(1, 10);
    fireEvent.focus(y);
    fireEvent.change(y, { target: { value: '4' } });
    fireEvent.keyDown(y, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(1, 5);
    onChange.mockClear();
    fireEvent.keyDown(y, { key: 'Escape' });
    fireEvent.blur(y);
    // Escape puts the value back where the edit began.
    expect(onChange).toHaveBeenLastCalledWith(1, 10);
    expect(y.value).toBe('10');
  });

  it('paints a 2-field colour as rgb(r, g, 0) rather than nothing', () => {
    render(<Owned value={[200, 100]} colorMode />);
    const r = screen.getByLabelText('R') as HTMLInputElement;
    expect(r.style.background).toBe('rgb(200, 100, 0)');
  });
});
