import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tree } from './Tree';

const items = [
  { id: 'scene', label: 'Scene', children: [{ id: 'cam', label: 'Camera' }, { id: 'light', label: 'Light' }] },
  { id: 'cube', label: 'Cube' },
];
const row = (name: string) => screen.getByRole('treeitem', { name });

describe('Tree', () => {
  it('exposes depth, size and position, and hides a closed branch', () => {
    render(<Tree label="Outliner" items={items} />);
    expect(screen.getByRole('tree', { name: 'Outliner' })).toBeTruthy();
    const scene = row('Scene');
    expect(scene.getAttribute('aria-level')).toBe('1');
    expect(scene.getAttribute('aria-setsize')).toBe('2');
    expect(scene.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('treeitem', { name: 'Camera' })).toBeNull();
    expect(row('Cube').hasAttribute('aria-expanded')).toBe(false);
  });

  it('opens with ArrowRight, walks in with the arrows, closes with ArrowLeft and jumps to the parent', () => {
    const onExpandedChange = vi.fn();
    render(<Tree items={items} onExpandedChange={onExpandedChange} />);
    const scene = row('Scene');
    fireEvent.keyDown(scene, { key: 'ArrowRight' });
    expect(onExpandedChange).toHaveBeenLastCalledWith(['scene']);
    expect(scene.getAttribute('aria-expanded')).toBe('true');
    expect(row('Camera').getAttribute('aria-level')).toBe('2');
    fireEvent.keyDown(scene, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(row('Camera'));
    fireEvent.keyDown(row('Camera'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(row('Light'));
    fireEvent.keyDown(row('Light'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(row('Scene'));
    fireEvent.keyDown(row('Scene'), { key: 'ArrowLeft' });
    expect(onExpandedChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole('treeitem', { name: 'Camera' })).toBeNull();
  });

  it('follows a controlled expanded list', () => {
    const { rerender } = render(<Tree items={items} expanded={[]} />);
    expect(screen.queryByRole('treeitem', { name: 'Camera' })).toBeNull();
    rerender(<Tree items={items} expanded={['scene']} />);
    expect(row('Camera')).toBeTruthy();
    // Without a handler the tree can't change its own state.
    fireEvent.keyDown(row('Scene'), { key: 'ArrowLeft' });
    expect(row('Camera')).toBeTruthy();
  });

  it('Home and End go to the first and last visible rows', () => {
    render(<Tree items={items} defaultExpanded={['scene']} />);
    fireEvent.keyDown(row('Scene'), { key: 'End' });
    expect(document.activeElement).toBe(row('Cube'));
    fireEvent.keyDown(row('Cube'), { key: 'Home' });
    expect(document.activeElement).toBe(row('Scene'));
  });
});
