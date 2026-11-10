import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs } from './Tabs';

function Owned() {
  const [value, setValue] = useState('a');
  return <Tabs label="Views" items={['a', 'b', { id: 'c', disabled: true }, 'd']} value={value} onChange={setValue} />;
}
const tab = (name: string) => screen.getByRole('tab', { name });

describe('Tabs', () => {
  it('is a labelled tablist with one tab stop, on the selected tab', () => {
    render(<Owned />);
    expect(screen.getByRole('tablist', { name: 'Views' })).toBeTruthy();
    expect(tab('a').getAttribute('aria-selected')).toBe('true');
    expect(tab('a').tabIndex).toBe(0);
    expect(tab('b').tabIndex).toBe(-1);
  });

  it('selects with a click and moves with the arrows, wrapping and skipping disabled tabs', () => {
    render(<Owned />);
    fireEvent.click(tab('b'));
    expect(tab('b').getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tab('b'), { key: 'ArrowRight' });
    expect(tab('d').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('d'));
    fireEvent.keyDown(tab('d'), { key: 'ArrowRight' });
    expect(tab('a').getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tab('a'), { key: 'End' });
    expect(tab('d').getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tab('d'), { key: 'Home' });
    expect(tab('a').getAttribute('aria-selected')).toBe('true');
  });
});
