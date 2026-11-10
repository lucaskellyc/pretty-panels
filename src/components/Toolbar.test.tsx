import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Toolbar } from './Toolbar';
import { TextButton } from './TextButton';
import { giveBox } from '../test/box';

/**
 * jsdom lays nothing out, so the bar is given 100px of room and each item
 * 60px: one item fits beside a 20px ⋯, and the other two fold into the sheet.
 */
function layOut() {
  const bar = document.querySelector('.pp-toolbar') as HTMLElement;
  Object.defineProperty(bar, 'clientWidth', { value: 100, configurable: true });
  for (const item of bar.querySelectorAll(':scope > .pp-toolbar-item')) giveBox(item, { width: 60 });
  const more = bar.querySelector(':scope > .pp-toolbar-more');
  if (more) giveBox(more, { width: 20 });
}

function Bar({ onAction }: { onAction: () => void }) {
  const [on, setOn] = [false, () => {}];
  return (
    <Toolbar overflow label="Tools">
      <TextButton key="a" onClick={onAction}>
        Alpha
      </TextButton>
      <TextButton key="b" onClick={onAction}>
        Beta
      </TextButton>
      <TextButton key="c" mode="toggle" active={on} onChange={setOn}>
        Gamma
      </TextButton>
    </Toolbar>
  );
}

describe('Toolbar overflow', () => {
  it('folds what does not fit into a ⋯ that opens them as a sheet', () => {
    const { rerender } = render(<Bar onAction={() => {}} />);
    layOut();
    // The fold runs in a layout effect; a re-render after the boxes exist lets
    // it measure them, and once more after the ⋯ exists to measure that too.
    rerender(<Bar onAction={() => {}} />);
    layOut();
    rerender(<Bar onAction={() => {}} />);
    const bar = screen.getByRole('group', { name: 'Tools' });
    const inBar = bar.querySelectorAll(':scope > .pp-toolbar-item');
    expect(inBar.length).toBe(1);
    const more = screen.getByRole('button', { name: 'More tools' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    const sheet = screen.getByRole('group', { name: 'More tools' });
    expect(sheet.textContent).toContain('Beta');
    expect(sheet.textContent).toContain('Gamma');
  });

  it('keeps the sheet open after a toggle and closes it after an action', () => {
    const onAction = vi.fn();
    const { rerender } = render(<Bar onAction={onAction} />);
    layOut();
    rerender(<Bar onAction={onAction} />);
    layOut();
    rerender(<Bar onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'More tools' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gamma' }));
    expect(screen.getByRole('group', { name: 'More tools' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
    expect(onAction).toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'More tools' })).toBeNull();
  });
});
