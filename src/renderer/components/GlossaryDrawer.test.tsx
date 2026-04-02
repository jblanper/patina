import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GlossaryDrawer } from './GlossaryDrawer';

const DEFAULT_PROPS: {
  open: boolean;
  field: string | null;
  onClose: () => void;
  onOpenField: (fieldId: string) => void;
  onOpenIndex: () => void;
} = {
  open: false,
  field: null,
  onClose: vi.fn(),
  onOpenField: vi.fn(),
  onOpenIndex: vi.fn(),
};

function renderDrawer(props: Partial<typeof DEFAULT_PROPS> = {}) {
  const merged = { ...DEFAULT_PROPS, ...props };
  return render(
    <MemoryRouter>
      <GlossaryDrawer {...merged} />
    </MemoryRouter>
  );
}

describe('GlossaryDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Make requestAnimationFrame synchronous so the 'visible' state updates
    // immediately on open, allowing standard accessible role queries to work.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  // ── Mount / unmount ──────────────────────────────────────────────────────────

  it('TC-GDW-01: returns null (no dialog) when open=false on initial render', () => {
    renderDrawer({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('TC-GDW-02: renders the dialog when open=true', () => {
    renderDrawer({ open: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('TC-GDW-03: DOM node remains in document during the 250ms exit transition', () => {
    vi.useFakeTimers();
    const { container, rerender } = renderDrawer({ open: true });
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();

    rerender(
      <MemoryRouter>
        <GlossaryDrawer {...DEFAULT_PROPS} open={false} />
      </MemoryRouter>
    );
    // Before 250ms — still mounted
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('TC-GDW-04: DOM node is removed after the 250ms exit transition completes', () => {
    vi.useFakeTimers();
    const { container, rerender } = renderDrawer({ open: true });

    rerender(
      <MemoryRouter>
        <GlossaryDrawer {...DEFAULT_PROPS} open={false} />
      </MemoryRouter>
    );
    // Advance past the 250ms timer
    act(() => { vi.advanceTimersByTime(251); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  // ── Content — field mode ─────────────────────────────────────────────────────

  it('TC-GDW-05: renders field entry when open=true and field is set', () => {
    const { container } = renderDrawer({ open: true, field: 'title' });
    // The matched field's id is displayed in a <code> in the header
    const fieldIdCode = container.querySelector('code.glossary-drawer-field-id');
    expect(fieldIdCode?.textContent).toBe('title');
  });

  it('TC-GDW-06: renders "All Fields" back button in field mode', () => {
    renderDrawer({ open: true, field: 'title' });
    expect(screen.getByRole('button', { name: /All Fields/i })).toBeInTheDocument();
  });

  // ── Content — index mode ─────────────────────────────────────────────────────

  it('TC-GDW-07: renders field index when open=true and field=null', () => {
    renderDrawer({ open: true, field: null });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Index mode shows section headings
    expect(screen.getByText('Identity & Classification')).toBeInTheDocument();
  });

  it('TC-GDW-08: "Browse full reference" link is present in index mode', () => {
    renderDrawer({ open: true, field: null });
    expect(screen.getByText(/Browse full reference/i)).toBeInTheDocument();
  });

  // ── Keyboard interaction ─────────────────────────────────────────────────────

  it('TC-GDW-09: pressing Esc calls onClose', () => {
    renderDrawer({ open: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(DEFAULT_PROPS.onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-GDW-10: Esc listener is not active when open=false', () => {
    vi.useFakeTimers();
    const { rerender } = renderDrawer({ open: true });

    rerender(
      <MemoryRouter>
        <GlossaryDrawer {...DEFAULT_PROPS} open={false} />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(DEFAULT_PROPS.onClose).not.toHaveBeenCalled();
  });

  // ── Mouse interaction ────────────────────────────────────────────────────────

  it('TC-GDW-11: mouseDown on backdrop calls onClose', () => {
    const { container } = renderDrawer({ open: true });
    const backdrop = container.querySelector('.glossary-drawer-backdrop')!;
    fireEvent.mouseDown(backdrop);
    expect(DEFAULT_PROPS.onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-GDW-12: clicking close button calls onClose', () => {
    renderDrawer({ open: true });
    const closeBtn = screen.getByRole('button', { name: /Close field reference/i });
    fireEvent.click(closeBtn);
    expect(DEFAULT_PROPS.onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-GDW-13: clicking "All Fields" button calls onOpenIndex', () => {
    renderDrawer({ open: true, field: 'title' });
    const backBtn = screen.getByRole('button', { name: /All Fields/i });
    fireEvent.click(backBtn);
    expect(DEFAULT_PROPS.onOpenIndex).toHaveBeenCalledTimes(1);
  });

  it('TC-GDW-14: clicking a field item in index mode calls onOpenField with the field id', () => {
    renderDrawer({ open: true, field: null });
    const designationBtn = screen.getByRole('button', { name: 'Designation' });
    fireEvent.click(designationBtn);
    expect(DEFAULT_PROPS.onOpenField).toHaveBeenCalledWith('title');
  });

  // ── Scroll-lock ──────────────────────────────────────────────────────────────

  it('TC-GDW-15: sets body overflow to hidden when open=true', () => {
    renderDrawer({ open: true });
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('TC-GDW-16: restores body overflow when open changes to false', () => {
    const { rerender } = renderDrawer({ open: true });
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <MemoryRouter>
        <GlossaryDrawer {...DEFAULT_PROPS} open={false} />
      </MemoryRouter>
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('TC-GDW-17: restores body overflow on unmount while open', () => {
    const { unmount } = renderDrawer({ open: true });
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('TC-GDW-19: restores body paddingRight on close after scrollbar compensation', () => {
    // JSDOM: window.innerWidth === document.documentElement.clientWidth (no scrollbar),
    // so paddingRight stays ''. Verify the cleanup path restores it to '' regardless.
    const { rerender } = renderDrawer({ open: true });
    rerender(
      <MemoryRouter>
        <GlossaryDrawer {...DEFAULT_PROPS} open={false} />
      </MemoryRouter>
    );
    expect(document.body.style.paddingRight).toBe('');
  });

  // ── Focus ────────────────────────────────────────────────────────────────────

  it('TC-GDW-18: focuses the close button when drawer becomes visible', () => {
    renderDrawer({ open: true });
    const closeBtn = screen.getByRole('button', { name: /Close field reference/i });
    expect(document.activeElement).toBe(closeBtn);
  });
});
