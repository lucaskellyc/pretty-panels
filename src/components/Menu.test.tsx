import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Menu } from './Menu';
import { Select } from './Select';

function Host({ onSelect, closeOnSelect }: { onSelect: (id: string) => void; closeOnSelect?: boolean }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchor} onClick={() => setOpen(true)}>
        Open
      </button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        label="Actions"
        closeOnSelect={closeOnSelect}
        items={[
          { id: 'cut', label: 'Cut' },
          { id: 'copy', label: 'Copy', disabled: true },
          { separator: true },
          { id: 'paste', label: 'Paste' },
        ]}
        onSelect={onSelect}
      />
    </>
  );
}
const item = (name: string) => screen.getByRole('menuitem', { name });

describe('Menu', () => {
  it('opens with focus on its first command and moves it with the arrows, skipping disabled ones', () => {
    render(<Host onSelect={() => {}} />);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('menu', { name: 'Actions' })).toBeTruthy();
    expect(document.activeElement).toBe(item('Cut'));
    fireEvent.keyDown(item('Cut'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item('Paste'));
    fireEvent.keyDown(item('Paste'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item('Cut'));
    fireEvent.keyDown(item('Cut'), { key: 'End' });
    expect(document.activeElement).toBe(item('Paste'));
    fireEvent.keyDown(item('Paste'), { key: 'Home' });
    expect(document.activeElement).toBe(item('Cut'));
  });

  it('reports a chosen command and closes, handing focus back to the trigger', () => {
    const onSelect = vi.fn();
    render(<Host onSelect={onSelect} />);
    const trigger = screen.getByText('Open');
    fireEvent.click(trigger);
    fireEvent.click(item('Paste'));
    expect(onSelect).toHaveBeenCalledWith('paste');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on Escape without reporting, and on a press outside', () => {
    const onSelect = vi.fn();
    render(<Host onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Open'));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByText('Open'));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('stays open when closeOnSelect is off', () => {
    const onSelect = vi.fn();
    render(<Host onSelect={onSelect} closeOnSelect={false} />);
    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(item('Cut'));
    expect(onSelect).toHaveBeenCalledWith('cut');
    expect(screen.getByRole('menu')).toBeTruthy();
  });
});

function OwnedSelect({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('solid');
  return (
    <Select
      label="Shading"
      value={value}
      options={['wireframe', 'solid', 'rendered']}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('Select', () => {
  it('shows the current choice on a capsule that opens a menu with it checked', () => {
    render(<OwnedSelect />);
    const trigger = screen.getByRole('button', { name: /Shading/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('solid');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const current = screen.getByRole('menuitemcheckbox', { name: 'solid' });
    expect(current.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(current);
  });

  it('opens from the keyboard and reports the picked option', () => {
    const onChange = vi.fn();
    render(<OwnedSelect onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /Shading/ });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'rendered' }));
    expect(onChange).toHaveBeenCalledWith('rendered');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger.textContent).toContain('rendered');
  });
});
