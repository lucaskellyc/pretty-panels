import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Section } from './Section';
import { Panel } from './Panel';

describe('Section', () => {
  it('starts open, folds on a click, and links its button to its body', () => {
    render(
      <Section title="Lens">
        <p>body</p>
      </Section>,
    );
    const head = screen.getByRole('button', { name: 'Lens' });
    const body = document.getElementById(head.getAttribute('aria-controls')!)!;
    expect(head.getAttribute('aria-expanded')).toBe('true');
    expect(body.classList.contains('is-collapsed')).toBe(false);
    fireEvent.click(head);
    expect(head.getAttribute('aria-expanded')).toBe('false');
    expect(body.classList.contains('is-collapsed')).toBe(true);
  });

  it('respects defaultOpen', () => {
    render(
      <Section title="Lens" defaultOpen={false}>
        x
      </Section>,
    );
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
  });

  it('is controlled by open, reporting through onOpenChange without changing itself', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Section title="Lens" open onOpenChange={onOpenChange}>
        x
      </Section>,
    );
    const head = screen.getByRole('button');
    fireEvent.click(head);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(head.getAttribute('aria-expanded')).toBe('true');
    rerender(
      <Section title="Lens" open={false} onOpenChange={onOpenChange}>
        x
      </Section>,
    );
    expect(head.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('Panel', () => {
  it('shows no collapse toggle unless collapsible', () => {
    render(<Panel title="Camera">x</Panel>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('collapses uncontrolled, and follows collapsed when controlled', () => {
    const onCollapsedChange = vi.fn();
    const { rerender } = render(
      <Panel title="Camera" collapsible onCollapsedChange={onCollapsedChange}>
        x
      </Panel>,
    );
    const toggle = screen.getByRole('button', { name: 'Collapse panel' });
    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    rerender(
      <Panel title="Camera" collapsible collapsed={false} onCollapsedChange={onCollapsedChange}>
        x
      </Panel>,
    );
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});
