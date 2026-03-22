import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useRef } from 'react';
import { useFocusTrap } from '../useFocusTrap';

// Helper component with three focusable buttons inside the trap container
function ThreeButtonTrap({ active }: { active: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useFocusTrap(ref, active);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} data-testid="trap-container">
      <button data-testid="btn1">Button 1</button>
      <button data-testid="btn2">Button 2</button>
      <button data-testid="btn3">Button 3</button>
    </div>
  );
}

// Helper component with no focusable children
function EmptyTrap({ active }: { active: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useFocusTrap(ref, active);
  return <div ref={ref as React.RefObject<HTMLDivElement>} data-testid="empty-container" />;
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-FT-01: Tab from last focusable element wraps focus to first', () => {
    render(<ThreeButtonTrap active={true} />);
    const btn1 = screen.getByTestId('btn1');
    const btn3 = screen.getByTestId('btn3');

    btn3.focus();
    expect(document.activeElement).toBe(btn3);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(btn1);
  });

  it('TC-FT-02: Shift+Tab from first focusable element wraps focus to last', () => {
    render(<ThreeButtonTrap active={true} />);
    const btn1 = screen.getByTestId('btn1');
    const btn3 = screen.getByTestId('btn3');

    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(btn3);
  });

  it('TC-FT-03: Tab between non-boundary elements does not intercept', () => {
    render(<ThreeButtonTrap active={true} />);
    const btn1 = screen.getByTestId('btn1');
    const btn2 = screen.getByTestId('btn2');

    btn2.focus();
    // Tab from btn2 (not the last) — trap does not intercept
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    // Focus should stay on btn2 (no programmatic move by the trap)
    expect(document.activeElement).toBe(btn2);
  });

  it('TC-FT-04: empty focusable list — Tab does not throw', () => {
    render(<EmptyTrap active={true} />);
    expect(() => {
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    }).not.toThrow();
  });

  it('TC-FT-05: non-Tab keys are not intercepted', () => {
    render(<ThreeButtonTrap active={true} />);
    const btn3 = screen.getByTestId('btn3');
    btn3.focus();

    // ArrowDown should not redirect focus
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(btn3);
  });

  it('TC-FT-06: inactive trap (active=false) does not intercept Tab', () => {
    render(<ThreeButtonTrap active={false} />);
    const btn3 = screen.getByTestId('btn3');
    const btn1 = screen.getByTestId('btn1');

    btn3.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    // Trap is not active — no programmatic focus move, stays on btn3
    expect(document.activeElement).toBe(btn3);
  });

  it('TC-FT-07: trap deactivates and re-activates correctly', () => {
    const { rerender } = render(<ThreeButtonTrap active={true} />);
    const btn1 = screen.getByTestId('btn1');
    const btn3 = screen.getByTestId('btn3');

    // Active: Tab from last wraps
    btn3.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(btn1);

    // Deactivate: Tab from last no longer wraps
    rerender(<ThreeButtonTrap active={false} />);
    btn3.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(btn3);

    // Re-activate: Tab from last wraps again
    rerender(<ThreeButtonTrap active={true} />);
    btn3.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(btn1);
  });
});
